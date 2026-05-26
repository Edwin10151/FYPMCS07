# MCS07 Project Proposal Report Strategy Audit

Date checked: 26 May 2026  
Submission deadline: Monday, 8 June 2026, 11:55 PM  
Sources checked:

- `Project Proposal Reporte.pdf`
- `Marking rubric for project proposal report.pdf`
- `requirements_traceability_matrix.md`
- `wbs_final_check.md`
- `final_presentation_script_corrected.md`
- `MCS07J_simplified/system_architecture.html`
- `MCS07J_simplified/wbs_chart.html`

## Confidence Statement

The strategy is document-grounded, but not absolutely 100% certain until the team confirms supervisor-specific preferences and the current Google Doc state.

High-confidence facts from the brief:

- The written report is due Monday, 8 June 2026, 11:55 PM.
- The maximum report word count is 3500 words, excluding figures, data tables, cover sheet, references, and appendices.
- The report must include front matter, introduction, literature review, project management plan, methodology, conclusion, appendices, and bibliography.
- The appendices must include RTM, Risk Register, WBS, and Gantt Chart.
- Missing the Authorship Statement triggers an automatic 50% penalty.
- The methodology requires text plus an appropriate software/component integration diagram.
- UML and sequence diagrams are not explicitly required by the brief.
- The Project Management Plan is the highest-weighted section at 50 marks.
- The rubric rewards a literature review with 15+ relevant sources, including academic and grey literature plus relevant software/hardware/tools.

Remaining uncertainty:

- Whether the supervisor wants an ERD in the report body or appendix.
- Whether the supervisor expects exactly 5-8 literature references or the rubric's stronger 15-reference target.
- Whether Moodle has additional GenAI declaration or formatting instructions not visible in the local PDFs.
- Whether the team already has a Google Doc with edit history and partial drafts outside this workspace.

Confirmed team decisions from 26 May discussion:

- Edwin Ting Heng Wei will be the final whole-document style wrangler / proof editor.
- Sharmanne Yeoh will be the Meeting 05 minute taker.
- The team can include the completed ERD as a supporting appendix or database-design figure.
- The Gantt chart needs adjustment because presentation feedback said the Gantt should match the WBS tasks and subtasks more clearly.
- Yuan Yu will present the adjusted Gantt chart by screen-sharing it for freestyle team discussion.
- The ERD will also be reviewed by screen-share as a freestyle discussion, focusing on readability and report placement.
- Google Doc edit history is required by the report brief, so the team should create or move the report into an edit-logged shared Google Doc immediately.

## Corrected Strategy

The report should prioritise mandatory report artifacts over optional extra diagrams.

Priority 1:

- Authorship Statement
- Report body with all required sections
- RTM appendix
- Risk Register appendix
- WBS appendix
- Gantt Chart appendix
- APA bibliography

Priority 2:

- System architecture diagram in methodology
- UI/wireframe figures where useful for scope and methodology
- ERD as methodology body figure and/or appendix because the database schema is already completed

Priority 3:

- UML class diagram
- sequence diagram

Only do Priority 3 if the supervisor explicitly asks or if there is spare time after all mandatory items are done.

## Loopholes And Fixes

| Loophole / Risk | Why It Matters | Fix |
|---|---|---|
| No Authorship Statement | The brief says missing it causes an automatic 50% penalty. | Add a front-matter authorship table naming the section and artifact leader for every major section, figure, table, and appendix. |
| Report reads like copied separate sections | The brief warns against disconnected copy-paste submissions. | Use one shared Google Doc, one style wrangler, consistent headings, figure labels, and cross-references. |
| References conflict: brief says 5-8, rubric says 15 per team | A marker may use the rubric for higher bands. | Target 15+ credible sources total, with concise synthesis in the literature review. |
| Literature review becomes a source list | The rubric asks for critical engagement, synthesis, methodology discussion, gap/opportunity evidence, and existing competing tools. | Divide it into intro, themed body subsections, and conclusion. Cover project management methodology, existing tools, UI/UX, analytics/reporting, privacy/local AI, and the project gap. |
| Scope section lacks priority | The rubric rewards in-scope/out-of-scope plus high and low-priority items. | Add a scope table with must-have, should-have, and out-of-scope items. |
| Requirements discussion lacks source/acceptance rationale | The rubric expects discussion of how requirements are obtained and product acceptance criteria. | Explain supervisor feedback, pitch feedback, RTM, prototype evidence, and acceptance criteria before pointing to the full RTM appendix. |
| RTM exists but may not be formatted for appendix | Appendix must contain the full RTM. | Convert `requirements_traceability_matrix.md` into a clean report appendix table. |
| Risk Register missing | Explicitly required in appendix and heavily weighted under management process. | Create a project-specific risk register with PM and technical risks, owner, likelihood, impact, mitigation, and contingency. |
| WBS exists only as slide/source artifact | Appendix requires the detailed WBS. | Export or paste a readable WBS figure/table into the appendix and refer to it in Section 4.3. |
| Gantt chart not obvious as report appendix | Appendix requires a Gantt chart with dependencies and milestones. Presentation feedback also said the Gantt should match WBS tasks and subtasks. | Add a Trello action item to revise the Gantt so its task rows align with the WBS work packages and major subtasks. |
| Lifecycle model not decided | Project organisation is worth significant marks. | Choose lightweight Agile / iterative development with Trello Kanban, weekly reviews, shared docs, and supervisor feedback loops. |
| Methodology too vague | Rubric asks for enough detail for another developer/team to follow. | Include tools, data sources, preprocessing, architecture, LO calculation approach, local LLM summary workflow, and PDF export process. |
| Diagram confusion | The team may waste time on UML/sequence diagrams. | Use system architecture as the required integration diagram. Add ERD only if it helps database explanation. Do not prioritise UML/sequence. |
| ERD placement unclear | ERD is useful, but a large unreadable ERD in the body can hurt presentation quality. | Put a readable ERD or simplified data-model figure in methodology. If the full ERD is large, put it in the appendix and refer to it from the body. |
| Resource section underdeveloped | Rubric expects technical and human resource estimates. | Add a table covering team roles, developer time, React/FastAPI/PostgreSQL/Docker/Ollama, hardware assumptions, mock data, and collaboration tools. |
| Management process too generic | Rubric rewards risk, communication, monitoring, and review/audit mechanisms. | Tie process to Trello, meeting minutes, Google Doc edit history, GitHub, supervisor consultation, WBS/Gantt progress checks, and risk register review. |
| Methodology misses data processing | The brief asks for data collection, management, preprocessing, development steps, and algorithms where relevant. | Cover Monash Handbook scraping, CSV upload/validation, mock/anonymised data, LO calculation logic, local LLM summary workflow, PDF export, and development tools. |
| Figures are not cross-referenced | Style rubric expects diagrams to be clear, labelled, numbered, and referred to in the body. | Number every figure/table and reference it in prose before or after it appears. |
| RTM version ambiguity | The brief asks for the RTM from the time of the Pitch presentation, while the body also discusses requirements refined since the pitch. | Label the appendix clearly as the proposal-stage RTM, and explain in the body how requirements were refined after pitch/presentation feedback. |
| Word count overflow | 3500 words is tight for all sections. | Put RTM, WBS, Gantt, and Risk Register in appendices. Use concise tables for scope, resources, and communication plan. |
| Bibliography quality risk | Brief warns bad references may look like inappropriate GenAI use. | Verify every source manually, cite only sources used, use APA consistently, and assign one reference checker. |
| Moodle submission coordination | Every member must click submit. | Add final-day task: all four members confirm Moodle submission before 8 June 2026, 11:55 PM. |
| No edit-logged Google Doc | The brief says the report should be prepared using an online edit-logged Google document and the edit log may be requested to support authorship claims. | Create the shared Google Doc immediately, move all report drafting there, and keep edits under each member's account where possible. |

## Recommended Report Structure And Word Budget

| Section | Target Words | Lead | Notes |
|---|---:|---|---|
| Front matter | Excluded | Edwin + all | Title sheet, TOC, team names, authorship statement, word count. Edwin performs final style pass. |
| 1. Introduction | 350 | Sharmanne | Project aims, background, expected outcome, report overview. |
| 2. Literature Review | 850 | Sharmanne | 15+ sources total; cover project topic, existing tools, PM/process, UI/UX, privacy/local AI where relevant. |
| 3. Project Management Plan | 1450 | Split | Highest-value section. Keep project-specific. |
| 3.1 Scope and Requirements | 350 | Edwin | Product characteristics, in/out scope, priority levels, requirements source, acceptance criteria, link to RTM. |
| 3.2 Project Organisation | 350 | Wen Jung | Agile/iterative model, rationale, team roles, tools. |
| 3.3 Schedule and Resources | 350 | Wen Jung | WBS overview, dependencies, resource table, and alignment with Yuan Yu's adjusted Gantt. |
| 3.4 Management Process | 400 | Yuan Yu | Risk process, communication plan, monitoring, review/audit mechanisms, version control. |
| 4. Proposed Methodology | 600 | Edwin | Software/tools, architecture, data sources, preprocessing, development steps, LO calculation, local LLM, PDF export. |
| 5. Conclusion | 250 | Sharmanne | Summarise report and feasibility. |
| Bibliography | Excluded | Sharmanne + all | APA format, source verification. |
| Appendices | Excluded | Split | RTM, Risk Register, WBS, Gantt. |

Total target body words: about 3500.

## Recommended Authorship Statement Draft

Use initials consistently.

| Member | Section / Artifact Leadership |
|---|---|
| SY - Sharmanne Yeoh | Led initial drafting and finalisation of the Introduction, Literature Review, Conclusion, and selected UI/wireframe figure descriptions. Led APA bibliography consistency checking. |
| CYY - Chuah Yuan Yu | Led initial drafting and finalisation of the Management Process section, including risk management process, communication plan, monitoring controls, Appendix B Risk Register, and the adjusted Gantt chart for Appendix D. |
| ETHW - Edwin Ting Heng Wei | Led initial drafting and finalisation of Scope and Requirements, Proposed Methodology, Appendix A RTM, system architecture figure integration, ERD methodology/appendix integration, and final whole-document style/proof edit. |
| LWJ - Lim Wen Jung | Led initial drafting and finalisation of Project Organisation, Schedule and Resource Requirements, Appendix C WBS, and resource estimate tables, ensuring the schedule discussion aligns with the adjusted Gantt. |

Add a sentence after the table:

All members reviewed and commented on the full report through the shared edit-logged Google document before submission.

## Risk Register Template

| ID | Risk | Category | Likelihood | Impact | Priority | Mitigation | Contingency | Owner | Status |
|---|---|---|---|---|---|---|---|---|---|
| R1 | Monash Handbook structure changes or scraper output becomes incomplete. | Technical | Medium | High | High | Use scraper only where reliable and keep manual review/edit fallback. | Allow manual unit, ULO, assessment, and mapping entry. | Edwin | Open |
| R2 | Real student data cannot be used due to PDPA/privacy constraints. | Technical / Compliance | High | High | High | Use mock or anonymised datasets for development/testing. | Validate workflows with synthetic test cases and supervisor-reviewed examples. | Sharmanne | Open |
| R3 | Different units have different assessment structures, weights, and LO mappings. | Technical | High | High | High | Use flexible relational schema and configurable assessment-to-LO mappings. | Limit FIT3162 implementation to representative units if needed. | Wen Jung | Open |
| R4 | Local LLM output is inconsistent or unsuitable for final reporting. | Technical | Medium | Medium | Medium | Treat AI output as editable draft text and keep human review before export. | Provide non-AI report template fallback. | Yuan Yu | Open |
| R5 | Docker/Ollama/local LLM performance is insufficient on available hardware. | Technical | Medium | Medium | Medium | Test with smaller local models and quantised models early. | Defer AI summary feature behind dashboard/reporting core if necessary. | Edwin | Open |
| R6 | Trello/task tracking is not updated consistently. | Project Management | Medium | Medium | Medium | Update Trello during or immediately after meetings. | Use meeting minutes action table as backup source of truth. | Yuan Yu | Open |
| R7 | Report sections become inconsistent because members write separately. | Project Management | Medium | High | High | Use shared Google Doc, agreed heading style, and one style wrangler. | Schedule merge review before final proofreading. | Edwin | Open |
| R8 | References are incomplete, inaccurate, or not cited in text. | Academic / Project Management | Medium | High | High | Maintain shared bibliography and verify each source manually. | Remove unverifiable references before final submission. | Sharmanne | Open |
| R9 | Gantt/WBS/RTM/Risk Register appendices are omitted or not cross-referenced. | Project Management | Low | High | Medium | Use appendix checklist and refer to each appendix in body text. | Final QA pass against report brief before submission. | Wen Jung | Open |
| R10 | One or more team members do not complete Moodle submission confirmation. | Project Management | Low | High | Medium | Assign final-day submission confirmation task to all members. | Message all members and capture confirmation before deadline. | All | Open |

## Meeting 05 Decisions To Lock

1. Confirm that the team will use the written report strategy above and stop prioritising UML/sequence diagrams unless supervisor asks.
2. Confirm lightweight Agile / iterative model as the project lifecycle model, or choose another lifecycle model with a clear rationale.
3. Confirm Edwin as overall style wrangler.
4. Confirm Sharmanne as APA/reference checker, or choose another member.
5. Confirm ERD will be included in the methodology body if readable, with the full version in the appendix if needed.
6. Confirm Yuan Yu will present and revise the adjusted Gantt chart to match WBS tasks and subtasks.
7. Confirm the shared Google Doc will be created or used immediately with edit history enabled.
8. Confirm every member's section deadline.
9. Confirm who checks Moodle for GenAI declaration, cover sheet, and submission-specific instructions.
10. Confirm all figures/tables will be numbered, captioned, and referenced in the body.

## Internal Deadlines

| Date | Deliverable |
|---|---|
| 27 May 2026 | Meeting 05 confirms ownership, lifecycle model, appendices, Gantt/WBS alignment action item, and Google Doc setup. |
| 31 May 2026 | First draft of all report body sections completed. |
| 2 June 2026 | RTM, Risk Register, WBS, and Gantt appendix drafts completed. |
| 4 June 2026 | Full merged draft completed. |
| 6 June 2026 | Proofreading, APA references, figure numbering, authorship statement, and word count completed. |
| 7 June 2026 | Final QA against brief/rubric and export to PDF. |
| 8 June 2026 | All members submit/confirm before 11:55 PM. |

## Revised Bottom Line

The strategy is now:

- Mandatory report sections and appendices first.
- System architecture as the required integration diagram.
- RTM, Risk Register, WBS, and Gantt treated as non-negotiable appendices.
- ERD included in methodology body if readable, with full version in appendix if needed.
- UML and sequence diagrams deferred unless supervisor explicitly requests them.
- Authorship Statement treated as critical because missing it causes an automatic 50% penalty.
