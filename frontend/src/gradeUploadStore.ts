/** Persist committed grade uploads per unit (local demo until backend owns this). */

import { ASSESSMENTS } from "./mockData";

const STORAGE_PREFIX = "grades-committed:";

export type CommittedGradeRow = {
  studentId: string;
  firstName: string;
  lastName: string;
  marks: Record<string, number | null>;
};

export type CommittedGrades = {
  unitCode: string;
  fileName: string;
  committedAt: string;
  committedBy: string;
  rowCount: number;
  assessmentIds: string[];
  maxMarks: Record<string, number>;
  rows: CommittedGradeRow[];
};

export function loadCommittedGrades(unitCode: string): CommittedGrades | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${unitCode}`);
    return raw ? (JSON.parse(raw) as CommittedGrades) : null;
  } catch {
    return null;
  }
}

export function saveCommittedGrades(unitCode: string, record: CommittedGrades) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${unitCode}`, JSON.stringify(record));
  } catch {
    // ignore quota / private-mode failures in the mock flow
  }
}

export function clearCommittedGrades(unitCode: string) {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${unitCode}`);
  } catch {
    // ignore
  }
}

export function formatCommittedAt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type BuildInput = {
  unitCode: string;
  fileName: string;
  committedBy: string;
  headers: string[];
  rows: string[][];
  mapping: Record<string, string>;
  maxMarks: Record<string, string>;
  /** Student IDs to include (matched + out-of-range). Unmatched are skipped. */
  includeStudentIds: Set<string>;
};

function parseMark(raw: string): number | null {
  const cleaned = raw.replace(/%/g, "").trim();
  if (!cleaned || cleaned === "-") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Build a committed grades snapshot from the mapped CSV + reconcile include set. */
export function buildCommittedGrades(input: BuildInput): CommittedGrades {
  const idIdx = input.headers.indexOf(input.mapping.student_id ?? "");
  const firstIdx = input.mapping.first_name ? input.headers.indexOf(input.mapping.first_name) : -1;
  const lastIdx = input.mapping.last_name ? input.headers.indexOf(input.mapping.last_name) : -1;

  const markCols = ASSESSMENTS.map((a) => ({
    id: a.id,
    idx: input.headers.indexOf(input.mapping[`mark:${a.id}`] ?? ""),
    max: Number(input.maxMarks[a.id]) || 100,
  })).filter((c) => c.idx >= 0);

  const maxMarks: Record<string, number> = {};
  for (const col of markCols) maxMarks[col.id] = col.max;

  const gradeRows: CommittedGradeRow[] = [];
  for (const row of input.rows) {
    const studentId = (idIdx >= 0 ? row[idIdx] : "").trim();
    if (!studentId || !input.includeStudentIds.has(studentId)) continue;

    const marks: Record<string, number | null> = {};
    for (const col of markCols) {
      marks[col.id] = parseMark(row[col.idx] ?? "");
    }

    gradeRows.push({
      studentId,
      firstName: firstIdx >= 0 ? (row[firstIdx] ?? "").trim() : "",
      lastName: lastIdx >= 0 ? (row[lastIdx] ?? "").trim() : "",
      marks,
    });
  }

  return {
    unitCode: input.unitCode,
    fileName: input.fileName,
    committedAt: new Date().toISOString(),
    committedBy: input.committedBy,
    rowCount: gradeRows.length,
    assessmentIds: markCols.map((c) => c.id),
    maxMarks,
    rows: gradeRows,
  };
}
