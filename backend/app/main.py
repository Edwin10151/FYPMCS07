from contextlib import asynccontextmanager
import csv
import io
import json
from decimal import Decimal
from typing import Annotated

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

from app.auth import (
    create_access_token,
    ensure_offering_access,
    get_current_user,
    require_offering_access,
    require_permission,
    verify_password,
)
from app.config import get_settings
from app.db import fetch_all, fetch_one, get_conn
from app.migrations import run_migrations
from app.seed import seed_demo_data
from app.services.calculation import split_weight
from app.services.handbook import HandbookImportError, fetch_handbook


@asynccontextmanager
async def lifespan(app: FastAPI):
    run_migrations()
    seed_demo_data()
    yield


app = FastAPI(title="MCS07 Academic Performance API", version="0.1.0", lifespan=lifespan)
settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class MappingUpdate(BaseModel):
    offering_id: int
    mappings: list[dict[str, int]]


class HandbookImportConfirmation(BaseModel):
    handbook_import_id: int


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "backend"}


@app.get("/api/db-health")
def db_health():
    row = fetch_one("SELECT 1 AS ok")
    return {"status": "ok", "database": row["ok"] == 1}


@app.post("/api/auth/login")
def login(payload: LoginRequest):
    user = fetch_one(
        """
        SELECT u.user_id, u.full_name, u.email, u.password_hash, u.is_active, r.role_name, r.permission_level
        FROM app_user u
        JOIN role r ON r.role_id = u.role_id
        WHERE u.email = %s
        """,
        (payload.email,),
    )
    if not user or not user["is_active"] or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    public_user = {key: user[key] for key in ["user_id", "full_name", "email", "role_name", "permission_level"]}
    return {
        "access_token": create_access_token(user),
        "token_type": "bearer",
        "user": public_user,
    }


@app.get("/api/me")
def me(user: Annotated[dict, Depends(get_current_user)]):
    return {"user": user}


@app.get("/api/offerings")
def offerings(user: Annotated[dict, Depends(get_current_user)]):
    query = """
        SELECT
            o.offering_id,
            u.unit_code,
            u.unit_name,
            p.program_code,
            p.program_name,
            s.year,
            s.period,
            o.handbook_url,
            o.last_scraped_at
        FROM unit_offering o
        JOIN unit u ON u.unit_id = o.unit_id
        JOIN program p ON p.program_id = o.program_id
        JOIN semester s ON s.semester_id = o.semester_id
    """
    if user["role_name"] == "coordinator":
        query += " WHERE o.coordinator_id = %s"
        params = (user["user_id"],)
    elif user["role_name"] == "lecturer":
        query += " WHERE EXISTS (SELECT 1 FROM offering_lecturer ol WHERE ol.offering_id = o.offering_id AND ol.lecturer_id = %s)"
        params = (user["user_id"],)
    elif user["role_name"] == "management":
        params = None
    else:
        raise HTTPException(status_code=403, detail="Unknown role")
    rows = fetch_all(query + " ORDER BY s.year DESC, s.period, u.unit_code", params)
    return {"offerings": rows}


def _handbook_offering(offering_id: int) -> dict:
    offering = fetch_one(
        """
        SELECT o.offering_id, o.unit_id, u.unit_code, s.year
        FROM unit_offering o
        JOIN unit u ON u.unit_id = o.unit_id
        JOIN semester s ON s.semester_id = o.semester_id
        WHERE o.offering_id = %s
        """,
        (offering_id,),
    )
    if not offering:
        raise HTTPException(status_code=404, detail="Offering not found")
    return offering


@app.post("/api/offerings/{offering_id}/handbook-import")
def create_handbook_import(
    offering_id: int,
    user: Annotated[dict, Depends(require_permission(20))],
):
    ensure_offering_access(user, offering_id, min_permission_level=20)
    offering = _handbook_offering(offering_id)
    try:
        imported = fetch_handbook(offering["unit_code"], offering["year"])
    except HandbookImportError as exc:
        raise HTTPException(status_code=502, detail="Could not import the public Monash Handbook record") from exc

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO handbook_import_snapshot (offering_id, source_url, handbook_version, payload)
                VALUES (%s, %s, %s, %s::jsonb)
                RETURNING handbook_import_id, source_url, handbook_version, status, imported_at, payload
                """,
                (
                    offering_id,
                    imported["source_url"],
                    imported["payload"].get("handbook_version"),
                    json.dumps(imported["payload"]),
                ),
            )
            snapshot = cur.fetchone()
    return {"import": snapshot}


@app.get("/api/offerings/{offering_id}/handbook-import")
def latest_handbook_import(
    offering_id: int,
    user: Annotated[dict, Depends(require_offering_access(20))],
):
    snapshot = fetch_one(
        """
        SELECT handbook_import_id, source_url, handbook_version, status, imported_at, confirmed_at, payload
        FROM handbook_import_snapshot
        WHERE offering_id = %s
        ORDER BY handbook_import_id DESC
        LIMIT 1
        """,
        (offering_id,),
    )
    return {"import": snapshot}


@app.post("/api/offerings/{offering_id}/handbook-import/confirm")
def confirm_handbook_import(
    offering_id: int,
    confirmation: HandbookImportConfirmation,
    user: Annotated[dict, Depends(require_permission(20))],
):
    ensure_offering_access(user, offering_id, min_permission_level=20)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT handbook_import_id, source_url, payload
                FROM handbook_import_snapshot
                WHERE handbook_import_id = %s AND offering_id = %s AND status = 'draft'
                FOR UPDATE
                """,
                (confirmation.handbook_import_id, offering_id),
            )
            snapshot = cur.fetchone()
            if not snapshot:
                raise HTTPException(status_code=404, detail="Draft Handbook import not found")

            cur.execute("SELECT EXISTS(SELECT 1 FROM student_grade WHERE offering_id = %s) AS has_grades", (offering_id,))
            if cur.fetchone()["has_grades"]:
                raise HTTPException(
                    status_code=409,
                    detail="Assessment setup cannot be replaced after grades exist. Record an amendment and recalculate before changing it.",
                )

            payload = snapshot["payload"]
            if not isinstance(payload, dict):
                raise HTTPException(status_code=422, detail="Draft Handbook import is invalid")

            cur.execute(
                "UPDATE unit_offering SET handbook_url = %s, last_scraped_at = CURRENT_TIMESTAMP WHERE offering_id = %s",
                (snapshot["source_url"], offering_id),
            )
            cur.execute(
                """
                UPDATE unit SET unit_name = %s, default_handbook_url = %s
                WHERE unit_id = (SELECT unit_id FROM unit_offering WHERE offering_id = %s)
                """,
                (payload["title"], snapshot["source_url"], offering_id),
            )

            ulo_ids: dict[str, int] = {}
            for ulo in payload["learning_outcomes"]:
                cur.execute(
                    """
                    INSERT INTO offering_ulo (
                        offering_id, ulo_code, description, source, handbook_reference, confirmed_by, confirmed_at
                    )
                    VALUES (%s, %s, %s, 'handbook', %s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (offering_id, ulo_code) DO UPDATE
                    SET description = EXCLUDED.description,
                        handbook_reference = EXCLUDED.handbook_reference,
                        confirmed_by = EXCLUDED.confirmed_by,
                        confirmed_at = EXCLUDED.confirmed_at
                    WHERE offering_ulo.source = 'handbook'
                    RETURNING offering_ulo_id
                    """,
                    (offering_id, ulo["code"], ulo["description"], ulo.get("reference"), user["user_id"]),
                )
                row = cur.fetchone()
                if row is None:
                    cur.execute(
                        "SELECT offering_ulo_id FROM offering_ulo WHERE offering_id = %s AND ulo_code = %s",
                        (offering_id, ulo["code"]),
                    )
                    row = cur.fetchone()
                ulo_ids[ulo["code"]] = row["offering_ulo_id"]

            for assessment in payload["assessments"]:
                cur.execute(
                    "SELECT source FROM assessment WHERE offering_id = %s AND assessment_name = %s",
                    (offering_id, assessment["name"]),
                )
                existing = cur.fetchone()
                if existing and existing["source"] != "handbook":
                    raise HTTPException(
                        status_code=409,
                        detail=f"Manual assessment '{assessment['name']}' has the same name as the Handbook import.",
                    )

            cur.execute("DELETE FROM assessment WHERE offering_id = %s AND source = 'handbook'", (offering_id,))
            for order, assessment in enumerate(payload["assessments"], start=1):
                cur.execute(
                    """
                    INSERT INTO assessment (
                        offering_id, assessment_name, weight, max_mark, assessment_order, is_hurdle,
                        source, confirmed_by, confirmed_at
                    )
                    VALUES (%s, %s, %s, 100, %s, %s, 'handbook', %s, CURRENT_TIMESTAMP)
                    RETURNING assessment_id
                    """,
                    (
                        offering_id,
                        assessment["name"],
                        Decimal(assessment["weight"]),
                        order,
                        assessment["is_hurdle"],
                        user["user_id"],
                    ),
                )
                assessment_id = cur.fetchone()["assessment_id"]
                linked_ulo_ids = [ulo_ids[code] for code in assessment["ulo_codes"] if code in ulo_ids]
                for offering_ulo_id, allocated_weight in split_weight(Decimal(assessment["weight"]), linked_ulo_ids).items():
                    cur.execute(
                        """
                        INSERT INTO assessment_ulo (
                            offering_id, assessment_id, offering_ulo_id, source, is_confirmed,
                            allocated_weight, confirmed_by, confirmed_at
                        )
                        VALUES (%s, %s, %s, 'handbook', TRUE, %s, %s, CURRENT_TIMESTAMP)
                        """,
                        (offering_id, assessment_id, offering_ulo_id, allocated_weight, user["user_id"]),
                    )

            cur.execute(
                """
                UPDATE handbook_import_snapshot
                SET status = 'confirmed', confirmed_by = %s, confirmed_at = CURRENT_TIMESTAMP
                WHERE handbook_import_id = %s
                """,
                (user["user_id"], confirmation.handbook_import_id),
            )
    return {"status": "confirmed"}


@app.get("/api/dashboard")
def dashboard(user: Annotated[dict, Depends(require_offering_access())], offering_id: int = 1):
    offering = fetch_one(
        """
        SELECT o.offering_id, u.unit_code, u.unit_name, p.program_name, s.year, s.period
        FROM unit_offering o
        JOIN unit u ON u.unit_id = o.unit_id
        JOIN program p ON p.program_id = o.program_id
        JOIN semester s ON s.semester_id = o.semester_id
        WHERE o.offering_id = %s
        """,
        (offering_id,),
    )
    if not offering:
        raise HTTPException(status_code=404, detail="Offering not found")

    los = fetch_all(
        """
        SELECT
            ou.offering_ulo_id,
            ou.ulo_code,
            ou.description,
            COALESCE(c.average_attainment_pct, 0) AS average_attainment_pct,
            COALESCE(c.pass_rate_pct, 0) AS pass_rate_pct,
            COALESCE(c.enrolled_count, 0) AS enrolled_count,
            COALESCE(c.achieved_count, 0) AS achieved_count
        FROM offering_ulo ou
        LEFT JOIN cohort_ulo_attainment c ON c.offering_ulo_id = ou.offering_ulo_id
        WHERE ou.offering_id = %s
        ORDER BY ou.ulo_code
        """,
        (offering_id,),
    )
    assessments = fetch_all(
        """
        SELECT
            a.assessment_id,
            a.assessment_name,
            a.weight,
            a.max_mark,
            a.is_hurdle,
            ARRAY_REMOVE(ARRAY_AGG(ou.ulo_code ORDER BY ou.ulo_code), NULL) AS covers
        FROM assessment a
        LEFT JOIN assessment_ulo au ON au.assessment_id = a.assessment_id
        LEFT JOIN offering_ulo ou ON ou.offering_ulo_id = au.offering_ulo_id
        WHERE a.offering_id = %s
        GROUP BY a.assessment_id
        ORDER BY a.assessment_order
        """,
        (offering_id,),
    )
    report = fetch_one(
        """
        SELECT report_id, ai_summary, coordinator_comment, is_finalized, generated_at
        FROM ai_report
        WHERE offering_id = %s
        ORDER BY generated_at DESC
        LIMIT 1
        """,
        (offering_id,),
    )
    stats = {
        "student_count": fetch_one("SELECT COUNT(*) AS count FROM enrollment WHERE offering_id = %s", (offering_id,))["count"],
        "lo_count": len(los),
        "at_risk_count": sum(1 for item in los if item["pass_rate_pct"] < 70),
    }
    return {"offering": offering, "stats": stats, "learning_outcomes": los, "assessments": assessments, "report": report}


@app.get("/api/mappings")
def mappings(user: Annotated[dict, Depends(require_offering_access())], offering_id: int = 1):
    ulos = fetch_all(
        "SELECT offering_ulo_id, ulo_code, description FROM offering_ulo WHERE offering_id = %s ORDER BY ulo_code",
        (offering_id,),
    )
    plos = fetch_all(
        """
        SELECT p.plo_id, p.plo_code, p.description
        FROM plo p
        JOIN unit_offering o ON o.program_id = p.program_id
        WHERE o.offering_id = %s
        ORDER BY p.plo_code
        """,
        (offering_id,),
    )
    rows = fetch_all(
        """
        SELECT mapping_id, offering_ulo_id, plo_id, mapping_source, confirmed_at
        FROM ulo_plo_mapping
        WHERE offering_id = %s AND is_active = TRUE
        ORDER BY offering_ulo_id, plo_id
        """,
        (offering_id,),
    )
    return {"ulos": ulos, "plos": plos, "mappings": rows}


@app.put("/api/mappings")
def save_mappings(
    payload: MappingUpdate,
    user: Annotated[dict, Depends(require_permission(20))],
):
    ensure_offering_access(user, payload.offering_id, min_permission_level=20)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE ulo_plo_mapping SET is_active = FALSE, removed_by = %s, removed_at = CURRENT_TIMESTAMP WHERE offering_id = %s",
                (user["user_id"], payload.offering_id),
            )
            for item in payload.mappings:
                cur.execute(
                    """
                    INSERT INTO ulo_plo_mapping (offering_id, offering_ulo_id, plo_id, mapping_source, confirmed_by)
                    VALUES (%s, %s, %s, 'manual', %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (payload.offering_id, item["offering_ulo_id"], item["plo_id"], user["user_id"]),
                )
    return {"status": "saved"}


@app.get("/api/assessments")
def assessments(user: Annotated[dict, Depends(require_offering_access())], offering_id: int = 1):
    rows = fetch_all(
        """
        SELECT
            a.assessment_id,
            a.assessment_name,
            a.weight,
            a.max_mark,
            a.is_hurdle,
            a.source,
            ARRAY_REMOVE(ARRAY_AGG(ou.ulo_code ORDER BY ou.ulo_code), NULL) AS covers,
            ARRAY_REMOVE(ARRAY_AGG(au.allocated_weight ORDER BY ou.ulo_code), NULL) AS allocated_weights
        FROM assessment a
        LEFT JOIN assessment_ulo au ON au.assessment_id = a.assessment_id
        LEFT JOIN offering_ulo ou ON ou.offering_ulo_id = au.offering_ulo_id
        WHERE a.offering_id = %s
        GROUP BY a.assessment_id
        ORDER BY a.assessment_order
        """,
        (offering_id,),
    )
    return {"assessments": rows}


@app.post("/api/uploads/validate")
async def validate_upload(
    user: Annotated[dict, Depends(require_offering_access())],
    offering_id: int,
    file: UploadFile = File(...),
):
    content = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))
    rows = list(reader)
    issues = []
    for index, row in enumerate(rows, start=2):
        mark_value = row.get("mark") or row.get("raw_mark") or row.get("score")
        student_code = row.get("student_code") or row.get("student_id")
        if not student_code:
            issues.append({"row": index, "severity": "error", "message": "Missing student identifier"})
        if mark_value:
            try:
                mark = float(mark_value)
                if mark < 0:
                    issues.append({"row": index, "severity": "error", "message": "Mark cannot be negative"})
                if mark > 100:
                    issues.append({"row": index, "severity": "warning", "message": "Mark exceeds 100 and needs review"})
            except ValueError:
                issues.append({"row": index, "severity": "error", "message": "Mark is not numeric"})
    return {
        "filename": file.filename,
        "columns": reader.fieldnames or [],
        "row_count": len(rows),
        "issues": issues,
        "status": "valid" if not any(item["severity"] == "error" for item in issues) else "needs_review",
    }


@app.post("/api/reports/summary")
def generate_summary(
    user: Annotated[dict, Depends(require_offering_access(20))],
    offering_id: int = 1,
):
    dashboard_payload = dashboard(user=user, offering_id=offering_id)
    weakest = min(dashboard_payload["learning_outcomes"], key=lambda item: item["pass_rate_pct"])
    summary = (
        f"{weakest['ulo_code']} is the main risk area with a pass rate of "
        f"{weakest['pass_rate_pct']}%. Review assessment coverage and consider targeted support before final reporting."
    )
    return {
        "provider": get_settings().llm_provider,
        "summary": summary,
        "note": "Mock summary for development. Replace provider with local LLM service later.",
    }


@app.get("/api/admin/users")
def admin_users(user: Annotated[dict, Depends(require_permission(30))]):
    rows = fetch_all(
        """
        SELECT u.user_id, u.full_name, u.email, u.is_active, u.created_at, r.role_name, r.permission_level
        FROM app_user u
        JOIN role r ON r.role_id = u.role_id
        ORDER BY r.permission_level DESC, u.full_name
        """
    )
    return {"users": rows}
