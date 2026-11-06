// Small CSV reader and writer (RFC 4180): quoted cells, doubled quotes, commas and line breaks inside cells, CRLF or LF, optional BOM.

export function parseCsv(text: string): string[][] {
  const s = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let sawAny = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++; }
        else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"' && cell === "") { quoted = true; sawAny = true; continue; }
    if (ch === ",") { row.push(cell); cell = ""; sawAny = true; continue; }
    if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (sawAny || row.length > 1 || row[0] !== "") rows.push(row);
      row = []; sawAny = false;
      continue;
    }
    cell += ch; sawAny = true;
  }
  if (quoted) throw new Error("A quoted cell is not closed. Check for a stray quote mark.");
  if (sawAny || cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const esc = (v: unknown) => {
  const t = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(t) || /^\s|\s$/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
};

// UTF-8 with a BOM and CRLF lines, so Excel opens it correctly.
export function toCsv(rows: unknown[][]): string {
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n";
}

// Turns a parsed table into records keyed by lower-cased header name. Returns the headers too.
export function toRecords(table: string[][]): { headers: string[]; records: { line: number; cells: Record<string, string> }[] } {
  if (table.length === 0) return { headers: [], records: [] };
  const headers = table[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const records = table.slice(1).map((r, i) => {
    const cells: Record<string, string> = {};
    headers.forEach((h, k) => { if (h && !(h in cells)) cells[h] = r[k] ?? ""; });
    return { line: i + 2, cells };
  });
  return { headers, records };
}
