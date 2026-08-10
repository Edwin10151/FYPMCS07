import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createAdminUser, createAdminUsers, errorMessage, roleLabel, setAdminUserActive, setAdminUserRole } from "../api";
import Sidebar from "../components/Sidebar";
import AdminNav from "../components/AdminNav";
import { findColumn, parseCsv } from "../csv";
import { useAdminContext } from "../useAdminContext";

type Role = "management" | "coordinator" | "lecturer";
type StagedStaff = { staff_id: string; full_name: string; email: string; role_name: Role; issue: string };
const idPattern = /^\d{7}$/;

function normaliseRole(value: string): Role {
  const role = value.trim().toLowerCase();
  if (role.startsWith("manage") || role.startsWith("admin")) return "management";
  if (role.startsWith("coord")) return "coordinator";
  return "lecturer";
}

export default function AdminStaff() {
  const { session, data, error, loading, reload } = useAdminContext();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [form, setForm] = useState({ staff_id: "", full_name: "", email: "", role_name: "lecturer" as Role });
  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [staged, setStaged] = useState<StagedStaff[]>([]);
  const [flash, setFlash] = useState("");
  const [temporaryPasswords, setTemporaryPasswords] = useState<Array<{ name: string; password: string }>>([]);
  const [working, setWorking] = useState(false);
  const assignments = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const offering of data?.offerings ?? []) {
      const code = `${offering.unit_code} ${offering.year}${offering.period}`;
      map.set(offering.coordinator_id, [...(map.get(offering.coordinator_id) ?? []), code]);
      offering.lecturer_ids.forEach((id) => map.set(id, [...(map.get(id) ?? []), code]));
    }
    return map;
  }, [data]);
  if (!session) return null;
  const visible = (data?.staff ?? []).filter((staff) => {
    if (roleFilter !== "all" && staff.role_name !== roleFilter) return false;
    const term = search.trim().toLowerCase();
    return !term || staff.full_name.toLowerCase().includes(term) || staff.email.toLowerCase().includes(term) || (staff.staff_id ?? "").includes(term);
  });
  const activeCount = data?.staff.filter((staff) => staff.is_active).length ?? 0;
  const pendingCount = data?.staff.filter((staff) => staff.is_active && staff.must_change_password).length ?? 0;
  const unassigned = data?.staff.filter((staff) => staff.is_active && staff.role_name !== "management" && !assignments.get(staff.user_id)?.length).length ?? 0;
  const canAdd = idPattern.test(form.staff_id) && form.full_name.trim().length > 2 && /@monash\.edu$/i.test(form.email.trim());
  const addStaff = async () => {
    setWorking(true); setTemporaryPasswords([]);
    try {
      const result = await createAdminUser(session.access_token, form);
      setTemporaryPasswords([{ name: result.user.full_name, password: result.temporary_password }]);
      setFlash(`${result.user.full_name} was added. Share the temporary password securely.`);
      setAddOpen(false); setForm({ staff_id: "", full_name: "", email: "", role_name: "lecturer" }); await reload();
    } catch (err) { setFlash(errorMessage(err)); } finally { setWorking(false); }
  };
  const stageFile = async (file: File) => {
    const parsed = parseCsv(await file.text());
    const idColumn = findColumn(parsed.headers, ["staff_id", "staffid", "id"]);
    const nameColumn = findColumn(parsed.headers, ["full_name", "name", "staff_name"]);
    const emailColumn = findColumn(parsed.headers, ["email", "email_address", "monash_email"]);
    const roleColumn = findColumn(parsed.headers, ["role", "role_name"]);
    const usedIds = new Set<string>();
    const existing = new Set((data?.staff ?? []).map((staff) => staff.staff_id));
    setStaged(parsed.rows.map((row) => {
      const staff_id = idColumn >= 0 ? (row[idColumn] ?? "").replace(/\s/g, "") : "";
      const full_name = nameColumn >= 0 ? (row[nameColumn] ?? "").trim() : "";
      const email = emailColumn >= 0 ? (row[emailColumn] ?? "").trim() : "";
      const role_name = normaliseRole(roleColumn >= 0 ? row[roleColumn] ?? "" : "lecturer");
      let issue = "";
      if (!idPattern.test(staff_id)) issue = "Staff ID must have seven digits";
      else if (usedIds.has(staff_id)) issue = "Duplicate staff ID in this file";
      else if (existing.has(staff_id)) issue = "Staff ID already exists";
      else if (full_name.length < 3) issue = "Missing full name";
      else if (!/@monash\.edu$/i.test(email)) issue = "Use a Monash staff email";
      usedIds.add(staff_id);
      return { staff_id, full_name, email, role_name, issue };
    }));
  };
  const createBulk = async () => {
    const valid = staged.filter((row) => !row.issue);
    if (!valid.length) return;
    setWorking(true); setTemporaryPasswords([]);
    try {
      const result = await createAdminUsers(session.access_token, valid.map(({ staff_id, full_name, email, role_name }) => ({ staff_id, full_name, email, role_name })));
      setTemporaryPasswords(result.accounts.map((account) => ({ name: account.user.full_name, password: account.temporary_password })));
      setFlash(`${result.accounts.length} staff account${result.accounts.length === 1 ? "" : "s"} created. Share each temporary password securely.`);
      setStaged([]); setUploadOpen(false); await reload();
    } catch (err) { setFlash(errorMessage(err)); } finally { setWorking(false); }
  };
  const toggleActive = async (userId: number, isActive: boolean) => {
    try { await setAdminUserActive(session.access_token, userId, !isActive); await reload(); }
    catch (err) { setFlash(errorMessage(err)); }
  };
  const changeRole = async (userId: number, role: Role) => {
    try { await setAdminUserRole(session.access_token, userId, role); await reload(); }
    catch (err) { setFlash(errorMessage(err)); }
  };

  return <div className="app"><Sidebar user={session.user} /><main className="main">
    <div className="topbar"><div className="crumbs"><Link to="/units">Home</Link><span className="sep">›</span><Link to="/admin/setup">Semester setup</Link><span className="sep">›</span><strong>Staff records</strong></div><div className="top-actions"><button className="btn" onClick={() => { setStaged([]); setUploadOpen(true); }}>Upload staff CSV</button><button className="btn primary" onClick={() => setAddOpen(true)}>+ Add staff</button></div></div>
    <div className="content"><div className="unit-banner"><div><h1 style={{ fontSize: 26 }}>Staff records</h1><div className="sub">Internal development accounts use staff ID, Monash email, role, and a temporary password. This is separate from the future production sign-in method.</div></div></div>
      <AdminNav counts={{ "/admin/staff": data?.staff.length ?? 0 }} />
      {(flash || error || loading) && <div className="adm-flash"><span>{flash || error || "Loading staff records..."}{temporaryPasswords.length > 0 && <span style={{ display: "block", marginTop: 8 }}>{temporaryPasswords.map((item) => <span key={item.name} style={{ display: "block" }}><strong>{item.name}:</strong> <code>{item.password}</code></span>)}</span>}</span><span className="x" onClick={() => { setFlash(""); setTemporaryPasswords([]); }}>✕</span></div>}
      <div className="adm-stats"><div className="adm-stat navy"><div className="lbl"><span className="b" />Staff on file</div><div className="v">{data?.staff.length ?? 0}</div><div className="sub">Stored staff accounts</div></div><div className="adm-stat ok"><div className="lbl"><span className="b" />Active</div><div className="v">{activeCount}</div><div className="sub">Can sign in</div></div><div className="adm-stat warn"><div className="lbl"><span className="b" />Password change required</div><div className="v">{pendingCount}</div><div className="sub">New temporary accounts</div></div><div className="adm-stat"><div className="lbl"><span className="b" />Unassigned</div><div className="v">{unassigned}</div><div className="sub">Teaching staff without an offering</div></div></div>
      <div className="adm-toolbar"><div className="adm-search">⌕<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by staff ID, name, or email…" /></div><span className="adm-toolbar-lbl">Role</span><select className="adm-select" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as "all" | Role)}><option value="all">All roles</option><option value="management">Management</option><option value="coordinator">Unit coordinator</option><option value="lecturer">Lecturer</option></select><span className="adm-count">{visible.length} staff account{visible.length === 1 ? "" : "s"}</span></div>
      <div className="adm-card"><table className="adm-tbl"><thead><tr><th>Staff member</th><th>Role</th><th>Offering assignments</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead><tbody>{visible.map((staff) => <tr key={staff.user_id}><td><span className="nm">{staff.full_name}</span><span className="em">{staff.staff_id} · {staff.email}</span></td><td><select className="adm-select" value={staff.role_name} disabled={staff.user_id === session.user.user_id} onChange={(event) => void changeRole(staff.user_id, event.target.value as Role)}><option value="management">Management</option><option value="coordinator">Unit coordinator</option><option value="lecturer">Lecturer</option></select></td><td className="muted">{assignments.get(staff.user_id)?.join(", ") || "No unit offering assigned"}</td><td><span className={`adm-status ${!staff.is_active ? "inactive" : staff.must_change_password ? "planning" : "active"}`}><span className="d" />{!staff.is_active ? "Inactive" : staff.must_change_password ? "Password change required" : "Active"}</span></td><td><div className="adm-row-act"><button className="adm-btn-sm" disabled={staff.user_id === session.user.user_id} onClick={() => void toggleActive(staff.user_id, staff.is_active)}>{staff.is_active ? "Deactivate" : "Activate"}</button></div></td></tr>)}</tbody></table>{!loading && !visible.length && <div className="adm-empty">No staff accounts match the selected filters.</div>}</div>
    </div>
    {addOpen && <div className="adm-modal-overlay"><div className="adm-modal"><h3>Add staff account</h3><div className="adm-modal-sub">The system generates a temporary password. The staff member must change it on first sign-in.</div><div className="adm-form"><div className="adm-form-2"><label className="adm-field mono"><span className="lbl">Staff ID</span><input value={form.staff_id} onChange={(event) => setForm({ ...form, staff_id: event.target.value.replace(/\D/g, "") })} /></label><label className="adm-field"><span className="lbl">Role</span><select value={form.role_name} onChange={(event) => setForm({ ...form, role_name: event.target.value as Role })}><option value="management">Management</option><option value="coordinator">Unit coordinator</option><option value="lecturer">Lecturer</option></select></label></div><label className="adm-field"><span className="lbl">Full name</span><input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></label><label className="adm-field"><span className="lbl">Monash staff email</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label></div><div className="adm-modal-actions"><button className="btn" onClick={() => setAddOpen(false)}>Cancel</button><button className="btn primary" disabled={!canAdd || working} onClick={() => void addStaff()}>{working ? "Creating..." : "Create account"}</button></div></div></div>}
    {uploadOpen && <div className="adm-modal-overlay"><div className="adm-modal wide"><h3>Upload staff CSV</h3><div className="adm-modal-sub">Use <code>staff_id</code>, <code>full_name</code>, <code>email</code>, and optional <code>role</code> headers. The server still validates every account before saving.</div>{!staged.length ? <label className="adm-drop"><div className="icn">CSV</div><div className="t">Choose a staff list</div><div className="s">Only valid rows will be submitted.</div><input type="file" accept=".csv,text/csv" onChange={(event) => event.target.files?.[0] && void stageFile(event.target.files[0])} /></label> : <><div className="adm-card"><table className="adm-tbl"><thead><tr><th>Staff ID</th><th>Name</th><th>Email</th><th>Role</th><th>Validation</th></tr></thead><tbody>{staged.slice(0, 25).map((row, index) => <tr key={`${row.staff_id}-${index}`} className={row.issue ? "row-err" : ""}><td className="mono">{row.staff_id || "—"}</td><td>{row.full_name || "—"}</td><td>{row.email || "—"}</td><td>{row.role_name}</td><td>{row.issue || "Ready"}</td></tr>)}</tbody></table></div><div className="adm-modal-actions"><button className="btn" onClick={() => setStaged([])}>Replace file</button><button className="btn primary" disabled={working || !staged.some((row) => !row.issue)} onClick={() => void createBulk()}>{working ? "Creating..." : `Create ${staged.filter((row) => !row.issue).length} account(s)`}</button></div></>}</div></div>}
  </main></div>;
}
