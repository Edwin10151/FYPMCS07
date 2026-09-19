import { Navigate } from "react-router-dom";

// The Admin Portal card on UnitSelect now links straight to Semester Setup —
// this route is kept only so an old /admin/portal link still lands somewhere
// useful instead of a dead route.
export default function AdminMain() {
  return <Navigate to="/admin/setup" replace />;
}
