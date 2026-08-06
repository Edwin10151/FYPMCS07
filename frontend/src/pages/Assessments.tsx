import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useSession } from "../useSession";
import { ASSESSMENTS, ULO_SHORT, ULOS, type MockAssessment } from "../mockData";
import "./Assessments.css";

const ROW_COLORS = ["#2D5A9E", "#163E76", "#0B2E5C", "#E0A33E", "#6B4FA0", "#1F7A5C", "#A8321C", "#8A5A2E"];
const LO_CHIP_LABELS = ULOS.map((lo) => lo.replace(/\s+/g, ""));

let nextRowId = 100;

export default function Assessments() {
  const navigate = useNavigate();
  const session = useSession();
  const [syncState, setSyncState] = useState<"idle" | "checking" | "synced">("idle");
  const [assessments, setAssessments] = useState<MockAssessment[]>(() =>
    ASSESSMENTS.map((a) => ({ ...a, outcomes: [...a.outcomes], hurdle: { ...a.hurdle } }))
  );
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [hurdleModal, setHurdleModal] = useState<MockAssessment | null>(null);
  const dragSourceKey = useRef<string | null>(null);

  if (!session) return null;

  const updateToLatestVersion = () => {
    setSyncState("checking");
    setTimeout(() => {
      setSyncState("synced");
      setTimeout(() => setSyncState("idle"), 3200);
    }, 900);
  };

  const addAssessment = () => {
    let n = 1;
    while (assessments.some((a) => a.id === `A${n}`)) n++;
    const newRow: MockAssessment = {
      id: `A${n}`,
      rowKey: `new-${nextRowId++}`,
      category: "Artefact",
      name: "",
      weight: 0,
      outcomes: [],
      hurdle: { type: "None", description: "" },
    };
    setAssessments((prev) => {
      const exIndex = prev.findIndex((a) => a.id === "EX");
      if (exIndex === -1) return [...prev, newRow];
      const copy = [...prev];
      copy.splice(exIndex, 0, newRow);
      return copy;
    });
  };

  const updateAssessment = <K extends keyof MockAssessment>(rowKey: string, field: K, value: MockAssessment[K]) => {
    setAssessments((prev) => prev.map((a) => (a.rowKey === rowKey ? { ...a, [field]: value } : a)));
  };

  const toggleLo = (rowKey: string, outcomeNum: number) => {
    setAssessments((prev) =>
      prev.map((a) => {
        if (a.rowKey !== rowKey) return a;
        const has = a.outcomes.includes(outcomeNum);
        return { ...a, outcomes: has ? a.outcomes.filter((n) => n !== outcomeNum) : [...a.outcomes, outcomeNum] };
      })
    );
  };

  const removeAssessment = (rowKey: string) => {
    setAssessments((prev) => prev.filter((a) => a.rowKey !== rowKey));
  };

  const handleDragStart = (rowKey: string) => {
    dragSourceKey.current = rowKey;
    setDragKey(rowKey);
  };

  const handleDragOver = (e: React.DragEvent, rowKey: string) => {
    e.preventDefault();
    if (rowKey !== dragSourceKey.current) setDragOverKey(rowKey);
  };

  const handleDrop = (targetKey: string) => {
    const sourceKey = dragSourceKey.current;
    if (!sourceKey || sourceKey === targetKey) {
      setDragKey(null);
      setDragOverKey(null);
      return;
    }
    setAssessments((prev) => {
      const from = prev.findIndex((a) => a.rowKey === sourceKey);
      const to = prev.findIndex((a) => a.rowKey === targetKey);
      if (from === -1 || to === -1) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
    dragSourceKey.current = null;
    setDragKey(null);
    setDragOverKey(null);
  };

  const handleDragEnd = () => {
    dragSourceKey.current = null;
    setDragKey(null);
    setDragOverKey(null);
  };

  const totalWeight = assessments.reduce((sum, a) => sum + (Number(a.weight) || 0), 0);

  const perLoBreakdown = useMemo(
    () =>
      ULOS.map((lo, i) => {
        const outcomeNum = i + 1;
        const segs = assessments
          .map((a, idx) => {
            const tagCount = a.outcomes.length;
            if (!a.outcomes.includes(outcomeNum) || !tagCount || !a.weight) return null;
            return {
              key: a.rowKey,
              id: a.id || "?",
              name: a.name || a.id || "Untitled assessment",
              value: a.weight / tagCount,
              color: ROW_COLORS[idx % ROW_COLORS.length],
            };
          })
          .filter((s): s is NonNullable<typeof s> => s !== null);
        const total = segs.reduce((sum, s) => sum + s.value, 0);
        return { lo, label: ULO_SHORT[i], segs, total };
      }),
    [assessments]
  );

  return (
    <div className="app">
      <Sidebar user={session.user} />
      <main className="main">
        <div className="topbar">
          <div className="crumbs">
            Assessments <span className="sep">›</span> <strong>FIT2004</strong> <span className="sep">›</span> Semester 1 2026
          </div>
          <div className="top-actions">
            <button className="btn" onClick={() => navigate("/upload")}>
              Upload grades
            </button>
            <button className="btn">Discard</button>
            <button className="btn primary">Save assessments</button>
          </div>
        </div>

        <div className="content">
          <div className="unit-banner">
            <div>
              <h1 style={{ fontSize: 26 }}>Assessment setup</h1>
              <div className="sub">
                <span className="code">FIT2004</span> Algorithms and Data Structures &nbsp;·&nbsp; Define what's assessed and
                which LOs each assessment covers. Weight distributes evenly across tagged LOs.
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
                {syncState === "synced" && <div className="sync-toast">✓ Weights match the FIT2004 handbook, Semester 1 2026</div>}
              </div>
              <div className="sem-switch">
                <span className="arrow">‹</span>
                <span className="v">Semester 1, 2026</span>
                <span className="arrow">›</span>
              </div>
            </div>
          </div>

          <div className="ass-layout">
            <div className="weight-bar-card">
              <div className="wbar-head">
                <div>
                  <div className="wbar-lbl">Total assessment weight</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>Must sum to exactly 100% before publishing.</div>
                </div>
                <div className="wbar-total" style={{ color: totalWeight === 100 ? "var(--ok)" : "var(--warn)" }}>
                  {totalWeight}
                  <span style={{ fontSize: 14, color: "var(--ink-3)" }}>% / 100%</span>
                </div>
              </div>
              <div className="wbar">
                {assessments.map(
                  (a, i) =>
                    a.weight > 0 && (
                      <div key={a.rowKey} className="seg" style={{ width: `${a.weight}%`, background: ROW_COLORS[i % ROW_COLORS.length] }}>
                        {a.id} · {a.weight}%
                      </div>
                    )
                )}
              </div>
              <div className="wbar-key">
                {assessments.map((a, i) => (
                  <span key={a.rowKey}>
                    <span className="sw" style={{ background: ROW_COLORS[i % ROW_COLORS.length] }} />
                    {a.name || a.id}
                  </span>
                ))}
              </div>
            </div>

            {assessments.map((a) => {
              const rowKey = a.rowKey;
              return (
                <div
                  key={rowKey}
                  className={`ass-row${dragKey === rowKey ? " dragging" : ""}${dragOverKey === rowKey ? " drag-over" : ""}`}
                  onDragOver={(e) => handleDragOver(e, rowKey)}
                  onDrop={() => handleDrop(rowKey)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="grip" draggable onDragStart={() => handleDragStart(rowKey)} title="Drag to reorder">
                    ⋮⋮
                  </div>
                  <div className="ass-name">
                    <div className="h">
                      <input
                        className="num-input"
                        value={a.id}
                        size={Math.max(2, a.id.length)}
                        placeholder="ID"
                        onChange={(e) => updateAssessment(rowKey, "id", e.target.value.toUpperCase())}
                      />
                      <input
                        className="name-input"
                        value={a.name}
                        placeholder="Assessment name"
                        onChange={(e) => updateAssessment(rowKey, "name", e.target.value)}
                      />
                    </div>
                    {a.hurdle?.type && a.hurdle.type !== "None" ? (
                      <button type="button" className="hurdle-tag" onClick={() => setHurdleModal(a)}>
                        <span className="hurdle-dot" /> {a.hurdle.type} hurdle <span className="hurdle-more">— view description</span>
                      </button>
                    ) : (
                      <div className="hurdle-tag none">
                        <span className="hurdle-dot" /> No hurdle
                      </div>
                    )}
                  </div>
                  <div className="weight-cell">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={a.weight}
                      onChange={(e) => updateAssessment(rowKey, "weight", Math.max(0, Math.min(100, Number(e.target.value))))}
                    />
                    <span className="pct">%</span>
                  </div>
                  <div className="lo-chips">
                    {ULOS.map((_, i) => (
                      <span
                        key={i}
                        className={`lo-chip${a.outcomes.includes(i + 1) ? " on" : ""}`}
                        onClick={() => toggleLo(rowKey, i + 1)}
                      >
                        {LO_CHIP_LABELS[i]}
                      </span>
                    ))}
                  </div>
                  <div className="row-tools">
                    <button
                      type="button"
                      className="upload-grades-btn"
                      title="Upload grades CSV for this unit"
                      onClick={() => navigate("/upload")}
                    >
                      Upload grades
                    </button>
                    <div className="ic danger" title="Remove assessment" onClick={() => removeAssessment(rowKey)}>
                      ✕
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="add-row" onClick={addAssessment}>
              ＋ &nbsp; Add an assessment
            </div>

            <div className="per-lo-breakdown">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 14,
                  paddingBottom: 14,
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Computed weight per learning outcome</h4>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>
                    Calculated live from the rows above · each assessment's weight splits evenly across the LOs it's tagged with.
                  </div>
                </div>
                <div className={`pill ${perLoBreakdown.every((r) => r.segs.length > 0) ? "ok" : "risk"}`}>
                  <span className="dot" />
                  {perLoBreakdown.every((r) => r.segs.length > 0) ? "All LOs covered" : "Some LOs uncovered"}
                </div>
              </div>
              <div className="alloc-legend">
                {assessments.map((a, i) => (
                  <span key={a.rowKey}>
                    <span className="sw" style={{ background: ROW_COLORS[i % ROW_COLORS.length] }} />
                    {a.id || "?"}
                    {a.id === "EX" ? " (final exam)" : ""}
                  </span>
                ))}
              </div>
              {perLoBreakdown.map((row) => (
                <div key={row.lo} className="per-lo-row">
                  <div className="lo-l">
                    {row.lo}
                    <span className="sub">{row.label}</span>
                  </div>
                  <div className="alloc-bar">
                    {row.segs.length === 0 ? (
                      <div className="alloc-empty">No assessment currently tags this LO</div>
                    ) : (
                      row.segs.map((s) => (
                        <div
                          key={s.key}
                          className="seg-a"
                          style={{ width: `${(s.value / row.total) * 100}%`, background: s.color }}
                          title={`${s.id} · ${s.name} · ${s.value.toFixed(1)}%`}
                        >
                          {s.id} {s.value.toFixed(1)}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="per-lo-total">{row.total.toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {hurdleModal && (
        <div className="hurdle-modal-overlay" onClick={() => setHurdleModal(null)}>
          <div className="hurdle-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hurdle-modal-head">
              <span className="hurdle-modal-tag">{hurdleModal.hurdle.type} hurdle</span>
              <h3>{hurdleModal.name || hurdleModal.id}</h3>
            </div>
            <div className="hurdle-modal-label">Hurdle description</div>
            <p className="hurdle-modal-desc">{hurdleModal.hurdle.description || "No description provided by the handbook for this hurdle."}</p>
            <div className="hurdle-modal-actions">
              <button className="btn" onClick={() => setHurdleModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
