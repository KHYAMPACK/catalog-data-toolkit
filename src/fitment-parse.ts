// Reads pasted fitment lines such as "2012-2018 Toyota Camry LE (2.5L)" or "Ford F-150 2015" into rows (pure: no database).
// A line needs a year or a year range, a make the vehicle list knows and a model it knows for that make; whatever follows the
// model is kept as the submodel, and text in brackets as the engine. Lines that cannot be read are returned with the reason,
// never guessed.
export type KnownVehicles = {
  makes: Map<string, string>; // normalised make -> make as the vehicle list spells it
  models: Map<string, Map<string, string>>; // normalised make -> (normalised model -> model as spelled)
};

export type FitRow = { make: string; model: string; year_from: number; year_to: number; submodel: string | null; engine: string | null };
export type BadLine = { line: string; reason: string };

export const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const YEAR = String.raw`(?:19|20)\d{2}`;

// Which makes a block of text mentions: used to know which models to load before parsing.
export function makesIn(text: string, makes: Map<string, string>): string[] {
  const hay = " " + text.toLowerCase().replace(/[^a-z0-9]+/g, " ") + " ";
  const out: string[] = [];
  for (const [n, name] of makes) {
    const needle = " " + name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() + " ";
    if (needle.length > 3 && hay.includes(needle)) out.push(n);
  }
  return out;
}

function longestPrefix(tokens: string[], table: Map<string, string>): { name: string; used: number } | null {
  for (let n = Math.min(tokens.length, 4); n >= 1; n--) {
    const hit = table.get(norm(tokens.slice(0, n).join(" ")));
    if (hit) return { name: hit, used: n };
  }
  return null;
}

export function parseFitmentLines(text: string, known: KnownVehicles, maxLines = 200): { rows: FitRow[]; bad: BadLine[] } {
  const rows: FitRow[] = [];
  const bad: BadLine[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, maxLines);
  for (const line of lines) {
    let rest = line;
    let engine: string | null = null;
    const eng = rest.match(/\(([^)]{1,60})\)/);
    if (eng) {
      engine = eng[1].trim() || null;
      rest = rest.replace(eng[0], " ");
    }
    // the years may come first ("2012-2018 Toyota Camry") or last ("Toyota Camry 2012-2018")
    const range = new RegExp(String.raw`(?:^|\s)(${YEAR})(?:\s*(?:-|–|—|to|through)\s*(${YEAR}))?(?=\s|$)`, "i");
    const ym = rest.match(range);
    if (!ym) {
      bad.push({ line, reason: "no year found (write a year like 2015 or a range like 2012-2018)" });
      continue;
    }
    const from = Number(ym[1]);
    const to = ym[2] ? Number(ym[2]) : from;
    if (to < from) {
      bad.push({ line, reason: "the second year is before the first" });
      continue;
    }
    rest = rest.replace(ym[0], " ").replace(/[,;]/g, " ").replace(/\s+/g, " ").trim();
    const tokens = rest.split(" ").filter(Boolean);
    const make = longestPrefix(tokens, known.makes);
    if (!make) {
      bad.push({ line, reason: "the make is not in the vehicle list" });
      continue;
    }
    const afterMake = tokens.slice(make.used);
    const models = known.models.get(norm(make.name)) ?? new Map<string, string>();
    const model = longestPrefix(afterMake, models);
    if (!model) {
      bad.push({ line, reason: `no model of ${make.name} in the vehicle list matches "${afterMake.join(" ") || "(nothing)"}"` });
      continue;
    }
    const sub = afterMake.slice(model.used).join(" ").trim();
    rows.push({ make: make.name, model: model.name, year_from: from, year_to: to, submodel: sub ? sub.slice(0, 80) : null, engine: engine ? engine.slice(0, 80) : null });
  }
  return { rows, bad };
}
