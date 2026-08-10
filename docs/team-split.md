# Team Task Split

The best split is by contract: frontend consumes API endpoints, backend owns API behaviour, database owns schema and seed data.

## Frontend

Owns:

- React app in `frontend/`
- Login flow and role-aware navigation
- Dashboard, mapping, assessments, grade import, and administration views
- API client functions and loading/error states
- UI integration with database-backed development data

Works against:

- `POST /api/auth/login`
- `GET /api/dashboard`
- `GET /api/mappings`
- `PUT /api/mappings`
- `GET /api/assessments`
- `POST /api/offerings/{offering_id}/handbook-import`
- `GET /api/offerings/{offering_id}/handbook-import`
- `POST /api/offerings/{offering_id}/handbook-import/confirm`
- `/api/grade-uploads/*`
- `/api/admin/context`, `/api/admin/periods`, and `/api/admin/offerings`
- `/api/admin/enrolments/*`
- `/api/admin/users`

## Backend

Owns:

- FastAPI app in `backend/`
- Auth and role checks
- API endpoint behaviour
- Handbook scraper integration
- CSV inspection, validation, reconciliation, and commit rules
- ULO calculation service
- PDF export endpoint later

## Database

Owns:

- PostgreSQL schema in `database/init/`
- Incremental migrations in `database/migrations/`, applied when the backend starts
- Seed data for demo units, staff, students, assessments, mappings, and grades
- Query performance and constraints
- Backup/restore scripts for demo data

## Integration Rule

Do not let frontend and database depend on each other directly.

```text
Frontend -> Backend API -> PostgreSQL
```

The later local LLM should also sit behind the backend:

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
