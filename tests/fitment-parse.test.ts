import { parseFitmentLines, type KnownVehicles } from "../src/fitment-parse";
let fails = 0;
const eq = (label: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(ok ? "ok  " : "FAIL", label, ok ? "" : "\n   got  " + JSON.stringify(got) + "\n   want " + JSON.stringify(want)); };

const known: KnownVehicles = {
  makes: new Map([["toyota", "Toyota"], ["ford", "Ford"]]),
  models: new Map([["toyota", new Map([["camry", "Camry"], ["landcruiser", "Land Cruiser"]])], ["ford", new Map([["f150", "F-150"]])]]),
};
const one = (s: string) => parseFitmentLines(s, known);

eq("years first, trim and engine", one("2012-2018 Toyota Camry LE (2.5L)").rows, [{ make: "Toyota", model: "Camry", year_from: 2012, year_to: 2018, submodel: "LE", engine: "2.5L" }]);
eq("years last, one year", one("Ford F-150 2015").rows, [{ make: "Ford", model: "F-150", year_from: 2015, year_to: 2015, submodel: null, engine: null }]);
eq("a multi-word model", one("1961-1983 Toyota Land Cruiser").rows[0].model, "Land Cruiser");
eq("no year is reported, not guessed", one("Toyota Camry").bad.length, 1);
eq("unknown make is reported", one("2015 Zzz Camry").bad[0].reason, "the make is not in the vehicle list");
eq("a reversed range is reported", one("2018-2012 Toyota Camry").bad[0].reason, "the second year is before the first");
console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);
