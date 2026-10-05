-- Rebuild attainment using normalized unit marks, independent of Moodle's scale.
-- Preserve approved report snapshots; require other reports to be reviewed again.
ALTER TABLE ai_report ADD COLUMN IF NOT EXISTS evidence_stale BOOLEAN NOT NULL DEFAULT FALSE;

-- Results calculated before the contribution fix need one refresh using app logic.
CREATE TABLE IF NOT EXISTS attainment_refresh_pending (
    offering_id INT PRIMARY KEY REFERENCES unit_offering(offering_id) ON DELETE CASCADE
);
INSERT INTO attainment_refresh_pending (offering_id)
SELECT DISTINCT offering_id FROM student_grade
ON CONFLICT DO NOTHING;
