-- The student list is uploaded once per semester. Each row keeps the unit it belongs to,
-- so units added later can pick up their students without another upload.
CREATE TABLE IF NOT EXISTS semester_enrolment (
    semester_id INT         NOT NULL REFERENCES semester(semester_id) ON DELETE CASCADE,
    student_id  INT         NOT NULL REFERENCES student(student_id),
    unit_code   VARCHAR(20) NOT NULL,
    PRIMARY KEY (semester_id, student_id, unit_code)
);

-- Backfill from the per-unit enrolments that already exist.
INSERT INTO semester_enrolment (semester_id, student_id, unit_code)
SELECT o.semester_id, e.student_id, u.unit_code
FROM enrollment e
JOIN unit_offering o ON o.offering_id = e.offering_id
JOIN unit u ON u.unit_id = o.unit_id
ON CONFLICT DO NOTHING;
