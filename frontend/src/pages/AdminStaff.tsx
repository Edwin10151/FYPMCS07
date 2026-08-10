import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import AdminNav from "../components/AdminNav";
import { useSession } from "../useSession";
import { findColumn, formatFileSize, parseCsv } from "../csv";
import { STAFF_RECORDS, STAFF_ROLE_LABEL, UNIT_OFFERINGS, type StaffRecord, type StaffRole, type StaffStatus } from "../mockData";
import { Link } from "react-router-dom";
import { createAdminUser, createAdminUsers, errorMessage, getAdminUsers, getSelectedUnit, setAdminUserActive, type AdminUser } from "../api";

const selectedUnit = getSelectedUnit();
const unitCode = selectedUnit?.unitCode ?? "FIT2004";

const STATUS_LABEL: Record<StaffStatus, string> = { active: "Active", pending: "Pending activation", inactive: "Inactive" };
const ROLES: StaffRole[] = ["coordinator", "lecturer", "admin"];

// Staff IDs at Monash are 7 digits.
const ID_PATTERN = /^\d{7}$/;

type RowIssue = "" | "Invalid staff ID" | "Missing name" | "Invalid email" | "Already on file" | "Duplicate in file";

type StagedRow = { staffId: string; name: string; email: string; role: StaffRole; issue: RowIssue };

type Staged = { fileName: string; fileSize: number; headers: string[]; rows: StagedRow[] };

function normaliseRole(raw: string): StaffRole {
  const value = raw.toLowerCase();
  if (value.startsWith("coord")) return "coordinator";
  if (value.startsWith("tut")) return "tutor";
  if (value.startsWith("admin")) return "admin";
  return "lecturer";
}

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

const BLANK_FORM = { staffId: "", name: "", email: "", role: "lecturer" as StaffRole };

function fromApiUser(user: AdminUser): StaffRecord {
  return {
    staffId: user.staff_id ?? "--",
    name: user.full_name,
    email: user.email,
    role: user.role_name === "management" ? "admin" : user.role_name === "coordinator" ? "coordinator" : "lecturer",
    status: !user.is_active ? "inactive" : user.must_change_password ? "pending" : "active",
    addedOn: user.created_at,
  };
}

function apiRole(role: StaffRole): "management" | "coordinator" | "lecturer" {
  if (role === "coordinator" || role === "lecturer") return role;
  return "management";
}

export default function AdminStaff() {
  const session = useSession();
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [userIds, setUserIds] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | StaffRole>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [showUpload, setShowUpload] = useState(false);
  const [staged, setStaged] = useState<Staged | null>(null);
  const [flash, setFlash] = useState("");
  const [temporaryPasswords, setTemporaryPasswords] = useState<Array<{ name: string; password: string }>>([]);

  useEffect(() => {
    if (!session) return;
    getAdminUsers(session.access_token)
      .then(({ users }) => {
        setStaff(users.map(fromApiUser));
        setUserIds(Object.fromEntries(users.filter((item) => item.staff_id).map((item) => [item.staff_id!, item.user_id])));
      })
      .catch((err) => {
        if (import.meta.env.DEV && err instanceof TypeError) setStaff(STAFF_RECORDS);
        else setFlash(errorMessage(err));
      });
  }, [session]);

  // How many units each person teaches — drives the "unassigned" warning.
  const unitsByStaff = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const unit of UNIT_OFFERINGS) {
      if (unit.status === "discontinued") continue;
      for (const link of unit.staff) {
        map[link.staffId] = [...(map[link.staffId] ?? []), unit.code];
      }
    }
    return map;
  }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return staff.filter((s) => {
      if (roleFilter !== "all" && s.role !== roleFilter) return false;
      if (!term) return true;
      return s.name.toLowerCase().includes(term) || s.staffId.includes(term) || s.email.toLowerCase().includes(term);
    });
  }, [staff, roleFilter, search]);

  if (!session) return null;

  const pending = staff.filter((s) => s.status === "pending").length;
  const unassigned = staff.filter((s) => s.status !== "inactive" && s.role !== "admin" && !(unitsByStaff[s.staffId]?.length ?? 0)).length;
  const setField = (patch: Partial<typeof BLANK_FORM>) => setForm((f) => ({ ...f, ...patch }));

  const addStaff = async () => {
    if (!session) return;
    setTemporaryPasswords([]);
    try {
      const account = await createAdminUser(session.access_token, {
        staff_id: form.staffId.trim(), full_name: form.name.trim(), email: form.email.trim(), role_name: apiRole(form.role),
      });
      const created = fromApiUser(account.user);
      setStaff((prev) => [created, ...prev]);
      setUserIds((prev) => ({ ...prev, [created.staffId]: account.user.user_id }));
      setTemporaryPasswords([{ name: created.name, password: account.temporary_password }]);
      setFlash(`${created.name} added. Give them the temporary password below; it is not emailed automatically.`);
      setForm(BLANK_FORM);
      setShowAdd(false);
    } catch (err) {
      setFlash(errorMessage(err));
    }
  };

  const readFile = async (file: File) => {
    const text = await file.text();
    const { headers, rows } = parseCsv(text);

    const idCol = findColumn(headers, ["staff_id", "staffid", "id", "employee_id"]);
    const nameCol = findColumn(headers, ["name", "full_name", "staff_name"]);
    const emailCol = findColumn(headers, ["email", "email_address", "monash_email"]);
    const roleCol = findColumn(headers, ["role", "position", "appointment"]);

    const seen = new Set<string>();
    const parsed: StagedRow[] = rows.map((cells) => {
      const staffId = idCol === -1 ? "" : (cells[idCol] ?? "").replace(/\s+/g, "");
      const name = nameCol === -1 ? "" : (cells[nameCol] ?? "").trim();
      const email = emailCol === -1 ? "" : (cells[emailCol] ?? "").trim();
      const role = roleCol === -1 ? "lecturer" : normaliseRole(cells[roleCol] ?? "");

      let issue: RowIssue = "";
      if (!ID_PATTERN.test(staffId)) issue = "Invalid staff ID";
      else if (seen.has(staffId)) issue = "Duplicate in file";
      else if (staff.some((s) => s.staffId === staffId)) issue = "Already on file";
      else if (!name) issue = "Missing name";
      else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) issue = "Invalid email";
      seen.add(staffId);

      return { staffId, name, email, role, issue };
    });

    setStaged({ fileName: file.name, fileSize: file.size, headers, rows: parsed });
    setShowUpload(true);
  };

  const clean = staged ? staged.rows.filter((r) => !r.issue) : [];
  const problems = staged ? staged.rows.filter((r) => r.issue) : [];

  const commitUpload = async () => {
    if (!staged) return;
    if (!session) return;
    setTemporaryPasswords([]);
    try {
      const result = await createAdminUsers(session.access_token, clean.map((row) => ({
        staff_id: row.staffId, full_name: row.name, email: row.email, role_name: apiRole(row.role),
      })));
      const created = result.accounts.map((account) => fromApiUser(account.user));
      setStaff((prev) => [...created, ...prev]);
      setUserIds((prev) => ({ ...prev, ...Object.fromEntries(result.accounts.map((account) => [account.user.staff_id!, account.user.user_id])) }));
      setTemporaryPasswords(result.accounts.map((account) => ({ name: account.user.full_name, password: account.temporary_password })));
      setFlash(`${created.length} staff record${created.length === 1 ? "" : "s"} added from ${staged.fileName}.`);
      setStaged(null);
      setShowUpload(false);
    } catch (err) {
      setFlash(errorMessage(err));
    }
  };

  const setStatus = async (staffId: string, status: StaffStatus) => {
    if (!session || !userIds[staffId]) return;
    try {
      await setAdminUserActive(session.access_token, userIds[staffId], status !== "inactive");
      setStaff((prev) => prev.map((s) => (s.staffId === staffId ? { ...s, status } : s)));
    } catch (err) {
      setFlash(errorMessage(err));
    }
  };

  const canAdd = ID_PATTERN.test(form.staffId.trim()) && form.name.trim().length > 2 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim());

  return (
    <div className="app">
      <Sidebar user={session.user} />
      <main className="main">
        <div className="topbar">
          <div className="crumbs">
            <Link to="/units">Home</Link>
            <span className="sep">›</span>
            <Link to="/dashboard">{unitCode}</Link>
            <span className="sep">›</span>
            <Link to="/admin/setup">Semester setup</Link>
            <span className="sep">›</span>
            <strong>Staff Records</strong>
          </div>
          <div className="top-actions">
            <button className="btn ghost">Download template</button>
            <button className="btn" onClick={() => setShowUpload(true)}>
              Upload staff CSV
            </button>
            <button className="btn primary" onClick={() => setShowAdd(true)}>
              + Add staff
            </button>
          </div>
        </div>

        <div className="content">
          <div className="unit-banner">
            <div>
              <h1 style={{ fontSize: 26 }}>Staff Records</h1>
              <div className="sub">
                Faculty of IT &nbsp;·&nbsp; The staff directory used when assigning people to units. Add new staff one at a time or
                upload a list of staff IDs at the start of a period.
              </div>
            </div>
          </div>

          <AdminNav counts={{ "/admin/staff": staff.length }} />

          {flash && (
            <div className="adm-flash">
              {flash}
              {temporaryPasswords.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {temporaryPasswords.map((item) => <div key={item.name}><strong>{item.name}:</strong> <code>{item.password}</code></div>)}
                </div>
              )}
              <span className="x" onClick={() => { setFlash(""); setTemporaryPasswords([]); }}>
                ✕
              </span>
            </div>
          )}

          <div className="adm-stats">
            <div className="adm-stat navy">
              <div className="lbl">
                <span className="b" />
                Staff on file
              </div>
              <div className="v">{staff.length}</div>
              <div className="sub">Across all teaching periods</div>
            </div>
            <div className="adm-stat ok">
              <div className="lbl">
                <span className="b" />
                Active
              </div>
              <div className="v">{staff.filter((s) => s.status === "active").length}</div>
              <div className="sub">Can sign in and be assigned to units</div>
            </div>
            <div className="adm-stat warn">
              <div className="lbl">
                <span className="b" />
                Pending activation
              </div>
              <div className="v">{pending}</div>
              <div className="sub">Added but not yet signed in</div>
            </div>
            <div className="adm-stat">
              <div className="lbl">
                <span className="b" />
                Not on any unit
              </div>
              <div className="v">{unassigned}</div>
              <div className="sub">Teaching staff with no unit assignment</div>
            </div>
          </div>

          <div className="adm-toolbar">
            <div className="adm-search">
              ⌕
              <input placeholder="Search by staff ID, name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <span className="adm-toolbar-lbl">Role</span>
            <select className="adm-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as "all" | StaffRole)}>
              <option value="all">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {STAFF_ROLE_LABEL[r]}
                </option>
              ))}
            </select>
            <span className="adm-count">
              {visible.length} of {staff.length} staff
            </span>
          </div>

          <div className="adm-card">
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Staff ID</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Units assigned</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={7} className="adm-empty">
                      No staff match this search.
                    </td>
                  </tr>
                )}
                {visible.map((s) => {
                  const units = unitsByStaff[s.staffId] ?? [];
                  return (
                    <tr key={s.staffId}>
                      <td className="mono" style={{ fontWeight: 600, color: "var(--ink)" }}>
                        {s.staffId}
                      </td>
                      <td className="nm">
                        {s.name}
                        <span className="em">{s.email}</span>
                      </td>
                      <td>
                        <span className={`role-chip ${s.role === "admin" ? "admin" : s.role === "coordinator" ? "" : "lec"}`}>
                          <span className="icn" />
                          {STAFF_ROLE_LABEL[s.role]}
                        </span>
                      </td>
                      <td>
                        {units.length === 0 ? (
                          <span className="unassigned">— none —</span>
                        ) : (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {units.map((code) => (
                              <span key={code} className="tag navy">
                                {code}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`adm-status ${s.status}`}>
                          <span className="d" />
                          {STATUS_LABEL[s.status]}
                        </span>
                      </td>
                      <td className="mono">{formatDate(s.addedOn)}</td>
                      <td>
                        <div className="adm-row-act">
                          {s.status === "pending" && <span className="adm-row-status warn">Password change required</span>}
                          {s.status === "inactive" ? (
                            <button className="adm-btn-sm" onClick={() => setStatus(s.staffId, "active")}>
                              Reinstate
                            </button>
                          ) : (
                            <button className="adm-btn-sm danger" onClick={() => setStatus(s.staffId, "inactive")}>
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add a single staff member */}
      {showAdd && (
        <div className="adm-modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add staff</h3>
            <div className="adm-modal-sub">
              New staff receive a generated temporary password and must change it at their first sign-in. You can assign them to
              units after their staff record exists.
            </div>

            <div className="adm-form">
              <div className="adm-form-2">
                <label className="adm-field mono">
                  <span className="lbl">Staff ID</span>
                  <input placeholder="1011276" maxLength={7} value={form.staffId} onChange={(e) => setField({ staffId: e.target.value.replace(/\D/g, "") })} />
                  <span className="hint">7 digits, as it appears in the HR record.</span>
                </label>
                <label className="adm-field">
                  <span className="lbl">Role</span>
                  <select value={form.role} onChange={(e) => setField({ role: e.target.value as StaffRole })}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {STAFF_ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="adm-field">
                <span className="lbl">Full name</span>
                <input placeholder="Dr. Will Nakamura" value={form.name} onChange={(e) => setField({ name: e.target.value })} />
              </label>
              <label className="adm-field">
                <span className="lbl">Monash email</span>
                <input placeholder="will.nakamura@monash.edu" value={form.email} onChange={(e) => setField({ email: e.target.value })} />
              </label>
            </div>

            <div className="adm-modal-actions">
              <button className="btn" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button className="btn primary" disabled={!canAdd} onClick={addStaff}>
                Add staff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk staff upload */}
      {showUpload && (
        <div className="adm-modal-overlay" onClick={() => { setShowUpload(false); setStaged(null); }}>
          <div className="adm-modal wide" onClick={(e) => e.stopPropagation()}>
            <h3>Upload staff list</h3>
            <div className="adm-modal-sub">
              CSV with <code>staff_id</code>, <code>name</code>, <code>email</code> and optionally <code>role</code>. Staff already
              on file are skipped rather than duplicated.
            </div>

            {!staged ? (
              <label className="adm-drop">
                <div className="icn">CSV</div>
                <div className="t">Choose a staff list</div>
                <div className="s">
                  e.g. <code>FIT_new_staff_2026.csv</code> — one row per staff member.
                </div>
                <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
              </label>
            ) : (
              <>
                <div className="adm-modal-note" style={{ marginBottom: 14 }}>
                  <strong>{staged.fileName}</strong> — {staged.rows.length} rows · {formatFileSize(staged.fileSize)} ·{" "}
                  {clean.length} ready to add
                  {problems.length > 0 && `, ${problems.length} skipped`}
                </div>

                <table className="adm-tbl" style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
                  <thead>
                    <tr>
                      <th>Staff ID</th>
                      <th>Name</th>
                      <th>Role</th>
                      <th style={{ textAlign: "right" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staged.rows.slice(0, 8).map((r, i) => (
                      <tr key={i} className={r.issue ? (r.issue === "Already on file" || r.issue === "Duplicate in file" ? "row-warn" : "row-err") : ""}>
                        <td className="mono">{r.staffId || "—"}</td>
                        <td className="nm">
                          {r.name || "—"}
                          <span className="em">{r.email}</span>
                        </td>
                        <td style={{ fontSize: 12 }}>{STAFF_ROLE_LABEL[r.role]}</td>
                        <td style={{ textAlign: "right" }}>
                          {r.issue ? (
                            <span className={`adm-row-status ${r.issue === "Already on file" || r.issue === "Duplicate in file" ? "warn" : "err"}`}>
                              {r.issue}
                            </span>
                          ) : (
                            <span className="adm-row-status ok">✓ Ready</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {staged.rows.length > 8 && (
                      <tr>
                        <td colSpan={4} className="adm-empty" style={{ padding: "12px 20px" }}>
                          Showing 8 of {staged.rows.length} rows.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </>
            )}

            <div className="adm-modal-actions">
              <button className="btn" onClick={() => { setShowUpload(false); setStaged(null); }}>
                Cancel
              </button>
              {staged && (
                <button className="btn primary" disabled={clean.length === 0} onClick={commitUpload}>
                  Add {clean.length} staff record{clean.length === 1 ? "" : "s"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
