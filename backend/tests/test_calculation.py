from decimal import Decimal

from app.services.calculation import attainment_percentage, split_weight


def test_split_weight_evenly_across_linked_ulos():
    assert split_weight(Decimal("25.00"), [1, 2, 3]) == {
        1: Decimal("8.33"),
        2: Decimal("8.33"),
        3: Decimal("8.34"),
    }


def test_split_weight_always_preserves_the_assessment_weight():
    allocations = split_weight(Decimal("100.00"), [1, 2, 3, 4, 5, 6])
    assert sum(allocations.values()) == Decimal("100.00")


def test_attainment_percentage():
    assert attainment_percentage(Decimal("32.50"), Decimal("50.00")) == Decimal("65.00")
