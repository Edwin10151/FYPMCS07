import io

from fastapi import HTTPException
from openpyxl import Workbook
import pytest

from app.main import _parse_staffing_roster


def workbook_bytes(codes):
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["Tutor List"])
    sheet.append([None, "Programme", "Unit Code", "Unit Name", "Lecture"])
    sheet.append([None, None, None, None, "Name", "Email"])
    for index, code in enumerate(codes):
        sheet.append([None, "BCS" if index == 0 else "BIT", code, "Test unit", "Test staff", "test@example.test"])
    output = io.BytesIO()
    workbook.save(output)
    workbook.close()
    return output.getvalue()


def test_repeated_unit_blocks_merge_programmes_and_staff():
    units = _parse_staffing_roster(workbook_bytes(["FIT9991", "FIT9991"]))
    assert len(units) == 1
    assert units[0]["programme_codes"] == ["BCS", "BIT"]
    assert len(units[0]["staffing"]) == 2


def test_overlapping_crosslisted_unit_blocks_are_rejected():
    with pytest.raises(HTTPException) as raised:
        _parse_staffing_roster(workbook_bytes(["FIT9991/FIT9992", "FIT9992"]))
    assert raised.value.status_code == 422
