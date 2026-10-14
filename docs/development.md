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
draft saving, submission for course coordinator review, change requests,
approval, and browser-based PDF export.

The action-plan field is readable text, not nested JSON. Older drafts containing
the recognised action/ULO/assessment/effect-check object are formatted on read;
this does not rewrite the stored report or change its approval or evidence.
Coordinators must review proposed actions before submission. A correlation
between two scores is not by itself evidence that an intervention caused an
improvement.

## Clean Demo Rehearsal

Use one agreed demo semester, not a full database wipe. Keep staff accounts,
student identities, shared programme/unit records and all other semesters.

Before clearing existing semester data, the server operator must take and
verify a restorable database backup and agree the exact year/period with the
team. Never remove the PostgreSQL volume just to restart a demo.

Two separate super-admin actions are available in **Semester setup**:

- **Reset full semester** removes the offerings and imported tutor assignments
  as well as their student lists, setup, grades and reports. Staff accounts and
  other semesters remain. Archived semesters and approved reports block this
  action; that protection is unchanged.
- **Reset demo data** retains unit offerings, all tutor/coordinator assignments,
  tutor-list snapshots, staff accounts/passwords, shared references and other
  semesters. It clears the selected semester's student-list membership,
  enrolments, Handbook imports, ULOs/mappings, assessments/components, grade
  uploads/scores, calculated attainment and reports. Global student identities
  and notification-delivery history remain.

Demo reset is disabled by default. Only on a disposable demo instance, set
`ENABLE_DEMO_RESET=true` in the server's private environment and recreate the
backend. Disable it again after rehearsals. Do not enable it on an instance
holding official records. Opening the button only previews counts; it does
not delete data. The super admin must acknowledge an independently verified
backup, explicitly confirm any listed approved **demo** reports, and type
`RESET DEMO <year> <period>`. The app does not create or verify the backup.
Archived semesters cannot be reset even in demo mode. Changed totals or report
metadata invalidate the review; close and reopen it before confirming again.
The deletion is transactional and logs its semester, actor, counts and approved
report IDs. No database sequence or shared staff/student/reference row is reset.

The GMK GitHub deployment reads the repository variable `ENABLE_DEMO_RESET`.
Only the exact value `true` enables it; unset or any other value disables it.
This explicit deployment setting overrides the server's Compose default and
survives later pushes. Turn it off and redeploy before storing official records.

Rehearse in this order:

1. Sign in as super admin and select the agreed demo semester.
2. Upload and review the tutor list, assign coordinators, then commit it.
3. Upload and commit the semester student list.
4. Open a unit created in that semester, such as FIT2004.
5. Import its year-specific Handbook draft and review ULOs and assessments.
6. Confirm ULO-to-PLO mapping and the assessment/ULO contributions.
7. Upload a gradebook for that same unit; check columns, component weights,
   score denominators and student IDs before committing.
8. Review the dashboard figures, generate the report draft, edit the CQI text
   and save it, then submit for approval.
9. Approve as course coordinator/super admin, then print or save as PDF.

The supplied Hashed MCS07 workbook is an FYP gradebook, not a FIT2004 gradebook.
Use the corresponding FYP unit, or prepare a clearly synthetic FIT2004 fixture
with matching students and assessments. Do not relabel unrelated marks as
FIT2004 results. Agree the demo files before resetting anything. Super admin
can demonstrate the whole flow; normal staff should still be tested with their
own assigned-unit permissions. For repeat rehearsals that retain the tutor
setup, use the explicitly enabled demo reset with a fresh backup and review;
the normal full reset still blocks approved reports. An existing approved
report cannot be silently regenerated or downgraded to bypass that protection.

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
