-- Allow university staff identifiers of varying lengths and formats.
ALTER TABLE app_user DROP CONSTRAINT IF EXISTS app_user_staff_id_format;
ALTER TABLE app_user DROP CONSTRAINT IF EXISTS app_user_staff_id_check;
ALTER TABLE app_user ALTER COLUMN staff_id TYPE VARCHAR(50);
ALTER TABLE app_user ADD CONSTRAINT app_user_staff_id_format
    CHECK (staff_id IS NULL OR length(btrim(staff_id)) BETWEEN 1 AND 50);
