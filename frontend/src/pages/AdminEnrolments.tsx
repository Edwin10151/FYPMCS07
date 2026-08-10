import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { commitEnrolmentUpload, errorMessage, inspectEnrolmentUpload, previewEnrolmentUpload, type CsvInspection, type UploadIssue } from "../api";
import Sidebar from "../components/Sidebar";
import AdminNav from "../components/AdminNav";
import { formatFileSize } from "../csv";
import { useAdminContext } from "../useAdminContext";

function guessHeader(headers: string[], candidates: string[]) {
  const normalised = headers.map((header) => header.toLowerCase().replace(/[^a-z0-9]+/g, "_"));
  const index = normalised.findIndex((header) => candidates.includes(header));
  return index >= 0 ? headers[index] : "";
}

export default function AdminEnrolments() {
  const { session, data, error, loading, reload } = useAdminContext();
  const [offeringId, setOfferingId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<CsvInspection | null>(null);
  const [studentColumn, setStudentColumn] = useState("");
  const [nameColumn, setNameColumn] = useState("");
  const [preview, setPreview] = useState<{ row_count: number; accepted_count: number; issues: UploadIssue[]; status: "valid" | "needs_review" } | null>(null);
  const [flash, setFlash] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!data || offeringId) return;
    setOfferingId(data.offerings.find((offering) => offering.status !== "discontinued")?.offering_id ?? null);
  }, [data, offeringId]);
  if (!session) return null;
  const selectedOffering = data?.offerings.find((offering) => offering.offering_id === offeringId) ?? null;
  const errorCount = preview?.issues.filter((issue) => issue.severity === "error").length ?? 0;
  const warningCount = preview?.issues.filter((issue) => issue.severity === "warning").length ?? 0;
  const chooseFile = async (selected: File) => {
    setWorking(true); setFlash(""); setPreview(null);
    try {
      const result = await inspectEnrolmentUpload(session.access_token, selected);
      setFile(selected); setInspection(result);
      setStudentColumn(guessHeader(result.headers, ["student_id", "studentid", "id", "id_number", "student_number"]));
      setNameColumn(guessHeader(result.headers, ["full_name", "student_name", "name"]));
    } catch (err) { setFlash(errorMessage(err)); } finally { setWorking(false); }
  };
  const previewUpload = async () => {
    if (!file || !offeringId || !studentColumn || !nameColumn) return;
    setWorking(true); setFlash("");
    try { setPreview(await previewEnrolmentUpload(session.access_token, offeringId, studentColumn, nameColumn, file)); }
    catch (err) { setFlash(errorMessage(err)); } finally { setWorking(false); }
  };
  const commit = async () => {
    if (!file || !offeringId || !studentColumn || !nameColumn) return;
    setWorking(true); setFlash("");
    try {
      const result = await commitEnrolmentUpload(session.access_token, offeringId, studentColumn, nameColumn, file);
      setFlash(`${result.accepted_count} students registered for ${selectedOffering?.unit_code}.`);
      setFile(null); setInspection(null); setPreview(null); await reload();
    } catch (err) { setFlash(errorMessage(err)); } finally { setWorking(false); }
  };

  return <div className="app"><Sidebar user={session.user} /><main className="main">
    <div className="topbar"><div className="crumbs"><Link to="/units">Home</Link><span className="sep">›</span><Link to="/admin/setup">Semester setup</Link><span className="sep">›</span><strong>Student enrolments</strong></div></div>
    <div className="content"><div className="unit-banner"><div><h1 style={{ fontSize: 26 }}>Student enrolments</h1><div className="sub">Upload student ID and name for one unit offering. Grade imports only match against the enrolments stored here.</div></div></div>
      <AdminNav counts={{ "/admin/enrolments": data?.enrollment_batches.length ?? 0 }} />
      {(flash || error || loading) && <div className="adm-flash">{flash || error || "Loading enrolment records..."}<span className="x" onClick={() => setFlash("")}>✕</span></div>}
      <div className="adm-stats"><div className="adm-stat navy"><div className="lbl"><span className="b" />Offerings</div><div className="v">{data?.offerings.filter((offering) => offering.status !== "discontinued").length ?? 0}</div><div className="sub">Available for student lists</div></div><div className="adm-stat ok"><div className="lbl"><span className="b" />Registered students</div><div className="v">{data?.offerings.reduce((sum, offering) => sum + offering.student_count, 0) ?? 0}</div><div className="sub">Across all stored offerings</div></div><div className="adm-stat"><div className="lbl"><span className="b" />Committed files</div><div className="v">{data?.enrollment_batches.length ?? 0}</div><div className="sub">Retained as import history</div></div><div className="adm-stat warn"><div className="lbl"><span className="b" />Selected offering</div><div className="v">{selectedOffering?.student_count ?? 0}</div><div className="sub">{selectedOffering?.unit_code ?? "Choose an offering"}</div></div></div>
      <div className="adm-card"><div className="adm-card-head"><div><h4>Upload student list</h4><div className="h-sub">Use a UTF-8 CSV. First inspect the headers, map Student ID and full name, then validate before committing.</div></div><select className="adm-select" value={offeringId ?? ""} onChange={(event) => { setOfferingId(Number(event.target.value)); setFile(null); setInspection(null); setPreview(null); }}>{data?.offerings.filter((offering) => offering.status !== "discontinued").map((offering) => <option key={offering.offering_id} value={offering.offering_id}>{offering.year} {offering.period} · {offering.unit_code}</option>)}</select></div>
        {!file ? <div style={{ padding: 20 }}><label className="adm-drop"><div className="icn">CSV</div><div className="t">Choose a student list for {selectedOffering?.unit_code ?? "the selected offering"}</div><div className="s">The file is checked by the server. Required data: one student ID column and one full-name column.</div><input type="file" accept=".csv,text/csv" onChange={(event) => event.target.files?.[0] && void chooseFile(event.target.files[0])} /></label></div> : <><div className="adm-file-card"><div className="icn">CSV</div><div><div className="nm">{file.name}</div><div className="sub">{inspection?.row_count ?? 0} rows · {inspection?.headers.length ?? 0} columns · {formatFileSize(file.size)}</div></div><button className="btn" onClick={() => { setFile(null); setInspection(null); setPreview(null); }}>Replace file</button></div><div style={{ padding: 20 }}><div className="adm-form-2"><label className="adm-field"><span className="lbl">Student ID column</span><select value={studentColumn} onChange={(event) => { setStudentColumn(event.target.value); setPreview(null); }}><option value="">Choose column</option>{inspection?.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label><label className="adm-field"><span className="lbl">Full name column</span><select value={nameColumn} onChange={(event) => { setNameColumn(event.target.value); setPreview(null); }}><option value="">Choose column</option>{inspection?.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label></div><div className="adm-modal-actions"><button className="btn primary" disabled={working || !studentColumn || !nameColumn} onClick={() => void previewUpload()}>{working ? "Checking..." : "Validate student list"}</button></div></div></>}
      </div>
      {preview && <><div className="adm-stats"><div className="adm-stat ok"><div className="lbl"><span className="b" />Ready to register</div><div className="v">{preview.accepted_count}</div><div className="sub">Valid student records</div></div><div className="adm-stat risk"><div className="lbl"><span className="b" />Errors</div><div className="v">{errorCount}</div><div className="sub">Must be fixed before commit</div></div><div className="adm-stat warn"><div className="lbl"><span className="b" />Warnings</div><div className="v">{warningCount}</div><div className="sub">Review if present</div></div><div className="adm-stat"><div className="lbl"><span className="b" />Rows checked</div><div className="v">{preview.row_count}</div><div className="sub">Source file total</div></div></div><div className="adm-card"><div className="adm-card-head"><div><h4>Validation results</h4><div className="h-sub">The server will run the same checks again when you commit.</div></div></div>{preview.issues.length ? <table className="adm-tbl"><thead><tr><th>Row</th><th>Severity</th><th>Issue</th></tr></thead><tbody>{preview.issues.slice(0, 25).map((issue, index) => <tr key={`${issue.row}-${index}`} className={issue.severity === "error" ? "row-err" : "row-warn"}><td className="mono">{issue.row ?? "—"}</td><td><span className={`adm-row-status ${issue.severity === "error" ? "err" : "warn"}`}>{issue.severity}</span></td><td>{issue.message}</td></tr>)}</tbody></table> : <div className="adm-empty">All rows are ready to register.</div>}</div><div className="adm-commit"><div><div className="hd">Commit student enrolments</div><div className="sb">This creates or updates the student records and links them to {selectedOffering?.unit_code}.</div></div><div className="actions"><button className="btn" onClick={() => setPreview(null)}>Adjust mapping</button><button className="btn primary" disabled={working || errorCount > 0} onClick={() => void commit()}>{working ? "Committing..." : "Commit enrolments"}</button></div></div></>}
    </div>
  </main></div>;
}
