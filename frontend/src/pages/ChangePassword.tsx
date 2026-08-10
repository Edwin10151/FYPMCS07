import { useState } from "react";
import { useNavigate } from "react-router-dom";
import monashLogo from "../assets/monash-logo-big.jpg";
import { changePassword, clearSession, errorMessage, loadSession, saveSession } from "../api";
import "./Login.css";

export default function ChangePassword() {
  const session = loadSession();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!session) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await changePassword(session.access_token, currentPassword, newPassword);
      const remember = localStorage.getItem("mcs07.session") !== null;
      clearSession();
      saveSession({ ...session, user: { ...session.user, must_change_password: false } }, remember);
      navigate("/units");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-bg">
      <main className="login-card">
        <div className="monash-header">
          <img src={monashLogo} alt="Monash University" className="monash-logo" />
        </div>
        <div className="signin">
          <div className="eye">Account security</div>
          <h2>Set your password.</h2>
          <p className="deck">Use the temporary password once, then choose a new password with at least 12 characters.</p>
          <form onSubmit={submit}>
            <label className="field">
              <span className="lbl">Temporary password</span>
              <input className="input lg" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoFocus />
            </label>
            <label className="field">
              <span className="lbl">New password</span>
              <input className="input lg" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={12} required />
            </label>
            <label className="field">
              <span className="lbl">Confirm new password</span>
              <input className="input lg" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={12} required />
            </label>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button type="submit" className="primary" disabled={busy}>{busy ? "Saving..." : "Save password"}</button>
          </form>
        </div>
      </main>
    </div>
  );
}
