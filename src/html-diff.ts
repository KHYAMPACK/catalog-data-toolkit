// A small before/after view of two pieces of HTML for the publish preview (pure). The HTML is spread over lines at block boundaries so a
// change shows as whole lines; a line that exists only on the left is "removed", only on the right "added". It is a line diff, not a
// minimal edit script: enough to see what changed in a description without reading both copies.
const BLOCK_END = /(<\/(?:p|h2|h3|ul|ol|li|table|thead|tbody|tr|th|td)>|<br\s*\/?>)/gi;

export function toLines(html: string): string[] {
  return String(html ?? "")
    .replace(/\r\n/g, "\n")
    .replace(BLOCK_END, "$1\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "");
}

export type DiffLine = { text: string; kind: "same" | "removed" | "added" };

export function lineDiff(oldHtml: string, nextHtml: string): { left: DiffLine[]; right: DiffLine[]; changed: boolean } {
  const a = toLines(oldHtml);
  const b = toLines(nextHtml);
  const count = (xs: string[]) => {
    const m = new Map<string, number>();
    for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
    return m;
  };
  const inB = count(b);
  const inA = count(a);
  // a line counts as "same" while the other side still has an unused copy of it (so repeated lines are paired up one for one)
  const useB = new Map(inB), useA = new Map(inA);
  const left = a.map<DiffLine>((t) => {
    const n = useB.get(t) ?? 0;
    if (n > 0) { useB.set(t, n - 1); return { text: t, kind: "same" }; }
    return { text: t, kind: "removed" };
  });
  const right = b.map<DiffLine>((t) => {
    const n = useA.get(t) ?? 0;
    if (n > 0) { useA.set(t, n - 1); return { text: t, kind: "same" }; }
    return { text: t, kind: "added" };
  });
  return { left, right, changed: left.some((l) => l.kind !== "same") || right.some((l) => l.kind !== "same") };
}
