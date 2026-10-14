import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createAdminPeriod, deactivateAdminPeriod, errorMessage, getEmailReminderPreview, getStaffingStatus, previewDemoReset, resetAdminPeriod, resetDemoPeriod, sendEmailReminder, updateAdminPeriod, type DemoResetPreview, type EmailReminderPreview, type UnmatchedUnit } from "../api";
import AdminSidebar from "../components/AdminSidebar";
import "../components/AdminNav.css";
import { useAdminContext } from "../useAdminContext";
import "./UnitSelect.css";
import "./AdminSetup.css";

type TaskStatus = "not_started" | "working" | "done";

const TASK_STATUS_LABEL: Record<TaskStatus, string> = { not_started: "Not started", working: "Working", done: "Done" };
const TASK_STATUS_CLASS: Record<TaskStatus, string> = { not_started: "inactive", working: "pending", done: "committed" };

type Intake = "FEB" | "JUL" | "OCT";
const INTAKE_LABEL: Record<Intake, string> = { FEB: "February intake", JUL: "July intake", OCT: "October intake" };

function nextIntake(year: number, period: Intake): { year: number; period: Intake } {
  if (period === "FEB") return { year, period: "JUL" };
  if (period === "JUL") return { year, period: "OCT" };
  return { year: year + 1, period: "FEB" };
}

function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`adm-status ${TASK_STATUS_CLASS[status]}`}><span className="d" />{TASK_STATUS_LABEL[status]}</span>;
}

export default function AdminSetup() {
  const { session, data, error, loading, reload, selectedPeriod: active, selectPeriod } = useAdminContext();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [demoPreview, setDemoPreview] = useState<DemoResetPreview | null>(null);
  const [demoConfirmation, setDemoConfirmation] = useState("");
  const [demoBackupConfirmed, setDemoBackupConfirmed] = useState(false);
  const [demoApprovedConfirmed, setDemoApprovedConfirmed] = useState(false);
  const demoDialog = useRef<HTMLDialogElement>(null);
  const [flash, setFlash] = useState("");
  const [flashError, setFlashError] = useState("");
  const [staffingSnapshot, setStaffingSnapshot] = useState<{ committed: boolean; unmatched_units: UnmatchedUnit[] } | null>(null);
  const [staffingLoaded, setStaffingLoaded] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailPreview, setEmailPreview] = useState<EmailReminderPreview | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [periodForm, setPeriodForm] = useState({ year: new Date().getFullYear(), period: "FEB" as Intake, start_date: "", end_date: "" });
  const [allPeriodsOpen, setAllPeriodsOpen] = useState(false);

  const current = data?.periods.find((period) => period.status === "active") ?? null;
  const planning = data?.periods.find((period) => period.status === "planning") ?? null;

  const loadStaffingStatus = (semesterId: number) => {
    if (!session) return Promise.resolve();
    setStaffingLoaded(false);
    return getStaffingStatus(session.access_token, semesterId)
      .then((response) => setStaffingSnapshot(response.snapshot))
      .catch(() => setStaffingSnapshot(null))
      .finally(() => setStaffingLoaded(true));
  };

  useEffect(() => {
    if (!active) return;
    void loadStaffingStatus(active.semester_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, active?.semester_id]);

  useEffect(() => {
    if (demoPreview && demoDialog.current && !demoDialog.current.open) {
      demoDialog.current.showModal();
      demoDialog.current.querySelector<HTMLElement>("h3")?.focus();
    }
  }, [demoPreview]);

  if (!session) return null;

  const tutorListStatus: TaskStatus = !staffingLoaded || !staffingSnapshot
    ? "not_started"
    : !staffingSnapshot.committed || staffingSnapshot.unmatched_units.length > 0
    ? "working"
    : "done";

  const studentListStatus: TaskStatus = (active?.student_count ?? 0) > 0 ? "done" : "not_started";

  const openCreate = () => {
    const latest = data?.periods[0];
    const upcoming = latest ? nextIntake(latest.year, latest.period) : { year: new Date().getFullYear(), period: "FEB" as Intake };
    setPeriodForm({ ...upcoming, start_date: "", end_date: "" });
    setCreateOpen(true);
  };

  const createSemester = async () => {
    setWorking(true); setFlashError("");
    try {
      const status = current ? "planning" : "active";
      await createAdminPeriod(session.access_token, {
        year: periodForm.year,
        period: periodForm.period,
        start_date: periodForm.start_date || null,
        end_date: periodForm.end_date || null,
        status,
      });
      setFlash(`${periodForm.year} ${periodForm.period} was created${status === "active" ? " and activated" : " for future setup"}.`);
      setCreateOpen(false);
      await reload();
    } catch (err) { setFlashError(errorMessage(err)); } finally { setWorking(false); }
  };

  const activatePlanningSemester = async () => {
    const target = active?.status === "planning" ? active : planning;
    if (!target) return;
    setWorking(true); setFlashError("");
    try {
      await updateAdminPeriod(session.access_token, target.semester_id, {
        start_date: target.start_date,
        end_date: target.end_date,
        status: "active",
      });
      setFlash(`${target.year} ${target.period} is now the active semester.`);
      await reload();
    } catch (err) { setFlashError(errorMessage(err)); } finally { setWorking(false); }
  };

  const deactivate = async () => {
    if (!active) return;
    setWorking(true);
    setFlashError("");
    try {
      const result = await deactivateAdminPeriod(session.access_token, active.semester_id);
      setFlash(`${active.year} ${active.period} was archived. ${result.next_year} ${result.next_period} is now the active semester, ready for new uploads.`);
      setConfirmOpen(false);
      await reload();
    } catch (err) {
      setFlashError(errorMessage(err));
    } finally {
      setWorking(false);
    }
  };

  const resetSemesterData = async () => {
    if (!active) return;
    setResetting(true);
    setFlashError("");
    try {
      const result = await resetAdminPeriod(session.access_token, active.semester_id, resetConfirmation);
      setFlash(`${active.year} ${active.period} was reset: ${result.offerings_deleted} unit offerings removed. All staff accounts and other semesters were retained.`);
      setResetConfirmOpen(false);
      await Promise.all([reload(), loadStaffingStatus(active.semester_id)]);
    } catch (err) {
      setFlashError(errorMessage(err));
    } finally {
      setResetting(false);
    }
  };

  const openDemoReset = async () => {
    if (!active) return;
    setWorking(true); setFlashError(""); setFlash("");
    setDemoConfirmation(""); setDemoBackupConfirmed(false); setDemoApprovedConfirmed(false);
    try {
      setDemoPreview(await previewDemoReset(session.access_token, active.semester_id));
    } catch (err) { setFlashError(errorMessage(err)); } finally { setWorking(false); }
  };

  const resetDemoData = async () => {
    if (!demoPreview) return;
    setResetting(true); setFlashError("");
    try {
      const result = await resetDemoPeriod(session.access_token, demoPreview, demoConfirmation, demoBackupConfirmed, demoApprovedConfirmed);
      setFlash(`${demoPreview.year} ${demoPreview.period} demo data cleared. ${result.offerings_retained} unit offerings, tutor assignments and all staff accounts were retained.`);
      setDemoPreview(null);
      await reload();
    } catch (err) { setFlashError(errorMessage(err)); } finally { setResetting(false); }
  };

  const openEmailReminder = async () => {
    if (!active) return;
    setEmailBusy(true); setFlashError("");
    try {
      const preview = await getEmailReminderPreview(session.access_token, active.semester_id);
      setEmailPreview(preview); setEmailSubject(preview.subject); setEmailBody(preview.body); setEmailOpen(true);
    } catch (err) { setFlashError(errorMessage(err)); } finally { setEmailBusy(false); }
  };

  const sendReminder = async () => {
    if (!active || !emailPreview) return;
    setEmailBusy(true); setFlashError("");
    try {
      const result = await sendEmailReminder(session.access_token, active.semester_id, emailSubject.trim(), emailBody.trim());
      setFlash(`${result.sent} reminder${result.sent === 1 ? "" : "s"} sent${result.failed ? `; ${result.failed} failed` : ""}.`);
      setEmailOpen(false);
    } catch (err) { setFlashError(errorMessage(err)); } finally { setEmailBusy(false); }
  };

  return (
    <div className="app admin-period-page">
      <AdminSidebar user={session.user} />
      <main className="main">
        <div className="topbar">
          <div className="crumbs"><Link to="/units">Home</Link><span className="sep">›</span><strong>Semester Setup</strong></div>
        </div>
        <div className="content">
          <div className="unit-banner">
            <div><h1 style={{ fontSize: 26 }}>Semester Setup</h1></div>
            <div className="unit-banner-right">
              <select className="btn semester-switch" aria-label="Semester" title="Select semester" value={active?.semester_id ?? ""} disabled={loading || working || resetting} onChange={(event) => { selectPeriod(Number(event.target.value)); setResetConfirmOpen(false); setConfirmOpen(false); setEmailOpen(false); setFlash(""); setFlashError(""); }}>
                {data?.periods.map((period) => <option key={period.semester_id} value={period.semester_id}>{period.year} {period.period} · {period.status}</option>)}
              </select>
              <button className="btn" onClick={() => setAllPeriodsOpen(true)}>All semesters</button>
              <button className="btn" disabled={working} onClick={openCreate}>Add semester</button>
              {session.user.role_name === "super_admin" && <>
                <button className="btn danger" disabled={working || resetting || !active || active.status === "archived"} onClick={() => void openDemoReset()}>Reset demo data</button>
                <button className="btn danger" disabled={working || resetting || !active || active.status === "archived"} onClick={() => { setResetConfirmation(""); setFlashError(""); setResetConfirmOpen(true); }}>Reset full semester</button>
              </>}
              <button
                className="btn primary"
                disabled={!active || emailBusy}
                onClick={() => void openEmailReminder()}
              >
                {emailBusy ? "Loading..." : "Email coordinators"}
              </button>
            </div>
          </div>

          {(error || flashError) && <div className="adm-flash" style={{ background: "var(--risk-bg)", borderColor: "#F2D8CC", color: "var(--risk)" }}>{error || flashError}<span className="x" onClick={() => setFlashError("")}>✕</span></div>}
          {flash && <div className="adm-flash">{flash}<span className="x" onClick={() => setFlash("")}>✕</span></div>}

          {loading ? <div className="panel">Loading semester data...</div> : !active && planning ? (
            <div className="current-sem-card">
              <div className="current-sem-top">
                <div>
                  <div className="current-sem-eye">Semester awaiting activation</div>
                  <div className="current-sem-title">{planning.year} {planning.period}</div>
                  <span className="adm-status planning"><span className="d" />Planning</span>
                </div>
                <button className="btn primary" disabled={working} onClick={() => void activatePlanningSemester()}>{working ? "Activating..." : "Activate semester"}</button>
              </div>
              <div className="current-sem-stats">
                <div className="current-sem-stat"><span className="v">{planning.offering_count}</span><span className="l">Unit offerings</span></div>
                <div className="current-sem-stat"><span className="v">{planning.student_count.toLocaleString()}</span><span className="l">Students registered</span></div>
                <div className="current-sem-stat"><span className="v">{planning.staff_count}</span><span className="l">Staff on the roster</span></div>
              </div>
            </div>
          ) : !active ? (
            <div className="panel">
              <h4>No semester yet</h4>
              <p>Add the first semester to begin setting up unit offerings, staff, and students.</p>
            </div>
          ) : (
            <div className="current-sem-card">
              <div className="current-sem-top">
                <div>
                  <div className="current-sem-eye">Selected semester</div>
                  <div className="current-sem-title">{active.year} {active.period}</div>
                  <span className={`adm-status ${active.status}`}><span className="d" />{active.status}</span>
                </div>
                {active.status === "active" && <button className="btn danger" onClick={() => setConfirmOpen(true)}>Archive semester</button>}
                {active.status === "planning" && !current && <button className="btn primary" disabled={working} onClick={() => void activatePlanningSemester()}>Activate semester</button>}
              </div>
              <div className="current-sem-stats">
                <div className="current-sem-stat"><span className="v">{active.offering_count}</span><span className="l">Unit offerings</span></div>
                <div className="current-sem-stat"><span className="v">{active.student_count.toLocaleString()}</span><span className="l">Students registered</span></div>
                <div className="current-sem-stat"><span className="v">{active.staff_count}</span><span className="l">Staff on the roster</span></div>
              </div>
            </div>
          )}

          <div className="us-section-label" style={{ marginTop: 24 }}>Uploads for this semester</div>
          <div className="admin-portal-grid">
            <Link className="admin-portal-tile" to={active ? `/admin/tutors?semester_id=${active.semester_id}` : "/admin/tutors"}>
              <div className="admin-portal-tile-head">
                <div className="admin-portal-tile-icon">◨</div>
                <TaskStatusBadge status={tutorListStatus} />
              </div>
              <h3>Tutor List</h3>
              <p>Upload the semester's staffing roster spreadsheet (lecture, tutorial and laboratory allocations) and match it against unit offerings.</p>
              <div className="admin-portal-tile-cta">Open Tutor List <span className="unit-arrow">→</span></div>
            </Link>
            <Link className="admin-portal-tile" to={active ? `/admin/enrolments?semester_id=${active.semester_id}` : "/admin/enrolments"}>
              <div className="admin-portal-tile-head">
                <div className="admin-portal-tile-icon">◧</div>
                <TaskStatusBadge status={studentListStatus} />
              </div>
              <h3>Student List</h3>
              <p>Upload the semester's student list — ID and full name — so grade imports can match against it.</p>
              <div className="admin-portal-tile-cta">Open Student List <span className="unit-arrow">→</span></div>
            </Link>
          </div>
        </div>
      </main>

      {confirmOpen && active && (
        <div className="adm-modal-overlay" onClick={() => !working && setConfirmOpen(false)}>
          <div className="adm-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Deactivate {active.year} {active.period}?</h3>
            <div className="adm-modal-sub">Are you sure you want to deactivate this semester? Once deactivated, this semester will be archived and its data logged into the database. The page will reset to the next semester, ready for new uploads.</div>
            <div className="adm-modal-actions">
              <button className="btn" disabled={working} onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button className="btn danger" disabled={working} onClick={() => void deactivate()}>{working ? "Deactivating..." : "Deactivate semester"}</button>
            </div>
          </div>
        </div>
      )}

      {allPeriodsOpen && (
        <div className="adm-modal-overlay" onClick={() => setAllPeriodsOpen(false)}>
          <div className="adm-modal wide" onClick={(event) => event.stopPropagation()}>
            <h3>All semesters</h3>
            <div className="adm-modal-sub">Every teaching period on file, past, present, and upcoming.</div>
            <div className="adm-card" style={{ marginBottom: 16 }}>
              <table className="adm-tbl">
                <thead><tr><th>Semester</th><th>Status</th><th>Unit offerings</th><th>Students</th><th>Staff</th></tr></thead>
                <tbody>
                  {(data?.periods ?? []).map((period) => (
                    <tr key={period.semester_id}>
                      <td><span className="nm">{period.year} {period.period}</span></td>
                      <td><span className={`adm-status ${period.status}`}><span className="d" />{period.status === "active" ? "Active" : period.status === "planning" ? "Planning" : "Archived"}</span></td>
                      <td>{period.offering_count}</td>
                      <td>{period.student_count.toLocaleString()}</td>
                      <td>{period.staff_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data?.periods.length && <div className="adm-empty">No semesters on file yet.</div>}
            </div>
            <div className="adm-modal-actions">
              <button className="btn primary" onClick={() => setAllPeriodsOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="adm-modal-overlay" onClick={() => !working && setCreateOpen(false)}>
          <div className="adm-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Add semester</h3>
            <div className="adm-modal-sub">The first semester becomes active immediately. Additional semesters remain in planning until the current semester is archived.</div>
            <div className="adm-form">
              <div className="adm-form-2">
                <label className="adm-field"><span className="lbl">Year</span><input type="number" min="2020" max="2100" value={periodForm.year} onChange={(event) => setPeriodForm({ ...periodForm, year: Number(event.target.value) })} /></label>
                <label className="adm-field"><span className="lbl">Intake</span><select value={periodForm.period} onChange={(event) => setPeriodForm({ ...periodForm, period: event.target.value as Intake })}>{(Object.keys(INTAKE_LABEL) as Intake[]).map((code) => <option key={code} value={code}>{INTAKE_LABEL[code]}</option>)}</select></label>
              </div>
              <div className="adm-form-2">
                <label className="adm-field"><span className="lbl">Start date</span><input type="date" value={periodForm.start_date} onChange={(event) => setPeriodForm({ ...periodForm, start_date: event.target.value })} /></label>
                <label className="adm-field"><span className="lbl">End date</span><input type="date" value={periodForm.end_date} onChange={(event) => setPeriodForm({ ...periodForm, end_date: event.target.value })} /></label>
              </div>
            </div>
            <div className="adm-modal-actions">
              <button className="btn" disabled={working} onClick={() => setCreateOpen(false)}>Cancel</button>
              <button className="btn primary" disabled={working || periodForm.year < 2020 || periodForm.year > 2100 || (!!periodForm.start_date && !!periodForm.end_date && periodForm.start_date > periodForm.end_date)} onClick={() => void createSemester()}>{working ? "Creating..." : "Add semester"}</button>
            </div>
          </div>
        </div>
      )}

      {demoPreview && <dialog ref={demoDialog} className="adm-modal adm-demo-reset-dialog" aria-labelledby="demo-reset-title" onCancel={(event) => { if (resetting) event.preventDefault(); else setDemoPreview(null); }} onClose={() => setDemoPreview(null)}>
        <h3 id="demo-reset-title" tabIndex={-1}>Reset demo data for {demoPreview.year} {demoPreview.period}?</h3>
        <p className="adm-modal-sub">Keeps all staff accounts, passwords, {demoPreview.counts.offerings} unit offerings, tutor assignments and other semesters. Clears the selected semester's student list, Handbook setup, ULO/PLO mappings, assessments, grades, attainment and reports.</p>
        {!demoPreview.enabled && <p className="adm-modal-note" role="status">Demo reset is disabled on this server. The server administrator must enable it on a demo instance before this action can be used.</p>}
        <dl className="demo-reset-counts">
          <dt>Student list entries</dt><dd>{demoPreview.counts.students.toLocaleString()}</dd>
          <dt>Unit enrolments</dt><dd>{demoPreview.counts.enrolments.toLocaleString()}</dd>
          <dt>Grade uploads</dt><dd>{demoPreview.counts.grade_uploads.toLocaleString()}</dd>
          <dt>Assessment grades</dt><dd>{demoPreview.counts.assessment_grades.toLocaleString()}</dd>
          <dt>Component scores</dt><dd>{demoPreview.counts.component_scores.toLocaleString()}</dd>
          <dt>Assessments</dt><dd>{demoPreview.counts.assessments.toLocaleString()}</dd>
          <dt>Learning outcomes</dt><dd>{demoPreview.counts.learning_outcomes.toLocaleString()}</dd>
          <dt>Handbook imports</dt><dd>{demoPreview.counts.handbook_imports.toLocaleString()}</dd>
          <dt>Reports</dt><dd>{demoPreview.counts.reports.toLocaleString()}</dd>
        </dl>
        {demoPreview.approved_reports.length > 0 && <div className="adm-modal-note">
          <strong>{demoPreview.approved_reports.length} approved report(s) will also be deleted:</strong>
          <ul>{demoPreview.approved_reports.map((report) => <li key={report.report_id}>{report.unit_code} (report {report.report_id})</li>)}</ul>
          <label className="demo-reset-check"><input type="checkbox" checked={demoApprovedConfirmed} disabled={resetting} onChange={(event) => setDemoApprovedConfirmed(event.target.checked)} /><span>I confirm these are demo reports and may be deleted.</span></label>
        </div>}
        <label className="demo-reset-check"><input type="checkbox" checked={demoBackupConfirmed} disabled={resetting} onChange={(event) => setDemoBackupConfirmed(event.target.checked)} /><span>A database backup has been taken and checked for restoration. This action does not create a backup.</span></label>
        <label className="adm-field"><span className="lbl">Type {demoPreview.confirmation} to confirm</span><input autoComplete="off" value={demoConfirmation} disabled={resetting} onChange={(event) => setDemoConfirmation(event.target.value)} /></label>
        {flashError && <p role="alert">{flashError}</p>}
        <div className="adm-modal-actions">
          <button className="btn" autoFocus disabled={resetting} onClick={() => setDemoPreview(null)}>Cancel</button>
          <button className="btn danger" disabled={resetting || !demoPreview.enabled || !demoBackupConfirmed || (demoPreview.approved_reports.length > 0 && !demoApprovedConfirmed) || demoConfirmation.trim() !== demoPreview.confirmation} onClick={() => void resetDemoData()}>{resetting ? "Resetting..." : "Clear demo data"}</button>
        </div>
      </dialog>}

      {resetConfirmOpen && active && (
        <div className="adm-modal-overlay" onClick={() => !resetting && setResetConfirmOpen(false)}>
          <div className="adm-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Reset all data for {active.year} {active.period}?</h3>
            <div className="adm-modal-sub">
              This permanently deletes every unit offering for this semester, and everything built on them: Tutor List staffing and dashboard access, Student List enrolments, assessments, ULOs, PLO mappings, grade uploads and AI reports. Use this when there are too many changes to fix by hand and you'd rather redo the semester from scratch.
              <br /><br />
              All staff accounts, passwords, roles, student identities and other semesters remain unchanged. Semesters containing approved reports cannot be reset.
            </div>
            <label className="adm-field"><span className="lbl">Type {active.year} {active.period} to confirm</span><input autoComplete="off" value={resetConfirmation} onChange={(event) => setResetConfirmation(event.target.value)} /></label>
            {flashError && <p role="alert">{flashError}</p>}
            <div className="adm-modal-actions">
              <button className="btn" disabled={resetting} onClick={() => setResetConfirmOpen(false)}>Cancel</button>
              <button className="btn danger" disabled={resetting || resetConfirmation.trim() !== `${active.year} ${active.period}`} onClick={() => void resetSemesterData()}>{resetting ? "Resetting..." : "Reset semester data"}</button>
            </div>
          </div>
        </div>
      )}

      {emailOpen && active && emailPreview && (
        <div className="adm-modal-overlay" onClick={() => !emailBusy && setEmailOpen(false)}>
          <div className="adm-modal wide" onClick={(event) => event.stopPropagation()}>
            <h3>Email unit coordinators</h3>
            <div className="adm-modal-sub">{emailPreview.recipients.length} active coordinator{emailPreview.recipients.length === 1 ? "" : "s"} assigned to {active.year} {active.period}.</div>
            {!emailPreview.configured && <div className="adm-flash" style={{ background: "var(--risk-bg)", borderColor: "#F2D8CC", color: "var(--risk)" }}>Email delivery is not configured on this server.</div>}
            <div className="adm-card" style={{ marginBottom: 16 }}><table className="adm-tbl"><thead><tr><th>Recipient</th><th>Assigned units</th></tr></thead><tbody>{emailPreview.recipients.map((recipient) => <tr key={recipient.user_id}><td><span className="nm">{recipient.full_name}</span><span className="em">{recipient.email}</span></td><td>{recipient.units}</td></tr>)}</tbody></table>{!emailPreview.recipients.length && <div className="adm-empty">No active unit coordinators are assigned.</div>}</div>
            <div className="adm-form">
              <label className="adm-field"><span className="lbl">Subject</span><input value={emailSubject} maxLength={200} onChange={(event) => setEmailSubject(event.target.value)} /></label>
              <label className="adm-field"><span className="lbl">Message</span><textarea rows={6} value={emailBody} maxLength={4000} onChange={(event) => setEmailBody(event.target.value)} /></label>
            </div>
            <div className="adm-modal-actions">
              <button className="btn" disabled={emailBusy} onClick={() => setEmailOpen(false)}>Cancel</button>
              <button className="btn primary" disabled={emailBusy || !emailPreview.configured || !emailPreview.recipients.length || !emailSubject.trim() || !emailBody.trim()} onClick={() => void sendReminder()}>{emailBusy ? "Sending..." : `Send ${emailPreview.recipients.length} reminder${emailPreview.recipients.length === 1 ? "" : "s"}`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
