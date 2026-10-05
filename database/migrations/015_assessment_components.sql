CREATE TABLE assessment_component (
    component_id SERIAL PRIMARY KEY,
    assessment_id INT NOT NULL REFERENCES assessment(assessment_id) ON DELETE CASCADE,
    component_name VARCHAR(255) NOT NULL,
    weight DECIMAL(6,2) NOT NULL CHECK (weight > 0 AND weight <= 100),
    component_order INT NOT NULL DEFAULT 1,
    UNIQUE (assessment_id, component_name)
);

ALTER TABLE grade_upload_column_mapping
    ADD COLUMN component_id INT REFERENCES assessment_component(component_id);
ALTER TABLE grade_upload_cell
    ADD COLUMN component_id INT REFERENCES assessment_component(component_id),
    DROP CONSTRAINT grade_upload_cell_upload_row_id_assessment_id_key;
CREATE UNIQUE INDEX grade_upload_cell_parent_unique
    ON grade_upload_cell(upload_row_id, assessment_id) WHERE component_id IS NULL;
CREATE UNIQUE INDEX grade_upload_cell_component_unique
    ON grade_upload_cell(upload_row_id, component_id) WHERE component_id IS NOT NULL;

CREATE TABLE student_component_grade (
    enrollment_id INT NOT NULL REFERENCES enrollment(enrollment_id) ON DELETE CASCADE,
    component_id INT NOT NULL REFERENCES assessment_component(component_id),
    upload_batch_id INT REFERENCES grade_upload_batch(upload_batch_id),
    source_row_id INT REFERENCES grade_upload_row(upload_row_id),
    raw_mark DECIMAL(6,2) NOT NULL CHECK (raw_mark >= 0),
    max_mark DECIMAL(6,2) NOT NULL CHECK (max_mark > 0 AND raw_mark <= max_mark),
    PRIMARY KEY (enrollment_id, component_id)
);
