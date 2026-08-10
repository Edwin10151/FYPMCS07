ALTER TABLE app_user ADD COLUMN IF NOT EXISTS staff_id VARCHAR(7);
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE app_user ADD CONSTRAINT app_user_staff_id_format
    CHECK (staff_id IS NULL OR staff_id ~ '^[0-9]{7}$');
CREATE UNIQUE INDEX IF NOT EXISTS uq_app_user_staff_id
    ON app_user(staff_id) WHERE staff_id IS NOT NULL;

UPDATE app_user
SET staff_id = CASE email
    WHEN 'elise.chen@monash.edu' THEN '0001001'
    WHEN 'aaron.lim@monash.edu' THEN '0001002'
    WHEN 'maya.rao@monash.edu' THEN '0001003'
    ELSE staff_id
END
WHERE staff_id IS NULL;

UPDATE program
SET program_code = 'DEV-BIT',
    program_name = 'Bachelor of Information Technology (development mock data)'
WHERE program_code = 'C2001';

UPDATE plo p
SET plo_code = CASE p.plo_code
        WHEN 'PLO1' THEN 'PLO 1'
        WHEN 'PLO2' THEN 'PLO 2'
        WHEN 'PLO3' THEN 'PLO 3'
        WHEN 'PLO4' THEN 'PLO 4'
        ELSE p.plo_code
    END,
    description = CASE p.plo_code
        WHEN 'PLO1' THEN 'Apply mathematical and computational foundations to model and solve problems in information technology.'
        WHEN 'PLO2' THEN 'Design and implement reliable software solutions using appropriate algorithms and data structures.'
        WHEN 'PLO3' THEN 'Analyse system behaviour using rigorous methods including formal proof and empirical evaluation.'
        WHEN 'PLO4' THEN 'Communicate technical content effectively across written, visual, and oral channels to diverse audiences.'
        ELSE p.description
    END
FROM program pr
WHERE p.program_id = pr.program_id AND pr.program_code = 'DEV-BIT';

INSERT INTO plo (program_id, plo_code, description)
SELECT pr.program_id, item.plo_code, item.description
FROM program pr
CROSS JOIN (VALUES
    ('PLO 5', 'Evaluate and select abstract data types and architectures appropriate to a given problem context.'),
    ('PLO 6', 'Decompose ill-defined problems into tractable sub-problems and devise principled solutions.'),
    ('PLO 7', 'Investigate current research literature to inform engineering decisions and identify open questions.'),
    ('PLO 8', 'Demonstrate professional and ethical practice in the development and deployment of IT artefacts.')
) AS item(plo_code, description)
WHERE pr.program_code = 'DEV-BIT'
ON CONFLICT (program_id, plo_code) DO UPDATE SET description = EXCLUDED.description;
