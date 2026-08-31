import asyncio
import io
from decimal import Decimal

import pytest
from openpyxl import Workbook
from starlette.datastructures import UploadFile

from app.main import _read_grade_upload
from app.services.grade_import import parse_mark, weighted_score


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
