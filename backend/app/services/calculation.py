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


def rebalance_contributions(
    previous: dict[tuple[int, int], Decimal],
    links: Iterable[tuple[int, int]],
) -> dict[tuple[int, int], Decimal]:
    """Settle every (assessment, ULO) contribution after an assessments save.

    A ULO whose set of covering assessments is unchanged keeps whatever the
    coordinator tuned. A ULO that gained or lost an assessment is reset to an
    even split, because its old percentages were shares of a different set and
    leaving them would push the outcome past 100%: three assessments at 33.33
    plus a fourth at the new 25.00 default totals 116.67.

    Resetting does discard tuning for that one outcome. That is the deliberate
    trade: an outcome that always totals 100 is worth more than tuning silently
    surviving into a split it no longer describes.
    """
    links = list(links)

    before: dict[int, set[int]] = {}
    for assessment_id, offering_ulo_id in previous:
        before.setdefault(offering_ulo_id, set()).add(assessment_id)

    after: dict[int, set[int]] = {}
    for assessment_id, offering_ulo_id in links:
        after.setdefault(offering_ulo_id, set()).add(assessment_id)

    changed = {ulo for ulo, members in after.items() if before.get(ulo, set()) != members}

    evened = even_ulo_contributions([l for l in links if l[1] in changed])

    settled: dict[tuple[int, int], Decimal] = {}
    for link in links:
        if link[1] in changed:
            settled[link] = evened[link]
        else:
            settled[link] = previous.get(link, Decimal("0.00"))
    return settled
