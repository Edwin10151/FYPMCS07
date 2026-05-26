# MCS07 WBS Final Check

## Verdict

The WBS should cover the **whole project**, not only Semester 1 and not only Semester 2.

Reason: the WBS lecture defines WBS as a hierarchical diagram that breaks a project into smaller deliverable components to show **all that must be done to complete it**. Semester 1 proposal work and Semester 2 implementation work are both part of completing the project.

The **Gantt chart** should show timing across Semester 1 and Semester 2. The **WBS** should show work packages and deliverables.

## Current Slide Issue

The WBS currently shown in `FYP final presentation (1).pdf` page 6 is not correct enough because every work package repeats the same child items:

- Stakeholder reqs
- Scope validation
- Role permission

That makes it look like every project component has the same work. It does not show the actual deliverables needed for UI, backend, data ingestion, analytics, testing, or deployment.

## Correct WBS Structure

Use this Level 1 to Level 3 structure:

### Level 1

- MCS07 Project / Student Academic Performance Dashboard

### Level 2 and Level 3

| Level 2 Work Package | Level 3 Deliverables |
|---|---|
| Requirements & Scope | Stakeholder requirements; RTM/final requirements; scope and role permissions |
| UI/UX Prototype | Login and dashboard; mapping and assessment setup; CSV upload, admin, and report screens |
| Backend & Database | Authentication/RBAC; PostgreSQL schema; API/data storage for mappings, grades, reports |
| Data Ingestion | Monash Handbook scraper; manual fallback/editing; CSV validation and reconciliation |
| Analytics & Reporting | LO calculation engine; dashboard charts/filters; local LLM summaries and PDF export |
| Testing & Deployment | Mock/anonymised data tests; role and calculation tests; Docker deployment and handover |

## Why This Is Correct Against The Lecture PDF

The WBS lecture says:

- Scope includes goals, objectives, deliverables, tasks, resources, costs, and deadlines.
- WBS is created after reviewing objectives, collecting requirements, and defining scope.
- WBS should break work into smaller manageable work units.
- WBS can be product-based or phase-based.
- WBS can change over time, but should monitor scope creep.

This WBS is correct because:

- It starts from the whole project.
- It breaks the project into major deliverable work packages.
- It includes Semester 1 proposal/design work and Semester 2 implementation work.
- It avoids becoming a timeline. The Gantt chart handles dates.
- It maps directly to your final requirements, RTM, UI walkthrough, architecture, scope, and testing.

## Semester 1 vs Semester 2 Mapping

Do not label the WBS as only Sem 1 or only Sem 2. Explain it like this:

| Work Package | Mostly Semester 1 | Mostly Semester 2 |
|---|---|---|
| Requirements & Scope | Stakeholder discussion, RTM, scope validation | Scope change control |
| UI/UX Prototype | Wireframes/prototype, walkthrough | React implementation and UI refinement |
| Backend & Database | Architecture/schema planning | FastAPI + PostgreSQL implementation |
| Data Ingestion | Scraper/CSV workflow design | Scraper and CSV validation implementation |
| Analytics & Reporting | Calculation rule/report concept | LO calculation, local LLM, PDF export |
| Testing & Deployment | Test planning, mock data planning | Role tests, calculation tests, Docker deployment, handover |

Speaker line:

> This WBS covers the full project scope across both semesters. Semester 1 focuses on requirements, RTM, scope, UI/UX wireframes, WBS, architecture, and project planning. Semester 2 is where these work packages move into full implementation, testing, Docker deployment, and handover. The WBS shows what must be delivered; the Gantt chart shows when each part happens.

## Slide-Ready Speaker Script

> This WBS breaks our project into six main work packages. First, requirements and scope covers stakeholder requirements, the RTM, final requirements, and role permissions. Second, UI/UX prototype covers the key screens: login, dashboard, mapping, assessment setup, CSV upload, admin roles, and report export. Third, backend and database covers authentication, role-based access, PostgreSQL schema, APIs, and storage for mappings, grades, and reports. Fourth, data ingestion covers the Monash Handbook scraper, manual fallback, and CSV validation. Fifth, analytics and reporting covers the LO calculation engine, dashboard charts, local LLM summaries, and PDF export. Finally, testing and deployment covers mock data tests, role and calculation tests, Docker deployment, documentation, and handover.
>
> This is not only Semester 1 work. It covers the full project scope. Semester 1 is mainly planning, RTM, wireframes, architecture, and proposal validation, while Semester 2 is implementation and delivery.

## File Updated

Updated WBS chart source:

- `MCS07J_simplified/wbs_chart.html`

Rendered check image:

- `.analysis_outputs/ui_screens/MCS07J_simplified_wbs_chart_updated.png`

