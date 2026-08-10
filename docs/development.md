# Development Setup

This repository runs the MCS07 dashboard as a local development/testing stack.

## Stack

- `frontend/` - React + Vite dashboard
- `backend/` - FastAPI API
- `database/init/001_schema.sql` - PostgreSQL base schema
- `database/migrations/` - incremental schema changes at backend startup
- `compose.yaml` - local and Droplet Docker Compose stack

## Run Locally

```bash
docker compose up -d --build
```

Open `http://localhost:8080/`. Health checks are available at
`http://localhost:8000/api/health` and `http://localhost:8000/api/db-health`.

For frontend live reload, start `db` and `backend` with Docker, then run Vite
from `frontend/`. Vite proxies `/api` to the backend.

## Demo Accounts

All seeded development accounts use `Password123!`:

```text
elise.chen@monash.edu     coordinator
aaron.lim@monash.edu      lecturer
maya.rao@monash.edu       management
```

## Verification

```bash
cd frontend && npm run build
docker compose up -d --build
docker compose run --rm -T -e PYTHONPATH=/app -v "$PWD/backend/tests:/app/tests:ro" backend pytest -q /app/tests
```

## Deployment

Push to `main` triggers GitHub Actions. The Droplet deploy script pulls `main`
and runs the Docker Compose stack.

## Deferred Scope

Local-LLM summaries and PDF export are intentionally not exposed in phase one.
They can be added after the Handbook, mapping, administration, enrolment, grade
validation, and calculated-attainment workflows have been reviewed with the
supervisor.
