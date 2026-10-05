-- Programme labels in the supplied SoIT Tutor List. These are roster labels,
-- not official course codes or approved PLO definitions. DEV-BIT stays separate.
INSERT INTO program (program_code, program_name)
SELECT code, code || ' (Tutor List programme)'
FROM (VALUES ('BCS'), ('BCSDS'), ('BSE'), ('BCS (HONS)'), ('MAI'), ('MBIS'), ('MDS')) AS roster(code)
ON CONFLICT (program_code) DO NOTHING;
