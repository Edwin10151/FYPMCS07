import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createOfferingsFromRoster, deleteAdminOffering, errorMessage, type AdminOffering } from "../api";
import AdminSidebar from "../components/AdminSidebar";
import "../components/AdminNav.css";
import { useAdminContext } from "../useAdminContext";
import "./AdminOfferings.css";

export default function AdminOfferings() {
  const { session, data, error, loading, reload } = useAdminContext();
  const [semesterId, setSemesterId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<{ unit_code: string; unit_name: string; program_ids: number[]; coordinator_id: string }>({ unit_code: "", unit_name: "", program_ids: [], coordinator_id: "" });
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");
  const [flashError, setFlashError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminOffering | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (semesterId || !data?.periods.length) return;
    setSemesterId(data.periods.find((period) => period.status === "active")?.semester_id ?? data.periods[0].semester_id);
  }, [data, semesterId]);

  if (!session) return null;

  const period = data?.periods.find((item) => item.semester_id === semesterId) ?? null;
  const offerings = data?.offerings.filter((offering) => offering.semester_id === semesterId) ?? [];
  const unassignedCount = offerings.filter((offering) => offering.coordinator_id === null).length;
  const coordinators = data?.staff.filter((staff) => staff.role_name === "coordinator" && staff.is_active) ?? [];

  const openAdd = () => {
    setForm({ unit_code: "", unit_name: "", program_ids: [], coordinator_id: "" });
    setFlashError("");
    setAddOpen(true);
  };

  const toggleFormProgram = (programId: number) => {
    setForm((previous) => ({
      ...previous,
      program_ids: previous.program_ids.includes(programId) ? previous.program_ids.filter((id) => id !== programId) : [...previous.program_ids, programId],
    }));
  };

  const canAdd = /^[A-Za-z]{3}\d{4}/.test(form.unit_code.trim()) && form.unit_name.trim().length > 2;

  const addUnit = async () => {
    if (!session || !semesterId) return;
    setSaving(true);
    setFlashError("");
    try {
      const result = await createOfferingsFromRoster(session.access_token, semesterId, [{
        unit_code: form.unit_code.trim(),
        unit_name: form.unit_name.trim(),
        programme_codes: [],
        program_ids: form.program_ids,
        coordinator_id: form.coordinator_id ? Number(form.coordinator_id) : null,
      }]);
      if (result.created.length === 0) {
        setFlashError(result.warnings.join(" ") || "This unit already has an offering this semester.");
        return;
      }
      const synced = result.created[0]?.staffing_rows_synced ?? 0;
      const newAccounts = result.created[0]?.accounts_created ?? [];
      const syncNote = synced > 0 ? ` ${synced} tutor roster row${synced === 1 ? "" : "s"} matched automatically.` : "";
      const accountsNote = newAccounts.length > 0 ? ` ${newAccounts.length} new staff account${newAccounts.length === 1 ? "" : "s"} created (default password).` : "";
      setFlash(`${form.unit_code.trim().toUpperCase()} added${result.warnings.length ? ` — ${result.warnings.join(" ")}` : "."}${syncNote}${accountsNote}`);
      setAddOpen(false);
      await reload();
    } catch (err) {
      setFlashError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!session || !deleteTarget) return;
    setDeleting(true);
    setFlashError("");
    try {
      await deleteAdminOffering(session.access_token, deleteTarget.offering_id);
      setFlash(`${deleteTarget.unit_code} was removed from ${period ? `${period.year} ${period.period}` : "this semester"}.`);
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      setFlashError(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="app">
      <AdminSidebar user={session.user} />
      <main className="main">
        <div className="topbar">
          <div className="crumbs"><Link to="/units">Home</Link><span className="sep">›</span><Link to="/admin/setup">Semester Setup</Link><span className="sep">›</span><strong>Unit Offerings</strong></div>
          <div className="top-actions"><button className="btn primary" disabled={!semesterId} onClick={openAdd}>+ Add unit</button></div>
        </div>
        <div className="content">
          <div className="unit-banner">
            <div>
              <h1 style={{ fontSize: 26 }}>Unit Offerings</h1>
              <div className="sub">Units registered for a semester. Deleting a unit here also removes its Tutor List staffing rows — the unit goes back to "unmatched" on the Tutor List page.</div>
            </div>
            <select className="adm-select" value={semesterId ?? ""} onChange={(event) => setSemesterId(Number(event.target.value))}>
              {data?.periods.map((item) => <option key={item.semester_id} value={item.semester_id}>{item.year} {item.period} · {item.status}</option>)}
            </select>
          </div>

          {(error || flashError) && <div className="banner"><div className="ico">!</div><div className="body">{error || flashError}</div></div>}
          {flash && <div className="adm-flash">{flash}<span className="x" onClick={() => setFlash("")}>✕</span></div>}
          {unassignedCount > 0 && (
            <div className="banner warn"><div className="ico">!</div><div className="body">{unassignedCount} unit{unassignedCount === 1 ? "" : "s"} in {period ? `${period.year} ${period.period}` : "this semester"} {unassignedCount === 1 ? "has" : "have"} no coordinator assigned yet.</div></div>
          )}

          <div className="adm-card">
            <div className="adm-card-head"><div><h4>Units for {period ? `${period.year} ${period.period}` : "this semester"}</h4><div className="h-sub">{offerings.length} unit{offerings.length === 1 ? "" : "s"} registered.</div></div></div>
            {loading ? <div className="adm-empty">Loading units...</div> : offerings.length === 0 ? (
              <div className="adm-empty">No units registered for this semester yet.</div>
            ) : (
              <table className="adm-tbl"><thead><tr><th>Unit code</th><th>Unit name</th><th>Programmes</th><th>Coordinator</th><th style={{ textAlign: "right" }}>Remove</th></tr></thead><tbody>
                {offerings.map((offering) => <tr key={offering.offering_id}>
                  <td className="mono">{offering.unit_code}</td>
                  <td>{offering.unit_name}</td>
                  <td className="muted">{offering.program_codes.join(", ") || "—"}</td>
                  <td>{offering.coordinator_name ?? <span className="unassigned">Unassigned</span>}</td>
                  <td style={{ textAlign: "right" }}><div className="row-tools"><button type="button" className="ic danger" title={`Delete ${offering.unit_code}`} onClick={() => setDeleteTarget(offering)}>×</button></div></td>
                </tr>)}
              </tbody></table>
            )}
          </div>
        </div>
      </main>

      {addOpen && (
        <div className="adm-modal-overlay" onClick={() => !saving && setAddOpen(false)}>
          <div className="adm-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Add unit to {period ? `${period.year} ${period.period}` : "this semester"}</h3>
            <div className="adm-modal-sub">Linking a programme here is what makes this unit's PLOs available on the LO ↔ PLO mapping page — without one, the mapping matrix has nothing to map against.</div>
            <div className="adm-form">
              <div className="adm-form-2">
                <label className="adm-field mono"><span className="lbl">Unit code</span><input value={form.unit_code} onChange={(event) => setForm({ ...form, unit_code: event.target.value.toUpperCase() })} placeholder="FIT1008" /></label>
                <label className="adm-field"><span className="lbl">Coordinator</span>
                  <select value={form.coordinator_id} onChange={(event) => setForm({ ...form, coordinator_id: event.target.value })}>
                    <option value="">Unassigned for now</option>
                    {coordinators.map((staff) => <option key={staff.user_id} value={staff.user_id}>{staff.full_name}</option>)}
                  </select>
                </label>
              </div>
              <label className="adm-field"><span className="lbl">Unit name</span><input value={form.unit_name} onChange={(event) => setForm({ ...form, unit_name: event.target.value })} placeholder="Fundamentals of algorithms" /></label>
              <div className="adm-field">
                <span className="lbl">Programmes</span>
                {(data?.programs ?? []).length === 0 ? <span className="hint">No programmes are on file yet.</span> : (
                  <div className="program-checklist">
                    {(data?.programs ?? []).map((program) => (
                      <label key={program.program_id} className="program-check">
                        <input type="checkbox" checked={form.program_ids.includes(program.program_id)} onChange={() => toggleFormProgram(program.program_id)} />
                        <span className="mono">{program.program_code}</span> {program.program_name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="adm-modal-actions">
              <button className="btn" disabled={saving} onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="btn primary" disabled={saving || !canAdd} onClick={() => void addUnit()}>{saving ? "Adding..." : "Add unit"}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="adm-modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="adm-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Remove {deleteTarget.unit_code}?</h3>
            <div className="adm-modal-sub">This deletes the offering for {period ? `${period.year} ${period.period}` : "this semester"}, including any Tutor List staffing rows already saved against it. It's blocked if students are already enrolled.</div>
            <div className="adm-modal-actions">
              <button className="btn" disabled={deleting} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn danger" disabled={deleting} onClick={() => void confirmDelete()}>{deleting ? "Removing..." : "Remove unit"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
