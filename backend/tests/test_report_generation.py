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
    format_action_plan,
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


def test_report_distinguishes_student_cutoff_from_cohort_target():
    report = generate_report(evidence(False), "mock", "", "", 5).draft
    assert "1 of 2 learning outcomes met the 70.0% cohort achievement target" in report.attainment_analysis
    assert "individual attainment of 50.0% or above" in report.attainment_analysis
    assert "68.00% to 88.00%" in report.attainment_analysis
    assert "Prioritise LO1" in report.next_cohort_action_plan


@pytest.mark.parametrize("rate,met", [("69.99", False), ("70", True)])
def test_cohort_target_uses_achievement_rate_not_high_average(rate, met):
    current = evidence(False)
    outcome = current.learning_outcomes[0].model_copy(update={
        "average_attainment_pct": Decimal("75"), "pass_rate_pct": Decimal(rate),
    })
    current.learning_outcomes = [outcome]
    report = generate_report(current, "mock", "", "", 5).draft
    assert f"{int(met)} of 1 learning outcomes met" in report.attainment_analysis
    assert f"{Decimal(rate):.2f}%" in report.attainment_analysis
    assert ("Prioritise" not in report.next_cohort_action_plan) == met


def test_fit3161_averages_below_70_still_meet_cohort_target():
    current = evidence(False)
    current.learning_outcomes = [
        current.learning_outcomes[0].model_copy(update={
            "code": f"ULO{i}", "average_attainment_pct": Decimal(mean),
            "pass_rate_pct": Decimal(rate), "enrolled_count": 20,
            "achieved_count": count,
        })
        for i, mean, rate, count in [(1, "66.48", "85", 17), (2, "63.36", "75", 15),
                                     (3, "63.42", "75", 15), (4, "63.36", "75", 15),
                                     (5, "63.51", "75", 15), (6, "63.36", "75", 15)]
    ]
    report = generate_report(current, "mock", "", "", 5).draft
    assert "6 of 6 learning outcomes met the 70.0%" in report.attainment_analysis
    assert "75.00% to 85.00%" in report.attainment_analysis
    assert "Lowest average attainment: ULO2, ULO4, ULO6" in report.attainment_analysis


def test_equal_averages_are_not_described_as_highest_and_lowest():
    current = evidence(False)
    for outcome in current.learning_outcomes:
        outcome.average_attainment_pct = Decimal("65")
    report = generate_report(current, "mock", "", "", 5).draft
    assert "same average attainment at 65.0%" in report.attainment_analysis
    assert "Highest average" not in report.attainment_analysis


def test_legacy_evidence_without_cohort_target_remains_readable():
    legacy = evidence(False).model_dump(exclude={"cohort_target_pct"})
    assert ReportEvidence.model_validate(legacy).cohort_target_pct == Decimal("70")


def test_previous_cohort_comparison_excludes_changed_learning_outcome_definitions():
    current = evidence()
    current.learning_outcomes[0].description = "A different learning outcome"
    generated = generate_report(current, "mock", "", "", 5)
    comparison = generated.draft.previous_cohort_outcomes
    assert "LO1 increased" not in comparison
    assert "LO2 decreased" in comparison
    assert comparison.count("LO2 decreased") == 1
    assert "excluded from this comparison" in comparison


def test_previous_cohort_with_no_matching_definitions_is_not_compared():
    current = evidence()
    for outcome in current.learning_outcomes:
        outcome.description = "Changed definition"
    comparison = generate_report(current, "mock", "", "", 5).draft.previous_cohort_outcomes
    assert "direct comparison is not available" in comparison


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
    assert prompt_data["weakest_outcome"]["met_target"] is False
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


def test_nested_model_action_plan_becomes_readable_text(monkeypatch):
    plan = {
        "action": "Introduce an early LO1 proof exercise.\nReview the results with students.",
        "target_ulo": "LO1",
        "assessment_concerned": "Complexity proofs",
        "effect_check_method": "Compare LO1 attainment in the next offering.",
    }

    def fake_post(url, **kwargs):
        content = json.dumps({"next_cohort_action_plan": json.dumps(plan)})
        return httpx.Response(
            200, request=httpx.Request("POST", url),
            json={"message": {"content": content}},
        )

    monkeypatch.setattr(httpx, "post", fake_post)
    generated = generate_report(evidence(False), "ollama", "http://ollama:11434", "test-model", 30)
    action = generated.draft.next_cohort_action_plan
    assert action == (
        "Action: Introduce an early LO1 proof exercise.\nReview the results with students.\n\n"
        "Target ULO: LO1\n\nAssessment: Complexity proofs\n\n"
        "Effect check: Compare LO1 attainment in the next offering."
    )
    assert action in generated.plain_text
    assert '"action"' not in generated.plain_text


@pytest.mark.parametrize("value", [
    "Keep the coordinator's prose unchanged.",
    '{"action": "Incomplete JSON',
    '{"action": "LO1 check", "unrecognised_field": "Do not drop this detail"}',
    '{"action": "LO1 check", "effect_check_method": {"nested": "detail"}}',
    '{"action": ""}',
    '["LO1 check"]',
])
def test_format_action_plan_preserves_prose_and_unrecognised_data(value):
    assert format_action_plan(value) == value


@pytest.mark.parametrize("value", [
    '{"unexpected": "LO1 check"}',
    '["LO1 check"]',
])
def test_model_rejects_unrecognised_nested_json(value):
    with pytest.raises(ValueError, match="readable text"):
        ActionPlanSuggestion(next_cohort_action_plan=value)


def test_previous_approved_action_is_formatted_without_losing_its_details():
    current = evidence()
    previous = PreviousOfferingEvidence(
        **current.previous_offering.model_dump(exclude={"next_cohort_action_plan"}),
        next_cohort_action_plan=json.dumps({"action": "Add an LO1 check."}),
    )
    current.previous_offering = previous
    generated = generate_report(current, "mock", "", "", 5)
    assert "previous approved action plan proposed: Action: Add an LO1 check." in generated.draft.previous_cohort_outcomes


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
