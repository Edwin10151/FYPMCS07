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

function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = loadSession();
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={loadSession() ? "/units" : "/login"} replace />} />
      <Route path="/login" element={<Login />} />
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
      <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
      <Route path="/admin/setup" element={<RequireAuth><AdminSetup /></RequireAuth>} />
      <Route path="/admin/periods" element={<RequireAuth><AdminPeriods /></RequireAuth>} />
      <Route path="/admin/units" element={<RequireAuth><AdminUnits /></RequireAuth>} />
      <Route path="/admin/enrolments" element={<RequireAuth><AdminEnrolments /></RequireAuth>} />
      <Route path="/admin/staff" element={<RequireAuth><AdminStaff /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
