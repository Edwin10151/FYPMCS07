import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useSession } from "../useSession";
import { ASSESSMENTS, ULOS, UPLOAD_STATUS, type MockAssessment } from "../mockData";
import "./GradeUploadSelect.css";

const LO_CHIP_LABELS = ULOS.map((lo) => lo.replace(/\s+/g, ""));

export default function GradeUploadSelect() {
  const navigate = useNavigate();
  const session = useSession();

  if (!session) return null;

  const openUpload = (assessment: MockAssessment) => {
    navigate(`/upload/${assessment.id}`, {
      state: { assessmentId: assessment.id, assessmentName: assessment.name },
    });
  };

  const totalWeight = ASSESSMENTS.reduce((sum, a) => sum + (Number(a.weight) || 0), 0);

  return (
    <div className="app">
      <Sidebar user={session.user} />
      <main className="main">
        <div className="topbar">
          <div className="crumbs">
            Grade upload <span className="sep">›</span> <strong>FIT2004</strong> <span className="sep">›</span> Choose assessment
          </div>
        </div>

        <div className="content">
          <div className="gu-hero">
            <div className="gu-hero-text">
              <h1>Upload grades</h1>
              <p>
                <span className="code">FIT2004</span> Algorithms and Data Structures
              </p>
              <p className="gu-hero-note">
                Select the assessment you want to upload grades for. This list is drawn from the Monash handbook scrape, so it
                always matches your Assessments setup.
              </p>
            </div>
            <div className="gu-hero-meta">
              <div className="gu-hero-stat">
                <span className="gu-hero-num">{ASSESSMENTS.length}</span>
                <span className="gu-hero-lbl">Assessments</span>
              </div>
              <div className="gu-hero-divider" />
              <div className="gu-hero-stat">
                <span className="gu-hero-num">{totalWeight}%</span>
                <span className="gu-hero-lbl">Total weight</span>
              </div>
            </div>
          </div>

          <div className="gu-grid">
            {ASSESSMENTS.map((a) => {
              const status = UPLOAD_STATUS[a.id] || { state: "none", label: "Not uploaded", detail: "No grades submitted yet" };
              const hasHurdle = a.hurdle?.type && a.hurdle.type !== "None";
              return (
                <button key={a.rowKey} type="button" className="gu-card" onClick={() => openUpload(a)}>
                  <span className="gu-accent" />
                  <div className="gu-card-top">
                    <div className="gu-id-block">
                      <span className="gu-id">{a.id}</span>
                      <span className="gu-cat">{a.category}</span>
                    </div>
                    <div className="gu-weight-badge">
                      <span className="gu-weight-num">{a.weight}</span>
                      <span className="gu-weight-pct">%</span>
                    </div>
                  </div>

                  <div className="gu-name">{a.name}</div>

                  <div className="gu-tags">
                    <span className={`gu-status gu-status-${status.state}`}>
                      <span className="gu-status-dot" />
                      {status.label}
                    </span>
                    {hasHurdle && <span className="gu-hurdle">{a.hurdle.type} hurdle</span>}
                  </div>

                  <div className="gu-lo-row">
                    <span className="gu-lo-lbl">Learning outcomes</span>
                    <div className="gu-los">
                      {ULOS.map((_, i) => (
                        <span key={i} className={`gu-lo${a.outcomes.includes(i + 1) ? " on" : ""}`}>
                          {LO_CHIP_LABELS[i]}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="gu-card-foot">
                    <span className="gu-status-detail">{status.detail}</span>
                    <span className="gu-cta">
                      Upload grades
                      <span className="gu-arrow">→</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
