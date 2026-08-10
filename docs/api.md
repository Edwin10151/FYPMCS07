# API Contract

Base path: `/api`. Authenticated requests use `Authorization: Bearer <token>`.

## Core Workspace

```text
POST /api/auth/login
POST /api/auth/change-password
GET  /api/me
GET  /api/offerings
GET  /api/dashboard?offering_id={id}
GET  /api/mappings?offering_id={id}
PUT  /api/mappings
GET  /api/assessments?offering_id={id}
```

`/api/dashboard` returns only database-backed offering, assessment, enrolment,
and calculated ULO data. AI generation is intentionally not part of phase one.

## Handbook Import

```text
POST /api/offerings/{offering_id}/handbook-import
GET  /api/offerings/{offering_id}/handbook-import
POST /api/offerings/{offering_id}/handbook-import/confirm
```

The backend uses the saved unit code, year, `Malaysia` location, and S1/S2
scope. It stores a reviewable source snapshot before it updates ULOs or
assessments. Confirmation is blocked after grades exist.

## Administration

All administration routes require the Management role.

```text
GET   /api/admin/context
POST  /api/admin/periods
PATCH /api/admin/periods/{semester_id}
POST  /api/admin/offerings
PATCH /api/admin/offerings/{offering_id}
GET   /api/admin/users
POST  /api/admin/users
POST  /api/admin/users/bulk
PATCH /api/admin/users/{user_id}
```

`/api/admin/context` is the database-backed source for the administration UI:
periods, offerings, assignments, staff, programs, and enrolment import history.
An offering has one coordinator and zero or more lecturers.

New staff accounts receive a generated temporary password. The plaintext value
is returned once to Management; only its PBKDF2 hash is stored. That account
must change its password before using other routes.

## Student Enrolment Import

The management workflow is server-validated in two steps:

```text
POST /api/admin/enrolments/inspect
POST /api/admin/enrolments/preview
POST /api/admin/enrolments/commit
```

All use `multipart/form-data` and a UTF-8 `.csv` `file`. `preview` and
`commit` also include `offering_id`, `student_code_column`, and
`full_name_column`. The commit endpoint repeats validation, upserts canonical
`student` records, creates `enrollment` records, and writes an
`enrollment_upload_batch` audit record.

## Moodle Gradebook Import

The grade workflow is also server-validated in two steps:

```text
POST /api/grade-uploads/inspect
POST /api/grade-uploads/preview
POST /api/grade-uploads/{upload_batch_id}/commit
```

`inspect` takes `offering_id` and a CSV file. `preview` additionally takes:

```text
student_code_column=<CSV heading>
assessment_columns=[
  {"assessment_id": 1, "csv_column": "Assignment 1 (Real)", "max_mark": 10}
]
```

The backend stores the original upload metadata, selected columns, raw rows,
per-assessment cells, and review issues. Commit is blocked on errors. A
successful commit upserts raw grades and normalized weighted scores, then
recalculates student and cohort ULO attainment from the confirmed
assessment-to-ULO weights.

Blank or `-` grade cells are treated as missing grades and shown as warnings;
negative, nonnumeric, out-of-range, duplicate, and unmatched records are
errors.
