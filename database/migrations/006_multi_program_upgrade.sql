-- Upgrade existing databases to the multi-programme offering schema.
CREATE TABLE IF NOT EXISTS offering_program (
    offering_id INT NOT NULL REFERENCES unit_offering(offering_id) ON DELETE CASCADE,
    program_id  INT NOT NULL REFERENCES program(program_id),
    PRIMARY KEY (offering_id, program_id)
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'unit_offering'
          AND column_name = 'program_id'
    ) THEN
        EXECUTE '
            INSERT INTO offering_program (offering_id, program_id)
            SELECT offering_id, program_id
            FROM unit_offering
            WHERE program_id IS NOT NULL
            ON CONFLICT DO NOTHING
        ';
        EXECUTE 'ALTER TABLE unit_offering ALTER COLUMN program_id DROP NOT NULL';
    END IF;
END $$;

ALTER TABLE student ALTER COLUMN program_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS offering_staffing (
    staffing_id    SERIAL PRIMARY KEY,
    offering_id    INT          NOT NULL REFERENCES unit_offering(offering_id) ON DELETE CASCADE,
    role_type      VARCHAR(20)  NOT NULL CHECK (role_type IN ('lecture', 'tutorial', 'laboratory')),
    staff_user_id  INT          REFERENCES app_user(user_id),
    external_name  VARCHAR(150),
    external_email VARCHAR(200),
    source         VARCHAR(30)  NOT NULL DEFAULT 'roster_import',
    imported_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CHECK (staff_user_id IS NOT NULL OR external_name IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_offering_program_program
    ON offering_program(program_id);
CREATE INDEX IF NOT EXISTS idx_offering_staffing_offering
    ON offering_staffing(offering_id);
