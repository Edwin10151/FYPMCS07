import { Link } from "react-router-dom";
import { roleLabel } from "../api";
import Sidebar from "../components/Sidebar";
import AdminNav from "../components/AdminNav";
import { useAdminContext } from "../useAdminContext";
import "./Admin.css";

export default function Admin() {
  const { session, data, error, loading } = useAdminContext();
  if (!session) return null;
  const assignments = new Map<number, string[]>();
  for (const offering of data?.offerings ?? []) {
    assignments.set(offering.coordinator_id, [...(assignments.get(offering.coordinator_id) ?? []), `${offering.unit_code} (coordinator)`]);
    offering.lecturer_ids.forEach((id) => assignments.set(id, [...(assignments.get(id) ?? []), offering.unit_code]));
  }
  const roleCounts = {
    management: data?.staff.filter((staff) => staff.role_name === "management").length ?? 0,
    coordinator: data?.staff.filter((staff) => staff.role_name === "coordinator").length ?? 0,
    lecturer: data?.staff.filter((staff) => staff.role_name === "lecturer").length ?? 0,
  };
  return <div className="app"><Sidebar user={session.user} /><main className="main">
    <div className="topbar"><div className="crumbs"><Link to="/units">Home</Link><span className="sep">›</span><Link to="/admin/setup">Semester setup</Link><span className="sep">›</span><strong>People & roles</strong></div><div className="top-actions"><Link className="btn primary" to="/admin/staff">+ Add staff</Link></div></div>
    <div className="content"><div className="unit-banner"><div><h1 style={{ fontSize: 26 }}>People & roles</h1><div className="sub">Role access and teaching assignments are shown directly from the development database.</div></div></div>
      <AdminNav counts={{ "/admin": data?.staff.length ?? 0 }} />
      {(error || loading) && <div className="banner"><div className="ico">!</div><div className="body">{error || "Loading staff records..."}</div></div>}
      <div className="role-legend">{(["management", "coordinator", "lecturer"] as const).map((role) => <div key={role} className="rl-card"><div className="top"><span className={`role-chip ${role === "management" ? "admin" : role === "lecturer" ? "lec" : ""}`}>{roleLabel(role)}</span><span className="ct">{roleCounts[role]}</span></div><p>{role === "management" ? "Creates periods, offerings, staff records, and enrolments." : role === "coordinator" ? "Confirms Handbook data and ULO to PLO mapping for assigned offerings." : "Accesses the grade workflow for assigned offerings."}</p></div>)}</div>
      <div className="users-card"><table className="users-tbl"><thead><tr><th>Person</th><th>Role</th><th>Offering assignments</th><th>Status</th><th style={{ textAlign: "right" }}>Manage</th></tr></thead><tbody>{data?.staff.map((staff) => <tr key={staff.user_id}><td><div className="person"><div><div className="meta-line">{staff.full_name}{staff.user_id === session.user.user_id && <span className="tag" style={{ marginLeft: 6, fontSize: 9.5 }}>YOU</span>}</div><div className="em">{staff.staff_id} · {staff.email}</div></div></div></td><td><span className={`role-chip ${staff.role_name === "management" ? "admin" : staff.role_name === "lecturer" ? "lec" : ""}`}>{roleLabel(staff.role_name)}</span></td><td><span className="muted">{assignments.get(staff.user_id)?.join(", ") || "No teaching assignment"}</span></td><td><span className={`status-dot ${!staff.is_active ? "disabled" : staff.must_change_password ? "pending" : "active"}`}><span className="d" />{!staff.is_active ? "Inactive" : staff.must_change_password ? "Password change required" : "Active"}</span></td><td><Link className="adm-btn-sm" to="/admin/staff">Manage</Link></td></tr>)}</tbody></table>{!loading && !data?.staff.length && <div className="adm-empty">No staff records exist yet.</div>}</div>
    </div>
  </main></div>;
}
