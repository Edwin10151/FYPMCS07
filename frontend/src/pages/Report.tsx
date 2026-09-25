import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { errorMessage, getOfferings, getReport, saveReport, type Offering, type Report as ReportRecord } from "../api";
import Sidebar from "../components/Sidebar";
import { useOfferingId } from "../useOfferingId";
import { useSession } from "../useSession";
import "./Assessments.css";
import "./Report.css";

function formatDateTime(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function Report() {
  const navigate = useNavigate();
  const session = useSession();
  const { offeringId, error: offeringError } = useOfferingId();
  const [offering, setOffering] = useState<Offering | null>(null);
  const [report, setReport] = useState<ReportRecord | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const load = async () => {
    if (!session || !offeringId) return;
    setLoading(true);
    try {
      const [offeringResponse, reportResponse] = await Promise.all([
        getOfferings(session.access_token),
        getReport(session.access_token, offeringId),
      ]);
      setOffering(offeringResponse.offerings.find((item) => item.offering_id === offeringId) ?? null);
      setReport(reportResponse.report);
      setContent(reportResponse.report?.ai_summary ?? "");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offeringId, session]);

  const canEdit = !!session && (session.user.role_name === "lecturer" || session.user.role_name === "coordinator") && !report?.is_finalized;
  const dirty = content !== (report?.ai_summary ?? "");

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

  const sentByMe = useMemo(() => !!session && report?.finalized_by === session.user.user_id, [session, report]);

  if (!session) return null;

  const saveDraft = async (): Promise<boolean> => {
    if (!offeringId) return false;
    setSaving(true);
    setError("");
    try {
      await saveReport(session.access_token, offeringId, content, false);
      setNotice("Draft saved to the database.");
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
    setContent(report?.ai_summary ?? "");
    setPendingHref(null);
    if (href) navigate(href);
  };

  const saveDraftAndNavigate = async () => {
    const href = pendingHref;
    const ok = await saveDraft();
    setPendingHref(null);
    if (ok && href) navigate(href);
  };

  const confirmSend = async () => {
    if (!offeringId) return;
    setSending(true);
    setError("");
    try {
      await saveReport(session.access_token, offeringId, content, true);
      setNotice("Report sent. It's now locked and admin can see it.");
      setConfirmOpen(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="app">
      <Sidebar user={session.user} />
      <main className="main">
        <div className="topbar">
          <div className="crumbs"><Link to="/units">Home</Link><span className="sep">›</span><Link to="/dashboard">{offering?.unit_code ?? "Unit"}</Link><span className="sep">›</span><strong>Report</strong></div>
        </div>
        <div className="content">
          <div className="unit-banner"><div><h1 style={{ fontSize: 26 }}>Report</h1><div className="sub"><span className="code">{offering?.unit_code ?? "..."}</span> {offering?.unit_name ?? "Loading offering..."} · {report?.is_finalized ? "Sent to admin" : "Draft, not yet sent"}</div></div></div>

          {(error || offeringError) && <div className="banner"><div className="ico">!</div><div className="body">{error || offeringError}</div></div>}
          {notice && <div className="banner ok"><div className="ico">i</div><div className="body">{notice}</div></div>}

          {loading ? <div className="panel">Loading report...</div> : (
            <>
              {report?.is_finalized && (
                <div className="report-sent-banner">
                  <span className="report-sent-check">✓</span>
                  <div>
                    <strong>{sentByMe ? "You sent this report" : "This report was sent"}</strong>
                    <div className="sub">{formatDateTime(report.finalized_at)} · It's locked and can no longer be edited.</div>
                  </div>
                </div>
              )}

              <div className="panel">
                <div className="panel-head">
                  <div>
                    <h4>Unit report</h4>
                    <div className="h-sub">{canEdit ? "Paste the generated report here, or write it directly — it stays editable until you send it." : report?.is_finalized ? "This is the final version sent to admin." : "You have read-only access to this report."} Plain text for now; chart embedding is planned for a future update.</div>
                  </div>
                </div>
                <textarea
                  className="report-editor"
                  placeholder="No report yet. Paste the generated report here, or start writing..."
                  value={content}
                  disabled={!canEdit}
                  onChange={(event) => setContent(event.target.value)}
                />
              </div>

              {canEdit && (
                <div className="save-bar">
                  <div className="stat">{dirty ? <><strong>Unsaved changes.</strong> Save a draft, or send it once you're ready.</> : <><strong>Up to date.</strong> No unsaved changes.</>}</div>
                  <div className="actions">
                    <button className="btn" disabled={!dirty || saving} onClick={() => void saveDraft()}>{saving ? "Saving..." : "Save draft"}</button>
                    <button className="btn primary" disabled={sending || !content.trim()} onClick={() => setConfirmOpen(true)}>Confirm and Send</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {confirmOpen && (
        <div className="confirm-modal-overlay" onClick={() => !sending && setConfirmOpen(false)}>
          <div className="confirm-modal" onClick={(event) => event.stopPropagation()}>
            <span className="confirm-modal-tag">Send report</span>
            <h3>Send this report to admin?</h3>
            <p>Once confirmed, this report becomes final and this page will no longer be editable. Admin will be able to see it.</p>
            <div className="confirm-modal-actions">
              <button className="btn" disabled={sending} onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button className="btn primary" disabled={sending} onClick={() => void confirmSend()}>{sending ? "Sending..." : "Confirm and Send"}</button>
            </div>
          </div>
        </div>
      )}

      {pendingHref && (
        <div className="confirm-modal-overlay" onClick={() => !saving && setPendingHref(null)}>
          <div className="confirm-modal" onClick={(event) => event.stopPropagation()}>
            <span className="confirm-modal-tag">Unsaved changes</span>
            <h3>Save before you leave?</h3>
            <p>You've made changes to this report that haven't been saved. Save it as a draft, or discard the changes and continue.</p>
            <div className="confirm-modal-actions">
              <button className="btn" disabled={saving} onClick={() => setPendingHref(null)}>Cancel</button>
              <button className="btn danger" disabled={saving} onClick={discardAndNavigate}>Discard changes</button>
              <button className="btn primary" disabled={saving} onClick={() => void saveDraftAndNavigate()}>{saving ? "Saving..." : "Save as draft"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
