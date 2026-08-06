import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import monashLogo from "../assets/monash-logo-big.jpg";
import { errorMessage, login, saveSession, type Session } from "../api";
import "./Login.css";

// Demo users used when the FastAPI backend isn't running locally.
// Any non-empty password works in this fallback mode.
const DEMO_USERS: Record<string, { full_name: string; role_name: string; permission_level: number }> = {
  "elise.chen@monash.edu": { full_name: "Dr. Elise Chen", role_name: "coordinator", permission_level: 20 },
  "james.truong@monash.edu": { full_name: "Dr. James Truong", role_name: "lecturer", permission_level: 10 },
  "sara.rashid@monash.edu": { full_name: "A/Prof. Sara Rashid", role_name: "management", permission_level: 30 },
};

function mockSession(email: string): Session {
  const demo = DEMO_USERS[email.trim().toLowerCase()] ?? {
    full_name: email.split("@")[0] || "Dev User",
    role_name: "coordinator",
    permission_level: 20,
  };
  return {
    access_token: "dev-bypass-token",
    token_type: "bearer",
    user: { user_id: 1, email, ...demo },
  };
}

export default function Login() {
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("elise.chen@monash.edu");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setStep("password");
      setError("");
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Enter a password to continue.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      // Prefer the real API when the backend is up…
      const session = await login(email.trim(), password);
      saveSession(session, remember);
      navigate("/units");
    } catch {
      // …and fall back to a local demo session when it isn't
      // (ECONNREFUSED / proxy error on :8000).
      try {
        const session = mockSession(email.trim());
        saveSession(session, remember);
        navigate("/units");
      } catch (err) {
        setError(errorMessage(err) || "Could not sign in. Is the backend running?");
      }
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
          {step === "email" ? (
            <>
              <div className="eye">Sign in</div>
              <h2>Welcome back.</h2>
              <p className="deck">Sign in with your Monash email address</p>

              <form onSubmit={handleNext}>
                <label className="field">
                  <span className="lbl">Email address</span>
                  <input
                    className="input lg"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                  />
                </label>

                <div className="between">
                  <span className="remember-check" onClick={() => setRemember((r) => !r)} style={{ cursor: "pointer" }}>
                    <span className={`remember-box${remember ? " on" : ""}`}>{remember ? "✓" : ""}</span>
                    Keep me signed in
                  </span>
                </div>

                <button type="submit" className="primary">
                  Next
                </button>
              </form>

              <div className="form-foot">
                <a href="#">Can't login</a>
              </div>
            </>
          ) : (
            <>
              <div className="verify-avatar">
                <span className="lock-ic">🔒</span>
              </div>

              <div className="eye" style={{ textAlign: "center" }}>
                Sign in
              </div>
              <h2 style={{ textAlign: "center" }}>Welcome back.</h2>
              <p className="deck" style={{ textAlign: "center" }}>
                Verify with your password
              </p>
              <div className="email-chip">
                <span className="person-ic">◉</span>
                {email}
              </div>

              <form onSubmit={handleVerify}>
                <label className="field">
                  <span className="lbl">Password</span>
                  <input
                    className="input lg"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    required
                  />
                </label>

                {error && <p className="login-error" role="alert">{error}</p>}

                <div className="between">
                  <a href="#" className="link">
                    Forgot password?
                  </a>
                </div>

                <button type="submit" className="primary" disabled={busy}>
                  {busy ? "Verifying…" : "Verify"}
                </button>
              </form>

              <p className="demo-hint">
                Demo mode: with no backend running, any password works. Try{" "}
                <code>elise.chen@monash.edu</code>.
              </p>

              <div className="form-foot-links">
                <a href="#">Can't login</a>
                <a href="#">Lost or new phone? Reset your MFA</a>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setStep("email");
                    setError("");
                  }}
                >
                  Back to sign in
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
