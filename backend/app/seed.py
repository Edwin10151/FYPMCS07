from app.auth import hash_password
from app.config import get_settings
from app.db import get_conn




def ensure_super_admin() -> None:
    """Idempotent bootstrap for the super_admin tier: runs every startup (unlike
    seed_demo_data, which only runs once against an empty database), so the
    account exists whether this is a fresh volume or one that's already seeded."""
    settings = get_settings()
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT role_id FROM role WHERE role_name = 'super_admin'")
            role = cur.fetchone()
            if not role:
                return
            cur.execute(
                """
                INSERT INTO app_user (full_name, email, password_hash, role_id, must_change_password)
                VALUES (%s, %s, %s, %s, TRUE)
                ON CONFLICT (email) DO NOTHING
                """,
                ("Super Admin", "super.admin@monash.edu", hash_password(settings.demo_password), role["role_id"]),
            )


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
                ("0001001", "Dr. Elise Chen", "elise.chen@monash.edu", "coordinator"),
                ("0001002", "Aaron Lim", "aaron.lim@monash.edu", "lecturer"),
                ("0001003", "Maya Rao", "maya.rao@monash.edu", "management"),
            ]
            user_ids = {}
            password_hash = hash_password(settings.demo_password)
            for staff_id, full_name, email, role_name in users:
                cur.execute(
                    """
                    INSERT INTO app_user (staff_id, full_name, email, password_hash, role_id)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING user_id
                    """,
                    (staff_id, full_name, email, password_hash, roles[role_name]),
                )
                user_ids[email] = cur.fetchone()["user_id"]

            # Nothing beyond the accounts above is seeded. Programmes and their
            # PLOs are preloaded by migration; units, offerings, outcomes,
            # assessments, students and grades all arrive through the real
            # workflow -- tutor list, Handbook import, outcome mapping, class list,
            # gradebook. A mock unit here only made demo data hard to tell from
            # the real thing.
