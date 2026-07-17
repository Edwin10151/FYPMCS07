# Development Setup

This repo now has a development/testing full-stack skeleton for the MCS07 dashboard.

## Stack

- `frontend/` - React + Vite dashboard
- `backend/` - FastAPI API
- `database/init/001_schema.sql` - PostgreSQL schema copied from the ERD
- `compose.yaml` - local and Droplet Docker Compose stack

## Run Locally

```bash
cp .env.example .env
docker compose up --build
```

Open:

```text
http://localhost:8080/
```

Backend checks:

```text
http://localhost:8000/api/health
http://localhost:8000/api/db-health
```

## Demo Accounts

All seeded demo accounts use:

```text
Password123!
```

Accounts:

```text
elise.chen@monash.edu     coordinator
aaron.lim@monash.edu      lecturer
maya.rao@monash.edu       management
```

## Deployment

Push to `main` triggers GitHub Actions. The Droplet deploy script pulls `main` and runs the Docker Compose stack.

## Local LLM Later

The frontend calls:

```text
POST /api/reports/summary
```

Right now the backend returns a mock summary. Later, keep the same endpoint and change the backend implementation to call a local LLM runtime through `LOCAL_LLM_URL`.

