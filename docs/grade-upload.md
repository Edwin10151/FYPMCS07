# Grade Upload Workflow

1. Management imports the student list for one unit offering.
2. The assigned lecturer or coordinator opens Grade upload for that offering
   and selects a UTF-8 CSV or an XLSX workbook's semester worksheet.
3. They choose the student-ID column, then review suggested score-column
   mappings to the confirmed assessments. Percentage columns use a fixed
   maximum of `100`. Raw columns require the actual marking maximum, such as
   `10` for a mark entered out of 10 but contributing 5%. A weight is never
   used to infer a raw maximum.
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

## Split assessments

In Assessment setup, use **Add component** at the bottom right of an assessment
to expand its component editor. Add any number of named components with positive
unit-grade weights. Their total must equal the parent assessment's weight; only
the parent counts toward the unit's overall assessment total. Save the setup
before uploading marks. Components inherit the parent's LO coverage; tasks with
different LO coverage need separate assessments rather than this component editor.

Grade upload groups each saved component under its parent and shows a dropdown
of gradebook score columns. Component names identify the tasks; the dropdown
selects their source columns. Unique name/week and weight matches are suggested,
preferring Percentage over Real. Ambiguous matches remain unselected. Letter,
total, group, external-tool and team-contribution columns are excluded.
Unweighted Moodle tasks are not automatically matched. A stated column weight
must agree with the configured task weight. A task cannot be imported twice
through both its Real and Percentage columns. Unlabelled columns require the
lecturer to choose whether their values are raw marks or percentages (0–100).
Review and completion show selected columns, marking scales and unit weights.
The expandable uploaded-score preview shows up to 200 valid scores with their
maximum and earned unit marks; this is a sample of the uploaded values, not a
list of retained scores or completed parent totals.

For example, two vlogs marked out of 10 and worth 5% each belong to
one 10% assessment. Marks of 7.5 and 8.5 produce
`(7.5 / 10 * 5) + (8.5 / 10 * 5) = 8` earned unit marks, stored as an 80/100
parent result. Different marking scales and unequal component weights are
normalized separately. LO calculations use the component ratios at full
precision before rounding the final attainment percentage.
Selecting their Percentage columns with values `75%` and `85%` produces the
same `8/10` result using `(75 / 100 * 5) + (85 / 100 * 5)`. No additional
multiplication by the parent 10% is applied.

Partial uploads store component scores but do not create a parent total until
all components have scores. The preview flags incomplete assessments and their
LO results as provisional. An unmapped column or blank score retains any saved
component score; numeric zero is an explicit score. Later component uploads
replace only that component and recalculate the parent from all saved scores.
Use a fresh preview to review the current saved scores before committing.

Component structure is locked once an upload preview references the assessment
or grades exist, preventing changes to the meaning of saved evidence. Existing
assessments with grade evidence cannot be retroactively split by this editor.

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
