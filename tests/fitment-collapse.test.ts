import { collapseEbayRows, groupKey, takeRowKey, yearRelation } from "../src/fitment-collapse";
let fails = 0;
const eq = (label: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(ok ? "ok  " : "FAIL", label, ok ? "" : "\n   got  " + JSON.stringify(got) + "\n   want " + JSON.stringify(want)); };

const r = (year: number | null, make: string | null, model: string | null, trim: string | null = null, engine: string | null = null) => ({ year, make, model, trim, engine });
const c = collapseEbayRows([
  r(2010, "Chevrolet", "Impala", "LT", "3.5L"), r(2011, "Chevrolet", "Impala", "LT", "3.5L"), r(2012, "Chevrolet", "Impala", "LT", "3.5L"), // one range 2010-2012
  r(2015, "Chevrolet", "Impala", "LT", "3.5L"),                                                                                 // a gap: a second row
  r(2011, "Chevrolet", "Impala", "LS", "3.5L"),                                                                                  // another trim: its own row
  r(2011, "Ford", "F-150"), r(2011, "Ford", "F-150"),                                                                             // a duplicate year is one year
  r(null, "Ford", "F-150"), r(2012, null, "F-150"),                                                                               // not usable: skipped
]);
eq("rows", c.rows.map((x) => `${x.make} ${x.model} ${x.year_from}-${x.year_to} ${x.submodel ?? ""} ${x.engine ?? ""}`.trim()), [
  "Chevrolet Impala 2010-2012 LT 3.5L",
  "Chevrolet Impala 2011-2011 LS 3.5L",
  "Chevrolet Impala 2015-2015 LT 3.5L",
  "Ford F-150 2011-2011",
]);
eq("rows without a year, make or model are counted", c.skipped, 2);
eq("a long trim is cut at 80 characters", collapseEbayRows([r(2012, "A", "B", "x".repeat(100))]).rows[0].submodel?.length, 80);
eq("the group key ignores case and punctuation", groupKey("Mercedes-Benz", "E 350"), groupKey("mercedes benz", "e350"));
eq("the row key matches the de-duplication key", takeRowKey({ make: "Ford", model: "F-150", year_from: 2011, year_to: 2012, submodel: null, engine: "5.0L" }), "ford|f-150|2011|2012||5.0l");
eq("years: same", yearRelation([2010, 2011], [2011, 2010]), "same");
eq("years: eBay has more", yearRelation([2010, 2011, 2012], [2010, 2011]), "source_more");
eq("years: SEMA has more", yearRelation([2010], [2010, 2011]), "reference_more");
eq("years: they differ", yearRelation([2010, 2012], [2011, 2012]), "differ");
console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);
