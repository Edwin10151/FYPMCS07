# Mid-Semester Pitch — Missing Content

Team MCS07 · FIT3162 · Deck: "FYP2 presentation 1" (Canva, 9 pages)

Sources: assessment brief `v10082026`, marking rubric `v17082026`, lecturer's Week 5 Moodle sign-off post.

This document covers **content only**. Formatting items (presenter names on each slide, Allocate+ name consistency) are listed once in §7 and not discussed further.

## 1. Two answers

### Where does "triggers / worst case" come from?

Searched both faculty PDFs for `trigger`, `worst`, `worse`, `contingency` — **no match in either**. The only source is the lecturer's Week 5 Moodle post, item 5:

> *"Risks discussion (mgmt etc) - are they affected by (4) above? triggers? worse case scenario actions?"*

What the faculty documents do say about risk:

| Source | Exact wording |
|---|---|
| Brief — required content | "Top-3 risks being monitored?" |
| Rubric — criterion definition | "…current and anticipated issues, **risk management**, team roles and task allocation…" |
| Rubric — HD descriptor | "…key risks and anticipated future issues… content **connects effectively**… **no material gaps**" |

So triggers and worst-case actions are **not faculty-mandated**. Do them anyway: the rubric's word is "risk *management*", not "risks", and three risks with mitigations is the minimum reading of that. Triggers and contingencies are the clearest available evidence of management rather than listing — and the supervisor signs off against the Moodle post.

### Do issues and risks need separate slides?

Yes. The Moodle post lists them as separate items (4) and (5). Splitting gives 7 core slides, inside the stated 6–8 range. It is also the only way the detail fits legibly — 3 issues plus 3 risks with four fields each will not read on one slide, and clutter is marked under Visual Communication.

## 1b. How to split the content across speakers

The brief, page 2, gives a worked example for a **4-member team**:

> a. Team member 1: "Milestone Progress and Methodology Adaptations"
> b. Team member 2: "Current Project Management & Development Issues"
> c. Team member 3: "Risk Management and Anticipated Issues"
> d. Team member 4: "RTM Summary and Next/Remaining Steps"

Two things to take from it: the faculty pairs **risk management with anticipated issues** on one member, and it puts the **RTM** on a slide. The rubric groups them identically — *"key risks and anticipated future issues"*. So anticipated future issues belong on the risk slide (S6), not Next Steps.

Recommended split — contiguous blocks, lecturer's slide order unchanged:

| Speaker | Slides | Content | Min |
|---|---|---|---|
| A | S1–S3 | Cover, overview, problem/opportunity, SMART goals, deliverables | 2.5 |
| B | S4 | Methodology + adaptation, tracking, milestones, 35% and its calculation, roles + task allocation | 3.0 |
| C | S5–S6 | Top-3 issues → risks with triggers, worst case, linkage → anticipated future issues | 3.5 |
| D | S7–S9 | End users + RTM validation, demo, next steps, priorities, KIV, close | 3.0 |

Total 12.0 — the exact allocation for a 4-member team.

Contiguous blocks matter: the 15-mark structure criterion penalises a deck that *"feels more like separate individual contributions than a coordinated team presentation."* One handover per speaker, four in total. Speaker C carries the heaviest block but also the most connected one — issues flow straight into the risks they cause.

## 2. Missing outright

The brief's wording is *"the following material **must** be covered"* — mandatory, unlike the Moodle post.

| Brief requirement | Status | Note |
|---|---|---|
| "What are the anticipated future issues or problems?" | **Absent** | S9's "Future Roadmap" lists KIV *features*, not anticipated problems. Belongs on S6 — see §1b |
| "What roles have been assigned to your team members?" | **Absent** | S2 shows presentation contributions, not project roles |
| "How are you allocating tasks to team members?" | **Absent** | — |

## 3. Present but too thin to score

| Brief requirement | On the slide | Missing |
|---|---|---|
| Methodology *"adapted to student/unit-specific requirements"* | "Lightweight Agile / Kanban / Trello" | The adaptation — Scrum dropped for milestone planning and supervisor checkpoints — is in presenter notes only |
| "How are you tracking and documenting your processes" | "Trello" | Weekly Trello audits, WhatsApp stand-ups, GitHub commit history — notes only |
| "Progress **in relation to your schedule**" | 35%, 2 of 6 phases | No schedule comparison, no milestone dates, no on-track/behind statement |
| Percentage complete *"(also how it was calculated)"* | Method named | The working — ~120 developer hours, remaining 4 phases carry ~70% — is in notes only |
| "How you are engaging with end-users" | One line, Dr. Tan | Dr. Tan is the supervisor, not an end user. No evidence that anything in the project changed as a result |
| Overview: *"objectives/SMART goals and deliverables"* | Goals present, measurable | Not labelled as SMART goals; deliverables not listed as a distinct set |

**Presenter notes are not marked.** The strongest project-management material in the deck currently sits where the marker never sees it. Moving it onto the slides is the highest-value, lowest-effort change available.

## 4. Draft content for the gaps

### S4 — add roles and task allocation

> **Roles**
> - Frontend — React app, API client, role-aware views · *[name]*
> - Backend — FastAPI, auth, scraper integration, CSV validation, ULO calculation · *[name]*
> - Database — PostgreSQL schema, migrations, seed data · *[name]*
> - *[fourth member's track]*
>
> **How tasks are allocated**
> - Work is split by contract boundary, so frontend and database never depend on each other directly
> - Trello cards are drawn from the owner's track; cross-track work is paired at the API contract
> - Reallocation is decided at the weekly board audit — this is how the local LLM's 20–30 hours were funded

Source for the split: `docs/team-split.md`. Name-to-track assignment is not recorded anywhere in the repo — fill in before sign-off.

### S4 — add progress against schedule

> - 2 of 6 phases complete · 4 remaining · 34 tasks in Done
> - 35% complete, by effort-weighted phase completion: the 4 remaining phases carry ~70% of the estimated ~120 developer hours
> - Against schedule: *[on track / X weeks behind]* against *[milestone dates]*, with handover due Week 10

The last line is currently absent entirely and is explicitly required.

### S4 — promote from notes onto the slide

> - Formal Scrum (sprints, Scrum Master) deliberately replaced with milestone planning and supervisor checkpoints, to fit the academic calendar
> - Tracked through weekly Trello board audits at the start of each meeting, WhatsApp stand-ups, and GitHub commit history for individual accountability

### S6 — the risk slide, rebuilt

| | R1 Privacy | R5 Integration | R6 Task desync |
|---|---|---|---|
| **Risk** | Cannot use real student data (PDPA) | Frontend / backend / LLM fail to connect late in term | Members not updating Trello |
| **Affected by the Top-3 issues?** | No — independent | **Yes** — issue 2, local LLM effort pushes integration late | **Yes** — hides issue 2's effort overrun |
| **Trigger** | Any request touching identifiable records | A scheduled bi-weekly merge slips, or a contract test fails | Board unchanged at a weekly audit |
| **Worst case** | Cannot demonstrate on realistic data | AI phase unintegrated at Week 10 handover | Overrun found too late to reallocate hours |
| **Mitigation** (have) | Synthetic mock dataset; NFR1 keeps records local | Strict bi-weekly merges | Live Trello audit opening each meeting |
| **Contingency** (add) | *[to fill]* | Ship LLM behind a feature flag; deliver dashboard + PDF export without AI summaries | *[to fill]* |

Existing mitigations stay — they are preventive. The contingency row is the new part.

### S7 — end-user engagement

> - Users: Unit Coordinator (mapping, assessment setup, CSV upload, dashboard review), Lecturer (assessment setup, CSV upload, LO attainment), Management Team (user CRUD, roles, access control, reporting)
> - Engaged: *[which staff, what was asked]*
> - **What changed as a result:** *[the decision that moved]*
> - Validated through the RTM — 12 functional and 6 non-functional requirements, each with a named stakeholder, priority and acceptance criteria
> - Privacy: NFR1, records never leave the local environment or reach external APIs

The third line is the one that scores. *"We consulted stakeholders"* is not evidence; a decision traceable to a conversation is. Show one RTM row traced end to end rather than the whole table.

### S6 — add anticipated future issues

Place these on the risk slide, not Next Steps: both the brief's example split and the rubric group anticipated issues with risk management. Distinct from current issues (S5): what the team expects to *become* a problem.

> - LLM inference speed on local hardware once report volumes grow
> - PDF export fidelity — FR12, not yet started
> - End-to-end Docker orchestration once the LLM service joins the compose stack (NFR4)
> - Test-data realism as the dataset passes 100 records

S9 then stays purely next steps: immediate priorities, critical path, out of scope, KIV, and the close. That content already uses the lecturer's own framing.

## 5. Demo

Keep it; it is in the suggested layout. Scope per the post: *"just show one or more functions that are near complete"*.

Show grade upload → validation issues surfaced → commit → LO attainment on dashboard. It covers FR7/FR8/FR9, is test-covered in `backend/tests/`, and is the concrete evidence behind the "Data Reconciliation" issue on S5.

Do not demo Ollama — no summary endpoint exists in `backend/app/main.py`, and the deck correctly lists it as critical path still ahead.

## 6. What lifts this above a Pass

The rubric states: *"Meeting all requirements well, or simply having no obvious weaknesses, is not by itself sufficient for an HD."* Covering every bullet caps at Distinction. The HD descriptor asks for content that **connects**. Three connections available in this project:

1. **Risk R5 ← Issue 2.** The LLM's 20–30 hour cost is what makes late integration likely. Say it out loud — it turns two separate lists into one causal account.
2. **35% ← the calculation.** Anyone can claim a percentage. Showing the effort-weighting, and that the remaining phases are the expensive ones, demonstrates the schedule is actually understood.
3. **A requirement ← a user.** One RTM row where a real conversation changed a real decision does more for the 30-mark criterion than any amount of coverage.

## 7. Sign-off requirements

The gate is pass/fail: no sign-off before the presentation means the session is invalid and no marks are awarded.

Four documents must exist for Week 5 sign-off, per the brief: **Risk Register, S.M.A.R.T. Goals, Requirements Traceability Matrix, updated Kanban board**. The RTM exists at `proposal-report-materials/requirements_traceability_matrix.md`. A standalone Risk Register is not in the repo, though R1/R5/R6 implies at least six entries.

Also required by the brief, not discussed above: presenter's name on every slide they speak to (currently blank on six), consistent Allocate+ name form, and a plain-text 3–5 bullet summary per content slide for the draft deck.

## 8. Still needed

1. Name-to-track assignment for all four members
2. Engagement specifics — which staff, and what changed because of it
3. Milestone dates the 35% is measured against
4. Contingency actions for R1 and R6
5. Whether a standalone Risk Register exists
