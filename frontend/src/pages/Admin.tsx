import Sidebar from "../components/Sidebar";
import AdminNav from "../components/AdminNav";
import { useSession } from "../useSession";
import { ADMIN_USERS, ROLE_CARDS } from "../mockData";
import "./Admin.css";
import { Link } from "react-router-dom";
import { getSelectedUnit } from "../api";

const selectedUnit = getSelectedUnit();
const unitCode = selectedUnit?.unitCode ?? "FIT2004";

export default function Admin() {
  const session = useSession();

  if (!session) return null;

  return (
    <div className="app">
      <Sidebar user={session.user} />
      <main className="main">
        <div className="topbar">
          <div className="crumbs">
            <Link to="/units">Home</Link>
            <span className="sep">›</span>
            <Link to="/dashboard">{unitCode}</Link>
            <span className="sep">›</span>
            <Link to="/admin/setup">Semester setup</Link>
            <span className="sep">›</span>
            <strong>Academic periods</strong>
          </div>
          <div className="top-actions">
            <div className="search">
              ⌕ Search users… <span className="kbd">⌘K</span>
            </div>
            <button className="btn ghost">Audit log</button>
            <button className="btn">Export</button>
            <button className="btn primary">+ Invite user</button>
          </div>
        </div>

        <div className="content">
          <div className="unit-banner">
            <div>
              <h1 style={{ fontSize: 26 }}>Management Portal</h1>
              <div className="sub">
                Faculty of IT &nbsp;·&nbsp; <strong>38 active users</strong> &nbsp;·&nbsp; 3 pending invitations &nbsp;·&nbsp; Last
                audited 09 May 2026
              </div>
            </div>
          </div>

          <AdminNav counts={{ "/admin": ADMIN_USERS.length }} />

          <div className="role-legend">
            {ROLE_CARDS.map((r) => (
              <div key={r.label} className="rl-card">
                <div className="top">
                  <span className={`role-chip ${r.chip}`}>
                    <span className="icn" />
                    {r.label}
                  </span>
                  <span className="ct">{r.count}</span>
                </div>
                <p>{r.desc}</p>
                <ul>
                  {r.can.map((c, i) => (
                    <li key={i} className={typeof c === "object" && c.no ? "no" : ""}>
                      {typeof c === "object" ? c.text : c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="filter-row">
            <div className="filter-search">⌕ Search by name, email, or unit code…</div>
            {[
              { label: "Role", val: "All", on: true },
              { label: "Unit", val: "All", on: false },
              { label: "Status", val: "Active", on: false },
              { label: "Last active", val: "Any time", on: false },
            ].map((f) => (
              <span key={f.label} className={`filter-pill${f.on ? " on" : ""}`}>
                {f.label} <span className="ind">·</span>
                <span>{f.val}</span> <span className="arr">▾</span>
              </span>
            ))}
            <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--ink-3)" }}>Showing 1–8 of 38</span>
          </div>

          <div className="users-card">
            <table className="users-tbl">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>
                    <span className="chk-box" />
                  </th>
                  <th>Person</th>
                  <th>Role</th>
                  <th>Units</th>
                  <th>Status</th>
                  <th>Last active</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ADMIN_USERS.map((u, i) => (
                  <tr key={i}>
                    <td>
                      <span className="chk-box" />
                    </td>
                    <td>
                      <div className="person">
                        <div className={`av ${u.av} lg`}>{u.init}</div>
                        <div>
                          <div className="meta-line">
                            {u.name}
                            {u.you && (
                              <span className="tag" style={{ marginLeft: 6, fontSize: 9.5 }}>
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="em">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`role-chip ${u.chip}`}>
                        <span className="icn" />
                        {u.chipLabel}
                      </span>
                    </td>
                    <td>
                      <div className="unit-tags">
                        {u.units.map((ut, j) => (
                          <span
                            key={j}
                            className={`tag ${ut.cls}`}
                            style={
                              ut.cls === "warn"
                                ? { fontSize: 9.5, background: "var(--warn-bg)", borderColor: "#F1D9B5", color: "var(--warn)" }
                                : ut.cls === "plain"
                                  ? { fontSize: 10.5, color: "var(--ink-4)", background: "white" }
                                  : { fontSize: 10.5 }
                            }
                          >
                            {ut.label}
                          </span>
                        ))}
                        {u.more && <span className="more">{u.more}</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`status-dot ${u.status}`}>
                        <span className="d" />
                        {u.status === "active" ? "Active" : u.status === "pending" ? "Invited" : "Disabled"}
                      </span>
                    </td>
                    <td className="last-active">{u.lastActive}</td>
                    <td>
                      <div className="row-act">
                        <div className="ic">✎</div>
                        <div className="ic">⋯</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination">
              <span>Showing 1–8 of 38</span>
              <div className="right">
                <div className="pg dis">‹</div>
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className={`pg${n === 1 ? " on" : ""}`}>
                    {n}
                  </div>
                ))}
                <div className="pg">›</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
