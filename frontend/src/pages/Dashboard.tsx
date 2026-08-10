import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  errorMessage,
  generateSummary,
  getDashboard,
  type DashboardPayload,
} from "../api";
import Sidebar from "../components/Sidebar";
import { useOfferingId } from "../useOfferingId";
import { useSession } from "../useSession";
import "./Dashboard.css";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Dashboard() {
  const session = useSession();
  const { offeringId, error: offeringError } = useOfferingId();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!session || !offeringId) return;
    setLoading(true);
    getDashboard(session.access_token, offeringId)
      .then((response) => {
        setData(response);
        setSummary(response.report?.ai_summary ?? "");
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [offeringId, session]);

  const loData = useMemo(() => data?.learning_outcomes.map((outcome) => ({
    lo: outcome.ulo_code,
    attainment: Number(outcome.average_attainment_pct),
    passed: `${outcome.achieved_count}/${outcome.enrolled_count} achieved`,
    status: Number(outcome.pass_rate_pct) < 70 ? "Needs review" : "On track",
    fill: Number(outcome.pass_rate_pct) < 70 ? "#A8321C" : "#16744D",
  })) ?? [], [data]);

  if (!session) return null;

  const averageAttainment = loData.length ? loData.reduce((sum, item) => sum + item.attainment, 0) / loData.length : null;

  const generate = async () => {
    if (!offeringId) return;
    setGenerating(true);
    setError("");
    try {
      const response = await generateSummary(session.access_token, offeringId);
      setSummary(response.summary);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="app">
      <Sidebar user={session.user} />
      <main className="main">
        <div className="topbar">
          <div className="crumbs"><Link to="/units">Home</Link><span className="sep">›</span><Link to="/dashboard">{data?.offering.unit_code ?? "Unit"}</Link><span className="sep">›</span><Link to="/dashboard">Dashboard</Link></div>
          <div className="top-actions"><button className="btn ghost" onClick={() => window.print()}>Print report</button><button className="btn primary" disabled={!data || generating || loData.length === 0} onClick={() => void generate()}>{generating ? "Generating..." : "Generate AI summary"}</button></div>
        </div>
        <div className="content">
          {(error || offeringError) && <div className="banner"><div className="ico">!</div><div className="body">{error || offeringError}</div></div>}
          {loading ? <div className="panel">Loading dashboard data...</div> : !data ? <div className="panel">The selected offering could not be loaded.</div> : <>
            <div className="unit-banner"><div><h1><span className="code">{data.offering.unit_code}</span>{data.offering.unit_name}</h1><div className="sub">{data.offering.program_name} · {data.offering.year} {data.offering.period} · Development database</div></div></div>
            <div className="kpi-row">
              <div className="kpi"><div className="lbl">Enrolled</div><div className="val">{data.stats.student_count}</div><div className="delta">Recorded enrolments</div></div>
              <div className="kpi"><div className="lbl">Overall attainment</div><div className="val">{averageAttainment === null ? "--" : <>{averageAttainment.toFixed(1)}<span className="u">%</span></>}</div><div className="delta">Mean across {data.stats.lo_count} ULOs</div></div>
              <div className="kpi"><div className="lbl">ULO outcomes at risk</div><div className="val warn">{data.stats.at_risk_count}<span className="u"> / {data.stats.lo_count}</span></div><div className="delta">Below the 70% pass-rate threshold</div></div>
              <div className="kpi"><div className="lbl">Students at risk</div><div className="val">--</div><div className="delta">Available after grade calculation is implemented</div></div>
            </div>
            <div className="ai-drawer"><div className="hd"><span className="star" /><div><h4>AI cohort summary</h4><div className="meta">DEVELOPMENT-ONLY SUMMARY · REVIEW BEFORE USE</div></div></div><button className="btn primary" disabled={generating || loData.length === 0} onClick={() => void generate()}>{generating ? "Generating..." : "Generate summary"}</button></div>
            {summary && <div className="panel" style={{ marginTop: -6 }}><p style={{ margin: 0 }}>{summary}</p></div>}
            <div className="panel"><div className="panel-head"><div><h4>ULO attainment</h4><div className="h-sub">Values are calculated from data currently stored in the development database. The threshold is 70% pass rate.</div></div></div>{loData.length === 0 ? <p>No calculated ULO attainment is available yet.</p> : <div style={{ width: "100%", height: 300, marginTop: 10 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={loData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }} barSize={54}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" /><XAxis dataKey="lo" tick={{ fill: "var(--ink-2)", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }} axisLine={{ stroke: "var(--line)" }} tickLine={false} /><YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: "var(--ink-3)", fontSize: 11 }} axisLine={false} tickLine={false} /><ReferenceLine y={70} stroke="#C97A5C" strokeDasharray="4 4" label={{ value: "Threshold 70%", position: "insideTopRight", fill: "#C97A5C", fontSize: 11 }} /><Tooltip cursor={{ fill: "rgba(0, 75, 117, 0.05)" }} formatter={(value) => [`${value}%`, "Attainment"]} /><Bar dataKey="attainment" radius={[8, 8, 0, 0]}>{loData.map((entry) => <Cell key={entry.lo} fill={entry.fill} />)}</Bar></BarChart></ResponsiveContainer></div>}</div>
            <div className="panel"><div className="panel-head"><div><h4>Assessment setup</h4><div className="h-sub">Confirmed assessment data for this offering.</div></div><Link className="btn ghost" to="/assessments">View assessments</Link></div>{data.assessments.length === 0 ? <p>No assessments have been confirmed yet.</p> : <div className="table-wrap"><table><thead><tr><th>Assessment</th><th>Weight</th><th>ULO coverage</th></tr></thead><tbody>{data.assessments.map((assessment) => <tr key={assessment.assessment_id}><td>{assessment.assessment_name}</td><td>{assessment.weight}%</td><td>{assessment.covers.join(", ") || "Not mapped"}</td></tr>)}</tbody></table></div>}</div>
          </>}
        </div>
      </main>
    </div>
  );
}
