import pytest

from app import provision
from app.auth import verify_password


class FakeCursor:
    """Records the statements issued, answering lookups from a scripted queue."""

    def __init__(self, answers):
        self.answers = list(answers)
        self.statements = []
        self._row = None

    def execute(self, query, params=()):
        self.statements.append((" ".join(query.split()), params))
        self._row = self.answers.pop(0) if self.answers else None

    def fetchone(self):
        return self._row


def statements_touching(cursor, table):
    return [query for query, _ in cursor.statements if table in query]


def test_sso_accounts_cannot_be_signed_into_with_a_password():
    # The sentinel occupies the NOT NULL column without ever matching an input.
    assert not verify_password("", provision.SSO_ONLY_PASSWORD_HASH)
    assert not verify_password("sso-only", provision.SSO_ONLY_PASSWORD_HASH)
    assert not verify_password("Password123!", provision.SSO_ONLY_PASSWORD_HASH)


def test_team_account_is_provisioned_against_its_role():
    cursor = FakeCursor(answers=[{"role_id": 2}, None])
    provision._provision_team_accounts(cursor)

    inserts = statements_touching(cursor, "INSERT INTO app_user")
    assert len(inserts) == 1
    # Re-running startup must not fail on the account already being there.
    assert "ON CONFLICT (email) DO UPDATE" in inserts[0]

    params = cursor.statements[-1][1]
    assert "wlim0083@student.monash.edu" in params
    assert provision.SSO_ONLY_PASSWORD_HASH in params


def test_team_account_is_skipped_when_the_role_is_missing():
    cursor = FakeCursor(answers=[None])
    provision._provision_team_accounts(cursor)
    assert statements_touching(cursor, "INSERT INTO app_user") == []


def test_fit3161_is_created_with_its_coordinator_and_assessments():
    cursor = FakeCursor(answers=[
        {"user_id": 4},        # coordinator lookup
        None,                  # unit lookup: absent
        {"unit_id": 9},        # unit insert
        None,                  # semester lookup: absent
        {"semester_id": 3},    # semester insert
        None,                  # offering lookup: absent
        {"offering_id": 11},   # offering insert
    ])
    provision._provision_fit3161(cursor)

    assert any("FIT3161" in str(params) for _, params in cursor.statements)
    offering_insert = statements_touching(cursor, "INSERT INTO unit_offering")
    assert len(offering_insert) == 1

    assessments = statements_touching(cursor, "INSERT INTO assessment")
    assert len(assessments) == len(provision.FIT3161["assessments"])

    # Enrolments are the coordinator's to upload; inventing students would make
    # a real gradebook upload fail to match.
    assert statements_touching(cursor, "INSERT INTO student") == []
    assert statements_touching(cursor, "INSERT INTO enrollment") == []


def test_assessment_weights_total_one_hundred():
    total = sum(float(weight) for _, weight, _, _ in provision.FIT3161["assessments"])
    assert total == pytest.approx(100.0)


def test_existing_fit3161_offering_is_left_untouched():
    cursor = FakeCursor(answers=[
        {"user_id": 4},        # coordinator
        {"unit_id": 9},        # unit exists
        {"semester_id": 3},    # semester exists
        {"offering_id": 11},   # offering exists -> stop
    ])
    provision._provision_fit3161(cursor)

    assert statements_touching(cursor, "INSERT INTO unit_offering") == []
    assert statements_touching(cursor, "INSERT INTO assessment") == []


def test_fit3161_is_skipped_when_the_coordinator_is_absent():
    cursor = FakeCursor(answers=[None])
    provision._provision_fit3161(cursor)
    assert cursor.statements[1:] == []


def test_student_addresses_are_accepted_when_provisioning_from_the_admin_page():
    # Team members hold a student address rather than a staff one, and the
    # address is the link key for single sign-on.
    from app.main import AdminUserCreate, _admin_user_values

    values = _admin_user_values(
        AdminUserCreate(
            staff_id="0001004",
            full_name="Wen Jung Lim",
            email="wlim0083@student.monash.edu",
            role_name="coordinator",
        )
    )
    assert values[2] == "wlim0083@student.monash.edu"


def test_non_monash_addresses_are_still_refused():
    from fastapi import HTTPException

    from app.main import AdminUserCreate, _admin_user_values

    with pytest.raises(HTTPException) as caught:
        _admin_user_values(
            AdminUserCreate(
                staff_id="0001005",
                full_name="Outside Person",
                email="someone@gmail.com",
                role_name="lecturer",
            )
        )
    assert caught.value.status_code == 422
