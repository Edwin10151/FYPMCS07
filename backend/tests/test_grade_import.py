from decimal import Decimal

import pytest

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
