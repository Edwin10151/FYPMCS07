import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/gradebook.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { taskName, scoreColumns, suggestMappings, mappingForColumn } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const assessment = (name, weight, components = []) => ({ assessment_id: 1, assessment_name: name, weight: String(weight), components });
const vlog1 = "Assignment: Individual Vlog Reflections (Week 5) 5%";
const vlog2 = "Assignment: Individual Vlog Reflections (Week 12) 5%";
const vlogs = assessment("Individual Vlog Reflections", 10, [
  { component_id: 11, component_name: "Week 5 vlog", weight: "5" },
  { component_id: 12, component_name: "Week 12 vlog", weight: "5" },
]);

test("hashed FULL vlogs match distinct percentage columns under one parent", () => {
  const headers = [vlog1, vlog2].flatMap((name) => ["Real", "Percentage", "Letter"].map((kind) => `${name} (${kind})`));
  const mappings = suggestMappings([vlogs], headers);
  assert.equal(mappings["component-11"].csvColumn, `${vlog1} (Percentage)`);
  assert.equal(mappings["component-12"].csvColumn, `${vlog2} (Percentage)`);
  assert.equal(mappings["component-11"].maxMark, "100");
  assert.equal(mappings["component-11"].suggested, true);
});

test("Moodle prefixes and decimal weights are removed without losing the week", () => {
  assert.equal(taskName("Assignment: Reflection Entry 1(2.5%) (Percentage)"), "Reflection Entry 1");
  assert.equal(taskName(`${vlog2} (Percentage)`), "Individual Vlog Reflections (Week 12)");
});

test("S2 slides marked out of 60 still use 100 when percentage is selected", () => {
  const name = "Interim Project Presentation slides Submission";
  const headers = ["Real", "Percentage"].map((kind) => `Assignment: ${name} (5%) (${kind})`);
  const mapping = suggestMappings([assessment(name, 5)], headers)["assessment-1"];
  assert.equal(mapping.scoreType, "percentage");
  assert.equal(mapping.maxMark, "100");
});

test("raw selection requires explicit confirmation of maximum", () => {
  assert.deepEqual(mappingForColumn(`${vlog1} (Real)`), { csvColumn: `${vlog1} (Real)`, maxMark: "", scoreType: "raw", suggested: false });
});

test("totals, letters, group and contribution fields are excluded", () => {
  const headers = ["Unit total (Percentage)", "Ungraded Assessments total (Real)", "Group.2", "ID number", "Assignment: Project Report (Final Team Contribution) (Real)", `${vlog1} (Letter)`, "External tool: Ed Discussion (Percentage)", `${vlog1} (Percentage)`];
  assert.deepEqual(scoreColumns(headers).map((c) => c.header), [`${vlog1} (Percentage)`]);
});

test("unweighted weekly progress columns and mismatched weights stay unselected", () => {
  const progress = "Assignment: Group Project Meeting Minutes & Video (week 4) (Percentage)";
  assert.equal(suggestMappings([assessment(taskName(progress), 5)], [progress])["assessment-1"].csvColumn, "");
  assert.equal(suggestMappings([assessment("Individual Vlog Reflections (Week 5)", 10)], [`${vlog1} (Percentage)`])["assessment-1"].csvColumn, "");
});

test("ambiguous names, duplicate exports and conflicting target matches remain unselected", () => {
  const generic = assessment("Vlogs", 10, [{ component_id: 11, component_name: "Individual Vlog Reflections", weight: "5" }]);
  assert.equal(suggestMappings([generic], [`${vlog1} (Percentage)`, `${vlog2} (Percentage)`])["component-11"].csvColumn, "");
  assert.equal(suggestMappings([vlogs], [`${vlog1} (Percentage)`, `${vlog1} (Percentage) [2]`])["component-11"].csvColumn, "");
  const duplicate = { ...vlogs, components: [vlogs.components[0], { ...vlogs.components[0], component_id: 13 }] };
  assert.equal(suggestMappings([duplicate], [`${vlog1} (Percentage)`])["component-11"].csvColumn, "");
});
