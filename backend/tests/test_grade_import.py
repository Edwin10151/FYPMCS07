import asyncio
import io
from decimal import Decimal

import pytest
from openpyxl import Workbook
from starlette.datastructures import UploadFile

from app.main import _grade_column_mappings, _read_grade_upload
from app.services.grade_import import parse_mark, weighted_score
import json
from fastapi import HTTPException


def test_weighted_score_normalizes_to_assessment_weight():
    assert weighted_score(Decimal("10"), Decimal("10"), Decimal("5")) == Decimal("5.00")
    assert weighted_score(Decimal("50"), Decimal("100"), Decimal("15")) == Decimal("7.50")


def test_parse_mark_handles_moodle_blank_values():
    assert parse_mark(" - ") is None
    assert parse_mark("") is None
    assert parse_mark("85%") == Decimal("85")


def test_weighted_score_rejects_out_of_range_mark():
    with pytest.raises(ValueError):
        weighted_score(Decimal("6"), Decimal("5"), Decimal("5"))


def test_percentage_mapping_enforces_100_and_matching_unit_weight():
    header = "Assignment: Reflection Entry 1(2.5%) (Percentage)"
    assessment = {1: {"weight": Decimal("2.5")}}
    mapping = {"assessment_id": 1, "csv_column": header, "max_mark": 100}
    assert _grade_column_mappings(json.dumps([mapping]), [header], assessment)[0]["score_type"] == "percentage"
    for invalid in [dict(mapping, max_mark=5), dict(mapping, score_type="raw")]:
        with pytest.raises(HTTPException):
            _grade_column_mappings(json.dumps([invalid]), [header], assessment)
    with pytest.raises(HTTPException):
        _grade_column_mappings(json.dumps([mapping]), [header], {1: {"weight": Decimal(5)}})


def test_raw_and_percentage_representations_cannot_be_counted_twice():
    headers = [f"Assignment: Vlog (5%) ({kind})" for kind in ["Real", "Percentage"]]
    assessments = {1: {"weight": Decimal(5)}, 2: {"weight": Decimal(5)}}
    mapping = [{"assessment_id": i + 1, "csv_column": h, "max_mark": 100} for i, h in enumerate(headers)]
    with pytest.raises(HTTPException):
        _grade_column_mappings(json.dumps(mapping), headers, assessments)


@pytest.mark.parametrize("header", ["Unit total (Percentage)", "Ungraded Assessments total (Real)", "Group.1", "Assignment: Report (Final Team Contribution) (Real)", "Assignment: Vlog (Letter)"])
def test_non_assessment_columns_cannot_be_imported_as_scores(header):
    mapping = [{"assessment_id": 1, "csv_column": header, "max_mark": 100}]
    with pytest.raises(HTTPException):
        _grade_column_mappings(json.dumps(mapping), [header], {1: {"weight": Decimal(5)}})


def test_excel_gradebook_uses_selected_worksheet_and_unique_headers():
    workbook = Workbook()
    workbook.active.title = "S1"
    full = workbook.create_sheet("FULL")
    full.append(["ID number", "Group", "Group"])
    full.append(["35029722", "A", "B"])
    content = io.BytesIO()
    workbook.save(content)
    upload = UploadFile(filename="grades.xlsx", file=io.BytesIO(content.getvalue()))

    filename, headers, rows, sheets, selected = asyncio.run(_read_grade_upload(upload, "FULL"))

    assert filename == "grades.xlsx [FULL]"
    assert headers == ["ID number", "Group", "Group [2]"]
    assert rows == [(2, {"ID number": "35029722", "Group": "A", "Group [2]": "B"})]
    assert sheets == ["S1", "FULL"]
    assert selected == "FULL"
