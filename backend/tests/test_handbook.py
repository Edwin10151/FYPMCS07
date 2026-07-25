import pytest

from app.services.handbook import HandbookImportError, normalise_page_content


def test_normalise_handbook_content_keeps_hurdles_outside_weighted_calculation():
    payload = normalise_page_content(
        {
            "unit_code": "FIT2004",
            "title": "Algorithms and <strong>data structures</strong>",
            "version_name": "2026.12",
            "unit_learning_outcomes": [
                {"code": "ULO1", "description": "<p>Analyse problems.</p>", "cl_id": "ulo-1"},
            ],
            "assessments": [
                {"name": "Portfolio", "weight": "100", "learning_outcomes": "1"},
                {
                    "name": "In-class tests",
                    "weight": "0",
                    "hurdle_type": {"value": "competency"},
                    "learning_outcomes": "1",
                },
            ],
        }
    )

    assert payload["title"] == "Algorithms and data structures"
    assert payload["assessments"][0]["weight"] == "100.00"
    assert payload["assessments"][1]["is_hurdle"] is True
    assert payload["assessments"][1]["ulo_codes"] == ["ULO1"]


def test_normalise_handbook_content_rejects_missing_learning_outcomes():
    with pytest.raises(HandbookImportError, match="no learning outcomes"):
        normalise_page_content({"unit_code": "FIT2004", "title": "Algorithms"})
