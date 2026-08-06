import { Link, NavLink } from "react-router-dom";
import { avatarClass, initials, roleLabel, type SessionUser } from "../api";
import "./Sidebar.css";

const NAV_MAIN = [
  { to: "/dashboard", label: "Dashboard", ic: "i-home" },
  { to: "/units", label: "Units", ic: "i-units" },
  { to: "/mapping", label: "LO ↔ PLO mapping", ic: "i-map" },
  { to: "/assessments", label: "Assessments", ic: "i-ass" },
  { to: "/upload", label: "Grade upload", ic: "i-up" },
  { to: "/dashboard", label: "Reports", ic: "i-rep" },
];

const NAV_ADMIN = [
  { to: "/admin", label: "Users & roles", ic: "i-users" },
  { to: "/dashboard", label: "Handbook sync", ic: "i-sync" },
  { to: "/dashboard", label: "Settings", ic: "i-set" },
];

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

      <div className="sec">Administration</div>
      <nav>
        {NAV_ADMIN.map(({ to, label, ic }) => (
          <NavLink key={label} to={to} className={({ isActive }) => (isActive ? "active" : "")}>
            <span className={`ic ${ic}`} />
            {label}
          </NavLink>
        ))}
      </nav>

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
