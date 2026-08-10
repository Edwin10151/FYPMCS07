import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { errorMessage, getAssessments, getOfferings, type Assessment, type Offering } from "../api";
import Sidebar from "../components/Sidebar";
import { useOfferingId } from "../useOfferingId";
import { useSession } from "../useSession";
import "./Assessments.css";

const ROW_COLORS = ["#2D5A9E", "#163E76", "#0B2E5C", "#E0A33E", "#6B4FA0", "#1F7A5C", "#A8321C", "#8A5A2E"];

export default function Assessments() {
  const navigate = useNavigate();
  const session = useSession();
  const { offeringId, error: offeringError } = useOfferingId();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [offering, setOffering] = useState<Offering | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session || !offeringId) return;
    setLoading(true);
    Promise.all([getAssessments(session.access_token, offeringId), getOfferings(session.access_token)])
      .then(([assessmentResponse, offeringResponse]) => {
        setAssessments(assessmentResponse.assessments);
        setOffering(offeringResponse.offerings.find((item) => item.offering_id === offeringId) ?? null);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [offeringId, session]);

  const totalWeight = useMemo(() => assessments.reduce((sum, item) => sum + Number(item.weight), 0), [assessments]);
  const allUlos = useMemo(() => [...new Set(assessments.flatMap((item) => item.covers))], [assessments]);

  if (!session) return null;

  return (
    <div className="app">
      <Sidebar user={session.user} />
      <main className="main">
        <div className="topbar">
          <div className="crumbs"><Link to="/units">Home</Link><span className="sep">›</span><Link to="/dashboard">{offering?.unit_code ?? "Unit"}</Link><span className="sep">›</span><Link to="/assessments">Assessments</Link></div>
          <div className="top-actions"><button className="btn" onClick={() => navigate("/upload")}>Upload grades</button>{offering?.can_edit && <Link className="btn primary" to="/mapping">Import or review Handbook setup</Link>}</div>
        </div>
        <div className="content">
          <div className="unit-banner"><div><h1 style={{ fontSize: 26 }}>Assessment setup</h1><div className="sub"><span className="code">{offering?.unit_code ?? "..."}</span> {offering?.unit_name ?? "Loading offering..."} · Confirmed assessment configuration from the database</div></div></div>
          {(error || offeringError) && <div className="banner"><div className="ico">!</div><div className="body">{error || offeringError}</div></div>}
          {loading ? <div className="panel">Loading assessment data...</div> : assessments.length === 0 ? <div className="panel"><h4>No assessments confirmed yet</h4><p>Import a Handbook draft, review it, and confirm it before setting up grade uploads.</p>{offering?.can_edit && <Link className="btn primary" to="/mapping">Import Handbook draft</Link>}</div> : <div className="ass-layout">
            <div className="weight-bar-card"><div className="wbar-head"><div><div className="wbar-lbl">Total assessment weight</div><div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>Stored assessment weights for this selected offering.</div></div><div className="wbar-total" style={{ color: Math.abs(totalWeight - 100) < 0.01 ? "var(--ok)" : "var(--warn)" }}>{totalWeight.toFixed(2)}<span style={{ fontSize: 14, color: "var(--ink-3)" }}>% / 100%</span></div></div><div className="wbar">{assessments.map((assessment, index) => <div key={assessment.assessment_id} className="seg" style={{ width: `${assessment.weight}%`, background: ROW_COLORS[index % ROW_COLORS.length] }}>{assessment.weight}%</div>)}</div><div className="wbar-key">{assessments.map((assessment, index) => <span key={assessment.assessment_id}><span className="sw" style={{ background: ROW_COLORS[index % ROW_COLORS.length] }} />{assessment.assessment_name}</span>)}</div></div>
            {assessments.map((assessment, index) => <div key={assessment.assessment_id} className="ass-row"><div className="grip" aria-hidden="true">{index + 1}</div><div className="ass-name"><div className="h"><strong>{assessment.assessment_name}</strong></div><div className={`hurdle-tag ${assessment.is_hurdle ? "" : "none"}`}><span className="hurdle-dot" />{assessment.is_hurdle ? "Hurdle assessment" : "No hurdle"}</div></div><div className="weight-cell"><strong>{assessment.weight}</strong><span className="pct">%</span></div><div className="lo-chips">{assessment.covers.length ? assessment.covers.map((ulo) => <span key={ulo} className="lo-chip on">{ulo}</span>) : <span className="h-sub">No ULO mapping published</span>}</div><div className="row-tools"><button type="button" className="upload-grades-btn" onClick={() => navigate("/upload", { state: { assessmentId: assessment.assessment_id, assessmentName: assessment.assessment_name } })}>Upload grades</button></div></div>)}
            <div className="per-lo-breakdown"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid var(--line)" }}><div><h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Assessment coverage</h4><div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>The Handbook can omit assessment-to-ULO links. Those links remain visible as missing until a coordinator supplies the approved mapping.</div></div><div className={`pill ${allUlos.length > 0 ? "ok" : "warn"}`}><span className="dot" />{allUlos.length} ULOs covered</div></div>{allUlos.map((ulo) => { const coveredBy = assessments.filter((assessment) => assessment.covers.includes(ulo)); const allocatedWeight = coveredBy.reduce((sum, assessment) => sum + Number(assessment.allocated_weights[assessment.covers.indexOf(ulo)] ?? 0), 0); return <div key={ulo} className="per-lo-row"><div className="lo-l">{ulo}<span className="sub">{coveredBy.map((assessment) => assessment.assessment_name).join(", ")}</span></div><div className="alloc-bar">{coveredBy.map((assessment, index) => <div key={assessment.assessment_id} className="seg-a" style={{ width: `${100 / coveredBy.length}%`, background: ROW_COLORS[index % ROW_COLORS.length] }}>{assessment.assessment_name}</div>)}</div><div className="per-lo-total">{allocatedWeight.toFixed(1)}%</div></div>; })}</div>
          </div>}
        </div>
      </main>
    </div>
  );
}
