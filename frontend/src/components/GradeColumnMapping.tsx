import { Link } from "react-router-dom";
import type { Assessment, GradePreview } from "../api";
import { emptyMapping, gradeTargets, mappingForColumn, scoreColumns, taskKey, type GradeMapping } from "../gradebook";

type Props = {
  assessments: Assessment[];
  headers: string[];
  mappings: Record<string, GradeMapping>;
  onChange: (key: string, mapping: GradeMapping) => void;
};

export default function GradeColumnMapping({ assessments, headers, mappings, onChange }: Props) {
  const columns = scoreColumns(headers);
  const tasks = [...new Set(columns.map((c) => c.task))];
  return <div className="grade-assessment-groups">{assessments.map((assessment) => <section className="grade-assessment-group" key={assessment.assessment_id}>
    <div className="grade-assessment-heading"><div><h4>{assessment.assessment_name}</h4><span>{assessment.weight}% of the unit grade{assessment.components.length ? ` · ${assessment.components.length} components` : ""}</span></div><Link className="btn ghost" to="/assessments">{assessment.components.length ? "Manage components" : "Set up components"}</Link></div>
    {gradeTargets([assessment]).map((target) => {
      const mapping = mappings[target.mappingKey] ?? emptyMapping();
      const selected = columns.find((c) => c.header === mapping.csvColumn);
      const usedTasks = Object.entries(mappings).filter(([key, m]) => key !== target.mappingKey && m.csvColumn).map(([, m]) => taskKey(m.csvColumn));
      const weightMismatch = selected?.weight !== null && selected?.weight !== undefined && selected.weight !== Number(target.weight);
      return <div className="col-edit" key={target.mappingKey}>
        <div><div className="src-lbl">{target.component_id ? "Component" : "Assessment"} · {target.weight}% of unit grade</div><div className="src">{target.assessment_name}</div><div className="field-hint">{mapping.suggested ? "Suggested match — review the selected task before validating." : "Choose one score representation for this task."}</div></div>
        <div><label className="field-hint" htmlFor={`column-${target.mappingKey}`}>Gradebook score column</label><select id={`column-${target.mappingKey}`} className="map-select" value={mapping.csvColumn} onChange={(event) => onChange(target.mappingKey, mappingForColumn(event.target.value))}>
          <option value="">Do not import this {target.component_id ? "component" : "assessment"}</option>
          {tasks.map((task) => <optgroup label={task} key={task}>{columns.filter((c) => c.task === task).map((column) => <option key={column.header} value={column.header} disabled={usedTasks.includes(taskKey(column.header))}>{column.header}</option>)}</optgroup>)}
        </select>
        {mapping.csvColumn && <div className="max-marks">
          {selected?.kind === "unknown" && <label className="score-format">Score format<select className="map-select" value={mapping.scoreType} onChange={(event) => onChange(target.mappingKey, { ...mapping, scoreType: event.target.value as "raw" | "percentage", maxMark: event.target.value === "percentage" ? "100" : "", suggested: false })}><option value="raw">Raw marks</option><option value="percentage">Percentage (0–100)</option></select></label>}
          {mapping.scoreType === "percentage" ? <div className="score-scale">Percentage · marked out of <strong>100</strong></div> : <label className="max-marks-row"><span className="field-hint">Raw score marked out of</span><input aria-label={`Raw maximum for ${target.assessment_name}`} className="max-marks-input" type="number" min="0.01" max="9999.99" step="0.01" placeholder="Confirm maximum" value={mapping.maxMark} onChange={(event) => onChange(target.mappingKey, { ...mapping, maxMark: event.target.value })} /></label>}
          {weightMismatch && <p className="grade-mapping-error">The column says {selected?.weight}%, but this task is configured as {target.weight}%. Check the column or assessment setup.</p>}
          {selected?.weight === null && <p className="field-hint">No unit weight is stated in this column. Confirm this task belongs to the assessment before importing.</p>}
        </div>}</div>
      </div>;
    })}
    {assessment.components.length > 0 && <div className="grade-component-total">Component weights: <strong>{assessment.components.reduce((sum, c) => sum + Number(c.weight), 0).toFixed(2)}% / {assessment.weight}%</strong></div>}
    <p className="field-hint">Unmapped or blank scores retain saved results. Missing components keep the combined assessment incomplete.</p>
  </section>)}</div>;
}

export function MappingSummary({ assessments, mappings }: Pick<Props, "assessments" | "mappings">) {
  const targets = gradeTargets(assessments).filter((t) => mappings[t.mappingKey]?.csvColumn);
  return <div className="mapping-summary"><h4>Selected scores and marking scales</h4><div className="mapping-summary-scroll"><table className="recon-tbl"><thead><tr><th>Assessment / component</th><th>Source column</th><th>Score format</th><th>Marked out of</th><th>Unit weight</th></tr></thead><tbody>{targets.map((target) => {
    const mapping = mappings[target.mappingKey];
    return <tr key={target.mappingKey}><td>{target.parentName && <small>{target.parentName}<br /></small>}{target.assessment_name}</td><td>{mapping.csvColumn}</td><td>{mapping.scoreType === "percentage" ? "Percentage" : "Raw marks"}</td><td>{mapping.scoreType === "percentage" ? "100" : mapping.maxMark}</td><td>{target.weight}%</td></tr>;
  })}</tbody></table></div></div>;
}

export function ScorePreview({ preview }: { preview: GradePreview }) {
  const scores = preview.score_preview ?? [];
  if (!scores.length) return null;
  return <details className="mapping-summary score-preview"><summary><strong>Uploaded scores</strong> · {scores.length} shown</summary><p className="field-hint">Showing {scores.length} of {preview.score_preview_total ?? scores.length} valid uploaded scores. Blank scores retain saved results. Each component is weighted separately.</p><div className="mapping-summary-scroll"><table className="recon-tbl"><thead><tr><th>Row / student ID</th><th>Assessment / component</th><th>Score entered / maximum</th><th>Earned unit marks / weight</th></tr></thead><tbody>{scores.map((score, index) => <tr key={`${score.row}-${index}`}><td>{score.row} · {score.student_code}</td><td>{score.assessment_name}{score.component_name && <><br /><small>{score.component_name}</small></>}</td><td>{score.score} / {score.maximum}</td><td>{score.earned_unit_marks} / {score.unit_weight}</td></tr>)}</tbody></table></div></details>;
}
