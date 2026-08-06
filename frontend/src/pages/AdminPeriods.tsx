import { useState } from "react";
import Sidebar from "../components/Sidebar";
import AdminNav from "../components/AdminNav";
import { useSession } from "../useSession";
import { ACADEMIC_PERIODS, TEACHING_PERIODS, periodShortCode, type AcademicPeriod, type PeriodStatus } from "../mockData";

const STATUS_LABEL: Record<PeriodStatus, string> = { active: "Active", planning: "Planning", archived: "Archived" };

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

const nextYear = new Date().getFullYear() + 1;

type FormState = {
  year: string;
  period: string;
  teachingStart: string;
  teachingEnd: string;
  copyFrom: string;
  setActive: boolean;
};

const BLANK_FORM: FormState = {
  year: String(nextYear),
  period: TEACHING_PERIODS[0],
  teachingStart: "",
  teachingEnd: "",
  copyFrom: "",
  setActive: false,
};

export default function AdminPeriods() {
  const session = useSession();
  const [periods, setPeriods] = useState<AcademicPeriod[]>(ACADEMIC_PERIODS);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<AcademicPeriod | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [flash, setFlash] = useState("");

  if (!session) return null;

  const active = periods.find((p) => p.status === "active");
  const planning = periods.filter((p) => p.status === "planning");
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const openAdd = () => {
    setForm(BLANK_FORM);
    setShowAdd(true);
  };

  const duplicateLabel = (() => {
    const label = `${form.year} ${periodShortCode(form.period)}`;
    return periods.some((p) => p.label === label) ? label : null;
  })();

  const createPeriod = () => {
    const short = periodShortCode(form.period);
    const source = periods.find((p) => p.id === form.copyFrom);
    const created: AcademicPeriod = {
      id: `${form.year}-${short}`,
      year: Number(form.year),
      period: form.period,
      label: `${form.year} ${short}`,
      status: form.setActive ? "active" : "planning",
      teachingStart: form.teachingStart,
      teachingEnd: form.teachingEnd,
      // Copying a previous period brings its unit list across; students are
      // always loaded fresh per period via the enrolment upload.
      unitCount: source ? source.unitCount : 0,
      studentCount: 0,
      staffCount: source ? source.staffCount : 0,
    };

    setPeriods((prev) => {
      const next = form.setActive ? prev.map((p) => (p.status === "active" ? { ...p, status: "archived" as PeriodStatus } : p)) : [...prev];
      return [created, ...next].sort((a, b) => b.id.localeCompare(a.id));
    });
    setFlash(
      source
        ? `${created.label} created — ${source.unitCount} units copied from ${source.label}. Upload enrolments to register students.`
        : `${created.label} created. Next: add units to this period.`
    );
    setShowAdd(false);
  };

  const saveEdit = () => {
    if (!editing) return;
    setPeriods((prev) => prev.map((p) => (p.id === editing.id ? editing : p)));
    setFlash(`${editing.label} updated.`);
    setEditing(null);
  };

  const setStatus = (id: string, status: PeriodStatus) => {
    setPeriods((prev) =>
      prev.map((p) => {
        if (p.id === id) return { ...p, status };
        // Only one period can be the active teaching period at a time.
        if (status === "active" && p.status === "active") return { ...p, status: "archived" };
        return p;
      })
    );
  };

  const canCreate = form.year.trim().length === 4 && !!form.period && !duplicateLabel;

  return (
    <div className="app">
      <Sidebar user={session.user} />
      <main className="main">
        <div className="topbar">
          <div className="crumbs">
            Administration <span className="sep">›</span> <strong>Academic periods</strong>
          </div>
          <div className="top-actions">
            <button className="btn ghost">Export</button>
            <button className="btn primary" onClick={openAdd}>
              + Add academic period
            </button>
          </div>
        </div>

        <div className="content">
          <div className="unit-banner">
            <div>
              <h1 style={{ fontSize: 26 }}>Academic periods</h1>
              <div className="sub">
                Faculty of IT &nbsp;·&nbsp; Create the year and teaching period before adding units, staff or enrolments. Only one
                period is the <strong>active</strong> teaching period at a time.
              </div>
            </div>
          </div>

          <AdminNav counts={{ "/admin/periods": periods.length }} />

          {flash && (
            <div className="adm-flash">
              ✓ {flash}
              <span className="x" onClick={() => setFlash("")}>
                ✕
              </span>
            </div>
          )}

          <div className="adm-stats">
            <div className="adm-stat ok">
              <div className="lbl">
                <span className="b" />
                Active period
              </div>
              <div className="v">{active ? active.label : "—"}</div>
              <div className="sub">{active ? `${formatDate(active.teachingStart)} – ${formatDate(active.teachingEnd)}` : "No active period"}</div>
            </div>
            <div className="adm-stat navy">
              <div className="lbl">
                <span className="b" />
                Units this period
              </div>
              <div className="v">{active ? active.unitCount : 0}</div>
              <div className="sub">Offerings attached to {active ? active.label : "—"}</div>
            </div>
            <div className="adm-stat">
              <div className="lbl">
                <span className="b" />
                Students registered
              </div>
              <div className="v">{(active?.studentCount ?? 0).toLocaleString()}</div>
              <div className="sub">Across all units in the active period</div>
            </div>
            <div className="adm-stat warn">
              <div className="lbl">
                <span className="b" />
                Being planned
              </div>
              <div className="v">{planning.length}</div>
              <div className="sub">{planning.length ? planning.map((p) => p.label).join(" · ") : "No upcoming periods"}</div>
            </div>
          </div>

          <div className="adm-card">
            <div className="adm-card-head">
              <div>
                <h4>All periods</h4>
                <div className="h-sub">Newest first. Archiving a period keeps its data for reporting but stops new uploads.</div>
              </div>
            </div>
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Teaching dates</th>
                  <th className="num">Units</th>
                  <th className="num">Students</th>
                  <th className="num">Staff</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="adm-code">{p.label}</span>
                      <span style={{ marginLeft: 10, color: "var(--ink-2)", fontSize: 12.5 }}>{p.period}</span>
                    </td>
                    <td className="mono">
                      {formatDate(p.teachingStart)} – {formatDate(p.teachingEnd)}
                    </td>
                    <td className="num">{p.unitCount}</td>
                    <td className="num">{p.studentCount.toLocaleString()}</td>
                    <td className="num">{p.staffCount}</td>
                    <td>
                      <span className={`adm-status ${p.status}`}>
                        <span className="d" />
                        {STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td>
                      <div className="adm-row-act">
                        {p.status !== "active" && (
                          <button className="adm-btn-sm navy" onClick={() => setStatus(p.id, "active")}>
                            Set active
                          </button>
                        )}
                        <button className="adm-btn-sm" onClick={() => setEditing(p)}>
                          Edit
                        </button>
                        {p.status !== "archived" && (
                          <button className="adm-btn-sm danger" onClick={() => setStatus(p.id, "archived")}>
                            Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showAdd && (
        <div className="adm-modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add academic period</h3>
            <div className="adm-modal-sub">
              Creates a new teaching period such as <strong>2026 S1</strong>. Units, staff assignments and enrolments are all
              recorded against the period you create here.
            </div>

            <div className="adm-form">
              <div className="adm-form-2">
                <label className="adm-field mono">
                  <span className="lbl">Year</span>
                  <input value={form.year} inputMode="numeric" maxLength={4} onChange={(e) => set({ year: e.target.value.replace(/\D/g, "") })} />
                </label>
                <label className="adm-field">
                  <span className="lbl">Teaching period</span>
                  <select value={form.period} onChange={(e) => set({ period: e.target.value })}>
                    {TEACHING_PERIODS.map((tp) => (
                      <option key={tp} value={tp}>
                        {tp}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="adm-field">
                <span className="lbl">Period code</span>
                <div className="hint">
                  Will be created as{" "}
                  <span className="adm-code">
                    {form.year || "YYYY"} {periodShortCode(form.period)}
                  </span>
                  {duplicateLabel && <span style={{ color: "var(--risk)", marginLeft: 8 }}>This period already exists.</span>}
                </div>
              </div>

              <div className="adm-form-2">
                <label className="adm-field">
                  <span className="lbl">Teaching starts</span>
                  <input type="date" value={form.teachingStart} onChange={(e) => set({ teachingStart: e.target.value })} />
                </label>
                <label className="adm-field">
                  <span className="lbl">Teaching ends</span>
                  <input type="date" value={form.teachingEnd} onChange={(e) => set({ teachingEnd: e.target.value })} />
                </label>
              </div>

              <label className="adm-field">
                <span className="lbl">Copy unit structure from</span>
                <select value={form.copyFrom} onChange={(e) => set({ copyFrom: e.target.value })}>
                  <option value="">Start empty — add units manually</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} · {p.unitCount} units
                    </option>
                  ))}
                </select>
                <span className="hint">
                  Copies the unit list, coordinators and assessment structure across. Student enrolments are never copied — upload
                  them per period.
                </span>
              </label>

              <label className="adm-check">
                <input type="checkbox" checked={form.setActive} onChange={(e) => set({ setActive: e.target.checked })} />
                <span>
                  Make this the active teaching period now
                  {active && <span style={{ color: "var(--ink-3)" }}> — {active.label} will be archived</span>}
                </span>
              </label>
            </div>

            <div className="adm-modal-actions">
              <button className="btn" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button className="btn primary" disabled={!canCreate} onClick={createPeriod}>
                Create period
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="adm-modal-overlay" onClick={() => setEditing(null)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit {editing.label}</h3>
            <div className="adm-modal-sub">
              {editing.unitCount} units · {editing.studentCount.toLocaleString()} students registered
            </div>

            <div className="adm-form">
              <div className="adm-form-2">
                <label className="adm-field">
                  <span className="lbl">Teaching starts</span>
                  <input type="date" value={editing.teachingStart} onChange={(e) => setEditing({ ...editing, teachingStart: e.target.value })} />
                </label>
                <label className="adm-field">
                  <span className="lbl">Teaching ends</span>
                  <input type="date" value={editing.teachingEnd} onChange={(e) => setEditing({ ...editing, teachingEnd: e.target.value })} />
                </label>
              </div>
              <label className="adm-field">
                <span className="lbl">Status</span>
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as PeriodStatus })}>
                  <option value="planning">Planning — not yet teaching</option>
                  <option value="active">Active — currently teaching</option>
                  <option value="archived">Archived — read-only</option>
                </select>
              </label>
            </div>

            <div className="adm-modal-actions">
              <button className="btn" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn primary" onClick={saveEdit}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
