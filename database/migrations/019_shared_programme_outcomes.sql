-- One faculty-wide set of programme learning outcomes: PLO 1 .. PLO 11.
--
-- Every SoIT programme maps its unit outcomes to the same eleven PLOs, with no
-- meaningful difference in wording between courses, so the outcomes live once
-- with no owning programme instead of being cloned per programme. A unit mapped
-- to BCS and BCSDS therefore shows eleven rows, not twenty-two, and the
-- coordinator records each ULO link once.
--
-- program_id stays on the table for a future programme-specific outcome; NULL
-- now means "shared by every programme". Programme rows keep their own job of
-- separating students for later reporting, which never depended on owning PLOs.
ALTER TABLE plo ALTER COLUMN program_id DROP NOT NULL;

-- UNIQUE (program_id, plo_code) cannot police the shared rows: Postgres treats
-- every NULL as distinct, so the constraint would allow a second "PLO 1".
CREATE UNIQUE INDEX IF NOT EXISTS uq_shared_plo_code
    ON plo (plo_code) WHERE program_id IS NULL;

-- Descriptions are left blank until the approved wording is supplied. The code
-- alone is what coordinators map against, and a placeholder sentence would read
-- as an approved outcome when it is not one.
INSERT INTO plo (program_id, plo_code, description)
SELECT NULL, 'PLO ' || n, ''
FROM generate_series(1, 11) AS n
ON CONFLICT DO NOTHING;
