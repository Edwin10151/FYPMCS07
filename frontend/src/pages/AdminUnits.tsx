import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createAdminOffering, errorMessage, updateAdminOffering, type AdminOffering } from "../api";
import Sidebar from "../components/Sidebar";
import AdminNav from "../components/AdminNav";
import { useAdminContext } from "../useAdminContext";

type OfferingForm = {
  semesterId: number;
  programIds: number[];
  unitCode: string;
  unitName: string;
  coordinatorId: number;
  lecturerIds: number[];
  status: "draft" | "active" | "discontinued";
  replacementUnitCode: string;
  replacementUnitName: string;
};

export default function AdminUnits() {
  const { session, data, error, loading, reload } = useAdminContext();
  const [semesterId, setSemesterId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<AdminOffering | null>(null);
  const [form, setForm] = useState<OfferingForm | null>(null);
  const [flash, setFlash] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data || semesterId) return;
    setSemesterId(data.periods.find((period) => period.status === "active")?.semester_id ?? data.periods[0]?.semester_id ?? null);
  }, [data, semesterId]);
  if (!session) return null;
  const selectedPeriod = data?.periods.find((period) => period.semester_id === semesterId);
  const staff = data?.staff.filter((item) => item.is_active && (item.role_name === "coordinator" || item.role_name === "lecturer")) ?? [];
  const coordinators = staff.filter((item) => item.role_name === "coordinator");
  const offerings = useMemo(() => (data?.offerings ?? []).filter((offering) => {
    if (offering.semester_id !== semesterId) return false;
    if (statusFilter !== "all" && offering.status !== statusFilter) return false;
    const term = search.trim().toLowerCase();
    return !term || offering.unit_code.toLowerCase().includes(term) || offering.unit_name.toLowerCase().includes(term);
  }), [data, semesterId, search, statusFilter]);
  const allPeriodOfferings = data?.offerings.filter((offering) => offering.semester_id === semesterId) ?? [];
  const staffById = new Map((data?.staff ?? []).map((item) => [item.user_id, item]));
  const openCreate = () => {
    if (!data || !semesterId || !data.programs[0] || !coordinators[0]) { setFlash("Create a period, program, and coordinator account before adding an offering."); return; }
    setEditing(null);
    setForm({ semesterId, programIds: [data.programs[0].program_id], unitCode: "", unitName: "", coordinatorId: coordinators[0].user_id, lecturerIds: [], status: "draft", replacementUnitCode: "", replacementUnitName: "" });
  };
  const openEdit = (offering: AdminOffering) => {
    setEditing(offering);
    setForm({ semesterId: offering.semester_id, programIds: offering.program_ids, unitCode: offering.unit_code, unitName: offering.unit_name, coordinatorId: offering.coordinator_id, lecturerIds: offering.lecturer_ids, status: offering.status, replacementUnitCode: offering.replacement_unit_code ?? "", replacementUnitName: "" });
  };
  const setField = <K extends keyof OfferingForm>(key: K, value: OfferingForm[K]) => setForm((current) => current ? { ...current, [key]: value } : current);
  const toggleLecturer = (userId: number) => setForm((current) => current ? { ...current, lecturerIds: current.lecturerIds.includes(userId) ? current.lecturerIds.filter((id) => id !== userId) : [...current.lecturerIds, userId] } : current);
  const toggleProgram = (programId: number) => setForm((current) => current ? { ...current, programIds: current.programIds.includes(programId) ? current.programIds.filter((id) => id !== programId) : [...current.programIds, programId] } : current);
  const save = async () => {
    if (!session || !form) return;
    setSaving(true);
    try {
      if (editing) {
        await updateAdminOffering(session.access_token, editing.offering_id, { unit_code: form.unitCode, unit_name: form.unitName, program_ids: form.programIds, coordinator_id: form.coordinatorId, lecturer_ids: form.lecturerIds, status: form.status, replacement_unit_code: form.replacementUnitCode || null, replacement_unit_name: form.replacementUnitName || null });
        setFlash(`${form.unitCode.toUpperCase()} updated.`);
      } else {
        await createAdminOffering(session.access_token, { semester_id: form.semesterId, program_ids: form.programIds, unit_code: form.unitCode, unit_name: form.unitName, coordinator_id: form.coordinatorId, lecturer_ids: form.lecturerIds, status: form.status });
        setFlash(`${form.unitCode.toUpperCase()} added to ${selectedPeriod?.year} ${selectedPeriod?.period}.`);
      }
      setForm(null); setEditing(null); await reload();
    } catch (err) { setFlash(errorMessage(err)); } finally { setSaving(false); }
  };

  return <div className="app"><Sidebar user={session.user} /><main className="main">
    <div className="topbar"><div className="crumbs"><Link to="/units">Home</Link><span className="sep">›</span><Link to="/admin/setup">Semester setup</Link><span className="sep">›</span><strong>Units & offerings</strong></div><div className="top-actions"><button className="btn primary" onClick={openCreate}>+ Add unit</button></div></div>
    <div className="content"><div className="unit-banner"><div><h1 style={{ fontSize: 26 }}>Units & offerings</h1><div className="sub">Create the semester-specific offering, assign the coordinator and lecturers, then let the coordinator confirm the Handbook and mapping data.</div></div></div>
      <AdminNav counts={{ "/admin/units": allPeriodOfferings.length }} />
      {(flash || error || loading) && <div className="adm-flash">{flash || error || "Loading unit offerings..."}<span className="x" onClick={() => setFlash("")}>✕</span></div>}
      <div className="adm-toolbar"><div className="adm-search">⌕<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search unit code or name…" /></div><span className="adm-toolbar-lbl">Period</span><select className="adm-select" value={semesterId ?? ""} onChange={(event) => setSemesterId(Number(event.target.value))}>{data?.periods.map((period) => <option key={period.semester_id} value={period.semester_id}>{period.year} {period.period} · {period.status}</option>)}</select><span className="adm-toolbar-lbl">Status</span><select className="adm-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="active">Active</option><option value="discontinued">Discontinued</option></select><span className="adm-count">{offerings.length} offering{offerings.length === 1 ? "" : "s"}</span></div>
      <div className="adm-stats"><div className="adm-stat navy"><div className="lbl"><span className="b" />Offerings</div><div className="v">{allPeriodOfferings.length}</div><div className="sub">In {selectedPeriod ? `${selectedPeriod.year} ${selectedPeriod.period}` : "the selected period"}</div></div><div className="adm-stat ok"><div className="lbl"><span className="b" />Active</div><div className="v">{allPeriodOfferings.filter((item) => item.status === "active").length}</div><div className="sub">Ready for teaching workflow</div></div><div className="adm-stat warn"><div className="lbl"><span className="b" />Handbook pending</div><div className="v">{allPeriodOfferings.filter((item) => !item.handbook_url).length}</div><div className="sub">Coordinator must import and confirm</div></div><div className="adm-stat"><div className="lbl"><span className="b" />Enrolments</div><div className="v">{allPeriodOfferings.reduce((sum, item) => sum + item.student_count, 0)}</div><div className="sub">Registered across this period</div></div></div>
      <div className="adm-card"><table className="adm-tbl"><thead><tr><th>Unit offering</th><th>Program</th><th>Coordinator</th><th>Lecturers</th><th className="num">Students</th><th>Setup</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead><tbody>{offerings.map((offering) => <tr key={offering.offering_id}><td><span className="adm-code">{offering.unit_code}</span><span className="nm" style={{ marginLeft: 9 }}>{offering.unit_name}</span>{offering.replacement_unit_code && <span className="muted" style={{ display: "block", marginTop: 4 }}>Replaced by {offering.replacement_unit_code}</span>}</td><td><span className="mono">{offering.program_codes.join(" / ")}</span></td><td>{offering.coordinator_name}</td><td className="muted">{offering.lecturer_ids.length ? offering.lecturer_ids.map((id) => staffById.get(id)?.full_name ?? "Unknown").join(", ") : "None"}</td><td className="num">{offering.student_count}</td><td>{offering.handbook_url ? <span className="adm-row-status ok">● Handbook confirmed</span> : <span className="adm-row-status warn">● Handbook pending</span>}</td><td><span className={`adm-status ${offering.status}`}><span className="d" />{offering.status}</span></td><td><div className="adm-row-act"><button className="adm-btn-sm" onClick={() => openEdit(offering)}>Edit</button></div></td></tr>)}</tbody></table>{!loading && !offerings.length && <div className="adm-empty">No unit offerings match the selected period and filters.</div>}</div>
    </div>
    {form && <div className="adm-modal-overlay"><div className="adm-modal wide"><h3>{editing ? `Edit ${editing.unit_code}` : "Add unit offering"}</h3><div className="adm-modal-sub">A unit offering is one unit and semester context, shared across every program selected below. Mapping and assessment records stay with that offering.</div><div className="adm-form"><div className="adm-form-2">{!editing && <label className="adm-field"><span className="lbl">Academic period</span><select value={form.semesterId} onChange={(event) => setField("semesterId", Number(event.target.value))}>{data?.periods.map((period) => <option key={period.semester_id} value={period.semester_id}>{period.year} {period.period}</option>)}</select></label>}<label className="adm-field"><span className="lbl">Programs</span><div className="adm-assign-list">{data?.programs.map((program) => <label key={program.program_id} className="adm-check"><input type="checkbox" checked={form.programIds.includes(program.program_id)} onChange={() => toggleProgram(program.program_id)} />{program.program_code}</label>)}</div></label></div><div className="adm-form-2"><label className="adm-field mono"><span className="lbl">Unit code</span><input value={form.unitCode} onChange={(event) => setField("unitCode", event.target.value.toUpperCase())} placeholder="FIT3161" /></label><label className="adm-field"><span className="lbl">Unit name</span><input value={form.unitName} onChange={(event) => setField("unitName", event.target.value)} /></label></div><div className="adm-form-2"><label className="adm-field"><span className="lbl">Coordinator</span><select value={form.coordinatorId} onChange={(event) => setField("coordinatorId", Number(event.target.value))}>{coordinators.map((person) => <option key={person.user_id} value={person.user_id}>{person.full_name} · {person.staff_id}</option>)}</select></label><label className="adm-field"><span className="lbl">Offering status</span><select value={form.status} onChange={(event) => setField("status", event.target.value as OfferingForm["status"])}><option value="draft">Draft</option><option value="active">Active</option><option value="discontinued">Discontinued</option></select></label></div><div className="adm-field"><span className="lbl">Lecturers with access</span><div className="adm-assign-list">{staff.filter((person) => person.user_id !== form.coordinatorId).map((person) => <label key={person.user_id} className="adm-check"><input type="checkbox" checked={form.lecturerIds.includes(person.user_id)} onChange={() => toggleLecturer(person.user_id)} />{person.full_name} · {person.role_name}</label>)}</div></div>{editing && <div className="adm-form-2"><label className="adm-field mono"><span className="lbl">Replacement unit code (optional)</span><input value={form.replacementUnitCode} onChange={(event) => setField("replacementUnitCode", event.target.value.toUpperCase())} placeholder="FITxxxx" /></label><label className="adm-field"><span className="lbl">Replacement unit name</span><input value={form.replacementUnitName} onChange={(event) => setField("replacementUnitName", event.target.value)} placeholder="Only needed for a new code" /></label></div>}</div><div className="adm-modal-actions"><button className="btn" onClick={() => { setForm(null); setEditing(null); }}>Cancel</button><button className="btn primary" disabled={saving || !/^[A-Z]{3}\d{4}$/.test(form.unitCode) || form.unitName.trim().length < 3 || !form.coordinatorId || !form.programIds.length} onClick={() => void save()}>{saving ? "Saving..." : editing ? "Save changes" : "Create offering"}</button></div></div></div>}
  </main></div>;
}
