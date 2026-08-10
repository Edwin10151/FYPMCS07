from decimal import Decimal, ROUND_HALF_UP


def split_weight(weight: Decimal, linked_ulos: list[int]) -> dict[int, Decimal]:
    if not linked_ulos:
        return {}
    share = (weight / Decimal(len(linked_ulos))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    allocated = {ulo_id: share for ulo_id in linked_ulos}
    # Keep the persisted allocation equal to the parent assessment weight.
    allocated[linked_ulos[-1]] += weight - sum(allocated.values())
    return allocated


def attainment_percentage(achieved_weight: Decimal, total_available_weight: Decimal) -> Decimal:
    if total_available_weight <= 0:
        return Decimal("0.00")
    return ((achieved_weight / total_available_weight) * Decimal("100")).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )
