import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useSession } from "../useSession";
import { ASSESSMENTS, RECON_ROWS, RECON_TABS, ULOS } from "../mockData";
import "./CsvUpload.css";

const STEPS = ["Upload file", "Map columns", "Reconcile records", "Confirm & commit"];

export default function CsvUpload() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const session = useSession();
  const [activeTab, setActiveTab] = useState(1);

  const assessment = ASSESSMENTS.find((a) => a.id === assessmentId);

  useEffect(() => {
    if (!assessment) navigate("/upload", { replace: true });
  }, [assessment, navigate]);

  if (!assessment || !session) return null;

  const scoreCol = `${assessment.id.toLowerCase()}_score`;
  const columns = [
    { src: "student_id", tgt: "Student ID" },
    { src: "first_name", tgt: "Given name" },
    { src: "last_name", tgt: "Surname" },
    { src: scoreCol, tgt: `${assessment.id} mark · /100` },
    { src: "tutor_note", tgt: "— ignored —", unmapped: true },
  ];

  const taggedLos = assessment.outcomes;
  const share = taggedLos.length ? assessment.weight / taggedLos.length : 0;
  const loPreview = ULOS.map((lo, i) => {
    const on = taggedLos.includes(i + 1);
    return {
      lo,
      v: on ? `+${share.toFixed(1)}%` : "—",
      sub: on ? "affected" : "not affected",
      highlight: on,
    };
  });
  const loTag = taggedLos.map((n) => `LO${n}`).join(" · ");

  return (
    <div className="app">
      <Sidebar user={session.user} />
      <main className="main">
        <div className="topbar">
          <div className="crumbs">
            Grade upload <span className="sep">›</span> <strong>FIT2004</strong> <span className="sep">›</span> {assessment.name}
          </div>
          <div className="top-actions">
            <button className="btn ghost" onClick={() => navigate("/upload")}>
              Cancel upload
            </button>
            <button className="btn">Save as draft</button>
          </div>
        </div>

        <div className="content">
          <div className="unit-banner">
            <div>
              <h1 style={{ fontSize: 26 }}>Reconcile grades</h1>
              <div className="sub">
                <span className="code">FIT2004</span> Algorithms and Data Structures &nbsp;·&nbsp; Uploading grades for{" "}
                <strong>{assessment.name}</strong> ({assessment.id} · {assessment.weight}%)
              </div>
            </div>
          </div>

          <div className="stepper">
            {STEPS.map((s, i) => {
              const done = i < 2;
              const now = i === 2;
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

          <div className="file-card">
            <div className="icn">CSV</div>
            <div>
              <div className="nm">FIT2004_S1-2026_{assessment.id}_grades_final.csv</div>
              <div className="sub">287 rows · 6 columns · 24.3 KB · Uploaded by {session.user.full_name}, 11 May 2026 09:42</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn ghost">Preview raw</button>
              <button className="btn">Replace file</button>
            </div>
          </div>

          <div className="result-row">
            <div className="stat-card ok">
              <div className="lbl">
                <span className="b" />
                Matched &amp; ready
              </div>
              <div className="v">
                281 <span className="u">/ 287</span>
              </div>
              <div className="sub">Student IDs found in cohort, grades valid</div>
            </div>
            <div className="stat-card warn">
              <div className="lbl">
                <span className="b" />
                Out-of-range marks
              </div>
              <div className="v">3</div>
              <div className="sub">Mark exceeds {assessment.id} max (100). Review needed.</div>
            </div>
            <div className="stat-card risk">
              <div className="lbl">
                <span className="b" />
                Unmatched IDs
              </div>
              <div className="v">2</div>
              <div className="sub">Student ID not in S1 2026 enrolment</div>
            </div>
            <div className="stat-card">
              <div className="lbl">
                <span className="b" />
                Missing rows
              </div>
              <div className="v">6</div>
              <div className="sub">Enrolled students absent from CSV</div>
            </div>
          </div>

          <div className="mapping-card">
            <div className="hd">
              <div>
                <h4>Column mapping</h4>
                <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 3 }}>
                  Detected from row 1. Re-map any column if it's pointing to the wrong field.
                </div>
              </div>
              <span className="pill ok">
                <span className="dot" />5 of 5 required mapped · 1 ignored
              </span>
            </div>
            <div className="col-map">
              {columns.map((c) => (
                <div key={c.src} className={`col${c.unmapped ? " unmapped" : ""}`}>
                  <div className="src">{c.src}</div>
                  <div className="arr">↓ {c.unmapped ? "" : "mapped to"}</div>
                  <div className="tgt">{c.tgt}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="tabs">
            {RECON_TABS.map((t, i) => (
              <div
                key={t.label}
                className={`tab${t.cls ? " " + t.cls : ""}${activeTab === i ? " on" : ""}${t.right ? " right-tab" : ""}`}
                onClick={() => setActiveTab(i)}
              >
                <span>{t.label}</span>
                <span className="ct">{t.count}</span>
              </div>
            ))}
          </div>

          <div className="err-toolbar">
            <strong>3 rows need review</strong>
            <span style={{ color: "var(--ink-3)" }}>·</span>
            {assessment.id} mark exceeds the assessment maximum.
            <div className="right">
              <button className="btn ghost" style={{ height: 28, fontSize: 11.5 }}>
                Skip these rows
              </button>
              <button className="btn" style={{ height: 28, fontSize: 11.5 }}>
                Apply cap (100)
              </button>
            </div>
          </div>

          <div className="recon-tbl-card">
            <table className="recon-tbl">
              <thead>
                <tr>
                  <th style={{ width: 38 }}></th>
                  <th>Student</th>
                  <th>Row in CSV</th>
                  <th>Detected {assessment.id} mark</th>
                  <th>Computed</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {RECON_ROWS.map((r, i) => (
                  <tr key={i} className={r.cls}>
                    <td>
                      <span className={`row-icon ${r.iconCls}`}>{r.icon}</span>
                    </td>
                    <td className="nm">
                      {r.name} <span className="em">{r.email}</span>
                    </td>
                    <td className="id">{r.csvRow}</td>
                    <td
                      className="num"
                      style={{ color: r.iconCls === "warn" ? "var(--warn)" : "var(--ink-3)", fontWeight: r.iconCls === "warn" ? 700 : undefined }}
                    >
                      {r.detected} / 100
                    </td>
                    <td className="num" style={{ color: "var(--ink-3)" }}>
                      {r.computed}
                    </td>
                    <td>
                      <span className={`reason${r.reasonCls ? " " + r.reasonCls : ""}`}>{r.reason}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="fix-link">{r.action}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mapping-card">
            <div className="hd">
              <div>
                <h4>Preview: how this upload will affect LO attainment</h4>
                <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 3 }}>
                  {assessment.id}'s {assessment.weight}% weight{" "}
                  {taggedLos.length
                    ? `distributes across its ${taggedLos.length} tagged LO${taggedLos.length === 1 ? "" : "s"} (${loTag}) — ${share.toFixed(2)}% to each.`
                    : "has no tagged LOs yet."}
                </div>
              </div>
              <span className="tag navy">
                {assessment.id} → {loTag || "no LOs"}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              {loPreview.map((c) => (
                <div
                  key={c.lo}
                  style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "12px 14px", background: c.highlight ? "white" : "var(--paper-2)" }}
                >
                  <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "'JetBrains Mono',monospace" }}>{c.lo}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                    <span style={{ fontFamily: "'Newsreader',serif", fontSize: 22, fontWeight: 500, color: c.highlight ? "var(--ink)" : "var(--ink-3)" }}>
                      {c.v}
                    </span>
                    <span style={{ fontSize: 11, color: c.highlight ? "var(--ok)" : "var(--ink-3)", fontWeight: c.highlight ? 600 : undefined }}>{c.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="confirm-bar">
            <div>
              <div className="hd">Ready to commit 284 rows</div>
              <div className="sb">281 matched · 3 auto-capped at 100 · 2 errors and 6 missing will be skipped &amp; flagged on the dashboard</div>
            </div>
            <div className="actions">
              <button className="btn" onClick={() => navigate("/upload")}>
                Back to assessment list
              </button>
              <button className="btn primary">Continue → Confirm &amp; commit</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
