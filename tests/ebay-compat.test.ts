import { parseCompat, COMPAT_CAP } from "../src/ebay-compat";
let fails = 0;
const eq = (label: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(ok ? "ok  " : "FAIL", label, ok ? "" : "\n   got  " + JSON.stringify(got) + "\n   want " + JSON.stringify(want)); };

const entry = (year: string, make: string, model: string, extra = "", notes = "") =>
  `<Compatibility><NameValueList><Name>Year</Name><Value>${year}</Value></NameValueList><NameValueList><Name>Make</Name><Value>${make}</Value></NameValueList><NameValueList><Name>Model</Name><Value>${model}</Value></NameValueList>${extra}${notes ? `<CompatibilityNotes>${notes}</CompatibilityNotes>` : ""}</Compatibility>`;
const trim = (t: string) => `<NameValueList><Name>Trim</Name><Value>${t}</Value></NameValueList>`;
const engine = (e: string) => `<NameValueList><Name>Engine</Name><Value>${e}</Value></NameValueList>`;

const xml = `<ItemCompatibilityList>${entry("2010", "Chevrolet", "Impala", trim("LT") + engine("3.5L V6"), "Front &amp; rear")}${entry("2011", "Ford", "F-150")}${entry("2011", "Ford", "F-150")}</ItemCompatibilityList>`;
const r = parseCompat(xml);
eq("three entries listed", r.listed, 3);
eq("the exact duplicate is dropped", [r.rows.length, r.duplicates], [2, 1]);
eq("a full row", r.rows[0], { year: 2010, make: "Chevrolet", model: "Impala", trim: "LT", engine: "3.5L V6", notes: "Front & rear" });
eq("a row without trim, engine and notes", r.rows[1], { year: 2011, make: "Ford", model: "F-150", trim: null, engine: null, notes: null });
eq("an empty list", parseCompat("<Item></Item>"), { rows: [], listed: 0, duplicates: 0 });
eq("the cap is eBay's 3,000", COMPAT_CAP, 3000);
console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);
