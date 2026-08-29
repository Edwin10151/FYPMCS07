# Mid-Semester Pitch — Slide Content To Add / Adjust

Handover doc. Team MCS07 · FIT3162 · Canva deck "FYP2 presentation 1".

Rationale and full requirement analysis: `midsem_pitch_content_check.md`. This file is just **what to put on the slides**.

Source shorthand: **BRIEF** = assessment brief v10082026 (mandatory, "must be covered") · **RUBRIC** = marking rubric v17082026 · **MOODLE** = lecturer's Week 5 sign-off post (suggested layout, but it is the sign-off gate).

## Rule for every slide

Slides carry **numbers, labels and structure**. Reasoning is spoken.

This is not a style preference — it is how the marks work:

- Visual Communication (5): HD = *"appropriate balance of text and meaningful visuals"*; Pass = slides that *"frequently rely on excessive text"*.
- Presentation Fluency (20): BRIEF says *"reading text word-for-word is not sufficient for a pass grade"*.
- Pitch Content (30) marks whether content is **covered in the pitch** — spoken counts.

One caveat: the Week 5 **sign-off draft** must carry *"a draft 3–5 bullet point summary of the main points"* in plain text on each content slide (BRIEF). So keep 3–5 short bullets per slide for sign-off; trim further afterwards if you want.

## Final structure — 8 slides excluding cover

| New | Was | Action |
|---|---|---|
| Cover | P1 | keep |
| S1 Overview | P2 | keep |
| S2 Problem, goals, deliverables | P3 | minor |
| S3 Methodology & Progress | P4 + P5 | **merge, P5 deleted** |
| S4 Top 3 Issues | P6 | small addition |
| S5 Top 3 Risks | P7 | **biggest change** |
| S6 End Users & Engagement | P8 + P9 | **merge** |
| S7 Demo | P10 | keep |
| S8 Next Steps | P11 | small addition |

8 slides excluding cover — inside MOODLE's 6–8.

---

## S3 — Methodology & Progress (merge P4 into one slide, delete P5)

P5 is currently an empty duplicate carrying a copy of P4's presenter notes. Delete it.

**Keep on the slide:** the Trello board screenshot. It is real evidence and MOODLE explicitly asks for *"status of kanban board"*. Do not replace it with text.

**Cut two things to make room** (both are redundant, say them instead):

- "Currently focusing on Backend Implementation and Database Setup cards" — already visible in the screenshot
- The four remaining phase names (Backend, Data Pipeline, AI Integration, Handover) — keep the count, speak the names

**Final slide text:**

> **METHODOLOGY & PROGRESS**
> *[Trello board screenshot — keep]*
>
> Lightweight Agile · Kanban via Trello
> **Scrum → milestone planning + supervisor checkpoints**
>
> 34 tasks done · 2 of 6 phases complete · 4 remaining
> **Completed: 35%** — effort-weighted; remaining 4 phases carry ~70% of ~120 dev hours
> **Schedule: [on track / X weeks behind] · handover Week 10**
>
> **Team:** Frontend *[name]* · Backend *[name]* · Database *[name]* · *[name]*
> Work split by contract boundary · cards drawn from your own track

Three of those lines are currently sitting in your presenter notes, where nothing is marked. The Scrum line is what BRIEF means by methodology *"adapted to student/unit-specific requirements"*; the effort-weighting is what MOODLE means by *"also how it was calculated"*.

**Say out loud:**
- Why Scrum was dropped — fixed studio schedule, four part-time students, supervisor checkpoints replace sprint reviews
- How you track and document: weekly Trello audits opening each meeting, WhatsApp stand-ups, GitHub commit history for individual accountability *(BRIEF requires this; it does not need to be on the slide)*
- Why the remaining 4 phases are the expensive ones
- How tasks get allocated: cards drawn from the owner's track, reallocation decided at the weekly audit — that is how the LLM's 20–30 hours were funded

> **[FILL IN]** Roles: names against Frontend / Backend / Database. Split is in `docs/team-split.md`.
> **[FILL IN]** Schedule: on track or behind, and against which milestone dates.

### Does progress-vs-schedule have to be on the slide?

Strictly no — BRIEF says the material *"must be covered between the group members"*, and speaking covers it. But put **one short line** on the slide anyway:

- The Week 5 sign-off draft requires plain-text bullets per slide (BRIEF), so it must be visible for sign-off regardless.
- RUBRIC lists *"progress against schedule and milestones"* as a named element; a marker ticking criteria mid-pitch will look for it.
- A spoken-only claim is the easiest thing for a marker to miss.

One line on the slide, the explanation from your mouth.

---

## S4 — Top 3 Issues (P6, small addition)

Content is already good. Keep all three issues and their responses as they are.

**Add one short tag to two of them:**

> Local LLM Complexity … **→ drives Risk R5**
> Data Reconciliation … **→ shown in the demo**

**Say out loud:** that the LLM's effort cost is what makes late integration likely — this sets up the risk slide. RUBRIC's HD band asks for content that *"connects effectively"*; this is the cheapest connection you have.

---

## S5 — Top 3 Risks (P7, biggest change)

Currently risk + mitigation only. MOODLE item 5 asks three further questions: *"are they affected by (4) above? triggers? worse case scenario actions?"*

Note: trigger / worst-case wording appears in **neither faculty PDF** — it is MOODLE only. But RUBRIC's word is *"risk management"*, not "risks", and a list with mitigations is the minimum reading of that. Your supervisor signs off against MOODLE, so do it.

**Replace the three text boxes with one compact table.** Keep every cell to about six words.

> **TOP 3 RISKS BEING MONITORED**

| | R1 Privacy | R5 Integration | R6 Task Desync |
|---|---|---|---|
| **Caused by** | independent | **Issue 2** | **Issue 2** |
| **Trigger** | any real student record | merge slips / contract test fails | board unchanged at audit |
| **Worst case** | no realistic demo data | AI unintegrated at Week 10 | overrun found too late |
| **If it happens** | synthetic dataset (built) | LLM behind a feature flag | re-scope at weekly audit |

**Footer line on the same slide — BRIEF-required, currently missing everywhere:**

> **Anticipated later:** LLM speed on local hardware · PDF export not started (FR12) · Docker orchestration once LLM joins the stack

Put anticipated issues here, not on Next Steps: BRIEF's own example split pairs *"Risk Management and Anticipated Issues"* on one member, and RUBRIC groups them as *"key risks and anticipated future issues"*.

**Say out loud** (your existing mitigations live here, not on the slide):
- R1: PDPA blocks real data; synthetic mock dataset already generated; NFR1 keeps records local
- **"R5 and R6 are both caused by the second issue I just showed you"** — the single highest-value sentence in the pitch
- R5: mitigated by strict bi-weekly merges; if it still slips, ship the LLM behind a feature flag and deliver dashboard + PDF export without AI summaries
- R6: every meeting opens with a live Trello audit

> **[FILL IN]** Worst-case actions for R1 and R6 — the two marked cells above are suggestions, confirm they match what you'd actually do.

---

## S6 — End Users & Engagement (merge P8 + P9)

Merge the two slides. **Cut the Architecture box** — no source requires it; move one line to the demo slide.

This is your weakest area against the 30-mark criterion, which asks for *"strong evidence of end-user engagement and requirements validation."*

> **END USERS & ENGAGEMENT**
>
> **Unit Coordinator** — mapping · assessment setup · CSV upload · dashboard review
> **Lecturer** — assessment setup · CSV upload · LO attainment
> **Management Team** — user CRUD · roles · access control · reporting
>
> **Engaged:** academic staff + admin staff, plus supervisor checkpoints
> **Changed as a result:** *[FILL IN]*
> **Validated via RTM** — 12 functional + 6 non-functional requirements, each with stakeholder and acceptance criteria
> Privacy: records never leave the local environment (NFR1)

**Say out loud:** who you spoke to and what came out of it. Then trace **one** RTM row end to end — a requirement, the stakeholder who asked for it, its acceptance criteria, and where it now sits in the build. One traced row beats showing the whole table.

> **[FILL IN]** The "changed as a result" line is what actually scores. *"We consulted stakeholders"* is not evidence; a decision that moved because of a conversation is. If nothing changed yet, say that honestly and give the engagement plan — RUBRIC rewards realism, and BRIEF asks you to *"honestly describe current challenges"*.

---

## S7 — Demo (P10)

Keep. Scope it per MOODLE: *"just show one or more functions that are near complete"*, not a walkthrough.

Show: **grade upload → validation issues surfaced → commit → LO attainment on dashboard.** Covers FR7/FR8/FR9, is test-covered in `backend/tests/`, and is the direct evidence for Issue 3 on S4.

Add the one line rescued from the architecture box:

> Containerised with Docker — runs identically in development and deployment

Do **not** demo the Ollama LLM — there is no summary endpoint in `backend/app/main.py` yet, and S8 correctly lists it as critical path still ahead. Budget ~90 seconds and have a recorded fallback clip.

---

## S8 — Next Steps (P11, small addition)

Keep immediate priorities, critical path, out of scope, and KIV — that content already uses MOODLE's own framing and is fine.

Anticipated future issues move to S5, so nothing else is added here except a real close. Replace "Thank You" with three lines:

> - Where we stand: 35% complete, core backend and database landing now
> - What we're asking for: the go-ahead for the remaining four phases
> - Why Week 10 holds: the expensive phase is scoped, and the LLM has a fallback

RUBRIC's 15-mark structure criterion asks for *"a strong conclusion that brings the pitch together."* "Thank You" is not one.

---

## Speaker split — 12 minutes, 4 members

BRIEF page 2 gives a worked example for a 4-member team; this follows it.

| Speaker | Slides | Min |
|---|---|---|
| A | Cover, S1 overview, S2 problem/goals/deliverables | 2.5 |
| B | S3 methodology, progress, roles, allocation | 3.0 |
| C | S4 issues → S5 risks + anticipated issues | 3.5 |
| D | S6 end users, S7 demo, S8 next steps + close | 3.0 |

Blocks are contiguous — four handovers total. RUBRIC penalises a pitch that *"feels more like separate individual contributions than a coordinated team presentation."*

Overrun costs **5 percentage points off every member's mark, per minute**. Q&A is not counted.

---

## Still to fill in

1. Roles — names against Frontend / Backend / Database (S3)
2. Schedule — on track or behind, against which dates (S3)
3. Engagement — what changed as a result of talking to staff and admin (S6)
4. Worst-case actions for R1 and R6 — confirm the suggestions (S5)
5. Risk Register as a standalone document — required for sign-off, not currently in the repo
