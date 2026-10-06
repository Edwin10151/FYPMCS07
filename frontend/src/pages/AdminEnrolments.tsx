import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  commitEnrolmentUpload,
  errorMessage,
  getStudentList,
  inspectEnrolmentUpload,
  previewEnrolmentUpload,
  type CsvInspection,
  type StudentListEntry,
  type StudentListUpload,
  type UploadIssue,
} from "../api";
import AdminSidebar from "../components/AdminSidebar";
import "../components/AdminNav.css";
import { formatFileSize } from "../csv";
import { useAdminContext } from "../useAdminContext";

function guessHeader(headers: string[], candidates: string[]) {
  const normalised = headers.map((header) => header.toLowerCase().replace(/[^a-z0-9]+/g, "_"));
  const index = normalised.findIndex((header) => candidates.includes(header));
  return index >= 0 ? headers[index] : "";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function AdminEnrolments() {
  const { session, data, error, loading, reload, selectedPeriod: active, selectPeriod } = useAdminContext();
  const archived = active?.status === "archived";
  const [file, setFile] = useState<File | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [inspection, setInspection] = useState<CsvInspection | null>(null);
  const [studentColumn, setStudentColumn] = useState("");
  const [nameColumn, setNameColumn] = useState("");
  const [givenNameColumn, setGivenNameColumn] = useState("");
  const [preview, setPreview] = useState<{ row_count: number; accepted_count: number; issues: UploadIssue[]; status: "valid" | "needs_review" } | null>(null);
  const [flash, setFlash] = useState("");
  const [working, setWorking] = useState(false);

  const [students, setStudents] = useState<StudentListEntry[] | null>(null);
  const [upload, setUpload] = useState<StudentListUpload | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");

  const semesterId = active?.semester_id ?? null;

  const loadList = async (id: number) => {
    if (!session) return;
    setListLoading(true);
    try {
      const response = await getStudentList(session.access_token, id);
      setStudents(response.students);
      setUpload(response.upload);
    } catch (err) {
      setFlash(errorMessage(err));
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (!semesterId) return;
    setSearchInput("");
    setQuery("");
    void loadList(semesterId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesterId, session]);

  if (!session) return null;
  const errorCount = preview?.issues.filter((issue) => issue.severity === "error").length ?? 0;
  const warningCount = preview?.issues.filter((issue) => issue.severity === "warning").length ?? 0;
  const term = query.trim().toLowerCase();
  const visibleStudents = (students ?? []).filter((student) => !term || student.student_code.toLowerCase().includes(term) || student.full_name.toLowerCase().includes(term));

  const resetUploadState = () => {
    setFile(null);
    setInspection(null);
    setPreview(null);
    setStudentColumn("");
    setNameColumn("");
    setGivenNameColumn("");
  };
  const startReplacing = () => { resetUploadState(); setReplacing(true); };

  const chooseFile = async (selected: File) => {
    setWorking(true); setFlash(""); setPreview(null);
    try {
      const result = await inspectEnrolmentUpload(session.access_token, selected);
      setFile(selected); setReplacing(false); setInspection(result);
      setStudentColumn(guessHeader(result.headers, ["student_id", "studentid", "id", "id_number", "student_number", "person_id", "personid"]));
      setNameColumn(guessHeader(result.headers, ["full_name", "student_name", "name", "surname", "last_name", "lastname"]));
      setGivenNameColumn(guessHeader(result.headers, ["given_names", "given_name", "first_name", "firstname", "first_names"]));
    } catch (err) { setFlash(errorMessage(err)); } finally { setWorking(false); }
  };
  const previewUpload = async () => {
    if (!file || !active || !studentColumn || !nameColumn) return;
    setWorking(true); setFlash("");
    try { setPreview(await previewEnrolmentUpload(session.access_token, active.semester_id, studentColumn, nameColumn, file, givenNameColumn)); }
    catch (err) { setFlash(errorMessage(err)); } finally { setWorking(false); }
  };
  const commit = async () => {
    if (!file || !active || !studentColumn || !nameColumn) return;
    setWorking(true); setFlash("");
    try {
      const result = await commitEnrolmentUpload(session.access_token, active.semester_id, studentColumn, nameColumn, file, givenNameColumn);
      setFlash(`${result.accepted_count} students on the semester list. Each is available to grade uploads in ${result.offering_count} unit${result.offering_count === 1 ? "" : "s"}.`);
      resetUploadState(); setReplacing(false);
      await Promise.all([loadList(active.semester_id), reload()]);
    } catch (err) { setFlash(errorMessage(err)); } finally { setWorking(false); }
  };
  const runSearch = () => setQuery(searchInput);
  const clearSearch = () => { setSearchInput(""); setQuery(""); };

  return <div className="app admin-period-page"><AdminSidebar user={session.user} /><main className="main">
    <div className="topbar"><div className="crumbs"><Link to="/units">Home</Link><span className="sep">›</span><Link to="/admin/setup">Semester Setup</Link><span className="sep">›</span><strong>Student List</strong></div></div>
    <div className="content"><div className="unit-banner"><div><h1 style={{ fontSize: 26 }}>Student List</h1><div className="sub">{active ? `${active.year} ${active.period}` : "No semester selected"} · every student enrolled in the school this semester</div></div>
      <label className="adm-field"><span className="lbl">Semester</span><select className="adm-select" aria-label="Semester" value={active?.semester_id ?? ""} disabled={loading || working || listLoading} onChange={(event) => { resetUploadState(); setReplacing(false); setFlash(""); selectPeriod(Number(event.target.value)); }}>
        {data?.periods.map((period) => <option key={period.semester_id} value={period.semester_id}>{period.year} {period.period} · {period.status}</option>)}
      </select></label>
    </div>
      {(flash || error || loading) && <div className="adm-flash">{flash || error || "Loading student list..."}<span className="x" onClick={() => setFlash("")}>✕</span></div>}
      {!active && !loading && <div className="banner"><div className="ico">!</div><div className="body">No semester was found.</div></div>}
      {archived && <div className="banner"><div className="body">Archived semester. The student list is read-only.</div></div>}

      <div className="adm-card">
        <div className="adm-card-head"><div><h4>Upload Student List</h4><div className="h-sub">One list for the whole semester. Grade uploads for every unit are checked against it, and students not on it are skipped. Re-uploading adds new students and updates names; it does not remove anyone.</div></div></div>
        {file ? (
          <div className="adm-file-card">
            <div className="icn">CSV</div>
            <div><div className="nm">{file.name}</div><div className="sub">{inspection?.row_count ?? 0} rows · {inspection?.headers.length ?? 0} columns · {formatFileSize(file.size)}</div></div>
            <button className="btn" disabled={archived} onClick={startReplacing}>Replace file</button>
          </div>
        ) : upload && !replacing ? (
          <div className="adm-file-card">
            <div className="icn">CSV</div>
            <div><div className="nm">{upload.original_filename}</div><div className="sub">{upload.accepted_count} students · uploaded {formatDateTime(upload.uploaded_at)}</div></div>
            <button className="btn" disabled={archived} onClick={startReplacing}>Replace file</button>
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            <label className="adm-drop">
              <div className="icn">CSV</div>
              <div className="t">Upload Student List</div>
              <div className="s">The file is checked by the server. Required data: a student ID column and a name (either one full-name column, or separate surname / given-names columns).</div>
              <input type="file" accept=".csv,text/csv" disabled={!active || archived} onChange={(event) => event.target.files?.[0] && void chooseFile(event.target.files[0])} />
            </label>
          </div>
        )}
        {file && (
          <div style={{ padding: 20 }}>
            <div className="adm-form-2">
              <label className="adm-field"><span className="lbl">Student ID column</span><select value={studentColumn} onChange={(event) => { setStudentColumn(event.target.value); setPreview(null); }}><option value="">Choose column</option>{inspection?.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>
              <label className="adm-field"><span className="lbl">Full name (or surname) column</span><select value={nameColumn} onChange={(event) => { setNameColumn(event.target.value); setPreview(null); }}><option value="">Choose column</option>{inspection?.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>
            </div>
            <label className="adm-field" style={{ marginTop: 14 }}><span className="lbl">Given names column (optional)</span><select value={givenNameColumn} onChange={(event) => { setGivenNameColumn(event.target.value); setPreview(null); }}><option value="">Not needed — name column above is already the full name</option>{inspection?.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select><span className="hint">If the file splits the name into a surname column and a separate given-names column (e.g. an official Monash enrolment export), map both — they'll be combined as "Given names Surname".</span></label>
            <div className="adm-modal-actions"><button className="btn primary" disabled={working || !studentColumn || !nameColumn} onClick={() => void previewUpload()}>{working ? "Checking..." : "Validate student list"}</button></div>
          </div>
        )}
      </div>

      {preview && <><div className="adm-stats"><div className="adm-stat ok"><div className="lbl"><span className="b" />Ready to register</div><div className="v">{preview.accepted_count}</div><div className="sub">Valid student records</div></div><div className="adm-stat risk"><div className="lbl"><span className="b" />Errors</div><div className="v">{errorCount}</div><div className="sub">Must be fixed before commit</div></div><div className="adm-stat warn"><div className="lbl"><span className="b" />Warnings</div><div className="v">{warningCount}</div><div className="sub">Review if present</div></div><div className="adm-stat"><div className="lbl"><span className="b" />Rows checked</div><div className="v">{preview.row_count}</div><div className="sub">Source file total</div></div></div><div className="adm-card"><div className="adm-card-head"><div><h4>Validation results</h4><div className="h-sub">The server will run the same checks again when you commit.</div></div></div>{preview.issues.length ? <table className="adm-tbl"><thead><tr><th>Row</th><th>Severity</th><th>Issue</th></tr></thead><tbody>{preview.issues.slice(0, 25).map((issue, index) => <tr key={`${issue.row}-${index}`} className={issue.severity === "error" ? "row-err" : "row-warn"}><td className="mono">{issue.row ?? "—"}</td><td><span className={`adm-row-status ${issue.severity === "error" ? "err" : "warn"}`}>{issue.severity}</span></td><td>{issue.message}</td></tr>)}</tbody></table> : <div className="adm-empty">All rows are ready to register.</div>}</div><div className="adm-commit"><div><div className="hd">Commit student list</div><div className="sb">This adds the students to the semester list and makes them available to every unit's grade upload.</div></div><div className="actions"><button className="btn" onClick={() => setPreview(null)}>Adjust mapping</button><button className="btn primary" disabled={working || errorCount > 0} onClick={() => void commit()}>{working ? "Committing..." : "Commit student list"}</button></div></div></>}

      {!file && !preview && (
        <div className="adm-card">
          <div className="adm-card-head"><div><h4>Student list{students ? ` — ${students.length} student${students.length === 1 ? "" : "s"}` : ""}</h4><div className="h-sub">{term ? `${visibleStudents.length} match${visibleStudents.length === 1 ? "" : "es"} "${query.trim()}".` : "Search by student ID or name."}</div></div></div>
          <div style={{ display: "flex", gap: 8, padding: "0 20px 16px" }}>
            <input className="adm-search" placeholder="Student ID or name" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") runSearch(); }} style={{ flex: 1 }} />
            <button className="btn" onClick={runSearch}>Search</button>
            {(query || searchInput) && <button className="btn" onClick={clearSearch}>Clear</button>}
          </div>
          {listLoading ? <div className="adm-empty">Loading student list...</div> : !students || students.length === 0 ? (
            <div className="adm-empty">No students on the list yet — upload the semester Student List above.</div>
          ) : visibleStudents.length === 0 ? (
            <div className="adm-empty">No student matches that search.</div>
          ) : (
            <table className="adm-tbl"><thead><tr><th>Student ID</th><th>Name</th></tr></thead><tbody>
              {visibleStudents.map((student) => <tr key={student.student_id}><td className="mono">{student.student_code}</td><td>{student.full_name}</td></tr>)}
            </tbody></table>
          )}
        </div>
      )}
    </div>
  </main></div>;
}
