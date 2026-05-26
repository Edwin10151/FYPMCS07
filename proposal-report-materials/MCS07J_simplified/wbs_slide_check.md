# WBS Slide Check

The screenshot style is good for your deck: big title, simple rows, and a speaker pill. The content needs a small correction.

## Main Issue

Several row labels repeat `Requirements and scope`. For WBS, each row should be a different work package/module.

## Corrected WBS Rows

Use this exact content:

| Left label | Right description |
|---|---|
| Requirements & Scope | Stakeholder requirements, role permissions, scope validation |
| UI/UX Prototype | Login, dashboard, mapping, assessment, CSV upload, admin screens |
| Backend & Database | Authentication, unit/semester schema, assessment schema, mapping storage |
| Data Ingestion | Handbook scraper, manual confirmation, CSV validation |
| Analytics & Reporting | Calculation engine, dashboard filters, local LLM summaries, PDF export |
| Testing & Deployment | Mock data testing, Docker deployment, documentation, handover |

## Smaller Wording Improvements

- Use `Requirements & Scope`, not `Requirements And Scope`.
- Use the same capitalization style for every left label.
- Keep the right descriptions short. Avoid full sentences.
- If the row feels too long, remove minor details rather than shrinking font too much.

## Speaker Script

> This WBS breaks our project into six work packages. First, we define the requirements and scope, including stakeholders and role permissions. Second, we design the UI/UX prototype for the main user workflows. Third, we build the backend and database to store units, assessments, mappings, grades, and reports. Fourth, we handle data ingestion through the Handbook scraper and CSV validation. Fifth, we implement analytics and reporting, including the calculation engine, dashboard filters, local LLM summaries, and PDF export. Finally, we complete testing, Docker deployment, documentation, and handover.

