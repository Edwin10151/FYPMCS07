// Minimal client-side CSV reading for the admin bulk-upload screens. The
// uploads are validated in the browser so staff get a real preview of what
// they picked before anything is committed — no backend round-trip needed.

export type ParsedCsv = {
  /** Normalised keys (lowercase, spaces → _) used for matching / mapping. */
  headers: string[];
  /** Original header labels as they appear in the file (for UI). */
  displayHeaders: string[];
  rows: string[][];
};

/** Split into lines. Handles Windows (\r\n), Unix (\n), and classic Mac (\r)
 *  exports — Moodle/Excel on some machines still emit lone CR. */
function splitLines(text: string): string[] {
  return text.split(/\r\n|\n|\r/).filter((line) => line.trim().length > 0);
}

function splitLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      // A doubled quote inside a quoted cell is an escaped quote.
      if (inQuotes && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells;
}

export function parseCsv(text: string): ParsedCsv {
  const lines = splitLines(text);

  if (lines.length === 0) return { headers: [], displayHeaders: [], rows: [] };

  const displayHeaders = splitLine(lines[0]);
  return {
    headers: displayHeaders.map((h) => h.toLowerCase().replace(/\s+/g, "_")),
    displayHeaders,
    rows: lines.slice(1).map(splitLine),
  };
}

// Finds a column by any of the accepted header spellings, so uploads exported
// from Callista/Moodle work without staff having to rename columns first.
export function findColumn(headers: string[], candidates: string[]) {
  for (const candidate of candidates) {
    const index = headers.indexOf(candidate);
    if (index !== -1) return index;
  }
  return -1;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
