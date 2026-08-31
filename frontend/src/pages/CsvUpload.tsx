import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { commitGradeUpload, errorMessage, getAssessments, getDashboard, inspectGradeUpload, previewGradeUpload, type Assessment, type CsvInspection, type DashboardPayload, type GradePreview } from "../api";
import Sidebar from "../components/Sidebar";
import { formatFileSize } from "../csv";
import { useOfferingId } from "../useOfferingId";
import { useSession } from "../useSession";
import "./CsvUpload.css";

function guessStudentColumn(headers: string[]) {
  const match = headers.find((header) => ["id number", "student id", "student_id", "student number", "id"].includes(header.toLowerCase().trim()));
  return match ?? "";
}

type GradeMapping = { csvColumn: string; maxMark: string };

export default function CsvUpload() {
  const session = useSession();
  const { offeringId, error: offeringError } = useOfferingId();
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<CsvInspection | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [studentColumn, setStudentColumn] = useState("");
  const [mappings, setMappings] = useState<Record<number, GradeMapping>>({});
  const [preview, setPreview] = useState<GradePreview | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [committed, setCommitted] = useState<{ grades: number; outcomes: number } | null>(null);

  useEffect(() => {
    if (!session || !offeringId) return;
    Promise.all([getDashboard(session.access_token, offeringId), getAssessments(session.access_token, offeringId)])
      .then(([dashboardData, assessmentData]) => {
        setDashboard(dashboardData); setAssessments(assessmentData.assessments);
        setMappings(Object.fromEntries(assessmentData.assessments.map((assessment) => [assessment.assessment_id, { csvColumn: "", maxMark: assessment.max_mark }])));
      })
      .catch((err) => setError(errorMessage(err)));
  }, [offeringId, session]);
  if (!session) return null;
  const mappedColumns = assessments.flatMap((assessment) => {
    const mapping = mappings[assessment.assessment_id];
    const maxMark = Number(mapping?.maxMark);
    return mapping?.csvColumn && Number.isFinite(maxMark) && maxMark > 0 ? [{ assessment_id: assessment.assessment_id, csv_column: mapping.csvColumn, max_mark: maxMark }] : [];
  });
  const selectedColumns = Object.values(mappings).map((mapping) => mapping.csvColumn).filter(Boolean);
  const duplicateColumns = [...new Set(selectedColumns.filter((column, index) => selectedColumns.indexOf(column) !== index))];
  const errorCount = preview?.issues.filter((issue) => issue.severity === "error").length ?? 0;
  const warningCount = preview?.issues.filter((issue) => issue.severity === "warning").length ?? 0;
  const step = committed ? 3 : preview ? 2 : inspection ? 1 : 0;
  const setMapping = (assessmentId: number, patch: Partial<GradeMapping>) => setMappings((current) => ({ ...current, [assessmentId]: { ...current[assessmentId], ...patch } }));
  const chooseFile = async (selected: File) => {
    if (!offeringId) return;
    setWorking(true); setError(""); setPreview(null); setCommitted(null);
    try {
      const result = await inspectGradeUpload(session.access_token, offeringId, selected);
      setFile(selected); setInspection(result); setSheetName(result.selected_sheet ?? ""); setStudentColumn(guessStudentColumn(result.headers));
    } catch (err) { setError(errorMessage(err)); } finally { setWorking(false); }
  };
  const chooseSheet = async (selectedSheet: string) => {
    if (!file || !offeringId) return;
    setWorking(true); setError(""); setPreview(null);
    try {
      const result = await inspectGradeUpload(session.access_token, offeringId, file, selectedSheet);
      setInspection(result); setSheetName(selectedSheet); setStudentColumn(guessStudentColumn(result.headers));
    } catch (err) { setError(errorMessage(err)); } finally { setWorking(false); }
  };
  const previewUpload = async () => {
    if (!file || !offeringId || !studentColumn || !mappedColumns.length) return;
    setWorking(true); setError("");
    try { setPreview(await previewGradeUpload(session.access_token, offeringId, studentColumn, mappedColumns, file, sheetName)); }
    catch (err) { setError(errorMessage(err)); } finally { setWorking(false); }
  };
  const commit = async () => {
    if (!preview) return;
    setWorking(true); setError("");
    try {
      const result = await commitGradeUpload(session.access_token, preview.upload_batch_id);
      setCommitted({ grades: result.grades_saved, outcomes: result.attainment_records });
    } catch (err) { setError(errorMessage(err)); } finally { setWorking(false); }
  };
  const replaceFile = () => { setFile(null); setInspection(null); setPreview(null); setCommitted(null); setStudentColumn(""); setSheetName(""); };
  const unitLabel = dashboard ? `${dashboard.offering.unit_code} ${dashboard.offering.unit_name}` : "Grade upload";

  return <div className="app"><Sidebar user={session.user} /><main className="main">
    <div className="topbar"><div className="crumbs"><Link to="/units">Home</Link><span className="sep">›</span><Link to="/dashboard">{dashboard?.offering.unit_code ?? "Unit"}</Link><span className="sep">›</span><strong>Grade upload</strong></div></div>
    <div className="content">
      {(error || offeringError) && <div className="banner"><div className="ico">!</div><div className="body">{error || offeringError}</div></div>}
      <div className="unit-banner"><div><h1 style={{ fontSize: 26 }}>Grade upload</h1><div className="sub">{unitLabel} · Map Moodle gradebook columns to the confirmed assessment setup, validate against enrolled students, then commit calculated results.</div></div></div>
      <div className="stepper">{["Upload file", "Map columns", "Review results", "Commit grades"].map((label, index) => <><div key={label} className={`step ${index < step ? "done" : index === step ? "now" : ""}`}><span className="n">{index < step ? "✓" : index + 1}</span>{label}</div>{index < 3 && <span key={`${label}-line`} className={`ln ${index < step ? "done" : ""}`} />}</> )}</div>
      {!file ? <div className="upload-step-card"><label className="grade-drop"><div className="icn">XLS</div><div className="t">Choose a Moodle gradebook</div><div className="s">Upload a CSV export or an Excel workbook. For workbooks, choose the correct semester worksheet before mapping columns.</div><input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => event.target.files?.[0] && void chooseFile(event.target.files[0])} /></label></div> : <><div className="file-card"><div className="icn">{file.name.toLowerCase().endsWith(".xlsx") ? "XLS" : "CSV"}</div><div><div className="nm">{file.name}<span className="sub">{inspection?.row_count ?? 0} rows · {inspection?.headers.length ?? 0} columns · {formatFileSize(file.size)}</span></div></div><button className="btn" onClick={replaceFile}>Replace file</button></div>
        {!preview && <div className="mapping-card"><div className="hd"><div><h4>Map gradebook columns</h4><div className="h-sub">Choose the Moodle student ID column and only the score columns that should become assessment records. Percentage, letter, group, and contribution fields can be left unmapped.</div></div></div>{inspection?.sheet_names?.length ? <div className="identity-map-row"><label className="identity-map-cell"><div className="src-lbl">Workbook worksheet</div><div className="src">Semester data</div><select className="map-select" value={sheetName} disabled={working} onChange={(event) => void chooseSheet(event.target.value)}>{inspection.sheet_names.map((name) => <option key={name} value={name}>{name}</option>)}</select></label></div> : null}<div className="identity-map-row" style={{ marginTop: 14 }}><label className="identity-map-cell"><div className="src-lbl">Required identity</div><div className="src">Student ID</div><select className="map-select" value={studentColumn} onChange={(event) => setStudentColumn(event.target.value)}><option value="">Choose a gradebook column</option>{inspection?.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label></div><div className="col-map-edit" style={{ marginTop: 14 }}>{assessments.map((assessment) => { const mapping = mappings[assessment.assessment_id] ?? { csvColumn: "", maxMark: assessment.max_mark }; return <div className="col-edit" key={assessment.assessment_id}><div><div className="src-lbl">Confirmed assessment · {assessment.weight}%</div><div className="src">{assessment.assessment_name}</div><div className="field-hint">Map one raw score column only. Leave blank if this component is not in this export.</div></div><div><select className="map-select" value={mapping.csvColumn} onChange={(event) => setMapping(assessment.assessment_id, { csvColumn: event.target.value })}><option value="">Do not import this assessment</option>{inspection?.headers.map((header) => <option key={header} value={header} disabled={header !== mapping.csvColumn && selectedColumns.includes(header)}>{header}</option>)}</select>{mapping.csvColumn && <div className="max-marks"><div className="max-marks-row"><span className="field-hint">Score entered out of</span><input className="max-marks-input" type="number" min="0.01" step="0.01" value={mapping.maxMark} onChange={(event) => setMapping(assessment.assessment_id, { maxMark: event.target.value })} /></div></div>}</div></div>; })}</div><div className="adm-modal-actions">{duplicateColumns.length ? <span className="field-hint">Each gradebook column can only be mapped once.</span> : null}<button className="btn primary" disabled={working || !studentColumn || !mappedColumns.length || duplicateColumns.length > 0} onClick={() => void previewUpload()}>{working ? "Checking..." : "Validate mapped grades"}</button></div></div>}
        {preview && <><div className="result-row"><div className="stat-card ok"><div className="lbl"><span className="b" />Matched students</div><div className="v">{preview.matched_count}</div><div className="sub">Found in stored enrolments</div></div><div className="stat-card risk"><div className="lbl"><span className="b" />Errors</div><div className="v">{errorCount}</div><div className="sub">Must be fixed before commit</div></div><div className="stat-card warn"><div className="lbl"><span className="b" />Warnings</div><div className="v">{warningCount}</div><div className="sub">Missing rows or marks to review</div></div><div className="stat-card"><div className="lbl"><span className="b" />Rows inspected</div><div className="v">{preview.row_count}</div><div className="sub">Original gradebook rows</div></div></div><div className="recon-detail-card"><div className="recon-detail-hd"><h4>Server validation</h4><span className="recon-detail-count">{preview.issues.length} issue{preview.issues.length === 1 ? "" : "s"}</span></div>{preview.issues.length ? <table className="recon-tbl"><thead><tr><th>Row</th><th>Severity</th><th>Details</th></tr></thead><tbody>{preview.issues.slice(0, 30).map((issue, index) => <tr key={`${issue.row}-${index}`} className={issue.severity === "error" ? "err" : "warn"}><td className="id">{issue.row ?? "—"}</td><td><span className={`reason ${issue.severity === "error" ? "" : "w"}`}>{issue.severity}</span></td><td>{issue.message}</td></tr>)}</tbody></table> : <div className="recon-detail-empty">All mapped grade rows are valid.</div>}</div><div className="confirm-bar"><div><div className="hd">Commit grades and calculate ULO attainment</div><div className="sb">The server saves raw marks, normalized weighted scores, per-student ULO attainment, and cohort results. It will validate again before saving.</div></div><div className="actions"><button className="btn" onClick={() => setPreview(null)}>Adjust mapping</button><button className="btn primary" disabled={working || errorCount > 0} onClick={() => void commit()}>{working ? "Committing..." : "Commit grades"}</button></div></div></>}
      </>}
      {committed && <div className="confirm-final"><div className="confirm-final-card"><div className="check-circle">✓</div><h2>Grades committed</h2><p>{committed.grades} assessment grade{committed.grades === 1 ? "" : "s"} saved and {committed.outcomes} student ULO result{committed.outcomes === 1 ? "" : "s"} recalculated.</p><div className="confirm-final-actions"><Link className="btn primary" to="/dashboard">View dashboard</Link><button className="btn" onClick={replaceFile}>Import another file</button></div></div></div>}
    </div>
  </main></div>;
}
