// Shared static/dummy content used while the frontend is previewed without a
// backend. Mirrors the original design's sample data (FIT2004 · S1 2026).
// Swap these out for real API calls (see src/api.ts) once the backend is live.

export const ULOS = ["LO 1", "LO 2", "LO 3", "LO 4"];

export const ULO_TEXT = [
  "Analyse general problem solving strategies and algorithmic paradigms, and apply them to solving new problems.",
  "Prove correctness of programs, analyse their space and time complexities.",
  "Compare and contrast various abstract data types and use them appropriately.",
  "Develop and implement algorithms to solve computational problems.",
];

export const ULO_SHORT = ["Algorithmic paradigms", "Correctness & complexity", "Abstract data types", "Implementation"];

export type Plo = { id: string; cat: string; text: string };

export const PLOS: Plo[] = [
  { id: "PLO 1", cat: "FOUNDATIONS", text: "Apply mathematical and computational foundations to model and solve problems in information technology." },
  { id: "PLO 2", cat: "DESIGN", text: "Design and implement reliable software solutions using appropriate algorithms and data structures." },
  { id: "PLO 3", cat: "ANALYSIS", text: "Analyse system behaviour using rigorous methods including formal proof and empirical evaluation." },
  { id: "PLO 4", cat: "PROFESSIONAL", text: "Communicate technical content effectively across written, visual, and oral channels to diverse audiences." },
  { id: "PLO 5", cat: "SYSTEMS", text: "Evaluate and select abstract data types and architectures appropriate to a given problem context." },
  { id: "PLO 6", cat: "PROBLEM-SOLVING", text: "Decompose ill-defined problems into tractable sub-problems and devise principled solutions." },
  { id: "PLO 7", cat: "RESEARCH", text: "Investigate current research literature to inform engineering decisions and identify open questions." },
  { id: "PLO 8", cat: "PRACTICE", text: "Demonstrate professional and ethical practice in the development and deployment of IT artefacts." },
];

export type MockHurdle = { type: string; description: string };
export type MockAssessment = {
  rowKey: string;
  id: string;
  category: string;
  name: string;
  weight: number;
  outcomes: number[];
  hurdle: MockHurdle;
};

export const ASSESSMENTS: MockAssessment[] = [
  {
    rowKey: "r1",
    id: "A1",
    category: "Artefact",
    name: "Weekly problem sets",
    weight: 15,
    outcomes: [1, 3],
    hurdle: { type: "None", description: "" },
  },
  {
    rowKey: "r2",
    id: "A2",
    category: "Artefact",
    name: "Assignment 1 — Complexity proofs",
    weight: 20,
    outcomes: [2, 1],
    hurdle: { type: "Threshold", description: "This task is part of the in-semester assessment hurdle." },
  },
  {
    rowKey: "r3",
    id: "A3",
    category: "Artefact",
    name: "Assignment 2 — Implementation project",
    weight: 25,
    outcomes: [3, 2, 4],
    hurdle: { type: "Threshold", description: "This task is part of the in-semester assessment hurdle." },
  },
  {
    rowKey: "r-ex",
    id: "EX",
    category: "Examination",
    name: "Final examination",
    weight: 40,
    outcomes: [1, 2, 3, 4],
    hurdle: { type: "Hurdle", description: "A minimum mark of 40% in this task is required to pass the unit." },
  },
];

export type MockUnit = {
  code: string;
  name: string;
  sem: string;
  role: "coord" | "lec";
  roleLabel: string;
  students: number;
  attainment: number;
  risk: number;
  current: boolean;
};

export const UNITS: MockUnit[] = [
  { code: "FIT2004", name: "Algorithms and Data Structures", sem: "Semester 1 2026", role: "coord", roleLabel: "Unit Coordinator", students: 287, attainment: 74, risk: 2, current: true },
  { code: "FIT3155", name: "Advanced Data Structures & Algorithms", sem: "Semester 1 2026", role: "coord", roleLabel: "Unit Coordinator", students: 142, attainment: 81, risk: 0, current: true },
  { code: "FIT2086", name: "Modelling for Data Analysis", sem: "Semester 1 2026", role: "lec", roleLabel: "Lecturer", students: 210, attainment: 68, risk: 3, current: true },
  { code: "FIT1045", name: "Introduction to Programming", sem: "Semester 2 2025", role: "lec", roleLabel: "Lecturer", students: 305, attainment: 79, risk: 1, current: false },
];

export const LOS = [
  { code: "LO 1", text: "Analyse general problem-solving strategies and algorithmic paradigms, and apply them to solving new problems.", pct: 83, passed: 238, mean: 68, risk: false },
  { code: "LO 2", text: "Prove correctness of programs; analyse their space and time complexities.", pct: 62, passed: 178, mean: 54, risk: true },
  { code: "LO 3", text: "Compare and contrast various abstract data types and use them appropriately.", pct: 88, passed: 253, mean: 71, risk: false },
  { code: "LO 4", text: "Develop and implement algorithms to solve computational problems.", pct: 58, passed: 166, mean: 51, risk: true },
];

export const DIST = [
  { lo: "LO 1", label: "Algorithmic paradigms", bars: [{ cls: "hd", w: 18 }, { cls: "d", w: 31 }, { cls: "c", w: 24 }, { cls: "p", w: 10 }, { cls: "f", w: 17 }], pass: "83%", mean: "μ 68", sd: "σ 14", delta: "—", deltaOk: null as boolean | null },
  { lo: "LO 2", label: "Correctness & complexity", bars: [{ cls: "hd", w: 9 }, { cls: "d", w: 18 }, { cls: "c", w: 21 }, { cls: "p", w: 14 }, { cls: "f", w: 38 }], pass: "62%", mean: "μ 54", sd: "σ 18", delta: "↓ 9", deltaOk: false as boolean | null },
  { lo: "LO 3", label: "Abstract data types", bars: [{ cls: "hd", w: 24 }, { cls: "d", w: 32 }, { cls: "c", w: 22 }, { cls: "p", w: 10 }, { cls: "f", w: 12 }], pass: "88%", mean: "μ 71", sd: "σ 12", delta: "↑ 3", deltaOk: true as boolean | null },
  { lo: "LO 4", label: "Implementation", bars: [{ cls: "hd", w: 7 }, { cls: "d", w: 15 }, { cls: "c", w: 20 }, { cls: "p", w: 16 }, { cls: "f", w: 42 }], pass: "58%", mean: "μ 51", sd: "σ 19", delta: "↓ 7", deltaOk: false as boolean | null },
];

export const DASHBOARD_ASSESSMENTS = [
  { name: "Weekly problem sets", meta: "10 × 1.5% · auto-graded", weight: "15%", covers: ["LO1", "LO3"], submitted: "287/287", ok: true },
  { name: "A1 — Complexity proofs", meta: "Wk 6 · written", weight: "20%", covers: ["LO1", "LO2"], submitted: "285/287", ok: true },
  { name: "A2 — Implementation project", meta: "Wk 11 · code + report", weight: "25%", covers: ["LO2", "LO3", "LO4"], submitted: "281/287", ok: true },
  { name: "Final examination", meta: "3 hr · invigilated", weight: "40%", covers: ["LO1", "LO2", "LO3", "LO4"], submitted: "Pending", ok: false },
];

export const TREND = [
  { sem: "S1 · 2024", v: "71", now: false },
  { sem: "S2 · 2024", v: "73", now: false },
  { sem: "S2 · 2025", v: "78", now: false },
  { sem: "S1 · 2026 · NOW", v: "74", now: true },
];

export const AI_SUMMARY_DEMO =
  "LO 2 (Correctness & complexity) and LO 4 (Implementation) are the primary risk areas this semester, both sitting below the 70% pass-rate threshold. 41 students (14.3% of the cohort) are failing at least one learning outcome. Consider adding a targeted workshop on complexity proofs before the final exam.";

export const UPLOAD_STATUS: Record<string, { state: string; label: string; detail: string }> = {
  A1: { state: "uploaded", label: "Uploaded", detail: "287 grades · 11 May 2026" },
  A2: { state: "draft", label: "Draft saved", detail: "3 rows awaiting review" },
};

/** Demo enrolment list used by the grade-upload reconcile step. */
export const MOCK_COHORT: Array<{ studentId: string; firstName: string; lastName: string }> = [
  { studentId: "33520917", firstName: "Yuan", lastName: "Chuah" },
  { studentId: "34428313", firstName: "Wen", lastName: "Lim" },
  { studentId: "35029722", firstName: "Edwin", lastName: "Ting" },
  { studentId: "35101423", firstName: "Sharmanne", lastName: "Yeoh" },
  { studentId: "31880011", firstName: "Alex", lastName: "Tan" },
  { studentId: "31880022", firstName: "Priya", lastName: "Nair" },
  { studentId: "31910033", firstName: "Jordan", lastName: "Lee" },
];

export const RECON_ROWS = [
  { cls: "warn", icon: "!", iconCls: "warn", name: "Aaron J. Pereira", email: "aaron.pereira@student.monash.edu", csvRow: "row 47 · student_id 31882104", detected: "104", computed: "cap to 100", reason: "Mark exceeds max", reasonCls: "w", action: "Cap at 100 →" },
  { cls: "warn", icon: "!", iconCls: "warn", name: "Mei Lin Chua", email: "mei.chua@student.monash.edu", csvRow: "row 112 · student_id 31903456", detected: "102", computed: "cap to 100", reason: "Mark exceeds max", reasonCls: "w", action: "Cap at 100 →" },
  { cls: "warn", icon: "!", iconCls: "warn", name: "Noah Krishnan", email: "noah.krishnan@student.monash.edu", csvRow: "row 199 · student_id 31998021", detected: "105", computed: "cap to 100", reason: "Mark exceeds max (bonus credit?)", reasonCls: "w", action: "Cap at 100 →" },
  { cls: "err", icon: "✕", iconCls: "err", name: "—", email: "student_id 31774500 — not in cohort", csvRow: "row 215", detected: "82", computed: "skip", reason: "Student ID not enrolled in S1 2026", reasonCls: "", action: "Search cohorts →" },
  { cls: "err", icon: "✕", iconCls: "err", name: "—", email: 'malformed: "stuID 318..."', csvRow: "row 256", detected: "61", computed: "skip", reason: "Student ID could not be parsed", reasonCls: "", action: "Edit row →" },
];

export const RECON_TABS = [
  { label: "Matched", count: 281, cls: "" },
  { label: "Needs review", count: 3, cls: "warn", active: true },
  { label: "Unmatched", count: 2, cls: "risk" },
  { label: "Missing", count: 6, cls: "" },
  { label: "All rows", count: 292, cls: "", right: true },
];

export type RoleCardItem = string | { no: true; text: string };
export type RoleCard = { chip: "admin" | "coord" | "lec" | "ext"; label: string; count: string; desc: string; can: RoleCardItem[] };

export const ROLE_CARDS: RoleCard[] = [
  {
    chip: "admin",
    label: "Faculty admin",
    count: "2 ppl",
    desc: "Manages users, roles, and faculty-wide settings. Can do anything in this tool.",
    can: ["Invite & remove users", "Edit all units & mappings", "Approve handbook syncs"],
  },
  {
    chip: "coord",
    label: "Unit coordinator",
    count: "11 ppl",
    desc: "Owns one or more units. Manages mappings and the lecturers for those units.",
    can: ["Edit LO ↔ PLO mapping", "Add lecturers to their units", "Publish reports & AI summaries"],
  },
  {
    chip: "lec",
    label: "Lecturer",
    count: "22 ppl",
    desc: "Sets up assessments and uploads grades for units they teach.",
    can: ["Configure assessments & weights", "Upload & reconcile grade CSVs", { no: true, text: "Edit mappings (view only)" }],
  },
  {
    chip: "ext",
    label: "External reviewer",
    count: "3 ppl",
    desc: "Read-only access for accreditation reviewers. Time-bound and scoped.",
    can: ["View published reports", { no: true, text: "Edit anything" }, { no: true, text: "Download student-level data" }],
  },
];

export type MockAdminUser = {
  av: string;
  init: string;
  name: string;
  you?: boolean;
  email: string;
  chip: "admin" | "coord" | "lec" | "ext";
  chipLabel: string;
  units: Array<{ label: string; cls: string }>;
  more?: string;
  status: "active" | "pending" | "disabled";
  lastActive: string;
};

export const ADMIN_USERS: MockAdminUser[] = [
  { av: "a4", init: "SR", name: "A/Prof. Sara Rashid", you: true, email: "sara.rashid@monash.edu", chip: "admin", chipLabel: "Faculty admin", units: [{ label: "All FIT", cls: "navy" }], status: "active", lastActive: "Just now" },
  { av: "a2", init: "EC", name: "Dr. Elise Chen", email: "elise.chen@monash.edu", chip: "coord", chipLabel: "Unit coordinator", units: [{ label: "FIT2004", cls: "navy" }, { label: "FIT3155", cls: "navy" }], more: "+1", status: "active", lastActive: "15 min ago" },
  { av: "a6", init: "JT", name: "Dr. James Truong", email: "james.truong@monash.edu", chip: "lec", chipLabel: "Lecturer", units: [{ label: "FIT2004", cls: "navy" }, { label: "FIT2086", cls: "navy" }], status: "active", lastActive: "2 hr ago" },
  { av: "a3", init: "MO", name: "Dr. Mariam Obi", email: "mariam.obi@monash.edu", chip: "coord", chipLabel: "Unit coordinator", units: [{ label: "FIT3179", cls: "navy" }, { label: "FIT5147", cls: "navy" }], status: "active", lastActive: "Yesterday" },
  { av: "a5", init: "DR", name: "Daniel Rodríguez", email: "daniel.rodriguez@monash.edu", chip: "lec", chipLabel: "Lecturer", units: [{ label: "FIT1045", cls: "navy" }, { label: "FIT1051", cls: "navy" }], more: "+2", status: "active", lastActive: "2 days ago" },
  { av: "a1", init: "PK", name: "Prof. Priya Kapadia", email: "priya.kapadia@external.accred.org", chip: "ext", chipLabel: "External reviewer", units: [{ label: "EXPIRES 30 JUN", cls: "warn" }], status: "active", lastActive: "04 May 2026" },
  { av: "a7", init: "WN", name: "Dr. Will Nakamura", email: "will.nakamura@monash.edu", chip: "lec", chipLabel: "Lecturer", units: [{ label: "FIT2099", cls: "navy" }], status: "pending", lastActive: "—" },
  { av: "a2", init: "AL", name: "Dr. Anna Lindqvist", email: "anna.lindqvist@monash.edu", chip: "lec", chipLabel: "Lecturer", units: [{ label: "No units", cls: "plain" }], status: "disabled", lastActive: "12 Feb 2025" },
];

export const HANDBOOK_DIFF = [
  { lo: "LO 2", label: ULO_SHORT[1], oldText: "Analyse the correctness and time complexity of iterative algorithms.", newText: ULO_TEXT[1] },
  { lo: "LO 4", label: ULO_SHORT[3], oldText: "Implement fundamental data structures in a general-purpose programming language.", newText: ULO_TEXT[3] },
];

// 'on' | 'sug' | 'removed' | null
export const MAPPING_INIT: Record<string, "on" | "sug" | "removed"> = {
  "PLO 1,LO 1": "on",
  "PLO 1,LO 2": "on",
  "PLO 2,LO 1": "on",
  "PLO 2,LO 2": "on",
  "PLO 2,LO 3": "on",
  "PLO 2,LO 4": "on",
  "PLO 3,LO 2": "sug",
  "PLO 5,LO 3": "on",
  "PLO 5,LO 4": "sug",
  "PLO 6,LO 1": "on",
  "PLO 6,LO 4": "on",
  "PLO 7,LO 2": "removed",
};

/* ============================================================
   Administration — academic periods, unit offerings, staff
   records and enrolment batches. These back the faculty-admin
   screens (semester setup, periods, units, enrolments, staff).
   ============================================================ */

export type PeriodStatus = "active" | "planning" | "archived";

export type AcademicPeriod = {
  id: string;
  year: number;
  period: string;
  label: string;
  status: PeriodStatus;
  teachingStart: string;
  teachingEnd: string;
  unitCount: number;
  studentCount: number;
  staffCount: number;
};

// Teaching periods offered by the faculty — drives the "Add period" form.
export const TEACHING_PERIODS = ["Semester 1", "Semester 2", "Summer Semester A", "Summer Semester B", "Winter Semester"];

// "Semester 1" → "S1", "Summer Semester A" → "SSA" — keeps generated period
// labels ("2026 S1") consistent with how they're written across the app.
export function periodShortCode(period: string) {
  if (/^Semester (\d)/i.test(period)) return `S${period.match(/^Semester (\d)/i)![1]}`;
  return period
    .split(/\s+/)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export const ACADEMIC_PERIODS: AcademicPeriod[] = [
  { id: "2026-S2", year: 2026, period: "Semester 2", label: "2026 S2", status: "planning", teachingStart: "2026-07-20", teachingEnd: "2026-10-23", unitCount: 6, studentCount: 0, staffCount: 5 },
  { id: "2026-S1", year: 2026, period: "Semester 1", label: "2026 S1", status: "active", teachingStart: "2026-03-02", teachingEnd: "2026-06-05", unitCount: 18, studentCount: 1284, staffCount: 32 },
  { id: "2025-S2", year: 2025, period: "Semester 2", label: "2025 S2", status: "archived", teachingStart: "2025-07-21", teachingEnd: "2025-10-24", unitCount: 17, studentCount: 1196, staffCount: 30 },
  { id: "2025-S1", year: 2025, period: "Semester 1", label: "2025 S1", status: "archived", teachingStart: "2025-03-03", teachingEnd: "2025-06-06", unitCount: 16, studentCount: 1142, staffCount: 28 },
];

export type StaffRole = "coordinator" | "lecturer" | "tutor" | "admin";
export type StaffStatus = "active" | "pending" | "inactive";

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  coordinator: "Unit coordinator",
  lecturer: "Lecturer",
  tutor: "Tutor",
  admin: "Faculty admin",
};

export type StaffRecord = {
  staffId: string;
  name: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  addedOn: string;
};

export const STAFF_RECORDS: StaffRecord[] = [
  { staffId: "1002456", name: "A/Prof. Sara Rashid", email: "sara.rashid@monash.edu", role: "admin", status: "active", addedOn: "2023-01-16" },
  { staffId: "1004821", name: "Dr. Elise Chen", email: "elise.chen@monash.edu", role: "coordinator", status: "active", addedOn: "2023-02-06" },
  { staffId: "1007733", name: "Dr. James Truong", email: "james.truong@monash.edu", role: "lecturer", status: "active", addedOn: "2024-01-22" },
  { staffId: "1008190", name: "Dr. Mariam Obi", email: "mariam.obi@monash.edu", role: "coordinator", status: "active", addedOn: "2024-02-12" },
  { staffId: "1009044", name: "Daniel Rodríguez", email: "daniel.rodriguez@monash.edu", role: "lecturer", status: "active", addedOn: "2024-07-15" },
  { staffId: "1011276", name: "Dr. Will Nakamura", email: "will.nakamura@monash.edu", role: "lecturer", status: "pending", addedOn: "2026-05-04" },
  { staffId: "1011302", name: "Dr. Anna Lindqvist", email: "anna.lindqvist@monash.edu", role: "lecturer", status: "inactive", addedOn: "2024-02-19" },
  { staffId: "1011488", name: "Yi Ling Tan", email: "yiling.tan@monash.edu", role: "tutor", status: "active", addedOn: "2026-02-24" },
];

export type UnitStatus = "active" | "draft" | "discontinued";

export type UnitStaffLink = { staffId: string; role: StaffRole };

export type UnitOffering = {
  rowKey: string;
  code: string;
  name: string;
  periodId: string;
  creditPoints: number;
  studentCount: number;
  status: UnitStatus;
  // Set when a unit code has been superseded (e.g. FIT3161 → FIT3162), so the
  // lineage stays visible instead of the old offering silently disappearing.
  replacedBy: string | null;
  handbookSynced: boolean;
  staff: UnitStaffLink[];
};

export const UNIT_OFFERINGS: UnitOffering[] = [
  { rowKey: "u1", code: "FIT2004", name: "Algorithms and Data Structures", periodId: "2026-S1", creditPoints: 6, studentCount: 287, status: "active", replacedBy: null, handbookSynced: true, staff: [{ staffId: "1004821", role: "coordinator" }, { staffId: "1007733", role: "lecturer" }, { staffId: "1011488", role: "tutor" }] },
  { rowKey: "u2", code: "FIT3155", name: "Advanced Data Structures & Algorithms", periodId: "2026-S1", creditPoints: 6, studentCount: 142, status: "active", replacedBy: null, handbookSynced: true, staff: [{ staffId: "1004821", role: "coordinator" }] },
  { rowKey: "u3", code: "FIT2086", name: "Modelling for Data Analysis", periodId: "2026-S1", creditPoints: 6, studentCount: 210, status: "active", replacedBy: null, handbookSynced: true, staff: [{ staffId: "1008190", role: "coordinator" }, { staffId: "1007733", role: "lecturer" }] },
  { rowKey: "u4", code: "FIT3161", name: "Computer Science Project 1", periodId: "2026-S1", creditPoints: 6, studentCount: 96, status: "discontinued", replacedBy: "FIT3164", handbookSynced: true, staff: [{ staffId: "1008190", role: "coordinator" }] },
  { rowKey: "u5", code: "FIT1045", name: "Introduction to Programming", periodId: "2026-S1", creditPoints: 6, studentCount: 305, status: "active", replacedBy: null, handbookSynced: false, staff: [{ staffId: "1009044", role: "lecturer" }] },
  { rowKey: "u6", code: "FIT3164", name: "Computer Science Project 2", periodId: "2026-S2", creditPoints: 12, studentCount: 0, status: "draft", replacedBy: null, handbookSynced: false, staff: [] },
  { rowKey: "u7", code: "FIT2099", name: "Object Oriented Design and Implementation", periodId: "2026-S2", creditPoints: 6, studentCount: 0, status: "draft", replacedBy: null, handbookSynced: false, staff: [{ staffId: "1011276", role: "lecturer" }] },
  { rowKey: "u8", code: "FIT2004", name: "Algorithms and Data Structures", periodId: "2025-S2", creditPoints: 6, studentCount: 264, status: "active", replacedBy: null, handbookSynced: true, staff: [{ staffId: "1004821", role: "coordinator" }] },
];

export type BatchStatus = "committed" | "needs_review";

export type EnrolmentBatch = {
  batchId: string;
  periodId: string;
  unitCode: string;
  fileName: string;
  studentCount: number;
  issues: number;
  uploadedBy: string;
  uploadedAt: string;
  status: BatchStatus;
};

export const ENROLMENT_BATCHES: EnrolmentBatch[] = [
  { batchId: "B-2026-0041", periodId: "2026-S1", unitCode: "FIT2004", fileName: "FIT2004_S1-2026_enrolments.csv", studentCount: 287, issues: 0, uploadedBy: "A/Prof. Sara Rashid", uploadedAt: "2026-03-02 09:14", status: "committed" },
  { batchId: "B-2026-0040", periodId: "2026-S1", unitCode: "FIT3155", fileName: "FIT3155_S1-2026_enrolments.csv", studentCount: 142, issues: 0, uploadedBy: "A/Prof. Sara Rashid", uploadedAt: "2026-03-02 09:02", status: "committed" },
  { batchId: "B-2026-0039", periodId: "2026-S1", unitCode: "FIT2086", fileName: "FIT2086_S1-2026_enrolments.csv", studentCount: 210, issues: 4, uploadedBy: "A/Prof. Sara Rashid", uploadedAt: "2026-03-01 16:47", status: "needs_review" },
  { batchId: "B-2025-0112", periodId: "2025-S2", unitCode: "FIT2004", fileName: "FIT2004_S2-2025_enrolments.csv", studentCount: 264, issues: 0, uploadedBy: "A/Prof. Sara Rashid", uploadedAt: "2025-07-21 08:35", status: "committed" },
];
