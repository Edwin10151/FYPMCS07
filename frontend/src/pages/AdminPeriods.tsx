import { useState } from "react";
import { Link } from "react-router-dom";
import { createAdminPeriod, errorMessage, updateAdminPeriod, type AdminPeriod } from "../api";
import Sidebar from "../components/Sidebar";
import AdminNav from "../components/AdminNav";
import { useAdminContext } from "../useAdminContext";

function formatDate(value: string | null) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";
}

type PeriodForm = { year: string; period: "S1" | "S2"; start_date: string; end_date: string; status: "planning" | "active" | "archived" };
const blankForm = (): PeriodForm => ({ year: String(new Date().getFullYear() + 1), period: "S1", start_date: "", end_date: "", status: "planning" });

export default function AdminPeriods() {
  const { session, data, error, loading, reload } = useAdminContext();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPeriod | null>(null);
  const [form, setForm] = useState<PeriodForm>(blankForm());
  const [flash, setFlash] = useState("");
  const [saving, setSaving] = useState(false);

  if (!session) return null;
  const active = data?.periods.find((period) => period.status === "active");
  const planningCount = data?.periods.filter((period) => period.status === "planning").length ?? 0;
  const setField = (field: keyof PeriodForm, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const openCreate = () => { setForm(blankForm()); setCreateOpen(true); };
  const openEdit = (period: AdminPeriod) => {
    setForm({ year: String(period.year), period: period.period, start_date: period.start_date ?? "", end_date: period.end_date ?? "", status: period.status });
    setEditing(period);
  };
  const save = async () => {
    if (!session) return;
    setSaving(true);
    try {
      if (editing) {
        await updateAdminPeriod(session.access_token, editing.semester_id, { start_date: form.start_date || null, end_date: form.end_date || null, status: form.status });
        setFlash(`${editing.year} ${editing.period} updated.`);
      } else {
        await createAdminPeriod(session.access_token, { year: Number(form.year), period: form.period, start_date: form.start_date || null, end_date: form.end_date || null, status: form.status });
        setFlash(`${form.year} ${form.period} created.`);
      }
      setCreateOpen(false); setEditing(null); await reload();
    } catch (err) {
      setFlash(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  const updateStatus = async (period: AdminPeriod, status: PeriodForm["status"]) => {
    if (!session) return;
    try {
      await updateAdminPeriod(session.access_token, period.semester_id, { start_date: period.start_date, end_date: period.end_date, status });
      setFlash(`${period.year} ${period.period} is now ${status}.`); await reload();
    } catch (err) { setFlash(errorMessage(err)); }
  };

  return <div className="app"><Sidebar user={session.user} /><main className="main">
    <div className="topbar"><div className="crumbs"><Link to="/units">Home</Link><span className="sep">›</span><Link to="/admin/setup">Semester setup</Link><span className="sep">›</span><strong>Academic periods</strong></div><div className="top-actions"><button className="btn primary" onClick={openCreate}>+ Add academic period</button></div></div>
    <div className="content"><div className="unit-banner"><div><h1 style={{ fontSize: 26 }}>Academic periods</h1><div className="sub">Create the year and semester before registering unit offerings, staff, or enrolments. Only one period can be active.</div></div></div>
      <AdminNav counts={{ "/admin/periods": data?.periods.length ?? 0 }} />
      {(flash || error || loading) && <div className="adm-flash">{flash || error || "Loading academic periods..."}<span className="x" onClick={() => setFlash("")}>✕</span></div>}
      <div className="adm-stats"><div className="adm-stat ok"><div className="lbl"><span className="b" />Active period</div><div className="v">{active ? `${active.year} ${active.period}` : "—"}</div><div className="sub">{active ? `${formatDate(active.start_date)} – ${formatDate(active.end_date)}` : "No active period"}</div></div><div className="adm-stat navy"><div className="lbl"><span className="b" />Units this period</div><div className="v">{active?.offering_count ?? 0}</div><div className="sub">Offerings in the active period</div></div><div className="adm-stat"><div className="lbl"><span className="b" />Students registered</div><div className="v">{(active?.student_count ?? 0).toLocaleString()}</div><div className="sub">Across active-period offerings</div></div><div className="adm-stat warn"><div className="lbl"><span className="b" />Planning</div><div className="v">{planningCount}</div><div className="sub">Future periods awaiting setup</div></div></div>
      <div className="adm-card"><div className="adm-card-head"><div><h4>All periods</h4><div className="h-sub">Archived periods retain their historical records but should not receive new uploads.</div></div></div><table className="adm-tbl"><thead><tr><th>Period</th><th>Teaching dates</th><th className="num">Units</th><th className="num">Students</th><th className="num">Staff</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead><tbody>{data?.periods.map((period) => <tr key={period.semester_id}><td><span className="adm-code">{period.year} {period.period}</span></td><td className="mono">{formatDate(period.start_date)} – {formatDate(period.end_date)}</td><td className="num">{period.offering_count}</td><td className="num">{period.student_count.toLocaleString()}</td><td className="num">{period.staff_count}</td><td><span className={`adm-status ${period.status}`}><span className="d" />{period.status}</span></td><td><div className="adm-row-act">{period.status !== "active" && <button className="adm-btn-sm navy" onClick={() => void updateStatus(period, "active")}>Set active</button>}<button className="adm-btn-sm" onClick={() => openEdit(period)}>Edit</button></div></td></tr>)}</tbody></table>{!loading && !data?.periods.length && <div className="adm-empty">No academic periods have been created.</div>}</div>
    </div>
    {(createOpen || editing) && <div className="adm-modal-overlay"><div className="adm-modal"><h3>{editing ? `Edit ${editing.year} ${editing.period}` : "Add academic period"}</h3><div className="adm-modal-sub">A period groups the unit offerings, staff assignments, and enrolments for one teaching semester.</div><div className="adm-form"><div className="adm-form-2"><label className="adm-field"><span className="lbl">Year</span><input type="number" disabled={!!editing} value={form.year} onChange={(event) => setField("year", event.target.value)} /></label><label className="adm-field"><span className="lbl">Period</span><select disabled={!!editing} value={form.period} onChange={(event) => setField("period", event.target.value)}><option value="S1">S1</option><option value="S2">S2</option></select></label></div><div className="adm-form-2"><label className="adm-field"><span className="lbl">Teaching start</span><input type="date" value={form.start_date} onChange={(event) => setField("start_date", event.target.value)} /></label><label className="adm-field"><span className="lbl">Teaching end</span><input type="date" value={form.end_date} onChange={(event) => setField("end_date", event.target.value)} /></label></div><label className="adm-field"><span className="lbl">Status</span><select value={form.status} onChange={(event) => setField("status", event.target.value)}><option value="planning">Planning</option><option value="active">Active</option><option value="archived">Archived</option></select></label></div><div className="adm-modal-actions"><button className="btn" onClick={() => { setCreateOpen(false); setEditing(null); }}>Cancel</button><button className="btn primary" disabled={saving || !/^\d{4}$/.test(form.year)} onClick={() => void save()}>{saving ? "Saving..." : editing ? "Save changes" : "Create period"}</button></div></div></div>}
  </main></div>;
}
