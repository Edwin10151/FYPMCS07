-- Preserve legacy assignments because their origin was not recorded.
ALTER TABLE offering_lecturer ADD COLUMN IF NOT EXISTS source VARCHAR(30) NOT NULL DEFAULT 'manual';
ALTER TABLE unit_offering ADD COLUMN IF NOT EXISTS coordinator_source VARCHAR(30) NOT NULL DEFAULT 'manual';
