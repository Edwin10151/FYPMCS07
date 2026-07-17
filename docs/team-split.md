# Team Task Split

The best split is by contract: frontend consumes API endpoints, backend owns API behaviour, database owns schema and seed data.

## Frontend

Owns:

- React app in `frontend/`
- Login flow and role-aware navigation
- Dashboard, mapping, assessments, CSV upload, admin, report views
- API client functions and loading/error states
- UI integration with seeded/demo data

Works against:

- `POST /api/auth/login`
- `GET /api/dashboard`
- `GET /api/mappings`
- `PUT /api/mappings`
- `GET /api/assessments`
- `POST /api/uploads/validate`
- `POST /api/reports/summary`
- `GET /api/admin/users`

## Backend

Owns:

- FastAPI app in `backend/`
- Auth and role checks
- API endpoint behaviour
- Handbook scraper integration
- CSV validation and reconciliation
- LO calculation service
- Report summary endpoint
- PDF export endpoint later

## Database

Owns:

- PostgreSQL schema in `database/init/`
- Migrations later, preferably Alembic
- Seed data for demo units, staff, students, assessments, mappings, and grades
- Query performance and constraints
- Backup/restore scripts for demo data

## Integration Rule

Do not let frontend and database depend on each other directly.

```text
Frontend -> Backend API -> PostgreSQL
```

The future local LLM should also sit behind the backend:

```text
Frontend -> Backend API -> Local LLM
```

## Direct Push Workflow

The team can push directly to `main`.

```bash
git add .
git commit -m "message"
git push origin main
```

Every push to `main` auto-deploys to DigitalOcean.

