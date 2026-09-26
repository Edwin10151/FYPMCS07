"""Accounts and offerings that must exist regardless of how the database began.

seed_demo_data() only populates an empty database, so it cannot help an already
running deployment. Everything here is idempotent and runs on every startup, so
a fresh volume and a database from before single sign-on both end up the same.

Sign-in is delegated to Monash SSO with the verified email as the link key, so a
team member needs nothing more than a row in app_user whose email matches the
address their identity provider releases.
"""

from __future__ import annotations

import logging

from app.db import get_conn

logger = logging.getLogger(__name__)

# password_hash is NOT NULL, but these accounts never use a password.
# verify_password() rejects anything that is not a well-formed pbkdf2_sha256
# digest, so this sentinel cannot be matched by any input.
SSO_ONLY_PASSWORD_HASH = "sso-only"

TEAM_ACCOUNTS = [
    # (staff_id, full_name, email, role_name)
    (None, "Wen Jung Lim", "wlim0083@student.monash.edu", "management"),
]

FIT3161 = {
    "unit_code": "FIT3161",
    "unit_name": "Computer science project 1",
    "handbook_url": "https://handbook.monash.edu/2026/units/FIT3161?year=2026",
    "coordinator_email": "wlim0083@student.monash.edu",
    "year": 2026,
    "period": "S2",
    "start_date": "2026-07-20",
    "end_date": "2026-11-13",
    # Placeholders so a gradebook has something to map onto. Edit them on the
    # Assessments page to match the real unit guide; weights total 100.
    "assessments": [
        # (name, weight, max_mark, order)
        ("Project Proposal", "20.00", "100", 1),
        ("Progress Report", "20.00", "100", 2),
        ("Final Report", "40.00", "100", 3),
        ("Presentation", "20.00", "100", 4),
    ],
}


def _scalar(cur, query: str, params: tuple = ()):
    cur.execute(query, params)
    row = cur.fetchone()
    if row is None:
        return None
    return row[0] if isinstance(row, tuple) else next(iter(row.values()))


def provision_project_accounts() -> None:
    """Best-effort provisioning; never fatal.

    This runs during application startup, so raising here would take the whole
    API down. A database that is mid-upgrade or otherwise unexpected should cost
    us these convenience rows and nothing else: the failure is logged, the team
    account is simply absent, and sign-in reports "no dashboard account" rather
    than the server refusing to boot.
    """
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT pg_advisory_xact_lock(7102008)")
                _provision_team_accounts(cur)
                _provision_fit3161(cur)
    except Exception:
        logger.exception("Project account provisioning was skipped")


def _provision_team_accounts(cur) -> None:
    for staff_id, full_name, email, role_name in TEAM_ACCOUNTS:
        role_id = _scalar(cur, "SELECT role_id FROM role WHERE role_name = %s", (role_name,))
        if role_id is None:
            continue
        # Only the role and active flag are refreshed on conflict: a name the
        # admin corrected in the UI should not be overwritten on every restart.
        cur.execute(
            """
            INSERT INTO app_user (staff_id, full_name, email, password_hash, role_id,
                                  is_active, must_change_password)
            VALUES (%s, %s, %s, %s, %s, TRUE, FALSE)
            ON CONFLICT (email) DO UPDATE
                SET role_id = EXCLUDED.role_id,
                    is_active = TRUE,
                    must_change_password = FALSE
            """,
            (staff_id, full_name, email.lower(), SSO_ONLY_PASSWORD_HASH, role_id),
        )


def _provision_fit3161(cur) -> None:
    """Create the FIT3161 offering once, then leave it alone.

    Only the skeleton is created: unit, semester, offering, outcomes, and
    placeholder assessments. Students are deliberately not invented, because a
    grade upload matches rows against the offering's enrolment and silently
    inventing student IDs would make real uploads fail in confusing ways. Upload
    the class list under Admin -> Enrolments first.
    """
    coordinator_id = _scalar(
        cur, "SELECT user_id FROM app_user WHERE email = %s", (FIT3161["coordinator_email"],)
    )
    if coordinator_id is None:
        return

    unit_id = _scalar(
        cur, "SELECT unit_id FROM unit WHERE unit_code = %s", (FIT3161["unit_code"],)
    )
    if unit_id is None:
        unit_id = _scalar(
            cur,
            """
            INSERT INTO unit (unit_code, unit_name, default_handbook_url)
            VALUES (%s, %s, %s)
            RETURNING unit_id
            """,
            (FIT3161["unit_code"], FIT3161["unit_name"], FIT3161["handbook_url"]),
        )

    semester_id = _scalar(
        cur,
        "SELECT semester_id FROM semester WHERE year = %s AND period = %s",
        (FIT3161["year"], FIT3161["period"]),
    )
    if semester_id is None:
        semester_id = _scalar(
            cur,
            """
            INSERT INTO semester (year, period, start_date, end_date, status)
            VALUES (%s, %s, %s, %s, 'active')
            RETURNING semester_id
            """,
            (FIT3161["year"], FIT3161["period"], FIT3161["start_date"], FIT3161["end_date"]),
        )

    offering_id = _scalar(
        cur,
        "SELECT offering_id FROM unit_offering WHERE unit_id = %s AND semester_id = %s",
        (unit_id, semester_id),
    )
    if offering_id is not None:
        # Already provisioned. Anything the coordinator has changed since stays.
        return

    offering_id = _scalar(
        cur,
        """
        INSERT INTO unit_offering (unit_id, semester_id, coordinator_id, handbook_url, status)
        VALUES (%s, %s, %s, %s, 'active')
        RETURNING offering_id
        """,
        (unit_id, semester_id, coordinator_id, FIT3161["handbook_url"]),
    )

    # Attach to whichever programmes already exist so the ULO-to-PLO mapping
    # screen has something to map against.
    cur.execute(
        """
        INSERT INTO offering_program (offering_id, program_id)
        SELECT %s, program_id FROM program
        ON CONFLICT DO NOTHING
        """,
        (offering_id,),
    )

    for name, weight, max_mark, order in FIT3161["assessments"]:
        cur.execute(
            """
            INSERT INTO assessment (offering_id, assessment_name, weight, max_mark,
                                    assessment_order, source, confirmed_by, confirmed_at)
            VALUES (%s, %s, %s, %s, %s, 'manual', %s, CURRENT_TIMESTAMP)
            ON CONFLICT (offering_id, assessment_name) DO NOTHING
            """,
            (offering_id, name, weight, max_mark, order, coordinator_id),
        )
