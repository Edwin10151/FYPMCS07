import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useSession } from "../useSession";
import { formatFileSize, parseCsv } from "../csv";
import {
  buildCommittedGrades,
  clearCommittedGrades,
  formatCommittedAt,
  loadCommittedGrades,
  saveCommittedGrades,
  type CommittedGrades,
} from "../gradeUploadStore";
import { ASSESSMENTS, MOCK_COHORT } from "../mockData";
import "./CsvUpload.css";
import { getSelectedUnit } from "../api";

const selectedUnit = getSelectedUnit();
const unitCode = selectedUnit?.unitCode ?? "FIT2004";

const UNIT_CODE = "FIT2004";
const UNIT_NAME = "Algorithms and Data Structures";
const STEPS = ["Upload file", "Map columns", "Reconcile records", "Confirm & commit"];

type ReconBucket = "matched" | "oor" | "unmatched" | "missing";

type ReconRow = {
  studentId: string;
  name: string;
  detail: string;
  csvRow?: number;
};

const IDENTITY_FIELDS = ["student_id", "first_name", "last_name"] as const;
type IdentityField = (typeof IDENTITY_FIELDS)[number];
type FieldKey = IdentityField | `mark:${string}`;

type FieldDef = { value: FieldKey; label: string; required?: boolean; hint: string };

const IDENTITY_GUESS: Record<IdentityField, string[]> = {
  student_id: ["student_id", "studentid", "id", "id_number", "student_number", "auth_identifier"],
  first_name: ["first_name", "given_name", "given_names", "firstname"],
  last_name: ["last_name", "surname", "family_name", "lastname"],
};

function isMarkField(value: string): value is `mark:${string}` {
  return value.startsWith("mark:");
}

function assessmentIdFromField(value: string): string | null {
  return isMarkField(value) ? value.slice("mark:".length) : null;
}

/** Mapping targets: identity + one mark field per handbook-scraped assessment. */
function buildTargetFields(): FieldDef[] {
  return [
    { value: "student_id", label: "Student ID", required: true, hint: "" },
    { value: "first_name", label: "First name", hint: "" },
    { value: "last_name", label: "Last name", hint: "" },
    ...ASSESSMENTS.map((a) => ({
      value: `mark:${a.id}` as FieldKey,
      label: `${a.id} mark`,
      required: true,
      hint: `${a.name} · ${a.weight}% of unit`,
    })),
  ];
}

/** Default full marks for a CSV column — Percentage columns are out of 100. */
function guessMaxMarks(displayHeader: string): string {
  const h = displayHeader.toLowerCase();
  if (h.includes("percentage") || h.includes("(%)") || h.endsWith("%")) return "100";
  return "100";
}

function emptyMaxMarks(): Record<string, string> {
  const m: Record<string, string> = {};
  for (const a of ASSESSMENTS) m[a.id] = "100";
  return m;
}

function parseMaxMarks(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

type UploadedFile = {
  name: string;
  size: number;
  headers: string[];
  displayHeaders: string[];
  rows: string[][];
  uploadedAt: string;
};

type FieldMapping = Record<string, string>;

function emptyMapping(fields: FieldDef[]): FieldMapping {
  const m: FieldMapping = {};
  for (const f of fields) m[f.value] = "";
  return m;
}

function guessMapping(headers: string[], fields: FieldDef[]): FieldMapping {
  const mapping = emptyMapping(fields);
  const used = new Set<string>();

  const take = (candidates: string[]): string => {
    const hit = headers.find((h) => candidates.includes(h) && !used.has(h));
    if (hit) used.add(hit);
    return hit ?? "";
  };

  mapping.student_id = take(IDENTITY_GUESS.student_id);
  mapping.first_name = take(IDENTITY_GUESS.first_name);
  mapping.last_name = take(IDENTITY_GUESS.last_name);

  for (const a of ASSESSMENTS) {
    const id = a.id.toLowerCase();
    mapping[`mark:${a.id}`] = take([
      id,
      `${id}_score`,
      `${id}_mark`,
      `${id} score`,
      `${id} mark`,
      a.name.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
    ]);
  }

  return mapping;
}

function parseMarkValue(raw: string): number | null {
  const cleaned = raw.replace(/%/g, "").trim();
  if (!cleaned || cleaned === "-") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function buildReconcile(
  file: UploadedFile,
  mapping: FieldMapping,
  maxMarks: Record<string, string>
): Record<ReconBucket, ReconRow[]> {
  const idIdx = file.headers.indexOf(mapping.student_id);
  const firstIdx = mapping.first_name ? file.headers.indexOf(mapping.first_name) : -1;
  const lastIdx = mapping.last_name ? file.headers.indexOf(mapping.last_name) : -1;
  const markCols = ASSESSMENTS.map((a) => ({
    id: a.id,
    idx: file.headers.indexOf(mapping[`mark:${a.id}`] ?? ""),
    max: parseMaxMarks(maxMarks[a.id] ?? "") ?? 100,
  })).filter((c) => c.idx >= 0);

  const cohortById = new Map(MOCK_COHORT.map((s) => [s.studentId, s]));
  const csvIds = new Set<string>();
  const matched: ReconRow[] = [];
  const oor: ReconRow[] = [];
  const unmatched: ReconRow[] = [];

  file.rows.forEach((row, i) => {
    const studentId = (idIdx >= 0 ? row[idIdx] : "").trim();
    if (!studentId) return;
    csvIds.add(studentId);

    const first = firstIdx >= 0 ? row[firstIdx]?.trim() : "";
    const last = lastIdx >= 0 ? row[lastIdx]?.trim() : "";
    const enrolled = cohortById.get(studentId);
    const name =
      [first, last].filter(Boolean).join(" ") ||
      (enrolled ? `${enrolled.firstName} ${enrolled.lastName}` : "—");

    if (!enrolled) {
      unmatched.push({
        studentId,
        name,
        detail: "Student ID not in S1 2026 enrolment",
        csvRow: i + 2,
      });
      return;
    }

    const overflows: string[] = [];
    for (const col of markCols) {
      const raw = row[col.idx] ?? "";
      const value = parseMarkValue(raw);
      if (value !== null && value > col.max) {
        overflows.push(`${col.id}: ${raw} > ${col.max}`);
      }
    }

    const base: ReconRow = {
      studentId,
      name,
      detail: overflows.length ? overflows.join(" · ") : "Grades within range",
      csvRow: i + 2,
    };

    if (overflows.length) oor.push(base);
    else matched.push(base);
  });

  const missing: ReconRow[] = MOCK_COHORT.filter((s) => !csvIds.has(s.studentId)).map((s) => ({
    studentId: s.studentId,
    name: `${s.firstName} ${s.lastName}`,
    detail: "Enrolled student absent from CSV",
  }));

  return { matched, oor, unmatched, missing };
}

const TARGET_FIELDS = buildTargetFields();
const IDENTITY_TARGET_FIELDS = TARGET_FIELDS.filter((f) => !isMarkField(f.value));
const MARK_TARGET_FIELDS = TARGET_FIELDS.filter((f) => isMarkField(f.value));
const ASSESSMENT_IDS = ASSESSMENTS.map((a) => a.id).join(" · ");

const RECON_CARDS: Array<{
  key: ReconBucket;
  label: string;
  cls: string;
  sub: (n: number, total: number) => string;
}> = [
  {
    key: "matched",
    label: "Matched & ready",
    cls: "ok",
    sub: () => "Student IDs found in cohort, grades valid",
  },
  {
    key: "oor",
    label: "Out-of-range marks",
    cls: "warn",
    sub: () => "Mark exceeds the full marks you set. Review needed.",
  },
  {
    key: "unmatched",
    label: "Unmatched IDs",
    cls: "risk",
    sub: () => "Student ID not in S1 2026 enrolment",
  },
  {
    key: "missing",
    label: "Missing rows",
    cls: "",
    sub: () => "Enrolled students absent from CSV",
  },
];

export default function CsvUpload() {
  const navigate = useNavigate();
  const session = useSession();
  const [committed, setCommitted] = useState<CommittedGrades | null>(() => loadCommittedGrades(UNIT_CODE));
  const [forceNewUpload, setForceNewUpload] = useState(false);
  const [step, setStep] = useState(0);
  const [reconBucket, setReconBucket] = useState<ReconBucket>("matched");
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [mapping, setMapping] = useState<FieldMapping>(() => emptyMapping(TARGET_FIELDS));
  const [maxMarks, setMaxMarks] = useState<Record<string, string>>(emptyMaxMarks);
  const [dragOver, setDragOver] = useState(false);

  if (!session) return null;

  const showCommittedView = !!committed && !forceNewUpload;

  const startNewUpload = () => {
    setForceNewUpload(true);
    setFile(null);
    setMapping(emptyMapping(TARGET_FIELDS));
    setMaxMarks(emptyMaxMarks());
    setStep(0);
    setReconBucket("matched");
  };

  const displayLabel = (headerKey: string) => {
    if (!file || !headerKey) return headerKey;
    const idx = file.headers.indexOf(headerKey);
    return idx === -1 ? headerKey : file.displayHeaders[idx] ?? headerKey;
  };

  const marksConfigured = ASSESSMENTS.every((a) => {
    const header = mapping[`mark:${a.id}`];
    return !!header && parseMaxMarks(maxMarks[a.id] ?? "") !== null;
  });
  const requiredOk = !!mapping.student_id && marksConfigured;
  const mappedCount = TARGET_FIELDS.filter((f) => mapping[f.value]).length;
  const requiredMapped =
    (mapping.student_id ? 1 : 0) +
    ASSESSMENTS.filter((a) => mapping[`mark:${a.id}`] && parseMaxMarks(maxMarks[a.id] ?? "") !== null).length;
  const requiredTotal = 1 + ASSESSMENTS.length;
  const mappedAssessments = ASSESSMENTS.filter((a) => mapping[`mark:${a.id}`]);
  const reconcile = file ? buildReconcile(file, mapping, maxMarks) : null;

  const readFile = async (f: File) => {
    const text = await f.text();
    const { headers, displayHeaders, rows } = parseCsv(text);
    const uploaded: UploadedFile = {
      name: f.name,
      size: f.size,
      headers,
      displayHeaders,
      rows,
      uploadedAt: new Date().toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    const nextMapping = guessMapping(headers, TARGET_FIELDS);
    const nextMax = emptyMaxMarks();
    for (const a of ASSESSMENTS) {
      const key = nextMapping[`mark:${a.id}`];
      if (key) {
        const idx = headers.indexOf(key);
        nextMax[a.id] = guessMaxMarks(displayHeaders[idx] ?? key);
      }
    }
    setFile(uploaded);
    setMapping(nextMapping);
    setMaxMarks(nextMax);
    setStep(1);
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void readFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && (f.name.endsWith(".csv") || f.type.includes("csv") || f.type === "text/plain")) {
      void readFile(f);
    }
  };

  const setFieldHeader = (field: FieldKey, headerKey: string) => {
    setMapping((prev) => {
      const next = { ...prev };
      if (headerKey) {
        for (const key of Object.keys(next)) {
          if (next[key] === headerKey) next[key] = "";
        }
      }
      next[field] = headerKey;
      return next;
    });

    const assessmentId = assessmentIdFromField(field);
    if (assessmentId && headerKey && file) {
      setMaxMarks((prev) => ({
        ...prev,
        [assessmentId]: guessMaxMarks(displayLabel(headerKey)),
      }));
    }
  };

  const setAssessmentMaxMarks = (assessmentId: string, value: string) => {
    setMaxMarks((prev) => ({ ...prev, [assessmentId]: value }));
  };

  const replaceFile = () => {
    setFile(null);
    setMapping(emptyMapping(TARGET_FIELDS));
    setMaxMarks(emptyMaxMarks());
    setStep(0);
  };

  const titleByStep = ["Upload grades file", "Map CSV columns", "Reconcile grades", "Confirm & commit"];

  const headerOptions = (field: FieldDef) =>
    file
      ? file.headers.map((h, i) => {
          const usedByOther = !!h && TARGET_FIELDS.some((f) => f.value !== field.value && mapping[f.value] === h);
          return (
            <option key={h} value={h} disabled={usedByOther}>
              {file.displayHeaders[i] ?? h}
              {usedByOther ? " (already used)" : ""}
            </option>
          );
        })
      : null;

  const selectedRecon = reconcile ? reconcile[reconBucket] : [];
  const commitReady = reconcile ? reconcile.matched.length + reconcile.oor.length : 0;

  const commitGrades = () => {
    if (!file || !reconcile) return;
    const includeStudentIds = new Set([
      ...reconcile.matched.map((r) => r.studentId),
      ...reconcile.oor.map((r) => r.studentId),
    ]);
    const snapshot = buildCommittedGrades({
      unitCode: UNIT_CODE,
      fileName: file.name,
      committedBy: session.user.full_name,
      headers: file.headers,
      rows: file.rows,
      mapping,
      maxMarks,
      includeStudentIds,
    });
    saveCommittedGrades(UNIT_CODE, snapshot);
    setCommitted(snapshot);
    setForceNewUpload(false);
    setFile(null);
    setStep(0);
  };

  if (showCommittedView && committed) {
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
              <Link to="/upload">Upload</Link>
            </div>
            <div className="top-actions">
              <button
                className="btn ghost"
                onClick={() => {
                  clearCommittedGrades(UNIT_CODE);
                  setCommitted(null);
                  startNewUpload();
                }}
              >
                Clear upload
              </button>
              <button className="btn primary" onClick={startNewUpload}>
                Upload new CSV
              </button>
            </div>
          </div>

          <div className="content">
            <div className="unit-banner">
              <div>
                <h1 style={{ fontSize: 26 }}>Uploaded grades</h1>
                <div className="sub">
                  <span className="code">{UNIT_CODE}</span> {UNIT_NAME} &nbsp;·&nbsp;{" "}
                  <strong>{committed.rowCount}</strong> student
                  {committed.rowCount === 1 ? "" : "s"} committed
                </div>
              </div>
              <span className="pill ok">
                <span className="dot" />
                Committed
              </span>
            </div>

            <div className="file-card">
              <div className="icn">CSV</div>
              <div>
                <div className="nm">{committed.fileName}</div>
                <div className="sub">
                  Committed {formatCommittedAt(committed.committedAt)} by {committed.committedBy} ·{" "}
                  {committed.assessmentIds
                    .map((id) => `${id} /${committed.maxMarks[id] ?? "?"}`)
                    .join(" · ")}
                </div>
              </div>
            </div>

            <div className="grades-tbl-card">
              <table className="grades-tbl">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>First name</th>
                    <th>Last name</th>
                    {committed.assessmentIds.map((id) => (
                      <th key={id}>
                        {id}
                        <span className="grades-th-max"> /{committed.maxMarks[id] ?? "?"}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {committed.rows.map((row) => (
                    <tr key={row.studentId}>
                      <td className="id">{row.studentId}</td>
                      <td>{row.firstName || "—"}</td>
                      <td>{row.lastName || "—"}</td>
                      {committed.assessmentIds.map((id) => (
                        <td key={id} className="num">
                          {row.marks[id] == null ? "—" : row.marks[id]}
                        </td>
                      ))}
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
            <Link to="/upload">Upload</Link>
          </div>
          <div className="top-actions">
            <button
              className="btn ghost"
              onClick={() => {
                if (committed && forceNewUpload) {
                  setForceNewUpload(false);
                  setFile(null);
                  setStep(0);
                  return;
                }
                navigate("/assessments");
              }}
            >
              {committed && forceNewUpload ? "Back to grades" : "Cancel upload"}
            </button>
            {step > 0 && (
              <button className="btn" onClick={() => setStep((s) => Math.max(0, s - 1))}>
                Back
              </button>
            )}
          </div>
        </div>

        <div className="content">
          <div className="unit-banner">
            <div>
              <h1 style={{ fontSize: 26 }}>{titleByStep[step]}</h1>
              <div className="sub">
                <span className="code">FIT2004</span> Algorithms and Data Structures &nbsp;·&nbsp; Map CSV columns to{" "}
                <strong>{ASSESSMENT_IDS}</strong>
              </div>
            </div>
          </div>

          <div className="stepper">
            {STEPS.map((s, i) => {
              const done = i < step;
              const now = i === step;
              return (
                <div key={s} style={{ display: "contents" }}>
                  <div className={`step${done ? " done" : now ? " now" : ""}`}>
                    <div className="n">{done ? "✓" : i + 1}</div>
                    <div className="label">{s}</div>
                  </div>
                  {i < STEPS.length - 1 && <div className={`ln${done ? " done" : ""}`} />}
                </div>
              );
            })}
          </div>

          {step === 0 && (
            <div className="upload-step-card">
              <label
                className={`grade-drop${dragOver ? " over" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <div className="icn">CSV</div>
                <div className="t">Drop a grades CSV here, or click to browse</div>
                <div className="s">
                  Expected columns include a student ID and marks for{" "}
                  <strong>{ASSESSMENT_IDS}</strong>. Headers are read from row 1 and mapped on the next step.
                  <br />
                  e.g. <code>FIT2004_S1-2026_grades.csv</code>
                </div>
                <input type="file" accept=".csv,text/csv,text/plain" onChange={onFileInput} />
              </label>
              <div className="upload-hint">
                Tip: we'll auto-detect common headers like <code>student_id</code>, <code>a1_score</code>,{" "}
                <code>a2_mark</code>, <code>ex</code>.
              </div>
            </div>
          )}

          {step === 1 && file && (
            <>
              <div className="file-card">
                <div className="icn">CSV</div>
                <div>
                  <div className="nm">{file.name}</div>
                  <div className="sub">
                    {file.rows.length} rows · {file.headers.length} columns · {formatFileSize(file.size)} · Uploaded by{" "}
                    {session.user.full_name}, {file.uploadedAt}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={replaceFile}>
                    Replace file
                  </button>
                </div>
              </div>

              <div className="mapping-card">
                <div className="hd">
                  <div>
                    <h4>Map columns to assessments</h4>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 3 }}>
                      Choose which CSV header fills each field. For each assessment mark, also enter the column’s full
                      marks (e.g. 78 out of <em>100</em>) so the backend can weight it by the handbook %.
                    </div>
                  </div>
                  <span className={`pill ${requiredOk ? "ok" : "warn"}`}>
                    <span className="dot" />
                    {requiredMapped}/{requiredTotal} required · {mappedCount}/{TARGET_FIELDS.length} fields
                    {!requiredOk && " · missing required"}
                  </span>
                </div>

                {!requiredOk && (
                  <div className="banner warn" style={{ marginBottom: 14 }}>
                    <div className="ico">!</div>
                    <div className="body">
                      <strong>Required fields not mapped yet</strong>
                      Map <em>Student ID</em>, a mark column for each assessment ({ASSESSMENT_IDS}), and set each column’s{" "}
                      <em>full marks</em> before continuing.
                    </div>
                  </div>
                )}

                <div className="col-map-edit">
                  <div className="identity-map-row">
                    {IDENTITY_TARGET_FIELDS.map((field) => {
                      const headerKey = mapping[field.value] ?? "";
                      return (
                        <div key={field.value} className={`identity-map-cell${!headerKey ? " unmapped" : ""}`}>
                          <div className="src">
                            {field.label}
                            {field.required ? " *" : ""}
                          </div>
                          <div className="src-lbl">CSV header</div>
                          <select
                            className="map-select"
                            value={headerKey}
                            onChange={(e) => setFieldHeader(field.value, e.target.value)}
                          >
                            <option value="">— Select column —</option>
                            {headerOptions(field)}
                          </select>
                        </div>
                      );
                    })}
                  </div>

                  {MARK_TARGET_FIELDS.map((field) => {
                    const headerKey = mapping[field.value] ?? "";
                    const assessmentId = assessmentIdFromField(field.value);
                    const maxValue = assessmentId ? (maxMarks[assessmentId] ?? "") : "";
                    const maxNum = parseMaxMarks(maxValue);
                    const fieldLabel =
                      assessmentId && maxNum
                        ? `${assessmentId} mark · /${maxNum}`
                        : assessmentId
                          ? `${assessmentId} mark · /?`
                          : field.label;

                    return (
                      <div key={field.value} className={`col-edit${!headerKey ? " unmapped" : ""}`}>
                        <div className="src-block">
                          <div className="src">
                            {fieldLabel}
                            {field.required ? " *" : ""}
                          </div>
                          {field.hint ? <div className="field-hint">{field.hint}</div> : null}
                        </div>
                        <div className="tgt-block">
                          <div className="src-lbl">CSV header</div>
                          <select
                            className="map-select"
                            value={headerKey}
                            onChange={(e) => setFieldHeader(field.value, e.target.value)}
                          >
                            <option value="">— Select column —</option>
                            {headerOptions(field)}
                          </select>
                          {assessmentId && headerKey && (
                            <div className="max-marks">
                              <div className="src-lbl">Full marks for this column</div>
                              <div className="max-marks-row">
                                <input
                                  type="number"
                                  className={`max-marks-input${maxNum === null ? " invalid" : ""}`}
                                  min={1}
                                  step="any"
                                  inputMode="decimal"
                                  value={maxValue}
                                  onChange={(e) => setAssessmentMaxMarks(assessmentId, e.target.value)}
                                  aria-label={`Full marks for ${assessmentId}`}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="confirm-bar">
                <div>
                  <div className="hd">
                    {requiredOk ? "Column mapping looks ready" : "Finish mapping required columns"}
                  </div>
                  <div className="sb">
                    {file.rows.length} data rows will be checked against the FIT2004 enrolment list on the next step.
                  </div>
                </div>
                <div className="actions">
                  <button className="btn primary" disabled={!requiredOk} onClick={() => setStep(2)}>
                    Continue → Reconcile
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 2 && file && reconcile && (
            <>
              <div className="file-card">
                <div className="icn">CSV</div>
                <div>
                  <div className="nm">{file.name}</div>
                  <div className="sub">
                    {file.rows.length} rows · {file.headers.length} columns · {formatFileSize(file.size)} · Uploaded by{" "}
                    {session.user.full_name}, {file.uploadedAt}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn ghost" onClick={() => setStep(1)}>
                    Edit mapping
                  </button>
                  <button className="btn" onClick={replaceFile}>
                    Replace file
                  </button>
                </div>
              </div>

              <div className="result-row">
                {RECON_CARDS.map((card) => {
                  const rows = reconcile[card.key];
                  const selected = reconBucket === card.key;
                  return (
                    <button
                      key={card.key}
                      type="button"
                      className={`stat-card clickable${card.cls ? ` ${card.cls}` : ""}${selected ? " selected" : ""}`}
                      onClick={() => setReconBucket(card.key)}
                    >
                      <div className="lbl">
                        <span className="b" />
                        {card.label}
                      </div>
                      <div className="v">
                        {card.key === "matched" ? (
                          <>
                            {rows.length} <span className="u">/ {file.rows.length}</span>
                          </>
                        ) : (
                          rows.length
                        )}
                      </div>
                      <div className="sub">{card.sub(rows.length, file.rows.length)}</div>
                    </button>
                  );
                })}
              </div>

              <div className="recon-detail-card">
                <div className="recon-detail-hd">
                  <h4>{RECON_CARDS.find((c) => c.key === reconBucket)?.label}</h4>
                  <span className="recon-detail-count">{selectedRecon.length} record{selectedRecon.length === 1 ? "" : "s"}</span>
                </div>
                {selectedRecon.length === 0 ? (
                  <div className="recon-detail-empty">No records in this category.</div>
                ) : (
                  <table className="recon-tbl">
                    <thead>
                      <tr>
                        <th>Student ID</th>
                        <th>Name</th>
                        {reconBucket !== "missing" && <th>CSV row</th>}
                        <th>Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRecon.map((r) => (
                        <tr
                          key={`${r.studentId}-${r.csvRow ?? "m"}`}
                          className={reconBucket === "oor" ? "warn" : reconBucket === "unmatched" ? "err" : undefined}
                        >
                          <td className="id">{r.studentId}</td>
                          <td className="nm">{r.name}</td>
                          {reconBucket !== "missing" && <td className="id">{r.csvRow ?? "—"}</td>}
                          <td>
                            <span
                              className={`reason${reconBucket === "oor" ? " w" : reconBucket === "matched" ? " ok" : ""}`}
                            >
                              {r.detail}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="confirm-bar">
                <div>
                  <div className="hd">Ready to continue</div>
                  <div className="sb">
                    {reconcile.matched.length} matched · {reconcile.oor.length} out of range · {reconcile.unmatched.length}{" "}
                    unmatched · {reconcile.missing.length} missing
                  </div>
                </div>
                <div className="actions">
                  <button className="btn" onClick={() => setStep(1)}>
                    Back to mapping
                  </button>
                  <button className="btn primary" onClick={() => setStep(3)}>
                    Continue → Confirm &amp; commit
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 3 && file && reconcile && (
            <div className="confirm-final">
              <div className="confirm-final-card">
                {(() => {
                  const issues = [
                    reconcile.unmatched.length > 0 && {
                      key: "unmatched",
                      text: `${reconcile.unmatched.length} unmatched ID${reconcile.unmatched.length === 1 ? "" : "s"} will be skipped`,
                    },
                    reconcile.oor.length > 0 && {
                      key: "oor",
                      text: `${reconcile.oor.length} out-of-range mark${reconcile.oor.length === 1 ? "" : "s"} still need review`,
                    },
                    reconcile.missing.length > 0 && {
                      key: "missing",
                      text: `${reconcile.missing.length} enrolled student${reconcile.missing.length === 1 ? "" : "s"} missing from the CSV`,
                    },
                  ].filter(Boolean) as Array<{ key: string; text: string }>;
                  const allGood = issues.length === 0;

                  return (
                    <>
                      <div className={`check-circle${allGood ? "" : " warn"}`}>{allGood ? "✓" : "!"}</div>
                      <h2>{allGood ? "Confirm grade commit" : "Unresolved issues before commit"}</h2>
                      {allGood ? (
                        <p>
                          Everything looks good. Commit <strong>{commitReady}</strong> student row
                          {commitReady === 1 ? "" : "s"} into{" "}
                          <strong>{mappedAssessments.map((a) => a.id).join(", ") || "assessments"}</strong> for FIT2004 ·
                          Semester 1 2026?
                        </p>
                      ) : (
                        <>
                          <p>
                            You can still commit <strong>{commitReady}</strong> matched row
                            {commitReady === 1 ? "" : "s"}, but these issues are unresolved:
                          </p>
                          <ul className="confirm-issues">
                            {issues.map((issue) => (
                              <li key={issue.key}>{issue.text}</li>
                            ))}
                          </ul>
                          <p className="confirm-note">Go back to reconcile to review them, or commit and skip them.</p>
                        </>
                      )}
                      <div className="confirm-final-actions">
                        <button className="btn" onClick={() => setStep(2)}>
                          Back to reconcile
                        </button>
                        <button className="btn primary" onClick={commitGrades}>
                          {allGood ? "Confirm & commit" : "Commit anyway"}
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
