from contextlib import asynccontextmanager
import csv
import io
import json
import re
from decimal import Decimal
from typing import Annotated

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

from app.auth import (
    create_access_token,
    ensure_offering_access,
    generate_temporary_password,
    get_current_user,
    hash_password,
    is_valid_password,
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


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class AdminUserCreate(BaseModel):
    staff_id: str
    full_name: str
    email: EmailStr
    role_name: str


class AdminUserStatusUpdate(BaseModel):
    is_active: bool


class AdminUserBulkCreate(BaseModel):
    users: list[AdminUserCreate]


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
        SELECT u.user_id, u.staff_id, u.full_name, u.email, u.password_hash, u.is_active,
               u.must_change_password, r.role_name, r.permission_level
        FROM app_user u
        JOIN role r ON r.role_id = u.role_id
        WHERE u.email = %s
        """,
        (str(payload.email).lower(),),
    )
    if not user or not user["is_active"] or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    public_user = {
        key: user[key]
        for key in ["user_id", "staff_id", "full_name", "email", "must_change_password", "role_name", "permission_level"]
    }
    return {
        "access_token": create_access_token(user),
        "token_type": "bearer",
        "user": public_user,
    }


@app.post("/api/auth/change-password")
def change_password(
    payload: PasswordChangeRequest,
    user: Annotated[dict, Depends(get_current_user)],
):
    user_with_password = fetch_one(
        "SELECT password_hash FROM app_user WHERE user_id = %s",
        (user["user_id"],),
    )
    if not user_with_password or not verify_password(payload.current_password, user_with_password["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    if not is_valid_password(payload.new_password):
        raise HTTPException(status_code=422, detail="New password must be at least 12 characters")

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE app_user SET password_hash = %s, must_change_password = FALSE WHERE user_id = %s",
                (hash_password(payload.new_password), user["user_id"]),
            )
    return {"status": "changed"}


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
            o.coordinator_id,
            o.handbook_url,
            o.last_scraped_at
        FROM unit_offering o
        JOIN unit u ON u.unit_id = o.unit_id
        JOIN program p ON p.program_id = o.program_id
        JOIN semester s ON s.semester_id = o.semester_id
    """
    if user["role_name"] == "coordinator":
        query += """
            WHERE o.coordinator_id = %s
               OR EXISTS (
                    SELECT 1 FROM offering_lecturer ol
                    WHERE ol.offering_id = o.offering_id AND ol.lecturer_id = %s
               )
        """
        params = (user["user_id"], user["user_id"])
    elif user["role_name"] == "lecturer":
        query += " WHERE EXISTS (SELECT 1 FROM offering_lecturer ol WHERE ol.offering_id = o.offering_id AND ol.lecturer_id = %s)"
        params = (user["user_id"],)
    elif user["role_name"] == "management":
        params = None
    else:
        raise HTTPException(status_code=403, detail="Unknown role")
    rows = fetch_all(query + " ORDER BY s.year DESC, s.period, u.unit_code", params)
    for row in rows:
        row["can_edit"] = user["role_name"] == "management" or row["coordinator_id"] == user["user_id"]
        del row["coordinator_id"]
    return {"offerings": rows}


def _handbook_offering(offering_id: int) -> dict:
    offering = fetch_one(
        """
        SELECT o.offering_id, o.unit_id, u.unit_code, s.year, s.period, o.handbook_location
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
        imported = fetch_handbook(
            offering["unit_code"],
            offering["year"],
            period=offering["period"],
            location=offering["handbook_location"],
        )
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
        SELECT u.user_id, u.staff_id, u.full_name, u.email, u.is_active, u.must_change_password,
               u.created_at, r.role_name, r.permission_level
        FROM app_user u
        JOIN role r ON r.role_id = u.role_id
        ORDER BY r.permission_level DESC, u.full_name
        """
    )
    return {"users": rows}


def _admin_user_values(payload: AdminUserCreate) -> tuple[str, str, str, str]:
    staff_id = payload.staff_id.strip()
    full_name = payload.full_name.strip()
    email = str(payload.email).lower()
    role_name = payload.role_name.strip().lower()
    if not re.fullmatch(r"\d{7}", staff_id):
        raise HTTPException(status_code=422, detail="Staff ID must be exactly seven digits")
    if len(full_name) < 3:
        raise HTTPException(status_code=422, detail="Full name is required")
    if not email.endswith("@monash.edu"):
        raise HTTPException(status_code=422, detail="Use a Monash staff email address")
    return staff_id, full_name, email, role_name


def _insert_admin_user(cur, values: tuple[str, str, str, str]) -> dict:
    staff_id, full_name, email, role_name = values
    cur.execute("SELECT role_id FROM role WHERE role_name = %s", (role_name,))
    role = cur.fetchone()
    if not role:
        raise HTTPException(status_code=422, detail="Role must be management, coordinator, or lecturer")
    cur.execute("SELECT 1 FROM app_user WHERE staff_id = %s OR email = %s", (staff_id, email))
    if cur.fetchone():
        raise HTTPException(status_code=409, detail="A staff account already uses that ID or email")

    temporary_password = generate_temporary_password()
    cur.execute(
        """
        INSERT INTO app_user (staff_id, full_name, email, password_hash, role_id, must_change_password)
        VALUES (%s, %s, %s, %s, %s, TRUE)
        RETURNING user_id
        """,
        (staff_id, full_name, email, hash_password(temporary_password), role["role_id"]),
    )
    user_id = cur.fetchone()["user_id"]
    cur.execute(
        """
        SELECT u.user_id, u.staff_id, u.full_name, u.email, u.is_active, u.must_change_password,
               u.created_at, r.role_name, r.permission_level
        FROM app_user u
        JOIN role r ON r.role_id = u.role_id
        WHERE u.user_id = %s
        """,
        (user_id,),
    )
    return {"user": cur.fetchone(), "temporary_password": temporary_password}


@app.post("/api/admin/users", status_code=201)
def create_admin_user(
    payload: AdminUserCreate,
    user: Annotated[dict, Depends(require_permission(30))],
):
    with get_conn() as conn:
        with conn.cursor() as cur:
            return _insert_admin_user(cur, _admin_user_values(payload))


@app.post("/api/admin/users/bulk", status_code=201)
def create_admin_users(
    payload: AdminUserBulkCreate,
    user: Annotated[dict, Depends(require_permission(30))],
):
    if not payload.users:
        raise HTTPException(status_code=422, detail="At least one staff account is required")
    values = [_admin_user_values(item) for item in payload.users]
    if len({item[0] for item in values}) != len(values) or len({item[2] for item in values}) != len(values):
        raise HTTPException(status_code=422, detail="The upload has duplicate staff IDs or emails")
    with get_conn() as conn:
        with conn.cursor() as cur:
            accounts = [_insert_admin_user(cur, item) for item in values]
    return {"accounts": accounts}


@app.patch("/api/admin/users/{user_id}")
def update_admin_user_status(
    user_id: int,
    payload: AdminUserStatusUpdate,
    user: Annotated[dict, Depends(require_permission(30))],
):
    if user_id == user["user_id"] and not payload.is_active:
        raise HTTPException(status_code=409, detail="You cannot deactivate your own account")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE app_user SET is_active = %s WHERE user_id = %s RETURNING user_id", (payload.is_active, user_id))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Staff account not found")
    return {"status": "updated"}
