import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { clearSession, initials } from "../api";
import { useSession } from "../useSession";
import "./Settings.css";

export default function Setting() {
  const session = useSession();
  const navigate = useNavigate();

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [savedPasswordLength, setSavedPasswordLength] = useState(8);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  if (!session) return null;

  const displayInitials = initials(session.user.full_name);
  const maskedPassword = "*".repeat(savedPasswordLength);

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  const startPasswordChange = () => {
    setIsChangingPassword(true);
    setPasswordError("");
    setPasswordSuccess("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const cancelPasswordChange = () => {
    setIsChangingPassword(false);
    setPasswordError("");
    setPasswordSuccess("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const savePasswordChange = () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setPasswordError("Enter and confirm the new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("The password confirmation does not match.");
      return;
    }

    setSavedPasswordLength(newPassword.length);
    setPasswordSuccess("Password updated.");
    setIsChangingPassword(false);
    setNewPassword("");
    setConfirmPassword("");
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
            <Link to="/settings">Settings</Link>
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
                Manage your personal details, profile picture, password, and account session.
              </div>
            </div>
            <div className="settings-chip">Account</div>
          </div>

          <div className="settings-layout">
            <div className="settings-panel">
              <div className="settings-hero">
                <div className="settings-avatar-wrap">
                  <div className="settings-avatar">
                    {avatarPreview ? <img src={avatarPreview} alt="Profile preview" /> : <span>{displayInitials}</span>}
                  </div>

                  <label className="btn ghost" style={{ cursor: "pointer" }}>
                    Upload photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      style={{ display: "none" }}
                    />
                  </label>

                  <div className="settings-avatar-help">
                    Default avatar uses your initials.
                    <br />
                    Uploading a photo is optional.
                  </div>
                </div>

                <div className="settings-hero-copy">
                  <h4>{session.user.full_name}</h4>
                  <p>
                    This page keeps identity fields read-only, while still allowing the user to update their profile image and
                    password.
                  </p>
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
                    <div className="settings-static mono">{maskedPassword}</div>
                  </div>

                  <button className="btn" onClick={startPasswordChange}>
                    Change password
                  </button>
                </div>
              ) : (
                <div className="settings-password-block">
                  <div className="settings-field">
                    <label>New password</label>
                    <input
                      type="password"
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
                      className="settings-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>

                  {passwordError && <div className="settings-error">{passwordError}</div>}

                  <div className="settings-password-actions">
                    <button className="btn ghost" onClick={cancelPasswordChange}>
                      Cancel
                    </button>
                    <button className="btn primary" onClick={savePasswordChange}>
                      Save password
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