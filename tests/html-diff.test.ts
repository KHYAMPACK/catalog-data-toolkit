import { lineDiff, toLines } from "../src/html-diff";

let fails = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(ok ? "ok  " : "FAIL", label, ok ? "" : "\n   got " + JSON.stringify(got) + "\n   want " + JSON.stringify(want));
};

eq("html is spread over lines at block ends", toLines("<h2>A</h2><p>b</p><ul><li>x</li><li>y</li></ul>"), ["<h2>A</h2>", "<p>b</p>", "<ul><li>x</li>", "<li>y</li>", "</ul>"]);
const d = lineDiff("<h2>A</h2><p>same</p><p>old</p>", "<h2>A</h2><p>same</p><p>new</p><p>extra</p>");
eq("removed, added and unchanged lines are told apart", [d.left.map((l) => l.kind), d.right.map((l) => l.kind)], [["same", "same", "removed"], ["same", "same", "added", "added"]]);
eq("identical html is not a change", lineDiff("<p>a</p>", "<p>a</p>").changed, false);
eq("empty on one side is all added", lineDiff("", "<p>a</p>").right.map((l) => l.kind), ["added"]);
eq("repeated lines are paired one for one", lineDiff("<p>x</p><p>x</p>", "<p>x</p>").left.map((l) => l.kind), ["same", "removed"]);
console.log(fails ? `${fails} FAILED` : "all html-diff tests passed");
process.exit(fails ? 1 : 0);
