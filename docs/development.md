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

Push to `main` triggers GitHub Actions. The workflow connects to the GMKtec
through Tailscale, pulls `main`, and runs the Docker Compose stack.

## Report Generation

The development stack uses deterministic, editable CQI report drafts by default:

```text
LLM_PROVIDER=mock
```

To use a local Ollama server, set `LLM_PROVIDER=ollama`, `LLM_MODEL` to an
installed model name, `LOCAL_LLM_URL=http://ollama:11434`, and
`COMPOSE_PROFILES=llm`. Start the stack, then install the model once with:

```bash
docker compose exec ollama ollama pull qwen3:4b-instruct-2507-q4_K_M
```

The Ollama service is private to the Compose network, runs one request at a
time, and is limited to 6 GB RAM and six CPU cores so the dashboard and
database remain responsive. The backend calculates the factual attainment and
historical sections deterministically; Ollama proposes only the next-cohort
action. Student-level data is never sent to the model. The Report page supports
draft saving, QAG submission, change requests, approval, and browser-based PDF
export.

## Staff Account Recovery

Staff use admin-created accounts, not Google/Monash SSO. Existing passwords
are hashed and cannot be displayed, including to a super admin. Newly generated
temporary credentials are shown once alongside the staff email; share them
securely and dismiss the display when finished.

Staff who forget their password contact an administrator. In Staff records,
choose **Reset password > Email reset link**. The one-use link expires after
30 minutes. Sending it does not change the password; completing it signs out
previous sessions. Staff then sign in normally. Requesting a replacement link
invalidates earlier links; requests are limited to one per account per minute.
Super admins alone can reset management/super-admin accounts.

Configure `PUBLIC_APP_URL` with the actual trusted HTTPS website address,
for example `https://soit-curriculum-analytics.tail0fb0f0.ts.net`. Local testing
may use `http://localhost:8080`. The backend must also have `SMTP_USERNAME`,
`SMTP_APP_PASSWORD` (Gmail App Password, not the normal login password), and
`EMAIL_FROM` set privately. Never commit credentials. SMTP uses verified TLS.

If email is unavailable, choose **Generate temporary password** explicitly.
This immediately replaces the old password, invalidates sessions and reset
links, and requires a password change at the next sign-in. It is not an
automatic fallback after an email failure. Deactivating/reactivating accounts
also invalidates earlier sessions. No data or semester reset is involved.

## Deferred Scope

CP/CA commentary and SFIA mapping remain deferred until their source data is
confirmed. CP/CA is shown as `None` in the current report template.
