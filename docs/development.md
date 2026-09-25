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

## Report Generation

The development stack uses deterministic report drafts by default:

```text
LLM_PROVIDER=mock
```

To use a local Ollama server, set `LLM_PROVIDER=ollama`, `LLM_MODEL` to an
installed model name, and `LOCAL_LLM_URL` to its internal URL. The backend
validates a fixed three-section CQI response and does not send student-level
data to the model.

## Deferred Scope

PDF export, CP/CA commentary, SFIA mapping, and the report approval interface
remain deferred until their source data and workflow are confirmed.
