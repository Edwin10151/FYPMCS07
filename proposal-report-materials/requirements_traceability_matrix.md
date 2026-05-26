# MCS07 Requirements Traceability Matrix

Project: Student Academic Performance Dashboard  
Team: MCS07  
Confirmed stack: React frontend, FastAPI backend, PostgreSQL database, Docker deployment, local LLM reporting

## RTM Purpose

This RTM records the final project requirements agreed for the proposal stage. It links each requirement to its source, stakeholder, priority, acceptance criteria, slide coverage, and prototype evidence.

## Functional Requirements

| ID | Description | Source | Category | Priority | Status | Stakeholder / User | Acceptance Criteria | Related Slide | Prototype Evidence |
|---|---|---|---|---|---|---|---|---|---|
| FR1 | The system shall provide secure login and role-based access for Unit Coordinator, Lecturer, and Management Team users. | Supervisor/project scope | Functional | Must have | Proposed | All users | Users can sign in and see features based on assigned role. | Slides 4-5, 7, 9, 11 | `MCS07J_simplified/console/00 - Login.html` |
| FR2 | Management Team users shall be able to create, edit, delete, and assign roles to users. | Project scope/stakeholder needs | Functional | Must have | Proposed | Management Team | Management Team can manage users and role permissions. | Slides 3, 4, 8, 11 | `MCS07J_simplified/console/05 - Admin.html` |
| FR3 | The system shall scrape Monash Handbook unit details, ULOs, assessment items, assessment weights, and assessment-to-ULO links where available. | Project scope | Functional | Must have | Proposed | Unit Coordinator, Lecturer | Unit, ULO, and assessment setup data can be imported from the Handbook source where available. | Slides 4, 5, 8, 9, 11, 12 | `MCS07J_simplified/console/02 - Mapping.html`; `MCS07J_simplified/console/03 - Assessments.html` |
| FR4 | The system shall provide manual review/edit fallback when Handbook scraping is incomplete or unavailable. | Risk analysis/scope control | Functional | Must have | Proposed | Unit Coordinator | Staff can manually confirm or edit imported unit/LO information. | Slides 8, 12 | `MCS07J_simplified/console/02 - Mapping.html` |
| FR5 | The system shall support ULO-to-PLO mapping review with existing, suggested, or historical pre-fill. | Supervisor/project scope | Functional | Must have | Proposed | Unit Coordinator | Coordinator can review, confirm, remove, and save ULO/PLO mappings. The Handbook provides ULO information, but final PLO alignment remains staff-confirmed. | Slides 4, 5, 7, 8 | `MCS07J_simplified/console/02 - Mapping.html` |
| FR6 | The system shall allow lecturers or coordinators to confirm or configure assessments, assessment weightings, and covered LOs. | Project scope | Functional | Must have | Proposed | Lecturer, Unit Coordinator | Imported or manually entered assessments can be assigned a weight and tagged to one or more LOs. | Slides 4, 5, 8, 11 | `MCS07J_simplified/console/03 - Assessments.html` |
| FR7 | The system shall upload CSV grade data and map CSV columns to expected system fields. | Project scope | Functional | Must have | Proposed | Lecturer, Unit Coordinator | CSV data can be uploaded and mapped before commit. | Slides 4, 5, 8, 9, 11 | `MCS07J_simplified/console/04 - CSV Upload.html` |
| FR8 | The system shall validate uploaded grades and show reconciliation issues before committing data. | Risk analysis/project scope | Functional | Must have | Proposed | Lecturer, Unit Coordinator | Missing students, unmatched IDs, and invalid marks are flagged before data is saved. | Slides 8, 12 | `MCS07J_simplified/console/04 - CSV Upload.html` |
| FR9 | The system shall calculate LO attainment using assessment weights distributed across tagged LOs. | Project scope | Functional | Must have | Proposed | Unit Coordinator, Lecturer | System calculates student/cohort LO attainment using the agreed weighting rule. | Slides 4, 5, 8, 9, 11 | `MCS07J_simplified/console/03 - Assessments.html` |
| FR10 | The system shall display dashboard views for LO attainment, cohort performance, risks, and report status. | Project goals | Functional | Must have | Proposed | Unit Coordinator, Lecturer, Management Team | Dashboard shows LO summary, cohort indicators, filters, and report status. | Slides 4, 5, 7, 9, 11 | `MCS07J_simplified/console/01 - Dashboard.html` |
| FR11 | The system shall generate editable AI-assisted summaries using a local LLM. | Project scope/AI decision | Functional | Must have | Proposed | Unit Coordinator, Management Team | System sends structured LO results to a local LLM and returns editable summary text. | Slides 4, 5, 7, 9, 11, 12 | `MCS07J_simplified/console/01 - Dashboard.html` |
| FR12 | The system shall export reviewed reports as PDF. | Project scope | Functional | Must have | Proposed | Unit Coordinator, Management Team | Users can export final reviewed reports as PDF. | Slides 4, 5, 7, 9, 11 | `MCS07J_simplified/console/01 - Dashboard.html` |

## Non-Functional Requirements

| ID | Description | Source | Category | Priority | Status | Stakeholder / User | Acceptance Criteria | Related Slide | Prototype / Design Evidence |
|---|---|---|---|---|---|---|---|---|---|
| NFR1 | The system shall protect student performance data by using mock/anonymised data during development and avoiding unnecessary external data transfer. | Privacy/risk analysis | Non-functional | Must have | Proposed | All stakeholders | Development/testing uses mock or anonymised data; AI reporting uses local LLM. | Slides 11, 12 | Architecture + challenges |
| NFR2 | The system shall enforce role permissions to prevent inappropriate access to grade, report, and user-management data. | Project scope/risk analysis | Non-functional | Must have | Proposed | All users | Each role only accesses allowed functions and data views. | Slides 3, 4, 7, 9, 12 | Login/admin wireframes |
| NFR3 | The system shall use PostgreSQL to store structured academic, user, mapping, grade, and report data. | Technical architecture | Non-functional | Must have | Proposed | Development team | Database schema supports users, roles, units, semesters, LOs, PLOs, mappings, assessments, grades, and reports. | Slide 9 | Architecture diagram |
| NFR4 | The system shall be containerised using Docker for consistent development and deployment. | Technical architecture | Non-functional | Should have | Proposed | Development team | Frontend, backend, database, scraper/worker, and local LLM/report services can be run consistently. | Slides 9, 10, 11 | Architecture/timeline |
| NFR5 | The UI shall be clear enough for academic staff to complete mapping, upload, dashboard review, and report export workflows without unnecessary navigation complexity. | UI/UX reference/user needs | Non-functional | Should have | Proposed | Unit Coordinator, Lecturer, Management Team | Key workflows are visible in the prototype and can be explained in the walkthrough. | Slides 7-8 | UI wireframes |
| NFR6 | The system shall support validation and human review before important data or AI outputs are finalised. | Risk analysis | Non-functional | Should have | Proposed | Unit Coordinator, Lecturer | CSV issues are reviewed before commit; AI summaries remain editable before PDF export. | Slides 7, 8, 12 | Dashboard/CSV wireframes |

## Five Significant Requirements For Presentation

Use these five in the slide explanation if time is limited:

| Requirement | Why it matters to end users |
|---|---|
| Role-based access and user management | Keeps coordinator, lecturer, and management workflows separated and controlled. |
| Handbook scraping with manual fallback | Reduces setup effort by importing ULO and assessment setup data where available, while still allowing staff to correct imported data. |
| ULO/PLO mapping review and assessment setup | Supports accreditation and curriculum review workflows without assuming the Handbook is the source of final PLO alignment. |
| CSV upload, validation, and LO calculation | Converts raw marks into reliable LO attainment evidence. |
| Dashboard, local LLM summaries, and PDF export | Helps staff interpret results and produce usable reports efficiently. |

## Testing Approach To Mention In Presentation

- Use mock or anonymised student grade CSV files.
- Test role-based access for Unit Coordinator, Lecturer, and Management Team.
- Test CSV validation cases: missing rows, unmatched IDs, invalid marks, and column mismatch.
- Test LO attainment calculation using known assessment weights and expected output.
- Test local LLM summary generation using structured LO attainment results.
- Test PDF export after staff review/editing.
- Test Docker deployment to ensure the full stack can run consistently.
