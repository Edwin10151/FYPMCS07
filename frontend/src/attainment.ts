import type { LearningOutcome } from "./api";

export const STUDENT_ACHIEVEMENT_CUTOFF = 50;
export const COHORT_ACHIEVEMENT_TARGET = 70;

export function cohortChartData(outcomes: LearningOutcome[]) {
  return outcomes.filter(outcome => outcome.enrolled_count > 0).map(outcome => ({
    lo: outcome.ulo_code,
    achievement: Number(outcome.pass_rate_pct),
    average: Number(outcome.average_attainment_pct),
    passed: `${outcome.achieved_count}/${outcome.enrolled_count} achieved`,
    fill: Number(outcome.pass_rate_pct) < COHORT_ACHIEVEMENT_TARGET ? "#A8321C" : "#16744D",
  }));
}
