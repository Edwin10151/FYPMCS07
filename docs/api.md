# API Contract

Base path:

```text
/api
```

## Health

```text
GET /api/health
GET /api/db-health
```

## Auth

```text
POST /api/auth/login
POST /api/auth/change-password
GET /api/me
```

Login body:

```json
{
  "email": "elise.chen@monash.edu",
  "password": "Password123!"
}
```

Authenticated requests use:

```text
Authorization: Bearer <token>
```

New staff accounts receive a generated temporary password. Its hash is stored;
the plaintext password is returned once to Management at account creation. That
account can only call `POST /api/auth/change-password` until the temporary
password has been replaced with a password of at least 12 characters.

## Dashboard

```text
GET /api/dashboard?offering_id=1
```

Returns offering details, LO attainment summaries, assessments, and latest report summary.

## Mapping

```text
GET /api/mappings?offering_id=1
PUT /api/mappings
```

Save body:

```json
{
  "offering_id": 1,
  "mappings": [
    { "offering_ulo_id": 1, "plo_id": 1 }
  ]
}
```

## Assessments

```text
GET /api/assessments?offering_id=1
```

`is_hurdle: true` marks a zero-weight competency requirement. It is displayed
separately and is not part of weighted attainment calculations.

## Handbook Import

```text
POST /api/offerings/{offering_id}/handbook-import
GET /api/offerings/{offering_id}/handbook-import
POST /api/offerings/{offering_id}/handbook-import/confirm
```

Only Management and the assigned Unit Coordinator may import or confirm. The
backend uses the offering's saved unit code, year, Malaysia location, and
selected S1/S2 period. Assessment rows from another semester are excluded
before a draft is stored; the frontend never sends an arbitrary URL.

The first endpoint stores a reviewable draft. Confirm it with:

```json
{
  "handbook_import_id": 1
}
```

Confirmation updates Handbook-sourced ULOs and assessments while preserving
manual ULOs and ULO-to-PLO decisions. It is blocked once grades exist, so a
later correction must be recorded and recalculated rather than silently
changing historical results.

## CSV Upload

```text
POST /api/uploads/validate?offering_id=1
```

`multipart/form-data` with a `file` field.

The current validator accepts flexible CSVs and checks for:

- missing student identifier
- non-numeric marks
- negative marks
- marks above 100

## Reports

```text
POST /api/reports/summary?offering_id=1
```

Current provider is `mock`. Future provider should call a local LLM server through backend configuration.

## Admin

```text
GET /api/admin/users
POST /api/admin/users
POST /api/admin/users/bulk
PATCH /api/admin/users/{user_id}
```

Requires Management role.

Create body:

```json
{
  "staff_id": "1234567",
  "full_name": "Dr Example Staff",
  "email": "example.staff@monash.edu",
  "role_name": "coordinator"
}
```

Valid roles are `management`, `coordinator`, and `lecturer`. The bulk endpoint
accepts the same objects in a `users` array and creates the whole list in one
database transaction.
