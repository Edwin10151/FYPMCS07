# Grade Upload Workflow

1. Management imports the student list for one unit offering.
2. The assigned lecturer or coordinator exports the Moodle gradebook as UTF-8
   CSV and opens Grade upload for that offering.
3. They choose the student-ID column, then map only meaningful raw-score
   columns to the confirmed assessments. Each mapping records the maximum raw
   mark, such as `10` for a mark entered out of 10 but contributing 5%.
4. The backend previews the import against the stored enrolment list. Errors
   block commit; warnings remain visible for review.
5. Commit stores raw cells and normalized weighted scores, then recalculates
   every student and cohort ULO attainment result for the offering.

For a raw score `x`, raw maximum `m`, and assessment contribution `w`, the
stored weighted score is `(x / m) * w`. ULO attainment uses the confirmed
`assessment_ulo.allocated_weight` values, so a 45% assessment mapped equally
to three ULOs contributes 15 percentage points to each.

The import remains reopenable for corrections: a later committed upload
upserts the grade for the same student and assessment and recalculates the
offering. Handbook assessment setup remains locked once any grades exist.
