import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { clearSession, completePasswordReset, errorMessage } from "../api";
import monashLogo from "../assets/monash-logo-big.jpg";
import "./Login.css";

export default function ResetPassword() {
  const [token, setToken] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const readLink = () => {
      const incoming = new URLSearchParams(window.location.hash.slice(1)).get("token");
      if (incoming) {
        setToken(incoming); setPassword(""); setConfirmation(""); setError(""); setDone(false);
      }
      // Keep the reset secret out of browser history and subsequent copied URLs.
      window.history.replaceState(window.history.state, "", window.location.pathname);
    };
    readLink();
    window.addEventListener("hashchange", readLink);
    return () => window.removeEventListener("hashchange", readLink);
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password !== confirmation) { setError("New passwords do not match."); return; }
    setBusy(true);
    try {
      await completePasswordReset(token, password);
      clearSession();
      setPassword(""); setConfirmation(""); setDone(true);
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };

  return <div className="login-bg"><main className="login-card password-recovery-card">
    <div className="monash-header"><img src={monashLogo} alt="Monash University" className="monash-logo" /></div>
    <div className="signin">
      <div className="eye">Account security</div>
      <h2>{done ? "Password changed." : "Reset your password."}</h2>
      {done ? <p className="deck" role="status">Your previous sessions have been signed out. Sign in with your new password.</p>
        : !token ? <p className="login-error" role="alert">This link is missing its reset token. Contact your administrator for a new link.</p>
        : <><p className="deck">Choose a new password with at least 12 characters.</p>
          <form onSubmit={submit}>
            <label className="field"><span className="lbl">New password</span><input className="input lg" type="password" autoComplete="new-password" minLength={12} maxLength={1024} value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus disabled={busy} /></label>
            <label className="field"><span className="lbl">Confirm new password</span><input className="input lg" type="password" autoComplete="new-password" minLength={12} maxLength={1024} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required disabled={busy} /></label>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button type="submit" className="primary" disabled={busy}>{busy ? "Saving..." : "Save new password"}</button>
          </form></>}
      <div className="form-foot"><Link to="/login">Back to sign in</Link></div>
    </div>
  </main></div>;
}
