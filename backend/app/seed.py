from decimal import Decimal

from app.auth import hash_password
from app.config import get_settings
from app.db import get_conn
from app.services.calculation import attainment_percentage, split_weight


def _one(cur, query: str, params: tuple):
    cur.execute(query, params)
    row = cur.fetchone()
    return row[0] if isinstance(row, tuple) else next(iter(row.values()))


def seed_demo_data() -> None:
    settings = get_settings()
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS count FROM app_user")
            if cur.fetchone()["count"] > 0:
                return

            cur.execute("SELECT role_id, role_name FROM role")
            roles = {row["role_name"]: row["role_id"] for row in cur.fetchall()}

            users = [
                ("Dr. Elise Chen", "elise.chen@monash.edu", "coordinator"),
                ("Aaron Lim", "aaron.lim@monash.edu", "lecturer"),
                ("Maya Rao", "maya.rao@monash.edu", "management"),
            ]
            user_ids = {}
            password_hash = hash_password(settings.demo_password)
            for full_name, email, role_name in users:
                cur.execute(
                    """
                    INSERT INTO app_user (full_name, email, password_hash, role_id)
                    VALUES (%s, %s, %s, %s)
                    RETURNING user_id
                    """,
                    (full_name, email, password_hash, roles[role_name]),
                )
                user_ids[email] = cur.fetchone()["user_id"]

            program_id = _one(
                cur,
                "INSERT INTO program (program_code, program_name) VALUES (%s, %s) RETURNING program_id",
                ("C2001", "Bachelor of Computer Science"),
            )

            plos = [
                ("PLO1", "Apply algorithmic thinking and computational problem solving."),
                ("PLO2", "Design and evaluate software systems using appropriate methods."),
                ("PLO3", "Communicate technical solutions clearly and professionally."),
                ("PLO4", "Work ethically with data, software, and stakeholders."),
            ]
            plo_ids = []
            for code, description in plos:
                cur.execute(
                    "INSERT INTO plo (program_id, plo_code, description) VALUES (%s, %s, %s) RETURNING plo_id",
                    (program_id, code, description),
                )
                plo_ids.append(cur.fetchone()["plo_id"])

            unit_id = _one(
                cur,
                """
                INSERT INTO unit (unit_code, unit_name, default_handbook_url)
                VALUES (%s, %s, %s)
                RETURNING unit_id
                """,
                (
                    "FIT2004",
                    "Algorithms and Data Structures",
                    "https://handbook.monash.edu/2026/units/FIT2004?year=2026",
                ),
            )
            semester_id = _one(
                cur,
                """
                INSERT INTO semester (year, period, start_date, end_date)
                VALUES (%s, %s, %s, %s)
                RETURNING semester_id
                """,
                (2026, "S1", "2026-02-23", "2026-06-19"),
            )
            offering_id = _one(
                cur,
                """
                INSERT INTO unit_offering (unit_id, program_id, semester_id, coordinator_id, handbook_url, last_scraped_at)
                VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                RETURNING offering_id
                """,
                (
                    unit_id,
                    program_id,
                    semester_id,
                    user_ids["elise.chen@monash.edu"],
                    "https://handbook.monash.edu/2026/units/FIT2004?year=2026",
                ),
            )
            cur.execute(
                "INSERT INTO offering_lecturer (offering_id, lecturer_id) VALUES (%s, %s)",
                (offering_id, user_ids["aaron.lim@monash.edu"]),
            )

            ulo_descriptions = [
                "Analyse general problem solving strategies and algorithmic paradigms, and apply them to solving new problems.",
                "Prove correctness of programs, analyse their space and time complexities.",
                "Compare and contrast various abstract data types and use them appropriately.",
                "Develop and implement algorithms to solve computational problems.",
            ]
            ulo_ids = []
            for index, description in enumerate(ulo_descriptions, start=1):
                cur.execute(
                    """
                    INSERT INTO offering_ulo (offering_id, ulo_code, description, source, confirmed_by, confirmed_at)
                    VALUES (%s, %s, %s, 'handbook', %s, CURRENT_TIMESTAMP)
                    RETURNING offering_ulo_id
                    """,
                    (offering_id, f"LO{index}", description, user_ids["elise.chen@monash.edu"]),
                )
                ulo_ids.append(cur.fetchone()["offering_ulo_id"])

            assessments = [
                ("Weekly problem sets", Decimal("15.00"), Decimal("100.00"), 1, [0, 2]),
                ("A1 - Complexity proofs", Decimal("20.00"), Decimal("100.00"), 2, [0, 1]),
                ("A2 - Implementation project", Decimal("25.00"), Decimal("100.00"), 3, [1, 2, 3]),
                ("Final examination", Decimal("40.00"), Decimal("100.00"), 4, [0, 1, 2, 3]),
            ]
            assessment_ids = []
            for name, weight, max_mark, order, covered_indexes in assessments:
                cur.execute(
                    """
                    INSERT INTO assessment (
                        offering_id, assessment_name, weight, max_mark, assessment_order, source, confirmed_by, confirmed_at
                    )
                    VALUES (%s, %s, %s, %s, %s, 'handbook', %s, CURRENT_TIMESTAMP)
                    RETURNING assessment_id
                    """,
                    (offering_id, name, weight, max_mark, order, user_ids["elise.chen@monash.edu"]),
                )
                assessment_id = cur.fetchone()["assessment_id"]
                assessment_ids.append(assessment_id)
                shares = split_weight(weight, [ulo_ids[item] for item in covered_indexes])
                for offering_ulo_id, allocated_weight in shares.items():
                    cur.execute(
                        """
                        INSERT INTO assessment_ulo (
                            offering_id, assessment_id, offering_ulo_id, source, is_confirmed, allocated_weight, confirmed_by, confirmed_at
                        )
                        VALUES (%s, %s, %s, 'handbook', TRUE, %s, %s, CURRENT_TIMESTAMP)
                        """,
                        (offering_id, assessment_id, offering_ulo_id, allocated_weight, user_ids["elise.chen@monash.edu"]),
                    )

            mapping_pairs = [
                (0, [0, 1]),
                (1, [0, 1, 2]),
                (2, [2]),
                (3, [0, 3]),
            ]
            for ulo_index, mapped_plos in mapping_pairs:
                for plo_index in mapped_plos:
                    cur.execute(
                        """
                        INSERT INTO ulo_plo_mapping (offering_id, offering_ulo_id, plo_id, mapping_source, confirmed_by)
                        VALUES (%s, %s, %s, 'manual', %s)
                        """,
                        (offering_id, ulo_ids[ulo_index], plo_ids[plo_index], user_ids["elise.chen@monash.edu"]),
                    )

            for code, score in [("31882104", 82), ("31903456", 68), ("31998021", 74), ("31855219", 56), ("31950112", 91)]:
                cur.execute(
                    """
                    INSERT INTO student (student_code, full_name, program_id)
                    VALUES (%s, %s, %s)
                    RETURNING student_id
                    """,
                    (code, f"Student {code[-3:]}", program_id),
                )
                student_id = cur.fetchone()["student_id"]
                cur.execute(
                    "INSERT INTO enrollment (student_id, offering_id) VALUES (%s, %s) RETURNING enrollment_id",
                    (student_id, offering_id),
                )
                enrollment_id = cur.fetchone()["enrollment_id"]
                for assessment_id in assessment_ids:
                    raw_mark = Decimal(score)
                    cur.execute(
                        """
                        INSERT INTO student_grade (offering_id, enrollment_id, assessment_id, raw_mark, max_mark, weighted_score)
                        VALUES (%s, %s, %s, %s, 100.00, %s)
                        """,
                        (offering_id, enrollment_id, assessment_id, raw_mark, raw_mark),
                    )

            cohort_rates = [
                (ulo_ids[0], Decimal("81.20"), Decimal("86.00"), 5, 4),
                (ulo_ids[1], Decimal("75.40"), Decimal("80.00"), 5, 4),
                (ulo_ids[2], Decimal("78.60"), Decimal("80.00"), 5, 4),
                (ulo_ids[3], Decimal("61.30"), Decimal("60.00"), 5, 3),
            ]
            for offering_ulo_id, average_pct, pass_rate, enrolled, achieved in cohort_rates:
                cur.execute(
                    """
                    INSERT INTO cohort_ulo_attainment (
                        offering_id, offering_ulo_id, enrolled_count, achieved_count, average_attainment_pct, pass_rate_pct
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (offering_id, offering_ulo_id, enrolled, achieved, average_pct, pass_rate),
                )
                for enrollment_id in range(1, 6):
                    cur.execute(
                        """
                        INSERT INTO student_ulo_attainment (
                            offering_id, enrollment_id, offering_ulo_id, total_available_weight, achieved_weight, attainment_pct, is_achieved
                        )
                        VALUES (%s, %s, %s, 100.00, %s, %s, %s)
                        ON CONFLICT DO NOTHING
                        """,
                        (
                            offering_id,
                            enrollment_id,
                            offering_ulo_id,
                            average_pct,
                            attainment_percentage(average_pct, Decimal("100.00")),
                            average_pct >= 50,
                        ),
                    )

            cur.execute(
                """
                INSERT INTO ai_report (offering_id, generated_by, ai_summary, coordinator_comment)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    offering_id,
                    user_ids["elise.chen@monash.edu"],
                    "LO4 needs attention because cohort pass rate is below the other learning outcomes.",
                    "Review assessment coverage before final report export.",
                ),
            )

