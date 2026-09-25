import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import UnitSelect from "./pages/UnitSelect";
import Dashboard from "./pages/Dashboard";
import Mapping from "./pages/Mapping";
import Assessments from "./pages/Assessments";
import CsvUpload from "./pages/CsvUpload";
import Report from "./pages/Report";
import Admin from "./pages/Admin";
import AdminMain from "./pages/AdminMain";
import AdminSetup from "./pages/AdminSetup";
import AdminTutors from "./pages/AdminTutors";
import AdminPeriods from "./pages/AdminPeriods";
import AdminEnrolments from "./pages/AdminEnrolments";
import AdminStaff from "./pages/AdminStaff";
import { loadSession } from "./api";
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
      <Route path="/mapping" element={<RequireAuth><Mapping /></RequireAuth>} />
      <Route path="/assessments" element={<RequireAuth><Assessments /></RequireAuth>} />
      <Route path="/upload" element={<RequireAuth><CsvUpload /></RequireAuth>} />
      <Route path="/upload/:assessmentId" element={<Navigate to="/upload" replace />} />
      <Route path="/report" element={<RequireAuth><Report /></RequireAuth>} />
      {/* Admin Portal lives at /admin/portal (UnitSelect's "Admin Portal" card
          links here) and fans out to Semester Setup, Tutor List and Student
          List, each using AdminSidebar. /admin, /admin/periods and
          /admin/staff are kept reachable but are no longer linked from
          navigation — see Sidebar's emptied Administration section. Units &
          Offerings (/admin/units) was removed outright. */}
      <Route path="/admin/portal" element={<RequireManagement><AdminMain /></RequireManagement>} />
      <Route path="/admin" element={<RequireManagement><Admin /></RequireManagement>} />
      <Route path="/admin/setup" element={<RequireManagement><AdminSetup /></RequireManagement>} />
      <Route path="/admin/tutors" element={<RequireManagement><AdminTutors /></RequireManagement>} />
      <Route path="/admin/periods" element={<RequireManagement><AdminPeriods /></RequireManagement>} />
      <Route path="/admin/enrolments" element={<RequireManagement><AdminEnrolments /></RequireManagement>} />
      <Route path="/admin/staff" element={<RequireManagement><AdminStaff /></RequireManagement>} />
      <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
