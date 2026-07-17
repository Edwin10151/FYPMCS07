import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BarChart3,
  Check,
  Database,
  FileText,
  KeyRound,
  LogOut,
  RefreshCw,
  Save,
  Shield,
  Upload,
  Users
} from "lucide-react";
import { apiFetch, login, Session } from "./api";
import "./styles.css";

type DashboardPayload = {
  offering: {
    offering_id: number;
    unit_code: string;
    unit_name: string;
    program_name: string;
    year: number;
    period: string;
  };
  stats: { student_count: number; lo_count: number; at_risk_count: number };
  learning_outcomes: Array<{
    offering_ulo_id: number;
    ulo_code: string;
    description: string;
    average_attainment_pct: string;
    pass_rate_pct: string;
    enrolled_count: number;
    achieved_count: number;
  }>;
  assessments: Array<{
    assessment_id: number;
    assessment_name: string;
    weight: string;
    max_mark: string;
    covers: string[];
  }>;
  report: {
    ai_summary: string;
    coordinator_comment: string;
    is_finalized: boolean;
  } | null;
};

type MappingPayload = {
  ulos: Array<{ offering_ulo_id: number; ulo_code: string; description: string }>;
  plos: Array<{ plo_id: number; plo_code: string; description: string }>;
  mappings: Array<{ mapping_id: number; offering_ulo_id: number; plo_id: number }>;
};

type View = "dashboard" | "mapping" | "assessments" | "upload" | "admin";

const demoAccounts = [
  ["Coordinator", "elise.chen@monash.edu"],
  ["Lecturer", "aaron.lim@monash.edu"],
  ["Management", "maya.rao@monash.edu"]
];

function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const raw = localStorage.getItem("mcs07.session");
    return raw ? JSON.parse(raw) : null;
  });
  const [view, setView] = useState<View>("dashboard");

  function persistSession(next: Session) {
    localStorage.setItem("mcs07.session", JSON.stringify(next));
    setSession(next);
  }

  function signOut() {
    localStorage.removeItem("mcs07.session");
    setSession(null);
  }

  if (!session) return <Login onLogin={persistSession} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="mark">M</div>
          <div>
            <strong>MCS07</strong>
            <span>Academic Performance</span>
          </div>
        </div>
        <nav>
          <NavButton icon={<BarChart3 />} label="Dashboard" view="dashboard" active={view} setView={setView} />
          <NavButton icon={<Check />} label="Mapping" view="mapping" active={view} setView={setView} />
          <NavButton icon={<Database />} label="Assessments" view="assessments" active={view} setView={setView} />
          <NavButton icon={<Upload />} label="CSV Upload" view="upload" active={view} setView={setView} />
          <NavButton icon={<Users />} label="Admin" view="admin" active={view} setView={setView} />
        </nav>
        <div className="profile">
          <div>
            <strong>{session.user.full_name}</strong>
            <span>{session.user.role_name}</span>
          </div>
          <button className="icon-button" onClick={signOut} aria-label="Sign out" title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main>
        {view === "dashboard" && <Dashboard token={session.access_token} />}
        {view === "mapping" && <Mapping token={session.access_token} />}
        {view === "assessments" && <Assessments token={session.access_token} />}
        {view === "upload" && <CsvUpload token={session.access_token} />}
        {view === "admin" && <Admin token={session.access_token} />}
      </main>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [email, setEmail] = useState("elise.chen@monash.edu");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onLogin(await login(email, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-screen">
      <form className="login-panel" onSubmit={submit}>
        <div className="brand inline">
          <div className="mark">M</div>
          <div>
            <strong>MCS07</strong>
            <span>Development demo</span>
          </div>
        </div>
        <h1>Sign in</h1>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
        </label>
        <label>
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
        </label>
        {error && <div className="error-line">{error}</div>}
        <button className="primary" disabled={busy}>
          <KeyRound size={17} />
          {busy ? "Signing in" : "Sign in"}
        </button>
        <div className="account-row">
          {demoAccounts.map(([label, account]) => (
            <button type="button" key={account} onClick={() => setEmail(account)}>
              {label}
            </button>
          ))}
        </div>
      </form>
    </main>
  );
}

function NavButton({
  icon,
  label,
  view,
  active,
  setView
}: {
  icon: React.ReactNode;
  label: string;
  view: View;
  active: View;
  setView: (view: View) => void;
}) {
  return (
    <button className={active === view ? "active" : ""} onClick={() => setView(view)}>
      {icon}
      {label}
    </button>
  );
}

function Dashboard({ token }: { token: string }) {
  const { data, error, reload } = useApi<DashboardPayload>("/dashboard", token);
  const [summary, setSummary] = useState("");

  async function generateSummary() {
    const response = await apiFetch<{ summary: string }>("/reports/summary", token, { method: "POST" });
    setSummary(response.summary);
  }

  if (error) return <ErrorState error={error} reload={reload} />;
  if (!data) return <LoadingState />;

  return (
    <section className="workspace">
      <Header
        title={`${data.offering.unit_code} ${data.offering.unit_name}`}
        eyebrow={`${data.offering.period} ${data.offering.year} · ${data.offering.program_name}`}
        action={<button onClick={reload}><RefreshCw size={16} />Refresh</button>}
      />
      <div className="stat-grid">
        <Stat label="Students" value={data.stats.student_count} />
        <Stat label="Learning outcomes" value={data.stats.lo_count} />
        <Stat label="At risk" value={data.stats.at_risk_count} tone={data.stats.at_risk_count ? "warn" : "ok"} />
      </div>
      <div className="content-grid">
        <section className="panel">
          <h2>Learning Outcomes</h2>
          <div className="lo-list">
            {data.learning_outcomes.map((lo) => (
              <div className="lo-row" key={lo.offering_ulo_id}>
                <div>
                  <strong>{lo.ulo_code}</strong>
                  <span>{lo.description}</span>
                </div>
                <meter min="0" max="100" value={Number(lo.pass_rate_pct)} />
                <b>{Number(lo.pass_rate_pct).toFixed(0)}%</b>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Report</h2>
          <p className="report-copy">{summary || data.report?.ai_summary || "No report summary yet."}</p>
          <button className="primary" onClick={generateSummary}>
            <FileText size={16} />
            Generate Summary
          </button>
        </section>
      </div>
    </section>
  );
}

function Mapping({ token }: { token: string }) {
  const { data, error, reload } = useApi<MappingPayload>("/mappings", token);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (data) {
      setSelected(new Set(data.mappings.map((item) => `${item.offering_ulo_id}:${item.plo_id}`)));
    }
  }, [data]);

  async function save() {
    if (!data) return;
    const mappings = [...selected].map((key) => {
      const [offering_ulo_id, plo_id] = key.split(":").map(Number);
      return { offering_ulo_id, plo_id };
    });
    await apiFetch("/mappings", token, {
      method: "PUT",
      body: JSON.stringify({ offering_id: 1, mappings })
    });
    reload();
  }

  if (error) return <ErrorState error={error} reload={reload} />;
  if (!data) return <LoadingState />;

  return (
    <section className="workspace">
      <Header
        title="ULO to PLO Mapping"
        eyebrow="Coordinator-confirmed alignment"
        action={<button className="primary" onClick={save}><Save size={16} />Save</button>}
      />
      <section className="panel wide">
        <div className="matrix">
          <div className="matrix-head"></div>
          {data.plos.map((plo) => <div className="matrix-head" key={plo.plo_id}>{plo.plo_code}</div>)}
          {data.ulos.map((ulo) => (
            <React.Fragment key={ulo.offering_ulo_id}>
              <div className="matrix-label">
                <strong>{ulo.ulo_code}</strong>
                <span>{ulo.description}</span>
              </div>
              {data.plos.map((plo) => {
                const key = `${ulo.offering_ulo_id}:${plo.plo_id}`;
                return (
                  <button
                    className={selected.has(key) ? "matrix-cell selected" : "matrix-cell"}
                    key={key}
                    aria-label={`${ulo.ulo_code} ${plo.plo_code}`}
                    onClick={() => {
                      const next = new Set(selected);
                      next.has(key) ? next.delete(key) : next.add(key);
                      setSelected(next);
                    }}
                  >
                    {selected.has(key) && <Check size={16} />}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </section>
    </section>
  );
}

function Assessments({ token }: { token: string }) {
  const { data, error, reload } = useApi<{ assessments: DashboardPayload["assessments"] }>("/assessments", token);
  if (error) return <ErrorState error={error} reload={reload} />;
  if (!data) return <LoadingState />;

  return (
    <section className="workspace">
      <Header title="Assessments" eyebrow="Weights and linked learning outcomes" />
      <section className="panel wide">
        <table>
          <thead>
            <tr><th>Assessment</th><th>Weight</th><th>Max</th><th>Covers</th></tr>
          </thead>
          <tbody>
            {data.assessments.map((assessment) => (
              <tr key={assessment.assessment_id}>
                <td>{assessment.assessment_name}</td>
                <td>{assessment.weight}%</td>
                <td>{assessment.max_mark}</td>
                <td>{assessment.covers?.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
}

function CsvUpload({ token }: { token: string }) {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    setError("");
    try {
      setResult(await apiFetch("/uploads/validate", token, { method: "POST", body }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <section className="workspace">
      <Header title="CSV Upload" eyebrow="Validation before commit" />
      <section className="panel upload-panel">
        <label className="file-picker">
          <Upload size={18} />
          Select CSV
          <input type="file" accept=".csv,text/csv" onChange={upload} />
        </label>
        {error && <div className="error-line">{error}</div>}
        {result && (
          <div className="upload-result">
            <strong>{result.filename}</strong>
            <span>{result.row_count} rows · {result.status}</span>
            <ul>
              {result.issues.map((issue: any) => (
                <li key={`${issue.row}-${issue.message}`}>Row {issue.row}: {issue.message}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </section>
  );
}

function Admin({ token }: { token: string }) {
  const { data, error, reload } = useApi<{ users: Array<any> }>("/admin/users", token);
  if (error) return <ErrorState error={error} reload={reload} />;
  if (!data) return <LoadingState />;

  return (
    <section className="workspace">
      <Header title="Users and Roles" eyebrow="Management access" />
      <section className="panel wide">
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr>
          </thead>
          <tbody>
            {data.users.map((user) => (
              <tr key={user.user_id}>
                <td>{user.full_name}</td>
                <td>{user.email}</td>
                <td>{user.role_name}</td>
                <td>{user.is_active ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
}

function Header({ title, eyebrow, action }: { title: string; eyebrow: string; action?: React.ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      {action && <div className="header-action">{action}</div>}
    </header>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "ok" | "warn" }) {
  return (
    <div className={`stat ${tone || ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LoadingState() {
  return <section className="workspace"><div className="panel">Loading</div></section>;
}

function ErrorState({ error, reload }: { error: string; reload: () => void }) {
  return (
    <section className="workspace">
      <div className="panel error-state">
        <Shield size={20} />
        <span>{error}</span>
        <button onClick={reload}>Retry</button>
      </div>
    </section>
  );
}

function useApi<T>(path: string, token: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const reloadKey = useMemo(() => ({ value: 0 }), []);
  const [, force] = useState(0);

  function reload() {
    reloadKey.value += 1;
    force(reloadKey.value);
  }

  useEffect(() => {
    let alive = true;
    setError("");
    apiFetch<T>(path, token)
      .then((payload) => alive && setData(payload))
      .catch((err) => alive && setError(err instanceof Error ? err.message : "Request failed"));
    return () => {
      alive = false;
    };
  }, [path, token, reloadKey.value]);

  return { data, error, reload };
}

createRoot(document.getElementById("root")!).render(<App />);

