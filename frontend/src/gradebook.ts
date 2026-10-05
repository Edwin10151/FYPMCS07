import type { Assessment } from "./api";

export type ScoreType = "percentage" | "raw";
export type GradeMapping = { csvColumn: string; maxMark: string; scoreType: ScoreType; suggested: boolean };
export type GradeTarget = Assessment & { mappingKey: string; component_id?: number; parentName?: string };
export type GradeColumn = { header: string; task: string; kind: ScoreType | "unknown"; weight: number | null };

export function taskName(header: string): string {
  return header.replace(/\s*\[\d+\]$/, "").replace(/^(Assignment|Quiz|Manual item):\s*/i, "")
    .replace(/\s*\((Real|Percentage|Letter)\)\s*$/i, "")
    .replace(/\(?\s*\d+(?:\.\d+)?\s*%\s*\)?/g, "").replace(/\s+/g, " ").trim();
}

function normalized(name: string): string {
  return taskName(name).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function scoreColumns(headers: string[]): GradeColumn[] {
  return headers.filter((header) => !/\(Letter\)\s*(?:\[\d+\])?$/i.test(header)
    && !/^(group(?:\.|\s|$)|username$|id number$|student[ _](id|number)$|first name$|last name$|email address$|last downloaded|external tool:)/i.test(header)
    && !/(?:\btotal\b|team contribution)/i.test(header)).map((header) => ({
    header, task: taskName(header),
    kind: /\(Percentage\)\s*(?:\[\d+\])?$/i.test(header) ? "percentage" : /\(Real\)\s*(?:\[\d+\])?$/i.test(header) ? "raw" : "unknown",
    weight: header.match(/(\d+(?:\.\d+)?)\s*%/) ? Number(header.match(/(\d+(?:\.\d+)?)\s*%/)![1]) : null,
  }));
}

export function gradeTargets(assessments: Assessment[]): GradeTarget[] {
  return assessments.flatMap((assessment) => assessment.components?.length
    ? assessment.components.map((component) => ({ ...assessment, mappingKey: `component-${component.component_id}`, component_id: component.component_id, parentName: assessment.assessment_name, assessment_name: component.component_name, weight: component.weight }))
    : [{ ...assessment, mappingKey: `assessment-${assessment.assessment_id}` }]);
}

export function emptyMapping(): GradeMapping {
  return { csvColumn: "", maxMark: "", scoreType: "raw", suggested: false };
}

export function mappingForColumn(header: string): GradeMapping {
  const percentage = /\(Percentage\)\s*(?:\[\d+\])?$/i.test(header);
  return { csvColumn: header, maxMark: percentage ? "100" : "", scoreType: percentage ? "percentage" : "raw", suggested: false };
}

export function suggestMappings(assessments: Assessment[], headers: string[]): Record<string, GradeMapping> {
  const columns = scoreColumns(headers);
  const targets = gradeTargets(assessments);
  const proposals = targets.map((target) => {
    const name = normalized(target.assessment_name);
    const words = name.split(" ");
    const eligible = columns.filter((column) => {
      if (/^(Assignment|Quiz):/i.test(column.header) && column.weight === null) return false;
      if (column.weight !== null && column.weight !== Number(target.weight)) return false;
      return true;
    });
    const exact = eligible.filter((column) => normalized(column.task) === name);
    const candidates = exact.length ? exact : target.component_id && words.length >= 2
      ? eligible.filter((column) => words.every((word) => normalized(column.task).split(" ").includes(word))) : [];
    const tasks = new Set(candidates.map((column) => normalized(column.task)));
    if (tasks.size !== 1) return { target, column: null };
    const percentages = candidates.filter((column) => column.kind === "percentage");
    const preferred = percentages.length ? percentages : candidates;
    return { target, column: preferred.length === 1 ? preferred[0] : null };
  });
  return Object.fromEntries(proposals.map(({ target, column }) => {
    const unique = column && proposals.filter((p) => p.column && normalized(p.column.task) === normalized(column.task)).length === 1;
    return [target.mappingKey, unique ? { ...mappingForColumn(column.header), suggested: true } : emptyMapping()];
  }));
}

export function taskKey(header: string): string { return normalized(header); }
