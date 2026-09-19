import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  errorMessage,
  getAssessments,
  getOfferings,
  saveAssessments,
  type AssessmentInput,
  type Offering,
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
  }));
}

function splitEvenly(weight: number, count: number): number[] {
  if (count <= 0) return [];
  const share = Math.round((weight / count) * 100) / 100;
  const shares = new Array(count).fill(share);
  shares[count - 1] = Math.round((shares[count - 1] + (weight - share * count)) * 100) / 100;
  return shares;
}

export default function Assessments() {
  const navigate = useNavigate();
  const session = useSession();
  const { offeringId, error: offeringError } = useOfferingId();
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState("[]");
  const [allUlos, setAllUlos] = useState<string[]>([]);
  const [removingKeys, setRemovingKeys] = useState<Set<string>>(new Set());
  const [offering, setOffering] = useState<Offering | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingHref, setPendingHref] = useState<string | null>(null);
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
      setRows(nextRows);
      setSavedSnapshot(JSON.stringify(nextRows));
      setAllUlos(assessmentResponse.all_ulos);
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

  const dirty = useMemo(() => JSON.stringify(rows) !== savedSnapshot, [rows, savedSnapshot]);
  const totalWeight = useMemo(() => rows.reduce((sum, row) => sum + (Number.isFinite(row.weight) ? row.weight : 0), 0), [rows]);
  const invalidReason = useMemo(() => {
    if (rows.some((row) => !row.assessment_name.trim())) return "Every assessment needs a name.";
    const names = rows.map((row) => row.assessment_name.trim().toLowerCase());
    if (new Set(names).size !== names.length) return "Assessment names must be unique.";
    return "";
  }, [rows]);

  // Warn on hard reload/tab close while there are unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Intercept in-app link navigation (sidebar, breadcrumbs, ...) while there are unsaved edits.
  useEffect(() => {
    if (!dirty) return;
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
  }, [dirty]);

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

  const save = async (): Promise<boolean> => {
    if (!offeringId || !session || invalidReason) return false;
    setSaving(true);
    setError("");
    try {
      const payload: AssessmentInput[] = rows.map((row) => ({
        assessment_id: row.assessment_id,
        assessment_name: row.assessment_name.trim(),
        weight: row.weight,
        ulo_codes: row.covers,
      }));
      await saveAssessments(session.access_token, offeringId, payload);
      setNotice("Assessment setup saved to the database.");
      await load();
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const discardAndNavigate = () => {
    const href = pendingHref;
    setRows(JSON.parse(savedSnapshot) as EditableRow[]);
    setPendingHref(null);
    if (href) navigate(href);
  };

  const saveAndNavigate = async () => {
    const href = pendingHref;
    const ok = await save();
    setPendingHref(null);
    if (ok && href) navigate(href);
  };

  return (
    <div className="app">
      <Sidebar user={session.user} />
      <main className="main">
        <div className="topbar">
          <div className="crumbs"><Link to="/units">Home</Link><span className="sep">›</span><Link to="/dashboard">{offering?.unit_code ?? "Unit"}</Link><span className="sep">›</span><Link to="/assessments">Assessments</Link></div>
          <div className="top-actions">
            {canEdit && rows.length > 0 && <button className="btn primary" disabled={!dirty || saving || !!invalidReason} onClick={() => void save()}>{saving ? "Saving..." : "Save changes"}</button>}
          </div>
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
                    ? <input className="name-input" value={row.assessment_name} placeholder="Assessment name" onChange={(event) => updateRow(row.key, { assessment_name: event.target.value })} />
                    : <strong>{row.assessment_name}</strong>}
                </div>
                <div className={`hurdle-tag ${row.is_hurdle ? "" : "none"}`}><span className="hurdle-dot" />{row.is_hurdle ? "Hurdle assessment" : "No hurdle"}</div>
              </div>
              <div className="weight-cell">
                {canEdit
                  ? <input type="number" min={0} max={100} step={0.5} value={row.weight} onChange={(event) => updateRow(row.key, { weight: Math.min(100, Math.max(0, Number(event.target.value) || 0)) })} />
                  : <strong>{row.weight}</strong>}
                <span className="pct">%</span>
              </div>
              <div className="lo-chips">{allUlos.length ? allUlos.map((code) => <button key={code} type="button" className={`lo-chip${row.covers.includes(code) ? " on" : ""}`} disabled={!canEdit} onClick={() => toggleUlo(row.key, code)} aria-pressed={row.covers.includes(code)}>{code.replace(/^ULO/i, "")}</button>) : <span className="h-sub">No ULOs set up for this offering</span>}</div>
              <div className="row-tools">{canEdit && <button type="button" className="ic danger" title="Delete this assessment" aria-label={`Delete ${row.assessment_name || "assessment"}`} onClick={() => removeRow(row.key)}>×</button>}</div>
            </div>)}
            {canEdit && <div className="add-row" role="button" tabIndex={0} onClick={addRow} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") addRow(); }}>+ Add assessment row</div>}
            {canEdit && <div className="save-bar">
              <div className="stat">{invalidReason ? <><strong>{invalidReason}</strong></> : dirty ? <><strong>Unsaved changes.</strong> Save to write this setup to the database.</> : <><strong>Up to date.</strong> No unsaved changes.</>}</div>
              <div className="actions"><button className="btn primary" disabled={!dirty || saving || !!invalidReason} onClick={() => void save()}>{saving ? "Saving..." : "Save changes"}</button></div>
            </div>}
            <div className="per-lo-breakdown">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid var(--line)" }}>
                <div><h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Assessment coverage</h4><div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>The Handbook can omit assessment-to-ULO links. Those links remain visible as missing until a coordinator supplies the approved mapping.</div></div>
                <div className={`pill ${allUlos.length > 0 ? "ok" : "warn"}`}><span className="dot" />{allUlos.length} ULOs covered</div>
              </div>
              {allUlos.map((ulo) => {
                const coveredBy = rows.filter((row) => row.covers.includes(ulo));
                return <div key={ulo} className="per-lo-row">
                  <div className="lo-l">{ulo}<span className="sub">{coveredBy.map((row) => row.assessment_name || "Untitled assessment").join(", ") || "Not covered"}</span></div>
                  <div className="alloc-bar">{coveredBy.length === 0
                    ? <div className="alloc-empty">No assessment currently links this ULO</div>
                    : coveredBy.map((row, index) => <div key={row.key} className="seg-a" style={{ width: `${100 / coveredBy.length}%`, background: ROW_COLORS[index % ROW_COLORS.length] }}>{row.assessment_name || "Untitled"}</div>)}</div>
                  <div className="per-lo-total">{coveredBy.reduce((sum, row) => sum + (splitEvenly(row.weight, row.covers.length)[row.covers.indexOf(ulo)] ?? 0), 0).toFixed(1)}%</div>
                </div>;
              })}
            </div>
          </div>}
        </div>
      </main>

      {pendingHref && <div className="confirm-modal-overlay" onClick={() => setPendingHref(null)}>
        <div className="confirm-modal" onClick={(event) => event.stopPropagation()}>
          <span className="confirm-modal-tag">Unsaved changes</span>
          <h3>Save before you leave?</h3>
          <p>You have unsaved edits to the assessment setup for {offering?.unit_code ?? "this offering"}. Save them to the database, or discard them and continue.</p>
          <div className="confirm-modal-actions">
            <button className="btn" onClick={() => setPendingHref(null)}>Cancel</button>
            <button className="btn danger" onClick={discardAndNavigate}>Discard changes</button>
            <button className="btn primary" disabled={saving || !!invalidReason} onClick={() => void saveAndNavigate()}>{saving ? "Saving..." : "Save and continue"}</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
