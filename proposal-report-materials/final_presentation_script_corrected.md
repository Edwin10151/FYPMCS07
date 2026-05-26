# MCS07 Final Proposal Presentation Script

Assumed final slide order:

1. Title
2. Problem statement
3. Project goals and requirements part 1
4. Project goals and requirements part 2
5. Stakeholders and target users
6. WBS
7. UI/UX wireframe part 1
8. UI/UX wireframe part 2
9. System architecture
10. Gantt chart
11. Scope
12. Foreseeable challenges
13. Teamwork reflection
14. Project management reflection
15. Thank you / Q&A

Target time: 11 to 11.5 minutes, leaving buffer under the 12-minute limit for 4 members.

Important delivery rules:

- Put the presenter name on every slide.
- Do not read word-for-word from a phone, tablet, or laptop.
- Use printed notes/cards only if needed.
- Each speaker must explicitly hand over to the next speaker.
- The next speaker should acknowledge the handover briefly, then continue.
- Q&A time is not counted, but each member should be ready to answer questions on their own section.

## Speaker Allocation And Timing

| Speaker | Slides | Target Time |
|---|---:|---:|
| Sharmanne Yeoh | 1-4 | 2.5 to 3 min |
| Chuah Yuan Yu | 5-6, 12 | 2.5 min |
| Edwin Ting Heng Wei | 7-9 | 3 min |
| Lim Wen Jung | 10-11, 13-15 | 3 min |

## Slide 1 - Title

Speaker: Sharmanne Yeoh

Script:

Good morning everyone. We are Team MCS07, and our project is the Student Academic Performance Dashboard. Our team members are Sharmanne Yeoh, Chuah Yuan Yu, Edwin Ting Heng Wei, and Lim Wen Jung.

This project is supervised by Mr Soo Wooi King and Dr Tan Chee Keong. The purpose of our project is to help academic staff monitor learning outcome attainment, manage assessment data, and generate useful performance reports more efficiently.

Today, we will cover the problem, our project goals and requirements, the target users, our WBS, proposed UI/UX, system architecture, timeline, scope, risks, and our reflection on teamwork and project management.

## Slide 2 - Problem Statement

Speaker: Sharmanne Yeoh

Script:

The problem we are addressing is that academic reporting is still highly manual and fragmented. Staff may have access to raw grades, unit information, assessment structures, and learning outcomes, but these data sources are usually not connected in one clear workflow.

This creates several issues. First, LO and PLO tracking is not easy to see at a glance. Second, staff often need to move between spreadsheets, unit documents, and reporting tools. Third, raw grades do not automatically become actionable insights for coordinators or management.

Our opportunity is to build a central dashboard that supports LO tracking, visual analytics, and AI-assisted report writing. Instead of only storing marks, the system should help staff understand what the marks mean in terms of learning outcome attainment.

## Slide 3 - Project Goals And Requirements Part 1

Speaker: Sharmanne Yeoh

Script:

This slide connects the first part of our project goals to the major requirements needed to achieve them.

Our first goal is to deliver a secure academic dashboard for Unit Coordinators, Lecturers, and the Management Team. To support this, the system requires multi-role login, role-based access, and Management Team user CRUD and role assignment.

Our second goal is to track student and cohort performance by Unit Learning Outcomes. To support this, we need interactive dashboards and filters, so staff can view LO-level insights rather than only raw marks.

Our third goal is to map ULOs to PLOs for accreditation and curriculum review. To support this, the system needs a Monash Handbook scraper for unit details and ULO information, CSV grade upload and validation, and ULO-to-PLO mapping with historical or suggested pre-fill.

These requirements matter because they turn the high-level project goals into features that academic staff can actually use.

## Slide 4 - Project Goals And Requirements Part 2

Speaker: Sharmanne Yeoh

Script:

This slide continues the goal-to-requirement mapping.

Another goal is to calculate LO attainment from assessment weights. To support this, the system needs assessment setup with weighting and ULO tagging, as well as an LO attainment calculation engine using weighted assessment distribution.

The next goal is to generate editable AI-assisted summaries using a local LLM. This is covered by the local LLM summarisation requirement. The AI output should support staff, but it should remain editable and reviewed by humans.

The final goal is to export final reports as PDF. To support this, the system needs editable report generation and PDF export.

Overall, our significant requirements are role-based access, Handbook data ingestion, ULO-to-PLO mapping, assessment setup, CSV upload and validation, LO calculation, dashboard visualisation, local LLM summaries, and PDF export.

I will now hand over to Yuan Yu, who will explain our stakeholders, users, and WBS.

## Slide 5 - Stakeholders And Target Users

Speaker: Chuah Yuan Yu

Script:

Thank you, Sharmanne.

Our key stakeholders are Mr Soo Wooi King and Dr Tan Chee Keong, who represent the academic reporting and supervision needs of this project.

The main end users are Unit Coordinators, Lecturers, and the Management Team. Unit Coordinators are responsible for mapping, assessment setup, CSV upload, dashboard review, and report review. Lecturers mainly support assessment setup, CSV upload, and LO attainment viewing. The Management Team handles user CRUD, role assignment, access control, dashboard filtering, and report viewing.

There are two main use cases we want to highlight. First, a Unit Coordinator can map ULOs to PLOs, review assessment coverage, view LO attainment, and export a report. Second, a Lecturer can upload CSV grade data, review validation issues, and check which learning outcomes are affected. A third use case is that the Management Team can assign roles and view filtered reports.

Students are not direct users in this phase. The system focuses on academic staff workflows.

## Slide 6 - Work Breakdown Structure

Speaker: Chuah Yuan Yu

Script:

This WBS breaks the full project into six main work packages. It is not only for Semester 1 and it is not only for Semester 2. The WBS shows what must be delivered across the whole project, while the Gantt chart later shows when each part happens.

The first work package is Requirements and Scope. This includes stakeholder requirements, the RTM and final requirements, scope validation, and role permissions.

The second is UI/UX Prototype. This covers the login screen, dashboard, mapping and assessment setup, CSV upload, admin users and roles, and report export screens.

The third is Backend and Database. This includes authentication and RBAC, the PostgreSQL schema, API design, and storage for mappings, grades, and reports.

The fourth is Data Ingestion. This covers the Monash Handbook scraper, manual fallback editing, CSV upload, and CSV validation.

The fifth is Analytics and Reporting. This includes the LO calculation engine, dashboard charts and filters, local LLM summaries, and PDF export.

The last work package is Testing and Deployment. This includes mock or anonymised data testing, role and calculation tests, Docker deployment, documentation, and handover.

Later in Slide 12, I will come back to the main challenges and risks. I will now hand over to Edwin for the UI/UX and system design.

## Slide 7 - UI/UX Wireframe Part 1

Speaker: Edwin Ting Heng Wei

Script:

Thank you, Yuan Yu.

For the UI/UX walkthrough, the current screens are proposal-stage wireframes. They are not a completed production system yet. Their purpose is to show the expected user flow and how the project requirements map to the interface.

The first part of the walkthrough focuses on access and dashboard review. The login screen shows that users enter through a controlled access point, and the system changes available functions based on role.

The dashboard then gives staff a summary of LO attainment. It includes key indicators such as students, LO attainment, LOs at risk, report status, LO summary cards, and cohort distribution. This directly supports our requirement for interactive dashboard views and LO-level tracking.

The dashboard also includes report actions, such as generating a local LLM summary and exporting a PDF report. This links the UI to our reporting requirement.

## Slide 8 - UI/UX Wireframe Part 2

Speaker: Edwin Ting Heng Wei

Script:

The second part of the walkthrough covers setup and data entry.

The mapping screen supports ULO-to-PLO mapping. It includes a mapping matrix, review panel, and Handbook fallback. This is important because the system can suggest or prefill mappings, but staff still need to confirm or adjust them manually.

The assessment setup screen lets staff define assessments, weights, and which LOs are covered by each assessment. This matters because the calculation engine depends on correct assessment-to-LO tagging.

The CSV upload screen supports the grade data workflow. Users can upload a CSV, map columns, review validation issues, and commit only valid rows. This helps prevent incorrect data from entering the LO calculation.

The admin users and roles screen supports the Management Team requirement. It shows that management users can manage accounts, roles, and permissions.

## Slide 9 - System Architecture

Speaker: Edwin Ting Heng Wei

Script:

This slide shows the proposed system architecture. The frontend will be built as a React web dashboard. The screens we showed earlier represent the main frontend workflows: login, dashboard, mapping, assessment setup, CSV upload, reports, and user management.

The frontend communicates with a FastAPI backend. The backend handles authentication, role permissions, Handbook scraping, CSV validation, mapping setup, assessment setup, LO calculation, local LLM summary generation, and PDF export.

PostgreSQL stores the structured academic data. This includes users, roles, units, semesters, LOs, PLOs, mappings, assessments, grades, and generated reports.

The local LLM receives structured LO attainment results and produces draft summaries. These summaries remain editable by staff before final export. This approach supports privacy better than sending student performance data to an external AI API.

Finally, the stack will be containerised using Docker so the React frontend, FastAPI backend, PostgreSQL database, scraper or worker process, and local LLM/reporting service can run consistently.

I will now hand over to Wen Jung for our timeline and scope.

## Slide 10 - Gantt Chart

Speaker: Lim Wen Jung

Script:

Thank you, Edwin.

This Gantt chart shows when the WBS work packages will be completed. Semester 1 focuses on proposal work: requirements, scope validation, RTM, UI/UX wireframes, WBS, architecture, and timeline planning.

After the proposal stage, Semester 2 moves into implementation. The first implementation phase is backend and database setup, including the PostgreSQL schema, FastAPI endpoints, and authentication.

The next phase is frontend and data pipeline work, including the React dashboard, Handbook scraper, and CSV upload workflow.

After that, the technical focus moves to the LO calculation engine, local LLM integration, and PDF report export.

The final phase is testing, bug fixing, Docker deployment, user manual preparation, final demo, and handover.

## Slide 11 - Scope

Speaker: Lim Wen Jung

Script:

This slide defines what is in scope and out of scope.

In scope, we will deliver multi-role access, user management, Handbook scraping, assessment setup, CSV upload, ULO/PLO mapping, the calculation engine, dashboard views, local LLM summaries, and PDF export.

These items directly support the problem and goals we introduced earlier. They focus on helping academic staff turn assessment data into LO attainment evidence and reports.

Out of scope, we are excluding a student-facing portal, mobile app, grade forecasting, real-time syncing, billing or enrolment management, and AI model training or fine-tuning.

These exclusions are deliberate. They help keep the project feasible within the FYP timeline and avoid expanding beyond the academic reporting workflow.

I will now pass back to Yuan Yu to discuss the foreseeable challenges.

## Slide 12 - Foreseeable Challenges

Speaker: Chuah Yuan Yu

Script:

Thank you, Wen Jung.

We identified five main challenges. The first is privacy and data access. Real student performance data is sensitive, so development and testing should use mock or anonymised data where needed.

The second challenge is Handbook scraper reliability. The Monash Handbook website structure may change, so our system needs manual review and edit fallback if scraping is incomplete.

The third challenge is that different units can have different assessment structures, weights, and LO mappings. To manage this, we need a flexible PostgreSQL schema and configurable mapping workflow.

The fourth challenge is local LLM consistency. The generated summaries may vary, so they should be treated as draft text only. Staff must be able to review and edit them before exporting reports.

The fifth challenge is role permissions. Because the system handles grade and reporting data, access control must be tested carefully to prevent inappropriate access.

I will now hand back to Wen Jung for our teamwork and project management reflection.

## Slide 13 - Teamwork Reflection

Speaker: Lim Wen Jung

Script:

In this phase, our teamwork worked well in several areas. We distributed roles, held regular discussions, used shared documents, and responded to supervisor feedback.

One concrete example is that after the final slide requirements were clarified, we reorganised the content around the required proposal sections, including problem, goals, requirements, stakeholders, WBS, UI/UX, architecture, timeline, scope, challenges, teamwork, and project management.

At the same time, we also identified areas to improve. Some meetings happened too late, and some slide and script updates were done close to the deadline. This created unnecessary pressure.

For the next phase, we will schedule earlier meetings, confirm ownership earlier, and use short progress check-ins before deadlines. This should reduce last-minute coordination issues.

## Slide 14 - Project Management Reflection

Speaker: Lim Wen Jung

Script:

For project management, we used Trello, Google Drive, meeting minutes, and supervisor feedback. These tools helped us keep documents visible and track decisions.

For implementation, GitHub will be important for collaboration, version control, issue tracking, and reviewing changes. We will also use the WBS and Gantt chart to track progress against the project scope.

What worked well was task visibility, document sharing, and decision tracking. What we need to improve is consistency. Trello should be updated more regularly, meeting minutes should be more action-focused, and risks should be tracked earlier.

For testing, our plan is to use mock or anonymised CSV data, test role-based access, test CSV validation, test LO calculation outputs, test local LLM summary generation, and test PDF export and Docker deployment.

## Slide 15 - Thank You / Q&A

Speaker: Lim Wen Jung

Script:

To summarise, our project is a secure academic performance dashboard for staff. It addresses the problem of fragmented LO/PLO reporting by combining role-based access, Handbook data, CSV grade upload, LO calculation, dashboard visualisation, local LLM summaries, and PDF report export.

Our Semester 1 work focuses on scope, requirements, RTM, wireframes, WBS, architecture, and proposal planning. Semester 2 will focus on implementation, testing, deployment, and handover.

Thank you for your attention. We are happy to take any questions.

## Q&A Preparation

## Handover Lines To Practise

Use these exact lines to satisfy the team flow rubric:

- Sharmanne to Yuan Yu: "I will now hand over to Yuan Yu, who will explain our stakeholders, target users, and WBS."
- Yuan Yu starts: "Thank you, Sharmanne. I will now explain who the system is for and how we break down the project work."
- Yuan Yu to Edwin: "I will now hand over to Edwin for the UI/UX walkthrough and system architecture."
- Edwin starts: "Thank you, Yuan Yu. I will walk through how the proposed interface and architecture support our requirements."
- Edwin to Wen Jung: "I will now hand over to Wen Jung for the timeline and scope."
- Wen Jung starts: "Thank you, Edwin. I will explain our timeline, scope, and how we plan the remaining work."
- Wen Jung to Yuan Yu: "I will now pass back to Yuan Yu to discuss the foreseeable challenges."
- Yuan Yu starts again: "Thank you, Wen Jung. I will cover the key risks we expect and how we plan to manage them."
- Yuan Yu to Wen Jung: "I will now hand back to Wen Jung for our teamwork and project management reflection."
- Wen Jung closing: "Thank you for your attention. We are happy to take any questions."

### Why use a local LLM instead of an external AI API?

Use this answer:

We chose a local LLM mainly for privacy and control. The system handles student performance data, so reducing external data transfer is important. The local LLM receives structured LO attainment results and generates editable draft summaries. Staff still review the output before report export.

### Is the prototype a finished system?

Use this answer:

No. The current screens are proposal-stage wireframes/static prototypes. They show the intended workflow and requirements mapping. The final implementation will use React, FastAPI, PostgreSQL, Docker, and a local LLM.

### How does LO calculation work?

Use this answer:

Each assessment has a weight and is tagged to one or more LOs. The system distributes the assessment weight across the tagged LOs and aggregates the student's earned marks by LO. This gives student and cohort LO attainment results.

### What happens if Handbook scraping fails?

Use this answer:

The scraper is a support tool, not the only source of truth. If the Handbook structure changes or scraping is incomplete, staff can manually review, edit, and confirm the unit and LO information.

### How will you test without real student data?

Use this answer:

We can use mock or anonymised CSV data. We will test CSV validation, missing rows, unmatched IDs, out-of-range marks, role permissions, calculation outputs, local LLM summaries, PDF export, and Docker deployment.
