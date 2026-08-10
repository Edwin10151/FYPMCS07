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
  program_code: string;
  program_name: string;
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
    program_name: string;
    year: number;
    period: string;
  };
  stats: { student_count: number; lo_count: number; at_risk_count: number };
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

export type UploadIssue = { row: number; severity: "info" | "warning" | "error"; message: string };

export type UploadResult = {
  filename: string;
  columns: string[];
  row_count: number;
  issues: UploadIssue[];
  status: "valid" | "needs_review";
};

export type ReportSummary = { provider: string; summary: string; note: string };

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

export function validateUpload(token: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<UploadResult>("/uploads/validate", token, { method: "POST", body });
}

export function generateSummary(token: string, offeringId: number) {
  return apiFetch<ReportSummary>(`/reports/summary?offering_id=${offeringId}`, token, { method: "POST" });
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

export function getSelectedUnit() {
  const raw = sessionStorage.getItem("mcs07.selectedUnit");
  return raw ? JSON.parse(raw) : null;
}
