import { useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useSession } from "../useSession";
import { AI_SUMMARY_DEMO, DASHBOARD_ASSESSMENTS, DIST, LOS, TREND } from "../mockData";
import "./Dashboard.css";
import { getSelectedUnit } from "../api";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function Dashboard() {
  const session = useSession();
  const [summary, setSummary] = useState("");
  const [showBanner, setShowBanner] = useState(true);
  const selectedUnit = getSelectedUnit();
  const unitCode = selectedUnit?.unitCode ?? "FIT2004";

  if (!session) return null;

  const loAttainmentData = [
    {
      lo: "LO 1",
      attainment: 83,
      passed: "238/287 passed",
      status: "On track",
      fill: "#16744D",
    },
    {
      lo: "LO 2",
      attainment: 62,
      passed: "178/287 passed",
      status: "On risk",
      fill: "#A8321C",
    },
    {
      lo: "LO 3",
      attainment: 88,
      passed: "253/287 passed",
      status: "On track",
      fill: "#16744D",
    },
    {
      lo: "LO 4",
      attainment: 58,
      passed: "166/287 passed",
      status: "On risk",
      fill: "#A8321C",
    },
  ];

  return (
    <div className="app">
      <Sidebar user={session.user} />
      <main className="main">
        {/* Topbar */}
        <div className="topbar">
          <div className="crumbs">
            <Link to="/units">Home</Link>
            <span className="sep">›</span>
            <Link to="/dashboard">{unitCode}</Link>
            <span className="sep">›</span>
            <Link to="/dashboard">Dashboard</Link>
          </div>
          <div className="top-actions">
            <button className="btn ghost">Export CSV</button>
            <button className="btn">Print report</button>
            <button className="btn primary" onClick={() => setSummary(AI_SUMMARY_DEMO)}>
              <span className="glyph" />
              Generate AI summary
            </button>
          </div>
        </div>

        <div className="content">
          {showBanner && (
            <div className="banner">
              <div className="ico">i</div>
              <div className="body">
                <strong>Handbook synced to v2026.1 on 04 May 2026.</strong> Unit details and learning outcomes match the current
                Monash Handbook entry for FIT2004. <Link to="/mapping">Review LO ↔ PLO mapping ›</Link>
              </div>
              <div className="actions">
                <button className="btn ghost" style={{ height: 28, fontSize: 11.5 }} onClick={() => setShowBanner(false)}>
                  Dismiss
                </button>
              </div>
            </div>
          )}

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
                <h4>LO attainment</h4>
                <div className="h-sub">
                  Attainment by learning outcome. Bars below the 70% threshold are highlighted in red.
                </div>
              </div>
            </div>

            <div style={{ width: "100%", height: 300, marginTop: 10 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={loAttainmentData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }} barSize={54}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <XAxis
                    dataKey="lo"
                    tick={{ fill: "var(--ink-2)", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}
                    axisLine={{ stroke: "var(--line)" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fill: "var(--ink-3)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ReferenceLine
                    y={70}
                    stroke="#C97A5C"
                    strokeDasharray="4 4"
                    label={{ value: "Threshold 70%", position: "insideTopRight", fill: "#C97A5C", fontSize: 11 }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(0, 75, 117, 0.05)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload;

                      return (
                        <div
                          style={{
                            background: "#fff",
                            border: "1px solid var(--line)",
                            borderRadius: 10,
                            padding: "12px 14px",
                            boxShadow: "0 8px 22px rgba(0, 27, 43, 0.12)",
                            minWidth: 170,
                          }}
                        >
                          <div
                            style={{
                              fontFamily: "JetBrains Mono, monospace",
                              fontSize: 11,
                              color: "var(--ink-3)",
                              marginBottom: 6,
                            }}
                          >
                            {item.lo}
                          </div>
                          <div style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", lineHeight: 1.1 }}>
                            {item.attainment}%
                          </div>
                          <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 8 }}>{item.passed}</div>
                          <div
                            style={{
                              fontSize: 11.5,
                              fontWeight: 600,
                              marginTop: 6,
                              color: item.attainment < 70 ? "var(--risk)" : "var(--ok)",
                            }}
                          >
                            {item.status}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="attainment" radius={[8, 8, 0, 0]}>
                    {loAttainmentData.map((entry) => (
                      <Cell key={entry.lo} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

            {/* Distribution */}
 
            {/* Assessments mini */}

        </div>
      </main>
    </div>
  );
}
