from contextlib import asynccontextmanager
import csv
import io
from typing import Annotated

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

from app.auth import create_access_token, get_current_user, require_permission, verify_password
from app.config import get_settings
from app.db import fetch_all, fetch_one, get_conn
from app.seed import seed_demo_data


@asynccontextmanager
async def lifespan(app: FastAPI):
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
    rows = fetch_all(
        """
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
        ORDER BY s.year DESC, s.period, u.unit_code
        """
    )
    return {"offerings": rows}


@app.get("/api/dashboard")
def dashboard(user: Annotated[dict, Depends(get_current_user)], offering_id: int = 1):
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
def mappings(user: Annotated[dict, Depends(get_current_user)], offering_id: int = 1):
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
def assessments(user: Annotated[dict, Depends(get_current_user)], offering_id: int = 1):
    rows = fetch_all(
        """
        SELECT
            a.assessment_id,
            a.assessment_name,
            a.weight,
            a.max_mark,
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
    user: Annotated[dict, Depends(require_permission(10))],
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
    user: Annotated[dict, Depends(require_permission(20))],
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

