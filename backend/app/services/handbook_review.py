"""Compare a Handbook draft without deleting the offering's reviewed records."""
import hashlib
import json
import re
from decimal import Decimal


def same_description(left: str, right: str) -> bool:
    # Handbook list items commonly end in a semicolon; the demo uses periods.
    def normalise(value):
        return re.sub(r"\s+", " ", value).strip().rstrip(".;").casefold()
    return normalise(left) == normalise(right)


def review_handbook(payload, state):
    revision = hashlib.sha256(json.dumps(state, sort_keys=True, default=str).encode()).hexdigest()
    ulo_rows, assessment_rows = [], []
    ulo_blockers, assessment_blockers = [], []
    offering = state.get("offering", [{}])[0]
    scope = payload.get("offering_scope", {})
    if (payload.get("unit_code") != offering.get("unit_code")
            or payload.get("imported_year", offering.get("year")) != offering.get("year")
            or (scope and (scope.get("period") != offering.get("period") or scope.get("location") != offering.get("handbook_location")))):
        ulo_blockers.append("The draft belongs to a different unit, year or teaching offering. Fetch a new Handbook draft.")
    matched_ids = set()
    targets = {}
    protected = bool(state["grades"] or state["previews"])
    for incoming in payload["learning_outcomes"]:
        existing = next((u for u in state["ulos"] if u["ulo_code"] == incoming["code"]), None)
        if existing is None:
            matches = [u for u in state["ulos"] if u["offering_ulo_id"] not in matched_ids
                       and same_description(u["description"], incoming["description"])]
            if len(matches) == 1:
                existing = matches[0]
            elif not matches:
                # A familiar number alone does not establish semantic equivalence.
                # Match it for review so a changed definition becomes a conflict,
                # rather than quietly creating LO1 and ULO1 side by side.
                number = re.fullmatch(r"(?:ULO|LO)(\d+)", incoming["code"])
                aliases = [u for u in state["ulos"] if number
                           and u["ulo_code"] in (f"LO{number[1]}", f"ULO{number[1]}")
                           and u["offering_ulo_id"] not in matched_ids]
                if len(aliases) == 1:
                    existing = aliases[0]
        row = {**incoming, "existing_id": existing["offering_ulo_id"] if existing else None,
               "previous_code": existing["ulo_code"] if existing else None, "status": "add"}
        if existing:
            if existing["offering_ulo_id"] in matched_ids:
                ulo_blockers.append(f"{incoming['code']}: more than one draft outcome matches the same existing ULO. Resolve the outcome codes before importing.")
            matched_ids.add(existing["offering_ulo_id"])
            semantic_change = not same_description(existing["description"], incoming["description"])
            changed = existing["ulo_code"] != incoming["code"] or existing["description"] != incoming["description"]
            row["status"] = "update" if changed else "unchanged"
            row["previous_description"] = existing["description"]
            if semantic_change and (protected or existing["source"] != "handbook"):
                row["status"] = "conflict"
                ulo_blockers.append(f"{incoming['code']}: the outcome definition differs from the reviewed setup. Resolve this amendment before importing.")
        targets[incoming["code"]] = row["existing_id"] or f"new:{incoming['code']}"
        ulo_rows.append(row)
    retained_ulos = [u["ulo_code"] for u in state["ulos"] if u["offering_ulo_id"] not in matched_ids]
    matched_assessments = set()
    for incoming in payload["assessments"]:
        matches = [a for a in state["assessments"] if a["assessment_name"].casefold() == incoming["name"].casefold()]
        existing = matches[0] if matches else None
        if len(matches) > 1:
            assessment_blockers.append(f"{incoming['name']}: more than one existing assessment matches this name. Resolve the duplicate names before importing.")
        incoming_links = {targets[code] for code in incoming["ulo_codes"] if code in targets}
        if len(set(incoming["ulo_codes"]) - targets.keys()):
            assessment_blockers.append(f"{incoming['name']}: published links reference an unknown ULO.")
        row = {**incoming, "existing_id": existing["assessment_id"] if existing else None, "status": "add"}
        if existing:
            matched_assessments.add(existing["assessment_id"])
            old_links = {l["offering_ulo_id"] for l in state["links"] if l["assessment_id"] == existing["assessment_id"]}
            changed = (Decimal(incoming["weight"]) != existing["weight"]
                       or incoming["is_hurdle"] != existing["is_hurdle"] or incoming_links != old_links)
            row["status"] = "update" if changed or incoming["name"] != existing["assessment_name"] else "unchanged"
            row["previous_weight"] = str(existing["weight"])
            if changed and existing["source"] != "handbook":
                row["status"] = "conflict"
                assessment_blockers.append(f"{incoming['name']}: preserve the manual assessment and resolve its differences in Assessment setup.")
            elif changed and protected:
                assessment_blockers.append(f"{incoming['name']}: assessment weights or ULO coverage cannot be replaced while grades or upload previews exist.")
        elif protected:
            assessment_blockers.append(f"{incoming['name']}: adding a Handbook assessment requires a reviewed amendment while grades or upload previews exist.")
        assessment_rows.append(row)
    removed = [a for a in state["assessments"] if a["assessment_id"] not in matched_assessments and a["source"] == "handbook"]
    retained = [a for a in state["assessments"] if a["assessment_id"] not in matched_assessments and a["source"] != "handbook"]
    component_assessments = {c["assessment_id"] for c in state.get("components", [])}
    if any(a["assessment_id"] in component_assessments for a in removed):
        assessment_blockers.append("Existing assessment components cannot be removed by a Handbook import. Resolve this in Assessment setup.")
    if removed and protected:
        assessment_blockers.append("Existing assessments have grades or upload previews and cannot be removed by a Handbook import.")
    total = sum((Decimal(a["weight"]) for a in payload["assessments"]), Decimal(0)) + sum((a["weight"] for a in retained), Decimal(0))
    if not payload["assessments"] or total != 100:
        assessment_blockers.append(f"The resulting assessment weights total {total}%. Review the assessment setup or import ULOs only.")
    return {"revision": revision, "ulos": ulo_rows, "assessments": assessment_rows,
            "retained_ulos": retained_ulos, "removed_assessments": [a["assessment_name"] for a in removed],
            "retained_assessments": [a["assessment_name"] for a in retained],
            "ulo_blockers": ulo_blockers, "assessment_blockers": assessment_blockers,
            "has_grades": bool(state["grades"]), "has_previews": bool(state["previews"])}
