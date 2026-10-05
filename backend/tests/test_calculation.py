from decimal import Decimal

import pytest

from app.services.calculation import attainment_percentage, even_ulo_contributions, rebalance_contributions, validate_ulo_contributions


def test_a_ulo_covered_by_four_assessments_gives_each_a_quarter():
    # The split is per ULO across its assessments, which is what makes the
    # coverage editor open at 100%.
    links = [(10, 1), (11, 1), (12, 1), (13, 1)]
    assert even_ulo_contributions(links) == {
        (10, 1): Decimal("25.00"),
        (11, 1): Decimal("25.00"),
        (12, 1): Decimal("25.00"),
        (13, 1): Decimal("25.00"),
    }


def test_each_ulo_totals_exactly_one_hundred():
    links = [(10, 1), (11, 1), (12, 1)]  # 33.33 x 3 = 99.99 without correction
    assert sum(even_ulo_contributions(links).values()) == Decimal("100.00")


def test_every_ulo_is_split_independently():
    # ULO1 is covered by two assessments, ULO2 by one. ULO2's single assessment
    # carries all of it, regardless of how many ULOs that assessment spans.
    links = [(10, 1), (11, 1), (10, 2)]
    contributions = even_ulo_contributions(links)
    assert contributions[(10, 1)] == Decimal("50.00")
    assert contributions[(11, 1)] == Decimal("50.00")
    assert contributions[(10, 2)] == Decimal("100.00")


def test_covering_more_outcomes_does_not_dilute_an_assessment():
    # One assessment covering six ULOs contributes fully to each of them.
    links = [(10, ulo) for ulo in range(1, 7)]
    assert set(even_ulo_contributions(links).values()) == {Decimal("100.00")}


def test_no_links_produces_no_contributions():
    assert even_ulo_contributions([]) == {}


def test_valid_contributions_are_independent_per_outcome():
    validate_ulo_contributions({(10, 1): Decimal("50"), (11, 1): Decimal("50"),
                                (10, 2): Decimal("100")})


@pytest.mark.parametrize("values", [[40, 40], [60, 60], [-10, 110], [0, 0]])
def test_invalid_contribution_totals(values):
    with pytest.raises(ValueError):
        validate_ulo_contributions({(i, 1): Decimal(value) for i, value in enumerate(values)})


def test_nonfinite_contributions_are_rejected():
    with pytest.raises(ValueError):
        validate_ulo_contributions({(10, 1): Decimal("NaN")})


def test_a_repeated_link_is_counted_once():
    assert even_ulo_contributions([(10, 1), (10, 1)]) == {(10, 1): Decimal("100.00")}


def test_the_worked_example_from_the_coordinator():
    """Student A's ULO attainment, using the coordinator's own figures.

        unit marks   A1 8/10   A2 30/40   A3 15/20   A4 10/15   A5 10/15
        contribution    20%       30%        20%        15%        15%

        achieved = 8x.2 + 30x.3 + 15x.2 + 10x.15 + 10x.15 = 16.6
        available = 10x.2 + 40x.3 + 20x.2 + 15x.15 + 15x.15 = 22.5
    """
    marks = [
        (Decimal("8"), Decimal("10"), Decimal("20")),
        (Decimal("30"), Decimal("40"), Decimal("30")),
        (Decimal("15"), Decimal("20"), Decimal("20")),
        (Decimal("10"), Decimal("15"), Decimal("15")),
        (Decimal("10"), Decimal("15"), Decimal("15")),
    ]
    achieved = sum(raw * pct / 100 for raw, _, pct in marks)
    available = sum(mx * pct / 100 for _, mx, pct in marks)

    assert achieved == Decimal("16.60")
    assert available == Decimal("22.50")
    assert attainment_percentage(achieved, available) == Decimal("73.78")


def test_a_perfect_student_reaches_one_hundred():
    assert attainment_percentage(Decimal("22.5"), Decimal("22.5")) == Decimal("100.00")


def test_nothing_available_is_not_a_division_error():
    assert attainment_percentage(Decimal("0"), Decimal("0")) == Decimal("0.00")


@pytest.mark.parametrize(
    "achieved,available,expected",
    [
        (Decimal("11.25"), Decimal("22.5"), Decimal("50.00")),  # exactly the pass line
        (Decimal("11.24"), Decimal("22.5"), Decimal("49.96")),
    ],
)
def test_the_pass_boundary(achieved, available, expected):
    assert attainment_percentage(achieved, available) == expected


# --------------------------------------------------------------------------- #
# Rebalancing after an assessment is added or removed
# --------------------------------------------------------------------------- #


def test_adding_an_assessment_does_not_push_an_outcome_over_one_hundred():
    """The reported bug: a Handbook 10% vlog split into two 5% vlogs.

    ULO1 was covered by three assessments at the even 33.33 default. Adding a
    fourth used to leave the first three untouched and give only the new link the
    recalculated 25.00, totalling 116.67.
    """
    previous = {
        (10, 1): Decimal("33.33"),
        (11, 1): Decimal("33.33"),
        (12, 1): Decimal("33.34"),
    }
    links = [(10, 1), (11, 1), (12, 1), (13, 1)]
    settled = rebalance_contributions(previous, links)
    assert sum(settled.values()) == Decimal("100.00")
    assert set(settled.values()) == {Decimal("25.00")}


def test_removing_an_assessment_tops_the_outcome_back_up_to_one_hundred():
    previous = {(10, 1): Decimal("25.00"), (11, 1): Decimal("25.00"),
                (12, 1): Decimal("25.00"), (13, 1): Decimal("25.00")}
    settled = rebalance_contributions(previous, [(10, 1), (11, 1), (12, 1)])
    assert sum(settled.values()) == Decimal("100.00")


def test_an_outcome_whose_assessments_are_unchanged_keeps_its_tuning():
    # The coordinator's 50/30/20 must survive a save that did not touch ULO1.
    previous = {(10, 1): Decimal("50.00"), (11, 1): Decimal("30.00"), (12, 1): Decimal("20.00")}
    settled = rebalance_contributions(previous, [(10, 1), (11, 1), (12, 1)])
    assert settled == previous


def test_only_the_changed_outcome_is_reset():
    # ULO1 gains an assessment; ULO2 does not, so ULO2's tuning survives.
    previous = {
        (10, 1): Decimal("60.00"), (11, 1): Decimal("40.00"),
        (10, 2): Decimal("70.00"), (12, 2): Decimal("30.00"),
    }
    links = [(10, 1), (11, 1), (13, 1), (10, 2), (12, 2)]
    settled = rebalance_contributions(previous, links)

    assert settled[(10, 1)] == settled[(11, 1)] == settled[(13, 1)] == Decimal("33.33") or \
           sum(settled[k] for k in [(10, 1), (11, 1), (13, 1)]) == Decimal("100.00")
    assert settled[(10, 2)] == Decimal("70.00")
    assert settled[(12, 2)] == Decimal("30.00")


def test_swapping_one_assessment_for_another_resets_the_outcome():
    previous = {(10, 1): Decimal("80.00"), (11, 1): Decimal("20.00")}
    settled = rebalance_contributions(previous, [(10, 1), (12, 1)])
    assert sum(settled.values()) == Decimal("100.00")
    assert settled[(10, 1)] == Decimal("50.00")


def test_an_outcome_with_no_history_gets_the_even_default():
    settled = rebalance_contributions({}, [(10, 1), (11, 1)])
    assert settled == {(10, 1): Decimal("50.00"), (11, 1): Decimal("50.00")}


def test_a_three_way_reset_still_totals_exactly_one_hundred():
    previous = {(10, 1): Decimal("50.00"), (11, 1): Decimal("50.00")}
    settled = rebalance_contributions(previous, [(10, 1), (11, 1), (12, 1)])
    assert sum(settled.values()) == Decimal("100.00")
