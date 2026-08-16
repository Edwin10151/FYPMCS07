-- SUPERSEDED: folded into database/init/002_schema.sql. Kept commented out for history.
/*
-- Administration state and upload audit records for the first development phase.
-- The initial schema already contains the final student/grade/result tables; this
-- migration adds the workflow state needed to populate them safely.

ALTER TABLE semester
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'planning';

ALTER TABLE unit_offering
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS replaced_by_unit_id INT REFERENCES unit(unit_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'semester_status_check'
    ) THEN
        ALTER TABLE semester
            ADD CONSTRAINT semester_status_check
            CHECK (status IN ('planning', 'active', 'archived'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unit_offering_status_check'
    ) THEN
        ALTER TABLE unit_offering
            ADD CONSTRAINT unit_offering_status_check
            CHECK (status IN ('draft', 'active', 'discontinued'));
    END IF;
END $$;

-- A student-list upload is scoped to one unit offering. It records the source
-- file and outcome while the canonical records remain student and enrollment.
CREATE TABLE IF NOT EXISTS enrollment_upload_batch (
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

CREATE INDEX IF NOT EXISTS idx_enrollment_upload_batch_offering
    ON enrollment_upload_batch(offering_id, uploaded_at DESC);

-- A Moodle gradebook has one student column and many assessed columns. Keep the
-- original batch/row tables for provenance and add cells for the M:1 mapping.
ALTER TABLE grade_upload_batch
    ALTER COLUMN assessment_id DROP NOT NULL;

ALTER TABLE grade_upload_column_mapping
    ADD COLUMN IF NOT EXISTS assessment_id INT REFERENCES assessment(assessment_id),
    ADD COLUMN IF NOT EXISTS max_mark DECIMAL(6,2) CHECK (max_mark IS NULL OR max_mark > 0);

CREATE TABLE IF NOT EXISTS grade_upload_cell (
    upload_cell_id   SERIAL PRIMARY KEY,
    upload_row_id    INT          NOT NULL REFERENCES grade_upload_row(upload_row_id) ON DELETE CASCADE,
    assessment_id    INT          NOT NULL REFERENCES assessment(assessment_id),
    raw_mark         DECIMAL(6,2) NOT NULL CHECK (raw_mark >= 0),
    max_mark         DECIMAL(6,2) NOT NULL CHECK (max_mark > 0),
    status           VARCHAR(20)  NOT NULL DEFAULT 'valid'
        CHECK (status IN ('valid', 'warning', 'error')),
    CHECK (raw_mark <= max_mark),
    UNIQUE (upload_row_id, assessment_id)
);

CREATE INDEX IF NOT EXISTS idx_grade_upload_cell_assessment
    ON grade_upload_cell(assessment_id);
*/
