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
    () => mapping?.ulos.filter((ulo) => !mapping.plos.some((plo) => cells[`${plo.plo_id},${ulo.offering_ulo_id}`] === "on")) ?? [],
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
      setShowDraft(true);
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
      await confirmHandbookImport(session.access_token, offeringId, draft.handbook_import_id);
      setShowDraft(false);
      setDraft(null);
      setNotice("Handbook draft confirmed. Review and save the ULO to PLO mapping next.");
      await loadWorkspace();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setImporting(false);
    }
  };

  const unitLabel = offering ? `${offering.unit_code} ${offering.unit_name}` : "Selected offering";
  const hasSetupData = (mapping?.ulos.length ?? 0) > 0 && (mapping?.plos.length ?? 0) > 0;

  return (
    <div className="app mapping-app">
      <Sidebar user={session.user} />
      <main className="main">
        <div className="topbar">
          <div className="crumbs"><Link to="/units">Home</Link><span className="sep">›</span><Link to="/dashboard">{offering?.unit_code ?? "Unit"}</Link><span className="sep">›</span><Link to="/mapping">Mapping</Link></div>
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
          {draft && !showDraft && <div className="banner"><div className="ico">i</div><div className="body">A Handbook draft is ready for review.</div><div className="actions"><button className="btn primary" onClick={() => setShowDraft(true)}>Review draft</button></div></div>}

          {loading ? <div className="panel">Loading mapping data...</div> : !mapping || !hasSetupData ? (
            <div className="panel">
              <h4>Set up this offering</h4>
              <p>{canEdit ? "Import the selected Malaysia semester from the public Handbook, review the draft, then confirm it before mapping ULOs to the development PLO list." : "This offering has not been set up by its coordinator yet."}</p>
              {canEdit && <button className="btn primary" disabled={importing} onClick={() => void importHandbook()}>{importing ? "Fetching Handbook..." : "Import Handbook draft"}</button>}
            </div>
          ) : (
            <div className="matrix-wrap"><div className="matrix">
              <div className="mx-head"><div><h4>Mapping matrix</h4><div className="h-sub">{canEdit ? "Select the PLO links for each ULO, then save the reviewed mapping." : "You have read-only access to this reviewed mapping."}</div></div></div>
              <table className="mx-table"><colgroup><col className="col-plo" />{mapping.ulos.map((ulo) => <col key={ulo.offering_ulo_id} className="col-lo" />)}</colgroup>
                <thead><tr><th className="plo-head"><div className="plo-head-title">Program learning outcomes</div><div className="plo-head-sub">Development mock PLO source</div></th>{mapping.ulos.map((ulo) => <th key={ulo.offering_ulo_id} className="lo-head"><span className="lo-badge">{ulo.ulo_code}</span><div className="lo-head-text">{ulo.description}</div></th>)}</tr></thead>
                <tbody>{mapping.plos.map((plo) => <tr key={plo.plo_id} className={selected.startsWith(`${plo.plo_id},`) ? "active" : ""}><td className="plo-cell"><div className="plo-cell-head"><span className="plo-badge">{plo.plo_code}</span></div><div className="plo-t">{plo.description}</div></td>{mapping.ulos.map((ulo) => { const key = `${plo.plo_id},${ulo.offering_ulo_id}`; return <td key={ulo.offering_ulo_id}><button type="button" className={`cell${selected === key ? " selected" : ""}`} disabled={!canEdit} onClick={() => toggle(key)} aria-label={`Toggle ${plo.plo_code} for ${ulo.ulo_code}`}>{cells[key] === "on" ? <span className="check">✓</span> : <span className="empty" />}</button></td>; })}</tr>)}</tbody>
                <tfoot><tr className="totals-row"><td>Links per ULO</td>{mapping.ulos.map((ulo) => <td key={ulo.offering_ulo_id}><span className="cov-num">{mapping.plos.filter((plo) => cells[`${plo.plo_id},${ulo.offering_ulo_id}`] === "on").length}</span></td>)}</tr></tfoot>
              </table>
            </div></div>
          )}

          {hasSetupData && <div className="save-bar"><div className="stat">{uncoveredUlos.length === 0 ? <><strong>Every ULO has a PLO link.</strong> Ready to save.</> : <><strong>{uncoveredUlos.length} ULO{uncoveredUlos.length === 1 ? "" : "s"}</strong> still need a PLO link.</>}</div>{canEdit && <div className="actions"><button className="btn primary" disabled={uncoveredUlos.length > 0 || saving} onClick={() => void save()}>{saving ? "Saving..." : "Save mapping"}</button></div>}</div>}
        </div>
      </main>

      {showDraft && draft && <div className="hb-modal-overlay" onClick={() => setShowDraft(false)}><div className="hb-modal" onClick={(event) => event.stopPropagation()}>
        <div className="hb-modal-head"><h3>Review Handbook draft</h3><p>{unitLabel} · {draft.payload.offering_scope ? `${draft.payload.offering_scope.location} ${draft.payload.offering_scope.period}` : "Selected offering"}</p></div>
        <div className="hb-diff-list">
          {draft.payload.warnings?.map((warning) => <div key={warning} className="banner"><div className="ico">!</div><div className="body">{warning}</div></div>)}
          <div className="hb-diff-item"><div className="hb-diff-lo">Learning outcomes ({draft.payload.learning_outcomes.length})</div>{draft.payload.learning_outcomes.map((ulo) => <p key={ulo.code}><strong>{ulo.code}</strong> {ulo.description}</p>)}</div>
          <div className="hb-diff-item"><div className="hb-diff-lo">Assessments ({draft.payload.assessments.length})</div>{draft.payload.assessments.map((assessment) => <p key={assessment.name}><strong>{assessment.name}</strong> · {assessment.weight}% · {assessment.ulo_codes.join(", ") || "No ULO link published"}</p>)}</div>
          <p><a href={draft.source_url} target="_blank" rel="noreferrer">Open the public Handbook source</a></p>
        </div>
        <div className="hb-modal-actions"><button className="btn" onClick={() => setShowDraft(false)}>Cancel</button><button className="btn primary" disabled={importing} onClick={() => void confirmDraft()}>{importing ? "Applying..." : "Confirm and apply draft"}</button></div>
      </div></div>}
    </div>
  );
}
