import { useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { getSelectedUnit } from "../api";
import { useSession } from "../useSession";
import "./Report.css";

export default function Report() {
  const session = useSession();
  const selectedUnit = getSelectedUnit();
  const unitCode = selectedUnit?.unitCode ?? "FIT2004";
  const unitName = selectedUnit?.unitName ?? "Algorithms and Data Structures";

  const [reportText, setReportText] = useState("");
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);

  if (!session) return null;

  const wordCount = reportText.trim() ? reportText.trim().split(/\s+/).length : 0;

  const handleConfirm = () => {
    const timestamp = new Date().toLocaleString("en-MY", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    setConfirmedAt(timestamp);
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
            <Link to="/reports">Reports</Link>
          </div>
          <div className="top-actions">
            <div className="report-top-note">Editable placeholder</div>
          </div>
        </div>

        <div className="content">
          <div className="unit-banner">
            <div>
              <h1 style={{ fontSize: 26 }}>Report workspace</h1>
              <div className="sub">
                <span className="code">{unitCode}</span> {unitName} &nbsp;·&nbsp; Coordinator:{" "}
                <strong>{session.user.full_name}</strong> &nbsp;·&nbsp; Placeholder for the future AI-generated report.
              </div>
            </div>
            <div className="report-banner-chip">Draft mode</div>
          </div>

          <div className="report-layout">
            <div className="report-helper">
              <div className="report-helper-ic">i</div>
              <div className="report-helper-body">
                <strong>Local LLM integration can be added here later.</strong> For now, this page provides a clean editable space
                for reviewing, refining, and confirming the final report text.
              </div>
            </div>

            <div className="report-panel">
              <div className="report-panel-head">
                <div>
                  <h4>Report Draft</h4>
                  <div className="h-sub">
                    AI generated report might not be perfect. Please review and edit the content before confirming. <br />
                    Once confirmed, the report will be locked for further edits.
                  </div>
                </div>
                <button className="btn primary" onClick={handleConfirm}>
                  Confirm
                </button>
              </div>

              <div className="report-status">
                <span className="report-pill">{wordCount} words</span>
                <span className="report-status-text">
                  {confirmedAt ? `Last confirmed on ${confirmedAt}` : "Not yet confirmed"}
                </span>
              </div>

              <textarea
                className="report-textarea"
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="The generated report will appear here. You can edit the content freely before clicking Confirm."
              />

              <div className="report-foot">
                <span>Editable by the current signed-in user</span>
                <span>{reportText.length} characters</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}