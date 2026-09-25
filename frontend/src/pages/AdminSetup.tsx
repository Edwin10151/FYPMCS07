import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deactivateAdminPeriod, errorMessage, getStaffingStatus, type UnmatchedUnit } from "../api";
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
  const [flash, setFlash] = useState("");
  const [flashError, setFlashError] = useState("");
  const [staffingSnapshot, setStaffingSnapshot] = useState<{ unmatched_units: UnmatchedUnit[] } | null>(null);
  const [staffingLoaded, setStaffingLoaded] = useState(false);

  const active = data?.periods.find((period) => period.status === "active") ?? null;

  useEffect(() => {
    if (!session || !active) return;
    setStaffingLoaded(false);
    getStaffingStatus(session.access_token, active.semester_id)
      .then((response) => setStaffingSnapshot(response.snapshot))
      .catch(() => setStaffingSnapshot(null))
      .finally(() => setStaffingLoaded(true));
  }, [session, active?.semester_id]);

  if (!session) return null;

  const tutorListStatus: TaskStatus = !staffingLoaded || !staffingSnapshot
    ? "not_started"
    : staffingSnapshot.unmatched_units.length > 0
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

  const emailReminderReady = tutorListStatus === "done" && studentListStatus === "done";

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
              <button
                className="btn primary"
                disabled={!emailReminderReady}
                title={emailReminderReady ? undefined : "please ensure the tutor list and student list set up is completed"}
              >
                Send Email Reminder
              </button>
            </div>
          </div>

          {(error || flashError) && <div className="adm-flash" style={{ background: "var(--risk-bg)", borderColor: "#F2D8CC", color: "var(--risk)" }}>{error || flashError}<span className="x" onClick={() => setFlashError("")}>✕</span></div>}
          {flash && <div className="adm-flash">{flash}<span className="x" onClick={() => setFlash("")}>✕</span></div>}

          {loading ? <div className="panel">Loading semester data...</div> : !active ? (
            <div className="panel">
              <h4>No active semester</h4>
              <p>The database has no semester with status "active". One is created automatically whenever a semester is deactivated — if none exists yet, it needs to be created directly in the database.</p>
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
    </div>
  );
}
