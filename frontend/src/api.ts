const API_BASE = "/api";
const SESSION_KEY = "mcs07.session";

export type SessionUser = {
  user_id: number;
  staff_id: string | null;
  full_name: string;
  email: string;
  must_change_password: boolean;
  role_name: string;
  permission_level: number;
};

export type Session = {
  access_token: string;
  token_type: string;
  user: SessionUser;
};

export type Offering = {
  offering_id: number;
  unit_code: string;
  unit_name: string;
  program_codes: string[];
  program_names: string[];
  year: number;
  period: string;
  can_edit: boolean;
  handbook_url: string | null;
  last_scraped_at: string | null;
};

export type LearningOutcome = {
  offering_ulo_id: number;
  ulo_code: string;
  description: string;
  average_attainment_pct: string;
  pass_rate_pct: string;
  enrolled_count: number;
  achieved_count: number;
};

export type DashboardAssessment = {
  assessment_id: number;
  assessment_name: string;
  weight: string;
  max_mark: string;
  covers: string[];
};

export type DashboardPayload = {
  offering: {
    offering_id: number;
    unit_code: string;
    unit_name: string;
    program_names: string[];
    year: number;
    period: string;
  };
  stats: { student_count: number; lo_count: number; at_risk_count: number; student_at_risk_count: number };
  learning_outcomes: LearningOutcome[];
  assessments: DashboardAssessment[];
  report: { report_id: number; ai_summary: string; coordinator_comment: string; is_finalized: boolean } | null;
};

export type MappingPayload = {
  ulos: Array<{ offering_ulo_id: number; ulo_code: string; description: string }>;
  plos: Array<{ plo_id: number; plo_code: string; description: string }>;
  mappings: Array<{ mapping_id: number; offering_ulo_id: number; plo_id: number }>;
};

export type Assessment = {
  assessment_id: number;
  assessment_name: string;
  weight: string;
  max_mark: string;
  is_hurdle: boolean;
  source: string;
  covers: string[];
  allocated_weights: string[];
};

export type HandbookDraft = {
  handbook_import_id: number;
  source_url: string;
  handbook_version: string | null;
  status: "draft" | "confirmed";
  imported_at: string;
  confirmed_at: string | null;
  payload: {
    unit_code: string;
    title: string;
    learning_outcomes: Array<{ code: string; description: string }>;
    assessments: Array<{ name: string; weight: string; is_hurdle: boolean; ulo_codes: string[] }>;
    offering_scope?: { period: string; location: string };
    warnings?: string[];
  };
};

export type AdminUser = {
  user_id: number;
  staff_id: string | null;
  full_name: string;
  email: string;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  role_name: string;
  permission_level: number;
};

export type AdminPeriod = {
  semester_id: number;
  year: number;
  period: "S1" | "S2";
  start_date: string | null;
  end_date: string | null;
  status: "planning" | "active" | "archived";
  offering_count: number;
  student_count: number;
  staff_count: number;
};

export type AdminOffering = {
  offering_id: number;
  semester_id: number;
  program_ids: number[];
  unit_id: number;
  coordinator_id: number;
  coordinator_name: string;
  lecturer_ids: number[];
  status: "draft" | "active" | "discontinued";
  handbook_url: string | null;
  last_scraped_at: string | null;
  unit_code: string;
  unit_name: string;
  replacement_unit_code: string | null;
  program_codes: string[];
  program_names: string[];
  year: number;
  period: string;
  student_count: number;
  committed_grade_upload_count: number;
};

export type AdminContext = {
  periods: AdminPeriod[];
  offerings: AdminOffering[];
  staff: Array<Pick<AdminUser, "user_id" | "staff_id" | "full_name" | "email" | "is_active" | "must_change_password" | "role_name" | "permission_level">>;
  programs: Array<{ program_id: number; program_code: string; program_name: string }>;
  enrollment_batches: Array<{
    enrollment_upload_batch_id: number;
    offering_id: number;
    original_filename: string;
    row_count: number;
    accepted_count: number;
    issue_count: number;
    status: "committed" | "needs_review";
    uploaded_at: string;
    unit_code: string;
    year: number;
    period: string;
    uploaded_by_name: string;
  }>;
};

export type UploadIssue = { row: number; severity: "info" | "warning" | "error"; message: string };

export type CsvInspection = {
  filename: string;
  headers: string[];
  row_count: number;
  sheet_names?: string[];
  selected_sheet?: string | null;
};

export type GradePreview = {
  upload_batch_id: number;
  filename: string;
  row_count: number;
  matched_count: number;
  issues: Array<{ row: number | null; severity: "warning" | "error"; message: string }>;
  status: "valid" | "needs_review";
};

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, token?: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new ApiError(error.detail || "Request failed", response.status);
  }
  return response.json() as Promise<T>;
}

export function login(email: string, password: string) {
  return apiFetch<Session>("/auth/login", undefined, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function changePassword(token: string, currentPassword: string, newPassword: string) {
  return apiFetch<{ status: string }>("/auth/change-password", token, {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export function getOfferings(token: string) {
  return apiFetch<{ offerings: Offering[] }>("/offerings", token);
}

export function getDashboard(token: string, offeringId: number) {
  return apiFetch<DashboardPayload>(`/dashboard?offering_id=${offeringId}`, token);
}

export function getMappings(token: string, offeringId: number) {
  return apiFetch<MappingPayload>(`/mappings?offering_id=${offeringId}`, token);
}

export function saveMappings(token: string, offeringId: number, mappings: Array<{ offering_ulo_id: number; plo_id: number }>) {
  return apiFetch<{ status: string }>("/mappings", token, {
    method: "PUT",
    body: JSON.stringify({ offering_id: offeringId, mappings }),
  });
}

export function getAssessments(token: string, offeringId: number) {
  return apiFetch<{ assessments: Assessment[] }>(`/assessments?offering_id=${offeringId}`, token);
}

export function createHandbookImport(token: string, offeringId: number) {
  return apiFetch<{ import: HandbookDraft }>(`/offerings/${offeringId}/handbook-import`, token, { method: "POST" });
}

export function getLatestHandbookImport(token: string, offeringId: number) {
  return apiFetch<{ import: HandbookDraft | null }>(`/offerings/${offeringId}/handbook-import`, token);
}

export function confirmHandbookImport(token: string, offeringId: number, handbookImportId: number) {
  return apiFetch<{ status: string }>(`/offerings/${offeringId}/handbook-import/confirm`, token, {
    method: "POST",
    body: JSON.stringify({ handbook_import_id: handbookImportId }),
  });
}

export function getAdminUsers(token: string) {
  return apiFetch<{ users: AdminUser[] }>("/admin/users", token);
}

export function getAdminContext(token: string) {
  return apiFetch<AdminContext>("/admin/context", token);
}

export function createAdminPeriod(
  token: string,
  payload: { year: number; period: "S1" | "S2"; start_date: string | null; end_date: string | null; status: "planning" | "active" | "archived" },
) {
  return apiFetch<{ semester_id: number; status: string }>("/admin/periods", token, { method: "POST", body: JSON.stringify(payload) });
}

export function updateAdminPeriod(
  token: string,
  semesterId: number,
  payload: { start_date: string | null; end_date: string | null; status: "planning" | "active" | "archived" },
) {
  return apiFetch<{ status: string }>(`/admin/periods/${semesterId}`, token, { method: "PATCH", body: JSON.stringify(payload) });
}

export type OfferingInput = {
  semester_id: number;
  program_ids: number[];
  unit_code: string;
  unit_name: string;
  coordinator_id: number;
  lecturer_ids: number[];
  status: "draft" | "active" | "discontinued";
  replacement_unit_code?: string | null;
  replacement_unit_name?: string | null;
};

export function createAdminOffering(token: string, payload: OfferingInput) {
  return apiFetch<{ offering_id: number; status: string }>("/admin/offerings", token, { method: "POST", body: JSON.stringify(payload) });
}

export function updateAdminOffering(token: string, offeringId: number, payload: Omit<OfferingInput, "semester_id">) {
  return apiFetch<{ status: string }>(`/admin/offerings/${offeringId}`, token, { method: "PATCH", body: JSON.stringify(payload) });
}

export type OfferingStaffingRow = {
  staffing_id: number;
  role_type: "lecture" | "tutorial" | "laboratory";
  staff_user_id: number | null;
  external_name: string | null;
  external_email: string | null;
  staff_full_name: string | null;
};

export function getOfferingStaffing(token: string, offeringId: number) {
  return apiFetch<{ staffing: OfferingStaffingRow[] }>(`/offerings/${offeringId}/staffing`, token);
}

export function importStaffingRoster(token: string, semesterId: number, file: File) {
  return uploadForm(token, "/admin/staffing/roster-import", { semester_id: String(semesterId) }, file) as Promise<{
    status: string;
    units_in_file: number;
    matched_offerings: number;
    staffing_rows_created: number;
    unmatched_units: Array<{ unit_code: string; unit_name: string; programme_codes: string[] }>;
    warnings: string[];
  }>;
}

export function createAdminUser(
  token: string,
  payload: { staff_id: string; full_name: string; email: string; role_name: "management" | "coordinator" | "lecturer" },
) {
  return apiFetch<{ user: AdminUser; temporary_password: string }>("/admin/users", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createAdminUsers(
  token: string,
  users: Array<{ staff_id: string; full_name: string; email: string; role_name: "management" | "coordinator" | "lecturer" }>,
) {
  return apiFetch<{ accounts: Array<{ user: AdminUser; temporary_password: string }> }>("/admin/users/bulk", token, {
    method: "POST",
    body: JSON.stringify({ users }),
  });
}

export function setAdminUserActive(token: string, userId: number, isActive: boolean) {
  return apiFetch<{ status: string }>(`/admin/users/${userId}`, token, {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive }),
  });
}

export function setAdminUserRole(token: string, userId: number, roleName: "management" | "coordinator" | "lecturer") {
  return apiFetch<{ status: string }>(`/admin/users/${userId}`, token, {
    method: "PATCH",
    body: JSON.stringify({ role_name: roleName }),
  });
}

function uploadForm(token: string, path: string, fields: Record<string, string>, file: File) {
  const body = new FormData();
  Object.entries(fields).forEach(([name, value]) => body.append(name, value));
  body.append("file", file);
  return apiFetch(path, token, { method: "POST", body });
}

export function inspectEnrolmentUpload(token: string, file: File) {
  return uploadForm(token, "/admin/enrolments/inspect", {}, file) as Promise<CsvInspection>;
}

export function previewEnrolmentUpload(token: string, offeringId: number, studentCodeColumn: string, fullNameColumn: string, file: File) {
  return uploadForm(token, "/admin/enrolments/preview", {
    offering_id: String(offeringId), student_code_column: studentCodeColumn, full_name_column: fullNameColumn,
  }, file) as Promise<{ filename: string; row_count: number; accepted_count: number; issues: UploadIssue[]; status: "valid" | "needs_review" }>;
}

export function commitEnrolmentUpload(token: string, offeringId: number, studentCodeColumn: string, fullNameColumn: string, file: File) {
  return uploadForm(token, "/admin/enrolments/commit", {
    offering_id: String(offeringId), student_code_column: studentCodeColumn, full_name_column: fullNameColumn,
  }, file) as Promise<{ status: string; batch_id: number; accepted_count: number }>;
}

export function inspectGradeUpload(token: string, offeringId: number, file: File, sheetName = "") {
  return uploadForm(token, "/grade-uploads/inspect", {
    offering_id: String(offeringId), ...(sheetName ? { sheet_name: sheetName } : {}),
  }, file) as Promise<CsvInspection>;
}

export function previewGradeUpload(
  token: string,
  offeringId: number,
  studentCodeColumn: string,
  assessmentColumns: Array<{ assessment_id: number; csv_column: string; max_mark: number }>,
  file: File,
  sheetName = "",
) {
  return uploadForm(token, "/grade-uploads/preview", {
    offering_id: String(offeringId), student_code_column: studentCodeColumn,
    assessment_columns: JSON.stringify(assessmentColumns), ...(sheetName ? { sheet_name: sheetName } : {}),
  }, file) as Promise<GradePreview>;
}

export function commitGradeUpload(token: string, uploadBatchId: number) {
  return apiFetch<{ status: string; grades_saved: number; attainment_records: number }>(`/grade-uploads/${uploadBatchId}/commit`, token, { method: "POST" });
}

export function isForbidden(error: unknown) {
  return error instanceof ApiError && error.status === 403;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export function loadSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session, remember: boolean) {
  const raw = JSON.stringify(session);
  if (remember) {
    localStorage.setItem(SESSION_KEY, raw);
  } else {
    sessionStorage.setItem(SESSION_KEY, raw);
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export function initials(fullName: string) {
  const parts = fullName.replace(/^(Dr\.|Prof\.|A\/Prof\.|Mr\.|Ms\.|Mrs\.)\s*/i, "").split(" ").filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "U";
}

export function avatarClass(userId: number) {
  return `a${(userId % 7) + 1}`;
}

const OFFERING_KEY = "mcs07.offeringId";

export function getCurrentOfferingId(): number | null {
  const raw = sessionStorage.getItem(OFFERING_KEY);
  return raw ? Number(raw) : null;
}

export function setCurrentOfferingId(offeringId: number) {
  sessionStorage.setItem(OFFERING_KEY, String(offeringId));
}

export function roleLabel(roleName: string) {
  if (roleName === "coordinator") return "Unit Coordinator";
  if (roleName === "lecturer") return "Lecturer";
  if (roleName === "management") return "Management";
  return roleName;
}
