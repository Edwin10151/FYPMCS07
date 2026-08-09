import { useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useSession } from "../useSession";
import { AI_SUMMARY_DEMO, DASHBOARD_ASSESSMENTS, DIST, LOS, TREND } from "../mockData";
import "./Dashboard.css";
import { getSelectedUnit } from "../api";

export default function Dashboard() {
  const session = useSession();
  const [summary, setSummary] = useState("");
  const [showBanner, setShowBanner] = useState(true);
  const selectedUnit = getSelectedUnit();
  const unitCode = selectedUnit?.unitCode ?? "FIT2004";

  if (!session) return null;

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
            <div className="sem-switch">
              <span className="arrow">‹</span>
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
          

            {/* Distribution */}
 
            {/* Assessments mini */}

        </div>
      </main>
    </div>
  );
}
