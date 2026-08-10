import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useSession } from "../useSession";
import {
  formatMappingConfirmedAt,
  loadMappingConfirmation,
  saveMappingConfirmation,
  type MappingConfirmation,
} from "../mappingConfirm";
import { HANDBOOK_DIFF, MAPPING_INIT, PLOS, ULO_TEXT, ULOS } from "../mockData";
import "./Mapping.css";

type CellState = "on" | "sug" | "removed" | null;

function RemovedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="2" />
      <line x1="7.5" y1="12" x2="16.5" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Mapping() {
  const [cells, setCells] = useState<Record<string, CellState>>(MAPPING_INIT);
  const [selected, setSelected] = useState("PLO 2,LO 2");
  const [showDiff, setShowDiff] = useState(false);
  const [syncState, setSyncState] = useState<"idle" | "checking" | "synced">("idle");
  const location = useLocation();
  const navigate = useNavigate();
  const session = useSession();

  const fromUnitSelect = (location.state as { from?: string } | null)?.from === "unit-select";
  const unitCode = (location.state as { unitCode?: string } | null)?.unitCode || "FIT2004";
  const unitName = (location.state as { unitName?: string } | null)?.unitName || "Algorithms and Data Structures";
  const pendingCount = Object.values(cells).filter((v) => v === "sug").length;
  const removedCount = Object.values(cells).filter((v) => v === "removed").length;

  const [confirmation, setConfirmation] = useState<MappingConfirmation | null>(() => loadMappingConfirmation(unitCode));
  // Force mapping (no sidebar) only until this unit has been confirmed once.
  const isOnboarding = fromUnitSelect && !confirmation;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setConfirmation(loadMappingConfirmation(unitCode));
  }, [unitCode]);

  if (!session) return null;

  const confirmAndContinue = () => {
    if (pendingCount > 0) return;
    const record = { at: new Date().toISOString(), by: session.user.full_name };
    saveMappingConfirmation(unitCode, record);
    setConfirmation(record);
    navigate("/dashboard");
  };

  const updateToLatestVersion = () => {
    setSyncState("checking");
    setTimeout(() => {
      setSyncState("synced");
      setTimeout(() => setSyncState("idle"), 3200);
    }, 900);
  };

  const toggle = (key: string) => {
    setCells((prev) => {
      const cur = prev[key];
      if (!cur) return { ...prev, [key]: "on" };
      if (cur === "on") return { ...prev, [key]: null };
      if (cur === "sug") return { ...prev, [key]: "on" };
      if (cur === "removed") return { ...prev, [key]: null };
      return prev;
    });
    setSelected(key);
  };

  const acceptAllSuggestions = () => {
    setCells((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (next[key] === "sug") next[key] = "on";
        else if (next[key] === "removed") next[key] = null;
      });
      return next;
    });
  };

  return (
    <div className={`app mapping-app${isOnboarding ? " no-sidebar" : ""}`}>
      {!isOnboarding && <Sidebar user={session.user} />}
      <main className="main">
        <div className="topbar">
          {isOnboarding ? (
            <div className="crumbs">
              <span className="onboard-step">Step 1 of 1</span> Confirm mapping <span className="sep">›</span>{" "}
              <strong>{unitCode}</strong>
            </div>
          ) : (
            <div className="crumbs">
              <Link to="/units">Home</Link>
              <span className="sep">›</span>
              <Link to="/dashboard">{unitCode}</Link>
              <span className="sep">›</span>
              <Link to="/mapping">Mapping</Link>
            </div>
          )}
          <div className="top-actions">
            {isOnboarding ? (
              <span className="onboard-hint">You'll be able to revisit this anytime from the sidebar</span>
            ) : (
              <>
                <button className="btn ghost">Compare semesters</button>
                <button className="btn">Discard changes</button>
                <button className="btn primary">Save mapping</button>
              </>
            )}
          </div>
        </div>

        <div className="content">
          {isOnboarding && (
            <div className="onboard-banner">
              <div className="onboard-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <div className="onboard-body">
                <strong>Before you continue —</strong> confirm {unitCode}'s LO ↔ PLO mapping for Semester 1 2026.
                {pendingCount > 0
                  ? ` ${pendingCount} suggested link${pendingCount > 1 ? "s" : ""} still need${pendingCount > 1 ? "" : "s"} your review below.`
                  : " All links are confirmed — you're ready to continue."}
              </div>
              <button className="btn primary onboard-cta" disabled={pendingCount > 0} onClick={confirmAndContinue}>
                Confirm mapping &amp; continue →
              </button>
            </div>
          )}

          <div className="unit-banner">
            <div>
              <h1 style={{ fontSize: 26 }}>LO ↔ PLO mapping</h1>
              <div className="sub">
                <span className="code">{unitCode}</span> {unitName} &nbsp;·&nbsp; Course: <strong>Bachelor of Information Technology</strong>{" "}
                &nbsp;·&nbsp; 8 PLOs &nbsp;·&nbsp; 4 ULOs
              </div>
              <div className="audit-log">
                {confirmation ? (
                  <>
                    Last confirmed <strong>{formatMappingConfirmedAt(confirmation.at)}</strong> by {confirmation.by}
                  </>
                ) : (
                  "Not yet confirmed for Semester 1 2026"
                )}
              </div>
            </div>
            <div className="unit-banner-right">
              <div className="sync-wrap">
                <button className="btn ghost sync-btn" disabled={syncState === "checking"} onClick={updateToLatestVersion}>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={syncState === "checking" ? "spin" : ""}
                  >
                    <path d="M21 2v6h-6" />
                    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                    <path d="M3 22v-6h6" />
                    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                  </svg>
                  {syncState === "checking" ? "Checking handbook…" : "Update to latest version"}
                </button>
                {syncState === "synced" && (
                  <div className="sync-toast">✓ Up to date with the {unitCode} handbook, Semester 1 2026</div>
                )}
              </div>
            </div>
          </div>

          <div className="banner">
            <div className="ico">i</div>
            <div className="body">
              <strong>Mapping pre-filled from FIT2004 · Semester 2 2025</strong> We've carried over <strong>9 of 11</strong>{" "}
              mappings from the last delivery of this unit. Two LO texts changed — those PLO links are marked <em>suggested</em>{" "}
              for review.
            </div>
            <div className="actions">
              <button className="btn ghost" style={{ height: 28, fontSize: 11.5 }} onClick={() => setShowDiff(true)}>
                View handbook changes
              </button>
              <button
                className="btn primary"
                style={{ height: 28, fontSize: 11.5 }}
                disabled={pendingCount === 0 && removedCount === 0}
                onClick={acceptAllSuggestions}
              >
                Accept all suggestions
              </button>
            </div>
          </div>

          <div className="matrix-wrap">
            <div className="matrix">
              <div className="mx-head">
                <div>
                  <h4>Mapping matrix</h4>
                  <div className="h-sub">
                    Click a cell to tick (confirm) or untick (clear) that PLO↔ULO link. Each ULO must map to at least one PLO.
                  </div>
                </div>
                <div className="mx-legend">
                  <span className="leg-item">
                    <span className="leg-dot confirmed">✓</span> Confirmed
                  </span>
                  <span className="leg-item">
                    <span className="leg-dot suggested">✓</span> Suggested
                  </span>
                  <span className="leg-item">
                    <span className="leg-dot removed">
                      <RemovedIcon />
                    </span>{" "}
                    Removed this sem
                  </span>
                </div>
              </div>

              <table className="mx-table">
                <colgroup>
                  <col className="col-plo" />
                  {ULOS.map((lo) => (
                    <col key={lo} className="col-lo" />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th className="plo-head">
                      <div className="plo-head-title">Course Program Learning Outcomes</div>
                      <div className="plo-head-sub">Bachelor of Information Technology · 8 outcomes</div>
                    </th>
                    {ULOS.map((lo, i) => (
                      <th key={lo} className="lo-head">
                        <span className="lo-badge">{lo}</span>
                        <div className="lo-head-text">{ULO_TEXT[i]}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PLOS.map((plo) => (
                    <tr key={plo.id} className={selected.startsWith(plo.id) ? "active" : ""}>
                      <td className="plo-cell">
                        <div className="plo-cell-head">
                          <span className="plo-badge">{plo.id}</span>
                          <span className="plo-cat">{plo.cat}</span>
                        </div>
                        <div className="plo-t">{plo.text}</div>
                      </td>
                      {ULOS.map((lo) => {
                        const key = `${plo.id},${lo}`;
                        const state = cells[key];
                        return (
                          <td key={lo}>
                            <div className={`cell${selected === key ? " selected" : ""}`} onClick={() => toggle(key)}>
                              {state === "on" && <div className="check">✓</div>}
                              {state === "sug" && <div className="check suggested">✓</div>}
                              {state === "removed" && (
                                <div className="removed-icon">
                                  <RemovedIcon />
                                </div>
                              )}
                              {!state && <div className="empty" />}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="totals-row">
                    <td>Coverage / LO →</td>
                    {ULOS.map((lo) => {
                      const count = PLOS.filter((p) => cells[`${p.id},${lo}`] === "on").length;
                      return (
                        <td key={lo}>
                          <span className="cov-num">{count}</span>
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="save-bar">
            <div className="stat">
              <strong>
                {pendingCount} suggested link{pendingCount === 1 ? "" : "s"}
              </strong>{" "}
              awaiting review
            </div>
            <div className="stat" style={{ color: "var(--ink-3)" }}>
              ·
            </div>
            <div className="stat">
              <strong>{removedCount} removed</strong> this session
            </div>
            <div className="stat" style={{ color: "var(--ink-3)" }}>
              ·
            </div>
            <div className="stat">
              Every ULO has <span style={{ color: "var(--ok)", fontWeight: 600 }}>≥1 PLO link</span>
            </div>
            <div className="actions">
              <button className="btn ghost">Preview as report</button>
              <button className="btn">Save as draft</button>
              <button
                className="btn primary"
                disabled={isOnboarding && pendingCount > 0}
                onClick={isOnboarding ? confirmAndContinue : undefined}
              >
                {isOnboarding ? "Confirm mapping & continue →" : "Publish mapping for S1 2026"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {showDiff && (
        <div className="hb-modal-overlay" onClick={() => setShowDiff(false)}>
          <div className="hb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hb-modal-head">
              <h3>Handbook Changes</h3>
              <p>
                {unitCode} · Semester 2 2025 → Semester 1 2026. These ULO wording changes are why their existing PLO links were
                carried over as <em>suggested</em> instead of auto-confirmed.
              </p>
            </div>
            <div className="hb-diff-list">
              {HANDBOOK_DIFF.map((d) => (
                <div key={d.lo} className="hb-diff-item">
                  <div className="hb-diff-lo">
                    {d.lo} <span className="hb-diff-label">{d.label}</span>
                  </div>
                  <div className="hb-diff-row hb-diff-old">
                    <span className="hb-diff-tag">S2 2025</span>
                    <p>{d.oldText}</p>
                  </div>
                  <div className="hb-diff-row hb-diff-new">
                    <span className="hb-diff-tag">S1 2026</span>
                    <p>{d.newText}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="hb-modal-actions">
              <button className="btn" onClick={() => setShowDiff(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}