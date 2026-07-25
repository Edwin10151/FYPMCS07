-- MCS07 Student Academic Performance Dashboard
-- PostgreSQL Schema DDL
-- Updated after scope clarification:
-- 1. ULOs and assessments can change every semester, so they belong to a unit offering.
-- 2. Handbook data can prefill ULOs, assessments, and assessment-to-ULO links.
-- 3. ULO-to-PLO mapping is confirmed by the Unit Coordinator every semester.
-- 4. AI reports summarize cohort/unit performance per semester, not individual students.
-- 5. Moodle CSV uploads need column mapping, validation, review, and commit tracking.

-- 1. ROLE
CREATE TABLE role (
    role_id          SERIAL PRIMARY KEY,
    role_name        VARCHAR(50) NOT NULL UNIQUE,
    permission_level INT         NOT NULL CHECK (permission_level > 0)
);

-- 2. APP_USER
-- One staff account has exactly one role. permission_level lets coordinator inherit
-- lecturer-style workflow access without assigning multiple roles.
CREATE TABLE app_user (
    user_id       SERIAL PRIMARY KEY,
    full_name     VARCHAR(150) NOT NULL,
    email         VARCHAR(200) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id       INT          NOT NULL REFERENCES role(role_id),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
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
-- Canonical unit identity. Semester-specific ULO and assessment details are stored
-- under unit_offering because the Handbook structure may change each semester.
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
    UNIQUE (year, period)
);

-- 7. UNIT_OFFERING
-- A unit offering is the unit + program/course + semester context used for mapping
-- and reporting.
CREATE TABLE unit_offering (
    offering_id     SERIAL PRIMARY KEY,
    unit_id         INT          NOT NULL REFERENCES unit(unit_id),
    program_id      INT          NOT NULL REFERENCES program(program_id),
    semester_id     INT          NOT NULL REFERENCES semester(semester_id),
    coordinator_id  INT          NOT NULL REFERENCES app_user(user_id),
    handbook_url    VARCHAR(500),
    last_scraped_at TIMESTAMP,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (unit_id, program_id, semester_id)
);

-- 8. OFFERING_LECTURER
CREATE TABLE offering_lecturer (
    offering_id INT NOT NULL REFERENCES unit_offering(offering_id) ON DELETE CASCADE,
    lecturer_id INT NOT NULL REFERENCES app_user(user_id),
    PRIMARY KEY (offering_id, lecturer_id)
);

-- 9. OFFERING_ULO
-- ULOs are offering-specific because ULO wording/codes can change by semester.
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

-- 10. ASSESSMENT
-- Assessments are offering-specific because assessment structure can change by
-- semester even for the same unit.
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

-- 11. ASSESSMENT_ULO
-- Handbook can prefill this mapping, but staff can confirm or edit it.
-- allocated_weight can be stored as a calculation snapshot:
-- assessment.weight / number of confirmed ULO links for the assessment.
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

-- 12. ULO_PLO_MAPPING_SUGGESTION
-- Stores preview suggestions from historical mappings, existing records, or
-- keyword matching. These are not final PLO alignments until reviewed.
CREATE TABLE ulo_plo_mapping_suggestion (
    suggestion_id     SERIAL PRIMARY KEY,
    offering_id       INT          NOT NULL REFERENCES unit_offering(offering_id) ON DELETE CASCADE,
    offering_ulo_id   INT          NOT NULL,
    plo_id            INT          NOT NULL REFERENCES plo(plo_id),
    suggestion_source VARCHAR(40)  NOT NULL
        CHECK (suggestion_source IN ('historical', 'keyword', 'existing_record', 'manual_seed')),
    source_offering_id INT         REFERENCES unit_offering(offering_id),
    confidence_score  DECIMAL(4,3) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    rationale         TEXT,
    review_status     VARCHAR(20)  NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending', 'accepted', 'rejected')),
    reviewed_by       INT          REFERENCES app_user(user_id),
    reviewed_at       TIMESTAMP,
    created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (offering_ulo_id, offering_id)
        REFERENCES offering_ulo(offering_ulo_id, offering_id) ON DELETE CASCADE
);

-- 13. ULO_PLO_MAPPING
-- Final semester-specific mapping confirmed by the Unit Coordinator.
CREATE TABLE ulo_plo_mapping (
    mapping_id      SERIAL PRIMARY KEY,
    offering_id     INT          NOT NULL REFERENCES unit_offering(offering_id) ON DELETE CASCADE,
    offering_ulo_id INT          NOT NULL,
    plo_id          INT          NOT NULL REFERENCES plo(plo_id),
    mapping_source  VARCHAR(40)  NOT NULL DEFAULT 'manual'
        CHECK (mapping_source IN ('manual', 'accepted_historical', 'accepted_keyword', 'accepted_existing')),
    suggestion_id   INT          REFERENCES ulo_plo_mapping_suggestion(suggestion_id),
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

-- 14. STUDENT
CREATE TABLE student (
    student_id   SERIAL PRIMARY KEY,
    student_code VARCHAR(20)  NOT NULL UNIQUE,
    full_name    VARCHAR(150) NOT NULL,
    program_id   INT          NOT NULL REFERENCES program(program_id)
);

-- 15. ENROLLMENT
CREATE TABLE enrollment (
    enrollment_id SERIAL PRIMARY KEY,
    student_id    INT NOT NULL REFERENCES student(student_id),
    offering_id   INT NOT NULL REFERENCES unit_offering(offering_id),
    UNIQUE (student_id, offering_id),
    UNIQUE (enrollment_id, offering_id)
);

-- 16. GRADE_UPLOAD_BATCH
-- Represents a Moodle CSV upload for one assessment in one unit offering.
CREATE TABLE grade_upload_batch (
    upload_batch_id  SERIAL PRIMARY KEY,
    offering_id      INT          NOT NULL REFERENCES unit_offering(offering_id) ON DELETE CASCADE,
    assessment_id    INT          NOT NULL,
    uploaded_by      INT          NOT NULL REFERENCES app_user(user_id),
    original_filename VARCHAR(255) NOT NULL,
    status           VARCHAR(20)  NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'validated', 'committed', 'rejected')),
    uploaded_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    committed_at     TIMESTAMP,
    FOREIGN KEY (assessment_id, offering_id)
        REFERENCES assessment(assessment_id, offering_id)
);

-- 17. GRADE_UPLOAD_COLUMN_MAPPING
-- Stores which Moodle CSV columns staff selected for student ID, mark, max mark, etc.
CREATE TABLE grade_upload_column_mapping (
    column_mapping_id SERIAL PRIMARY KEY,
    upload_batch_id   INT          NOT NULL REFERENCES grade_upload_batch(upload_batch_id) ON DELETE CASCADE,
    csv_column_name   VARCHAR(150) NOT NULL,
    system_field      VARCHAR(40)  NOT NULL
        CHECK (system_field IN ('student_code', 'student_name', 'raw_mark', 'max_mark', 'ignore')),
    UNIQUE (upload_batch_id, csv_column_name)
);

-- 18. GRADE_UPLOAD_ROW
CREATE TABLE grade_upload_row (
    upload_row_id     SERIAL PRIMARY KEY,
    upload_batch_id   INT          NOT NULL REFERENCES grade_upload_batch(upload_batch_id) ON DELETE CASCADE,
    row_number        INT          NOT NULL,
    student_code_raw  VARCHAR(50),
    student_name_raw  VARCHAR(150),
    raw_mark          DECIMAL(6,2),
    max_mark          DECIMAL(6,2),
    matched_student_id INT         REFERENCES student(student_id),
    status            VARCHAR(20)  NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'valid', 'warning', 'error', 'skipped', 'committed')),
    UNIQUE (upload_batch_id, row_number)
);

-- 19. GRADE_UPLOAD_ISSUE
CREATE TABLE grade_upload_issue (
    upload_issue_id SERIAL PRIMARY KEY,
    upload_batch_id INT          NOT NULL REFERENCES grade_upload_batch(upload_batch_id) ON DELETE CASCADE,
    upload_row_id   INT          REFERENCES grade_upload_row(upload_row_id) ON DELETE CASCADE,
    issue_type      VARCHAR(50)  NOT NULL,
    severity        VARCHAR(20)  NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
    message         TEXT         NOT NULL,
    resolution      VARCHAR(50),
    resolved_by     INT          REFERENCES app_user(user_id),
    resolved_at     TIMESTAMP
);

-- 20. STUDENT_GRADE
-- Final committed assessment mark after CSV validation/reconciliation.
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

-- 21. STUDENT_ULO_ATTAINMENT
-- Per-student calculation results used to build cohort views.
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

-- 22. COHORT_ULO_ATTAINMENT
-- Cohort/unit summary for dashboard cards and AI report input.
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

-- 23. AI_REPORT
-- AI report is for the unit/cohort/semester, not individual students.
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
CREATE INDEX idx_unit_offering_program       ON unit_offering(program_id);
CREATE INDEX idx_offering_ulo_offering       ON offering_ulo(offering_id);
CREATE INDEX idx_assessment_offering         ON assessment(offering_id);
CREATE INDEX idx_assessment_ulo_offering     ON assessment_ulo(offering_id);
CREATE INDEX idx_mapping_suggestion_offering ON ulo_plo_mapping_suggestion(offering_id);
CREATE INDEX idx_ulo_plo_mapping_offering    ON ulo_plo_mapping(offering_id);
CREATE INDEX idx_enrollment_student          ON enrollment(student_id);
CREATE INDEX idx_enrollment_offering         ON enrollment(offering_id);
CREATE INDEX idx_upload_batch_assessment     ON grade_upload_batch(assessment_id);
CREATE INDEX idx_upload_row_batch            ON grade_upload_row(upload_batch_id);
CREATE INDEX idx_upload_issue_batch          ON grade_upload_issue(upload_batch_id);
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
-- - ULO-PLO suggestions are stored separately from final mappings so the
--   coordinator decision remains explicit and auditable.
