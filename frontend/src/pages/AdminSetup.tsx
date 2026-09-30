import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createAdminPeriod, deactivateAdminPeriod, errorMessage, getEmailReminderPreview, getStaffingStatus, resetAdminPeriod, sendEmailReminder, updateAdminPeriod, type EmailReminderPreview, type UnmatchedUnit } from "../api";
import AdminSidebar from "../components/AdminSidebar";
import "../components/AdminNav.css";
import { useAdminContext } from "../useAdminContext";
import "./UnitSelect.css";
import "./AdminSetup.css";

type TaskStatus = "not_started" | "working" | "done";

const TASK_STATUS_LABEL: Record<TaskStatus, string> = { not_started: "Not started", working: "Working", done: "Done" };
const TASK_STATUS_CLASS: Record<TaskStatus, string> = { not_started: "inactive", working: "pending", done: "committed" };

function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`adm-status ${TASK_STATUS_CLASS[status]}`}><span className="d" />{TASK_STATUS_LABEL[status]}</span>;
}

export default function AdminSetup() {
  const { session, data, error, loading, reload } = useAdminContext();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
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
  const [periodForm, setPeriodForm] = useState({ year: new Date().getFullYear(), period: "S1" as "S1" | "S2", start_date: "", end_date: "" });

  const active = data?.periods.find((period) => period.status === "active") ?? null;
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

  if (!session) return null;

  const tutorListStatus: TaskStatus = !staffingLoaded || !staffingSnapshot
    ? "not_started"
    : !staffingSnapshot.committed || staffingSnapshot.unmatched_units.length > 0
    ? "working"
    : "done";

  const offeringsThisSemester = data?.offerings.filter((offering) => offering.semester_id === active?.semester_id && offering.status !== "discontinued") ?? [];
  const latestBatchByOffering = new Map<number, { issue_count: number }>();
  for (const batch of data?.enrollment_batches ?? []) {
    if (!latestBatchByOffering.has(batch.offering_id)) latestBatchByOffering.set(batch.offering_id, batch);
  }
  const coveredOfferings = offeringsThisSemester.filter((offering) => latestBatchByOffering.has(offering.offering_id));
  const studentListStatus: TaskStatus =
    offeringsThisSemester.length === 0 || coveredOfferings.length === 0
      ? "not_started"
      : coveredOfferings.length < offeringsThisSemester.length || coveredOfferings.some((offering) => (latestBatchByOffering.get(offering.offering_id)?.issue_count ?? 0) > 0)
      ? "working"
      : "done";

  const openCreate = () => {
    const latest = data?.periods[0];
    setPeriodForm(latest
      ? { year: latest.period === "S1" ? latest.year : latest.year + 1, period: latest.period === "S1" ? "S2" : "S1", start_date: "", end_date: "" }
      : { year: new Date().getFullYear(), period: "S1", start_date: "", end_date: "" });
    setCreateOpen(true);
  };

  const createSemester = async () => {
    setWorking(true); setFlashError("");
    try {
      const status = active ? "planning" : "active";
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
    if (!planning) return;
    setWorking(true); setFlashError("");
    try {
      await updateAdminPeriod(session.access_token, planning.semester_id, {
        start_date: planning.start_date,
        end_date: planning.end_date,
        status: "active",
      });
      setFlash(`${planning.year} ${planning.period} is now the active semester.`);
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
      const result = await resetAdminPeriod(session.access_token, active.semester_id);
      const accountsNote = result.accounts_deleted > 0 ? ` ${result.accounts_deleted} staff account${result.accounts_deleted === 1 ? "" : "s"} with no other ties were removed too.` : "";
      setFlash(`${active.year} ${active.period} was reset — ${result.offerings_deleted} unit offering${result.offerings_deleted === 1 ? "" : "s"} and everything built on them were removed.${accountsNote} Ready to start over.`);
      setResetConfirmOpen(false);
      await Promise.all([reload(), loadStaffingStatus(active.semester_id)]);
    } catch (err) {
      setFlashError(errorMessage(err));
    } finally {
      setResetting(false);
    }
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
    <div className="app">
      <AdminSidebar user={session.user} />
      <main className="main">
        <div className="topbar">
          <div className="crumbs"><Link to="/units">Home</Link><span className="sep">›</span><strong>Semester Setup</strong></div>
        </div>
        <div className="content">
          <div className="unit-banner">
            <div><h1 style={{ fontSize: 26 }}>Semester Setup</h1><div className="sub">Manage the current teaching semester, then reach the Tutor List and Student List uploads.</div></div>
            <div className="unit-banner-right">
              <button className="btn" disabled={working} onClick={openCreate}>Add semester</button>
              <button className="btn danger" disabled={!active} onClick={() => setResetConfirmOpen(true)}>Reset Data</button>
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
                  <div className="current-sem-eye">Current semester</div>
                  <div className="current-sem-title">{active.year} {active.period}</div>
                  <span className="adm-status active"><span className="d" />Active</span>
                </div>
                <button className="btn danger" onClick={() => setConfirmOpen(true)}>Deactivate semester</button>
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
            <Link className="admin-portal-tile" to="/admin/tutors">
              <div className="admin-portal-tile-head">
                <div className="admin-portal-tile-icon">◨</div>
                <TaskStatusBadge status={tutorListStatus} />
              </div>
              <h3>Tutor List</h3>
              <p>Upload the semester's staffing roster spreadsheet (lecture, tutorial and laboratory allocations) and match it against unit offerings.</p>
              <div className="admin-portal-tile-cta">Open Tutor List <span className="unit-arrow">→</span></div>
            </Link>
            <Link className="admin-portal-tile" to="/admin/enrolments">
              <div className="admin-portal-tile-head">
                <div className="admin-portal-tile-icon">◧</div>
                <TaskStatusBadge status={studentListStatus} />
              </div>
              <h3>Student List</h3>
              <p>Upload a student list for a unit offering — ID and full name — so grade imports can match against it.</p>
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

      {createOpen && (
        <div className="adm-modal-overlay" onClick={() => !working && setCreateOpen(false)}>
          <div className="adm-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Add semester</h3>
            <div className="adm-modal-sub">The first semester becomes active immediately. Additional semesters remain in planning until the current semester is archived.</div>
            <div className="adm-form">
              <div className="adm-form-2">
                <label className="adm-field"><span className="lbl">Year</span><input type="number" min="2020" max="2100" value={periodForm.year} onChange={(event) => setPeriodForm({ ...periodForm, year: Number(event.target.value) })} /></label>
                <label className="adm-field"><span className="lbl">Semester</span><select value={periodForm.period} onChange={(event) => setPeriodForm({ ...periodForm, period: event.target.value as "S1" | "S2" })}><option value="S1">Semester 1</option><option value="S2">Semester 2</option></select></label>
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

      {resetConfirmOpen && active && (
        <div className="adm-modal-overlay" onClick={() => !resetting && setResetConfirmOpen(false)}>
          <div className="adm-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Reset all data for {active.year} {active.period}?</h3>
            <div className="adm-modal-sub">
              This permanently deletes every unit offering for this semester, and everything built on them: Tutor List staffing and dashboard access, Student List enrolments, assessments, ULOs, PLO mappings, grade uploads and AI reports. Use this when there are too many changes to fix by hand and you'd rather redo the semester from scratch.
              <br /><br />
              A coordinator or lecturer account is also removed, but only if it has no other tie anywhere in the system once this semester is cleared — so an account still linked to another semester, past or present, keeps working. Management and super admin accounts are never touched, including your own, and no other semester's data is ever modified.
            </div>
            <div className="adm-modal-actions">
              <button className="btn" disabled={resetting} onClick={() => setResetConfirmOpen(false)}>Cancel</button>
              <button className="btn danger" disabled={resetting} onClick={() => void resetSemesterData()}>{resetting ? "Resetting..." : "Reset all data"}</button>
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
