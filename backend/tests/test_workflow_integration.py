"""Run against an isolated database initialised with the schema and migrations.

Set WORKFLOW_TEST_DATABASE_URL to a database named fyp_workflow_test.
Each test rolls back its fixture and all endpoint writes.
"""
from contextlib import contextmanager
from decimal import Decimal
import json
import os

import psycopg
from psycopg.rows import dict_row
import pytest
from fastapi import HTTPException

from app import main, seed


@pytest.fixture
def db(monkeypatch):
    url = os.environ.get("WORKFLOW_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Isolated workflow database not configured")
    conn = psycopg.connect(url, row_factory=dict_row)
    assert conn.info.dbname == "fyp_workflow_test", "Never run against a shared database"

    @contextmanager
    def connection():
        yield conn

    def fetch_all(query, params=None):
        return conn.execute(query, params).fetchall()

    monkeypatch.setattr(main, "get_conn", connection)
    monkeypatch.setattr(main, "fetch_all", fetch_all)
    monkeypatch.setattr(main, "fetch_one", lambda q, p=None: conn.execute(q, p).fetchone())
    monkeypatch.setattr(main, "ensure_offering_access", lambda *a, **k: None)
    try:
        yield conn
    finally:
        conn.rollback()
        conn.close()


def insert(db, query, params=()):
    return next(iter(db.execute(query + " RETURNING *", params).fetchone().values()))


@pytest.fixture
def fixture(db):
    users = [insert(db, "INSERT INTO app_user (full_name, email, password_hash, role_id) "
                       "VALUES (%s, %s, 'unchanged-password', (SELECT role_id FROM role WHERE role_name='coordinator'))",
                    (name, f"{name}@example.test")) for name in ["old", "new", "manual"]]
    semesters = [insert(db, "INSERT INTO semester (year, period, status) VALUES (2099, %s, 'active')", (period,))
                 for period in ["S1", "S2"]]
    units = [insert(db, "INSERT INTO unit (unit_code, unit_name) VALUES (%s, %s)", (code, code))
             for code in ["FIT9991", "FIT9992"]]
    offerings = [insert(db, "INSERT INTO unit_offering (unit_id, semester_id, coordinator_id, coordinator_source) "
                           "VALUES (%s, %s, %s, 'roster_import')", (unit, semester, users[0]))
                 for unit, semester in [(units[0], semesters[0]), (units[1], semesters[0]), (units[0], semesters[1])]]
    return {"users": users, "semesters": semesters, "offerings": offerings,
            "user": {"user_id": users[2], "role_name": "super_admin"}}


def test_roster_replacement_is_semester_scoped_and_retains_accounts(db, fixture):
    add_grades(db, fixture)
    old, new, manual = fixture["users"]
    first, omitted, other = fixture["offerings"]
    db.execute("INSERT INTO ai_report (offering_id, status) VALUES (%s, 'draft')", (first,))
    for offering in [first, omitted, other]:
        db.execute("INSERT INTO offering_lecturer VALUES (%s, %s, 'roster_import')", (offering, old))
    db.execute("INSERT INTO offering_lecturer VALUES (%s, %s, 'manual')", (first, manual))
    unit = {"unit_code": "FIT9991", "unit_name": "Test", "programme_codes": [], "staffing": [
        {"name": "new", "email": "new@example.test", "role_type": "lecture"},
        {"name": "new", "email": "NEW@example.test", "role_type": "lecture"}]}
    snapshot = insert(db, "INSERT INTO staffing_import_snapshot (semester_id, source_filename, payload) VALUES (%s, 'test.xlsx', %s)",
                      (fixture["semesters"][0], json.dumps([unit])))
    payload = main.RosterCommitRequest(semester_id=fixture["semesters"][0], staffing_import_id=snapshot, coordinators={"FIT9991": "new@example.test"})
    result = main.commit_staffing_roster(payload, fixture["user"])
    assert result["accounts_created"] == []
    assert result["staffing_rows_created"] == 1
    assert db.execute("SELECT coordinator_id FROM unit_offering WHERE offering_id=%s", (first,)).fetchone()["coordinator_id"] == new
    assert db.execute("SELECT coordinator_id FROM unit_offering WHERE offering_id=%s", (omitted,)).fetchone()["coordinator_id"] is None
    grants = {(r["offering_id"], r["lecturer_id"]) for r in db.execute("SELECT * FROM offering_lecturer").fetchall()}
    assert grants == {(first, manual), (other, old)}
    assert {r["password_hash"] for r in db.execute("SELECT password_hash FROM app_user").fetchall()} == {"unchanged-password"}
    assert db.execute("SELECT COUNT(*) AS n FROM student_grade").fetchone()["n"] == 5
    assert db.execute("SELECT COUNT(*) AS n FROM ai_report").fetchone()["n"] == 1
    with pytest.raises(HTTPException) as raised:
        main.commit_staffing_roster(payload, fixture["user"])
    assert raised.value.status_code == 409


def add_grades(db, fixture):
    offering = fixture["offerings"][0]
    ulo = insert(db, "INSERT INTO offering_ulo (offering_id, ulo_code, description) VALUES (%s, 'LO1', 'Test')", (offering,))
    student = insert(db, "INSERT INTO student (student_code, full_name) VALUES ('test-student', 'Test')")
    enrollment = insert(db, "INSERT INTO enrollment (student_id, offering_id) VALUES (%s, %s)", (student, offering))
    assessment_ids = []
    for i, (raw, maximum, contribution) in enumerate([(8, 10, 20), (30, 40, 30), (15, 20, 20), (10, 15, 15), (10, 15, 15)]):
        assessment = insert(db, "INSERT INTO assessment (offering_id, assessment_name, weight, max_mark) VALUES (%s, %s, %s, %s)",
                            (offering, f"A{i + 1}", maximum, maximum))
        assessment_ids.append(assessment)
        db.execute("INSERT INTO assessment_ulo (offering_id, assessment_id, offering_ulo_id, allocated_weight) VALUES (%s, %s, %s, %s)",
                   (offering, assessment, ulo, contribution))
        db.execute("INSERT INTO student_grade (offering_id, enrollment_id, assessment_id, raw_mark, max_mark) VALUES (%s, %s, %s, %s, %s)",
                   (offering, enrollment, assessment, raw, maximum))
    return ulo, assessment_ids


def test_a_superseded_roster_review_cannot_replace_assignments(db, fixture):
    semester = fixture["semesters"][0]
    old_snapshot = insert(db, "INSERT INTO staffing_import_snapshot (semester_id, source_filename, payload) VALUES (%s, 'old.xlsx', '[]')", (semester,))
    insert(db, "INSERT INTO staffing_import_snapshot (semester_id, source_filename, payload) VALUES (%s, 'new.xlsx', '[]')", (semester,))
    with pytest.raises(HTTPException) as raised:
        main.commit_staffing_roster(main.RosterCommitRequest(semester_id=semester, staffing_import_id=old_snapshot), fixture["user"])
    assert raised.value.status_code == 409
    assert db.execute("SELECT COUNT(*) AS n FROM unit_offering").fetchone()["n"] == 3


def test_manual_access_is_preserved_even_for_a_coordinator(db, fixture):
    offering = fixture["offerings"][0]
    user_id = fixture["users"][0]
    db.execute("INSERT INTO offering_lecturer VALUES (%s, %s, 'manual')", (offering, user_id))
    unit = {"unit_code": "FIT9991", "programme_codes": [], "staffing": [
        {"name": "old", "email": "old@example.test", "role_type": "lecture"}]}
    main._apply_staffing_for_unit(db.cursor(), offering, unit, [])
    assert db.execute("SELECT source FROM offering_lecturer WHERE offering_id=%s", (offering,)).fetchone()["source"] == "manual"


def test_approved_reports_block_semester_reset(db, fixture):
    db.execute("INSERT INTO ai_report (offering_id, status) VALUES (%s, 'approved')", (fixture["offerings"][0],))
    with pytest.raises(HTTPException) as raised:
        main.reset_admin_period(fixture["semesters"][0], main.SemesterResetRequest(confirmation="2099 S1"), fixture["user"])
    assert raised.value.status_code == 409
    assert db.execute("SELECT COUNT(*) AS n FROM unit_offering").fetchone()["n"] == 3


def test_contribution_edits_refresh_results_and_return_submitted_report(db, fixture):
    ulo, assessments = add_grades(db, fixture)
    offering = fixture["offerings"][0]
    for status in ["draft", "submitted", "approved"]:
        db.execute("INSERT INTO ai_report (offering_id, status, evidence_snapshot) VALUES (%s, %s, %s)",
                   (offering, status, json.dumps({"original": True})))
    main._refresh_offering_results(db.cursor(), offering)
    assert db.execute("SELECT attainment_pct FROM student_ulo_attainment").fetchone()["attainment_pct"] == Decimal("73.78")
    main.save_assessment_ulo_weights(main.AssessmentUloWeightsUpdate(offering_id=offering, weights=[
        main.AssessmentUloWeightInput(assessment_id=a, offering_ulo_id=ulo, allocated_weight=20) for a in assessments]), fixture["user"])
    assert db.execute("SELECT attainment_pct FROM student_ulo_attainment").fetchone()["attainment_pct"] == Decimal("73.00")
    reports = db.execute("SELECT status, evidence_stale, evidence_snapshot FROM ai_report ORDER BY report_id").fetchall()
    assert [(r["status"], r["evidence_stale"]) for r in reports] == [("draft", True), ("changes_requested", True), ("approved", False)]
    assert all(r["evidence_snapshot"] == {"original": True} for r in reports)
    with pytest.raises(HTTPException) as raised:
        main.save_assessment_ulo_weights(main.AssessmentUloWeightsUpdate(offering_id=offering, weights=[
            main.AssessmentUloWeightInput(assessment_id=assessments[0], offering_ulo_id=ulo, allocated_weight=10)]), fixture["user"])
    assert raised.value.status_code == 422


def test_changed_coverage_resets_only_that_outcomes_contributions(db, fixture):
    ulo, assessments = add_grades(db, fixture)
    offering = fixture["offerings"][0]
    payload = main.AssessmentsUpdate(offering_id=offering, assessments=[
        main.AssessmentRowInput(assessment_id=a, assessment_name=f"A{i+1}", weight=20, ulo_codes=["LO1"])
        for i, a in enumerate(assessments)] + [main.AssessmentRowInput(assessment_name="A6", weight=0, ulo_codes=["LO1"])])
    main.save_assessments(payload, fixture["user"])
    values = [r["allocated_weight"] for r in db.execute("SELECT allocated_weight FROM assessment_ulo WHERE offering_ulo_id=%s", (ulo,)).fetchall()]
    assert sum(values) == Decimal(100)
    assert sorted(values) == [Decimal("16.65")] + [Decimal("16.67")] * 5
    payload.assessments = payload.assessments[1:]
    with pytest.raises(HTTPException) as raised:
        main.save_assessments(payload, fixture["user"])
    assert raised.value.status_code == 409


def test_archives_block_writes_and_reset_retains_other_semester_and_staff(db, fixture):
    add_grades(db, fixture)
    first, omitted, other = fixture["offerings"]
    semester = fixture["semesters"][0]
    db.execute("UPDATE semester SET status='archived' WHERE semester_id=%s", (semester,))
    with pytest.raises(HTTPException) as raised:
        main._lock_editable_offering(db.cursor(), first)
    assert raised.value.status_code == 409
    db.execute("UPDATE semester SET status='active' WHERE semester_id=%s", (semester,))
    result = main.reset_admin_period(semester, main.SemesterResetRequest(confirmation="2099 S1"), fixture["user"])
    assert result["accounts_deleted"] == 0
    assert result["offerings_deleted"] == 2
    assert db.execute("SELECT offering_id FROM unit_offering").fetchone()["offering_id"] == other
    assert db.execute("SELECT COUNT(*) AS n FROM app_user").fetchone()["n"] == 3
    assert db.execute("SELECT COUNT(*) AS n FROM student_grade").fetchone()["n"] == 0


def test_unchanged_coverage_preserves_custom_contributions(db, fixture):
    ulo, assessments = add_grades(db, fixture)
    payload = main.AssessmentsUpdate(offering_id=fixture["offerings"][0], assessments=[
        main.AssessmentRowInput(assessment_id=a, assessment_name=f"A{i+1}", weight=20, ulo_codes=["LO1"])
        for i, a in enumerate(assessments)])
    main.save_assessments(payload, fixture["user"])
    values = [r["allocated_weight"] for r in db.execute("SELECT allocated_weight FROM assessment_ulo WHERE offering_ulo_id=%s ORDER BY assessment_id", (ulo,)).fetchall()]
    assert values == [Decimal(20), Decimal(30), Decimal(20), Decimal(15), Decimal(15)]


def test_lo_attainment_is_independent_of_gradebook_mark_scale(db, fixture):
    _, assessments = add_grades(db, fixture)
    offering = fixture["offerings"][0]
    main._recalculate_attainment(db.cursor(), offering)
    before = db.execute("SELECT attainment_pct FROM student_ulo_attainment").fetchone()["attainment_pct"]
    assert before == Decimal("73.78")
    # The same A1 performance can be exported as 8/10, 80/100, or 4/5.
    for raw, maximum in [(80, 100), (4, 5)]:
        db.execute("UPDATE student_grade SET raw_mark=%s, max_mark=%s WHERE assessment_id=%s", (raw, maximum, assessments[0]))
        main._recalculate_attainment(db.cursor(), offering)
        assert db.execute("SELECT attainment_pct FROM student_ulo_attainment").fetchone()["attainment_pct"] == before


def test_new_demo_results_use_the_same_calculation_as_uploads(db, monkeypatch):
    monkeypatch.setattr(seed, "get_conn", main.get_conn)
    seed.seed_demo_data()
    main._refresh_pending_attainment()
    outcomes = db.execute("SELECT average_attainment_pct, pass_rate_pct FROM cohort_ulo_attainment").fetchall()
    assert len(outcomes) == 4
    assert all(row["average_attainment_pct"] == Decimal("74.20") for row in outcomes)
    assert all(row["pass_rate_pct"] == Decimal("100.00") for row in outcomes)
    assert db.execute("SELECT COUNT(*) AS n FROM attainment_refresh_pending").fetchone()["n"] == 0


@pytest.fixture
def reset_mail(monkeypatch):
    from app.config import Settings
    monkeypatch.setattr(main, "settings", Settings(public_app_url="https://dashboard.example.test", smtp_username="sender@gmail.com", smtp_app_password="test-only", email_from="sender@gmail.com"))
    mail = []

    def deliver(settings, recipients, subject, body):
        mail.append({"recipients": recipients, "subject": subject, "body": body})
        return [{**recipient, "status": "sent", "error": None} for recipient in recipients]

    monkeypatch.setattr(main, "send_reminders", deliver)
    return mail


def reset_token(mail):
    import re
    return re.search(r"#token=([A-Za-z0-9_-]+)", mail[-1]["body"])[1]


def test_email_reset_is_one_use_hashed_and_invalidates_sessions(db, fixture, reset_mail, monkeypatch):
    from app import auth
    from fastapi.security import HTTPAuthorizationCredentials
    from starlette.requests import Request
    target = fixture["users"][0]
    result = main.email_admin_password_reset(target, fixture["user"])
    token = reset_token(reset_mail)
    assert result == {"status": "sent", "email": "old@example.test", "expires_minutes": 30}
    assert token not in json.dumps(result)
    assert reset_mail[0]["recipients"][0]["email"] == "old@example.test"
    stored = db.execute("SELECT * FROM password_reset_token").fetchone()
    assert len(stored["token_hash"]) == 64 and stored["token_hash"] != token
    before = db.execute("SELECT * FROM app_user WHERE user_id=%s", (target,)).fetchone()
    assert before["password_hash"] == "unchanged-password" and before["auth_version"] == 0
    before["role_name"] = "coordinator"
    old_jwt = auth.create_access_token(before)
    request = main.PasswordResetRequest(token=token, new_password="NewPassword123!")
    assert main.complete_password_reset(request)["status"] == "changed"
    after = db.execute("SELECT * FROM app_user WHERE user_id=%s", (target,)).fetchone()
    assert auth.verify_password("NewPassword123!", after["password_hash"])
    assert not after["must_change_password"] and after["auth_version"] == 1
    assert "NewPassword123!" not in reset_mail[-1]["body"]
    with pytest.raises(HTTPException) as error:
        main.complete_password_reset(request)
    assert error.value.status_code == 400
    monkeypatch.setattr(auth, "fetch_one", lambda q, p: db.execute(q, p).fetchone())
    with pytest.raises(HTTPException) as error:
        auth.get_current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=old_jwt), Request({"type": "http", "path": "/api/me", "headers": []}))
    assert error.value.status_code == 401


@pytest.mark.parametrize("failure", ["connection", "recipient"])
def test_failed_reset_email_keeps_password_and_revokes_link(db, fixture, reset_mail, monkeypatch, failure):
    def fail(*args):
        if failure == "connection":
            raise RuntimeError("SMTP unavailable")
        return [{"status": "failed"}]
    monkeypatch.setattr(main, "send_reminders", fail)
    target = fixture["users"][0]
    with pytest.raises(HTTPException) as error:
        main.email_admin_password_reset(target, fixture["user"])
    assert error.value.status_code == 502
    stored = db.execute("SELECT password_hash, auth_version FROM app_user WHERE user_id=%s", (target,)).fetchone()
    assert stored == {"password_hash": "unchanged-password", "auth_version": 0}
    assert db.execute("SELECT used_at FROM password_reset_token").fetchone()["used_at"] is not None


def test_expired_and_superseded_links_cannot_change_password(db, fixture, reset_mail):
    target = fixture["users"][0]
    main.email_admin_password_reset(target, fixture["user"])
    first = reset_token(reset_mail)
    with pytest.raises(HTTPException) as error:
        main.email_admin_password_reset(target, fixture["user"])
    assert error.value.status_code == 429
    db.execute("UPDATE password_reset_token SET created_at=CURRENT_TIMESTAMP-INTERVAL '2 minutes'")
    main.email_admin_password_reset(target, fixture["user"])
    second = reset_token(reset_mail)
    assert second != first
    db.execute("UPDATE password_reset_token SET expires_at=CURRENT_TIMESTAMP-INTERVAL '1 second'")
    for token in [first, second, "x" * 43]:
        with pytest.raises(HTTPException) as error:
            main.complete_password_reset(main.PasswordResetRequest(token=token, new_password="NewPassword123!"))
        assert error.value.status_code == 400
    assert db.execute("SELECT password_hash FROM app_user WHERE user_id=%s", (target,)).fetchone()["password_hash"] == "unchanged-password"


def test_temporary_fallback_is_one_time_and_revokes_email_link(db, fixture, reset_mail):
    target = fixture["users"][0]
    main.email_admin_password_reset(target, fixture["user"])
    token = reset_token(reset_mail)
    result = main.reset_admin_user_password(target, fixture["user"])
    assert result["email"] == "old@example.test"
    stored = db.execute("SELECT password_hash, auth_version, must_change_password FROM app_user WHERE user_id=%s", (target,)).fetchone()
    assert stored["must_change_password"] and stored["auth_version"] == 1
    assert main.verify_password(result["temporary_password"], stored["password_hash"])
    assert result["temporary_password"] != stored["password_hash"]
    with pytest.raises(HTTPException):
        main.complete_password_reset(main.PasswordResetRequest(token=token, new_password="NewPassword123!"))
    assert len(reset_mail) == 1  # Fallback credentials are not emailed automatically.


def test_normal_admin_cannot_reset_or_deactivate_admin_tier(db, fixture, reset_mail):
    target = fixture["users"][0]
    actor = {"user_id": fixture["users"][1], "role_name": "management"}
    for role in ["management", "super_admin"]:
        db.execute("UPDATE app_user SET role_id=(SELECT role_id FROM role WHERE role_name=%s) WHERE user_id=%s", (role, target))
        actions = [lambda: main.email_admin_password_reset(target, actor),
                   lambda: main.reset_admin_user_password(target, actor),
                   lambda: main.update_admin_user_status(target, main.AdminUserUpdate(is_active=False), actor)]
        for action in actions:
            with pytest.raises(HTTPException) as error:
                action()
            assert error.value.status_code == 403
    assert reset_mail == []


def test_self_change_and_deactivation_invalidate_credentials(db, fixture, reset_mail):
    target = fixture["users"][0]
    main.email_admin_password_reset(target, fixture["user"])
    old_token = reset_token(reset_mail)
    db.execute("UPDATE app_user SET password_hash=%s WHERE user_id=%s", (main.hash_password("PreviousPassword!"), target))
    main.change_password(main.PasswordChangeRequest(current_password="PreviousPassword!", new_password="ReplacementPassword!"), {"user_id": target, "auth_version": 0})
    assert db.execute("SELECT auth_version FROM app_user WHERE user_id=%s", (target,)).fetchone()["auth_version"] == 1
    with pytest.raises(HTTPException):
        main.complete_password_reset(main.PasswordResetRequest(token=old_token, new_password="NewPassword123!"))
    for active in [False, True]:
        main.update_admin_user_status(target, main.AdminUserUpdate(is_active=active), fixture["user"])
    assert db.execute("SELECT auth_version FROM app_user WHERE user_id=%s", (target,)).fetchone()["auth_version"] == 3


def test_reset_api_requires_admin_and_valid_password_input(db, fixture, reset_mail):
    from fastapi.testclient import TestClient
    client = TestClient(main.app)
    target = fixture["users"][0]
    assert client.post(f"/api/admin/users/{target}/password-reset-link").status_code == 401
    assert client.post("/api/auth/reset-password", json={"token": "x" * 43, "new_password": "short"}).status_code == 422
    response = client.post("/api/auth/reset-password", json={"token": "x" * 43, "new_password": "ValidPassword123!"})
    assert response.status_code == 400
    assert response.headers["Cache-Control"] == "no-store"


def test_reset_unavailable_for_inactive_or_self_accounts(db, fixture, reset_mail):
    target = fixture["users"][0]
    db.execute("UPDATE app_user SET is_active=FALSE WHERE user_id=%s", (target,))
    for action in [main.email_admin_password_reset, main.reset_admin_user_password]:
        with pytest.raises(HTTPException) as error:
            action(target, fixture["user"])
        assert error.value.status_code == 409
        with pytest.raises(HTTPException) as error:
            action(fixture["user"]["user_id"], fixture["user"])
        assert error.value.status_code == 409


def test_confirmation_email_failure_does_not_undo_reset(db, fixture, reset_mail, monkeypatch):
    target = fixture["users"][0]
    main.email_admin_password_reset(target, fixture["user"])
    token = reset_token(reset_mail)
    def fail(*args):
        raise RuntimeError("SMTP unavailable")
    monkeypatch.setattr(main, "send_reminders", fail)
    result = main.complete_password_reset(main.PasswordResetRequest(token=token, new_password="NewPassword123!"))
    assert result == {"status": "changed", "notification_status": "failed"}
    assert main.verify_password("NewPassword123!", db.execute("SELECT password_hash FROM app_user WHERE user_id=%s", (target,)).fetchone()["password_hash"])


def test_http_password_recovery_round_trip(db, fixture, reset_mail, monkeypatch):
    from app import auth
    from fastapi.testclient import TestClient
    monkeypatch.setattr(auth, "fetch_one", lambda q, p: db.execute(q, p).fetchone())
    target, _, actor = fixture["users"]
    db.execute("UPDATE app_user SET email='old@monash.edu' WHERE user_id=%s", (target,))
    db.execute("UPDATE app_user SET email='manual@monash.edu' WHERE user_id=%s", (actor,))
    db.execute("UPDATE app_user SET password_hash=%s", (main.hash_password("PreviousPassword!"),))
    db.execute("UPDATE app_user SET role_id=(SELECT role_id FROM role WHERE role_name='management') WHERE user_id=%s", (actor,))
    client = TestClient(main.app)
    staff_login = client.post("/api/auth/login", json={"email": "old@monash.edu", "password": "PreviousPassword!"})
    admin_login = client.post("/api/auth/login", json={"email": "manual@monash.edu", "password": "PreviousPassword!"})
    assert staff_login.status_code == admin_login.status_code == 200
    admin_headers = {"Authorization": "Bearer " + admin_login.json()["access_token"]}
    old_headers = {"Authorization": "Bearer " + staff_login.json()["access_token"]}
    assert client.get("/api/me", headers=old_headers).status_code == 200
    response = client.post(f"/api/admin/users/{target}/password-reset-link", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "old@monash.edu"
    assert client.get("/api/me", headers=old_headers).status_code == 200  # Email alone does not sign staff out.
    token = reset_token(reset_mail)
    assert client.post("/api/auth/reset-password", json={"token": token, "new_password": "ReplacementPassword!"}).status_code == 200
    assert client.get("/api/me", headers=old_headers).status_code == 401
    assert client.post("/api/auth/login", json={"email": "old@monash.edu", "password": "PreviousPassword!"}).status_code == 401
    response = client.post("/api/auth/login", json={"email": "old@monash.edu", "password": "ReplacementPassword!"})
    assert response.status_code == 200
    assert client.get("/api/me", headers={"Authorization": "Bearer " + response.json()["access_token"]}).status_code == 200
