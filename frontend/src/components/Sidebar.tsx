import { Link, NavLink } from "react-router-dom";
import { avatarClass, initials, roleLabel, type SessionUser } from "../api";
import "./Sidebar.css";

const NAV_MAIN = [
  { to: "/dashboard", label: "Dashboard", ic: "i-home" },
  { to: "/mapping", label: "LO ↔ PLO mapping", ic: "i-map" },
  { to: "/assessments", label: "Assessments", ic: "i-ass" },
  { to: "/upload", label: "Grade upload", ic: "i-up" },
];

// Semester setup, People & roles and Settings now live behind the Admin
// Portal (see UnitSelect's "Admin Portal" card + AdminSidebar), not here.
// Left empty rather than removed so the Administration section is easy to
// bring back to this sidebar later.
const NAV_ADMIN: Array<{ to: string; label: string; ic: string; end?: boolean }> = [];

export default function Sidebar({ user }: { user: SessionUser }) {
  return (
    <aside className="side">
      <Link to="/units" className="brand">
      <div className="mark">M</div>
      <div className="name">
        Curriculum
        <br />
        Analytics
        <span className="sub">Faculty of IT</span>
      </div>
      </Link>
      
      <div className="sec">Workspace</div>
      <nav>
        {NAV_MAIN.map(({ to, label, ic }) => (
          <NavLink key={label} to={to} className={({ isActive }) => (isActive ? "active" : "")}>
            <span className={`ic ${ic}`} />
            {label}
          </NavLink>
        ))}
      </nav>

      {user.permission_level >= 30 && (
        <>
          <nav>
            {NAV_ADMIN.map(({ to, label, ic, end }) => (
              <NavLink key={label} to={to} end={end} className={({ isActive }) => (isActive ? "active" : "")}>
                <span className={`ic ${ic}`} />
                {label}
              </NavLink>
            ))}
          </nav>
        </>
      )}

      <div className="user">
        <div className={`av ${avatarClass(user.user_id)}`}>{initials(user.full_name)}</div>
        <div>
          <div>{user.full_name}</div>
          <div className="role">{roleLabel(user.role_name)} · FIT</div>
        </div>
        <div className="chev">›</div>
      </div>
    </aside>
  );
}
