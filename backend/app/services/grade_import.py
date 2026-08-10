from decimal import Decimal, InvalidOperation, ROUND_HALF_UP


def parse_mark(raw_value: str | None) -> Decimal | None:
    """Return a CSV mark, treating Moodle's blank and dash values as absent."""
    value = (raw_value or "").strip().replace("%", "")
    if not value or value == "-":
        return None
    try:
        return Decimal(value)
    except InvalidOperation as exc:
        raise ValueError("Mark is not numeric") from exc


def weighted_score(raw_mark: Decimal, max_mark: Decimal, assessment_weight: Decimal) -> Decimal:
    if max_mark <= 0:
        raise ValueError("Maximum mark must be greater than zero")
    if raw_mark < 0 or raw_mark > max_mark:
        raise ValueError("Mark must be between zero and the maximum mark")
    return ((raw_mark / max_mark) * assessment_weight).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
