import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import UnitSelect from "./pages/UnitSelect";
import Dashboard from "./pages/Dashboard";
import Mapping from "./pages/Mapping";
import Assessments from "./pages/Assessments";
import CsvUpload from "./pages/CsvUpload";
import Admin from "./pages/Admin";
import AdminSetup from "./pages/AdminSetup";
import AdminPeriods from "./pages/AdminPeriods";
import AdminUnits from "./pages/AdminUnits";
import AdminEnrolments from "./pages/AdminEnrolments";
import AdminStaff from "./pages/AdminStaff";
import { loadSession } from "./api";
import Report from "./pages/Report";
import Settings from "./pages/Settings";
import ChangePassword from "./pages/ChangePassword";

function RequireAuth({ children, allowPasswordChange = false }: { children: React.ReactNode; allowPasswordChange?: boolean }) {
  const session = loadSession();
  if (!session) return <Navigate to="/login" replace />;
  if (session.user.must_change_password && !allowPasswordChange) return <Navigate to="/change-password" replace />;
  return <>{children}</>;
}

function RequireManagement({ children }: { children: React.ReactNode }) {
  const session = loadSession();
  if (!session) return <Navigate to="/login" replace />;
  if (session.user.must_change_password) return <Navigate to="/change-password" replace />;
  if (session.user.permission_level < 30) return <Navigate to="/units" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={loadSession() ? "/units" : "/login"} replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<RequireAuth allowPasswordChange><ChangePassword /></RequireAuth>} />
      <Route path="/units" element={<RequireAuth><UnitSelect /></RequireAuth>} />
      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/reports" element={<RequireAuth><Report /></RequireAuth>} />
      <Route path="/mapping" element={<RequireAuth><Mapping /></RequireAuth>} />
      <Route path="/assessments" element={<RequireAuth><Assessments /></RequireAuth>} />
      <Route path="/upload" element={<RequireAuth><CsvUpload /></RequireAuth>} />
      <Route path="/upload/:assessmentId" element={<Navigate to="/upload" replace />} />
      {/* Admin hub lives at /admin/setup (semester checklist). /admin itself is
          the People & roles directory; the other screens hang off the shared
          AdminNav tabs. */}
      <Route path="/admin" element={<RequireManagement><Admin /></RequireManagement>} />
      <Route path="/admin/setup" element={<RequireManagement><AdminSetup /></RequireManagement>} />
      <Route path="/admin/periods" element={<RequireManagement><AdminPeriods /></RequireManagement>} />
      <Route path="/admin/units" element={<RequireManagement><AdminUnits /></RequireManagement>} />
      <Route path="/admin/enrolments" element={<RequireManagement><AdminEnrolments /></RequireManagement>} />
      <Route path="/admin/staff" element={<RequireManagement><AdminStaff /></RequireManagement>} />
      <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
