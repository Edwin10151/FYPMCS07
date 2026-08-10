import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import AdminNav from "../components/AdminNav";
import { useAdminContext } from "../useAdminContext";
import "./AdminSetup.css";

type TaskStatus = "done" | "progress" | "todo" | "locked";

const STATUS_LABEL: Record<TaskStatus, string> = {
  done: "Complete",
  progress: "In progress",
  todo: "Not started",
  locked: "Opens later",
};

export default function AdminSetup() {
  const { session, data, error, loading } = useAdminContext();
  const [periodId, setPeriodId] = useState<number | null>(null);

  useEffect(() => {
    if (!data || periodId) return;
    setPeriodId(data.periods.find((period) => period.status === "active")?.semester_id ?? data.periods[0]?.semester_id ?? null);
  }, [data, periodId]);

  const period = data?.periods.find((item) => item.semester_id === periodId) ?? null;
  const offerings = useMemo(
    () => data?.offerings.filter((offering) => offering.semester_id === period?.semester_id) ?? [],
    [data, period],
  );
  const batches = data?.enrollment_batches.filter((batch) => offerings.some((offering) => offering.offering_id === batch.offering_id)) ?? [];
  const mappedOfferings = offerings.filter((offering) => offering.handbook_url).length;
  const coordinatorsAssigned = offerings.filter((offering) => offering.coordinator_id).length;
  const enrolmentsReady = new Set(batches.map((batch) => batch.offering_id)).size;
  const activeStaff = data?.staff.filter((staff) => staff.is_active).length ?? 0;
  const gradeReady = offerings.filter((offering) => offering.committed_grade_upload_count > 0).length;

  if (!session) return null;

  const tasks: Array<{ title: string; description: string; detail: string; status: TaskStatus; to: string; cta: string }> = [
    {
      title: "Create the academic period",
      description: "Set up the year and semester before units, staff assignments, or enrolments are added.",
      detail: period ? `${period.year} ${period.period} is ${period.status}` : "No academic period exists",
      status: period ? "done" : "todo",
      to: "/admin/periods",
      cta: "Manage periods",
    },
    {
      title: "Add units to the period",
      description: "Register each unit offering and set its coordinator. Handbook content is imported later by the coordinator.",
      detail: offerings.length ? `${offerings.length} unit offering${offerings.length === 1 ? "" : "s"} · ${mappedOfferings} confirmed Handbook source${mappedOfferings === 1 ? "" : "s"}` : "No unit offerings yet",
      status: offerings.length === 0 ? "todo" : mappedOfferings === offerings.length ? "done" : "progress",
      to: "/admin/units",
      cta: "Manage offerings",
    },
    {
      title: "Assign staff to units",
      description: "Every active offering needs an accountable coordinator; lecturers can then access its grade workflow.",
      detail: offerings.length ? `${coordinatorsAssigned} of ${offerings.length} coordinator assignment${offerings.length === 1 ? "" : "s"} complete` : "Add units first",
      status: offerings.length === 0 ? "todo" : coordinatorsAssigned === offerings.length ? "done" : "progress",
      to: "/admin/units",
      cta: "Assign staff",
    },
    {
      title: "Upload student enrolments",
      description: "Import student ID and name for each unit offering before grades are uploaded.",
      detail: offerings.length ? `${enrolmentsReady} of ${offerings.length} offerings have a committed student list` : "Add units first",
      status: offerings.length === 0 || enrolmentsReady === 0 ? "todo" : enrolmentsReady === offerings.length ? "done" : "progress",
      to: "/admin/enrolments",
      cta: "Upload enrolments",
    },
    {
      title: "Maintain staff accounts",
      description: "Create internal staff records with a Monash email, role, and temporary password.",
      detail: `${activeStaff} active staff account${activeStaff === 1 ? "" : "s"}`,
      status: activeStaff ? "done" : "todo",
      to: "/admin/staff",
      cta: "Manage staff",
    },
    {
      title: "Review outcome attainment",
      description: "Once grade uploads are committed, calculated ULO attainment appears in the unit dashboard.",
      detail: period?.status === "archived" ? "Period is archived; data is retained for reporting" : gradeReady ? `${gradeReady} offering${gradeReady === 1 ? " has" : "s have"} committed grades` : "Available after a grade upload is committed",
      status: period?.status === "archived" || (offerings.length > 0 && gradeReady === offerings.length) ? "done" : gradeReady ? "progress" : "locked",
      to: "/dashboard",
      cta: "Open dashboard",
    },
  ];
  const completed = tasks.filter((task) => task.status === "done").length;
  const actionable = tasks.filter((task) => task.status !== "locked").length;

  return (
    <div className="app">
      <Sidebar user={session.user} />
      <main className="main">
        <div className="topbar">
          <div className="crumbs"><Link to="/units">Home</Link><span className="sep">›</span><strong>Semester setup</strong></div>
          <div className="top-actions">
            <span className="setup-period-lbl">Period</span>
            <select className="adm-select" value={period?.semester_id ?? ""} onChange={(event) => setPeriodId(Number(event.target.value))}>
              {data?.periods.map((item) => <option key={item.semester_id} value={item.semester_id}>{item.year} {item.period} · {item.status}</option>)}
            </select>
            <Link to="/admin/periods" className="btn primary">+ Add period</Link>
          </div>
        </div>
        <div className="content">
          <div className="unit-banner"><div><h1 style={{ fontSize: 26 }}>Semester setup</h1><div className="sub">Management workflow for unit offerings, staff accounts, enrolments, and grade-ready data.</div></div></div>
          <AdminNav counts={{ "/admin/setup": period ? `${period.year} ${period.period}` : 0 }} />
          {(error || loading) && <div className="banner"><div className="ico">!</div><div className="body">{error || "Loading administration data..."}</div></div>}
          {period && <div className="setup-progress-card"><div className="setup-progress-top"><div><div className="setup-period"><span className={`adm-status ${period.status}`}><span className="d" />{period.year} {period.period} · {period.status}</span></div><div className="setup-period-sub">Progress is calculated from the records stored in the development database.</div></div><div className="setup-progress-num"><span className="n">{completed}</span><span className="d">of {actionable} setup steps complete</span></div></div><div className="adm-progress"><div className="fill" style={{ width: `${actionable ? Math.round((completed / actionable) * 100) : 0}%` }} /></div></div>}
          <div className="setup-grid">
            {tasks.map((task, index) => <article key={task.title} className={`setup-card ${task.status}`}><div className="setup-card-top"><span className="setup-n">{task.status === "done" ? "✓" : index + 1}</span><span className={`setup-pill ${task.status}`}>{STATUS_LABEL[task.status]}</span></div><div className="setup-title">{task.title}</div><p className="setup-desc">{task.description}</p><div className="setup-detail">{task.detail}</div>{task.status === "locked" ? <span className="setup-cta disabled">{task.cta}</span> : <Link className="setup-cta" to={task.to}>{task.cta}<span className="arr">→</span></Link>}</article>)}
          </div>
        </div>
      </main>
    </div>
  );
}
