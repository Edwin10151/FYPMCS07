import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  errorMessage,
  getAssessments,
  getOfferings,
  saveAssessments,
  saveAssessmentUloWeights,
  type AssessmentInput,
  type AssessmentUloWeightInput,
  type Offering,
  type OfferingUlo,
} from "../api";
import Sidebar from "../components/Sidebar";
import { useOfferingId } from "../useOfferingId";
import { useSession } from "../useSession";
import "./Assessments.css";

const ROW_COLORS = ["#2D5A9E", "#163E76", "#0B2E5C", "#E0A33E", "#6B4FA0", "#1F7A5C", "#A8321C", "#8A5A2E"];

type EditableRow = {
  key: string;
  assessment_id: number | null;
  assessment_name: string;
  weight: number;
  is_hurdle: boolean;
  covers: string[];
  allocated_weights: number[];
};

let newRowSeq = 0;

function toRows(assessments: Awaited<ReturnType<typeof getAssessments>>["assessments"]): EditableRow[] {
  return assessments.map((assessment) => ({
    key: String(assessment.assessment_id),
    assessment_id: assessment.assessment_id,
    assessment_name: assessment.assessment_name,
    weight: Number(assessment.weight),
    is_hurdle: assessment.is_hurdle,
    covers: assessment.covers,
    allocated_weights: assessment.allocated_weights.map(Number),
  }));
}

function contributionsFromRows(rows: EditableRow[]): Record<string, number> {
  const next: Record<string, number> = {};
  rows.forEach((row) => {
    if (row.assessment_id === null) return;
    row.covers.forEach((code, index) => {
      next[`${row.assessment_id}::${code}`] = row.allocated_weights[index] ?? 0;
    });
  });
  return next;
}

function stableStringify(map: Record<string, number>): string {
  return JSON.stringify(Object.keys(map).sort().map((key) => [key, map[key]]));
}

function capitalizeFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function blurOnWheel(event: React.WheelEvent<HTMLInputElement>) {
  event.currentTarget.blur();
}

function buildWeightsPayload(savedRows: EditableRow[], allUlos: OfferingUlo[], contributions: Record<string, number>): AssessmentUloWeightInput[] {
  const weights: AssessmentUloWeightInput[] = [];
  savedRows.forEach((row) => {
    if (row.assessment_id === null) return;
    row.covers.forEach((code, index) => {
      const uloMeta = allUlos.find((item) => item.ulo_code === code);
      if (!uloMeta) return;
      const key = `${row.assessment_id}::${code}`;
      const fallback = row.allocated_weights[index] ?? Math.round((100 / row.covers.length) * 100) / 100;
      weights.push({ assessment_id: row.assessment_id as number, offering_ulo_id: uloMeta.offering_ulo_id, allocated_weight: contributions[key] ?? fallback });
    });
  });
  return weights;
}

export default function Assessments() {
  const navigate = useNavigate();
  const session = useSession();
  const { offeringId, error: offeringError } = useOfferingId();
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [savedRows, setSavedRows] = useState<EditableRow[]>([]);
  const [allUlos, setAllUlos] = useState<OfferingUlo[]>([]);
  const [contributions, setContributions] = useState<Record<string, number>>({});
  const [savedContributions, setSavedContributions] = useState<Record<string, number>>({});
  const [removingKeys, setRemovingKeys] = useState<Set<string>>(new Set());
  const [offering, setOffering] = useState<Offering | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSetup, setSavingSetup] = useState(false);
  const [savingCoverage, setSavingCoverage] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [editingUlo, setEditingUlo] = useState<string | null>(null);
  const [modalDraft, setModalDraft] = useState<Record<number, number>>({});
  const canEdit = offering?.can_edit ?? false;

  const load = async () => {
    if (!session || !offeringId) return;
    setLoading(true);
    try {
      const [assessmentResponse, offeringResponse] = await Promise.all([
        getAssessments(session.access_token, offeringId),
        getOfferings(session.access_token),
      ]);
      const nextRows = toRows(assessmentResponse.assessments);
      const nextContributions = contributionsFromRows(nextRows);
      setRows(nextRows);
      setSavedRows(nextRows);
      setAllUlos(assessmentResponse.all_ulos);
      setContributions(nextContributions);
      setSavedContributions(nextContributions);
      setOffering(offeringResponse.offerings.find((item) => item.offering_id === offeringId) ?? null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // The workspace reloads only when the selected offering changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offeringId, session]);

  const rowsDirty = useMemo(() => JSON.stringify(rows) !== JSON.stringify(savedRows), [rows, savedRows]);
  const contributionsDirty = useMemo(() => stableStringify(contributions) !== stableStringify(savedContributions), [contributions, savedContributions]);
  const anyDirty = rowsDirty || contributionsDirty;
  const totalWeight = useMemo(() => rows.reduce((sum, row) => sum + (Number.isFinite(row.weight) ? row.weight : 0), 0), [rows]);
  const invalidReason = useMemo(() => {
    if (rows.some((row) => !row.assessment_name.trim())) return "Every assessment needs a name.";
    const names = rows.map((row) => row.assessment_name.trim().toLowerCase());
    if (new Set(names).size !== names.length) return "Assessment names must be unique.";
    return "";
  }, [rows]);

  // Warn on hard reload/tab close while there are unsaved edits.
  useEffect(() => {
    if (!anyDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [anyDirty]);

  // Intercept in-app link navigation (sidebar, breadcrumbs, ...) while there are unsaved edits.
  useEffect(() => {
    if (!anyDirty) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#") || anchor.target === "_blank") return;
      if (href === window.location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(href);
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [anyDirty]);

  if (!session) return null;

  const updateRow = (key: string, patch: Partial<EditableRow>) => {
    setRows((previous) => previous.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    setNotice("");
  };

  const toggleUlo = (key: string, code: string) => {
    if (!canEdit) return;
    setRows((previous) => previous.map((row) => (row.key === key
      ? { ...row, covers: row.covers.includes(code) ? row.covers.filter((item) => item !== code) : [...row.covers, code] }
      : row)));
    setNotice("");
  };

  const addRow = () => {
    newRowSeq += 1;
    setRows((previous) => [...previous, {
      key: `new-${newRowSeq}`,
      assessment_id: null,
      assessment_name: "",
      weight: 0,
      is_hurdle: false,
      covers: [],
      allocated_weights: [],
    }]);
    setNotice("");
  };

  const removeRow = (key: string) => {
    setRemovingKeys((previous) => new Set(previous).add(key));
    setNotice("");
    window.setTimeout(() => {
      setRows((previous) => previous.filter((row) => row.key !== key));
      setRemovingKeys((previous) => {
        const next = new Set(previous);
        next.delete(key);
        return next;
      });
    }, 220);
  };

  const persistRows = async (): Promise<boolean> => {
    if (!offeringId || !session || invalidReason) return false;
    setSavingSetup(true);
    setError("");
    try {
      const payload: AssessmentInput[] = rows.map((row) => ({
        assessment_id: row.assessment_id,
        assessment_name: row.assessment_name.trim(),
        weight: row.weight,
        ulo_codes: row.covers,
      }));
      await saveAssessments(session.access_token, offeringId, payload);
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setSavingSetup(false);
    }
  };

  const persistCoverage = async (): Promise<boolean> => {
    if (!offeringId || !session) return false;
    setSavingCoverage(true);
    setError("");
    try {
      const weights = buildWeightsPayload(savedRows, allUlos, contributions);
      await saveAssessmentUloWeights(session.access_token, offeringId, weights);
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setSavingCoverage(false);
    }
  };

  const save = async (): Promise<boolean> => {
    const ok = await persistRows();
    if (ok) {
      setNotice("Assessment setup saved to the database.");
      await load();
    }
    return ok;
  };

  const saveCoverage = async (): Promise<boolean> => {
    const ok = await persistCoverage();
    if (ok) {
      setNotice("Assessment coverage saved to the database.");
      await load();
    }
    return ok;
  };

  const discardAndNavigate = () => {
    const href = pendingHref;
    setRows(savedRows);
    setContributions(savedContributions);
    setPendingHref(null);
    if (href) navigate(href);
  };

  const saveAndNavigate = async () => {
    const href = pendingHref;
    let ok = true;
    if (rowsDirty) ok = await persistRows();
    if (ok && contributionsDirty) ok = (await persistCoverage()) && ok;
    if (ok) {
      setNotice("Changes saved to the database.");
      await load();
    }
    setPendingHref(null);
    if (ok && href) navigate(href);
  };

  const openUloEditor = (uloCode: string) => {
    const draft: Record<number, number> = {};
    savedRows.forEach((row) => {
      if (row.assessment_id === null || !row.covers.includes(uloCode)) return;
      const index = row.covers.indexOf(uloCode);
      const fallback = row.allocated_weights[index] ?? Math.round((100 / row.covers.length) * 100) / 100;
      draft[row.assessment_id] = contributions[`${row.assessment_id}::${uloCode}`] ?? fallback;
    });
    setModalDraft(draft);
    setEditingUlo(uloCode);
  };

  const commitUloEditor = () => {
    if (!editingUlo) return;
    setContributions((previous) => {
      const next = { ...previous };
      Object.entries(modalDraft).forEach(([assessmentId, pct]) => {
        next[`${assessmentId}::${editingUlo}`] = pct;
      });
      return next;
    });
    setEditingUlo(null);
    setNotice("");
  };

  const colorForKey = (key: string) => {
    const index = savedRows.findIndex((row) => row.key === key);
    return ROW_COLORS[(index < 0 ? 0 : index) % ROW_COLORS.length];
  };

  const editingSources = editingUlo ? savedRows.filter((row) => row.assessment_id !== null && row.covers.includes(editingUlo)) : [];
  const modalTotal = editingSources.reduce((sum, row) => sum + (modalDraft[row.assessment_id as number] ?? 0), 0);
  const modalOk = Math.abs(modalTotal - 100) < 0.01;

  return (
    <div className="app">
      <Sidebar user={session.user} />
      <main className="main">
        <div className="topbar">
          <div className="crumbs"><Link to="/units">Home</Link><span className="sep">›</span><Link to="/dashboard">{offering?.unit_code ?? "Unit"}</Link><span className="sep">›</span><Link to="/assessments">Assessments</Link></div>
          <div className="top-actions" />
        </div>
        <div className="content">
          <div className="unit-banner"><div><h1 style={{ fontSize: 26 }}>Assessment setup</h1><div className="sub"><span className="code">{offering?.unit_code ?? "..."}</span> {offering?.unit_name ?? "Loading offering..."} · {canEdit ? "Edit assessment weights, LO coverage, and save to the database" : "Confirmed assessment configuration from the database"}</div></div></div>
          {(error || offeringError) && <div className="banner"><div className="ico">!</div><div className="body">{error || offeringError}</div></div>}
          {notice && <div className="banner ok"><div className="ico">i</div><div className="body">{notice}</div></div>}
          {loading ? <div className="panel">Loading assessment data...</div> : rows.length === 0 ? (
            <div className="panel">
              <h4>No assessments confirmed yet</h4>
              <p>Import a Handbook draft, review it, and confirm it before setting up grade uploads{canEdit ? ", or add the first assessment manually below." : "."}</p>
              <div style={{ display: "flex", gap: 10 }}>
                {offering?.can_edit && <Link className="btn primary" to="/mapping">Import Handbook draft</Link>}
                {canEdit && <button type="button" className="btn ghost" onClick={addRow}>+ Add assessment manually</button>}
              </div>
            </div>
          ) : <div className="ass-layout">
            {canEdit && <div className="save-bar top-save-bar">
              <div className="stat">{invalidReason ? <strong>{invalidReason}</strong> : rowsDirty ? <><strong>Unsaved changes.</strong> Save to write this setup to the database.</> : <><strong>Up to date.</strong> No unsaved changes.</>}</div>
              <div className="actions"><button className="btn primary" disabled={!rowsDirty || savingSetup || !!invalidReason} onClick={() => void save()}>{savingSetup ? "Saving..." : "Save changes"}</button></div>
            </div>}
            <div className="weight-bar-card">
              <div className="wbar-head">
                <div><div className="wbar-lbl">Total assessment weight</div><div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{canEdit ? "Adjust each row's percentage below — this total updates live." : "Stored assessment weights for this selected offering."}</div></div>
                <div className="wbar-total" style={{ color: Math.abs(totalWeight - 100) < 0.01 ? "var(--ok)" : "var(--warn)" }}>{totalWeight.toFixed(2)}<span style={{ fontSize: 14, color: "var(--ink-3)" }}>% / 100%</span></div>
              </div>
              <div className="wbar">{rows.map((row, index) => <div key={row.key} className="seg" style={{ width: `${removingKeys.has(row.key) ? 0 : row.weight}%`, opacity: removingKeys.has(row.key) ? 0 : 1, background: ROW_COLORS[index % ROW_COLORS.length] }}>{row.weight > 0 ? `${row.weight}%` : ""}</div>)}</div>
              <div className="wbar-key">{rows.map((row, index) => <span key={row.key}><span className="sw" style={{ background: ROW_COLORS[index % ROW_COLORS.length] }} />{row.assessment_name || "Untitled assessment"}</span>)}</div>
            </div>
            {rows.map((row, index) => <div key={row.key} className={`ass-row${removingKeys.has(row.key) ? " removing" : ""}`}>
              <div className="grip" aria-hidden="true">{index + 1}</div>
              <div className="ass-name">
                <div className="h">
                  {canEdit
                    ? <input className="name-input" value={row.assessment_name} placeholder="Assessment name" onChange={(event) => updateRow(row.key, { assessment_name: capitalizeFirst(event.target.value) })} />
                    : <strong>{row.assessment_name}</strong>}
                </div>
                <div className={`hurdle-tag ${row.is_hurdle ? "" : "none"}`}><span className="hurdle-dot" />{row.is_hurdle ? "Hurdle assessment" : "No hurdle"}</div>
              </div>
              <div className="weight-cell">
                {canEdit
                  ? <input type="number" min={0} max={100} step={0.5} value={row.weight} onWheel={blurOnWheel} onChange={(event) => updateRow(row.key, { weight: Math.min(100, Math.max(0, Number(event.target.value) || 0)) })} />
                  : <strong>{row.weight}</strong>}
                <span className="pct">%</span>
              </div>
              <div className="lo-chips">{allUlos.length ? allUlos.map((ulo) => <button key={ulo.ulo_code} type="button" className={`lo-chip${row.covers.includes(ulo.ulo_code) ? " on" : ""}`} disabled={!canEdit} onClick={() => toggleUlo(row.key, ulo.ulo_code)} aria-pressed={row.covers.includes(ulo.ulo_code)}>{ulo.ulo_code}</button>) : <span className="h-sub">No ULOs set up for this offering</span>}</div>
              <div className="row-tools">{canEdit && <button type="button" className="ic danger" title="Delete this assessment" aria-label={`Delete ${row.assessment_name || "assessment"}`} onClick={() => removeRow(row.key)}>×</button>}</div>
            </div>)}
            {canEdit && <div className="add-row" role="button" tabIndex={0} onClick={addRow} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") addRow(); }}>+ Add assessment row</div>}
            <div className="per-lo-breakdown">
              <div className="per-lo-head">
                <div><h4>Assessment coverage</h4><div className="h-sub">Each assessment's contribution to a ULO is independent. A ULO is fully covered once its assessments' contributions add up to 100%.</div></div>
                <div className="per-lo-head-actions">
                  <div className={`pill ${allUlos.length > 0 ? "ok" : "warn"}`}><span className="dot" />{allUlos.length} ULOs covered</div>
                  {canEdit && <button className="btn primary" disabled={!contributionsDirty || savingCoverage} onClick={() => void saveCoverage()}>{savingCoverage ? "Saving..." : "Save changes"}</button>}
                </div>
              </div>
              {allUlos.map((ulo) => {
                const coveredBy = savedRows.filter((row) => row.assessment_id !== null && row.covers.includes(ulo.ulo_code));
                const total = coveredBy.reduce((sum, row) => sum + (contributions[`${row.assessment_id}::${ulo.ulo_code}`] ?? (100 / row.covers.length)), 0);
                const ok = coveredBy.length > 0 && Math.abs(total - 100) < 0.01;
                return <div key={ulo.ulo_code} className="per-lo-row">
                  <div className="lo-l">
                    <span className={`lo-status${coveredBy.length === 0 ? " none" : ok ? " ok" : " error"}`} title={coveredBy.length === 0 ? "Not covered" : ok ? "Fully covered (100%)" : `Total is ${total.toFixed(1)}%, not 100%`}>{coveredBy.length === 0 ? "–" : ok ? "✓" : "!"}</span>
                    <div><div className="lo-code">{ulo.ulo_code}</div><span className="sub">{coveredBy.map((row) => row.assessment_name).join(", ") || "Not covered"}</span></div>
                  </div>
                  <div className="alloc-bar">{coveredBy.length === 0
                    ? <div className="alloc-empty">No assessment currently links this ULO</div>
                    : coveredBy.map((row) => <div key={row.key} className="seg-a" style={{ width: `${100 / coveredBy.length}%`, background: colorForKey(row.key) }}>{row.assessment_name}</div>)}</div>
                  <div className="per-lo-actions"><button type="button" className="btn ghost" disabled={coveredBy.length === 0} onClick={() => openUloEditor(ulo.ulo_code)}>Edit</button></div>
                </div>;
              })}
            </div>
          </div>}
        </div>
      </main>

      {editingUlo && <div className="confirm-modal-overlay" onClick={() => setEditingUlo(null)}>
        <div className="lo-map-modal" onClick={(event) => event.stopPropagation()}>
          <span className="confirm-modal-tag">Edit LO coverage</span>
          <h3>{editingUlo} contribution mapping</h3>
          <p className="lo-map-intro">Set how much of each assessment's mark counts toward {editingUlo}. Percentages are independent per assessment — the total below should reach 100% for {editingUlo} to be fully covered.</p>
          {editingSources.length === 0 ? <p className="lo-map-intro">No assessment currently covers {editingUlo}.</p> : <>
            <div className="lo-map-canvas">
              <div className="lo-map-sources">
                {editingSources.map((row) => <div className="lo-map-row" key={row.key}>
                  <div className="lo-map-node source">{row.assessment_name}</div>
                  <div className="lo-map-wire" />
                  <input type="number" className="lo-map-pct" min={0} max={100} step={0.5} onWheel={blurOnWheel}
                    value={modalDraft[row.assessment_id as number] ?? 0}
                    onChange={(event) => { const value = Math.min(100, Math.max(0, Number(event.target.value) || 0)); setModalDraft((previous) => ({ ...previous, [row.assessment_id as number]: value })); }} />
                  <span className="pct-sign">%</span>
                  <div className="lo-map-wire-out" />
                </div>)}
              </div>
              <div className="lo-map-sink-wrap"><div className="lo-map-node sink">{editingUlo}</div></div>
            </div>
            <div className="lo-map-total">Total contribution to {editingUlo}: <strong style={{ color: modalOk ? "var(--ok)" : "var(--warn)" }}>{modalTotal.toFixed(1)}%</strong></div>
          </>}
          <div className="confirm-modal-actions">
            <button className="btn" onClick={() => setEditingUlo(null)}>Cancel</button>
            <button className="btn primary" onClick={commitUloEditor}>Done</button>
          </div>
        </div>
      </div>}

      {pendingHref && <div className="confirm-modal-overlay" onClick={() => setPendingHref(null)}>
        <div className="confirm-modal" onClick={(event) => event.stopPropagation()}>
          <span className="confirm-modal-tag">Unsaved changes</span>
          <h3>Save before you leave?</h3>
          <p>You have unsaved edits to the assessment setup for {offering?.unit_code ?? "this offering"}. Save them to the database, or discard them and continue.</p>
          <div className="confirm-modal-actions">
            <button className="btn" onClick={() => setPendingHref(null)}>Cancel</button>
            <button className="btn danger" onClick={discardAndNavigate}>Discard changes</button>
            <button className="btn primary" disabled={savingSetup || savingCoverage || !!invalidReason} onClick={() => void saveAndNavigate()}>{savingSetup || savingCoverage ? "Saving..." : "Save and continue"}</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
