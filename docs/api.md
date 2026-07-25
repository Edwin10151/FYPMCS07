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
```

Requires Management role.
