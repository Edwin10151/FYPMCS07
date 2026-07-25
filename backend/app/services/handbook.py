from __future__ import annotations

import json
import re
from decimal import Decimal, InvalidOperation

import httpx
from bs4 import BeautifulSoup


UNIT_CODE_PATTERN = re.compile(r"^[A-Z]{3}\d{4}$")


class HandbookImportError(RuntimeError):
    pass


def _plain_text(value: object) -> str:
    return BeautifulSoup(str(value or ""), "html.parser").get_text(" ", strip=True)


def _ulo_code(item: dict) -> str:
    code = str(item.get("code") or "").strip().upper()
    if code:
        return code
    number = str(item.get("number") or "").strip()
    if number.isdigit():
        return f"ULO{number}"
    raise HandbookImportError("Handbook ULO has no code")


def _weight(value: object) -> Decimal:
    try:
        weight = Decimal(str(value or 0))
    except InvalidOperation as exc:
        raise HandbookImportError("Handbook assessment has an invalid weight") from exc
    if not Decimal("0") <= weight <= Decimal("100"):
        raise HandbookImportError("Handbook assessment weight is outside 0-100")
    return weight.quantize(Decimal("0.01"))


def normalise_page_content(page_content: object) -> dict:
    if not isinstance(page_content, dict):
        raise HandbookImportError("Handbook page content is missing")

    unit_code = str(page_content.get("unit_code") or "").strip().upper()
    title = _plain_text(page_content.get("title"))
    if not UNIT_CODE_PATTERN.fullmatch(unit_code) or not title:
        raise HandbookImportError("Handbook unit record is incomplete")

    learning_outcomes = []
    for raw_ulo in page_content.get("unit_learning_outcomes") or []:
        if not isinstance(raw_ulo, dict):
            continue
        description = _plain_text(raw_ulo.get("description"))
        if description:
            learning_outcomes.append(
                {
                    "code": _ulo_code(raw_ulo),
                    "description": description,
                    "reference": str(raw_ulo.get("cl_id") or "") or None,
                }
            )
    if not learning_outcomes:
        raise HandbookImportError("Handbook unit has no learning outcomes")

    assessments = []
    for raw_assessment in page_content.get("assessments") or []:
        if not isinstance(raw_assessment, dict):
            continue
        name = _plain_text(raw_assessment.get("name") or raw_assessment.get("assessment_name"))
        if not name:
            continue
        hurdle = raw_assessment.get("hurdle_type") or {}
        hurdle_value = hurdle.get("value") if isinstance(hurdle, dict) else hurdle
        linked_numbers = re.findall(r"\d+", str(raw_assessment.get("learning_outcomes") or ""))
        assessments.append(
            {
                "name": name,
                "weight": str(_weight(raw_assessment.get("weight"))),
                "is_hurdle": bool(hurdle_value) or _weight(raw_assessment.get("weight")) == 0,
                "ulo_codes": [f"ULO{number}" for number in linked_numbers],
                "reference": str(raw_assessment.get("cl_id") or "") or None,
            }
        )

    return {
        "unit_code": unit_code,
        "title": title,
        "handbook_version": str(page_content.get("version_name") or page_content.get("version") or "") or None,
        "learning_outcomes": learning_outcomes,
        "assessments": assessments,
    }


def fetch_handbook(unit_code: str, year: int) -> dict:
    unit_code = unit_code.strip().upper()
    if not UNIT_CODE_PATTERN.fullmatch(unit_code) or not 2000 <= year <= 2100:
        raise HandbookImportError("Invalid unit code or year")
    source_url = f"https://handbook.monash.edu/{year}/units/{unit_code}?year={year}"
    try:
        response = httpx.get(source_url, follow_redirects=True, timeout=20)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HandbookImportError("Handbook request failed") from exc

    script = BeautifulSoup(response.text, "html.parser").find("script", id="__NEXT_DATA__")
    if not script or not script.string:
        raise HandbookImportError("Handbook page data is unavailable")
    try:
        page_content = json.loads(script.string)["props"]["pageProps"]["pageContent"]
    except (KeyError, TypeError, json.JSONDecodeError) as exc:
        raise HandbookImportError("Handbook page data is invalid") from exc

    payload = normalise_page_content(page_content)
    if payload["unit_code"] != unit_code:
        raise HandbookImportError("Handbook returned a different unit")
    return {"source_url": source_url, "payload": payload}
