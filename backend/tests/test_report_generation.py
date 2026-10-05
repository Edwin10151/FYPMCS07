import json
from decimal import Decimal

import httpx
import pytest

from app.services.report_generation import (
    ActionPlanSuggestion,
    AssessmentEvidence,
    LearningOutcomeEvidence,
    PreviousOfferingEvidence,
    ReportEvidence,
    ReportGenerationError,
    attainment_grade,
    generate_report,
)


def evidence(previous: bool = True) -> ReportEvidence:
    current_outcomes = [
        LearningOutcomeEvidence(
            code="LO1",
            description="Analyse problems",
            average_attainment_pct=Decimal("62.0"),
            attainment_grade="C",
            pass_rate_pct=Decimal("68.0"),
            enrolled_count=100,
            achieved_count=68,
        ),
        LearningOutcomeEvidence(
            code="LO2",
            description="Design solutions",
            average_attainment_pct=Decimal("81.0"),
            attainment_grade="HD",
            pass_rate_pct=Decimal("88.0"),
            enrolled_count=100,
            achieved_count=88,
        ),
    ]
    previous_offering = None
    if previous:
        previous_offering = PreviousOfferingEvidence(
            year=2025,
            period="JUL",
            student_count=90,
            learning_outcomes=[
                LearningOutcomeEvidence(
                    code="LO1",
                    description="Analyse problems",
                    average_attainment_pct=Decimal("58.0"),
                    attainment_grade="P",
                    pass_rate_pct=Decimal("64.0"),
                    enrolled_count=90,
                    achieved_count=58,
                ),
                LearningOutcomeEvidence(
                    code="LO2",
                    description="Design solutions",
                    average_attainment_pct=Decimal("84.0"),
                    attainment_grade="HD",
                    pass_rate_pct=Decimal("90.0"),
                    enrolled_count=90,
                    achieved_count=81,
                ),
            ],
        )
    return ReportEvidence(
        offering_id=7,
        unit_code="FIT2004",
        unit_name="Algorithms and Data Structures",
        year=2026,
        period="FEB",
        student_count=100,
        learning_outcomes=current_outcomes,
        assessments=[AssessmentEvidence(name="Complexity proofs", weight=20, ulo_codes=["LO1"])],
        previous_offering=previous_offering,
    )


def test_mock_report_uses_current_and_previous_aggregate_evidence():
    generated = generate_report(evidence(), "mock", "", "", 5)

    assert generated.provider == "mock"
    assert "LO1" in generated.draft.attainment_analysis
    assert "JUL 2025" in generated.draft.previous_cohort_outcomes
    assert "4.0 percentage points" in generated.draft.previous_cohort_outcomes
    assert "% percentage points" not in generated.draft.previous_cohort_outcomes
    assert "Complexity proofs" in generated.draft.next_cohort_action_plan
    assert "student_id" not in generated.model_dump_json()
    assert "email" not in generated.model_dump_json()


def test_attainment_grade_boundaries():
    assert [attainment_grade(Decimal(value)) for value in ("80", "70", "60", "50", "49.99")] == ["HD", "D", "C", "P", "N"]


def test_ollama_request_enforces_schema_and_validates_response(monkeypatch):
    expected = ActionPlanSuggestion(
        next_cohort_action_plan="Add a formative proof exercise for LO1.",
    )
    captured = {}

    def fake_post(url, **kwargs):
        captured.update({"url": url, **kwargs})
        return httpx.Response(
            200,
            request=httpx.Request("POST", url),
            json={"message": {"content": expected.model_dump_json()}},
        )

    monkeypatch.setattr(httpx, "post", fake_post)
    generated = generate_report(evidence(False), "ollama", "http://ollama:11434", "test-model", 30)

    assert "LO2" in generated.draft.attainment_analysis
    assert "No verified previous-offering" in generated.draft.previous_cohort_outcomes
    assert generated.draft.next_cohort_action_plan == expected.next_cohort_action_plan
    assert captured["json"]["format"] == ActionPlanSuggestion.model_json_schema()
    assert captured["json"]["options"] == {
        "temperature": 0,
        "num_ctx": 4096,
        "num_predict": 1200,
    }
    assert captured["json"]["keep_alive"] == "10m"
    prompt = captured["json"]["messages"][1]["content"]
    prompt_data = json.loads(prompt)
    assert prompt_data["weakest_outcome"]["code"] == "LO1"
    assert "student_count" not in prompt_data
    assert "student_id" not in prompt
    assert "email" not in prompt


def test_ollama_falls_back_when_action_invents_a_percentage(monkeypatch):
    def fake_post(url, **kwargs):
        return httpx.Response(
            200,
            request=httpx.Request("POST", url),
            json={"message": {"content": '{"next_cohort_action_plan":"Raise LO1 to 99%."}'}},
        )

    monkeypatch.setattr(httpx, "post", fake_post)
    generated = generate_report(evidence(False), "ollama", "http://ollama:11434", "test-model", 30)

    assert "99%" not in generated.draft.next_cohort_action_plan
    assert "LO1" in generated.draft.next_cohort_action_plan


def test_ollama_rejects_an_invalid_structured_response(monkeypatch):
    def fake_post(url, **kwargs):
        return httpx.Response(
            200,
            request=httpx.Request("POST", url),
            json={"message": {"content": "not-json"}},
        )

    monkeypatch.setattr(httpx, "post", fake_post)
    with pytest.raises(ReportGenerationError, match="invalid report draft"):
        generate_report(evidence(False), "ollama", "http://ollama:11434", "test-model", 30)
