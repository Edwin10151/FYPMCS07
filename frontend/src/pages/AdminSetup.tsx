import { useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import AdminNav from "../components/AdminNav";
import { useSession } from "../useSession";
import { ACADEMIC_PERIODS, ENROLMENT_BATCHES, STAFF_RECORDS, UNIT_OFFERINGS } from "../mockData";
import "./AdminSetup.css";

type TaskStatus = "done" | "progress" | "todo" | "locked";

const STATUS_LABEL: Record<TaskStatus, string> = {
  done: "Complete",
  progress: "In progress",
  todo: "Not started",
  locked: "Opens later",
};

type Task = {
  title: string;
  desc: string;
  detail: string;
  status: TaskStatus;
  to: string;
  cta: string;
};

type TaskGroup = { label: string; note: string; tasks: Task[] };

export default function AdminSetup() {
  const session = useSession();
  const [periodId, setPeriodId] = useState(ACADEMIC_PERIODS.find((p) => p.status === "active")?.id ?? ACADEMIC_PERIODS[0].id);

  if (!session) return null;

  const period = ACADEMIC_PERIODS.find((p) => p.id === periodId)!;
  const units = UNIT_OFFERINGS.filter((u) => u.periodId === periodId);
  const withCoordinator = units.filter((u) => u.staff.some((s) => s.role === "coordinator"));
  const unsynced = units.filter((u) => !u.handbookSynced);
  const replaced = units.filter((u) => u.replacedBy);
  const batches = ENROLMENT_BATCHES.filter((b) => b.periodId === periodId);
  const unitsWithEnrolments = new Set(batches.filter((b) => b.unitCode !== "All units").map((b) => b.unitCode));
  const pendingStaff = STAFF_RECORDS.filter((s) => s.status === "pending");
  const isArchived = period.status === "archived";

  const groups: TaskGroup[] = [
    {
      label: "Beginning of semester",
      note: "Do these in order — units belong to a period, and staff are assigned to units.",
      tasks: [
        {
          title: "Create the academic period",
          desc: "Add the year and teaching period, e.g. 2026 S1, and set its teaching dates.",
          detail: `${period.label} exists · ${period.status === "active" ? "active teaching period" : STATUS_LABEL.done}`,
          status: "done",
          to: "/admin/periods",
          cta: "Manage periods",
        },
        {
          title: "Add units to the period",
          desc: "Register each unit offering running this period, e.g. FIT3161, with its credit points.",
          detail: units.length ? `${units.length} units added${unsynced.length ? ` · ${unsynced.length} awaiting handbook sync` : " · all synced"}` : "No units added yet",
          status: units.length === 0 ? "todo" : unsynced.length ? "progress" : "done",
          to: "/admin/units",
          cta: "Add or review units",
        },
        {
          title: "Assign staff to units",
          desc: "Give each unit a coordinator by staff ID, then add the lecturers and tutors teaching it.",
          detail: units.length
            ? `${withCoordinator.length} of ${units.length} units have a coordinator`
            : "Add units first",
          status: units.length === 0 ? "todo" : withCoordinator.length === units.length ? "done" : "progress",
          to: "/admin/units",
          cta: "Assign staff",
        },
      ],
    },
    {
      label: "Periodic — during semester",
      note: "Repeat these whenever enrolments change, new staff join, or a unit code changes.",
      tasks: [
        {
          title: "Upload the student list",
          desc: "Load student IDs and names per batch so grade uploads can be matched to real enrolments.",
          detail: batches.length
            ? `${period.studentCount.toLocaleString()} students registered · ${unitsWithEnrolments.size} of ${units.length} units loaded`
            : `No enrolments loaded for ${period.label} yet`,
          status: batches.length === 0 ? "todo" : unitsWithEnrolments.size < units.length ? "progress" : "done",
          to: "/admin/enrolments",
          cta: "Upload enrolments",
        },
        {
          title: "Add new staff",
          desc: "Create staff records by ID for new appointments, individually or from a staff list.",
          detail: pendingStaff.length
            ? `${STAFF_RECORDS.length} staff on file · ${pendingStaff.length} pending activation`
            : `${STAFF_RECORDS.length} staff on file · all activated`,
          status: pendingStaff.length ? "progress" : "done",
          to: "/admin/staff",
          cta: "Manage staff records",
        },
        {
          title: "Edit or retire unit codes",
          desc: "Rename a unit code, or record the replacement code when a unit is superseded.",
          detail: replaced.length
            ? `${replaced.map((u) => `${u.code} → ${u.replacedBy}`).join(", ")}`
            : "No unit code changes recorded this period",
          status: replaced.length ? "progress" : "done",
          to: "/admin/units",
          cta: "Edit units",
        },
      ],
    },
    {
      label: "End of semester",
      note: "Once grades are in and coordinators have signed off on their mappings.",
      tasks: [
        {
          title: "Review outcome attainment",
          desc: "Check every unit has published LO attainment before the period is closed off.",
          detail: isArchived ? "Period archived — reports are read-only" : "Available once all grade uploads are committed",
          status: isArchived ? "done" : "locked",
          to: "/dashboard",
          cta: "Open dashboard",
        },
        {
          title: "Archive the period",
          desc: "Lock the period to stop further uploads while keeping its data for accreditation.",
          detail: isArchived ? `${period.label} is archived` : `${period.label} is still ${period.status}`,
          status: isArchived ? "done" : "locked",
          to: "/admin/periods",
          cta: "Manage periods",
        },
      ],
    },
  ];

  const allTasks = groups.flatMap((g) => g.tasks);
  const actionable = allTasks.filter((t) => t.status !== "locked");
  const complete = actionable.filter((t) => t.status === "done").length;
  const progressPct = Math.round((complete / actionable.length) * 100);

  return (
    <div className="app">
      <Sidebar user={session.user} />
      <main className="main">
        <div className="topbar">
          <div className="crumbs">
            Administration <span className="sep">›</span> <strong>Semester setup</strong>
          </div>
          <div className="top-actions">
            <span className="setup-period-lbl">Period</span>
            <select className="adm-select" value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
              {ACADEMIC_PERIODS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                  {p.status === "active" ? " · active" : p.status === "planning" ? " · planning" : " · archived"}
                </option>
              ))}
            </select>
            <Link to="/admin/periods" className="btn primary">
              + New period
            </Link>
          </div>
        </div>

        <div className="content">
          <div className="unit-banner">
            <div>
              <h1 style={{ fontSize: 26 }}>Semester setup</h1>
              <div className="sub">
                Faculty of IT &nbsp;·&nbsp; Everything an administrator needs to open, run and close a teaching period — in the
                order it needs doing.
              </div>
            </div>
          </div>

          <AdminNav />

          <div className="setup-progress-card">
            <div className="setup-progress-top">
              <div>
                <div className="setup-period">
                  <span className="adm-code">{period.label}</span>
                  <span className={`adm-status ${period.status}`}>
                    <span className="d" />
                    {period.status === "active" ? "Active teaching period" : period.status === "planning" ? "Being planned" : "Archived"}
                  </span>
                </div>
                <div className="setup-period-sub">
                  {units.length} units · {period.studentCount.toLocaleString()} students registered · {period.staffCount} staff
                </div>
              </div>
              <div className="setup-progress-num">
                <span className="n">{complete}</span>
                <span className="d">/ {actionable.length} tasks done</span>
              </div>
            </div>
            <div className="adm-progress">
              <div className="fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {groups.map((group) => (
            <section key={group.label} className="setup-group">
              <div className="setup-group-head">
                <h3>{group.label}</h3>
                <p>{group.note}</p>
              </div>
              <div className="setup-grid">
                {group.tasks.map((task, i) => (
                  <div key={task.title} className={`setup-card ${task.status}`}>
                    <div className="setup-card-top">
                      <div className="setup-n">{task.status === "done" ? "✓" : i + 1}</div>
                      <span className={`setup-pill ${task.status}`}>{STATUS_LABEL[task.status]}</span>
                    </div>
                    <div className="setup-title">{task.title}</div>
                    <p className="setup-desc">{task.desc}</p>
                    <div className="setup-detail">{task.detail}</div>
                    {task.status === "locked" ? (
                      <span className="setup-cta disabled">{task.cta}</span>
                    ) : (
                      <Link to={task.to} className="setup-cta">
                        {task.cta} <span className="arr">→</span>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
