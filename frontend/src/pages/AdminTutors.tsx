import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage, getOfferingStaffing, importStaffingRoster, type OfferingStaffingRow } from "../api";
import AdminSidebar from "../components/AdminSidebar";
import "../components/AdminNav.css";
import { formatFileSize } from "../csv";
import { useAdminContext } from "../useAdminContext";

type RosterResult = {
  status: string;
  units_in_file: number;
  matched_offerings: number;
  staffing_rows_created: number;
  unmatched_units: Array<{ unit_code: string; unit_name: string; programme_codes: string[] }>;
  warnings: string[];
};

const ROLE_LABEL: Record<OfferingStaffingRow["role_type"], string> = {
  lecture: "Lecture",
  tutorial: "Tutorial / Applied Session",
  laboratory: "Laboratory",
};

export default function AdminTutors() {
  const { session, data, error, loading } = useAdminContext();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<RosterResult | null>(null);
  const [working, setWorking] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [staffingOfferingId, setStaffingOfferingId] = useState<number | null>(null);
  const [staffing, setStaffing] = useState<OfferingStaffingRow[] | null>(null);
  const [staffingLoading, setStaffingLoading] = useState(false);
  const [staffingError, setStaffingError] = useState("");

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

  if (!session) return null;
  const staffingOffering = offeringsThisSemester.find((offering) => offering.offering_id === staffingOfferingId) ?? null;

  const chooseFile = async (selected: File) => {
    if (!active) return;
    setFile(selected);
    setResult(null);
    setUploadError("");
    setWorking(true);
    try {
      const response = await importStaffingRoster(session.access_token, active.semester_id, selected);
      setResult(response);
      if (staffingOfferingId) {
        const refreshed = await getOfferingStaffing(session.access_token, staffingOfferingId);
        setStaffing(refreshed.staffing);
      }
    } catch (err) {
      setUploadError(errorMessage(err));
    } finally {
      setWorking(false);
    }
  };

  const replaceFile = () => { setFile(null); setResult(null); setUploadError(""); };

  return (
    <div className="app">
      <AdminSidebar user={session.user} />
      <main className="main">
        <div className="topbar">
          <div className="crumbs"><Link to="/units">Home</Link><span className="sep">›</span><Link to="/admin/setup">Semester Setup</Link><span className="sep">›</span><strong>Tutor List</strong></div>
        </div>
        <div className="content">
          <div className="unit-banner"><div><h1 style={{ fontSize: 26 }}>Tutor List</h1><div className="sub">Upload the School of IT staffing roster for {active ? `${active.year} ${active.period}` : "the current semester"}. Lecture, tutorial and laboratory rows are matched to unit offerings by unit code.</div></div></div>

          {(error || uploadError) && <div className="banner"><div className="ico">!</div><div className="body">{error || uploadError}</div></div>}
          {!active && !loading && <div className="banner"><div className="ico">!</div><div className="body">No active semester was found, so a roster can't be matched yet.</div></div>}

          <div className="adm-card">
            <div className="adm-card-head"><div><h4>Upload Tutor List</h4></div></div>
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
                <button className="btn" disabled={working} onClick={replaceFile}>Replace file</button>
              </div>
            )}
          </div>

          {working && <div className="panel">Reading and matching the roster...</div>}

          {result && (
            <>
              <div className="adm-stats">
                <div className="adm-stat navy"><div className="lbl"><span className="b" />Units in file</div><div className="v">{result.units_in_file}</div><div className="sub">Rows read from the roster</div></div>
                <div className="adm-stat ok"><div className="lbl"><span className="b" />Matched offerings</div><div className="v">{result.matched_offerings}</div><div className="sub">Linked to a unit offering</div></div>
                <div className="adm-stat"><div className="lbl"><span className="b" />Staffing rows saved</div><div className="v">{result.staffing_rows_created}</div><div className="sub">Lecture / tutorial / lab rows</div></div>
                <div className="adm-stat warn"><div className="lbl"><span className="b" />Unmatched units</div><div className="v">{result.unmatched_units.length}</div><div className="sub">No offering found for this semester</div></div>
              </div>

              {result.unmatched_units.length > 0 && (
                <div className="adm-card">
                  <div className="adm-card-head"><div><h4>Unmatched units</h4><div className="h-sub">These unit codes in the roster don't have an offering for {active ? `${active.year} ${active.period}` : "this semester"}.</div></div></div>
                  <table className="adm-tbl"><thead><tr><th>Unit code</th><th>Unit name</th><th>Programmes</th></tr></thead><tbody>
                    {result.unmatched_units.map((unit) => <tr key={unit.unit_code}><td className="mono">{unit.unit_code}</td><td>{unit.unit_name || "—"}</td><td className="muted">{unit.programme_codes.join(", ") || "—"}</td></tr>)}
                  </tbody></table>
                </div>
              )}

              {result.warnings.length > 0 && (
                <div className="adm-card">
                  <div className="adm-card-head"><div><h4>Warnings</h4><div className="h-sub">Review these, then re-upload the roster once fixed if needed.</div></div></div>
                  <div style={{ padding: "14px 20px" }}>{result.warnings.map((warning, index) => <p key={index} style={{ fontSize: 12.5, color: "var(--warn)", margin: "4px 0" }}>{warning}</p>)}</div>
                </div>
              )}

              {result.unmatched_units.length === 0 && result.warnings.length === 0 && <div className="adm-flash">Every unit in the roster matched an offering for {active ? `${active.year} ${active.period}` : "this semester"}.</div>}
            </>
          )}

          <div className="us-section-label" style={{ marginTop: 24 }}>Set up tutor info</div>
          <div className="adm-card">
            <div className="adm-card-head">
              <div><h4>Tutor info by unit</h4><div className="h-sub">Review the lecture, tutorial and laboratory staff imported for a unit offering. Names in bold have a matching staff account; others are roster-only until a staff account with the same email exists.</div></div>
              <select className="adm-select" value={staffingOfferingId ?? ""} onChange={(event) => setStaffingOfferingId(Number(event.target.value))}>
                {offeringsThisSemester.length === 0 && <option value="">No offerings this semester</option>}
                {offeringsThisSemester.map((offering) => <option key={offering.offering_id} value={offering.offering_id}>{offering.unit_code}</option>)}
              </select>
            </div>
            {staffingError && <div className="banner"><div className="ico">!</div><div className="body">{staffingError}</div></div>}
            {staffingLoading ? <div className="adm-empty">Loading tutor info for {staffingOffering?.unit_code ?? "this unit"}...</div> : !staffing || staffing.length === 0 ? (
              <div className="adm-empty">{staffingOffering ? `No staffing rows for ${staffingOffering.unit_code} yet — upload a Tutor List above.` : "Select a unit offering to review its tutor info."}</div>
            ) : (
              <table className="adm-tbl"><thead><tr><th>Role</th><th>Name</th><th>Email</th><th>Staff account</th></tr></thead><tbody>
                {staffing.map((row) => <tr key={row.staffing_id}>
                  <td>{ROLE_LABEL[row.role_type]}</td>
                  <td className={row.staff_user_id ? "nm" : ""}>{row.staff_full_name ?? row.external_name ?? "—"}</td>
                  <td className="mono">{row.external_email ?? "—"}</td>
                  <td><span className={`adm-status ${row.staff_user_id ? "active" : "pending"}`}><span className="d" />{row.staff_user_id ? "Linked" : "Roster only"}</span></td>
                </tr>)}
              </tbody></table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
