import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import monashLogo from "../assets/monash-logo-big.jpg";
import {
  errorMessage,
  getAuthConfig,
  login,
  saveSession,
  startSso,
  type AuthConfig,
} from "../api";
import "./Login.css";

/**
 * Sign-in is delegated to Monash single sign-on: the browser leaves for the
 * identity provider, authenticates there, and returns to /auth/callback with a
 * dashboard session. No Monash password is ever typed into this app.
 *
 * The local password form below is a break-glass path for faculty admins, kept
 * so a provider outage cannot lock everyone out. The backend decides whether it
 * is available at all (LOCAL_LOGIN_ENABLED) and who may use it.
 */
export default function Login() {
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [showLocal, setShowLocal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // A backend that cannot be reached leaves config null; the SSO button still
    // works because it is a plain navigation to a known backend path.
    getAuthConfig().then(setConfig).catch(() => setConfig(null));
  }, []);

  const handleSso = () => {
    setBusy(true);
    startSso(config);
  };

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await login(email.trim(), password);
      saveSession(session, remember);
      navigate(session.user.must_change_password ? "/change-password" : "/units");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const localAvailable = config === null || config.local_login_enabled;

  return (
    <div className="login-bg">
      <main className="login-card">
        <div className="monash-header">
          <img src={monashLogo} alt="Monash University" className="monash-logo" />
        </div>

        <div className="signin">
          <div className="eye">Sign in</div>
          <h2>Welcome back.</h2>
          <p className="deck">
            Use your Monash account to open the Academic Performance Dashboard.
          </p>

          {!showLocal ? (
            <>
              <button type="button" className="primary sso-button" onClick={handleSso} disabled={busy}>
                {busy ? "Redirecting…" : "Sign in with your Monash account"}
              </button>

              <p className="sso-note">
                You will be taken to the Monash sign-in page to enter your credentials and
                complete multi-factor authentication, then returned here automatically.
              </p>

              {config?.auth_mode === "dev" && (
                <p className="demo-hint">
                  Development mode: a stand-in sign-in page is served locally instead of
                  Monash SSO. Set <code>AUTH_MODE=oidc</code> for the real provider.
                </p>
              )}

              {error && (
                <p className="login-error" role="alert">
                  {error}
                </p>
              )}

              {localAvailable && (
                <div className="form-foot">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowLocal(true);
                      setError("");
                    }}
                  >
                    Faculty admin sign-in
                  </a>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="sso-note">
                For faculty admins only, when single sign-on is unavailable.
              </p>

              <form onSubmit={handleLocalLogin}>
                <label className="field">
                  <span className="lbl">Email address</span>
                  <input
                    className="input lg"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    required
                  />
                </label>

                <label className="field">
                  <span className="lbl">Password</span>
                  <input
                    className="input lg"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </label>

                {error && (
                  <p className="login-error" role="alert">
                    {error}
                  </p>
                )}

                <div className="between">
                  <span
                    className="remember-check"
                    onClick={() => setRemember((r) => !r)}
                    style={{ cursor: "pointer" }}
                  >
                    <span className={`remember-box${remember ? " on" : ""}`}>
                      {remember ? "✓" : ""}
                    </span>
                    Keep me signed in
                  </span>
                </div>

                <button type="submit" className="primary" disabled={busy}>
                  {busy ? "Verifying…" : "Sign in"}
                </button>
              </form>

              <div className="form-foot">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowLocal(false);
                    setError("");
                  }}
                >
                  Back to Monash sign-in
                </a>
              </div>
            </>
          )}

          <div className="role-hint">
            <div className="h">Your role is assigned automatically</div>
            Once signed in, your dashboard view is determined by your faculty role.
            <div className="roles">
              <span className="r">Unit Coordinator</span>
              <span className="r">Lecturer</span>
              <span className="r">Management</span>
            </div>
          </div>

          <div className="form-foot">
            Need access? <Link to="/admin">Contact your faculty admin</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
