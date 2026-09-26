-- Coordinator is no longer mandatory when a unit offering is first created —
-- units added from an unmatched Tutor List roster entry may not have a
-- coordinator decided yet. The Units Offering admin page surfaces a warning
-- for any offering left unassigned.
ALTER TABLE unit_offering ALTER COLUMN coordinator_id DROP NOT NULL;

-- Stores the raw parsed Tutor List roster per semester so the Tutor List
-- page can recompute matched/unmatched units live against the current
-- database state (e.g. after a unit is added or deleted) instead of relying
-- on a one-time upload response that's lost on refresh. Mirrors the existing
-- handbook_import_snapshot pattern.
CREATE TABLE IF NOT EXISTS staffing_import_snapshot (
    staffing_import_id SERIAL PRIMARY KEY,
    semester_id         INT          NOT NULL REFERENCES semester(semester_id) ON DELETE CASCADE,
    source_filename      VARCHAR(255) NOT NULL,
    payload              JSONB        NOT NULL,
    imported_by          INT          REFERENCES app_user(user_id),
    imported_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staffing_import_semester
    ON staffing_import_snapshot(semester_id, imported_at DESC);
