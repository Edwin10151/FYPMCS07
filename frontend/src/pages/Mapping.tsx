import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import {
  confirmHandbookImport,
  createHandbookImport,
  errorMessage,
  getLatestHandbookImport,
  getMappings,
  getOfferings,
  saveMappings,
  type HandbookDraft,
  type MappingPayload,
  type Offering,
} from "../api";
import { useOfferingId } from "../useOfferingId";
import { useSession } from "../useSession";
import "./Mapping.css";

type CellState = "on" | null;

export default function Mapping() {
  const navigate = useNavigate();
  const session = useSession();
  const { offeringId, error: offeringError } = useOfferingId();
  const [mapping, setMapping] = useState<MappingPayload | null>(null);
  const [offering, setOffering] = useState<Offering | null>(null);
  const [cells, setCells] = useState<Record<string, CellState>>({});
  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState<HandbookDraft | null>(null);
  const [showDraft, setShowDraft] = useState(false);
  const [applicationMode, setApplicationMode] = useState<"full" | "ulos_only">("full");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canEdit = offering?.can_edit ?? false;

  const loadWorkspace = async () => {
    if (!session || !offeringId) return;
    setLoading(true);
    try {
      const [mappingResponse, offeringsResponse] = await Promise.all([
        getMappings(session.access_token, offeringId),
        getOfferings(session.access_token),
      ]);
      setMapping(mappingResponse);
      const selectedOffering = offeringsResponse.offerings.find((item) => item.offering_id === offeringId) ?? null;
      setOffering(selectedOffering);
      setCells(Object.fromEntries(mappingResponse.mappings.map((item) => [`${item.plo_id},${item.offering_ulo_id}`, "on"])));
      if (selectedOffering?.can_edit) {
        const latest = await getLatestHandbookImport(session.access_token, offeringId);
        setDraft(latest.import?.status === "draft" ? latest.import : null);
        if (latest.import?.status === "draft") setApplicationMode(latest.import.review.assessment_blockers.length ? "ulos_only" : "full");
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
    // The workspace reloads only when the selected offering changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offeringId, session]);

  const uncoveredUlos = useMemo(
    () => mapping?.ulos.filter((ulo) => mapping.programs.filter((program) => program.plo_count > 0).some((program) => !mapping.plos.some((plo) => plo.program_code === program.program_code && cells[`${plo.plo_id},${ulo.offering_ulo_id}`] === "on"))) ?? [],
    [cells, mapping],
  );

  if (!session) return null;

  const toggle = (key: string) => {
    if (!canEdit) return;
    setCells((previous) => ({ ...previous, [key]: previous[key] === "on" ? null : "on" }));
    setSelected(key);
    setNotice("");
  };

  const save = async () => {
    if (!offeringId || !mapping || uncoveredUlos.length > 0) return;
    setSaving(true);
    setError("");
    try {
      const pairs = mapping.plos.flatMap((plo) => mapping.ulos
        .filter((ulo) => cells[`${plo.plo_id},${ulo.offering_ulo_id}`] === "on")
        .map((ulo) => ({ offering_ulo_id: ulo.offering_ulo_id, plo_id: plo.plo_id })));
      await saveMappings(session.access_token, offeringId, pairs);
      setNotice("Mapping saved to the database.");
      await loadWorkspace();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const importHandbook = async () => {
    if (!offeringId) return;
    setImporting(true);
    setError("");
    try {
      const response = await createHandbookImport(session.access_token, offeringId);
      setDraft(response.import);
      setApplicationMode(response.import.review.assessment_blockers.length ? "ulos_only" : "full");
      setShowDraft(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setImporting(false);
    }
  };

  const reviewDraft = async () => {
    if (!offeringId) return;
    setImporting(true);
    setError("");
    try {
      const latest = await getLatestHandbookImport(session.access_token, offeringId);
      setDraft(latest.import?.status === "draft" ? latest.import : null);
      if (latest.import?.status === "draft") {
        setApplicationMode(latest.import.review.assessment_blockers.length ? "ulos_only" : "full");
        setShowDraft(true);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setImporting(false);
    }
  };

  const confirmDraft = async () => {
    if (!offeringId || !draft) return;
    setImporting(true);
    setError("");
    try {
      await confirmHandbookImport(session.access_token, offeringId, draft.handbook_import_id, draft.review.revision, applicationMode);
      setShowDraft(false);
      setDraft(null);
      setNotice(applicationMode === "ulos_only" ? "Handbook ULOs imported. Existing assessments, grades and PLO links were preserved. Review the mapping next." : "Handbook draft confirmed. Review and save the ULO to PLO mapping next.");
      await loadWorkspace();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setImporting(false);
    }
  };

  const unitLabel = offering ? `${offering.unit_code} ${offering.unit_name}` : "Selected offering";
  const hasUlos = (mapping?.ulos.length ?? 0) > 0;
  const hasSetupData = hasUlos && (mapping?.plos.length ?? 0) > 0;
  const blockers = draft ? [...draft.review.ulo_blockers, ...(applicationMode === "full" ? draft.review.assessment_blockers : [])] : [];

  return (
    <div className="app mapping-app">
      <Sidebar user={session.user} />
      <main className="main">
        <div className="topbar">
          <div className="crumbs"><Link to="/units">Home</Link><span className="sep">›</span><Link to="/dashboard">{offering?.unit_code ?? "Unit"}</Link><span className="sep">›</span><strong>Mapping</strong></div>
          <div className="top-actions">
            <button className="btn ghost" onClick={() => navigate("/assessments")}>View assessments</button>
            {canEdit && <button className="btn primary" disabled={!hasSetupData || uncoveredUlos.length > 0 || saving} onClick={() => void save()}>{saving ? "Saving..." : "Save mapping"}</button>}
          </div>
        </div>

        <div className="content">
          <div className="unit-banner">
            <div>
              <h1 style={{ fontSize: 26 }}>ULO to PLO mapping</h1>
              <div className="sub"><span className="code">{offering?.unit_code ?? "..."}</span> {offering?.unit_name ?? "Loading offering..."} · {offering ? `${offering.year} ${offering.period}` : ""}</div>
            </div>
            {canEdit && <button className="btn ghost sync-btn" disabled={importing || !offeringId} onClick={() => void importHandbook()}>{importing ? "Fetching Handbook..." : "Import Handbook draft"}</button>}
          </div>

          {(error || offeringError) && <div className="banner"><div className="ico">!</div><div className="body">{error || offeringError}</div></div>}
          {notice && <div className="banner"><div className="ico">i</div><div className="body">{notice}</div></div>}
          {draft && !showDraft && <div className="banner"><div className="ico">i</div><div className="body">A Handbook draft is ready for review.</div><div className="actions"><button className="btn primary" disabled={importing} onClick={() => void reviewDraft()}>Review draft</button></div></div>}

          {mapping && <div className="panel programme-context">
            <h4>Programmes linked to this offering</h4>
            {mapping.programs.length ? mapping.programs.map((program) => <p key={program.program_id}><strong>{program.program_code}</strong> · {program.program_code === "DEV-BIT" ? "Development demo PLOs — not approved course outcomes" : program.plo_count ? `${program.plo_count} PLOs available` : "PLO definitions pending — supply the approved list before mapping this programme"}</p>) : <p>No programme is linked. Assign one in Unit Offerings or commit the Tutor List first.</p>}
            {!mapping.handbook_confirmed && <p>No Handbook import has been confirmed for this offering. The current setup may contain demo or manual records.</p>}
            {hasUlos && !mapping.plos.length && <p>Handbook ULOs are available below. PLO mapping becomes available once a linked programme has PLO definitions.</p>}
          </div>}
          {loading ? <div className="panel">Loading mapping data...</div> : !mapping || !hasUlos ? (
            <div className="panel">
              <h4>Set up this offering</h4>
              <p>{canEdit ? "Import the selected Malaysia semester from the public Handbook, review the draft, then confirm it before mapping ULOs to the PLOs of the linked programmes." : "This offering has not been set up by its coordinator yet."}</p>
              {canEdit && <button className="btn primary" disabled={importing} onClick={() => void importHandbook()}>{importing ? "Fetching Handbook..." : "Import Handbook draft"}</button>}
            </div>
          ) : (
            <div className="matrix-wrap"><div className="matrix">
              <div className="mx-head"><div><h4>Mapping matrix</h4><div className="h-sub">{canEdit ? "Select the PLO links for each ULO, then save the reviewed mapping." : "You have read-only access to this reviewed mapping."}</div></div></div>
              <table className="mx-table"><colgroup><col className="col-plo" />{mapping.ulos.map((ulo) => <col key={ulo.offering_ulo_id} className="col-lo" />)}</colgroup>
                <thead><tr><th className="plo-head"><div className="plo-head-title">Program learning outcomes</div></th>{mapping.ulos.map((ulo) => <th key={ulo.offering_ulo_id} className="lo-head"><span className="lo-badge">{ulo.ulo_code}</span><div className="lo-head-text">{ulo.description}</div></th>)}</tr></thead>
                <tbody>{mapping.plos.map((plo) => <tr key={plo.plo_id} className={selected.startsWith(`${plo.plo_id},`) ? "active" : ""}><td className="plo-cell"><div className="plo-cell-head"><span className="plo-badge">{plo.plo_code}</span><span className="h-sub">{plo.program_code}</span></div><details className="plo-description"><summary>PLO definition</summary><p>{plo.description}</p></details></td>{mapping.ulos.map((ulo) => { const key = `${plo.plo_id},${ulo.offering_ulo_id}`; return <td key={ulo.offering_ulo_id}><button type="button" className={`cell${selected === key ? " selected" : ""}`} disabled={!canEdit} onClick={() => toggle(key)} aria-label={`Toggle ${plo.plo_code} for ${ulo.ulo_code}`}>{cells[key] === "on" && <span className="check">✓</span>}</button></td>; })}</tr>)}</tbody>
                <tfoot><tr className="totals-row"><td>Links per ULO</td>{mapping.ulos.map((ulo) => <td key={ulo.offering_ulo_id}><span className="cov-num">{mapping.plos.filter((plo) => cells[`${plo.plo_id},${ulo.offering_ulo_id}`] === "on").length}</span></td>)}</tr></tfoot>
              </table>
            </div></div>
          )}

          {hasSetupData && <div className="save-bar"><div className="stat">{uncoveredUlos.length === 0 ? <><strong>Every ULO has a PLO link for each configured programme.</strong> Ready to save.</> : <><strong>{uncoveredUlos.length} ULO{uncoveredUlos.length === 1 ? "" : "s"}</strong> still need programme PLO links.</>}</div>{canEdit && <div className="actions"><button className="btn primary" disabled={uncoveredUlos.length > 0 || saving} onClick={() => void save()}>{saving ? "Saving..." : "Save mapping"}</button></div>}</div>}
        </div>
      </main>

      {showDraft && draft && <div className="hb-modal-overlay" onClick={() => !importing && setShowDraft(false)}><div className="hb-modal" role="dialog" aria-modal="true" aria-label="Review Handbook draft" onClick={(event) => event.stopPropagation()}>
        <div className="hb-modal-head"><h3>Review Handbook draft</h3><p>{unitLabel} · {draft.payload.offering_scope ? `${draft.payload.offering_scope.location} ${draft.payload.offering_scope.period}` : "Selected offering"}</p></div>
        {error && <div className="banner" role="alert"><div className="ico">!</div><div className="body">{error}</div></div>}
        <div className="hb-diff-list">
          <fieldset className="hb-options"><legend>Choose what to import</legend>
            <label><input type="radio" name="handbook-mode" checked={applicationMode === "full"} disabled={importing} onChange={() => setApplicationMode("full")} /> ULOs and assessments</label>
            <label><input type="radio" name="handbook-mode" checked={applicationMode === "ulos_only"} disabled={importing} onChange={() => setApplicationMode("ulos_only")} /> ULOs only — preserve existing assessments and grades</label>
          </fieldset>
          <div className="hb-diff-item"><div className="hb-diff-lo">Changes to existing records</div>
            {draft.review.ulos.map((row) => <p key={row.code}><strong>{row.code}</strong> · {row.status}{row.previous_code && row.previous_code !== row.code ? ` (reuses ${row.previous_code}; existing links preserved)` : ""}{row.previous_description && row.previous_description !== row.description && <span className="hb-previous">Previously: {row.previous_description}</span>}</p>)}
            {draft.review.retained_ulos.length > 0 && <p>Existing ULOs retained: {draft.review.retained_ulos.join(", ")}. Review their continued applicability.</p>}
            {applicationMode === "full" ? <>
              {draft.review.assessments.map((row) => <p key={row.name}><strong>{row.name}</strong> · {row.status}{row.previous_weight ? ` · ${row.previous_weight}% → ${row.weight}%` : ""}</p>)}
              {!!draft.review.removed_assessments.length && <p>Handbook assessments proposed for removal: {draft.review.removed_assessments.join(", ")}</p>}
              {!!draft.review.retained_assessments.length && <p>Manual assessments retained: {draft.review.retained_assessments.join(", ")}</p>}
            </> : <p>All existing assessments and their ULO contribution percentages will remain. The Handbook assessment preview below will not be applied.</p>}
          </div>
          {blockers.map((blocker) => <div className="banner" key={blocker}><div className="ico">!</div><div className="body">{blocker}</div></div>)}
          {applicationMode === "ulos_only" && !!draft.review.assessment_blockers.length && <p>{draft.review.has_grades
            ? "Existing grades are linked to these assessments. ULOs only keeps that setup. Assessment setup cannot delete graded assessments; replacing them requires a reviewed plan for the affected grades."
            : draft.review.has_previews
              ? "Existing grade upload previews use this assessment setup. Review those previews before replacing assessments, or use ULOs only to keep the current setup."
              : "The draft differs from manually reviewed assessments. Compare it with Assessment setup and confirm the intended structure before applying assessments."}</p>}
          {draft.payload.warnings?.map((warning) => <div key={warning} className="banner"><div className="ico">!</div><div className="body">{warning}</div></div>)}
          <div className="hb-diff-item"><div className="hb-diff-lo">Learning outcomes ({draft.payload.learning_outcomes.length})</div>{draft.payload.learning_outcomes.map((ulo) => <p key={ulo.code}><strong>{ulo.code}</strong> {ulo.description}</p>)}</div>
          <div className="hb-diff-item"><div className="hb-diff-lo">Assessments ({draft.payload.assessments.length})</div>{draft.payload.assessments.map((assessment) => <p key={assessment.name}><strong>{assessment.name}</strong> · {assessment.weight}%{assessment.is_hurdle ? " · Hurdle assessment" : ""} · {assessment.ulo_codes.join(", ") || "No ULO link published"}</p>)}</div>
          <p><a href={draft.source_url} target="_blank" rel="noreferrer">Open the public Handbook source</a></p>
        </div>
        <div className="hb-modal-actions"><button className="btn" disabled={importing} onClick={() => setShowDraft(false)}>Close</button><button className="btn primary" disabled={importing || blockers.length > 0} onClick={() => void confirmDraft()}>{importing ? "Applying..." : "Confirm and apply draft"}</button></div>
      </div></div>}
    </div>
  );
}
