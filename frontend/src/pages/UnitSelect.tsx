import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import monashLogo from "../assets/monash-logo-big.jpg";
import { clearSession, errorMessage, getMappings, getOfferings, initials, roleLabel, setCurrentOfferingId, type Offering } from "../api";
import { useSession } from "../useSession";
import "./UnitSelect.css";

export default function UnitSelect() {
  const navigate = useNavigate();
  const session = useSession();
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showSignOut, setShowSignOut] = useState(false);

  useEffect(() => {
    if (!session) return;
    getOfferings(session.access_token)
      .then(({ offerings: rows }) => setOfferings(rows))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [session]);

  if (!session) return null;

  const openOffering = async (offering: Offering) => {
    setCurrentOfferingId(offering.offering_id);
    try {
      const mapping = await getMappings(session.access_token, offering.offering_id);
      const mappedUloIds = new Set(mapping.mappings.map((item) => item.offering_ulo_id));
      const needsMapping = mapping.ulos.length === 0 || mapping.ulos.some((ulo) => !mappedUloIds.has(ulo.offering_ulo_id));
      navigate(needsMapping ? "/mapping" : "/dashboard", { state: { offeringId: offering.offering_id } });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

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
          <button className="us-signout" onClick={() => setShowSignOut(true)}>Sign out</button>
        </div>
      </header>

      <main className="us-content">
        <div className="us-intro">
          <div className="us-eye">Select a unit</div>
          <h1>Which unit would you like to work on?</h1>
          <p>Your available unit offerings are loaded from the development database for your signed-in role.</p>
        </div>

        {error && <div className="banner"><div className="ico">!</div><div className="body">{error}</div></div>}
        {loading ? <div className="panel">Loading your unit offerings...</div> : (
          <>
            <div className="us-section-label">Available offerings <span className="us-count">{offerings.length}</span></div>
            {offerings.length === 0 ? (
              <div className="panel">No unit offerings have been assigned to this account yet.</div>
            ) : (
              <div className="us-grid">
                {offerings.map((offering) => <OfferingCard key={offering.offering_id} offering={offering} role={offering.can_edit ? roleLabel(session.user.role_name) : "Read-only access"} onOpen={openOffering} />)}
              </div>
            )}
          </>
        )}
      </main>

      {showSignOut && (
        <div className="us-modal-overlay" onClick={() => setShowSignOut(false)}>
          <div className="us-modal" onClick={(event) => event.stopPropagation()}>
            <div className="us-modal-icon">↪</div>
            <h3>Sign out?</h3>
            <p>You will need to sign in again to access your assigned units.</p>
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

function OfferingCard({ offering, role, onOpen }: { offering: Offering; role: string; onOpen: (offering: Offering) => void }) {
  const handbookStatus = offering.last_scraped_at ? "Handbook record stored" : "Handbook not imported";
  return (
    <button className="unit-card" onClick={() => onOpen(offering)}>
      <div className="unit-card-top">
        <div className="unit-code-badge">{offering.unit_code}</div>
        <span className="role-pill coord">{role}</span>
      </div>
      <h3>{offering.unit_name}</h3>
      <div className="unit-meta">{offering.year} {offering.period} · {offering.program_names.join(" / ")}</div>
      <div className="unit-stats">
        <div className="unit-stat"><span className="unit-stat-val">{offering.period}</span><span className="unit-stat-lbl">Teaching period</span></div>
        <div className="unit-stat"><span className="unit-stat-val">{offering.handbook_url ? "Ready" : "Setup"}</span><span className="unit-stat-lbl">{handbookStatus}</span></div>
      </div>
      <div className="unit-cta">Open unit workspace <span className="unit-arrow">→</span></div>
    </button>
  );
}
