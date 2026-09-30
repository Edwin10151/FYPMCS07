import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { changePassword, clearSession, errorMessage, initials } from "../api";
import { useSession } from "../useSession";
import "./Settings.css";

export default function Setting() {
  const session = useSession();
  const navigate = useNavigate();

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  if (!session) return null;

  const displayInitials = initials(session.user.full_name);
  const startPasswordChange = () => {
    setIsChangingPassword(true);
    setPasswordError("");
    setPasswordSuccess("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const cancelPasswordChange = () => {
    setIsChangingPassword(false);
    setPasswordError("");
    setPasswordSuccess("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const savePasswordChange = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Enter your current password and confirm the new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("The password confirmation does not match.");
      return;
    }

    if (newPassword.length < 12) {
      setPasswordError("New password must be at least 12 characters.");
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(session.access_token, currentPassword, newPassword);
      setPasswordSuccess("Password updated.");
      setIsChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(errorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };

  return (
    <div className="app">
      <Sidebar user={session.user} />
      <main className="main">
        <div className="topbar">
          <div className="crumbs">
            <Link to="/units">Home</Link>
            <span className="sep">›</span>
            <strong>Settings</strong>
          </div>
          <div className="top-actions">
            <div className="settings-top-note">Profile &amp; security</div>
          </div>
        </div>

        <div className="content">
          <div className="unit-banner">
            <div>
              <h1 style={{ fontSize: 26 }}>Settings</h1>
              <div className="sub">
                Review your account details, change your password, and manage your session.
              </div>
            </div>
            <div className="settings-chip">Account</div>
          </div>

          <div className="settings-layout">
            <div className="settings-panel">
              <div className="settings-hero">
                <div className="settings-avatar-wrap">
                  <div className="settings-avatar">
                    <span>{displayInitials}</span>
                  </div>
                </div>

                <div className="settings-hero-copy">
                  <h4>{session.user.full_name}</h4>
                </div>
              </div>

              <div className="settings-section-title">Profile details</div>
              <div className="settings-stack">
                <div className="settings-field">
                  <label>Full name</label>
                  <div className="settings-static">{session.user.full_name}</div>
                  <div className="settings-readonly-note">This value is read-only for the signed-in user.</div>
                </div>

                <div className="settings-field">
                  <label>Email</label>
                  <div className="settings-static">{session.user.email}</div>
                  <div className="settings-readonly-note">This shows the same email used during login.</div>
                </div>
              </div>
            </div>

            <div className="settings-panel">
              <div className="settings-section-title">Security</div>

              {!isChangingPassword ? (
                <div className="settings-row">
                  <div className="settings-field">
                    <label>Password</label>
                    <div className="settings-static mono">************</div>
                  </div>

                  <button className="btn" onClick={startPasswordChange}>
                    Change password
                  </button>
                </div>
              ) : (
                <div className="settings-password-block">
                  <div className="settings-field">
                    <label>Current password</label>
                    <input
                      type="password"
                      autoComplete="current-password"
                      className="settings-input"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div className="settings-field">
                    <label>New password</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      className="settings-input"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>

                  <div className="settings-field">
                    <label>Confirm password</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      className="settings-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>

                  {passwordError && <div className="settings-error">{passwordError}</div>}

                  <div className="settings-password-actions">
                    <button className="btn ghost" disabled={savingPassword} onClick={cancelPasswordChange}>
                      Cancel
                    </button>
                    <button className="btn primary" disabled={savingPassword} onClick={() => void savePasswordChange()}>
                      {savingPassword ? "Saving..." : "Save password"}
                    </button>
                  </div>
                </div>
              )}

              {!isChangingPassword && passwordSuccess && <div className="settings-success">{passwordSuccess}</div>}
            </div>

            <div className="settings-panel">
              <div className="settings-section-title">Session</div>
              <div className="settings-logout">
                <button className="btn primary" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
