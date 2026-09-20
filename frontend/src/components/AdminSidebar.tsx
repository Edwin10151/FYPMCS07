import { Link, NavLink } from "react-router-dom";
import { avatarClass, initials, roleLabel, type SessionUser } from "../api";

// Dedicated sidebar for the Admin Portal (Semester Setup, Tutor List, Student
// List). Unit workspace pages keep using the regular Sidebar — admin's own
// pages live in a separate nav since they aren't scoped to one offering.
const NAV_ADMIN = [
  { to: "/admin/setup", label: "Semester Setup", ic: "i-sync", end: true },
  { to: "/admin/tutors", label: "Tutor List", ic: "i-users" },
  { to: "/admin/enrolments", label: "Student List", ic: "i-up" },
];

export default function AdminSidebar({ user }: { user: SessionUser }) {
  return (
    <aside className="side">
      <Link to="/admin/units" className="brand">
        <div className="mark">M</div>
        <div className="name">
          Admin
          <br />
          Portal
          <span className="sub">Faculty of IT</span>
        </div>
      </Link>

      <div className="sec">Semester setup</div>
      <nav>
        {NAV_ADMIN.map(({ to, label, ic, end }) => (
          <NavLink key={label} to={to} end={end} className={({ isActive }) => (isActive ? "active" : "")}>
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
        <Link to="/units" className="chev" title="Back to units">↩</Link>
      </div>
    </aside>
  );
}
