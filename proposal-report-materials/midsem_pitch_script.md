# MCS07 Mid-Semester Pitch — Script

---

## Slide 1 — Cover

Speaker: Sharmanne Yeoh

Good morning everyone. We are Team MCS07, and our project is the Student Academic Performance Dashboard. Our team members are Sharmanne Yeoh, Chuah Yuan Yu, Edwin Ting Heng Wei, and Lim Wen Jung.

This project is supervised by Mr Soo Wooi King and Dr Tan Chee Keong.

The purpose of this pitch is to report our progress at the mid-point of the project, explain the issues and risks we are currently managing, and request approval to continue with the remaining work.

---

## Slide 2 — Overview

Speaker: Sharmanne Yeoh

This slide shows how we have divided the presentation.

I will cover the problem statement, our project goals, and our deliverables. Yuan Yu will explain our methodology, our current progress, and the top three issues we are managing. Edwin will cover our top three risks and our end-user engagement. Wen Jung will present a short demonstration and our next steps.

---

## Slide 3 — Problem Statement

Speaker: Sharmanne Yeoh

The problem we are addressing is that academic data remains fragmented. Unit information is held in the Monash Handbook, grades are held in spreadsheets and Moodle exports, and learning outcome mapping is still performed manually.

This makes learning outcome tracking slow, repetitive, and difficult to verify.

Our solution is a secure dashboard that is hosted locally. It brings grade validation and learning outcome reporting into a single workflow. The system is built with React, FastAPI, and a local LLM running on Ollama, so that student data does not leave the local environment.

Our project goals are defined so that they can be measured. The dashboard must provide at least three visualisation charts. The system must process at least one hundred student records in a single upload. The local LLM must generate three-sentence draft summaries that staff can edit. All core modules must be completed and handed over by Week 10.

These goals also define our deliverables: the dashboard, the validation pipeline, the AI-assisted reporting, and the PDF export function.

I will now hand over to Yuan Yu, who will explain our methodology and current progress.

---

## Slide 4 — Methodology, Progress and Team

Speaker: Chuah Yuan Yu

Thank you, Sharmanne.

This slide covers how we have managed and monitored the project so far.

We are using a lightweight Agile process with Kanban-style tracking in Trello. We did not adopt full Scrum. Fixed sprint ceremonies and a dedicated Scrum Master do not suit four part-time students working to a fixed studio timetable. We therefore replaced sprints with milestone planning and supervisor checkpoints.

We track and document our work in three ways. First, every meeting begins with a live Trello audit, so the board is corrected in front of the team rather than afterwards. Second, we hold short stand-ups on WhatsApp between meetings. Third, we use our GitHub commit history as the record of individual contribution.

On the board, 34 tasks are archived in the Done column, and we are currently working on the Backend Implementation and Database Setup cards. We have completed two of our six core phases, Requirements and UI/UX Prototypes, and four phases remain.

We assess the project as 35 percent complete. This figure is effort-weighted rather than a simple phase count. Two of six phases would give 33 percent, but the four remaining phases are development and testing, and they carry approximately 70 percent of our estimated 120 developer hours. The figure therefore reflects effort rather than phase count.

Against our milestone plan, we are on track for handover in Week 10.

Our roles are assigned as follows. Sharmanne is responsible for the database and UI/UX. I am responsible for the frontend and UI/UX. Edwin is responsible for the architecture and the AI work. Wen Jung is responsible for the backend.

Tasks are allocated according to these roles. Each member draws Trello cards from their own track, so the frontend and the database do not depend on each other directly. They meet at the API contract instead. Where effort needs to be moved between members, this is decided at the weekly board audit. This is how we funded the additional hours required for the local LLM, which leads to our current issues.

---

## Slide 5 — Top 3 Issues

Speaker: Chuah Yuan Yu

This slide covers the top three management and software issues we are currently handling.

The first issue is Handbook scraper stability. Our scraper depends on the Handbook's HTML structure, which may change without notice. Rather than continually adjust the scraper, we built a manual fallback interface so that staff can review and correct imported data. The scraper is therefore a convenience, not a single point of failure.

The second issue is local LLM complexity. Running Ollama locally is the most demanding task remaining, at approximately 20 to 30 developer hours. We funded this by reallocating hours from non-essential features. This issue is significant beyond itself, because it also drives one of our risks. Edwin will explain that shortly.

The third issue is data reconciliation. Moodle CSV exports are inconsistent. Column names differ, student IDs do not always match, and marks may fall outside the valid range. We address this with a four-step validation pipeline that flags every problem before any data is committed. Wen Jung will demonstrate this later.

I will now hand over to Edwin for our risk management.

---

## Slide 6 — Top 3 Risks

Speaker: Edwin Ting Heng Wei

Thank you, Yuan Yu.

This slide covers the three risks we are actively monitoring. For each risk, we record what would trigger it, what the worst case would be, and what action we would take.

The first is R1, privacy. We cannot use real student data under PDPA. The trigger is any request that would involve identifiable records. In the worst case, we would be unable to demonstrate the system on realistic data. We have already acted on this by generating a synthetic dataset, and the system is designed so that individual records never leave the local environment.

The second is R5, integration. This risk is caused directly by the second issue Yuan Yu described. The 20 to 30 hours required for the local LLM pushes integration late into the term. The trigger is a scheduled bi-weekly merge slipping, or a contract test failing. In the worst case, the AI phase would not be integrated by Week 10. We mitigate this with strict bi-weekly merges. If the schedule still slips, we will place the local LLM behind a feature flag and deliver the dashboard and PDF export without AI summaries.

The third is R6, task desynchronisation. This is the same cause viewed from the other side. If the board is not kept current, an effort overrun remains hidden until it is too late to reallocate work. The trigger is the board being unchanged at a weekly audit. This is the reason every meeting begins with a live audit.

Looking further ahead, we anticipate three future issues. The first is local LLM inference speed on our hardware. The second is PDF export, which has not yet started. The third is Docker orchestration once the local LLM service joins the stack.

---

## Slide 7 — Target Users and Engagement

Speaker: Edwin Ting Heng Wei

This slide covers our target users and how we are validating their requirements.

The system has three user groups. Unit Coordinators handle mapping, assessment setup, CSV upload, and dashboard and report review. They are our primary users. Lecturers handle assessment setup, CSV upload, and viewing learning outcome attainment. The Management Team handles user creation, role assignment, access control, and reporting.

For engagement, we have spoken with academic and administrative staff, in addition to our regular supervisor checkpoints. This has already changed the product. The dashboard now presents learning outcome attainment before raw marks, because staff indicated that this is what they review first.

We validate requirements through our Requirements Traceability Matrix. It records 12 functional and 6 non-functional requirements. Each entry identifies the stakeholder who requested it and the acceptance criteria that will demonstrate it has been met.

As one example, the CSV validation requirement is traced to the Lecturer role. Its acceptance criterion is that missing students, unmatched IDs, and invalid marks are all flagged before any data is committed. This is what Wen Jung will demonstrate next.

On privacy, the system is designed so that individual records never leave the local environment and are never sent to an external API.

I will now hand over to Wen Jung for the demonstration.

---

## Slide 8 — Demo

Speaker: Lim Wen Jung

Thank you, Edwin.

I will demonstrate one part of the system that is near completion.

*(Optional — only if the team is comfortable on time)*

First, this is our Handbook import. I select the unit offering, and the system retrieves the unit details, learning outcomes, and assessment items from the Monash Handbook. Any information that cannot be retrieved remains editable. This is the manual fallback that Yuan Yu described.

*(Always run this part)*

Next is the grade upload. I will upload a CSV export.

The system first inspects the file and asks me to map its columns to our system fields. It then previews the data and reports the issues found. Here you can see unmatched student IDs, and marks that fall outside the valid range. All of these are flagged before any data is saved, and nothing is committed until they are resolved.

Once I commit, the marks are passed to the learning outcome calculation, and the dashboard updates to show attainment by outcome across the cohort.

This demonstrates the reconciliation issue and the validation requirement working end to end. The AI summary layer will sit on top of this data, and that is our next piece of work.

*(If the demonstration fails, say this and move on)*

The environment is not responding as expected. What would be shown here is the validation step flagging unmatched IDs before commit. I am happy to demonstrate this during Q&A.

---

## Slide 9 — Next Steps

Speaker: Lim Wen Jung

This slide covers our priorities and what remains.

Our immediate priorities are finalising the PostgreSQL schema and completing the four-step validation pipeline, so that data integrity is settled before the AI phase begins.

Our critical path is the local LLM integration. It is the most demanding work remaining, and as Edwin explained, it carries our highest risk.

Two items are out of scope. We are not integrating directly with Moodle or Callista, and we are not building a student-facing portal. Both exclusions are deliberate. They allow us to deliver a robust staff-facing prototype rather than a broad but shallow one.

Two further items are KIV, that is, kept in view rather than removed. These are advanced grade forecasting and a university-wide production rollout. We have scoped both, but neither fits what four members can deliver by Week 10, so they are deferred to post-project work.

---

## Slide 10 — Close

Speaker: Lim Wen Jung

To summarise, we are 35 percent complete by effort. Backend and database work is currently being delivered, and we are on track for Week 10.

What we are requesting today is approval to proceed with the remaining four phases. We are confident that Week 10 remains achievable, because the most demanding phase is scoped and the local LLM has a defined fallback if integration slips.

Thank you for your attention. We are happy to take any questions.
