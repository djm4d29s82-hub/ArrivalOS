// Tiny dependency-free CSV parser for the company bulk-arrival import.
// Handles quoted fields (commas + newlines inside quotes, "" escapes), CRLF/LF,
// and a header row. Header keys are lowercased + trimmed. Not a general-purpose
// RFC-4180 lib — just enough for the arrival template below.

/** Split raw CSV text into an array of string-cell rows (quote-aware). */
function tokenize(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  const s = String(text ?? '').replace(/\r\n?/g, '\n'); // normalize CRLF/CR → LF

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++; } // escaped quote
        else inQuotes = false;
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(cell); cell = '';
    } else if (c === '\n') {
      row.push(cell); rows.push(row); row = []; cell = '';
    } else {
      cell += c;
    }
  }
  // flush trailing cell/row (unless the file ended on a clean newline)
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

/**
 * parseCsv(text) → { headers: string[], rows: object[] }.
 * Empty lines are skipped; each row object is keyed by the lowercased header.
 */
export function parseCsv(text) {
  const tokens = tokenize(text).filter((r) => r.some((c) => c.trim() !== ''));
  if (!tokens.length) return { headers: [], rows: [] };
  const headers = tokens[0].map((h) => h.trim().toLowerCase());
  const rows = tokens.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cells[i] ?? '').trim(); });
    return obj;
  });
  return { headers, rows };
}

// Sample template offered as a download so users start with the right columns.
export const CSV_TEMPLATE =
  'name,email,phone,language_level,city,arrival_date,arrival_time,flight_number,notes\n' +
  'Maria Santos,maria@example.com,+49 151 1112222,b1,Berlin,2026-06-15,14:30,LH456,Erste Reise nach Deutschland\n';
