import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import monashLogo from "../assets/monash-logo-big.jpg";
import { getMe, saveSession } from "../api";
import "./Login.css";

/**
 * Landing point for the identity provider round-trip.
 *
 * The backend puts the result in the URL fragment rather than the query string:
 * fragments are never sent to a server, so the access token stays out of proxy
 * logs and Referer headers. It is read once, then wiped from the address bar so
 * it cannot be recovered from browser history.
 */
export default function AuthCallback() {
  const [error, setError] = useState("");
  const navigate = useNavigate();
  // React 18 StrictMode mounts effects twice in development, which would consume
  // the fragment on the first pass and report a bogus failure on the second.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    window.history.replaceState(null, "", window.location.pathname);

    const failure = params.get("error");
    if (failure) {
      setError(params.get("error_description") || `Sign-in failed (${failure}).`);
      return;
    }

    const token = params.get("token");
    if (!token) {
      setError("That sign-in link is no longer valid. Please start again.");
      return;
    }

    getMe(token)
      .then(({ user }) => {
        saveSession({ access_token: token, token_type: "bearer", user }, true);
        navigate(params.get("next") === "change-password" ? "/change-password" : "/units", {
          replace: true,
        });
      })
      .catch(() => setError("Signed in, but the dashboard session could not be started."));
  }, [navigate]);

  return (
    <div className="login-bg">
      <main className="login-card">
        <div className="monash-header">
          <img src={monashLogo} alt="Monash University" className="monash-logo" />
        </div>
        <div className="signin">
          {error ? (
            <>
              <div className="eye">Sign in</div>
              <h2>We could not sign you in.</h2>
              <p className="login-error" role="alert">
                {error}
              </p>
              <button type="button" className="primary" onClick={() => navigate("/login", { replace: true })}>
                Back to sign in
              </button>
            </>
          ) : (
            <>
              <div className="eye">Sign in</div>
              <h2>Signing you in…</h2>
              <p className="deck">Confirming your Monash account with the dashboard.</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
