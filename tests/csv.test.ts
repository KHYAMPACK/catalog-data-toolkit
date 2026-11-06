import { parseCsv, toCsv, toRecords } from "../src/csv";
let fails = 0;
const eq = (label: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(ok ? "ok  " : "FAIL", label, ok ? "" : "\n   got  " + JSON.stringify(got) + "\n   want " + JSON.stringify(want)); };

eq("plain cells", parseCsv("a,b\n1,2\n"), [["a", "b"], ["1", "2"]]);
eq("CRLF and a BOM", parseCsv("﻿a,b\r\n1,2\r\n"), [["a", "b"], ["1", "2"]]);
eq("quoted comma and doubled quote", parseCsv('"x, y","say ""hi"""\n'), [["x, y", 'say "hi"']]);
eq("line break inside a cell", parseCsv('"one\ntwo",3\n'), [["one\ntwo", "3"]]);
eq("empty cells are kept", parseCsv("a,,c\n"), [["a", "", "c"]]);
let threw = false;
try { parseCsv('"never closed'); } catch { threw = true; }
eq("an unclosed quote is an error", threw, true);
const round = [["name", "note"], ["A, B", 'a "quote"'], ["multi\nline", " padded "]];
eq("write then read gives the same table", parseCsv(toCsv(round)), round);
eq("headers become lower_snake keys", toRecords([["Part Number", "Brand"], ["123", "X"]]).records[0].cells, { part_number: "123", brand: "X" });
console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);
