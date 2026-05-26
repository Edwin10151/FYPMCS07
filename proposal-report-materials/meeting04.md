Group Meeting 04 Script
Project: Students Academic Performance Dashboard - MCS07
Meeting: Group Meeting 04: Final Presentation Deliver
Recording Date: 13 May 2026, continuing into 14 May 2026
Time: 11:40 PM - 12:40 AM
Location: Zoom
Chair: Edwin Ting Heng Wei
Minute Taker: Yuan Yu Chuah
Attendees: Sharmanne Yeoh | Yuan Yu Chuah | Wen Jung Lim | Edwin Ting Heng Wei Apologies: None
Absentee catch-up plan: Not required because all members attended. If a member becomes unavailable later, the meeting recording, minutes, and action-item table will be shared through the group drive.
Accuracy note: This script is a preparation guide. The final submitted minutes must be updated by the minute taker so they accurately reflect what is actually said and decided in the recorded meeting.
Today's Agenda
Attendance and roles
Review action items in Trello
UI/UX design review
Final presentation slide discussion
Task assignments
Supervisor consultation plan, next meeting, and close

[00:00] Item 1 - Attendance and Roles
Edwin:
"Okay everyone, recording is running. Let's get Meeting 04 started formally. This recording is being made on 14 May 2026 at 12:11 am We are meeting on Zoom.
I'm chairing tonight. YY, you're taking minutes for this meeting, yeah?"
Yuan Yu:
"Yep, minutes are open. I'll note the decisions and action items as we go."
Edwin:
"Nice. Quick attendance check - Sharmanne is here, YY is here, Wen Jung is here, and I'm here as well. So full attendance tonight.
For today's agenda, we have six things to go through. First, attendance and roles. Second, we review the action items in Trello. Third, UI/UX design review. Fourth, final presentation slide discussion. Fifth, task assignments. And then we close with the supervisor consultation plan and next meeting.
Everyone good with that agenda? Anything to add before we start?"
All:
"All good."
Edwin:
"Cool. YY, please note full attendance and agenda accepted. Let's move to Item 2."
Minute Note:
Full attendance confirmed.
No apologies.
Edwin is chair.
Yuan Yu is minute taker.
Agenda accepted by all members.

[05:00] Item 2 - Review Action Items in Trello
Edwin:
"Okay, Item 2 - let's go through the Trello board first.
Looking at the In Progress column, we still have these cards: Final Proposal Slides, schedule meeting with supervisor to know the type and data of charts, Figma screens for coordinator dashboard and report editing screen, Figma screens for login and LO to PLO mapping interface, system architecture diagram covering data flow between frontend, backend and AI, PostgreSQL database schema diagram, and PDPA constraint documentation.
Let's quickly go card by card and decide what can move to Completed and what still stays In Progress."
Trello Cards Reviewed
Trello card
Owner shown / expected
Progress since last meeting
Board action
Final Proposal Slides
Team
Current PDF has the required broad structure, but still needs cleanup and supervisor confirmation.
Keep In Progress
Schedule meeting with supervisor to know the type and data of charts
Sharmanne / team follow-up
Needed for chart type, Gantt chart, slide count, and final slide confirmation. Consultation planned for Thursday, 14 May 2026.
Keep In Progress
screens for coordinator dashboard and report editing screen
Yuan Yu
Ready enough for UI/UX review and slide selection.
Move to Completed after review
screens for login and LO to PLO mapping interface
Sharmanne
Ready enough for UI/UX review and slide selection.
Move to Completed after review
System Architecture diagram covering data flow between Frontend, Backend and AI
Edwin
Diagram is ready for Slide 9 discussion.
Move to Completed
PostgreSQL database schema diagram
Wen Jung
Useful as backup/supporting material, but not the main Slide 9. (for reference)
Move to Completed if the latest version is uploaded
PDPA constraint documentation
Wen Jung / team reference
Ready enough for Slide 12 challenge discussion.
Move to Completed if citation/source is attached

Sharmanne:
"For the login and mapping screens, I think they are ready for presentation discussion. We may still adjust how they appear in the slide, but the design task itself can be treated as done."
Yuan Yu:
"For the dashboard and report editing screens, same thing. The screens are ready enough. The next step is deciding how many screenshots to show and what to say about them."
Wen Jung:
"For the database schema, I think it should not be the main software design slide. It can stay as backup if the supervisor or marker asks about the data model."
Edwin:
"Agreed. For system architecture, I have the current diagram ready, and it matches the simplified flow: users, web dashboard, backend, PostgreSQL, local LLM, PDF report, and Docker deployment. That card can move to Completed.
For the Final Proposal Slides card, that should stay In Progress because the deck still needs final cleanup. And the supervisor meeting card should also stay In Progress until we consult Mr Soo tomorrow, Thursday 14 May."
Yuan Yu:
"I'll record that. Completed design cards can move to Completed after this review, but final slides and supervisor consultation stay In Progress."
Edwin:
"Good. So the Trello decision is: move the completed design and documentation items to Completed once the latest files are attached, and keep final slides plus supervisor consultation active."
Decision:
Completed design/documentation work will be moved to Completed in Trello. Final Proposal Slides and supervisor consultation remain In Progress until the full deck is reviewed and the supervisor is consulted on Thursday, 14 May 2026.
Rationale:
This keeps Trello aligned with actual progress. Finished design deliverables should not remain in the active sprint, while the final deck and supervisor consultation are still active because they affect sign-off.

[15:00] Item 3 - UI/UX Design Review
Edwin:
"Item 3 - UI/UX design review. For this part, let's keep it more freestyle. We are checking the simplified UI/UX page and deciding what should be added, removed, or improved before the screenshots go into the final presentation.
The key question is: if the marker sees these screens, can they understand the staff workflow without us over-explaining?"
Freestyle Discussion
Confirmation:
All members agree to use the simplified UI/UX walkthrough approach for Slides 7 and 8.

[28:00] Item 4 - Final Presentation Slide Discussion
Edwin:
"Item 4 - final presentation slide discussion. I checked the current final presentation PDF as a reference. The overall slide order is close to what we need, but there are still things we should clean up before we treat it as final.
This discussion can also be freestyle. Let's go through what needs to be added, fixed, or confirmed."
Freestyle Discussion - Final Presentation PDF
Yuan Yu:
"The deck already follows the general requirement: problem, goals, requirements, stakeholders, WBS, UI/UX, architecture, timeline, scope, challenges, teamwork, and project management."
Sharmanne:
"But some speaker labels are still blank, right?"
Edwin:
"Yes. Several slides still show just 'Speaker:' without a name. We should fill those in so the presentation looks complete."
Wen Jung:
"The Gantt chart slide also needs checking. We need to make sure the spelling and chart content are correct."
Edwin:
"Yes. Also, if the final deck requirement is exactly 14 slides, we need to ask whether the Thank You slide is allowed as an extra closing slide or whether it should be removed. The PDF currently has a Thank You page, so we should confirm this with the supervisor."
Yuan Yu:
"For Slide 9, the architecture wording should match our current simplified diagram."
Edwin:
"Agreed. We should avoid wording that sounds too implementation-specific for now. The key sentence should be that the role-based dashboard connects Handbook data, CSV grades, LO calculations, local AI summaries, and PDF reporting."
Sharmanne:
"For the challenge slide, we should keep PDPA, Handbook dependency, different assessment structures, local LLM consistency, and role permissions."
Edwin:
"Yes. Those are stronger and more defensible than the old constraints."
Slide 6 - WBS Review
Edwin:
"For WBS, I have finished the current WBS slide structure, so we should review whether it is correct.
The current WBS structure starts from the main deliverable: Student Academic Performance Dashboard. Then it breaks into six work packages:
Requirements and Scope, UI/UX Prototype, Backend and Database, Data Ingestion, Analytics and Reporting, and Testing and Deployment."
Wen Jung:
"That structure is better than listing dates because WBS should break down work packages, not schedule."
Yuan Yu:
"What should we say under each package?"
Edwin:
"For Requirements and Scope: stakeholder requirements, role permissions, and scope validation.
For UI/UX Prototype: login and dashboard, mapping and assessment screens, CSV, admin, and report views.
For Backend and Database: authentication and roles, unit and assessment schema, and mapping, grade, and report storage.
For Data Ingestion: Handbook scraper, manual confirmation fallback, and CSV validation.
For Analytics and Reporting: LO calculation engine, dashboard filters, local LLM summary, and PDF export.
For Testing and Deployment: mock data testing, Docker deployment, documentation, and handover."
Sharmanne:
"That matches the project scope better. The older WBS labels like frontend pipeline or AI feature integration feel less consistent."
Edwin:
"Exactly. So we follow the current WBS structure in the slide."
Slide 9 - System Architecture Review
Edwin:
"For architecture, the current diagram should show the simple flow: Users go into the Web Dashboard, the dashboard connects to the FastAPI backend, Handbook data and CSV grades feed into the backend, PostgreSQL stores the structured data, the local LLM drafts summaries, and staff export a reviewed PDF report."
Yuan Yu:
"Do we need to show ERD?"
Edwin:
"Not as the main slide. ERD can be backup. The architecture slide explains the full system faster."
Wen Jung:
"Should students appear as users?"
Edwin:
"No. Students are not direct users in this phase. The direct users are Coordinator, Lecturer, and Management."
Decision:
The final presentation PDF will be used as a reference, but the team will clean up speaker labels, WBS labels, architecture wording, Gantt chart details, spelling, and the slide count question. The current WBS structure and current system architecture diagram will be used for the final deck.
Rationale:
The current deck already follows the broad unit coordinator requirement, but the remaining cleanup affects professionalism, marking clarity, and supervisor sign-off.
Confirmation:
All members agree to use the current WBS and system architecture direction, subject to supervisor feedback on Thursday, 14 May 2026.

[48:00] Item 5 - Task Assignments
Edwin:
"Item 5 - task assignments. Based on the Trello review and slide discussion, let's confirm what each person needs to do next."
Task wediscuss one by one in trello 
Owner
Deadline
Update and polish Slides 1-4
Sharmanne
14 May
Fill missing speaker names and check opening slide details
Sharmanne
14 May
Review stakeholder/challenge wording and support Slide 12
Yuan Yu
14 May
skip
Yuan Yu
13 May
Finalise WBS slide visual and wording
Edwin
14 May
Finalise system architecture slide visual and wording
Edwin
14 May
Check UI/UX screenshots and decide Slide 7-8 layout
Edwin, Sharmanne, Yuan Yu
14 May
Check timeline/Gantt chart and scope slide
Wen Jung
14 May
skip
Wen Jung
14 May
Prepare supervisor consultation questions
All
14 May

Yuan Yu:
"I'll record these tasks in the minutes and update the action list."
Edwin:
"Good. The main thing is that by tomorrow, we should have a deck that is ready to show to the supervisor, even if it still needs feedback."



[57:00] Item 6 - Supervisor Consultation Plan, Next Meeting, and Close
Edwin:
"Final item - supervisor consultation and close.
Since the unit coordinator requirement says we should discuss with our team supervisor before sign-off, we should consult Mr Soo on Thursday, 14 May 2026. The main things to ask are: whether our 14-slide structure is correct, whether the WBS format is acceptable, what type of data or charts should appear in the Gantt/timeline slide, whether the Thank You slide is allowed as an extra slide, and whether the architecture slide is enough or if he wants ERD as well."
Sharmanne:
"We should also ask whether both supervisors need to appear on Slide 1."
Wen Jung:
"And confirm whether the scope and challenge slides are phrased correctly."
Yuan Yu:
"I'll write those as supervisor consultation questions."
Edwin:
"Good. Quick recap of tonight: we confirmed full attendance, reviewed the Trello action items, decided which cards can move to Completed, reviewed the simplified UI/UX screens, checked the final presentation PDF as reference, reviewed the WBS and architecture slides, and assigned the next tasks.
Next step is to consult Mr Soo on Thursday, 14 May 2026, then update the deck based on his feedback. Our next internal review should be Friday, 15 May 2026 at 10:00 PM on Zoom, so we can check the full deck after the supervisor consultation.
Any final questions before we close?"
All:
"All good."
Edwin:
"Great. Thanks everyone. Meeting 04 is officially closed."
[Stop recording]

Supervisor Consultation Questions For Thursday, 14 May 2026
Is the final deck expected to be exactly 14 slides, or is a Thank You slide acceptable as an extra closing slide?
Are both Mr Soo Wooi King and Dr Tan Chee Keong required on the title slide?
Is the module-based WBS structure acceptable for Slide 6?
Should Slide 9 use system architecture only, or should we include ERD as backup/supporting material?
What type of chart or data should be shown on the Gantt/timeline slide?
Are the challenge points acceptable: PDPA data access, Handbook dependency, assessment structure variation, local LLM consistency, and role permissions?
Is the current scope phrasing acceptable for in-scope and out-of-scope items?
Next Meeting
Proposed next internal meeting: Friday, 15 May 2026
Time: 10:00 PM
Location: Zoom
Purpose: Full deck review after supervisor consultation, script rehearsal, visual consistency check, and final sign-off preparation.
Final Checks
Keep the required 14-slide structure.
Confirm whether the Thank You slide counts as an extra slide.
Follow the unit coordinator's final proposal requirements.
Keep WSM as backup, not a main slide.
Use the current module-based WBS structure.
Use Slides 7 and 8 for UI/UX walkthrough.
Use Slide 9 for system architecture, not ERD, unless the supervisor asks.
Do not list students as direct users in this phase.
Use local LLM wording, not external AI API.
Show PDF export consistently in requirements, scope, UI/UX, and architecture.
Move completed Trello tasks to Completed after attaching the latest files.