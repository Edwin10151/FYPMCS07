import { useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import AdminNav from "../components/AdminNav";
import { useSession } from "../useSession";
import { findColumn, formatFileSize, parseCsv } from "../csv";
import { ACADEMIC_PERIODS, ENROLMENT_BATCHES, UNIT_OFFERINGS, type EnrolmentBatch } from "../mockData";
import { Link } from "react-router-dom";

type RowIssue = "" | "Missing student ID" | "Invalid ID format" | "Missing name" | "Duplicate in file";

type StagedRow = { studentId: string; name: string; issue: RowIssue };

type Staged = {
  fileName: string;
  fileSize: number;
  headers: string[];
  rows: StagedRow[];
  missingColumns: string[];
};

// Monash student IDs are 8 digits; anything else needs a human to look at it.
const ID_PATTERN = /^\d{8,9}$/;

function validate(rows: StagedRow[]) {
  const seen = new Set<string>();
  return rows.map((row) => {
    let issue: RowIssue = "";
    if (!row.studentId) issue = "Missing student ID";
    else if (!ID_PATTERN.test(row.studentId)) issue = "Invalid ID format";
    else if (seen.has(row.studentId)) issue = "Duplicate in file";
    else if (!row.name) issue = "Missing name";
    if (row.studentId) seen.add(row.studentId);
    return { ...row, issue };
  });
}

let nextBatchNumber = 42;

export default function AdminEnrolments() {
  const session = useSession();
  const [periodId, setPeriodId] = useState(ACADEMIC_PERIODS.find((p) => p.status === "planning")?.id ?? ACADEMIC_PERIODS[0].id);
  const [unitCode, setUnitCode] = useState("");
  const [staged, setStaged] = useState<Staged | null>(null);
  const [batches, setBatches] = useState<EnrolmentBatch[]>(ENROLMENT_BATCHES);
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [flash, setFlash] = useState("");

  const periodUnits = useMemo(() => UNIT_OFFERINGS.filter((u) => u.periodId === periodId && u.status !== "discontinued"), [periodId]);
  const visibleBatches = batches.filter((b) => filterPeriod === "all" || b.periodId === filterPeriod);

  if (!session) return null;

  const period = ACADEMIC_PERIODS.find((p) => p.id === periodId);

  const readFile = async (file: File) => {
    const text = await file.text();
    const { headers, rows } = parseCsv(text);

    const idCol = findColumn(headers, ["student_id", "studentid", "id", "student_number"]);
    const nameCol = findColumn(headers, ["name", "full_name", "student_name"]);
    const firstCol = findColumn(headers, ["first_name", "given_name", "given_names"]);
    const lastCol = findColumn(headers, ["last_name", "surname", "family_name"]);

    const missingColumns: string[] = [];
    if (idCol === -1) missingColumns.push("student_id");
    if (nameCol === -1 && (firstCol === -1 || lastCol === -1)) missingColumns.push("name (or first_name + last_name)");

    const parsed: StagedRow[] = rows.map((cells) => ({
      studentId: idCol === -1 ? "" : (cells[idCol] ?? "").replace(/\s+/g, ""),
      name:
        nameCol !== -1
          ? (cells[nameCol] ?? "").trim()
          : [firstCol !== -1 ? cells[firstCol] : "", lastCol !== -1 ? cells[lastCol] : ""].filter(Boolean).join(" ").trim(),
      issue: "",
    }));

    setStaged({ fileName: file.name, fileSize: file.size, headers, rows: validate(parsed), missingColumns });
  };

  const clean = staged ? staged.rows.filter((r) => !r.issue) : [];
  const problems = staged ? staged.rows.filter((r) => r.issue) : [];
  const duplicates = problems.filter((r) => r.issue === "Duplicate in file").length;
  const invalidIds = problems.filter((r) => r.issue === "Invalid ID format" || r.issue === "Missing student ID").length;
  const missingNames = problems.filter((r) => r.issue === "Missing name").length;

  const commit = () => {
    if (!staged) return;
    const batch: EnrolmentBatch = {
      batchId: `B-${new Date().getFullYear()}-${String(nextBatchNumber++).padStart(4, "0")}`,
      periodId,
      unitCode: unitCode || "All units",
      fileName: staged.fileName,
      studentCount: clean.length,
      issues: problems.length,
      uploadedBy: session.user.full_name,
      uploadedAt: new Date().toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      status: problems.length > 0 ? "needs_review" : "committed",
    };
    setBatches((prev) => [batch, ...prev]);
    setFlash(
      `${clean.length} students registered into ${period?.label ?? periodId}${unitCode ? ` · ${unitCode}` : ""}` +
        (problems.length ? ` — ${problems.length} rows skipped and flagged for review.` : ".")
    );
    setStaged(null);
  };

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
            <strong>Student Enrolments</strong>
          </div>
          <div className="top-actions">
            <button className="btn ghost">Download template</button>
            <button className="btn">Batch history</button>
          </div>
        </div>

        <div className="content">
          <div className="unit-banner">
            <div>
              <h1 style={{ fontSize: 26 }}>Student Enrolments</h1>
              <div className="sub">
                Faculty of IT &nbsp;·&nbsp; Upload the student list (ID + name) for each teaching period. Grade uploads can only
                match students who are registered here.
              </div>
            </div>
          </div>

          <AdminNav counts={{ "/admin/enrolments": batches.length }} />

          {flash && (
            <div className="adm-flash">
              ✓ {flash}
              <span className="x" onClick={() => setFlash("")}>
                ✕
              </span>
            </div>
          )}

          {/* Who is registered, per period */}
          <div className="adm-stats">
            {ACADEMIC_PERIODS.slice(0, 4).map((p) => (
              <div key={p.id} className={`adm-stat${p.status === "active" ? " ok" : p.status === "planning" ? " warn" : ""}`}>
                <div className="lbl">
                  <span className="b" />
                  {p.label} registered
                </div>
                <div className="v">
                  {p.studentCount.toLocaleString()} <span className="u">students</span>
                </div>
                <div className="sub">
                  {p.unitCount} units ·{" "}
                  {p.status === "active" ? "currently teaching" : p.status === "planning" ? "awaiting enrolment upload" : "archived"}
                </div>
              </div>
            ))}
          </div>

          {/* Upload */}
          <div className="adm-card">
            <div className="adm-card-head">
              <div>
                <h4>Upload a student list</h4>
                <div className="h-sub">
                  CSV with a <code>student_id</code> column plus either <code>name</code> or <code>first_name</code> +{" "}
                  <code>last_name</code>. Rows are validated in the browser before anything is committed.
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <select className="adm-select" value={periodId} onChange={(e) => { setPeriodId(e.target.value); setUnitCode(""); }}>
                  {ACADEMIC_PERIODS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <select className="adm-select" value={unitCode} onChange={(e) => setUnitCode(e.target.value)}>
                  <option value="">All units in period</option>
                  {periodUnits.map((u) => (
                    <option key={u.rowKey} value={u.code}>
                      {u.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!staged ? (
              <div style={{ padding: 20 }}>
                <label className="adm-drop">
                  <div className="icn">CSV</div>
                  <div className="t">Choose a student list for {period?.label ?? periodId}</div>
                  <div className="s">
                    e.g. <code>FIT2004_S1-2026_enrolments.csv</code> — student ID and name per row.
                    <br />
                    Existing students are matched by ID; new IDs are created.
                  </div>
                  <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
                </label>
              </div>
            ) : (
              <>
                <div className="adm-file-card">
                  <div className="icn">CSV</div>
                  <div>
                    <div className="nm">{staged.fileName}</div>
                    <div className="sub">
                      {staged.rows.length} rows · {staged.headers.length} columns · {formatFileSize(staged.fileSize)} ·{" "}
                      {period?.label ?? periodId}
                      {unitCode ? ` · ${unitCode}` : " · all units"}
                    </div>
                  </div>
                  <button className="btn" onClick={() => setStaged(null)}>
                    Replace file
                  </button>
                </div>

                {staged.missingColumns.length > 0 && (
                  <div style={{ padding: "16px 20px 0" }}>
                    <div className="banner warn">
                      <div className="ico">!</div>
                      <div className="body">
                        <strong>Missing required column{staged.missingColumns.length > 1 ? "s" : ""}</strong>
                        Could not find {staged.missingColumns.join(" and ")} in the header row. Detected columns:{" "}
                        {staged.headers.join(", ") || "none"}.
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ padding: "16px 20px" }}>
                  <div className="adm-stats" style={{ marginBottom: 16 }}>
                    <div className="adm-stat ok">
                      <div className="lbl">
                        <span className="b" />
                        Ready to register
                      </div>
                      <div className="v">
                        {clean.length} <span className="u">/ {staged.rows.length}</span>
                      </div>
                      <div className="sub">Valid ID and name</div>
                    </div>
                    <div className="adm-stat risk">
                      <div className="lbl">
                        <span className="b" />
                        Invalid IDs
                      </div>
                      <div className="v">{invalidIds}</div>
                      <div className="sub">Blank or not an 8-digit student ID</div>
                    </div>
                    <div className="adm-stat warn">
                      <div className="lbl">
                        <span className="b" />
                        Duplicates in file
                      </div>
                      <div className="v">{duplicates}</div>
                      <div className="sub">Same student listed more than once</div>
                    </div>
                    <div className="adm-stat warn">
                      <div className="lbl">
                        <span className="b" />
                        Missing names
                      </div>
                      <div className="v">{missingNames}</div>
                      <div className="sub">ID present but no student name</div>
                    </div>
                  </div>

                  <table className="adm-tbl" style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>Row</th>
                        <th>Student ID</th>
                        <th>Name</th>
                        <th style={{ textAlign: "right" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Problem rows first — those are what staff need to act on. */}
                      {[...staged.rows.map((r, i) => ({ r, i })).filter((x) => x.r.issue), ...staged.rows.map((r, i) => ({ r, i })).filter((x) => !x.r.issue)]
                        .slice(0, 10)
                        .map(({ r, i }) => (
                          <tr key={i} className={r.issue ? (r.issue === "Duplicate in file" || r.issue === "Missing name" ? "row-warn" : "row-err") : ""}>
                            <td className="mono">{i + 2}</td>
                            <td className="mono">{r.studentId || "—"}</td>
                            <td>{r.name || <span className="muted">—</span>}</td>
                            <td style={{ textAlign: "right" }}>
                              {r.issue ? (
                                <span className={`adm-row-status ${r.issue === "Duplicate in file" || r.issue === "Missing name" ? "warn" : "err"}`}>
                                  {r.issue}
                                </span>
                              ) : (
                                <span className="adm-row-status ok">✓ Ready</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      {staged.rows.length > 10 && (
                        <tr>
                          <td colSpan={4} className="adm-empty" style={{ padding: "14px 20px" }}>
                            Showing 10 of {staged.rows.length} rows — problem rows listed first.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {staged && (
            <div className="adm-commit">
              <div>
                <div className="hd">
                  Register {clean.length} student{clean.length === 1 ? "" : "s"} into {period?.label ?? periodId}
                </div>
                <div className="sb">
                  {unitCode ? `${unitCode} · ` : "All units in period · "}
                  {problems.length
                    ? `${problems.length} rows will be skipped and kept in the batch record for review`
                    : "No issues found in this file"}
                </div>
              </div>
              <div className="actions">
                <button className="btn" onClick={() => setStaged(null)}>
                  Discard
                </button>
                <button className="btn primary" disabled={clean.length === 0} onClick={commit}>
                  Commit enrolment batch
                </button>
              </div>
            </div>
          )}

          {/* Batch history */}
          <div className="adm-card">
            <div className="adm-card-head">
              <div>
                <h4>Enrolment batches</h4>
                <div className="h-sub">Every upload is kept as a batch so you can see who was registered, when, and by whom.</div>
              </div>
              <select className="adm-select" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}>
                <option value="all">All periods</option>
                {ACADEMIC_PERIODS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Period</th>
                  <th>Unit</th>
                  <th>File</th>
                  <th className="num">Students</th>
                  <th className="num">Issues</th>
                  <th>Uploaded</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleBatches.length === 0 && (
                  <tr>
                    <td colSpan={8} className="adm-empty">
                      No enrolment batches for this period yet.
                    </td>
                  </tr>
                )}
                {visibleBatches.map((b) => (
                  <tr key={b.batchId}>
                    <td className="mono">{b.batchId}</td>
                    <td>
                      <span className="adm-code plain">{ACADEMIC_PERIODS.find((p) => p.id === b.periodId)?.label ?? b.periodId}</span>
                    </td>
                    <td>{b.unitCode === "All units" ? <span className="muted">All units</span> : <span className="adm-code">{b.unitCode}</span>}</td>
                    <td className="mono" style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b.fileName}
                    </td>
                    <td className="num">{b.studentCount}</td>
                    <td className="num" style={{ color: b.issues ? "var(--warn)" : "var(--ink-3)" }}>
                      {b.issues || "—"}
                    </td>
                    <td>
                      <div style={{ fontSize: 12 }}>{b.uploadedBy}</div>
                      <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
                        {b.uploadedAt}
                      </div>
                    </td>
                    <td>
                      <span className={`adm-status ${b.status}`}>
                        <span className="d" />
                        {b.status === "committed" ? "Committed" : "Needs review"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
