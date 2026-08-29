# MCS07 Mid-Semester Pitch — Script

---

## Slide 1 — Cover
**Sharmanne**

Good morning everyone. We're Team MCS07.

Our project is the Student Academic Performance Dashboard. Our team is Sharmanne Yeoh, Chuah Yuan Yu, Edwin Ting Heng Wei and Lim Wen Jung. We're supervised by Mr Soo Wooi King and Dr Tan Chee Keong.

We're here today to show you where the project stands at the halfway point, what we're dealing with right now, and to ask for the go-ahead for the rest of the work.

---

## Slide 2 — Overview
**Sharmanne**

Here's how we'll run through it.

I'll start with the problem and our goals. Yuan Yu will cover our methodology, our progress, and the three issues we're handling. Edwin will take our risks, and how we're working with our end users. And Wen Jung will show you a short demo, then close with what's next.

---

## Slide 3 — Problem Statement
**Sharmanne**

So, the problem.

Academic data is scattered. Unit information sits in the Monash Handbook. Grades sit in spreadsheets and Moodle exports. And learning outcome mapping is still done by hand. That makes tracking learning outcomes slow, manual, and easy to get wrong.

Our answer is a secure dashboard that runs locally. It brings grade validation and learning outcome reporting into one place. We're building it with React, FastAPI, and a local LLM running on Ollama. Everything stays on the machine, so student data never leaves.

We've set our goals so we can measure them. The dashboard has to show at least three charts. It has to handle at least a hundred student records in one upload. The AI has to produce three-sentence draft summaries that staff can edit. And all core modules have to be done and handed over by Week 10.

Those are our deliverables too — the dashboard, the validation pipeline, the AI reporting, and PDF export.

I'll now hand over to Yuan Yu, who'll explain how we've been running the project.

---

## Slide 4 — Methodology, Progress and Team
**Yuan Yu**

Thank you, Sharmanne.

We run a lightweight Agile process, and we track everything on a Kanban board in Trello.

We chose not to use full Scrum. Sprint ceremonies and a Scrum Master don't really fit four part-time students on a fixed studio timetable. So we replaced sprints with milestone planning and supervisor checkpoints instead.

We track our work in three ways. Every meeting opens with a live Trello audit, so the board gets corrected in front of everyone, not afterwards. We run short stand-ups on WhatsApp between meetings. And we use our GitHub commit history as the record of who actually did what.

On the board right now, we have 34 tasks in Done. We're currently working on Backend Implementation and Database Setup. We've finished two of our six core phases — Requirements, and UI/UX Prototypes. Four are left.

We put ourselves at 35 percent complete. And that number is effort-weighted, not just a phase count. Two out of six phases would be 33 percent. But the four phases left are development and testing, and they carry about 70 percent of our estimated 120 developer hours. So 35 percent reflects hours, not just the count.

Against our milestone plan, we're on track for handover in Week 10.

On roles — Sharmanne owns the database and UI/UX. I own the frontend and UI/UX. Edwin owns architecture and the AI work. And Wen Jung owns the backend.

We allocate tasks by that ownership. Each of us pulls cards from our own track. So the frontend and the database never depend on each other directly — they meet at the API contract. And when we need to move effort around, we decide it at the weekly audit. That's exactly how we funded the extra hours for the local LLM.

Which brings me to our issues.

---

## Slide 5 — Top 3 Issues
**Yuan Yu**

These are the three issues we're actively handling.

First, Handbook scraper stability. Our scraper depends on the Handbook's HTML, and that can change without warning. Rather than chase every change, we built a manual fallback screen. Staff can review and correct the imported data themselves. So the scraper is a convenience, not a single point of failure.

Second, local LLM complexity. Running Ollama locally is the heaviest work we have left — around 20 to 30 developer hours. We funded it by moving hours away from non-essential features. This one matters beyond itself, because it also drives one of our risks. Edwin will pick that up.

Third, data reconciliation. Moodle CSV exports are inconsistent. Column names differ, student IDs don't always match, and marks can be out of range. We handle it with a four-step validation pipeline that flags every problem before anything is saved. Wen Jung will show you that working in the demo.

Over to Edwin for our risks.

---

## Slide 6 — Top 3 Risks
**Edwin**

Thank you, Yuan Yu.

We're monitoring three risks. For each one, we track what would set it off, what the worst case looks like, and what we'd actually do.

R1 is privacy. We can't use real student data under PDPA. The trigger is any request that would touch identifiable records. Worst case, we can't demonstrate on realistic data at all. We've already acted on this — we generated a synthetic dataset, and by design, individual records never leave the local environment.

R5 is integration. And this one is caused directly by the second issue Yuan Yu just showed you. The local LLM's 20 to 30 hours pushes integration late into the term. The trigger is a bi-weekly merge slipping, or a contract test failing. Worst case, the AI phase isn't integrated by Week 10. We mitigate that with strict bi-weekly merges. And if it still slips, we ship the LLM behind a feature flag, and deliver the dashboard and PDF export without the AI summaries.

R6 is task desync. It's the same cause, seen from the other side. If the board goes stale, an effort overrun stays hidden until it's too late to move people around. The trigger is the board being unchanged at a weekly audit. That's exactly why every meeting opens with a live audit.

Looking further ahead, there are three things we expect to become problems. LLM speed on local hardware. PDF export, which we haven't started. And Docker orchestration, once the LLM service joins the stack.

---

## Slide 7 — Target Users and Engagement
**Edwin**

We have three groups of users.

Unit Coordinators handle mapping, assessment setup, CSV upload, and reviewing dashboards and reports. They're our primary users. Lecturers do assessment setup, CSV upload, and view learning outcome attainment. And the Management Team handles user creation, role assignment, access control, and reporting.

On engagement — we've spoken with academic and administrative staff, alongside our regular checkpoints with our supervisor. And that's already changed the product. Our dashboard now leads with learning outcome attainment instead of raw marks, because that's what staff told us they look at first.

We validate our requirements through our Requirements Traceability Matrix. It holds 12 functional and 6 non-functional requirements. Each one records the stakeholder who asked for it, and the acceptance criteria that will prove it's met.

Here's one example. Our CSV validation requirement is traced to the Lecturer role. Its acceptance criterion is that missing students, unmatched IDs and invalid marks all get flagged before any data is committed. And that's exactly what Wen Jung is about to show you.

On privacy — the system is designed so individual records never leave the local environment, and never reach an external API.

Over to Wen Jung for the demo.

---

## Slide 8 — Demo
**Wen Jung**

Thank you, Edwin. I'll show you one part of the system that's close to complete.

*(Optional — only if you're comfortable on time)*

First, this is our Handbook import. I select the unit offering, and the system pulls the unit details, learning outcomes and assessment items straight from the Monash Handbook. Anything it can't retrieve stays editable. That's the manual fallback Yuan Yu mentioned.

*(Always run this part)*

Now the grade upload. I'll upload a CSV export.

The system inspects the file first, and asks me to map its columns to our fields. Then it previews the data and reports the problems. You can see unmatched student IDs here, and marks that are out of range — all flagged before anything is saved. Nothing gets committed until these are resolved.

Once I commit, the marks flow into the learning outcome calculation. And the dashboard updates to show attainment by outcome across the cohort.

So that's the reconciliation issue and the validation requirement, working end to end. The AI summary layer sits on top of this data, and that's our next piece of work.

*(If the demo fails, say this and move on)*

The environment isn't cooperating today. What you'd see here is the validation step flagging unmatched IDs before commit — I'm happy to show it properly during Q&A.

---

## Slide 9 — Next Steps
**Wen Jung**

Our immediate priorities are finishing the PostgreSQL schema, and completing the four-step validation pipeline. We want data integrity settled before we start the AI phase.

Our critical path is the Ollama integration. It's the heaviest work we have left, and as Edwin said, it carries our highest risk.

Two things are out of scope. We're not integrating directly with Moodle or Callista, and we're not building a student-facing portal. Both are deliberate. We'd rather deliver a solid staff-facing prototype than a thin, broad one.

And two things are KIV — kept in view, not cut. Advanced grade forecasting, and a university-wide rollout. We've scoped both. But neither fits what four of us can deliver by Week 10. So they're parked for after the project.

---

## Slide 10 — Close
**Wen Jung**

So, to summarise.

We're 35 percent complete by effort. Backend and database work is landing now. And we're on track for Week 10.

What we're asking for today is the go-ahead for the remaining four phases. We're confident Week 10 holds — the expensive phase is scoped, and the local LLM has a fallback if integration slips.

Thank you for listening. We're happy to take your questions.
