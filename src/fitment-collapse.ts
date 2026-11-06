// Turns compatibility rows (one row per year, make, model, trim and engine, the way eBay lists them) into rows with a year range:
// one row per make, model, trim and engine. Pure: no database, no network.
export type EbayFitRow = { year: number | null; make: string | null; model: string | null; trim: string | null; engine: string | null };
export type TakeRow = { make: string; model: string; year_from: number; year_to: number; submodel: string | null; engine: string | null };

const clip = (s: string | null, n: number) => (s && s.trim() !== "" ? s.trim().slice(0, n) : null);
export const normKey = (s: string | null) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
export const groupKey = (make: string | null, model: string | null) => normKey(make) + "|" + normKey(model);

// Consecutive years of one make, model, trim and engine become one range; a gap starts a new row. Rows without a year, make or model are counted as skipped.
export function collapseEbayRows(rows: EbayFitRow[]): { rows: TakeRow[]; skipped: number } {
  const bucket = new Map<string, { make: string; model: string; submodel: string | null; engine: string | null; years: Set<number> }>();
  let skipped = 0;
  for (const r of rows) {
    if (r.year === null || !Number.isFinite(r.year) || !r.make || !r.model) {
      skipped++;
      continue;
    }
    const submodel = clip(r.trim, 80);
    const engine = clip(r.engine, 80);
    const key = [normKey(r.make), normKey(r.model), (submodel ?? "").toLowerCase(), (engine ?? "").toLowerCase()].join("|");
    const b = bucket.get(key) ?? { make: r.make.trim(), model: r.model.trim(), submodel, engine, years: new Set<number>() };
    b.years.add(r.year);
    bucket.set(key, b);
  }
  const out: TakeRow[] = [];
  for (const b of bucket.values()) {
    const ys = [...b.years].sort((a, c) => a - c);
    let start = ys[0];
    let prev = ys[0];
    for (let i = 1; i <= ys.length; i++) {
      if (ys[i] === prev + 1) {
        prev = ys[i];
        continue;
      }
      out.push({ make: b.make, model: b.model, year_from: start, year_to: prev, submodel: b.submodel, engine: b.engine });
      start = ys[i];
      prev = ys[i];
    }
  }
  out.sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model) || a.year_from - b.year_from || (a.submodel ?? "").localeCompare(b.submodel ?? ""));
  return { rows: out, skipped };
}

// A de-duplication key for a collapsed row (lower-cased make, model, submodel, engine and the years), to tell which rows are new.
export const takeRowKey = (r: { make: string; model: string; year_from: number; year_to: number; submodel: string | null; engine: string | null }) =>
  [r.make.toLowerCase(), r.model.toLowerCase(), r.year_from, r.year_to, (r.submodel ?? "").toLowerCase(), (r.engine ?? "").toLowerCase()].join("|");

// How one source's years for a make and model compare with a reference list's (for example the manufacturer's data): same, one has more, or they differ.
export type YearRelation = "same" | "source_more" | "reference_more" | "differ";
export function yearRelation(source: number[], reference: number[]): YearRelation {
  const e = new Set(source);
  const s = new Set(reference);
  const eInS = [...e].every((y) => s.has(y));
  const sInE = [...s].every((y) => e.has(y));
  if (eInS && sInE) return "same";
  if (sInE) return "source_more";
  if (eInS) return "reference_more";
  return "differ";
}
