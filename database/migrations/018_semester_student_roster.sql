-- One student list per semester (every student enrolled in the school this semester).
-- Replaces the per-unit semester_enrolment table from 017; grades still use enrollment rows,
-- which are created for every offering in the semester from this list.
CREATE TABLE IF NOT EXISTS semester_student (
    semester_id INT NOT NULL REFERENCES semester(semester_id) ON DELETE CASCADE,
    student_id  INT NOT NULL REFERENCES student(student_id),
    PRIMARY KEY (semester_id, student_id)
);

CREATE TABLE IF NOT EXISTS student_list_upload (
    semester_id       INT PRIMARY KEY REFERENCES semester(semester_id) ON DELETE CASCADE,
    uploaded_by       INT          NOT NULL REFERENCES app_user(user_id),
    original_filename VARCHAR(255) NOT NULL,
    row_count         INT          NOT NULL CHECK (row_count >= 0),
    accepted_count    INT          NOT NULL CHECK (accepted_count >= 0),
    uploaded_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO semester_student (semester_id, student_id)
SELECT DISTINCT o.semester_id, e.student_id
FROM enrollment e JOIN unit_offering o ON o.offering_id = e.offering_id
ON CONFLICT DO NOTHING;

DROP TABLE IF EXISTS semester_enrolment;
