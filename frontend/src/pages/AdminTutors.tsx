import { useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage, importStaffingRoster } from "../api";
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

export default function AdminTutors() {
  const { session, data, error, loading } = useAdminContext();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<RosterResult | null>(null);
  const [working, setWorking] = useState(false);
  const [uploadError, setUploadError] = useState("");

  if (!session) return null;
  const active = data?.periods.find((period) => period.status === "active") ?? null;

  const chooseFile = async (selected: File) => {
    if (!active) return;
    setFile(selected);
    setResult(null);
    setUploadError("");
    setWorking(true);
    try {
      const response = await importStaffingRoster(session.access_token, active.semester_id, selected);
      setResult(response);
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
          <div className="crumbs"><Link to="/units">Home</Link><span className="sep">›</span><Link to="/admin/portal">Admin Portal</Link><span className="sep">›</span><Link to="/admin/setup">Semester setup</Link><span className="sep">›</span><strong>Tutor list</strong></div>
        </div>
        <div className="content">
          <div className="unit-banner"><div><h1 style={{ fontSize: 26 }}>Tutor list</h1><div className="sub">Upload the staffing roster spreadsheet for {active ? `${active.year} ${active.period}` : "the current semester"}. Lecture, tutorial and laboratory rows are matched to unit offerings by unit code.</div></div></div>

          {(error || uploadError) && <div className="banner"><div className="ico">!</div><div className="body">{error || uploadError}</div></div>}
          {!active && !loading && <div className="banner"><div className="ico">!</div><div className="body">No active semester was found, so a roster can't be matched yet.</div></div>}

          <div className="adm-card">
            <div className="adm-card-head"><div><h4>Upload roster spreadsheet</h4><div className="h-sub">Use the .xlsx roster export. Rows are matched to unit offerings for {active ? `${active.year} ${active.period}` : "the active semester"} by unit code; unmatched units are listed after upload.</div></div></div>
            {!file ? (
              <div style={{ padding: 20 }}>
                <label className="adm-drop">
                  <div className="icn">XLS</div>
                  <div className="t">Choose a staffing roster</div>
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
        </div>
      </main>
    </div>
  );
}
