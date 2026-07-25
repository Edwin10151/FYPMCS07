from pathlib import Path

from app.db import get_conn


MIGRATIONS_DIR = Path("/app/database/migrations")


def run_migrations() -> None:
    if not MIGRATIONS_DIR.exists():
        return
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT pg_advisory_xact_lock(7102007)")
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS schema_migration (
                    filename VARCHAR(255) PRIMARY KEY,
                    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            for migration in sorted(MIGRATIONS_DIR.glob("*.sql")):
                cur.execute("SELECT 1 FROM schema_migration WHERE filename = %s", (migration.name,))
                if cur.fetchone():
                    continue
                cur.execute(migration.read_text(), prepare=False)
                cur.execute("INSERT INTO schema_migration (filename) VALUES (%s)", (migration.name,))
