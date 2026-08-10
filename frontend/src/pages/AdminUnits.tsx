import { useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import AdminNav from "../components/AdminNav";
import { useSession } from "../useSession";
import {
  ACADEMIC_PERIODS,
  STAFF_RECORDS,
  STAFF_ROLE_LABEL,
  UNIT_OFFERINGS,
  type StaffRole,
  type UnitOffering,
  type UnitStatus,
} from "../mockData";
import { Link } from "react-router-dom";
import { getSelectedUnit } from "../api";

const selectedUnit = getSelectedUnit();
const unitCode = selectedUnit?.unitCode ?? "FIT2004";

const STATUS_LABEL: Record<UnitStatus, string> = { active: "Active", draft: "Draft", discontinued: "Discontinued" };
const ASSIGNABLE_ROLES: StaffRole[] = ["coordinator", "lecturer", "tutor"];

const staffById = (staffId: string) => STAFF_RECORDS.find((s) => s.staffId === staffId);

type UnitForm = {
  code: string;
  name: string;
  periodId: string;
  creditPoints: string;
  coordinatorId: string;
  status: UnitStatus;
  replacedBy: string;
  cloneFrom: string;
};

let nextRowKey = 500;

export default function AdminUnits() {
  const session = useSession();
  const [units, setUnits] = useState<UnitOffering[]>(UNIT_OFFERINGS);
  const [periodId, setPeriodId] = useState(ACADEMIC_PERIODS.find((p) => p.status === "active")?.id ?? ACADEMIC_PERIODS[0].id);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | UnitStatus>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [assignKey, setAssignKey] = useState<string | null>(null);
  const [form, setForm] = useState<UnitForm | null>(null);
  const [addStaffId, setAddStaffId] = useState("");
  const [addStaffRole, setAddStaffRole] = useState<StaffRole>("lecturer");
  const [flash, setFlash] = useState("");

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return units.filter((u) => {
      if (u.periodId !== periodId) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (!term) return true;
      return u.code.toLowerCase().includes(term) || u.name.toLowerCase().includes(term);
    });
  }, [units, periodId, statusFilter, search]);

  if (!session) return null;

  const periodUnits = units.filter((u) => u.periodId === periodId);
  const withoutCoordinator = periodUnits.filter((u) => u.status !== "discontinued" && !u.staff.some((s) => s.role === "coordinator"));
  const editing = units.find((u) => u.rowKey === editKey) ?? null;
  const assigning = units.find((u) => u.rowKey === assignKey) ?? null;
  const setField = (patch: Partial<UnitForm>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const openAdd = () => {
    setForm({ code: "", name: "", periodId, creditPoints: "6", coordinatorId: "", status: "draft", replacedBy: "", cloneFrom: "" });
    setShowAdd(true);
  };

  const openEdit = (unit: UnitOffering) => {
    setForm({
      code: unit.code,
      name: unit.name,
      periodId: unit.periodId,
      creditPoints: String(unit.creditPoints),
      coordinatorId: unit.staff.find((s) => s.role === "coordinator")?.staffId ?? "",
      status: unit.status,
      replacedBy: unit.replacedBy ?? "",
      cloneFrom: "",
    });
    setEditKey(unit.rowKey);
  };

  const createUnit = () => {
    if (!form) return;
    const clone = units.find((u) => u.rowKey === form.cloneFrom);
    const created: UnitOffering = {
      rowKey: `new-${nextRowKey++}`,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      periodId: form.periodId,
      creditPoints: Number(form.creditPoints) || 6,
      studentCount: 0,
      status: form.status,
      replacedBy: null,
      handbookSynced: false,
      staff: form.coordinatorId ? [{ staffId: form.coordinatorId, role: "coordinator" }] : [],
    };
    setUnits((prev) => [created, ...prev]);
    setFlash(
      clone
        ? `${created.code} added to ${form.periodId} — LO ↔ PLO mapping and assessments copied from ${clone.code} (${clone.periodId}).`
        : `${created.code} added to ${form.periodId}. Run a handbook sync to pull its learning outcomes.`
    );
    setShowAdd(false);
    setPeriodId(form.periodId);
  };

  const saveUnit = () => {
    if (!form || !editing) return;
    const code = form.code.trim().toUpperCase();
    const replacedBy = form.replacedBy.trim().toUpperCase();
    setUnits((prev) =>
      prev.map((u) =>
        u.rowKey !== editing.rowKey
          ? u
          : {
              ...u,
              code,
              name: form.name.trim(),
              creditPoints: Number(form.creditPoints) || 6,
              status: form.status,
              replacedBy: replacedBy || null,
              staff: form.coordinatorId
                ? [{ staffId: form.coordinatorId, role: "coordinator" as StaffRole }, ...u.staff.filter((s) => s.role !== "coordinator")]
                : u.staff.filter((s) => s.role !== "coordinator"),
            }
      )
    );
    setFlash(
      editing.code !== code
        ? `Unit code changed: ${editing.code} → ${code}. Existing mappings, assessments and grades follow the new code.`
        : `${code} updated.`
    );
    setEditKey(null);
  };

  const assignStaff = () => {
    if (!assigning || !addStaffId) return;
    setUnits((prev) =>
      prev.map((u) => {
        if (u.rowKey !== assigning.rowKey) return u;
        // A unit has exactly one coordinator — assigning a new one replaces it.
        const cleaned = addStaffRole === "coordinator" ? u.staff.filter((s) => s.role !== "coordinator") : u.staff;
        return { ...u, staff: [...cleaned.filter((s) => s.staffId !== addStaffId), { staffId: addStaffId, role: addStaffRole }] };
      })
    );
    setAddStaffId("");
    setAddStaffRole("lecturer");
  };

  const changeStaffRole = (rowKey: string, staffId: string, role: StaffRole) => {
    setUnits((prev) =>
      prev.map((u) => {
        if (u.rowKey !== rowKey) return u;
        const cleaned = role === "coordinator" ? u.staff.filter((s) => s.role !== "coordinator" || s.staffId === staffId) : u.staff;
        return { ...u, staff: cleaned.map((s) => (s.staffId === staffId ? { ...s, role } : s)) };
      })
    );
  };

  const removeStaff = (rowKey: string, staffId: string) => {
    setUnits((prev) => prev.map((u) => (u.rowKey === rowKey ? { ...u, staff: u.staff.filter((s) => s.staffId !== staffId) } : u)));
  };

  const unassignedStaff = assigning ? STAFF_RECORDS.filter((s) => !assigning.staff.some((a) => a.staffId === s.staffId)) : [];
  const canCreate = !!form && /^[A-Z]{3}\d{4}$/i.test(form.code.trim()) && form.name.trim().length > 2;

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
            <strong>Units & Offerings</strong>
          </div>
          <div className="top-actions">
            <button className="btn ghost">Export</button>
            <button className="btn primary" onClick={openAdd}>
              + Add unit
            </button>
          </div>
        </div>

        <div className="content">
          <div className="unit-banner">
            <div>
              <h1 style={{ fontSize: 26 }}>Units &amp; offerings</h1>
              <div className="sub">
                Faculty of IT &nbsp;·&nbsp; Add the units running in each teaching period, assign the staff who teach them, and
                record unit code changes or replacements.
              </div>
            </div>
          </div>

          <AdminNav counts={{ "/admin/units": periodUnits.length }} />

          {flash && (
            <div className="adm-flash">
              ✓ {flash}
              <span className="x" onClick={() => setFlash("")}>
                ✕
              </span>
            </div>
          )}

          {withoutCoordinator.length > 0 && (
            <div className="banner warn">
              <div className="ico">!</div>
              <div className="body">
                <strong>
                  {withoutCoordinator.length} unit{withoutCoordinator.length > 1 ? "s" : ""} have no coordinator assigned
                </strong>
                {withoutCoordinator.map((u) => u.code).join(", ")} — assign a coordinator before the teaching period starts, or
                nobody can confirm the LO ↔ PLO mapping.
              </div>
            </div>
          )}

          <div className="adm-toolbar">
            <div className="adm-search">
              ⌕
              <input placeholder="Search unit code or name…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <span className="adm-toolbar-lbl">Period</span>
            <select className="adm-select" value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
              {ACADEMIC_PERIODS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                  {p.status === "active" ? " · active" : p.status === "planning" ? " · planning" : ""}
                </option>
              ))}
            </select>
            <span className="adm-toolbar-lbl">Status</span>
            <select className="adm-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | UnitStatus)}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="discontinued">Discontinued</option>
            </select>
            <span className="adm-count">
              {visible.length} of {periodUnits.length} units
            </span>
          </div>

          <div className="adm-card">
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Coordinator</th>
                  <th>Teaching staff</th>
                  <th className="num">CP</th>
                  <th className="num">Students</th>
                  <th>Handbook</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={8} className="adm-empty">
                      No units match this filter. Use <strong>+ Add unit</strong> to add one to this period.
                    </td>
                  </tr>
                )}
                {visible.map((u) => {
                  const coordinator = u.staff.find((s) => s.role === "coordinator");
                  const others = u.staff.filter((s) => s.role !== "coordinator");
                  return (
                    <tr key={u.rowKey}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <span className="adm-code">{u.code}</span>
                          {u.replacedBy && <span className="tag warn">→ replaced by {u.replacedBy}</span>}
                        </div>
                        <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 5 }}>{u.name}</div>
                      </td>
                      <td>
                        {coordinator ? (
                          <span style={{ fontSize: 12.5 }}>{staffById(coordinator.staffId)?.name ?? coordinator.staffId}</span>
                        ) : (
                          <span className="unassigned">— unassigned —</span>
                        )}
                      </td>
                      <td>
                        {others.length === 0 ? (
                          <span className="muted" style={{ fontSize: 12 }}>
                            None
                          </span>
                        ) : (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {others.map((s) => (
                              <span key={s.staffId} className="tag" title={STAFF_ROLE_LABEL[s.role]}>
                                {staffById(s.staffId)?.name.split(" ").slice(-1)[0] ?? s.staffId}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="num">{u.creditPoints}</td>
                      <td className="num">{u.studentCount || "—"}</td>
                      <td>
                        {u.handbookSynced ? (
                          <span className="pill ok">
                            <span className="dot" />
                            Synced
                          </span>
                        ) : (
                          <span className="pill warn">
                            <span className="dot" />
                            Not synced
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`adm-status ${u.status}`}>
                          <span className="d" />
                          {STATUS_LABEL[u.status]}
                        </span>
                      </td>
                      <td>
                        <div className="adm-row-act">
                          <button className="adm-btn-sm navy" onClick={() => setAssignKey(u.rowKey)}>
                            Assign staff
                          </button>
                          <button className="adm-btn-sm" onClick={() => openEdit(u)}>
                            Edit
                          </button>
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

      {/* Add unit */}
      {showAdd && form && (
        <div className="adm-modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add unit to a period</h3>
            <div className="adm-modal-sub">
              Registers a unit offering such as <strong>FIT3161</strong> against a teaching period. Learning outcomes come from the
              handbook sync once the unit exists.
            </div>

            <div className="adm-form">
              <div className="adm-form-2">
                <label className="adm-field mono">
                  <span className="lbl">Unit code</span>
                  <input placeholder="FIT3161" value={form.code} onChange={(e) => setField({ code: e.target.value.toUpperCase() })} />
                </label>
                <label className="adm-field">
                  <span className="lbl">Academic period</span>
                  <select value={form.periodId} onChange={(e) => setField({ periodId: e.target.value })}>
                    {ACADEMIC_PERIODS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="adm-field">
                <span className="lbl">Unit name</span>
                <input placeholder="Computer Science Project 1" value={form.name} onChange={(e) => setField({ name: e.target.value })} />
              </label>

              <div className="adm-form-2">
                <label className="adm-field">
                  <span className="lbl">Credit points</span>
                  <select value={form.creditPoints} onChange={(e) => setField({ creditPoints: e.target.value })}>
                    <option value="6">6</option>
                    <option value="12">12</option>
                    <option value="18">18</option>
                    <option value="24">24</option>
                  </select>
                </label>
                <label className="adm-field">
                  <span className="lbl">Status</span>
                  <select value={form.status} onChange={(e) => setField({ status: e.target.value as UnitStatus })}>
                    <option value="draft">Draft — still being set up</option>
                    <option value="active">Active — teaching this period</option>
                  </select>
                </label>
              </div>

              <label className="adm-field">
                <span className="lbl">Unit coordinator</span>
                <select value={form.coordinatorId} onChange={(e) => setField({ coordinatorId: e.target.value })}>
                  <option value="">Assign later</option>
                  {STAFF_RECORDS.filter((s) => s.status !== "inactive").map((s) => (
                    <option key={s.staffId} value={s.staffId}>
                      {s.name} · {s.staffId}
                    </option>
                  ))}
                </select>
                <span className="hint">You can add lecturers and tutors afterwards from the unit's “Assign staff” action.</span>
              </label>

              <label className="adm-field">
                <span className="lbl">Copy setup from a previous offering</span>
                <select value={form.cloneFrom} onChange={(e) => setField({ cloneFrom: e.target.value })}>
                  <option value="">Start empty</option>
                  {units.map((u) => (
                    <option key={u.rowKey} value={u.rowKey}>
                      {u.code} · {u.periodId}
                    </option>
                  ))}
                </select>
                <span className="hint">Brings across the LO ↔ PLO mapping and assessment structure so it only needs reviewing.</span>
              </label>
            </div>

            <div className="adm-modal-actions">
              <button className="btn" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button className="btn primary" disabled={!canCreate} onClick={createUnit}>
                Add unit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit unit */}
      {editing && form && (
        <div className="adm-modal-overlay" onClick={() => setEditKey(null)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit {editing.code}</h3>
            <div className="adm-modal-sub">
              {editing.periodId} · {editing.studentCount || 0} students registered
            </div>

            <div className="adm-form">
              <div className="adm-form-2">
                <label className="adm-field mono">
                  <span className="lbl">Unit code</span>
                  <input value={form.code} onChange={(e) => setField({ code: e.target.value.toUpperCase() })} />
                </label>
                <label className="adm-field">
                  <span className="lbl">Credit points</span>
                  <select value={form.creditPoints} onChange={(e) => setField({ creditPoints: e.target.value })}>
                    <option value="6">6</option>
                    <option value="12">12</option>
                    <option value="18">18</option>
                    <option value="24">24</option>
                  </select>
                </label>
              </div>

              <label className="adm-field">
                <span className="lbl">Unit name</span>
                <input value={form.name} onChange={(e) => setField({ name: e.target.value })} />
              </label>

              <label className="adm-field">
                <span className="lbl">Unit coordinator</span>
                <select value={form.coordinatorId} onChange={(e) => setField({ coordinatorId: e.target.value })}>
                  <option value="">Unassigned</option>
                  {STAFF_RECORDS.filter((s) => s.status !== "inactive").map((s) => (
                    <option key={s.staffId} value={s.staffId}>
                      {s.name} · {s.staffId}
                    </option>
                  ))}
                </select>
              </label>

              <div className="adm-form-2">
                <label className="adm-field">
                  <span className="lbl">Status</span>
                  <select value={form.status} onChange={(e) => setField({ status: e.target.value as UnitStatus })}>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </label>
                <label className="adm-field mono">
                  <span className="lbl">Replacement unit code</span>
                  <input placeholder="e.g. FIT3164" value={form.replacedBy} onChange={(e) => setField({ replacedBy: e.target.value.toUpperCase() })} />
                </label>
              </div>

              <div className="adm-modal-note">
                Renaming a unit code keeps its history — existing mappings, assessments and uploaded grades stay attached and follow
                the new code. Use <strong>Replacement unit code</strong> when a unit is retired and superseded by a different unit,
                so reporting can still trace the lineage.
              </div>
            </div>

            <div className="adm-modal-actions">
              <button className="btn" onClick={() => setEditKey(null)}>
                Cancel
              </button>
              <button className="btn primary" onClick={saveUnit}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign staff */}
      {assigning && (
        <div className="adm-modal-overlay" onClick={() => setAssignKey(null)}>
          <div className="adm-modal wide" onClick={(e) => e.stopPropagation()}>
            <h3>Assign staff — {assigning.code}</h3>
            <div className="adm-modal-sub">
              {assigning.name} · {assigning.periodId}. Staff are assigned by staff ID; their access to the unit's dashboard,
              mapping and grade upload follows the role you give them here.
            </div>

            <div className="adm-assign-list">
              {assigning.staff.length === 0 && <div className="adm-empty">Nobody is assigned to this unit yet.</div>}
              {assigning.staff.map((link) => {
                const person = staffById(link.staffId);
                return (
                  <div key={link.staffId} className="adm-assign-row">
                    <div className="who">
                      {person?.name ?? "Unknown staff"}
                      <span className="id">
                        {link.staffId}
                        {person ? ` · ${person.email}` : ""}
                      </span>
                    </div>
                    <select value={link.role} onChange={(e) => changeStaffRole(assigning.rowKey, link.staffId, e.target.value as StaffRole)}>
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {STAFF_ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                    <div className="rm" title="Remove from unit" onClick={() => removeStaff(assigning.rowKey, link.staffId)}>
                      ✕
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="adm-add-row">
              <label className="adm-field">
                <span className="lbl">Add staff by ID or name</span>
                <select value={addStaffId} onChange={(e) => setAddStaffId(e.target.value)}>
                  <option value="">Select staff…</option>
                  {unassignedStaff.map((s) => (
                    <option key={s.staffId} value={s.staffId}>
                      {s.staffId} · {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="adm-field">
                <span className="lbl">Role</span>
                <select value={addStaffRole} onChange={(e) => setAddStaffRole(e.target.value as StaffRole)}>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {STAFF_ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn" disabled={!addStaffId} onClick={assignStaff}>
                Add to unit
              </button>
            </div>

            <div className="adm-modal-actions">
              <button
                className="btn primary"
                onClick={() => {
                  setFlash(`${assigning.code} now has ${assigning.staff.length} staff assigned.`);
                  setAssignKey(null);
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
