# MCS07 Mid-Semester Pitch Presentation Script

Matches the Canva deck "FYP2 presentation 1" as at this revision (10 pages).

Slide order:

1. Cover
2. Overview
3. Problem statement
4. Methodology, progress and team
5. Top 3 management and software issues
6. Top 3 risks
7. Target users and engagement
8. Demo
9. Next steps
10. Close / Q&A

Target time: **11.5 minutes**, leaving buffer under the 12-minute limit for 4 members.

## Delivery rules

- Reading word-for-word is not enough for a pass in fluency. Learn the shape of your section, not the sentences.
- No phone or tablet for speaking notes — it caps your individual fluency mark. Phone for time-keeping only. Printed cards are fine.
- Every speaker hands over explicitly; the next speaker acknowledges briefly, then continues.
- Team overrun costs **5 percentage points off every member's mark, per minute**. Q&A is not counted — the clock stops.
- Be ready for at least one question each. If you are not asked one, you receive the team average.

## Speaker allocation

| Speaker | Slides | Target |
|---|---|---|
| Sharmanne Yeoh | 1–3 | 2.5 min |
| Chuah Yuan Yu | 4–5 | 3 min |
| Edwin Ting Heng Wei | 6–7 | 3 min |
| Lim Wen Jung | 8–10 | 3 min |

---

## Slide 1 — Cover

**Speaker: Sharmanne Yeoh · ~30 sec**

Good morning everyone. We are Team MCS07, and our project is the Student Academic Performance Dashboard. Our team is Sharmanne Yeoh, Chuah Yuan Yu, Edwin Ting Heng Wei and Lim Wen Jung, supervised by Mr Soo Wooi King and Dr Tan Chee Keong.

We are here to update you on where the project stands at the mid-point, what we are currently dealing with, and to ask for the go-ahead for the remaining work.

## Slide 2 — Overview

**Speaker: Sharmanne Yeoh · ~20 sec**

I will start with the problem we are solving and our goals. Yuan Yu will then cover our methodology, our progress, and the top three issues we are handling right now. Edwin will take the risks we are monitoring and how we are engaging our end users. Wen Jung will run a short demo and close with our next steps.

## Slide 3 — Problem Statement

**Speaker: Sharmanne Yeoh · ~90 sec**

The problem is that academic data is fragmented. Unit information sits in the Monash Handbook, grades sit in spreadsheets and Moodle exports, and learning outcome mapping is done by hand. That makes learning outcome tracking manual, slow, and easy to get wrong.

Our opportunity is a secure, locally hosted dashboard that brings grade validation and learning outcome reporting into one place. We are building it with React, FastAPI, and a local LLM running on Ollama, so student data never leaves the machine.

Our goals are deliberately measurable. The dashboard must show at least three visualisation charts. It must process at least one hundred student records in a single upload. The AI layer must produce three-sentence draft summaries that staff can edit. And all core modules must be complete and handed over by Week 10.

Those are also our deliverables — the dashboard itself, the validation pipeline, the AI-assisted reporting, and PDF export.

*I will now hand over to Yuan Yu, who will explain how we have been managing and tracking the project.*

---

## Slide 4 — Methodology, Progress and Team

**Speaker: Chuah Yuan Yu · ~2 min**

Thank you, Sharmanne.

We run a lightweight Agile process with Kanban-style tracking in Trello. We deliberately did not use full Scrum. Fixed sprint ceremonies and a Scrum Master do not fit four part-time students on a fixed studio timetable, so we replaced sprints with milestone planning and supervisor checkpoints instead.

We track and document in three ways. Every meeting opens with a live Trello audit, so the board gets corrected in front of everyone rather than after the fact. We run short stand-ups on WhatsApp between meetings. And we use our GitHub commit history as the record of who actually did what.

On the board, we have 34 tasks archived in Done, and we are currently working the Backend Implementation and Database Setup cards. We have completed two of our six core phases — Requirements, and UI/UX Prototypes — with four remaining.

We put ourselves at 35 percent complete, and that number is effort-weighted rather than a simple phase count. Two of six phases would be 33 percent, but the four remaining phases are development and testing, and they carry roughly 70 percent of our estimated 120 developer hours. So 35 percent reflects hours, not headline count. **Against our milestone plan, we are on track for handover in Week 10.**

On roles — Sharmanne owns the database and UI/UX, I own the frontend and UI/UX, Edwin owns architecture and the AI work, and Wen Jung owns the backend.

We allocate tasks by that ownership. Each person draws cards from their own track, so the frontend and the database never depend on each other directly — they meet at the API contract. Where we need to move effort between people, we decide it at the weekly audit. That is exactly how we funded the extra hours for the local LLM, which brings me to our issues.

> **Note:** the on-track line and the task-allocation paragraph are the two things the brief requires that are not written on the slide. They must be said.

## Slide 5 — Top 3 Issues

**Speaker: Chuah Yuan Yu · ~60 sec**

These are the three issues we are actively handling right now.

First, Handbook scraper stability. Our scraper depends on the Handbook's HTML, and that can change without warning. Rather than chase it, we built a manual fallback interface so staff can review and correct imported unit and learning outcome data. The scraper is a convenience, not a single point of failure.

Second, local LLM complexity. Running Ollama locally is the most demanding work left, at roughly 20 to 30 developer hours. We funded it by reallocating hours away from non-essential features. This one matters beyond itself, because it also drives one of our risks — Edwin will pick that up.

Third, data reconciliation. Moodle CSV exports are inconsistent: column names differ, student IDs do not always match, and marks can fall out of range. We handle it with a four-step validation pipeline that flags every problem before anything is committed. Wen Jung will show you that working in the demo.

*Over to Edwin for our risks.*

---

## Slide 6 — Top 3 Risks

**Speaker: Edwin Ting Heng Wei · ~100 sec**

Thank you, Yuan Yu.

We are monitoring three risks, and for each one we track what would trigger it, what the worst case looks like, and what we would actually do about it.

R1 is privacy. We cannot use real student data under PDPA. The trigger is any request that would touch identifiable records. Worst case, we cannot demonstrate on realistic data at all. We have already acted on this — we generated a synthetic mock dataset, and by design individual records never leave the local environment.

R5 is integration, and **this one is caused directly by the second issue Yuan Yu just described.** The local LLM's 20 to 30 hours pushes integration late in the term. The trigger is a scheduled bi-weekly merge slipping, or a contract test failing. Worst case, the AI phase is not integrated by Week 10. We mitigate with strict bi-weekly merges — and if it still slips, we ship the LLM behind a feature flag and deliver the dashboard and PDF export without AI summaries.

R6 is task desync, and it is the same cause seen from the other side. If the board goes stale, an effort overrun stays hidden until it is too late to reallocate. The trigger is the board being unchanged at a weekly audit — which is exactly why every meeting opens with a live audit.

Looking further ahead, three things we expect to become problems: LLM inference speed on local hardware, PDF export which has not started yet, and Docker orchestration once the LLM service joins the stack.

> **Note:** the sentence marked in bold is the highest-value line in the pitch. It turns two separate lists into one account of a managed project. Do not skip it.

## Slide 7 — Target Users and Engagement

**Speaker: Edwin Ting Heng Wei · ~80 sec**

Our system has three user groups. Unit Coordinators handle mapping, assessment setup, CSV upload, and dashboard and report review — they are our primary users. Lecturers do assessment setup, CSV upload, and view learning outcome attainment. The Management Team handles user creation, role assignment, access control, and reporting.

On engagement, we have spoken with academic and administrative staff alongside our regular supervisor checkpoints. That has already changed the product: the dashboard's default view now leads with learning outcome attainment rather than raw marks, because that is what staff told us they look at first.

We validate requirements through our Requirements Traceability Matrix. It holds 12 functional and 6 non-functional requirements, and each one records the stakeholder who asked for it and the acceptance criteria that will prove it is met. To take one example — the CSV validation requirement is traced to the Lecturer role, and its acceptance criterion is that missing students, unmatched IDs and invalid marks are all flagged before any data is committed. That is exactly what Wen Jung is about to show you.

On privacy, the system is designed so individual records never leave the local environment or reach an external API.

*Over to Wen Jung for the demo.*

---

## Slide 8 — Demo

**Speaker: Lim Wen Jung · ~90 sec**

Thank you, Edwin. I will show you one part of the system that is close to complete.

**Optional opening, only if you are comfortable on time:**

First, this is our Handbook import. I select the unit offering, and the system pulls unit details, learning outcomes and assessment items straight from the Monash Handbook. Anything it cannot retrieve stays editable — that is the manual fallback Yuan Yu mentioned.

**Main demo — always run this part:**

Now the grade upload. I upload a CSV export. The system first inspects the file and asks me to map its columns to our fields. It then previews the data and reports the problems — here you can see unmatched student IDs and out-of-range marks, all flagged before anything is saved. Nothing is committed until these are resolved.

Once I commit, the marks flow into the learning outcome calculation, and the dashboard updates to show attainment by outcome across the cohort.

That is the reconciliation issue and the validation requirement working end to end. The AI summary layer sits on top of this data, and that is our next piece of work.

> **If the demo fails, say this and move on — do not debug live:**
> *"The environment isn't cooperating today. What you would see here is the validation step flagging unmatched IDs before commit — I'm happy to show it properly during Q&A."*
>
> Drop the Handbook section the moment you are behind. The CSV path is the one that must run.

## Slide 9 — Next Steps

**Speaker: Lim Wen Jung · ~60 sec**

Our immediate priorities are finalising the PostgreSQL schema and completing the four-step validation pipeline, so data integrity is settled before we begin the AI phase.

Our critical path is the Ollama local LLM integration. It is the most intensive work remaining, and as Edwin said, it carries our highest integration risk.

Two things are out of scope. We are not integrating directly with Moodle or Callista, and we are not building a student-facing portal. Both are deliberate, so that we deliver a robust staff-facing prototype rather than a thin broad one.

Two further things are KIV — kept in view rather than cut. Advanced grade forecasting, and a university-wide production rollout. We have scoped both, but neither fits what four of us can deliver by Week 10, so they are parked for post-project work.

## Slide 10 — Close and Q&A

**Speaker: Lim Wen Jung · ~30 sec**

To summarise: we are 35 percent complete by effort, backend and database work is landing now, and we are on track for Week 10.

We are asking for the go-ahead on the remaining four phases. We are confident Week 10 holds, because the expensive phase is scoped and the local LLM has a fallback if integration slips.

Thank you for your attention. We are happy to take questions.

---

## Handover lines to practise

- **Sharmanne → Yuan Yu:** "I will now hand over to Yuan Yu, who will explain how we have been managing and tracking the project."
- **Yuan Yu starts:** "Thank you, Sharmanne. I will cover our methodology, where our progress actually stands, and the three issues we are handling."
- **Yuan Yu → Edwin:** "Over to Edwin for our risks."
- **Edwin starts:** "Thank you, Yuan Yu. I will take our three monitored risks and how we are engaging our end users."
- **Edwin → Wen Jung:** "Over to Wen Jung for the demo."
- **Wen Jung starts:** "Thank you, Edwin. I will show you one part of the system that is close to complete."
- **Wen Jung closing:** "Thank you for your attention. We are happy to take questions."

## Q&A preparation

### How did you calculate 35 percent?

Effort-weighted phase completion. We estimated roughly 120 developer hours across six phases. Two phases are done, but they were the lighter ones — requirements and prototyping. The four remaining phases are development and testing and carry about 70 percent of the hours. A straight phase count would have said 33 percent; weighting by hours puts us at 35. We chose the weighted figure because a phase count would overstate how close we are.

### How do you know you are on track?

We track against milestone completion rather than calendar days alone. Requirements and UI/UX prototyping closed on schedule, and backend and database work is currently in progress against our plan for handover in Week 10. The risk to that date is not the current work — it is the AI integration phase, which is why we track it as R5 and hold a feature-flag fallback.

### Why did you drop Scrum?

Scrum assumes a team that can hold sprint ceremonies and adjust cadence. We are four part-time students on a fixed studio timetable, so sprint boundaries would have been artificial. We kept the parts that work for us — a visible Kanban board, short stand-ups, regular review — and replaced sprints with milestone planning and supervisor checkpoints, which match how this unit is actually assessed.

### What happens if the local LLM does not integrate in time?

We ship it behind a feature flag. The dashboard, learning outcome calculation, validation pipeline and PDF export do not depend on the LLM — it adds draft summaries on top of data the system already produces. If integration slips, we deliver everything except AI summaries, and the summary layer becomes post-project work. That is R5's contingency and it is decided in advance, not on the day.

### Who exactly have you engaged with?

We have had conversations with academic and administrative staff about how they currently produce learning outcome reporting, alongside regular checkpoints with Dr Tan. The most concrete result is that our dashboard's default view now leads with learning outcome attainment instead of raw marks. Our formal validation route is the RTM, where each requirement records its stakeholder and acceptance criteria.

### Why a local LLM instead of an external AI API?

Privacy and control. The system handles student performance data, so we want to avoid sending it to an external service. The local LLM receives structured learning outcome results and returns editable draft summaries. Staff still review the output before anything is exported.

### What happens if Handbook scraping fails?

The scraper is a convenience, not the source of truth. If the Handbook's structure changes or the import is incomplete, staff can manually review, edit and confirm the unit and learning outcome information. That fallback is built and is one of our must-have requirements.

### How does learning outcome calculation work?

Each assessment carries a weight and is tagged to one or more learning outcomes. The system distributes each assessment's weight across its tagged outcomes and aggregates the student's earned marks by outcome. That produces both student-level and cohort-level attainment.

### How will you test without real student data?

With a synthetic dataset we generated ourselves. We test the validation cases directly — missing rows, unmatched IDs, out-of-range marks, column mismatch — plus role-based access, calculation output against known weights, and Docker deployment. Using synthetic data is a deliberate response to R1, not a limitation we ran into.

### Is the demo the finished system?

No. What we showed is the grade upload and validation path, which is close to complete. The AI summary layer and PDF export are still ahead of us, and Docker orchestration with the LLM service is one of the issues we anticipate.

---

## Pre-presentation checklist

- [ ] Supervisor sign-off obtained **before** the presentation — without it the session is invalid and no marks are awarded
- [ ] KIV line added back to the Next Steps slide
- [ ] "Anticipate later" corrected to "Anticipated later" on the risk slide
- [ ] "Thank You" merged into Next Steps as the closing lines, bringing the deck to 8 slides excluding cover
- [ ] Timed rehearsal twice, full run, with the demo
- [ ] Demo environment running and a recorded fallback clip available
- [ ] Printed cards prepared — no phones for notes
