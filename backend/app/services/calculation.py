from decimal import Decimal, ROUND_HALF_UP
from typing import Iterable


def even_ulo_contributions(
    links: Iterable[tuple[int, int]]
) -> dict[tuple[int, int], Decimal]:
    """Default contribution percentages for each (assessment, ULO) link.

    A contribution says how much of an assessment's marks count toward a ULO.
    The default splits 100% evenly across the assessments that cover that ULO:
    if four assessments cover ULO1, each contributes 25% of its marks to it, and
    ULO1's contributions add up to exactly 100%.

    Note the direction. The split is per ULO, across its assessments -- not per
    assessment, across the ULOs it covers. An assessment covering six ULOs gives
    each of them its own independent share; covering more outcomes never dilutes
    what it contributes to any one of them.

    Rounding is absorbed by the last assessment for each ULO, so a ULO covered by
    three assessments totals 100.00 rather than 99.99.
    """
    by_ulo: dict[int, list[int]] = {}
    for assessment_id, offering_ulo_id in links:
        covering = by_ulo.setdefault(offering_ulo_id, [])
        if assessment_id not in covering:
            covering.append(assessment_id)

    contributions: dict[tuple[int, int], Decimal] = {}
    for offering_ulo_id, assessment_ids in by_ulo.items():
        share = (Decimal(100) / Decimal(len(assessment_ids))).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        for assessment_id in assessment_ids:
            contributions[(assessment_id, offering_ulo_id)] = share
        remainder = Decimal(100) - share * len(assessment_ids)
        contributions[(assessment_ids[-1], offering_ulo_id)] += remainder

    return contributions


def attainment_percentage(achieved_marks: Decimal, total_available_marks: Decimal) -> Decimal:
    """A ULO's attainment: marks earned toward it over marks available for it.

    Both sides are already contribution-weighted, so this is the final ratio:
        achieved = sum(raw_mark  x contribution%)
        total    = sum(max_mark  x contribution%)
    """
    if total_available_marks <= 0:
        return Decimal("0.00")
    return ((achieved_marks / total_available_marks) * Decimal("100")).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )
