import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  errorMessage,
  generateReportDraft,
  getDashboard,
  getOfferings,
  getReport,
  reviewReport,
  saveReport,
  submitReport,
  type DashboardPayload,
  type Offering,
  type Report as ReportRecord,
  type ReportSections,
} from "../api";
import Sidebar from "../components/Sidebar";
import { useOfferingId } from "../useOfferingId";
import { useSession } from "../useSession";
import "./Assessments.css";
import "./Report.css";

const EMPTY_SECTIONS: ReportSections = {
  attainment_analysis: "",
  previous_cohort_outcomes: "",
  next_cohort_action_plan: "",
};

function sectionsFrom(report: ReportRecord | null): ReportSections {
  return {
    attainment_analysis: report?.attainment_analysis ?? report?.ai_summary ?? "",
    previous_cohort_outcomes: report?.previous_cohort_outcomes ?? "",
    next_cohort_action_plan: report?.next_cohort_action_plan ?? "",
  };
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";
}

function statusLabel(status: ReportRecord["status"] | undefined) {
  if (status === "changes_requested") return "Changes requested";
  if (status === "submitted") return "Submitted for approval";
  if (status === "approved") return "Approved";
  return "Draft";
}

function ReportSection({ title, value, editable, onChange }: {
  title: string;
  value: string;
  editable: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <section className="cqi-section">
      <h3>{title}</h3>
      {editable ? <textarea value={value} maxLength={2000} onChange={(event) => onChange(event.target.value)} /> : <p>{value || "Not completed."}</p>}
      {editable && <p className="print-only">{value || "Not completed."}</p>}
    </section>
  );
}

export default function Report() {
  const session = useSession();
  const { offeringId, error: offeringError } = useOfferingId();
  const [offering, setOffering] = useState<Offering | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [report, setReport] = useState<ReportRecord | null>(null);
  const [sections, setSections] = useState<ReportSections>(EMPTY_SECTIONS);
  const [coordinatorContext, setCoordinatorContext] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"generate" | "save" | "submit" | "review" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const applyReport = (value: ReportRecord | null) => {
    setReport(value);
    setSections(sectionsFrom(value));
    setCoordinatorContext(value?.coordinator_comment ?? "");
    setReviewComment(value?.reviewer_comment ?? "");
  };

  const load = async () => {
    if (!session || !offeringId) return;
    setLoading(true);
    try {
      const [offeringResponse, dashboardResponse, reportResponse] = await Promise.all([
        getOfferings(session.access_token),
        getDashboard(session.access_token, offeringId),
        getReport(session.access_token, offeringId),
      ]);
      setOffering(offeringResponse.offerings.find((item) => item.offering_id === offeringId) ?? null);
      setDashboard(dashboardResponse);
      applyReport(reportResponse.report);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offeringId, session?.access_token]);

  const baseline = useMemo(() => sectionsFrom(report), [report]);
  const dirty = Object.keys(sections).some((key) => sections[key as keyof ReportSections] !== baseline[key as keyof ReportSections])
    || coordinatorContext !== (report?.coordinator_comment ?? "");
  const complete = Object.values(sections).every((value) => value.trim());
  const teachingUser = session?.user.role_name === "lecturer" || session?.user.role_name === "coordinator";
  const canEdit = !!teachingUser && (!report || report.status === "draft" || report.status === "changes_requested");
  const canReview = session?.user.role_name === "management" && report?.status === "submitted";

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const beforeLink = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor || anchor.getAttribute("href") === window.location.pathname) return;
      if (!window.confirm("Discard unsaved report changes?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeLink, true);
    };
  }, [dirty]);

  if (!session) return null;

  const run = async (kind: typeof busy, action: () => Promise<void>) => {
    setBusy(kind);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const generate = () => run("generate", async () => {
    if (!offeringId) return;
    const response = await generateReportDraft(session.access_token, offeringId, coordinatorContext);
    applyReport(response.report);
    setNotice("A new CQI draft was generated and saved.");
  });

  const save = () => run("save", async () => {
    if (!offeringId) return;
    await saveReport(session.access_token, offeringId, sections, coordinatorContext);
    await load();
    setNotice("Draft saved.");
  });

  const submit = () => run("submit", async () => {
    if (!offeringId) return;
    if (dirty) await saveReport(session.access_token, offeringId, sections, coordinatorContext);
    await submitReport(session.access_token, offeringId);
    await load();
    setNotice("Report submitted for QAG approval.");
  });

  const review = (decision: "approved" | "changes_requested") => run("review", async () => {
    if (!offeringId) return;
    await reviewReport(session.access_token, offeringId, decision, reviewComment);
    await load();
    setNotice(decision === "approved" ? "Report approved." : "Report returned to the coordinator.");
  });

  return (
    <div className="app report-page">
      <Sidebar user={session.user} />
      <main className="main">
        <div className="topbar no-print">
          <div className="crumbs"><Link to="/units">Home</Link><span className="sep">›</span><Link to="/dashboard">{offering?.unit_code ?? "Unit"}</Link><span className="sep">›</span><strong>Report</strong></div>
          {report?.status === "approved" && <button className="btn" onClick={() => window.print()}>Print / Save PDF</button>}
        </div>
        <div className="content report-content">
          {(error || offeringError) && <div className="banner no-print"><div className="ico">!</div><div className="body">{error || offeringError}</div></div>}
          {notice && <div className="banner ok no-print"><div className="ico">i</div><div className="body">{notice}</div></div>}

          {loading ? <div className="panel">Loading report...</div> : !dashboard ? <div className="panel">The selected offering could not be loaded.</div> : <>
            <div className="report-toolbar no-print">
              <div>
                <span className={`report-status status-${report?.status ?? "draft"}`}>{statusLabel(report?.status)}</span>
                <h1>Unit-level CQI Plan</h1>
                <p>{dashboard.offering.unit_code} · {dashboard.offering.year} {dashboard.offering.period}</p>
              </div>
              {canEdit && <div className="report-actions">
                <button className="btn" disabled={!!busy} onClick={generate}>{busy === "generate" ? "Generating..." : report ? "Regenerate draft" : "Generate draft"}</button>
                <button className="btn" disabled={!!busy || !dirty || !complete} onClick={save}>{busy === "save" ? "Saving..." : "Save draft"}</button>
                <button className="btn primary" disabled={!!busy || !complete} onClick={submit}>{busy === "submit" ? "Submitting..." : "Submit for approval"}</button>
              </div>}
            </div>

            {report?.status === "changes_requested" && <div className="review-note no-print"><strong>Changes requested</strong><p>{report.reviewer_comment}</p></div>}
            {report?.status === "submitted" && teachingUser && <div className="review-note no-print"><strong>Awaiting QAG review</strong><p>The submitted report is read-only until it is approved or returned for changes.</p></div>}

            {canEdit && <label className="context-field no-print">
              <span>Coordinator context for the draft</span>
              <textarea value={coordinatorContext} maxLength={4000} placeholder="Teaching changes, known reasons for the results, or progress on the previous action plan." onChange={(event) => setCoordinatorContext(event.target.value)} />
            </label>}

            <article className="report-sheet">
              <header className="report-title">
                <div><span>Semester Offering</span><strong>{dashboard.offering.period} {dashboard.offering.year}</strong></div>
                <h2>Unit-level CQI Plan</h2>
                <div><span>Unit</span><strong>{dashboard.offering.unit_code} - {dashboard.offering.unit_name}</strong></div>
              </header>

              <div className="report-table-wrap">
                <table className="report-table">
                  <thead><tr><th>LO Code</th><th>Weightage based Attainment %</th><th>Attainment Grade</th></tr></thead>
                  <tbody>{dashboard.learning_outcomes.map((outcome) => <tr key={outcome.offering_ulo_id}>
                    <td>{outcome.ulo_code}</td><td>{Number(outcome.average_attainment_pct).toFixed(1)}</td><td>{outcome.attainment_grade}</td>
                  </tr>)}</tbody>
                </table>
              </div>

              <h2 className="report-subtitle">Unit-level CQI Plan(s)</h2>
              <div className="cqi-heading">CO CQI Plan</div>
              <ReportSection title="Analysis of LO attainment levels" value={sections.attainment_analysis} editable={canEdit} onChange={(value) => setSections((current) => ({ ...current, attainment_analysis: value }))} />
              <ReportSection title="Action plan / outcomes from previous Cohort" value={sections.previous_cohort_outcomes} editable={canEdit} onChange={(value) => setSections((current) => ({ ...current, previous_cohort_outcomes: value }))} />
              <ReportSection title="Action plan for next Cohort (offering)" value={sections.next_cohort_action_plan} editable={canEdit} onChange={(value) => setSections((current) => ({ ...current, next_cohort_action_plan: value }))} />

              <div className="cqi-heading">CP, CA CQI Plan</div>
              <section className="cqi-section cqi-none"><h3>Analysis and action plans</h3><p>None</p></section>

              <footer className="approval-footer">
                <div><span>CQI Plan Current Status</span><strong>{statusLabel(report?.status)}</strong></div>
                <div><span>Approved On</span><strong>{report?.status === "approved" ? formatDate(report.finalized_at) : "-"}</strong></div>
                <div><span>Approved By</span><strong>{report?.status === "approved" ? report.reviewed_by_name ?? "Management" : "-"}</strong></div>
              </footer>
            </article>

            {canReview && <section className="review-panel no-print">
              <div><h2>QAG review</h2><p>Approve the report or return it with a clear comment.</p></div>
              <textarea value={reviewComment} maxLength={4000} placeholder="Review comment" onChange={(event) => setReviewComment(event.target.value)} />
              <div className="report-actions">
                <button className="btn" disabled={!!busy || !reviewComment.trim()} onClick={() => review("changes_requested")}>Request changes</button>
                <button className="btn primary" disabled={!!busy} onClick={() => review("approved")}>{busy === "review" ? "Saving..." : "Approve report"}</button>
              </div>
            </section>}
          </>}
        </div>
      </main>
    </div>
  );
}
