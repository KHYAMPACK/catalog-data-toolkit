// Reads the parts compatibility list out of an eBay Trading API GetItem response (pure: no database, no network).
// An entry looks like <Compatibility><NameValueList><Name>Year</Name><Value>2010</Value></NameValueList> ... <CompatibilityNotes>...</CompatibilityNotes></Compatibility>.
// Rows come out as year, make, model, trim, engine and notes; exact duplicate rows are dropped and counted.
export type CompatRow = { year: number | null; make: string | null; model: string | null; trim: string | null; engine: string | null; notes: string | null };
export type CompatList = { rows: CompatRow[]; listed: number; duplicates: number };

// eBay stops a list at 3,000 entries; a list that reaches it may be cut (the old load flagged these as capped)
export const COMPAT_CAP = 3000;

const unescape = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim();
const textOrNull = (s: string | undefined) => (s && s.trim() !== "" ? s : null);

export function parseCompat(xml: string): CompatList {
  const blocks = xml.match(/<Compatibility>[\s\S]*?<\/Compatibility>/g) ?? [];
  const seen = new Set<string>();
  const rows: CompatRow[] = [];
  let duplicates = 0;
  for (const b of blocks) {
    const f: Record<string, string> = {};
    for (const m of b.matchAll(/<NameValueList>\s*<Name>([\s\S]*?)<\/Name>\s*<Value>([\s\S]*?)<\/Value>\s*<\/NameValueList>/g)) f[unescape(m[1]).toLowerCase()] = unescape(m[2]);
    const notes = /<CompatibilityNotes>([\s\S]*?)<\/CompatibilityNotes>/.exec(b);
    const y = Number.parseInt(f["year"] ?? "", 10);
    const row: CompatRow = {
      year: Number.isFinite(y) ? y : null,
      make: textOrNull(f["make"]) ?? null,
      model: textOrNull(f["model"]) ?? null,
      trim: textOrNull(f["trim"]) ?? null,
      engine: textOrNull(f["engine"]) ?? null,
      notes: notes ? textOrNull(unescape(notes[1])) : null,
    };
    const key = [row.year, row.make, row.model, row.trim ?? "", row.engine ?? "", row.notes ?? ""].join("|");
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    rows.push(row);
  }
  return { rows, listed: blocks.length, duplicates };
}
