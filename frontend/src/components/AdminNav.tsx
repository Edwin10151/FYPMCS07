import { NavLink } from "react-router-dom";
import "./AdminNav.css";

// Section-level navigation shared by every /admin screen. `end` is set on the
// routes that are a prefix of the others so they don't stay highlighted.
const ADMIN_TABS = [
  { to: "/admin/setup", label: "Semester Setup" },
  { to: "/admin/periods", label: "Academic Periods" },
  { to: "/admin/units", label: "Units & Offerings" },
  { to: "/admin/enrolments", label: "Student Enrolments" },
  { to: "/admin/staff", label: "Staff Records" },
  { to: "/admin", label: "People & Roles", end: true },
];

export default function AdminNav({ counts = {} }: { counts?: Record<string, string | number> }) {
  return (
    <nav className="h-tabs">
      {ADMIN_TABS.map(({ to, label, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `tab${isActive ? " on" : ""}`}>
          {label}
          {counts[to] !== undefined && <span className="ct">{counts[to]}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
