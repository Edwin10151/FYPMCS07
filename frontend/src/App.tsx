import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import UnitSelect from "./pages/UnitSelect";
import Dashboard from "./pages/Dashboard";
import Mapping from "./pages/Mapping";
import Assessments from "./pages/Assessments";
import GradeUploadSelect from "./pages/GradeUploadSelect";
import CsvUpload from "./pages/CsvUpload";
import Admin from "./pages/Admin";
import { loadSession } from "./api";

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
      <Route path="/mapping" element={<RequireAuth><Mapping /></RequireAuth>} />
      <Route path="/assessments" element={<RequireAuth><Assessments /></RequireAuth>} />
      <Route path="/upload" element={<RequireAuth><GradeUploadSelect /></RequireAuth>} />
      <Route path="/upload/:assessmentId" element={<RequireAuth><CsvUpload /></RequireAuth>} />
      <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
