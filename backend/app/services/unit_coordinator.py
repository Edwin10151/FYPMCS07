"""Scrape unit coordinators from the public Monash Handbook.

Separate from handbook.py on purpose. That module backs the coordinator-driven
"Import Handbook draft" button and reads learning outcomes and assessments; this
one answers a single narrower question -- *who runs this unit?* -- from nothing
but a unit code, so it can be called automatically. The tutor list import, for
example, can look up a unit it could not match without a human clicking anything.

The two modules share no code deliberately. Each is small, and the duplication
(a text helper and an offering matcher, both a few lines) buys independence: a
change to how assessments are parsed cannot break coordinator lookup, and this
module can be called in a loop over many units without dragging the rest of the
Handbook parser along.

Nothing here grants access to anything. It returns names and emails; deciding
what they mean is the caller's job.
"""

from __future__ import annotations

import json
import re
from concurrent.futures import ThreadPoolExecutor
from typing import Iterable

import httpx
from bs4 import BeautifulSoup

UNIT_CODE_PATTERN = re.compile(r"^[A-Z]{3}\d{4}$")

# Handbook phrasing for a teaching period, used to tell one campus offering from
# another. Matches the labels published on the unit page.
PERIOD_LABELS = {
    "S1": "First semester",
    "S2": "Second semester",
}

# Contact roles worth recording, mapped to a human label. A unit routinely lists
# one coordinator per campus, so callers always receive a list.
CONTACT_ROLES = {
    "unit_coordinator": "Unit Coordinator",
    "chief_examiner": "Chief Examiner",
}

HANDBOOK_URL = "https://handbook.monash.edu/{year}/units/{unit_code}?year={year}"
REQUEST_TIMEOUT_SECONDS = 20


class UnitCoordinatorScrapeError(RuntimeError):
    """A unit's coordinators could not be read from the Handbook."""


def _plain_text(value: object) -> str:
    return BeautifulSoup(str(value or ""), "html.parser").get_text(" ", strip=True)


def _applies_to_offering(raw_contact: dict, period: str, location: str) -> bool:
    """Whether a contact is listed against the campus offering we asked about.

    A unit page lists every campus at once. Without this filter, a Malaysia
    offering would inherit Clayton's coordinator.
    """
    scope = raw_contact.get("offerings_formatted_contact")
    if scope is None:
        return False
    scope_text = _plain_text(scope)
    if "Applies to all offerings" in scope_text:
        return True

    period_label = PERIOD_LABELS.get(period.upper())
    if not period_label:
        raise UnitCoordinatorScrapeError(f"Unsupported teaching period: {period}")
    return f"{period_label}, {location}" in scope_text


def _role_of(raw_contact: dict) -> str | None:
    role = raw_contact.get("contact_role")
    value = role.get("value") if isinstance(role, dict) else role
    value = str(value or "").strip().lower()
    return value if value in CONTACT_ROLES else None


def coordinators_from_page_content(
    page_content: object,
    *,
    period: str | None = None,
    location: str | None = None,
) -> list[dict]:
    """Pull the contact list out of an already-fetched Handbook page.

    Split from the HTTP call so it can be tested against saved page data, and so
    a caller that already holds the page does not fetch it twice.

    Passing period and location narrows the result to that campus offering;
    omitting them returns every coordinator the unit lists.
    """
    if not isinstance(page_content, dict):
        raise UnitCoordinatorScrapeError("Handbook page content is missing")
    if period and location and period.upper() not in PERIOD_LABELS:
        raise UnitCoordinatorScrapeError(f"Unsupported teaching period: {period}")

    coordinators: list[dict] = []
    seen: set[tuple[str, str]] = set()

    for role_group in page_content.get("academic_contact_roles") or []:
        if not isinstance(role_group, dict):
            continue
        for raw_contact in role_group.get("contacts") or []:
            if not isinstance(raw_contact, dict):
                continue

            role = _role_of(raw_contact)
            if role is None:
                continue
            if period and location and not _applies_to_offering(raw_contact, period, location):
                continue

            name = _plain_text(raw_contact.get("display_name") or raw_contact.get("contact_name"))
            if not name:
                continue

            # Lower-cased so it can be compared against app_user.email and the
            # tutor list, both of which are stored lower case.
            email = str(raw_contact.get("contact_email") or "").strip().lower() or None

            # One person can be both coordinator and chief examiner; keep a row
            # per role, but never the same role twice.
            key = (role, email or name.lower())
            if key in seen:
                continue
            seen.add(key)

            coordinators.append(
                {
                    "name": name,
                    "email": email,
                    "role": role,
                    "role_label": CONTACT_ROLES[role],
                    "scope": _plain_text(raw_contact.get("offerings_formatted_contact")) or None,
                }
            )
    return coordinators


def _fetch_page_content(unit_code: str, year: int) -> dict:
    source_url = HANDBOOK_URL.format(year=year, unit_code=unit_code)
    try:
        response = httpx.get(source_url, follow_redirects=True, timeout=REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise UnitCoordinatorScrapeError(f"Handbook request failed for {unit_code}") from exc

    script = BeautifulSoup(response.text, "html.parser").find("script", id="__NEXT_DATA__")
    if not script or not script.string:
        raise UnitCoordinatorScrapeError(f"Handbook page data is unavailable for {unit_code}")
    try:
        page_content = json.loads(script.string)["props"]["pageProps"]["pageContent"]
    except (KeyError, TypeError, json.JSONDecodeError) as exc:
        raise UnitCoordinatorScrapeError(f"Handbook page data is invalid for {unit_code}") from exc

    return {"source_url": source_url, "page_content": page_content}


def fetch_unit_coordinators(
    unit_code: str,
    year: int,
    *,
    period: str | None = None,
    location: str | None = None,
) -> dict:
    """Look up one unit's coordinators from its unit code alone.

    This is the entry point for automatic use: give it "FIT3181" and a year and
    it returns who runs that unit, with no UI involved.

    Returns {"unit_code", "source_url", "coordinators": [...]}. Each coordinator
    carries name, email, role, role_label and scope.
    """
    unit_code = unit_code.strip().upper()
    if not UNIT_CODE_PATTERN.fullmatch(unit_code):
        raise UnitCoordinatorScrapeError(f"Invalid unit code: {unit_code}")
    if not 2000 <= year <= 2100:
        raise UnitCoordinatorScrapeError(f"Invalid year: {year}")

    fetched = _fetch_page_content(unit_code, year)
    page_content = fetched["page_content"]

    published_code = str(page_content.get("unit_code") or "").strip().upper()
    if published_code and published_code != unit_code:
        raise UnitCoordinatorScrapeError(
            f"Handbook returned {published_code} when asked for {unit_code}"
        )

    return {
        "unit_code": unit_code,
        "source_url": fetched["source_url"],
        "coordinators": coordinators_from_page_content(
            page_content, period=period, location=location
        ),
    }


# A roster can list dozens of units. Fetching them one after another would take
# a minute or more, so a small pool runs them together -- small enough to stay
# polite to a public university site we do not own.
DEFAULT_MAX_WORKERS = 8


def fetch_unit_coordinators_for_units(
    unit_codes: Iterable[str],
    year: int,
    *,
    period: str | None = None,
    location: str | None = None,
    max_workers: int = DEFAULT_MAX_WORKERS,
) -> dict:
    """Look up several units at once, for the unmatched-unit case.

    One unit failing must not lose the rest, so failures are collected per unit
    rather than raised. Duplicate codes are looked up once.

    Returns {"results": {unit_code: {...}}, "failures": {unit_code: reason}}.
    """
    wanted: list[str] = []
    seen: set[str] = set()
    for raw_code in unit_codes:
        unit_code = str(raw_code or "").strip().upper()
        if unit_code and unit_code not in seen:
            seen.add(unit_code)
            wanted.append(unit_code)

    results: dict[str, dict] = {}
    failures: dict[str, str] = {}

    def look_up(unit_code: str) -> tuple[str, dict | None, str | None]:
        try:
            return unit_code, fetch_unit_coordinators(
                unit_code, year, period=period, location=location
            ), None
        except UnitCoordinatorScrapeError as exc:
            return unit_code, None, str(exc)
        except Exception as exc:  # a surprise here must not sink the whole batch
            return unit_code, None, f"Unexpected error for {unit_code}: {exc}"

    if len(wanted) == 1 or max_workers <= 1:
        outcomes = [look_up(code) for code in wanted]
    else:
        with ThreadPoolExecutor(max_workers=min(max_workers, len(wanted))) as pool:
            outcomes = list(pool.map(look_up, wanted))

    # Ordered by the caller's list rather than completion order, so the output is
    # reproducible regardless of which request finished first.
    for unit_code, result, failure in outcomes:
        if result is not None:
            results[unit_code] = result
        else:
            failures[unit_code] = failure or "Unknown error"

    return {"results": results, "failures": failures}


def _main(argv: list[str] | None = None) -> int:
    """Run the scraper from a terminal, for checking a unit by hand.

        python -m app.services.unit_coordinator FIT3181 --period S2
    """
    import argparse
    from datetime import date

    parser = argparse.ArgumentParser(
        prog="python -m app.services.unit_coordinator",
        description="Look up unit coordinators in the public Monash Handbook.",
    )
    parser.add_argument("unit_codes", nargs="+", metavar="UNIT", help="e.g. FIT3181 FIT3161")
    parser.add_argument("--year", type=int, default=date.today().year)
    parser.add_argument("--period", default=None, help="S1 or S2; omit for every offering")
    parser.add_argument("--location", default="Malaysia")
    parser.add_argument("--json", action="store_true", help="print raw JSON instead of a table")
    args = parser.parse_args(argv)

    # Location only narrows anything when a period is given too, so ignore a
    # stray default location rather than silently filtering everything out.
    location = args.location if args.period else None
    outcome = fetch_unit_coordinators_for_units(
        args.unit_codes, args.year, period=args.period, location=location
    )

    if args.json:
        print(json.dumps(outcome, indent=2))
    else:
        scope = f"{args.period} {location}" if args.period else "all offerings"
        print(f"Handbook {args.year}, {scope}\n")
        for unit_code, result in outcome["results"].items():
            print(unit_code)
            if not result["coordinators"]:
                print("    (no coordinators published)")
            for contact in result["coordinators"]:
                print(f"    {contact['role_label']:<17} {contact['name']:<28} {contact['email'] or '-'}")
            print(f"    source: {result['source_url']}\n")
        for unit_code, reason in outcome["failures"].items():
            print(f"{unit_code}\n    FAILED: {reason}\n")

    return 1 if outcome["failures"] else 0


if __name__ == "__main__":
    raise SystemExit(_main())
