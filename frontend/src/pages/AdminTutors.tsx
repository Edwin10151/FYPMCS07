import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  commitStaffingRoster,
  errorMessage,
  getOfferingStaffing,
  getStaffingStatus,
  inspectStaffingRoster,
  reviewStaffingRoster,
  type NewStaffAccount,
  type OfferingStaffingRow,
  type ReviewUnit,
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

const ROLE_ORDER: OfferingStaffingRow["role_type"][] = ["lecture", "tutorial", "laboratory"];

type GroupedStaffingRow = { key: string; name: string; email: string | null; linked: boolean; userId: number | null; roles: OfferingStaffingRow["role_type"][] };

type Status = {
  source_filename: string;
  imported_at: string;
  committed: boolean;
  units_in_file: number;
  matched_offerings: number;
  staffing_rows_created: number;
  unmatched_units: ReviewUnit[];
};

type Pending = { units_in_file: number; matched_offerings: number; unmatched_units: ReviewUnit[] };

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function unitCoordinatorOptions(unit: ReviewUnit): { options: [string, string][]; fromHandbook: boolean } {
  const seen = new Map<string, string>();
  for (const person of unit.staffing) {
    if (person.email && !seen.has(person.email)) seen.set(person.email, person.name);
  }
  if (seen.size > 0) return { options: [...seen.entries()], fromHandbook: false };
  // No roster staff at all for this unit (e.g. a placement/WIL unit) — fall back to whoever
  // the Handbook publishes as coordinator, so there's still something to choose from.
  for (const candidate of unit.coordinator_candidates ?? []) {
    if (!seen.has(candidate.email)) seen.set(candidate.email, candidate.name);
  }
  return { options: [...seen.entries()], fromHandbook: seen.size > 0 };
}

function CoordinatorReviewPanel({
  units,
  coordinatorByUnit,
  onChange,
}: {
  units: ReviewUnit[];
  coordinatorByUnit: Record<string, string>;
  onChange: (unitCode: string, email: string) => void;
}) {
  if (units.length === 0) return null;
  return (
    <div className="adm-card">
      <div className="adm-card-head">
        <div><h4>Set unit coordinators</h4><div className="h-sub">{units.length} unit{units.length === 1 ? "" : "s"} in the roster don't have an offering yet. A coordinator was pre-filled where the Handbook's published coordinator is also in this unit's roster list — check it, or choose someone else from the same list. Leaving it unassigned is fine too.</div></div>
      </div>
      <div className="add-units-list">
        {units.map((unit) => {
          const { options, fromHandbook } = unitCoordinatorOptions(unit);
          const value = coordinatorByUnit[unit.unit_code] ?? "";
          const wasPrefilled = !!unit.prefilled_coordinator && value === unit.prefilled_coordinator.email;
          return (
            <div key={unit.unit_code} className="coord-review-row">
              <div className="add-units-info">
                <div className="mono">{unit.unit_code}</div>
                <div className="muted">{unit.unit_name || "—"} · roster says: {unit.programme_codes.join(", ") || "no programme listed"}</div>
              </div>
              <div>
                <select value={value} onChange={(event) => onChange(unit.unit_code, event.target.value)}>
                  <option value="">Unassigned for now</option>
                  {options.map(([email, name]) => <option key={email} value={email}>{name}</option>)}
                </select>
                {wasPrefilled && <span className="coord-prefilled-tag">Pre-filled from Handbook</span>}
                {!wasPrefilled && fromHandbook && <span className="coord-prefilled-tag muted">No roster staff listed — options are from the Handbook</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminTutors() {
  const { session, data, error, loading, reload } = useAdminContext();

  const [file, setFile] = useState<File | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [inspectResult, setInspectResult] = useState<{ units_in_file: number } | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewWarnings, setReviewWarnings] = useState<string[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [coordinatorByUnit, setCoordinatorByUnit] = useState<Record<string, string>>({});
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{ offerings_created: number; matched_offerings: number; staffing_rows_created: number; accounts_created: NewStaffAccount[]; warnings: string[] } | null>(null);
  const [uploadError, setUploadError] = useState("");

  const [status, setStatus] = useState<Status | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const [staffingOfferingId, setStaffingOfferingId] = useState<number | null>(null);
  const [staffing, setStaffing] = useState<OfferingStaffingRow[] | null>(null);
  const [staffingLoading, setStaffingLoading] = useState(false);
  const [staffingError, setStaffingError] = useState("");
  const [unitQuery, setUnitQuery] = useState("");
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);

  const active = data?.periods.find((period) => period.status === "active") ?? null;
  const offeringsThisSemester = data?.offerings.filter((offering) => offering.semester_id === active?.semester_id && offering.status !== "discontinued") ?? [];

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

  const applyCoordinatorPrefill = (units: ReviewUnit[]) => {
    setCoordinatorByUnit((previous) => {
      const next = { ...previous };
      for (const unit of units) {
        if (next[unit.unit_code] === undefined) next[unit.unit_code] = unit.prefilled_coordinator?.email ?? "";
      }
      return next;
    });
  };

  const loadStatus = async (semesterId: number) => {
    if (!session) return;
    setStatusLoading(true);
    try {
      const response = await getStaffingStatus(session.access_token, semesterId);
      setStatus(response.snapshot);
      if (response.snapshot && !response.snapshot.committed) {
        setPending({
          units_in_file: response.snapshot.units_in_file,
          matched_offerings: response.snapshot.matched_offerings,
          unmatched_units: response.snapshot.unmatched_units,
        });
        applyCoordinatorPrefill(response.snapshot.unmatched_units);
      }
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

  const resetUploadState = () => {
    setFile(null);
    setInspectResult(null);
    setReviewWarnings([]);
    setPending(null);
    setCoordinatorByUnit({});
    setCommitResult(null);
    setUploadError("");
  };
  const startReplacing = () => { resetUploadState(); setReplacing(true); };

  const chooseFile = async (selectedFile: File) => {
    if (!active) return;
    resetUploadState();
    setFile(selectedFile);
    setReplacing(false);
    setInspecting(true);
    try {
      const response = await inspectStaffingRoster(session.access_token, active.semester_id, selectedFile);
      setInspectResult(response);
    } catch (err) {
      setFile(null);
      setUploadError(errorMessage(err));
    } finally {
      setInspecting(false);
    }
  };

  const submitReview = async () => {
    if (!active || !file) return;
    setReviewing(true);
    setUploadError("");
    try {
      const response = await reviewStaffingRoster(session.access_token, active.semester_id, file);
      setPending({ units_in_file: response.units_in_file, matched_offerings: response.matched_offerings, unmatched_units: response.unmatched_units });
      setReviewWarnings(response.warnings);
      applyCoordinatorPrefill(response.unmatched_units);
      setInspectResult(null);
    } catch (err) {
      setUploadError(errorMessage(err));
    } finally {
      setReviewing(false);
    }
  };

  const submitCommit = async () => {
    if (!active || !pending) return;
    setCommitting(true);
    setUploadError("");
    try {
      const response = await commitStaffingRoster(session.access_token, active.semester_id, coordinatorByUnit);
      setCommitResult(response);
      setFile(null);
      setInspectResult(null);
      setReviewWarnings([]);
      setPending(null);
      setCoordinatorByUnit({});
      setReplacing(false);
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

  const groupedStaffing = useMemo(() => {
    const groups = new Map<string, GroupedStaffingRow>();
    for (const row of staffing ?? []) {
      const key = row.staff_user_id ? `u${row.staff_user_id}` : row.external_email ? `m${row.external_email.toLowerCase()}` : `s${row.staffing_id}`;
      const existing = groups.get(key);
      if (existing) {
        if (!existing.roles.includes(row.role_type)) existing.roles.push(row.role_type);
      } else {
        groups.set(key, {
          key,
          name: row.staff_full_name ?? row.external_name ?? "—",
          email: row.external_email,
          linked: !!row.staff_user_id,
          userId: row.staff_user_id,
          roles: [row.role_type],
        });
      }
    }
    return [...groups.values()]
      .map((group) => ({ ...group, roles: ROLE_ORDER.filter((role) => group.roles.includes(role)) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [staffing]);
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
            {file ? (
              <div className="adm-file-card">
                <div className="icn">XLS</div>
                <div><div className="nm">{file.name}</div><div className="sub">{formatFileSize(file.size)}</div></div>
                <button className="btn" disabled={inspecting || reviewing || committing} onClick={startReplacing}>Replace file</button>
              </div>
            ) : status && !replacing ? (
              <div className="adm-file-card">
                <div className="icn">XLS</div>
                <div><div className="nm">{status.source_filename}</div><div className="sub">Uploaded {formatDateTime(status.imported_at)}{!status.committed ? " · pending review" : ""}</div></div>
                <button className="btn" onClick={startReplacing}>Replace file</button>
              </div>
            ) : (
              <div style={{ padding: 20 }}>
                <label className="adm-drop">
                  <div className="icn">XLS</div>
                  <div className="t">Upload Tutor List</div>
                  <div className="s">.xlsx workbook only. The first sheet is read; each unit block may span several staff rows.</div>
                  <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={!active} onChange={(event) => event.target.files?.[0] && void chooseFile(event.target.files[0])} />
                </label>
              </div>
            )}
          </div>

          {inspecting && <div className="panel">Checking the file...</div>}

          {/* Step 1: file is valid, ready to submit — no matched/unmatched detail shown yet. */}
          {inspectResult && !pending && (
            <div className="save-bar">
              <div className="stat"><strong>{inspectResult.units_in_file} units found</strong> in the file. Submit to check them against this semester's unit offerings.</div>
              <div className="actions"><button className="btn primary" disabled={reviewing} onClick={() => void submitReview()}>{reviewing ? "Checking Handbook coordinators..." : "Submit"}</button></div>
            </div>
          )}

          {/* Step 2: after Submit, review (and optionally adjust) each new unit's coordinator. */}
          {pending && (
            <>
              <div className="adm-stats">
                <div className="adm-stat navy"><div className="lbl"><span className="b" />Units in file</div><div className="v">{pending.units_in_file}</div><div className="sub">Rows read from the roster</div></div>
                <div className="adm-stat ok"><div className="lbl"><span className="b" />Matched offerings</div><div className="v">{pending.matched_offerings}</div><div className="sub">Already exist this semester</div></div>
                <div className="adm-stat warn"><div className="lbl"><span className="b" />New units</div><div className="v">{pending.unmatched_units.length}</div><div className="sub">Will be created on commit</div></div>
              </div>
              {reviewWarnings.length > 0 && (
                <div className="adm-card">
                  <div className="adm-card-head"><div><h4>Warnings</h4></div></div>
                  <div style={{ padding: "14px 20px" }}>{reviewWarnings.map((warning, index) => <p key={index} style={{ fontSize: 12.5, color: "var(--warn)", margin: "4px 0" }}>{warning}</p>)}</div>
                </div>
              )}
              <CoordinatorReviewPanel
                units={pending.unmatched_units}
                coordinatorByUnit={coordinatorByUnit}
                onChange={(unitCode, email) => setCoordinatorByUnit((previous) => ({ ...previous, [unitCode]: email }))}
              />
              <div className="save-bar">
                <div className="stat">Ready to commit {pending.matched_offerings} matched unit{pending.matched_offerings === 1 ? "" : "s"} and create {pending.unmatched_units.length} new one{pending.unmatched_units.length === 1 ? "" : "s"}.</div>
                <div className="actions"><button className="btn primary" disabled={committing} onClick={() => void submitCommit()}>{committing ? "Committing..." : "Commit to database"}</button></div>
              </div>
            </>
          )}

          {/* After Commit, the final result. */}
          {commitResult && (
            <>
              <div className="adm-stats">
                <div className="adm-stat ok"><div className="lbl"><span className="b" />Matched offerings</div><div className="v">{commitResult.matched_offerings}</div><div className="sub">Staffing synced</div></div>
                <div className="adm-stat navy"><div className="lbl"><span className="b" />Offerings created</div><div className="v">{commitResult.offerings_created}</div><div className="sub">New units this semester</div></div>
                <div className="adm-stat"><div className="lbl"><span className="b" />Staffing rows saved</div><div className="v">{commitResult.staffing_rows_created}</div><div className="sub">Lecture / tutorial / lab rows</div></div>
                <div className="adm-stat navy"><div className="lbl"><span className="b" />New staff accounts</div><div className="v">{commitResult.accounts_created.length}</div><div className="sub">Created with the default password</div></div>
              </div>
              {commitResult.warnings.length > 0 && (
                <div className="adm-card">
                  <div className="adm-card-head"><div><h4>Warnings</h4></div></div>
                  <div style={{ padding: "14px 20px" }}>{commitResult.warnings.map((warning, index) => <p key={index} style={{ fontSize: 12.5, color: "var(--warn)", margin: "4px 0" }}>{warning}</p>)}</div>
                </div>
              )}
              {commitResult.warnings.length === 0 && <div className="adm-flash">Committed to {active ? `${active.year} ${active.period}` : "this semester"}.</div>}
            </>
          )}

          {/* Persisted state: an already-committed roster, shown even without re-uploading. */}
          {!file && !pending && !replacing && !statusLoading && !commitResult && status && status.committed && (
            <div className="adm-stats">
              <div className="adm-stat navy"><div className="lbl"><span className="b" />Units in file</div><div className="v">{status.units_in_file}</div><div className="sub">Rows read from the roster</div></div>
              <div className="adm-stat ok"><div className="lbl"><span className="b" />Matched offerings</div><div className="v">{status.matched_offerings}</div><div className="sub">Linked to a unit offering</div></div>
              <div className="adm-stat"><div className="lbl"><span className="b" />Staffing rows saved</div><div className="v">{status.staffing_rows_created}</div><div className="sub">Lecture / tutorial / lab rows</div></div>
            </div>
          )}

          <div className="us-section-label" style={{ marginTop: 24 }}>Set up tutor info</div>
          <div className="adm-card">
            <div className="adm-card-head">
              <div><h4>Tutor info by unit</h4><div className="h-sub">Review the lecture, tutorial and laboratory staff imported for a unit offering. The coordinator's row is highlighted.</div></div>
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
                {groupedStaffing.map((row) => {
                  const isCoordinator = row.userId !== null && row.userId === staffingOffering?.coordinator_id;
                  return (
                    <tr key={row.key} className={isCoordinator ? "row-coordinator" : undefined}>
                      <td className="nm">{row.linked && <span className="linked-dot" title="Linked to a staff account" />}{row.name}{isCoordinator && <span className="coordinator-pill">Coordinator</span>}</td>
                      <td>{row.roles.map((role) => ROLE_LABEL[role]).join(", ")}</td>
                      <td className="mono">{row.email ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody></table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
