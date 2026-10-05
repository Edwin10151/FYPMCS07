from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import re


def grade_column_details(header: str) -> tuple[str, str, Decimal | None]:
    """Identify Moodle representations without treating an item weight as its maximum."""
    header = re.sub(r"\s*\[\d+\]$", "", header.strip())
    excluded = bool(re.search(r"\(Letter\)$|\btotal\b|team contribution", header, re.I)
                    or re.match(r"^(group(?:\.|\s|$)|username$|id number$|student[ _](id|number)$|first name$|last name$|email address$|last downloaded|external tool:)", header, re.I))
    kind = "excluded" if excluded else "percentage" if re.search(r"\(Percentage\)$", header, re.I) else "raw" if re.search(r"\(Real\)$", header, re.I) else "unknown"
    weight_match = re.search(r"(\d+(?:\.\d+)?)\s*%", header)
    weight = Decimal(weight_match.group(1)) if weight_match else None
    task = re.sub(r"^(Assignment|Quiz|Manual item):\s*", "", header, flags=re.I)
    task = re.sub(r"\s*\((Real|Percentage|Letter)\)$", "", task, flags=re.I)
    task = re.sub(r"\(?\s*\d+(?:\.\d+)?\s*%\s*\)?", "", task)
    task = re.sub(r"[^a-z0-9]+", " ", task.lower()).strip()
    return kind, task, weight


def parse_mark(raw_value: str | None) -> Decimal | None:
    """Return a CSV mark, treating Moodle's blank and dash values as absent."""
    value = (raw_value or "").strip().replace("%", "")
    if not value or value == "-":
        return None
    try:
        mark = Decimal(value)
        if not mark.is_finite():
            raise ValueError("Mark must be finite")
        return mark
    except InvalidOperation as exc:
        raise ValueError("Mark is not numeric") from exc


def weighted_score(raw_mark: Decimal, max_mark: Decimal, assessment_weight: Decimal) -> Decimal:
    if not max_mark.is_finite() or max_mark <= 0:
        raise ValueError("Maximum mark must be greater than zero")
    if not raw_mark.is_finite() or raw_mark < 0 or raw_mark > max_mark:
        raise ValueError("Mark must be between zero and the maximum mark")
    return ((raw_mark / max_mark) * assessment_weight).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
