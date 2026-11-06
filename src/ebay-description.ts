// Extracts the product text from an eBay listing description (pure: no database, no network). Many sellers use a branded template page (store header,
// navigation, policies, many images, often 60 to 70 KB) with the product text in one block, <div id="descriptioncontent">. This reads only that block
// (counting nested divs, which a regex alone cannot do) and repairs text that was stored as UTF-8 but read as Latin-1 ("mojibake").

// The inner HTML of the first element with the given id, found by counting nested divs (a regex alone cannot match the closing tag). null when the page has no such block.
export function innerOfDivById(html: string, id: string): string | null {
  const open = new RegExp(`<div\\b[^>]*\\bid=["']${id}["'][^>]*>`, "i").exec(html);
  if (!open) return null;
  const start = open.index + open[0].length;
  const tag = /<(\/?)div\b[^>]*>/gi;
  tag.lastIndex = start;
  let depth = 1;
  for (let m = tag.exec(html); m; m = tag.exec(html)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(start, m.index);
  }
  return html.slice(start); // an unclosed block: take the rest rather than nothing
}

// Some of our eBay descriptions hold UTF-8 text that was stored as if it were Latin-1 (an en dash shows as "â" + two control characters). A run of such characters is decoded back; anything that does not decode cleanly is left as it is.
export function repairMojibake(s: string): string {
  return s.replace(/[Â-ô][-¿]+/g, (run) => {
    try {
      const bytes = Uint8Array.from([...run].map((c) => c.charCodeAt(0)));
      if (bytes.some((b) => b > 0xff)) return run;
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return run;
    }
  });
}

// The product text of an eBay description, as HTML (still to be cleaned by lib/html-clean.ts before it is stored). A listing that is not a template page is returned whole.
export function ebayProductText(descriptionHtml: string): { html: string; templated: boolean } {
  const inner = innerOfDivById(descriptionHtml, "descriptioncontent");
  if (inner !== null) return { html: repairMojibake(inner.trim()), templated: true };
  return { html: repairMojibake(descriptionHtml.trim()), templated: false };
}

export function htmlToPlain(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
