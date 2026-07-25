import { useState } from "react";
import { useNavigate } from "react-router-dom";
import monashLogo from "../assets/monash-logo-big.jpg";
import { clearSession, initials } from "../api";
import { useSession } from "../useSession";
import { UNITS, type MockUnit } from "../mockData";
import "./UnitSelect.css";

export default function UnitSelect() {
  const navigate = useNavigate();
  const session = useSession();
  const currentUnits = UNITS.filter((u) => u.current);
  const pastUnits = UNITS.filter((u) => !u.current);
  const [showSignOut, setShowSignOut] = useState(false);

  if (!session) {
    navigate("/login", { replace: true });
    return null;
  }

  const openUnit = (unit: MockUnit) =>
    navigate("/mapping", { state: { from: "unit-select", unitCode: unit.code, unitName: unit.name } });

  const confirmSignOut = () => {
    clearSession();
    navigate("/login");
  };

  return (
    <div className="us-page">
      {/* Header */}
      <header className="us-header">
        <div className="us-header-left">
          <img src={monashLogo} alt="Monash University" className="us-logo" />
          <div className="us-header-divider" />
          <div className="us-app-sub">Faculty of Information Technology</div>
        </div>
        <div className="us-header-right">
          <div className="us-user">
            <div className="us-av">{initials(session.user.full_name)}</div>
            <div>
              <div className="us-user-name">{session.user.full_name}</div>
              <div className="us-user-email">{session.user.email}</div>
            </div>
          </div>
          <button className="us-signout" onClick={() => setShowSignOut(true)}>
            Sign out
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="us-content">
        <div className="us-intro">
          <div className="us-eye">Select a unit</div>
          <h1>Which unit would you like to work on?</h1>
          <p>
            You have teaching responsibilities across <strong>{UNITS.length} units</strong>.
            <br />
            Please select a module below to access its dashboard, LO&nbsp;↔&nbsp;PLO mappings and&nbsp;assessments.
          </p>
        </div>

        <div className="us-section-label">
          Current semester <span className="us-count">{currentUnits.length}</span>
        </div>
        <div className="us-grid">
          {currentUnits.map((u) => (
            <UnitCard key={u.code} unit={u} onOpen={openUnit} />
          ))}
        </div>

        {pastUnits.length > 0 && (
          <>
            <div className="us-section-label" style={{ marginTop: 32 }}>
              Past semesters <span className="us-count">{pastUnits.length}</span>
            </div>
            <div className="us-grid">
              {pastUnits.map((u) => (
                <UnitCard key={u.code} unit={u} onOpen={openUnit} past />
              ))}
            </div>
          </>
        )}
      </main>

      {showSignOut && (
        <div className="us-modal-overlay" onClick={() => setShowSignOut(false)}>
          <div className="us-modal" onClick={(e) => e.stopPropagation()}>
            <div className="us-modal-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <h3>Sign out?</h3>
            <p>You'll need to sign in again with your Monash account to access your units.</p>
            <div className="us-modal-actions">
              <button className="us-modal-btn cancel" onClick={() => setShowSignOut(false)}>
                Cancel
              </button>
              <button className="us-modal-btn confirm" onClick={confirmSignOut}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UnitCard({ unit, onOpen, past }: { unit: MockUnit; onOpen: (unit: MockUnit) => void; past?: boolean }) {
  const risky = unit.risk > 0;
  return (
    <button className={`unit-card${past ? " past" : ""}`} onClick={() => onOpen(unit)}>
      <div className="unit-card-top">
        <div className="unit-code-badge">{unit.code}</div>
        <span className={`role-pill ${unit.role}`}>{unit.roleLabel}</span>
      </div>

      <h3>{unit.name}</h3>
      <div className="unit-meta">
        {unit.sem} &nbsp;·&nbsp; {unit.students} students
      </div>

      <div className="unit-stats">
        <div className="unit-stat">
          <span className="unit-stat-val">
            {unit.attainment}
            <span className="u">%</span>
          </span>
          <span className="unit-stat-lbl">Overall attainment</span>
        </div>
        <div className="unit-stat">
          <span className={`unit-stat-val${risky ? " warn" : ""}`}>{unit.risk}</span>
          <span className="unit-stat-lbl">LOs at risk</span>
        </div>
      </div>

      <div className="unit-cta">
        {past ? "View archived workspace" : "Open unit workspace"} <span className="unit-arrow">→</span>
      </div>
    </button>
  );
}
