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


def test_normalise_handbook_content_keeps_only_selected_semester_and_location():
    payload = normalise_page_content(
        {
            "unit_code": "FIT3161",
            "title": "Computer Science Project 1",
            "unit_learning_outcomes": [{"number": "1", "description": "Plan a project."}],
            "assessments": [
                {
                    "name": "S1 proposal",
                    "weight": "45",
                    "learning_outcomes": "1",
                    "offerings_formatted": "First semester, Malaysia (Day) - Clayton",
                },
                {
                    "name": "S2 presentation",
                    "weight": "30",
                    "learning_outcomes": "1",
                    "offerings_formatted": "Second semester, Malaysia (Day) - Clayton",
                },
            ],
        },
        period="S1",
        location="Malaysia",
    )

    assert [assessment["name"] for assessment in payload["assessments"]] == ["S1 proposal"]
    assert payload["offering_scope"] == {"period": "S1", "location": "Malaysia"}


def test_normalise_handbook_content_excludes_unscoped_assessments_when_scope_is_selected():
    payload = normalise_page_content(
        {
            "unit_code": "FIT3161",
            "title": "Computer Science Project 1",
            "unit_learning_outcomes": [{"number": "1", "description": "Plan a project."}],
            "assessments": [{"name": "Unscoped task", "weight": "20", "learning_outcomes": "1"}],
        },
        period="S1",
        location="Malaysia",
    )

    assert payload["assessments"] == []
    assert "Unscoped task" in payload["warnings"][0]


def test_normalise_handbook_content_keeps_assessments_when_scope_labels_are_all_blank():
    payload = normalise_page_content(
        {
            "unit_code": "FIT3161",
            "title": "Computer Science Project 1",
            "unit_learning_outcomes": [{"number": "1", "description": "Plan a project."}],
            "assessments": [
                {"name": "Proposal", "weight": "45", "learning_outcomes": "1", "offerings_formatted": ""},
                {"name": "Reflection", "weight": "10", "learning_outcomes": "1", "offerings_formatted": ""},
            ],
        },
        period="S1",
        location="Malaysia",
    )

    assert [assessment["name"] for assessment in payload["assessments"]] == ["Proposal", "Reflection"]
    assert "did not publish assessment offering labels" in payload["warnings"][0]
