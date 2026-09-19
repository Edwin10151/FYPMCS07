import { useState } from "react";
import { useNavigate } from "react-router-dom";
import monashLogo from "../assets/monash-logo-big.jpg";
import { clearSession, initials, roleLabel } from "../api";
import { useSession } from "../useSession";
import "./UnitSelect.css";
import "./AdminMain.css";

// Landing hub for the Admin Portal — top bar only, same chrome as UnitSelect,
// since it's a picker screen rather than a workspace. Its own pages (Semester
// Setup, Tutor List, Student List) use AdminSidebar instead.
export default function AdminMain() {
  const navigate = useNavigate();
  const session = useSession();
  const [showSignOut, setShowSignOut] = useState(false);

  if (!session) return null;

  const confirmSignOut = () => {
    clearSession();
    navigate("/login");
  };

  return (
    <div className="us-page">
      <header className="us-header">
        <div className="us-header-left">
          <img src={monashLogo} alt="Monash University" className="us-logo" />
          <div className="us-header-divider" />
          <div className="us-app-sub">Faculty of Information Technology · Admin Portal</div>
        </div>
        <div className="us-header-right">
          <div className="us-user">
            <div className="us-av">{initials(session.user.full_name)}</div>
            <div>
              <div className="us-user-name">{session.user.full_name}</div>
              <div className="us-user-email">{session.user.email}</div>
            </div>
          </div>
          <button className="us-signout" onClick={() => setShowSignOut(true)}>Sign out</button>
        </div>
      </header>

      <main className="us-content">
        <div className="us-intro">
          <div className="us-eye">Admin Portal</div>
          <h1>What would you like to manage?</h1>
          <p>You have <strong>{roleLabel(session.user.role_name)}</strong> access. Unit workspaces are read-only from here — use the sections below to run this semester's setup.</p>
        </div>

        <div className="us-section-label">Admin sections</div>
        <div className="admin-portal-grid">
          <button className="admin-portal-tile" onClick={() => navigate("/admin/setup")}>
            <div className="admin-portal-tile-icon">◧</div>
            <h3>Semester Setup</h3>
            <p>View the current semester, deactivate it to archive and roll over to the next one, and reach the Tutor List and Student List uploads.</p>
            <div className="admin-portal-tile-cta">Open Semester Setup <span className="unit-arrow">→</span></div>
          </button>
        </div>

        <div className="admin-portal-note">
          People & roles and Settings have moved out of this flow for now. Their pages still exist and aren't lost — they're just not part of the Admin Portal yet.
        </div>
      </main>

      {showSignOut && (
        <div className="us-modal-overlay" onClick={() => setShowSignOut(false)}>
          <div className="us-modal" onClick={(event) => event.stopPropagation()}>
            <div className="us-modal-icon">↪</div>
            <h3>Sign out?</h3>
            <p>You will need to sign in again to access the Admin Portal.</p>
            <div className="us-modal-actions">
              <button className="us-modal-btn cancel" onClick={() => setShowSignOut(false)}>Cancel</button>
              <button className="us-modal-btn confirm" onClick={confirmSignOut}>Sign out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
