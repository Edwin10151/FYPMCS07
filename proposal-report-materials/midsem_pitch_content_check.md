# Mid-Semester Pitch — What To Fix

Team MCS07 · FIT3162 · Deck: "FYP2 presentation 1" (Canva, 9 pages)

Checked against: assessment brief `v10082026`, marking rubric `v17082026`, and the lecturer's Week 5 Moodle sign-off post.

**Before anything else:** no supervisor sign-off before the presentation = presentation invalid, no marks. That gate comes first.

**Verdict:** the deck does not need rebuilding. It needs 3 missing items added, 1 slide split into two, and the presenter names filled in.

## The fix list

Ordered by marks at risk.

| # | Problem | Slide | Fix | Required by |
|---|---|---|---|---|
| 1 | **Team roles missing.** S2 shows presentation contributions, not project roles | S4 | Add who owns Frontend / Backend / Database (see `docs/team-split.md`) | Rubric, 30 marks |
| 2 | **Task allocation missing** | S4 | State the rule: work assigned by contract boundary, Trello cards drawn from the owner's track | Rubric, 30 marks |
| 3 | **Anticipated future issues missing** — different from current issues and from risks | S9 | Add what you expect to *become* a problem: LLM speed on local hardware, PDF export (FR12, not started), Docker orchestration once the LLM joins the stack | Brief + rubric |
| 4 | **Risk slide has no triggers, no worst-case actions, no link to your top-3 issues** | S6 | See table below | Lecturer's post, verbatim |
| 5 | **Issues and risks are on one slide** | S5 | Split into two slides | Lecturer's layout |
| 6 | **Presenter name blank on 6 slides** (3,4,5,6,7,8) | all | Fill in every one, Allocate+ form | Brief, hard rule |
| 7 | **End-user engagement is one thin line** about your supervisor | S7 | Name the staff you spoke to and **what changed because of it**; cite the RTM | Rubric, 30 marks |
| 8 | **Best PM content is stuck in presenter notes** (notes aren't marked) | S4 | Move onto the slide: Scrum dropped for milestone planning, the 3 tracking methods, how 35% was calculated | Brief + lecturer's post |
| 9 | **No progress-vs-schedule statement** | S4 | One sentence: on track / ahead / behind, against which milestone dates | Brief |
| 10 | **Name inconsistent** — "Lim Wen Jung" (S1) vs "WEN JUNG LIM" (S2) | S1, S2 | Pick the Allocate+ form | Brief |
| 11 | **S2 section labels don't match slide order** | S2 | Reorder | Structure & flow, 15 marks |
| 12 | **No real conclusion** — "Thank You" isn't one | S9 | 3 lines: where we stand, we're asking for the go-ahead, why Week 10 is achievable | Structure & flow, 15 marks |

## Fix 4 in detail — the risk slide

The lecturer asked three specific questions. Your slide answers none of them. Add these rows:

| | R1 Privacy | R5 Integration | R6 Task desync |
|---|---|---|---|
| Linked to your top-3 issues? | No, independent | **Yes** — issue 2 (LLM effort) pushes integration late | **Yes** — hides issue 2's effort overrun |
| Trigger | Any request touching identifiable records | A bi-weekly merge slips | Board unchanged at a weekly audit |
| Worst case | Can't demo on realistic data | AI phase unintegrated at Week 10 | Overrun found too late to reallocate |
| Contingency | *to fill* | Ship LLM behind a feature flag; deliver dashboard + PDF without AI summaries | *to fill* |

Your existing mitigations stay — they are preventive. These add the contingency side.

## Slide plan — 8 slides excluding cover

Stays inside the lecturer's 6–8 limit. No new slides; the missing items fold into existing ones.

| | Slide | Change |
|---|---|---|
| S1 | Cover | none |
| S2 | Overview + speaker allocation | fix label order |
| S3 | Problem, SMART goals, deliverables | label the goals as SMART |
| S4 | Methodology, tracking, **roles + allocation** | expand (fixes 1, 2, 8, 9) |
| S5 | Top 3 issues | split out |
| S6 | Risks | split out + expand (fix 4) |
| S7 | End users, engagement, validation | merge old S6+S7, add evidence |
| S8 | Demo | scope down (see below) |
| S9 | Next steps, **anticipated issues**, close | expand (fixes 3, 12) |

## Demo — keep it, scope it

It is in the lecturer's layout, so it stays. But: *"just show one or more functions that are near complete"*, not a full walkthrough.

Show: grade upload → validation issues surfaced → commit → LO attainment on dashboard. Covers FR7/FR8/FR9, is test-covered, and is the evidence behind your "Data Reconciliation" issue. **Do not demo Ollama** — no summary endpoint exists yet, and you correctly list it as critical path still ahead. Budget 90 seconds, have a recorded fallback.

## Timing

4 members = **12 minutes**. Overrun costs **5 points off every member's mark, per minute**.

Rough split: opening 1 · problem 1.5 · methodology 3 · issues 1.5 · risks 2 · end users 1.5 · demo 1.5 · close 1 = **13 min**. One minute over — trim the problem statement (the audience already knows it from the proposal) and the architecture content currently on S6, which no source requires.

Printed cards are allowed. Holding a phone or reading off a laptop caps your individual fluency mark.

## Where the marks are

| Criterion | Weight |
|---|---|
| Pitch content (team) | **30** |
| Fluency (individual) | 20 |
| Content & contribution (individual) | 20 |
| Structure & flow (team) | **15** |
| Q&A (individual) | 5 |
| Professional conduct (individual) | 5 |
| Visual communication (team) | **5** |

Visual design is worth 5, content is worth 30 — don't spend the remaining time on Canva styling.

The rubric also says *"meeting all requirements well… is not by itself sufficient for an HD."* Doing everything above gets a solid D. The HD lever is depth: the risk-to-issue linkage, showing how 35% was calculated, and one traced requirement where a real user changed a real decision.

## Pre-sign-off checklist

- [ ] Presenter name on every content slide, Allocate+ form, consistent
- [ ] 3–5 plain-text bullets per content slide (required for the Week 5 draft)
- [ ] Issues and risks on separate slides
- [ ] Risk slide: linkage, triggers, worst-case actions
- [ ] Roles + task allocation on S4
- [ ] 35% calculation and schedule statement on S4
- [ ] Anticipated future issues on S9
- [ ] Engagement evidence on S7
- [ ] 6–8 slides excluding cover
- [ ] Sign-off documents ready: **Risk Register, SMART Goals, RTM, updated Kanban board**
- [ ] Draft uploaded to Moodle and signed off **before** the presentation

## Still needed from you

1. Who owns Frontend / Backend / Database
2. Engagement specifics — which staff, what changed as a result
3. Milestone dates the 35% is measured against
4. Contingency actions for R1 and R6
5. Does a standalone Risk Register exist? R1/R5/R6 implies six or more entries, but it is not in the repo
