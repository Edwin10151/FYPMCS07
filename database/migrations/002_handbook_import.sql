-- SUPERSEDED: folded into database/init/002_schema.sql. Kept commented out for history.
/*
ALTER TABLE assessment DROP CONSTRAINT IF EXISTS assessment_weight_check;
ALTER TABLE assessment ADD COLUMN IF NOT EXISTS is_hurdle BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE assessment ADD CONSTRAINT assessment_weight_check CHECK (weight >= 0 AND weight <= 100);

CREATE TABLE IF NOT EXISTS handbook_import_snapshot (
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

CREATE INDEX IF NOT EXISTS idx_handbook_import_offering
    ON handbook_import_snapshot(offering_id, imported_at DESC);
*/
