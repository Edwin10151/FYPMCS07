import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createOfferingsFromRoster,
  errorMessage,
  getOfferingStaffing,
  getStaffingStatus,
  importStaffingRoster,
  inspectStaffingRoster,
  type OfferingStaffingRow,
  type UnmatchedUnit,
} from "../api";
import AdminSidebar from "../components/AdminSidebar";
import "../components/AdminNav.css";
import { formatFileSize } from "../csv";
import { useAdminContext } from "../useAdminContext";
import "./AdminTutors.css";

const ROLE_LABEL: Record<OfferingStaffingRow["role_type"], string> = {
  lecture: "Lecture",
  tutorial: "Tutorial / Applied Session",
  laboratory: "Laboratory",
};

type Status = {
  source_filename: string;
  imported_at: string;
  units_in_file: number;
  matched_offerings: number;
  staffing_rows_created: number;
  unmatched_units: UnmatchedUnit[];
};

function UnmatchedUnitsPanel({ unmatched, onAddClick, canAdd }: { unmatched: UnmatchedUnit[]; onAddClick: () => void; canAdd: boolean }) {
  const [expanded, setExpanded] = useState(false);
  if (unmatched.length === 0) return null;
  return (
    <div className="adm-card">
      <div className="unmatched-head">
        <button type="button" className="unmatched-toggle" onClick={() => setExpanded((value) => !value)}>
          <span className={`unmatched-arrow${expanded ? " open" : ""}`}>▸</span>
          {unmatched.length} unmatched unit{unmatched.length === 1 ? "" : "s"} — no offering exists yet
        </button>
        {canAdd && <button type="button" className="btn primary" onClick={onAddClick}>Add units to database</button>}
      </div>
      {expanded && (
        <table className="adm-tbl"><thead><tr><th>Unit code</th><th>Unit name</th><th>Programmes</th></tr></thead><tbody>
          {unmatched.map((unit) => <tr key={unit.unit_code}><td className="mono">{unit.unit_code}</td><td>{unit.unit_name || "—"}</td><td className="muted">{unit.programme_codes.join(", ") || "—"}</td></tr>)}
        </tbody></table>
      )}
    </div>
  );
}

export default function AdminTutors() {
  const { session, data, error, loading, reload } = useAdminContext();

  const [file, setFile] = useState<File | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [inspectResult, setInspectResult] = useState<{ units_in_file: number; matched_offerings: number; unmatched_units: UnmatchedUnit[] } | null>(null);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{ units_in_file: number; matched_offerings: number; staffing_rows_created: number; unmatched_units: UnmatchedUnit[]; warnings: string[] } | null>(null);
  const [uploadError, setUploadError] = useState("");

  const [status, setStatus] = useState<Status | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [coordinatorByUnit, setCoordinatorByUnit] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const [staffingOfferingId, setStaffingOfferingId] = useState<number | null>(null);
  const [staffing, setStaffing] = useState<OfferingStaffingRow[] | null>(null);
  const [staffingLoading, setStaffingLoading] = useState(false);
  const [staffingError, setStaffingError] = useState("");
  const [unitQuery, setUnitQuery] = useState("");
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);

  const active = data?.periods.find((period) => period.status === "active") ?? null;
  const offeringsThisSemester = data?.offerings.filter((offering) => offering.semester_id === active?.semester_id && offering.status !== "discontinued") ?? [];
  const coordinators = data?.staff.filter((staff) => staff.role_name === "coordinator" && staff.is_active) ?? [];

  useEffect(() => {
    if (staffingOfferingId || !offeringsThisSemester.length) return;
    setStaffingOfferingId(offeringsThisSemester[0].offering_id);
    // Only auto-select once, the first time offerings become available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offeringsThisSemester.length]);

  useEffect(() => {
    if (!staffingOfferingId || !session) return;
    setStaffingLoading(true);
    setStaffingError("");
    getOfferingStaffing(session.access_token, staffingOfferingId)
      .then((response) => setStaffing(response.staffing))
      .catch((err) => setStaffingError(errorMessage(err)))
      .finally(() => setStaffingLoading(false));
  }, [staffingOfferingId, session]);

  const loadStatus = async (semesterId: number) => {
    if (!session) return;
    setStatusLoading(true);
    try {
      const response = await getStaffingStatus(session.access_token, semesterId);
      setStatus(response.snapshot);
    } catch (err) {
      setUploadError(errorMessage(err));
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    if (!active) return;
    void loadStatus(active.semester_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.semester_id, session]);

  if (!session) return null;
  const staffingOffering = offeringsThisSemester.find((offering) => offering.offering_id === staffingOfferingId) ?? null;

  const chooseFile = async (selectedFile: File) => {
    if (!active) return;
    setFile(selectedFile);
    setInspectResult(null);
    setCommitResult(null);
    setUploadError("");
    setInspecting(true);
    try {
      const response = await inspectStaffingRoster(session.access_token, active.semester_id, selectedFile);
      setInspectResult(response);
    } catch (err) {
      setUploadError(errorMessage(err));
    } finally {
      setInspecting(false);
    }
  };

  const submitImport = async () => {
    if (!active || !file) return;
    setCommitting(true);
    setUploadError("");
    try {
      const response = await importStaffingRoster(session.access_token, active.semester_id, file);
      setCommitResult(response);
      await loadStatus(active.semester_id);
      if (staffingOfferingId) {
        const refreshed = await getOfferingStaffing(session.access_token, staffingOfferingId);
        setStaffing(refreshed.staffing);
      }
      await reload();
    } catch (err) {
      setUploadError(errorMessage(err));
    } finally {
      setCommitting(false);
    }
  };

  const replaceFile = () => { setFile(null); setInspectResult(null); setCommitResult(null); setUploadError(""); };

  const currentUnmatched = commitResult?.unmatched_units ?? inspectResult?.unmatched_units ?? (!file ? status?.unmatched_units ?? [] : []);

  const openAddModal = () => {
    setSelected(new Set());
    setCoordinatorByUnit({});
    setAddError("");
    setAddOpen(true);
  };

  const toggleSelected = (unitCode: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(unitCode)) next.delete(unitCode); else next.add(unitCode);
      return next;
    });
  };

  const submitAdd = async () => {
    if (!active || selected.size === 0) return;
    setAdding(true);
    setAddError("");
    try {
      const items = currentUnmatched
        .filter((unit) => selected.has(unit.unit_code))
        .map((unit) => ({
          unit_code: unit.unit_code,
          unit_name: unit.unit_name,
          programme_codes: unit.programme_codes,
          coordinator_id: coordinatorByUnit[unit.unit_code] ? Number(coordinatorByUnit[unit.unit_code]) : null,
        }));
      const result = await createOfferingsFromRoster(session.access_token, active.semester_id, items);
      setAddOpen(false);
      replaceFile();
      await Promise.all([loadStatus(active.semester_id), reload()]);
      if (result.warnings.length) setUploadError(result.warnings.join(" "));
    } catch (err) {
      setAddError(errorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  const sortedStaffing = useMemo(
    () => [...(staffing ?? [])].sort((a, b) => (a.staff_full_name ?? a.external_name ?? "").localeCompare(b.staff_full_name ?? b.external_name ?? "")),
    [staffing],
  );
  const filteredUnitOptions = useMemo(() => {
    const query = unitQuery.trim().toLowerCase();
    if (!query) return offeringsThisSemester;
    return offeringsThisSemester.filter((offering) => offering.unit_code.toLowerCase().includes(query) || offering.unit_name.toLowerCase().includes(query));
  }, [offeringsThisSemester, unitQuery]);

  return (
    <div className="app">
      <AdminSidebar user={session.user} />
      <main className="main">
        <div className="topbar">
          <div className="crumbs"><Link to="/units">Home</Link><span className="sep">›</span><Link to="/admin/setup">Semester Setup</Link><span className="sep">›</span><strong>Tutor List</strong></div>
        </div>
        <div className="content">
          <div className="unit-banner"><div><h1 style={{ fontSize: 26 }}>Tutor List</h1><div className="sub">Upload the School of IT staffing roster for {active ? `${active.year} ${active.period}` : "the current semester"}. Lecture, tutorial and laboratory rows are matched to unit offerings by unit code.</div></div></div>

          {(error || uploadError) && <div className="banner"><div className="ico">!</div><div className="body">{error || uploadError}<span className="x" style={{ marginLeft: 8, cursor: "pointer" }} onClick={() => setUploadError("")}>✕</span></div></div>}
          {!active && !loading && <div className="banner"><div className="ico">!</div><div className="body">No active semester was found, so a roster can't be matched yet.</div></div>}

          <div className="adm-card">
            <div className="adm-card-head"><div><h4>Upload Tutor List</h4><div className="h-sub">Use the .xlsx roster export — column headers stay the same each semester.</div></div></div>
            {!file ? (
              <div style={{ padding: 20 }}>
                <label className="adm-drop">
                  <div className="icn">XLS</div>
                  <div className="t">Upload Tutor List</div>
                  <div className="s">.xlsx workbook only. The first sheet is read; each unit block may span several staff rows.</div>
                  <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={!active} onChange={(event) => event.target.files?.[0] && void chooseFile(event.target.files[0])} />
                </label>
              </div>
            ) : (
              <div className="adm-file-card">
                <div className="icn">XLS</div>
                <div><div className="nm">{file.name}</div><div className="sub">{formatFileSize(file.size)}</div></div>
                <button className="btn" disabled={inspecting || committing} onClick={replaceFile}>Replace file</button>
              </div>
            )}
          </div>

          {inspecting && <div className="panel">Reading the roster...</div>}

          {/* Step 1: after upload, only the unmatched-units warning + a Submit button. */}
          {inspectResult && !commitResult && (
            <>
              <UnmatchedUnitsPanel unmatched={inspectResult.unmatched_units} canAdd={false} onAddClick={() => {}} />
              <div className="save-bar">
                <div className="stat"><strong>{inspectResult.units_in_file} units read</strong> — {inspectResult.matched_offerings} already have an offering. Submit to save the matched staffing to the database.</div>
                <div className="actions"><button className="btn primary" disabled={committing} onClick={() => void submitImport()}>{committing ? "Submitting..." : "Submit"}</button></div>
              </div>
            </>
          )}

          {/* Step 2: after Submit, the full result. */}
          {commitResult && (
            <>
              <div className="adm-stats">
                <div className="adm-stat navy"><div className="lbl"><span className="b" />Units in file</div><div className="v">{commitResult.units_in_file}</div><div className="sub">Rows read from the roster</div></div>
                <div className="adm-stat ok"><div className="lbl"><span className="b" />Matched offerings</div><div className="v">{commitResult.matched_offerings}</div><div className="sub">Linked to a unit offering</div></div>
                <div className="adm-stat"><div className="lbl"><span className="b" />Staffing rows saved</div><div className="v">{commitResult.staffing_rows_created}</div><div className="sub">Lecture / tutorial / lab rows</div></div>
                <div className="adm-stat warn"><div className="lbl"><span className="b" />Unmatched units</div><div className="v">{commitResult.unmatched_units.length}</div><div className="sub">No offering found for this semester</div></div>
              </div>
              <UnmatchedUnitsPanel unmatched={commitResult.unmatched_units} canAdd onAddClick={openAddModal} />
              {commitResult.warnings.length > 0 && (
                <div className="adm-card">
                  <div className="adm-card-head"><div><h4>Warnings</h4></div></div>
                  <div style={{ padding: "14px 20px" }}>{commitResult.warnings.map((warning, index) => <p key={index} style={{ fontSize: 12.5, color: "var(--warn)", margin: "4px 0" }}>{warning}</p>)}</div>
                </div>
              )}
              {commitResult.unmatched_units.length === 0 && commitResult.warnings.length === 0 && <div className="adm-flash">Every unit in the roster matched an offering for {active ? `${active.year} ${active.period}` : "this semester"}.</div>}
            </>
          )}

          {/* Persisted state: what was already imported, shown even without re-uploading. */}
          {!file && !statusLoading && status && (
            <>
              <div className="us-section-label">Last uploaded — {status.source_filename}</div>
              <div className="adm-stats">
                <div className="adm-stat navy"><div className="lbl"><span className="b" />Units in file</div><div className="v">{status.units_in_file}</div><div className="sub">Rows read from the roster</div></div>
                <div className="adm-stat ok"><div className="lbl"><span className="b" />Matched offerings</div><div className="v">{status.matched_offerings}</div><div className="sub">Linked to a unit offering</div></div>
                <div className="adm-stat"><div className="lbl"><span className="b" />Staffing rows saved</div><div className="v">{status.staffing_rows_created}</div><div className="sub">Lecture / tutorial / lab rows</div></div>
                <div className="adm-stat warn"><div className="lbl"><span className="b" />Unmatched units</div><div className="v">{status.unmatched_units.length}</div><div className="sub">No offering found for this semester</div></div>
              </div>
              <UnmatchedUnitsPanel unmatched={status.unmatched_units} canAdd onAddClick={openAddModal} />
            </>
          )}

          <div className="us-section-label" style={{ marginTop: 24 }}>Set up tutor info</div>
          <div className="adm-card">
            <div className="adm-card-head">
              <div><h4>Tutor info by unit</h4><div className="h-sub">Review the lecture, tutorial and laboratory staff imported for a unit offering.</div></div>
              <div className="unit-search">
                <input
                  value={unitPickerOpen ? unitQuery : (staffingOffering ? `${staffingOffering.unit_code} — ${staffingOffering.unit_name}` : "")}
                  placeholder="Search units, e.g. fit2"
                  onFocus={() => { setUnitPickerOpen(true); setUnitQuery(""); }}
                  onBlur={() => window.setTimeout(() => setUnitPickerOpen(false), 150)}
                  onChange={(event) => setUnitQuery(event.target.value)}
                />
                {unitPickerOpen && (
                  <div className="unit-search-menu">
                    {filteredUnitOptions.length === 0 ? <div className="unit-search-empty">No matching units</div> : filteredUnitOptions.map((offering) => (
                      <button type="button" key={offering.offering_id} className="unit-search-option" onMouseDown={() => { setStaffingOfferingId(offering.offering_id); setUnitPickerOpen(false); setUnitQuery(""); }}>
                        <span className="mono">{offering.unit_code}</span>{offering.unit_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {staffingError && <div className="banner"><div className="ico">!</div><div className="body">{staffingError}</div></div>}
            {staffingLoading ? <div className="adm-empty">Loading tutor info for {staffingOffering?.unit_code ?? "this unit"}...</div> : !staffing || staffing.length === 0 ? (
              <div className="adm-empty">{staffingOffering ? `No staffing rows for ${staffingOffering.unit_code} yet — upload a Tutor List above.` : "Search and select a unit offering to review its tutor info."}</div>
            ) : (
              <table className="adm-tbl"><thead><tr><th>Name</th><th>Role</th><th>Email</th></tr></thead><tbody>
                {sortedStaffing.map((row) => <tr key={row.staffing_id}>
                  <td className="nm">{row.staff_user_id && <span className="linked-dot" title="Linked to a staff account" />}{row.staff_full_name ?? row.external_name ?? "—"}</td>
                  <td>{ROLE_LABEL[row.role_type]}</td>
                  <td className="mono">{row.external_email ?? "—"}</td>
                </tr>)}
              </tbody></table>
            )}
          </div>
        </div>
      </main>

      {addOpen && (
        <div className="adm-modal-overlay" onClick={() => !adding && setAddOpen(false)}>
          <div className="adm-modal wide" onClick={(event) => event.stopPropagation()}>
            <h3>Add units to the database</h3>
            <div className="adm-modal-sub">Select the units to add for {active ? `${active.year} ${active.period}` : "this semester"}. A coordinator is optional — units left unassigned show a warning on the Unit Offerings page until one is set.</div>
            {addError && <div className="banner"><div className="ico">!</div><div className="body">{addError}</div></div>}
            <div className="add-units-list">
              {currentUnmatched.map((unit) => (
                <label key={unit.unit_code} className="add-units-row">
                  <input type="checkbox" checked={selected.has(unit.unit_code)} onChange={() => toggleSelected(unit.unit_code)} />
                  <div className="add-units-info">
                    <div className="mono">{unit.unit_code}</div>
                    <div className="muted">{unit.unit_name || "—"} · {unit.programme_codes.join(", ") || "No programme listed"}</div>
                  </div>
                  <select
                    value={coordinatorByUnit[unit.unit_code] ?? ""}
                    onClick={(event) => event.preventDefault()}
                    onChange={(event) => setCoordinatorByUnit((previous) => ({ ...previous, [unit.unit_code]: event.target.value }))}
                  >
                    <option value="">Unassigned for now</option>
                    {coordinators.map((staff) => <option key={staff.user_id} value={staff.user_id}>{staff.full_name}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <div className="adm-modal-actions">
              <button className="btn" disabled={adding} onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="btn primary" disabled={adding || selected.size === 0} onClick={() => void submitAdd()}>{adding ? "Adding..." : `Add ${selected.size || ""} unit${selected.size === 1 ? "" : "s"} to database`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
