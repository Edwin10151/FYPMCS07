import { useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useSession } from "../useSession";
import { AI_SUMMARY_DEMO, DASHBOARD_ASSESSMENTS, DIST, LOS, TREND } from "../mockData";
import "./Dashboard.css";

export default function Dashboard() {
  const session = useSession();
  const [summary, setSummary] = useState("");

  if (!session) return null;

  return (
    <div className="app">
      <Sidebar user={session.user} />
      <main className="main">
        {/* Topbar */}
        <div className="topbar">
          <div className="crumbs">
            Units <span className="sep">›</span> FIT <span className="sep">›</span> <strong>FIT2004</strong>{" "}
            <span className="sep">›</span> Semester 1 2026
          </div>
          <div className="top-actions">
            <div className="search">
              ⌕ Search units, students, LOs… <span className="kbd">⌘K</span>
            </div>
            <button className="btn ghost">Export CSV</button>
            <button className="btn">Print report</button>
            <button className="btn primary" onClick={() => setSummary(AI_SUMMARY_DEMO)}>
              <span className="glyph" />
              Generate AI summary
            </button>
          </div>
        </div>

        <div className="content">
          {/* Banner */}
          <div className="banner">
            <div className="ico">i</div>
            <div className="body">
              <strong>Handbook synced to v2026.1 on 04 May 2026.</strong> Unit details and learning outcomes match the current
              Monash Handbook entry for FIT2004. <Link to="/mapping">Review LO ↔ PLO mapping ›</Link>
            </div>
            <div className="actions">
              <button className="btn ghost" style={{ height: 28, fontSize: 11.5 }}>
                Dismiss
              </button>
            </div>
          </div>

          {/* Unit banner */}
          <div className="unit-banner">
            <div>
              <h1>
                <span className="code">FIT2004</span>Algorithms and Data Structures
              </h1>
              <div className="sub">
                Faculty of Information Technology &nbsp;·&nbsp; Coordinated by {session.user.full_name} &nbsp;·&nbsp; Last grade
                upload: 11 May 2026, 09:42
              </div>
            </div>
            <div className="sem-switch">
              <span className="arrow">‹</span>
              <span className="v">Semester 1, 2026</span>
              <span className="arrow">›</span>
            </div>
          </div>

          {/* KPI row */}
          <div className="kpi-row">
            <div className="kpi">
              <div className="lbl">Enrolled</div>
              <div className="val">287</div>
              <div className="delta">
                vs S2'25 (264) <span className="up">+8.7%</span>
              </div>
            </div>
            <div className="kpi">
              <div className="lbl">Overall attainment</div>
              <div className="val">
                74<span className="u">%</span>
              </div>
              <div className="delta">weighted mean · 4 LOs</div>
            </div>
            <div className="kpi">
              <div className="lbl">LOs at risk</div>
              <div className="val warn">
                2<span className="u"> / 4</span>
              </div>
              <div className="delta">LO 2, LO 4 below threshold</div>
            </div>
            <div className="kpi">
              <div className="lbl">Students at risk</div>
              <div className="val">41</div>
              <div className="delta">
                failing ≥1 LO &nbsp;<span className="dn">14.3% of cohort</span>
              </div>
            </div>
          </div>

          {/* AI drawer */}
          <div className="ai-drawer">
            <div className="hd">
              <span className="star" />
              <div>
                <h4>AI cohort summary</h4>
                <div className="meta">{summary ? "LAST GENERATED SUMMARY BELOW" : "NEVER GENERATED · UPDATES NIGHTLY ONCE FIRST RUN"}</div>
              </div>
            </div>
            <button className="btn primary" onClick={() => setSummary(AI_SUMMARY_DEMO)}>
              <span className="glyph" />
              Generate summary
            </button>
          </div>
          {summary && (
            <div className="panel" style={{ marginTop: -6 }}>
              <p style={{ margin: 0 }}>{summary}</p>
            </div>
          )}

          {/* Learning outcomes */}
          <div className="panel">
            <div className="panel-head">
              <div>
                <h4>Learning outcomes</h4>
                <div className="h-sub">% of cohort meeting the 50% attainment threshold for each outcome</div>
              </div>
              <div className="seg">
                <span className="on">Pass rate</span>
                <span>Mean score</span>
                <span>Distribution</span>
              </div>
            </div>
            <div className="lo-grid">
              {LOS.map((lo) => (
                <div key={lo.code} className={`lo-card${lo.risk ? " risk" : ""}`}>
                  <div className="lo-h">
                    <span className="lo-code">{lo.code}</span>
                    <span className={`pill ${lo.risk ? "risk" : "ok"}`}>
                      <span className="dot" />
                      {lo.risk ? "At risk" : "On track"}
                    </span>
                  </div>
                  <div className="lo-text">{lo.text}</div>
                  <div className="lo-pct">
                    {lo.pct}
                    <span className="u">%</span>
                  </div>
                  <div className="lo-bar">
                    <div className="fill" style={{ right: `${100 - lo.pct}%` }} />
                  </div>
                  <div className="lo-meta">
                    <span>{lo.passed} / 287 passed</span>
                    <span>μ {lo.mean}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="two-col">
            {/* Distribution */}
            <div className="panel">
              <div className="panel-head">
                <div>
                  <h4>Cohort grade distribution per LO</h4>
                  <div className="h-sub">Stacked share of HD / D / C / P / N for each outcome — 287 students</div>
                </div>
                <div className="seg">
                  <span className="on">Counts</span>
                  <span>%</span>
                </div>
              </div>
              {DIST.map((row) => (
                <div key={row.lo} className="dist-row">
                  <div className="lo-tag">
                    {row.lo}
                    <span className="sub">{row.label}</span>
                  </div>
                  <div className="stacked">
                    {row.bars.map((b) => (
                      <div key={b.cls} className={`seg-bar ${b.cls}`} style={{ width: `${b.w}%` }}>
                        {b.w}
                      </div>
                    ))}
                  </div>
                  <div className={`n ${row.deltaOk === true ? "pass" : row.deltaOk === false ? "fail" : ""}`}>{row.pass}</div>
                  <div className="n">{row.mean}</div>
                  <div className="n">{row.sd}</div>
                  <div className="n" style={{ color: row.deltaOk === false ? "var(--risk)" : row.deltaOk === true ? "var(--ok)" : undefined }}>
                    {row.delta}
                  </div>
                </div>
              ))}
              <div className="legend">
                {[
                  ["#16744D", "HD ≥80"],
                  ["#4FA37E", "D 70–79"],
                  ["#E0A33E", "C 60–69"],
                  ["#C97A5C", "P 50–59"],
                  ["#A8321C", "N <50"],
                ].map(([c, l]) => (
                  <span key={l}>
                    <span className="sw" style={{ background: c }} />
                    {l}
                  </span>
                ))}
                <span style={{ marginLeft: "auto", color: "var(--ink-3)" }}>Δ column compares pass rate vs S2 2025</span>
              </div>
            </div>

            {/* Assessments mini */}
            <div className="panel">
              <div className="panel-head">
                <div>
                  <h4>Assessments &amp; LO coverage</h4>
                  <div className="h-sub">Weights distribute evenly to tagged LOs</div>
                </div>
                <Link to="/assessments" className="btn ghost" style={{ height: 28, fontSize: 11.5 }}>
                  Configure ›
                </Link>
              </div>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Assessment</th>
                    <th className="num">Weight</th>
                    <th>Covers</th>
                    <th className="num">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {DASHBOARD_ASSESSMENTS.map((a) => (
                    <tr key={a.name}>
                      <td className="nm">
                        {a.name}
                        <span className="meta">{a.meta}</span>
                      </td>
                      <td className="num">{a.weight}</td>
                      <td>
                        {a.covers.map((c) => (
                          <span key={c} className="tag navy" style={{ marginRight: 3 }}>
                            {c}
                          </span>
                        ))}
                      </td>
                      <td className="num" style={{ color: a.ok ? "var(--ok)" : "var(--ink-3)", fontWeight: a.ok ? 600 : undefined }}>
                        {a.submitted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 18, borderTop: "1px solid var(--line-2)", paddingTop: 14 }}>
                <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  Overall attainment trend
                </div>
                <div className="trend">
                  {TREND.map((t) => (
                    <div key={t.sem} className={`trend-cell${t.now ? " now" : ""}`}>
                      <div className="sem">{t.sem}</div>
                      <div className="v">
                        {t.v}
                        <span style={{ fontSize: 11, color: "var(--ink-3)" }}>%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
