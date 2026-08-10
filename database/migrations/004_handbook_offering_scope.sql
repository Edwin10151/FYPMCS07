-- This development system imports Malaysia offerings only. Storing the scope
-- prevents a Handbook page containing multiple semesters from being blended.
ALTER TABLE unit_offering
    ADD COLUMN IF NOT EXISTS handbook_location VARCHAR(50) NOT NULL DEFAULT 'Malaysia';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'unit_offering_handbook_location_check'
    ) THEN
        ALTER TABLE unit_offering
            ADD CONSTRAINT unit_offering_handbook_location_check
            CHECK (handbook_location = 'Malaysia');
    END IF;
END $$;
