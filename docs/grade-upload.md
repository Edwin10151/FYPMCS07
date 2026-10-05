# Grade Upload Workflow

1. Management imports the student list for one unit offering.
2. The assigned lecturer or coordinator opens Grade upload for that offering
   and selects a UTF-8 CSV or an XLSX workbook's semester worksheet.
3. They choose the student-ID column, then map only meaningful raw-score
   columns to the confirmed assessments. Each mapping records the maximum raw
   mark, such as `10` for a mark entered out of 10 but contributing 5%.
4. The backend previews the import against the stored enrolment list. Errors
   block commit; warnings remain visible for review.
5. Commit stores raw cells and normalized weighted scores, then recalculates
   every student and cohort ULO attainment result for the offering.

Assessment unit-grade weights and LO contributions are separate:

- `assessment.weight` is the assessment's share of the unit grade.
- `assessment_ulo.allocated_weight` is that assessment's contribution to one LO.
  Contributions default to an equal split across assessments covering that LO:
  two assessments get 50% each; a single assessment gets 100%. A coordinator
  can edit them, but each LO's total must remain 100%. Contributions across
  different LOs for the same assessment do not have to total 100%.

For each linked assessment, with raw score `x`, raw maximum `m`, unit weight
`w`, and LO contribution `c`:

```text
earned LO marks = (x / m) * w * (c / 100)
available LO marks = w * (c / 100)
LO attainment (%) = sum(earned LO marks) / sum(available LO marks) * 100
```

Example: 80/100 in an assessment worth 10% of the unit becomes 8/10 unit
marks. A 50% LO contribution adds 4 earned marks out of 5 available to that
LO. Exporting the same performance as 4/5 gives exactly the same result.
Intermediate LO calculations retain precision; the final percentage is rounded
to two decimal places. A missing grade contributes zero earned marks but stays
in the denominator. The current achievement threshold is at least 50%.

The import remains reopenable for corrections: a later committed upload
upserts the grade for the same student and assessment and recalculates the
offering. Handbook assessment setup remains locked once any grades exist.
Manual weight and coverage corrections recalculate saved results. Assessments
referenced by grade uploads cannot be deleted. Changed evidence flags editable
reports for review and returns submitted reports for correction; approved
reports retain their original saved evidence.

## Semester Safety

Replacing a Tutor List replaces imported staff assignments for the selected
semester, including units absent from the replacement file. Accounts, manual
assignments, grades, reports and other semesters are retained. Legacy assignments
without recorded provenance are preserved for admin review. Commit must refer
to the latest exact roster snapshot reviewed by the admin.

Super-admin semester reset deletes that semester's offerings and dependent
data, not staff accounts or student identities. It requires a typed semester
confirmation and is blocked for archives or semesters with approved reports.
Archived semesters remain selectable for read-only history.
