ALTER TABLE ai_report
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'draft',
    ADD COLUMN attainment_analysis TEXT,
    ADD COLUMN previous_cohort_outcomes TEXT,
    ADD COLUMN next_cohort_action_plan TEXT,
    ADD COLUMN evidence_snapshot JSONB,
    ADD COLUMN provider VARCHAR(30),
    ADD COLUMN model VARCHAR(100),
    ADD COLUMN prompt_version VARCHAR(30),
    ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN submitted_by INT REFERENCES app_user(user_id),
    ADD COLUMN submitted_at TIMESTAMP,
    ADD COLUMN reviewed_by INT REFERENCES app_user(user_id),
    ADD COLUMN reviewed_at TIMESTAMP,
    ADD COLUMN reviewer_comment TEXT;

ALTER TABLE ai_report
    ADD CONSTRAINT ai_report_status_check
    CHECK (status IN ('draft', 'submitted', 'changes_requested', 'approved'));

UPDATE ai_report
SET status = 'approved'
WHERE is_finalized = TRUE;
