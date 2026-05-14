# MCS07J Simplified Prototype Audit

Checked date: 2026-05-13

## Purpose

This folder is the Phase 1 proposal version of the MCS07 prototype. It is intentionally simpler than the original `MCS07` high-fidelity prototype because the final proposal only needs to show proposed UI/UX, workflow, scope, and software design. It should not look like a finished production system.

## What Was Wrong With The Previous Simplified Folder

The previous `MCS07J_simplified` content was still mostly copied from the high-fidelity version:

- It still used polished dashboard styling.
- It still looked like a production analytics console.
- It had dense fake metrics and detailed visual states.
- It used stronger brand styling than needed for proposal-stage wireframes.
- It did not clearly explain that this is Phase 1.
- It did not make the PDF/report export requirement obvious enough.
- It could make markers ask implementation-detail questions too early.

## What Was Simplified

1. Visual style
   - Removed advanced dashboard polish.
   - Removed gradients, shadows, decorative browser frames, and dense charts.
   - Replaced with low-fidelity boxes, dashed placeholders, simple tables, and clear labels.

2. Content density
   - Reduced fake production data.
   - Kept only sample values needed to explain the workflow.
   - Made each screen explain one purpose.

3. Phase 1 framing
   - Added "Phase 1 wireframe" labels.
   - Added notes explaining slide usage.
   - Made it clear this is proposal-stage UI, not final implementation.

4. Rubric alignment
   - Added explicit final 14-slide alignment in `01 - Design Proposal.html`.
   - Kept WBS and system architecture separate from UI screens.
   - Stated that WSM should be backup/Q&A, not a main slide.

5. Missing requirement coverage
   - Added visible "Export PDF report" action on the dashboard.
   - Added local LLM summary action.
   - Added Management Team user CRUD/role assignment explanation.
   - Added Handbook scraper fallback explanation.

## Simplified Screen Set

- `console/index.html`
  - Screen index and explanation of the simplified prototype.

- `console/00 - Login.html`
  - Role-based login concept.
  - Shows Unit Coordinator, Lecturer, and Management Team access at proposal level.

- `console/01 - Dashboard.html`
  - Main LO attainment dashboard.
  - Shows LO status, report area, local LLM summary, and PDF export.

- `console/02 - Mapping.html`
  - LO-PLO mapping matrix.
  - Shows suggested/manual mapping and Handbook fallback.

- `console/03 - Assessments.html`
  - Assessment setup.
  - Shows assessment weights, LO tags, and the even-distribution calculation rule.

- `console/04 - CSV Upload.html`
  - CSV upload and reconciliation.
  - Shows upload steps, column mapping, row issues, and LO impact preview.

- `console/05 - Admin.html`
  - Users and roles.
  - Shows Management Team user management and permission matrix.

- `01 - Design Proposal.html`
  - Simplified overview for presentation planning.
  - Includes workflow, architecture notes, and 14-slide alignment.

## Slide Usage Recommendation

Use the simplified prototype like this:

- Slide 7: show `00 - Login.html` and `01 - Dashboard.html`.
- Slide 8: show `02 - Mapping.html`, `03 - Assessments.html`, and `04 - CSV Upload.html`.
- Slide 8 or Slide 5: briefly mention `05 - Admin.html` for Management Team role control.
- Slide 9: do not use a UI screen. Use system architecture instead.

## WSM Recommendation

Do not place WSM as one of the 14 main slides unless the supervisor specifically asks for it.

Reason:

- The final slide requirement list does not include WSM.
- The deck is strict 14 slides.
- A standalone WSM slide would replace a required slide.

Best use:

- Mention local LLM selection briefly on Slide 4 or Slide 12.
- Keep the full WSM in backup/Q&A.

Suggested wording:

> We selected a local LLM after comparing privacy, cost, technical effort, and accuracy. The full WSM is kept as supporting evidence.

## Remaining Manual Decisions

1. Confirm final title:
   - Formal deck title should likely remain `Student Academic Performance Dashboard`.
   - `Curriculum Analytics` can remain as the prototype/product label if desired.

2. Confirm final supervisor names:
   - Old deck lists Mr. Soo Wooi King and Dr. Tan Chee Keong.
   - Final sign-off notice is from Mr. Soo.

3. Confirm FIT3162 deadline wording:
   - Old materials mention both Week 10 and Week 12.
   - Use only one in the final timeline.

4. Decide whether to add a separate report review screen:
   - Current simplified dashboard now includes PDF export.
   - A separate report screen would be better but is not strictly required for Phase 1.

