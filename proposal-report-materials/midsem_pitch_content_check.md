# Mid-Semester Pitch — Content Check and Revised Deck Spec

Team MCS07 · Student Academic Performance Dashboard · FIT3162
Deck reviewed: "FYP2 presentation 1" (Canva, 9 pages)

## 1. Sources of truth

Three documents govern this assessment. They do not say the same thing, so precedence matters.

| # | Source | What it governs |
|---|---|---|
| A | Assessment brief `v10082026` | The 9 mandatory pitch content items, timing, presenter-name rule, penalties |
| B | Marking rubric `v17082026` | How marks are allocated across 7 criteria |
| C | Lecturer's Week 5 sign-off post (Soo Wooi King) | The suggested slide layout, 6–8 slides excluding cover, and the sign-off gate |

**Precedence rule used in this spec:** C decides the *slide structure* (it is what the supervisor signs off against). A decides the *content that must appear somewhere*. B decides *how deep* each item has to go. Where A requires something C's layout does not name, it is folded into the nearest C slide rather than added as an extra slide, so the deck stays within 6–8.

**Hard gate:** no supervisor sign-off before the presentation = presentation invalid, no marks awarded, even if delivered. This is pass/fail and sits ahead of everything else in this document.

## 2. Verdict

The deck is structurally close to the lecturer's layout and does not need rebuilding. It needs:

- 3 content items added that are currently absent
- 1 slide split into two (issues and risks are conflated)
- 1 formatting rule fixed that is currently broken on 6 of 9 slides
- 2 slides' substance promoted out of presenter notes onto the slides themselves

## 3. Mark allocation (rubric v17082026)

| Criterion | Weight | Earned by |
|---|---|---|
| Pitch content (team) | 30 | Content coverage — the deck |
| Presentation fluency (individual) | 20 | Delivery |
| Content and contribution (individual) | 20 | Each member's own section |
| Presentation structure and flow (team) | 15 | Opening, transitions, timing, conclusion |
| Response to questions (individual) | 5 | Q&A |
| Professional conduct (individual) | 5 | Conduct during the session |
| Visual communication (team) | 5 | Slide design |

Two consequences:

- Visual design is worth 5. Pitch content is worth 30. Do not spend the remaining time on Canva styling.
- The rubric's general standard states that *"Meeting all requirements well, or simply having no obvious weaknesses, is not by itself sufficient for an HD."* Covering every bullet is a Distinction ceiling. HD requires depth, project-specific evidence, and reasoning on top of coverage.

## 4. Coverage against the brief's 9 mandatory items

| # | Required item (brief A) | Current deck | Status |
|---|---|---|---|
| 1 | PM methodology **adapted to unit-specific requirements** | S4 covers Agile/Kanban/Trello. The adaptation (Scrum dropped in favour of milestone planning + supervisor checkpoints) is in **presenter notes only** | Partial |
| 2 | How processes are tracked and documented | S4 says "Trello". Weekly Trello audits, WhatsApp stand-ups and GitHub history are in **presenter notes only** | Partial |
| 3 | Progress **against schedule**, milestone progression | S4 gives 35%, 2 of 6 phases. No statement of on-track / ahead / behind, and the calculation method is in notes | Partial |
| 4 | Top-3 current management and software issues + how addressed | S5 — scraper stability, local LLM complexity, data reconciliation | Covered |
| 5 | Top-3 risks monitored | S5 — R1 privacy, R5 integration, R6 task desync | Covered, but see §5.2 |
| 6 | **Anticipated future issues or problems** | Not present as a distinct item | **Missing** |
| 7 | **Roles assigned to team members** | Not present. S2 shows *presentation* contributions, not project roles | **Missing** |
| 8 | **How tasks are allocated to members** | Not present | **Missing** |
| 9 | End-user engagement and requirements validation | S7, one line about validating with Dr. Tan | Thin |

Items 6, 7 and 8 are named directly in the 30-mark Pitch Content criterion, which requires the team to *"clearly explain team roles and task allocation"* and provide *"strong evidence of end-user engagement and requirements validation."* These are the highest-value fixes in this document.

## 5. Defects to fix

### 5.1 Presenter name missing on six slides — hard requirement

The brief states: *"The name of the presenter must be clearly shown on all the slides that the presenter is talking about. Please show the name as recorded on Allocate+."*

Slides 3, 4, 5, 6, 7 and 8 carry a literal `Speaker:` label with no name after it. Only slide 9 is filled in ("Speaker: Edwin Ting Heng Wei").

Also inconsistent: slide 1 shows "Lim Wen Jung (34428313)", slide 2 shows "WEN JUNG LIM". Choose the Allocate+ form and use it identically on every slide.

This costs nothing to fix and is directly checkable by the marker.

### 5.2 Issues and risks are one slide; the risk slide is missing three required elements

The lecturer's layout treats these as two separate slides, and specifies what the risk slide must contain:

> *"Risks discussion (mgmt etc) - are they affected by (4) above? triggers? worse case scenario actions?"*

The current risk entries are risk + mitigation only. All three of the lecturer's questions are unanswered:

| Required | Present? |
|---|---|
| Are the risks affected by the Top-3 issues? | No linkage shown |
| Triggers — what tells you the risk is materialising? | Absent |
| Worst-case scenario actions | Absent (mitigations are preventive, not contingency) |

This is the most specific, most easily-corrected gap in the deck, and it is the one the supervisor is most likely to check at sign-off because it is stated verbatim in their own post.

### 5.3 Substance stranded in presenter notes

The S4 notes contain the strongest project-management material in the deck — the methodology adaptation, the three tracking mechanisms, and the effort-weighted completion calculation. The lecturer's layout explicitly asks for *"percentage of work done (also how it was calculated)"*. Notes are not marked. Move this onto the slide.

### 5.4 No closing slide

"Thank You" is not a conclusion. The 15-mark structure criterion asks for *"a strong conclusion that brings the pitch together."* Fold a three-line close into the Next Steps slide (status, ask, confidence) rather than adding a slide.

### 5.5 Slide 2 section labels do not match slide order

The overview maps four numbered sections to four speakers, but the labels do not line up with the actual sequence of slides 3–9. Fix before sign-off — it is cheap, and mismatched signposting reads directly against the structure and flow criterion.

## 6. Demo — correction

An earlier read of the faculty brief alone suggested the demo was optional. It is not. The lecturer's layout includes a Demo slide as a standard element, with a constraint:

> *"the demo should NOT be going into detail into how the entire project works, executes a long process to generate output etc. Just show one - or more - functions that are (near) complete."*

Keep the demo, and scope it to a single vertical slice. Based on what is currently implemented in the repository, the strongest candidate is the grade upload path:

`POST /api/grade-uploads/inspect` → `preview` → validation/reconciliation issues surfaced → `commit` → LO attainment visible on the dashboard.

Rationale: it is the project's differentiator, it exercises `backend/app/services/grade_import.py` and `calculation.py` (both covered by tests in `backend/tests/`), it maps to FR7/FR8/FR9 in the RTM, and it is the concrete evidence behind the Top-3 issue "Data Reconciliation". Avoid demonstrating the Ollama LLM path — it is not implemented (no summary/report endpoint exists in `backend/app/main.py`), and the deck correctly lists it as the critical path still ahead.

Budget 90–120 seconds. Have a recorded fallback clip in case the live run fails.

## 7. Revised slide spec — 8 slides excluding cover

Within the lecturer's 6–8 range. Changes from the current deck are marked.

### S1 — Cover *(no change)*
Project title, group ID MCS07, all four member names with IDs as recorded on Allocate+, both supervisors.

### S2 — Overview and speaker allocation *(fix labels)*
Required by the brief for Week 5 sign-off: *"Proposed topic overview slide (Slide 2) showing team member presentation contributions."* Already present. Correct the section labels so they match slides 3–9 in order.

### S3 — Problem, objectives and deliverables *(minor)*
Current content is sound. Label the goals explicitly as **SMART goals** — the lecturer's layout names them, and the Risk Register / SMART Goals / RTM / Kanban set is what the brief requires for sign-off. Existing goals already carry measurable targets (3+ visualisation charts, 100+ student records, 3-sentence summaries, handover by Week 10); the only thing missing is the label and, where absent, the time-bound clause.

### S4 — Methodology, tracking and team organisation *(substantially expanded)*
Absorbs required items 1, 2, 3, 7 and 8. Content:

- **Methodology and its adaptation** — lightweight Agile with Kanban tracking in Trello; formal Scrum (sprints, Scrum Master) deliberately replaced with milestone planning and supervisor checkpoints to fit the academic calendar. *State the adaptation on the slide, not in notes* — the brief asks specifically for methodology "adapted to student/unit-specific requirements".
- **How progress is tracked and documented** — weekly Trello board audits at the start of each meeting, WhatsApp stand-ups, GitHub commit history for individual accountability.
- **Kanban status** — 34 tasks in Done; current cards are Backend Implementation and Database Setup.
- **Milestones** — 2 of 6 phases complete (Requirements, UI/UX Prototypes); 4 remaining (Backend, Data Pipeline, AI Integration, Handover).
- **Percentage complete and its calculation** — 35%, by effort-weighted phase completion; the four remaining phases carry roughly 70% of the estimated ~120 developer hours. *Put the calculation on the slide.*
- **Against schedule** — add one explicit sentence: on track / ahead / behind, and against which milestone dates. Currently absent and directly required.
- **Roles and task allocation** — *new*. The split in `docs/team-split.md` is by contract: Frontend (React app, API client, role-aware views), Backend (FastAPI, auth, scraper integration, CSV validation, ULO calculation), Database (PostgreSQL schema, migrations, seed data). State who owns which track and the allocation rule — that work is assigned by contract boundary so frontend and database never depend on each other directly, with Trello cards drawn from the owner's track.

> **[CONFIRM]** Name-to-track assignment for all four members is not recorded in the repository. Fill this in before sign-off.

### S5 — Top 3 management and software issues currently handled *(split from current S5)*
Keep the three existing issues and their responses:

| Issue | Response |
|---|---|
| Handbook scraper stability — Monash Handbook HTML changes | Manual fallback review/edit UI (FR4) |
| Local LLM complexity — 20–30 developer hours | Hours reallocated from non-essential features |
| Data reconciliation — inconsistent Moodle CSV exports | 4-step validation pipeline before commit (FR8) |

### S6 — Risks *(split from current S5, and expanded)*
Keep R1 / R5 / R6, and add the three elements the lecturer asked for. Suggested structure per risk:

| | R1 — Privacy | R5 — Integration | R6 — Task desync |
|---|---|---|---|
| Risk | Cannot use real student data (PDPA) | Frontend/backend/LLM fail to connect late in term | Members not updating Trello |
| Linked to issue? | Independent of the Top-3 | **Yes — driven by issue 2**, local LLM effort pushes integration late | **Yes — amplifies issue 2**, hidden effort overruns |
| Trigger | Any request touching identifiable records | A scheduled bi-weekly merge slips, or contract test fails | Board unchanged at a weekly audit |
| Worst case | Cannot demonstrate on realistic data | AI phase unintegrated at Week 10 handover | Overrun discovered too late to reallocate |
| Mitigation (current) | Synthetic mock dataset; NFR1 keeps records local | Strict bi-weekly merges | Live Trello audit opening every meeting |
| Contingency (worst case) | *[to complete]* | *[to complete]* — e.g. ship with LLM behind a feature flag, deliver dashboard + PDF export without AI summaries | *[to complete]* |

Filling the contingency row is what separates this slide from the current version. Two of the three risks link back to the Top-3 issues — say so out loud; it is the exact question the lecturer posed.

### S7 — End users, engagement and requirements validation *(merged and strengthened)*
Merges the current S6 (target users) and S7 (engagement/privacy). This slide carries required item 9 and is the thinnest area against a 30-mark criterion.

- **Who the end users are** — Unit Coordinator (mapping, assessment setup, CSV upload, dashboard review, report review); Lecturer (assessment setup, CSV upload, LO attainment viewing); Management Team (user CRUD, role assignment, access control, dashboard filtering, report viewing). Already on the current slide.
- **What engagement has actually happened** — *[FILL IN]* the staff spoken to, what was asked, and **what changed in the project as a result**. A changed decision traceable to a conversation is what the rubric means by evidence; "we consulted stakeholders" is not.
- **How requirements are validated** — cite the RTM (`proposal-report-materials/requirements_traceability_matrix.md`): 12 functional and 6 non-functional requirements, each with a named stakeholder, priority, acceptance criteria and prototype evidence. The RTM is already a Week 5 sign-off deliverable and is currently invisible in the deck. Show one traced row end to end rather than the whole table.
- **Privacy** — NFR1, records never leave the local environment or reach external APIs. Keep as is.

### S8 — Demo
Scoped as per §6. Name the function being shown and the requirement it satisfies (FR7/FR8/FR9), so the demo reads as evidence of milestone progress rather than a product tour.

### S9 — Next steps, anticipated issues and close *(expanded)*
Current content is good and already uses the lecturer's own framing (priority, out of scope, KIV). Add the one missing required item:

- **Immediate priorities** — PostgreSQL schema finalisation, 4-step CSV validation pipeline.
- **Critical path** — Ollama local LLM integration.
- **Anticipated future issues** — *new, required item 6*. Distinct from current issues and from risks: what the team expects to become a problem later. Candidates grounded in the project: LLM inference performance on local hardware once real report volumes are generated; PDF export fidelity (FR12, not yet started); end-to-end Docker orchestration once the LLM service joins the compose stack (NFR4); test data realism as the dataset grows past 100 records.
- **Out of scope** — direct Moodle/Callista integration, student-facing portal.
- **KIV** — grade forecasting, university-wide rollout.
- **Close** — three lines: where the project stands, what is being asked for (the go-ahead), and why the team is confident it lands by Week 10.

## 8. Timing

4 members = **12 minutes**. Q&A is not counted; the clock stops. Overrun is penalised **5 percentage points off every member's mark, per minute** — so this is a team-wide risk, not the last speaker's problem.

Suggested budget:

| Slides | Minutes |
|---|---|
| S1–S2 opening and overview | 1.0 |
| S3 problem, goals, deliverables | 1.5 |
| S4 methodology, tracking, roles | 3.0 |
| S5 top-3 issues | 1.5 |
| S6 risks | 2.0 |
| S7 end users and validation | 1.5 |
| S8 demo | 1.5 |
| S9 next steps and close | 1.0 |
| **Total** | **13.0** |

That is one minute over. Trim during rehearsal rather than on the day — the cheapest cuts are S3 (the problem statement is already well understood by the audience from the proposal stage) and the architecture material currently on S6, which is not required by any of the three sources and can be reduced to a single line on the demo slide.

Rehearse with a timer against the real deck at least twice. The brief also caps individual fluency marks if a speaker holds a phone or refers to a laptop for notes — printed cards are permitted and are the safe option.

## 9. Pre-sign-off checklist

Sign-off is a hard gate. Before the studio session:

- [ ] Every content slide shows the presenter's name as recorded on Allocate+
- [ ] Name forms consistent across S1 and S2 ("Lim Wen Jung" vs "WEN JUNG LIM")
- [ ] Each content slide carries a plain-text 3–5 bullet draft summary (brief requirement for the Week 5 draft deck)
- [ ] S2 section labels match the order of S3–S9
- [ ] Issues and risks are separate slides
- [ ] Risk slide answers: linkage to issues, triggers, worst-case actions
- [ ] Roles and task allocation stated on S4
- [ ] Anticipated future issues stated on S9
- [ ] Percentage complete **and its calculation method** on S4
- [ ] Progress-against-schedule statement on S4
- [ ] End-user engagement evidence completed on S7
- [ ] Deck is 6–8 slides excluding cover
- [ ] Supporting documents ready for sign-off: **Risk Register, SMART Goals, RTM, updated Kanban board**
- [ ] Draft deck uploaded to Moodle and signed off by supervisor **before** the presentation session

## 10. Open items

1. **Name-to-track assignment** for S4 — who owns Frontend, Backend, Database. Not recorded anywhere in the repository.
2. **End-user engagement specifics** for S7 — which staff, what was asked, what changed as a result.
3. **Progress against schedule** — the milestone dates the 35% is being judged against.
4. **Worst-case contingency actions** for R1 and R6 on S6.
5. **Risk Register** as a standalone sign-off artefact — the deck lists R1, R5 and R6, implying a register with at least six entries exists, but it is not in the repository.
