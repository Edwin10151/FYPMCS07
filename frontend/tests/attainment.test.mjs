import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/attainment.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { cohortChartData, COHORT_ACHIEVEMENT_TARGET } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const outcome = (average, rate, enrolled = 20) => ({ ulo_code: "ULO1", average_attainment_pct: average, pass_rate_pct: rate, enrolled_count: enrolled, achieved_count: 17 });

test("bar height and colour both use cohort achievement, not average marks", () => {
  const [bar] = cohortChartData([outcome("66.48", "85")]);
  assert.equal(bar.achievement, 85);
  assert.equal(bar.average, 66.48);
  assert.equal(bar.fill, "#16744D");
  assert.equal(bar.passed, "17/20 achieved");
});

test("high average cannot hide a cohort achievement rate below target", () => {
  const [bar] = cohortChartData([outcome("75", "65")]);
  assert.equal(bar.achievement, 65);
  assert.equal(bar.fill, "#A8321C");
});

test("exactly 70 percent meets the inclusive cohort target", () => {
  assert.equal(COHORT_ACHIEVEMENT_TARGET, 70);
  assert.equal(cohortChartData([outcome("60", "70")])[0].fill, "#16744D");
});

test("outcomes without assessed students are not drawn as failures", () => {
  assert.deepEqual(cohortChartData([outcome("0", "0", 0)]), []);
  assert.deepEqual(cohortChartData([]), []);
});
