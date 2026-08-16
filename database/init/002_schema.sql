-- MCS07 Student Academic Performance Dashboard
-- PostgreSQL Schema DDL (consolidated, cleaned-up version)
--
-- This file replaces database/init/001_schema.sql and folds in every
-- database/migrations/002-005 change. It removes dead/unused structures
-- found during the schema cleanup:
--   - ulo_plo_mapping_suggestion table (never read/written by the app)
--   - ulo_plo_mapping.mapping_source / suggestion_id columns (always 'manual' / NULL)
--   - grade_upload_row.raw_mark / max_mark / student_name_raw (superseded by grade_upload_cell)
-- It also adds multi-programme offerings and a teaching-staff roster:
--   - offering_program (many-to-many) replaces unit_offering.program_id
--   - offering_staffing records Lecture/Tutorial/Laboratory roster rows,
--     which may or may not be linked to a real app_user login account.
--
-- Runs after 001_schema.sql (now a no-op) on a fresh Postgres volume because
-- Postgres executes docker-entrypoint-initdb.d scripts in filename order.

-- 1. ROLE
CREATE TABLE role (
    role_id          SERIAL PRIMARY KEY,
    role_name        VARCHAR(50) NOT NULL UNIQUE,
    permission_level INT         NOT NULL CHECK (permission_level > 0)
);

-- 2. APP_USER
CREATE TABLE app_user (
    user_id       SERIAL PRIMARY KEY,
    staff_id      VARCHAR(7) UNIQUE,
    full_name     VARCHAR(150) NOT NULL,
    email         VARCHAR(200) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id       INT          NOT NULL REFERENCES role(role_id),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CHECK (staff_id IS NULL OR staff_id ~ '^[0-9]{7}$')
);

-- 3. PROGRAM
CREATE TABLE program (
    program_id   SERIAL PRIMARY KEY,
    program_code VARCHAR(20)  NOT NULL UNIQUE,
    program_name VARCHAR(200) NOT NULL
);

-- 4. PLO
CREATE TABLE plo (
    plo_id      SERIAL PRIMARY KEY,
    program_id  INT         NOT NULL REFERENCES program(program_id) ON DELETE CASCADE,
    plo_code    VARCHAR(20) NOT NULL,
    description TEXT        NOT NULL,
    UNIQUE (program_id, plo_code)
);

-- 5. UNIT
CREATE TABLE unit (
    unit_id              SERIAL PRIMARY KEY,
    unit_code            VARCHAR(20)  NOT NULL UNIQUE,
    unit_name            VARCHAR(200) NOT NULL,
    default_handbook_url VARCHAR(500)
);

-- 6. SEMESTER
CREATE TABLE semester (
    semester_id SERIAL PRIMARY KEY,
    year        INT         NOT NULL,
    period      VARCHAR(20) NOT NULL,
    start_date  DATE,
    end_date    DATE,
    status      VARCHAR(20) NOT NULL DEFAULT 'planning'
        CHECK (status IN ('planning', 'active', 'archived')),
    UNIQUE (year, period)
);

-- 7. UNIT_OFFERING
-- One offering per unit+semester. Programme scope is now many-to-many via
-- offering_program (a single offering can serve several programmes at once,
-- matching how the Handbook and the SoIT lecturer/tutor roster describe it).
CREATE TABLE unit_offering (
    offering_id        SERIAL PRIMARY KEY,
    unit_id            INT          NOT NULL REFERENCES unit(unit_id),
    semester_id        INT          NOT NULL REFERENCES semester(semester_id),
    coordinator_id     INT          NOT NULL REFERENCES app_user(user_id),
    handbook_location  VARCHAR(50)  NOT NULL DEFAULT 'Malaysia'
        CHECK (handbook_location = 'Malaysia'),
    handbook_url       VARCHAR(500),
    last_scraped_at    TIMESTAMP,
    created_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    status             VARCHAR(20)  NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'discontinued')),
    replaced_by_unit_id INT         REFERENCES unit(unit_id),
    UNIQUE (unit_id, semester_id)
);

-- 8. OFFERING_PROGRAM (many-to-many)
CREATE TABLE offering_program (
    offering_id INT NOT NULL REFERENCES unit_offering(offering_id) ON DELETE CASCADE,
    program_id  INT NOT NULL REFERENCES program(program_id),
    PRIMARY KEY (offering_id, program_id)
);

-- 9. OFFERING_LECTURER
-- Controls dashboard login access only (not the full teaching roster).
CREATE TABLE offering_lecturer (
    offering_id INT NOT NULL REFERENCES unit_offering(offering_id) ON DELETE CASCADE,
    lecturer_id INT NOT NULL REFERENCES app_user(user_id),
    PRIMARY KEY (offering_id, lecturer_id)
);

-- 10. OFFERING_STAFFING
-- Teaching-role roster (Lecture / Tutorial / Laboratory), imported from
-- SoIT staffing spreadsheets. A person may or may not have a login account
-- (most sessional tutors/lab demonstrators do not).
CREATE TABLE offering_staffing (
    staffing_id    SERIAL PRIMARY KEY,
    offering_id    INT         NOT NULL REFERENCES unit_offering(offering_id) ON DELETE CASCADE,
    role_type      VARCHAR(20) NOT NULL CHECK (role_type IN ('lecture', 'tutorial', 'laboratory')),
    staff_user_id  INT         REFERENCES app_user(user_id),
    external_name  VARCHAR(150),
    external_email VARCHAR(200),
    source         VARCHAR(30) NOT NULL DEFAULT 'roster_import',
    imported_at    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    CHECK (staff_user_id IS NOT NULL OR external_name IS NOT NULL)
);

-- 11. OFFERING_ULO
CREATE TABLE offering_ulo (
    offering_ulo_id    SERIAL PRIMARY KEY,
    offering_id        INT         NOT NULL REFERENCES unit_offering(offering_id) ON DELETE CASCADE,
    ulo_code           VARCHAR(20) NOT NULL,
    description        TEXT        NOT NULL,
    source             VARCHAR(30) NOT NULL DEFAULT 'handbook'
        CHECK (source IN ('handbook', 'manual', 'copied_previous')),
    handbook_reference VARCHAR(100),
    confirmed_by       INT         REFERENCES app_user(user_id),
    confirmed_at       TIMESTAMP,
    UNIQUE (offering_id, ulo_code),
    UNIQUE (offering_ulo_id, offering_id)
);

-- 12. ASSESSMENT
CREATE TABLE assessment (
    assessment_id    SERIAL PRIMARY KEY,
    offering_id      INT           NOT NULL REFERENCES unit_offering(offering_id) ON DELETE CASCADE,
    assessment_name  VARCHAR(150)  NOT NULL,
    weight           DECIMAL(5,2)  NOT NULL CHECK (weight >= 0 AND weight <= 100),
    max_mark         DECIMAL(6,2)  NOT NULL DEFAULT 100 CHECK (max_mark > 0),
    assessment_order INT,
    is_hurdle        BOOLEAN       NOT NULL DEFAULT FALSE,
    source           VARCHAR(30)   NOT NULL DEFAULT 'manual'
        CHECK (source IN ('handbook', 'manual', 'copied_previous')),
    confirmed_by     INT           REFERENCES app_user(user_id),
    confirmed_at     TIMESTAMP,
    UNIQUE (offering_id, assessment_name),
    UNIQUE (assessment_id, offering_id)
);

-- 13. ASSESSMENT_ULO
CREATE TABLE assessment_ulo (
    offering_id       INT          NOT NULL,
    assessment_id     INT          NOT NULL,
    offering_ulo_id   INT          NOT NULL,
    source            VARCHAR(30)  NOT NULL DEFAULT 'handbook'
        CHECK (source IN ('handbook', 'manual', 'copied_previous')),
    is_confirmed      BOOLEAN      NOT NULL DEFAULT FALSE,
    allocated_weight  DECIMAL(5,2),
    confirmed_by      INT          REFERENCES app_user(user_id),
    confirmed_at      TIMESTAMP,
    PRIMARY KEY (assessment_id, offering_ulo_id),
    FOREIGN KEY (assessment_id, offering_id)
        REFERENCES assessment(assessment_id, offering_id) ON DELETE CASCADE,
    FOREIGN KEY (offering_ulo_id, offering_id)
        REFERENCES offering_ulo(offering_ulo_id, offering_id) ON DELETE CASCADE
);

-- 14. ULO_PLO_MAPPING
-- Final semester-specific mapping confirmed by the Unit Coordinator.
-- (The old ulo_plo_mapping_suggestion table and the mapping_source/
-- suggestion_id columns were dropped: nothing in the app ever wrote or
-- read a suggestion, so every mapping was always 'manual'.)
CREATE TABLE ulo_plo_mapping (
    mapping_id      SERIAL PRIMARY KEY,
    offering_id     INT          NOT NULL REFERENCES unit_offering(offering_id) ON DELETE CASCADE,
    offering_ulo_id INT          NOT NULL,
    plo_id          INT          NOT NULL REFERENCES plo(plo_id),
    confirmed_by    INT          NOT NULL REFERENCES app_user(user_id),
    confirmed_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    removed_by      INT          REFERENCES app_user(user_id),
    removed_at      TIMESTAMP,
    FOREIGN KEY (offering_ulo_id, offering_id)
        REFERENCES offering_ulo(offering_ulo_id, offering_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX uq_active_ulo_plo_mapping
    ON ulo_plo_mapping(offering_id, offering_ulo_id, plo_id)
    WHERE is_active;

-- 15. STUDENT
-- program_id is nullable: a student's enrolment offering may now serve
-- several programmes, so it is set from the offering's programme only
-- when that offering has exactly one (see backend enrolment-commit logic).
CREATE TABLE student (
    student_id   SERIAL PRIMARY KEY,
    student_code VARCHAR(20)  NOT NULL UNIQUE,
    full_name    VARCHAR(150) NOT NULL,
    program_id   INT          REFERENCES program(program_id)
);

-- 16. ENROLLMENT
CREATE TABLE enrollment (
    enrollment_id SERIAL PRIMARY KEY,
    student_id    INT NOT NULL REFERENCES student(student_id),
    offering_id   INT NOT NULL REFERENCES unit_offering(offering_id),
    UNIQUE (student_id, offering_id),
    UNIQUE (enrollment_id, offering_id)
);

-- 17. GRADE_UPLOAD_BATCH
CREATE TABLE grade_upload_batch (
    upload_batch_id   SERIAL PRIMARY KEY,
    offering_id       INT          NOT NULL REFERENCES unit_offering(offering_id) ON DELETE CASCADE,
    assessment_id     INT,
    uploaded_by       INT          NOT NULL REFERENCES app_user(user_id),
    original_filename VARCHAR(255) NOT NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'validated', 'committed', 'rejected')),
    uploaded_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    committed_at      TIMESTAMP,
    FOREIGN KEY (assessment_id, offering_id)
        REFERENCES assessment(assessment_id, offering_id)
);

-- 18. GRADE_UPLOAD_COLUMN_MAPPING
CREATE TABLE grade_upload_column_mapping (
    column_mapping_id SERIAL       PRIMARY KEY,
    upload_batch_id   INT          NOT NULL REFERENCES grade_upload_batch(upload_batch_id) ON DELETE CASCADE,
    csv_column_name   VARCHAR(150) NOT NULL,
    system_field      VARCHAR(40)  NOT NULL
        CHECK (system_field IN ('student_code', 'student_name', 'raw_mark', 'max_mark', 'ignore')),
    assessment_id     INT          REFERENCES assessment(assessment_id),
    max_mark          DECIMAL(6,2) CHECK (max_mark IS NULL OR max_mark > 0),
    UNIQUE (upload_batch_id, csv_column_name)
);

-- 19. GRADE_UPLOAD_ROW
-- raw_mark / max_mark / student_name_raw were dropped: the app has fully
-- moved to the per-assessment grade_upload_cell model below and never
-- populated those legacy single-mark columns.
CREATE TABLE grade_upload_row (
    upload_row_id      SERIAL PRIMARY KEY,
    upload_batch_id    INT          NOT NULL REFERENCES grade_upload_batch(upload_batch_id) ON DELETE CASCADE,
    row_number         INT          NOT NULL,
    student_code_raw   VARCHAR(50),
    matched_student_id INT          REFERENCES student(student_id),
    status             VARCHAR(20)  NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'valid', 'warning', 'error', 'skipped', 'committed')),
    UNIQUE (upload_batch_id, row_number)
);

-- 20. GRADE_UPLOAD_CELL
CREATE TABLE grade_upload_cell (
    upload_cell_id SERIAL PRIMARY KEY,
    upload_row_id  INT          NOT NULL REFERENCES grade_upload_row(upload_row_id) ON DELETE CASCADE,
    assessment_id  INT          NOT NULL REFERENCES assessment(assessment_id),
    raw_mark       DECIMAL(6,2) NOT NULL CHECK (raw_mark >= 0),
    max_mark       DECIMAL(6,2) NOT NULL CHECK (max_mark > 0),
    status         VARCHAR(20)  NOT NULL DEFAULT 'valid'
        CHECK (status IN ('valid', 'warning', 'error')),
    CHECK (raw_mark <= max_mark),
    UNIQUE (upload_row_id, assessment_id)
);

-- 21. GRADE_UPLOAD_ISSUE
-- Not an audit-only table: commit is blocked while an unresolved 'error' row exists here.
CREATE TABLE grade_upload_issue (
    upload_issue_id SERIAL       PRIMARY KEY,
    upload_batch_id INT          NOT NULL REFERENCES grade_upload_batch(upload_batch_id) ON DELETE CASCADE,
    upload_row_id   INT          REFERENCES grade_upload_row(upload_row_id) ON DELETE CASCADE,
    issue_type      VARCHAR(50)  NOT NULL,
    severity        VARCHAR(20)  NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
    message         TEXT         NOT NULL,
    resolution      VARCHAR(50),
    resolved_by     INT          REFERENCES app_user(user_id),
    resolved_at     TIMESTAMP
);

-- 22. ENROLLMENT_UPLOAD_BATCH
CREATE TABLE enrollment_upload_batch (
    enrollment_upload_batch_id SERIAL PRIMARY KEY,
    offering_id                INT          NOT NULL REFERENCES unit_offering(offering_id) ON DELETE CASCADE,
    uploaded_by                INT          NOT NULL REFERENCES app_user(user_id),
    original_filename          VARCHAR(255) NOT NULL,
    row_count                  INT          NOT NULL CHECK (row_count >= 0),
    accepted_count             INT          NOT NULL CHECK (accepted_count >= 0),
    issue_count                INT          NOT NULL CHECK (issue_count >= 0),
    status                     VARCHAR(20)  NOT NULL CHECK (status IN ('committed', 'needs_review')),
    uploaded_at                TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 23. STUDENT_GRADE
CREATE TABLE student_grade (
    grade_id        SERIAL PRIMARY KEY,
    offering_id     INT          NOT NULL,
    enrollment_id   INT          NOT NULL,
    assessment_id   INT          NOT NULL,
    upload_batch_id INT          REFERENCES grade_upload_batch(upload_batch_id),
    source_row_id   INT          REFERENCES grade_upload_row(upload_row_id),
    raw_mark        DECIMAL(6,2) NOT NULL CHECK (raw_mark >= 0),
    max_mark        DECIMAL(6,2) NOT NULL DEFAULT 100 CHECK (max_mark > 0),
    weighted_score  DECIMAL(6,2),
    uploaded_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CHECK (raw_mark <= max_mark),
    UNIQUE (enrollment_id, assessment_id),
    FOREIGN KEY (enrollment_id, offering_id)
        REFERENCES enrollment(enrollment_id, offering_id) ON DELETE CASCADE,
    FOREIGN KEY (assessment_id, offering_id)
        REFERENCES assessment(assessment_id, offering_id)
);

-- 24. STUDENT_ULO_ATTAINMENT
CREATE TABLE student_ulo_attainment (
    attainment_id          SERIAL PRIMARY KEY,
    offering_id            INT          NOT NULL,
    enrollment_id          INT          NOT NULL,
    offering_ulo_id        INT          NOT NULL,
    total_available_weight DECIMAL(5,2) NOT NULL CHECK (total_available_weight > 0),
    achieved_weight        DECIMAL(5,2) NOT NULL CHECK (achieved_weight >= 0),
    attainment_pct         DECIMAL(5,2) NOT NULL CHECK (attainment_pct >= 0 AND attainment_pct <= 100),
    is_achieved            BOOLEAN      NOT NULL,
    calculated_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CHECK (achieved_weight <= total_available_weight),
    UNIQUE (enrollment_id, offering_ulo_id),
    FOREIGN KEY (enrollment_id, offering_id)
        REFERENCES enrollment(enrollment_id, offering_id) ON DELETE CASCADE,
    FOREIGN KEY (offering_ulo_id, offering_id)
        REFERENCES offering_ulo(offering_ulo_id, offering_id) ON DELETE CASCADE
);

-- 25. COHORT_ULO_ATTAINMENT
CREATE TABLE cohort_ulo_attainment (
    cohort_attainment_id    SERIAL PRIMARY KEY,
    offering_id             INT          NOT NULL REFERENCES unit_offering(offering_id) ON DELETE CASCADE,
    offering_ulo_id         INT          NOT NULL,
    enrolled_count          INT          NOT NULL CHECK (enrolled_count >= 0),
    achieved_count          INT          NOT NULL CHECK (achieved_count >= 0),
    average_attainment_pct  DECIMAL(5,2) NOT NULL CHECK (average_attainment_pct >= 0 AND average_attainment_pct <= 100),
    pass_rate_pct           DECIMAL(5,2) NOT NULL CHECK (pass_rate_pct >= 0 AND pass_rate_pct <= 100),
    calculated_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CHECK (achieved_count <= enrolled_count),
    UNIQUE (offering_id, offering_ulo_id),
    FOREIGN KEY (offering_ulo_id, offering_id)
        REFERENCES offering_ulo(offering_ulo_id, offering_id) ON DELETE CASCADE
);

-- 26. AI_REPORT
CREATE TABLE ai_report (
    report_id           SERIAL PRIMARY KEY,
    offering_id         INT         NOT NULL REFERENCES unit_offering(offering_id) ON DELETE CASCADE,
    report_scope        VARCHAR(30) NOT NULL DEFAULT 'unit_cohort'
        CHECK (report_scope IN ('unit_cohort', 'program_cohort')),
    generated_by        INT         REFERENCES app_user(user_id),
    generated_at        TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    ai_summary          TEXT,
    coordinator_comment TEXT,
    is_finalized        BOOLEAN     NOT NULL DEFAULT FALSE,
    finalized_by        INT         REFERENCES app_user(user_id),
    finalized_at        TIMESTAMP
);

CREATE UNIQUE INDEX uq_final_ai_report_offering
    ON ai_report(offering_id)
    WHERE is_finalized;

-- 27. HANDBOOK_IMPORT_SNAPSHOT
-- Imported Handbook content is always reviewed before it changes an offering.
CREATE TABLE handbook_import_snapshot (
    handbook_import_id SERIAL PRIMARY KEY,
    offering_id        INT          NOT NULL REFERENCES unit_offering(offering_id) ON DELETE CASCADE,
    source_url         VARCHAR(500) NOT NULL,
    handbook_version   VARCHAR(100),
    payload            JSONB        NOT NULL,
    status             VARCHAR(20)  NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'confirmed')),
    imported_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_by       INT          REFERENCES app_user(user_id),
    confirmed_at       TIMESTAMP
);

CREATE INDEX idx_handbook_import_offering ON handbook_import_snapshot(offering_id, imported_at DESC);

-- INDEXES
CREATE INDEX idx_unit_offering_semester      ON unit_offering(semester_id);
CREATE INDEX idx_offering_program_program    ON offering_program(program_id);
CREATE INDEX idx_offering_staffing_offering  ON offering_staffing(offering_id);
CREATE INDEX idx_offering_ulo_offering       ON offering_ulo(offering_id);
CREATE INDEX idx_assessment_offering         ON assessment(offering_id);
CREATE INDEX idx_assessment_ulo_offering     ON assessment_ulo(offering_id);
CREATE INDEX idx_ulo_plo_mapping_offering    ON ulo_plo_mapping(offering_id);
CREATE INDEX idx_enrollment_student          ON enrollment(student_id);
CREATE INDEX idx_enrollment_offering         ON enrollment(offering_id);
CREATE INDEX idx_upload_batch_assessment     ON grade_upload_batch(assessment_id);
CREATE INDEX idx_upload_row_batch            ON grade_upload_row(upload_batch_id);
CREATE INDEX idx_upload_issue_batch          ON grade_upload_issue(upload_batch_id);
CREATE INDEX idx_grade_upload_cell_assessment ON grade_upload_cell(assessment_id);
CREATE INDEX idx_enrollment_upload_batch_offering ON enrollment_upload_batch(offering_id, uploaded_at DESC);
CREATE INDEX idx_student_grade_enrollment    ON student_grade(enrollment_id);
CREATE INDEX idx_attainment_enrollment       ON student_ulo_attainment(enrollment_id);
CREATE INDEX idx_cohort_attainment_offering  ON cohort_ulo_attainment(offering_id);
CREATE INDEX idx_ai_report_offering          ON ai_report(offering_id);

-- SEED ROLES
INSERT INTO role (role_name, permission_level)
VALUES
    ('lecturer', 10),
    ('coordinator', 20),
    ('management', 30);

-- IMPLEMENTATION NOTES
-- - The application should enforce that coordinator_id belongs to a coordinator
--   user and lecturer_id belongs to a lecturer user.
-- - The application or a database trigger should validate that assessment weights
--   total 100% for each offering before calculation.
-- - PLO alignment should not be treated as Handbook truth. Handbook data can
--   prefill ULOs, assessments, and assessment-ULO links only.
-- - offering_staffing is a reporting/compliance roster (Lecture/Tutorial/
--   Laboratory) separate from offering_lecturer, which controls dashboard
--   login access. Importing a roster spreadsheet should never grant access.
