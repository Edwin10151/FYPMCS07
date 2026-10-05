import asyncio
import io
import json
from decimal import Decimal

import pytest
from fastapi import HTTPException
from starlette.datastructures import UploadFile

from app import main
from test_workflow_integration import db, fixture, insert


def setup_components(db, fixture, weights=(5, 5)):
    offering = fixture["offerings"][0]
    ulo = insert(db, "INSERT INTO offering_ulo (offering_id, ulo_code, description) VALUES (%s, 'LO1', 'Vlog')", (offering,))
    student = insert(db, "INSERT INTO student (student_code, full_name) VALUES ('component-student', 'Test')")
    enrollment = insert(db, "INSERT INTO enrollment (student_id, offering_id) VALUES (%s, %s)", (student, offering))
    payload = main.AssessmentsUpdate(offering_id=offering, assessments=[main.AssessmentRowInput(
        assessment_name="Individual reflections", weight=sum(weights), ulo_codes=["LO1"],
        components=[main.AssessmentComponentInput(component_name=f"Reflection {i + 1}", weight=w) for i, w in enumerate(weights)],
    )])
    main.save_assessments(payload, fixture["user"])
    result = main.assessments(fixture["user"], offering)["assessments"][0]
    return offering, enrollment, ulo, result


def upload(fixture, offering, assessment, entries):
    headers = ["ID number"] + [f"Score {i}" for i in range(len(entries))]
    values = ["component-student"] + [str(score) for _, score, _ in entries]
    content = (",".join(headers) + "\n" + ",".join(values) + "\n").encode()
    mapping = [{"assessment_id": assessment["assessment_id"], "component_id": c["component_id"], "csv_column": headers[i + 1], "max_mark": maximum}
               for i, (c, score, maximum) in enumerate(entries)]
    return asyncio.run(main.preview_grade_upload(user=fixture["user"], offering_id=offering,
        student_code_column="ID number", assessment_columns=json.dumps(mapping), sheet_name=None,
        file=UploadFile(filename="components.csv", file=io.BytesIO(content))))


def test_three_components_with_different_scales_and_weights(db, fixture):
    offering, enrollment, ulo, assessment = setup_components(db, fixture, (3, 4, 8))
    a, b, c = assessment["components"]
    preview = upload(fixture, offering, assessment, [(a, 8, 10), (b, 12, 20), (c, 90, 100)])
    assert preview["issues"] == []
    result = main.commit_grade_upload(preview["upload_batch_id"], fixture["user"])
    assert result["component_grades_saved"] == 3
    assert result["grades_saved"] == 1
    grade = db.execute("SELECT raw_mark, max_mark, weighted_score FROM student_grade WHERE enrollment_id=%s", (enrollment,)).fetchone()
    assert grade == {"raw_mark": Decimal("80.00"), "max_mark": Decimal("100.00"), "weighted_score": Decimal("12.00")}
    assert db.execute("SELECT attainment_pct FROM student_ulo_attainment WHERE offering_ulo_id=%s", (ulo,)).fetchone()["attainment_pct"] == Decimal("80.00")
    assert main.assessments(fixture["user"], offering)["assessments"][0]["components_locked"]


def test_hashed_vlog_percentage_columns_combine_without_double_weighting(db, fixture):
    offering, enrollment, ulo, assessment = setup_components(db, fixture)
    headers = [f"Assignment: Individual Vlog Reflections (Week {week}) 5% (Percentage)" for week in (5, 12)]
    mappings = [{"assessment_id": assessment["assessment_id"], "component_id": component["component_id"],
                 "csv_column": header, "max_mark": 100, "score_type": "percentage"}
                for component, header in zip(assessment["components"], headers)]
    content = ("ID number," + ",".join(headers) + "\ncomponent-student,75.00 %,85.00 %\n").encode()
    preview = asyncio.run(main.preview_grade_upload(user=fixture["user"], offering_id=offering,
        student_code_column="ID number", assessment_columns=json.dumps(mappings), sheet_name=None,
        file=UploadFile(filename="vlogs.csv", file=io.BytesIO(content))))
    assert preview["issues"] == []
    assert preview["score_preview"][0]["score"] == "75.00"
    assert preview["score_preview"][0]["maximum"] == "100"
    assert preview["score_preview"][0]["earned_unit_marks"] == "3.75"
    assert preview["score_preview"][1]["earned_unit_marks"] == "4.25"
    result = main.commit_grade_upload(preview["upload_batch_id"], fixture["user"])
    assert result["component_grades_saved"] == 2 and result["grades_saved"] == 1
    grade = db.execute("SELECT raw_mark, max_mark, weighted_score FROM student_grade WHERE enrollment_id=%s", (enrollment,)).fetchone()
    assert grade == {"raw_mark": Decimal("80.00"), "max_mark": Decimal("100.00"), "weighted_score": Decimal("8.00")}
    assert db.execute("SELECT attainment_pct FROM student_ulo_attainment WHERE offering_ulo_id=%s", (ulo,)).fetchone()["attainment_pct"] == Decimal("80.00")


def test_partial_upload_correction_blank_and_zero(db, fixture):
    offering, enrollment, _, assessment = setup_components(db, fixture)
    a, b = assessment["components"]
    first = upload(fixture, offering, assessment, [(a, 7.5, 10)])
    assert any("incomplete" in issue["message"] for issue in first["issues"])
    result = main.commit_grade_upload(first["upload_batch_id"], fixture["user"])
    assert result["component_grades_saved"] == 1 and result["grades_saved"] == 0
    assert db.execute("SELECT COUNT(*) AS n FROM student_grade").fetchone()["n"] == 0
    second = upload(fixture, offering, assessment, [(b, 8.5, 10)])
    main.commit_grade_upload(second["upload_batch_id"], fixture["user"])
    assert db.execute("SELECT weighted_score FROM student_grade").fetchone()["weighted_score"] == Decimal("8.00")
    correction = upload(fixture, offering, assessment, [(a, 9.5, 10), (b, "", 10)])
    assert any("retained" in issue["message"] for issue in correction["issues"])
    main.commit_grade_upload(correction["upload_batch_id"], fixture["user"])
    assert db.execute("SELECT weighted_score FROM student_grade").fetchone()["weighted_score"] == Decimal("9.00")
    zero = upload(fixture, offering, assessment, [(a, 0, 10)])
    main.commit_grade_upload(zero["upload_batch_id"], fixture["user"])
    assert db.execute("SELECT weighted_score FROM student_grade").fetchone()["weighted_score"] == Decimal("4.25")
    assert db.execute("SELECT COUNT(*) AS n FROM student_component_grade WHERE enrollment_id=%s", (enrollment,)).fetchone()["n"] == 2


def test_component_structure_is_locked_after_preview(db, fixture):
    offering, _, _, assessment = setup_components(db, fixture)
    a, b = assessment["components"]
    upload(fixture, offering, assessment, [(a, 7, 10)])
    payload = main.AssessmentsUpdate(offering_id=offering, assessments=[main.AssessmentRowInput(
        assessment_id=assessment["assessment_id"], assessment_name=assessment["assessment_name"],
        weight=10, ulo_codes=["LO1"], components=[main.AssessmentComponentInput(**a), main.AssessmentComponentInput(**b)],
    )])
    main.save_assessments(payload, fixture["user"])
    payload.assessments[0].components[0].component_name = "Different task"
    with pytest.raises(HTTPException) as raised:
        main.save_assessments(payload, fixture["user"])
    assert raised.value.status_code == 409


def test_component_total_must_match_parent(db, fixture):
    payload = main.AssessmentsUpdate(offering_id=fixture["offerings"][0], assessments=[main.AssessmentRowInput(
        assessment_name="Vlogs", weight=10, components=[main.AssessmentComponentInput(component_name="First", weight=3)],
    )])
    with pytest.raises(HTTPException) as raised:
        main.save_assessments(payload, fixture["user"])
    assert raised.value.status_code == 422


def test_upload_split_retains_existing_grade_and_rejects_old_parent_preview(db, fixture):
    offering, enrollment, _, assessment = setup_components(db, fixture)
    aid = assessment["assessment_id"]
    db.execute("DELETE FROM assessment_component WHERE assessment_id=%s", (aid,))
    db.execute("INSERT INTO student_grade (enrollment_id, offering_id, assessment_id, raw_mark, max_mark, weighted_score) VALUES (%s,%s,%s,90,100,9)", (enrollment, offering, aid))
    old = asyncio.run(main.preview_grade_upload(user=fixture["user"], offering_id=offering,
        student_code_column="ID number", assessment_columns=json.dumps([{"assessment_id":aid,"csv_column":"Score","max_mark":100}]), sheet_name=None,
        file=UploadFile(filename="old.csv", file=io.BytesIO(b"ID number,Score\ncomponent-student,50\n"))))
    saved = main.save_upload_components(offering, aid, main.UploadComponentsInput(components=[
        main.AssessmentComponentInput(component_name="First",weight=5),
        main.AssessmentComponentInput(component_name="Second",weight=5)]), fixture["user"])
    assert len(saved["components"]) == 2
    assert db.execute("SELECT weighted_score FROM student_grade WHERE enrollment_id=%s", (enrollment,)).fetchone()["weighted_score"] == Decimal(9)
    with pytest.raises(HTTPException) as raised:
        main.commit_grade_upload(old["upload_batch_id"], fixture["user"])
    assert raised.value.status_code == 409
    assessment["components"] = saved["components"]
    first = upload(fixture, offering, assessment, [(saved["components"][0],75,100)])
    main.commit_grade_upload(first["upload_batch_id"], fixture["user"])
    assert db.execute("SELECT weighted_score FROM student_grade WHERE enrollment_id=%s", (enrollment,)).fetchone()["weighted_score"] == Decimal(9)
    second = upload(fixture, offering, assessment, [(saved["components"][1],85,100)])
    main.commit_grade_upload(second["upload_batch_id"], fixture["user"])
    assert db.execute("SELECT weighted_score FROM student_grade WHERE enrollment_id=%s", (enrollment,)).fetchone()["weighted_score"] == Decimal(8)
    with pytest.raises(HTTPException) as raised:
        main.save_upload_components(offering, aid, main.UploadComponentsInput(components=[]), fixture["user"])
    assert raised.value.status_code == 409


def test_handbook_replacement_cannot_delete_configured_components(db, fixture):
    offering, _, _, assessment = setup_components(db, fixture)
    db.execute("UPDATE assessment SET source = 'handbook' WHERE assessment_id = %s", (assessment["assessment_id"],))
    payload = {"unit_code": "FIT9991", "learning_outcomes": [{"code": "LO1", "description": "Vlog"}],
               "assessments": [{"name": "Portfolio", "weight": "100", "is_hurdle": False, "ulo_codes": ["LO1"]}]}
    snapshot = insert(db, "INSERT INTO handbook_import_snapshot (offering_id, source_url, payload) VALUES (%s, 'https://example.test', %s::jsonb)", (offering, json.dumps(payload)))
    review = main.review_handbook(payload, main._handbook_state(db.cursor(), offering))
    with pytest.raises(HTTPException) as raised:
        main.confirm_handbook_import(offering, main.HandbookImportConfirmation(handbook_import_id=snapshot, review_revision=review["revision"]), fixture["user"])
    assert raised.value.status_code == 409
    assert "components cannot" in raised.value.detail
    assert len(main.assessments(fixture["user"], offering)["assessments"][0]["components"]) == 2


def test_mapping_rejects_duplicate_foreign_and_parent_targets():
    assessments = {1: {"weight": Decimal(10), "components": [
        {"component_id": 11, "weight": Decimal(5)}, {"component_id": 12, "weight": Decimal(5)}]}}
    first = {"assessment_id": 1, "component_id": 11, "csv_column": "First", "max_mark": 10}
    second = {"assessment_id": 1, "component_id": 12, "csv_column": "Second", "max_mark": 20}
    assert len(main._grade_column_mappings(json.dumps([first, second]), ["First", "Second"], assessments)) == 2
    for invalid in [dict(second, component_id=11), dict(second, component_id=99), dict(second, csv_column="First"), dict(second, component_id=None), dict(second, max_mark="NaN")]:
        with pytest.raises(HTTPException):
            main._grade_column_mappings(json.dumps([first, invalid]), ["First", "Second"], assessments)
