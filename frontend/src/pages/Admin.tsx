import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import AdminNav from "../components/AdminNav";
import { useSession } from "../useSession";
import "./Admin.css";
import { Link } from "react-router-dom";
import { avatarClass, errorMessage, getAdminUsers, getSelectedUnit, initials, roleLabel, type AdminUser } from "../api";

const selectedUnit = getSelectedUnit();
const unitCode = selectedUnit?.unitCode ?? "FIT2004";

export default function Admin() {
  const session = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    getAdminUsers(session.access_token).then(({ users }) => setUsers(users)).catch((err) => setError(errorMessage(err)));
  }, [session]);

  if (!session) return null;

  const roleCounts = {
    management: users.filter((user) => user.role_name === "management").length,
    coordinator: users.filter((user) => user.role_name === "coordinator").length,
    lecturer: users.filter((user) => user.role_name === "lecturer").length,
  };

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
            <Link className="btn primary" to="/admin/staff">+ Add staff</Link>
          </div>
        </div>

        <div className="content">
          <div className="unit-banner">
            <div>
              <h1 style={{ fontSize: 26 }}>Management Portal</h1>
              <div className="sub">
                Faculty of IT &nbsp;·&nbsp; <strong>{users.filter((user) => user.is_active).length} active users</strong>
              </div>
            </div>
          </div>

          <AdminNav counts={{ "/admin": users.length }} />

          {error && <div className="adm-flash">{error}</div>}

          <div className="role-legend">
            {[
              { role: "management", label: "Management", text: "Manages staff accounts and teaching-period setup.", can: "Manage staff, periods and offerings" },
              { role: "coordinator", label: "Unit coordinator", text: "Owns unit setup and confirms mappings.", can: "Confirm Handbook imports and mappings" },
              { role: "lecturer", label: "Lecturer", text: "Works with assessment setup and grade uploads.", can: "Upload and review grade data" },
            ].map((role) => (
              <div key={role.role} className="rl-card">
                <div className="top">
                  <span className={`role-chip ${role.role === "management" ? "admin" : role.role === "lecturer" ? "lec" : ""}`}>
                    <span className="icn" />
                    {role.label}
                  </span>
                  <span className="ct">{roleCounts[role.role as keyof typeof roleCounts]} ppl</span>
                </div>
                <p>{role.text}</p>
                <ul>
                  <li>{role.can}</li>
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
            <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--ink-3)" }}>Showing {users.length} users</span>
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
                {users.map((u) => (
                  <tr key={u.user_id}>
                    <td>
                      <span className="chk-box" />
                    </td>
                    <td>
                      <div className="person">
                        <div className={`av ${avatarClass(u.user_id)} lg`}>{initials(u.full_name)}</div>
                        <div>
                          <div className="meta-line">
                            {u.full_name}
                            {u.user_id === session.user.user_id && (
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
                      <span className={`role-chip ${u.role_name === "management" ? "admin" : u.role_name === "lecturer" ? "lec" : ""}`}>
                        <span className="icn" />
                        {roleLabel(u.role_name)}
                      </span>
                    </td>
                    <td>
                      <span className="muted">Assignments are managed in Units & Offerings.</span>
                    </td>
                    <td>
                      <span className={`status-dot ${!u.is_active ? "disabled" : u.must_change_password ? "pending" : "active"}`}>
                        <span className="d" />
                        {!u.is_active ? "Disabled" : u.must_change_password ? "Password change required" : "Active"}
                      </span>
                    </td>
                    <td className="last-active">Created {new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <Link to="/admin/staff" className="adm-btn-sm">Manage</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination">
              <span>{users.length} staff accounts</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
