# catalog-data-toolkit

Small, dependency-light TypeScript utilities for messy e-commerce catalog data, extracted from a production system that keeps a 20,000-listing auto-parts catalog in sync across eBay and an online store. Every module is a pure function (no database, no network), so each one is easy to test, and each has its own test file.

| Module | What it does |
| --- | --- |
| `src/ebay-compat.ts` | Reads the parts compatibility list out of an eBay Trading API `GetItem` response: unescapes entities, drops exact duplicates, reports counts, knows eBay's 3,000-entry cap. |
| `src/fitment-collapse.ts` | Collapses one-row-per-year fitment data (make / model / trim / engine) into year ranges, splits ranges at gaps, and compares two sources' year sets (`same`, `source_more`, `reference_more`, `differ`). |
| `src/fitment-parse.ts` | Parses pasted lines such as `2012-2018 Toyota Camry LE (2.5L)` or `Ford F-150 2015` against a known vehicle list. Lines it cannot read come back with the reason; it never guesses. |
| `src/ebay-description.ts` | Pulls the real product text out of a 60-70 KB branded eBay template page (balanced `<div>` matching, not a regex) and repairs UTF-8 text that was stored as Latin-1 ("mojibake"). |
| `src/html-clean.ts` | Allow-list HTML sanitizer for product descriptions: a fixed tag set, mapped tags, safe links only, idempotent, and a report of what was removed. Tested against an attack corpus (script tags, `javascript:` links in several encodings, SVG, iframes, mutation tricks). |
| `src/html-diff.ts` | A small line diff of two HTML fragments for "before / after" previews. |
| `src/csv.ts` | RFC 4180 CSV reader and writer (quoted cells, doubled quotes, line breaks in cells, BOM, Excel-friendly output). |

## Run the tests

```bash
npm install
npm test          # every tests/*.test.ts with tsx
npm run typecheck
```

Requires Node 20 or newer.

## Example

```ts
import { collapseEbayRows } from "./src/fitment-collapse";

collapseEbayRows([
  { year: 2011, make: "Ford", model: "F-150", trim: null, engine: "5.0L" },
  { year: 2012, make: "Ford", model: "F-150", trim: null, engine: "5.0L" },
  { year: 2014, make: "Ford", model: "F-150", trim: null, engine: "5.0L" },
]).rows;
// [ { make: "Ford", model: "F-150", year_from: 2011, year_to: 2012, ... },
//   { make: "Ford", model: "F-150", year_from: 2014, year_to: 2014, ... } ]
```

## License

MIT. See `LICENSE`.
