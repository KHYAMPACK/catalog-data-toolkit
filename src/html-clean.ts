// An allow-list HTML cleaner for product descriptions (pure: no database, no network). Every path that stores, previews or publishes
// formatted text goes through sanitizeHtml, and the tests run the same function. Rules:
//  - allowed tags: h2, h3, p, br, strong, em, ul, ol, li, a, table, thead, tbody, tr, th, td. Nothing else survives;
//  - a few tags are mapped instead of dropped: b to strong, i to em, h1 to h2, h4 to h6 to h3;
//  - links: http, https, mailto, or a path on the same site that starts with a single slash; always rel="noopener"; no target;
//  - no scripts, styles, iframes, forms, svg, event handlers, style attributes, classes, ids or images;
//  - the result is idempotent: sanitizeHtml(sanitizeHtml(x).html).html equals sanitizeHtml(x).html.
// It also reports what it dropped (removed), so a screen can say so before a person accepts the text.
import sanitize from "sanitize-html";
import { Parser } from "htmlparser2";


export const ALLOWED_TAGS = ["h2", "h3", "p", "br", "strong", "em", "ul", "ol", "li", "a", "table", "thead", "tbody", "tr", "th", "td"] as const;
const ALLOWED = new Set<string>(ALLOWED_TAGS);
const MAPPED: Record<string, string> = { b: "strong", i: "em", h1: "h2", h4: "h3", h5: "h3", h6: "h3" };
// elements whose whole content is dropped, not just the tag
const DROP_CONTENT = ["script", "style", "iframe", "object", "embed", "noscript", "template", "svg", "math", "textarea", "select", "option", "title", "head"];
const ALLOWED_ATTRS: Record<string, string[]> = { a: ["href"], th: ["colspan", "rowspan"], td: ["colspan", "rowspan"] };

// A link address we accept: http(s), mailto, or a path on the same site ("/brakes/"); not "//host", not "javascript:", not "data:".
const goodHref = (v: string) => {
  const s = v.trim().replace(/[\u0000-\u001f\u007f\s]+/g, "");
  return /^(https?:\/\/|mailto:)/i.test(s) || /^\/(?!\/)/.test(s);
};

export type CleanResult = { html: string; removed: string[] };

export function sanitizeHtml(input: string): CleanResult {
  const src = String(input ?? "");
  const html = sanitize(src, {
    allowedTags: [...ALLOWED_TAGS],
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    nonTextTags: DROP_CONTENT,
    transformTags: {
      b: "strong",
      i: "em",
      h1: "h2",
      h4: "h3",
      h5: "h3",
      h6: "h3",
      // a link without an address we accept becomes plain text (a span is not allowed, so only its text is kept)
      a: (tagName, attribs) => {
        const out: Record<string, string> = {};
        if (attribs.href === undefined || !goodHref(attribs.href)) return { tagName: "span", attribs: out };
        out.href = attribs.href.trim();
        out.rel = "noopener";
        return { tagName, attribs: out };
      },
    },
    // rel is added by the transform above, so it has to be allowed on links
    allowedAttributes: { ...ALLOWED_ATTRS, a: ["href", "rel"] },
  }).trim();
  return { html, removed: describeRemoved(src) };
}

// What the cleaner takes out, in plain words, counted from the input. It only reads; the cleaned text comes from sanitize().
export function describeRemoved(input: string): string[] {
  const tags = new Map<string, number>();
  const attrs = new Map<string, number>();
  let unsafeLinks = 0;
  let depthDrop = 0;
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  const parser = new Parser(
    {
      onopentag(name, attribs) {
        const n = name.toLowerCase();
        if (DROP_CONTENT.includes(n)) { bump(tags, n); depthDrop++; return; }
        // the rich editor writes <colgroup>/<col> and column-width styles for tables; they carry no content and are not worth a warning
        if (n === "colgroup" || n === "col") return;
        if (!ALLOWED.has(n) && !MAPPED[n]) bump(tags, n);
        const keep = n === "a" ? ["href"] : n === "th" || n === "td" ? ["colspan", "rowspan"] : [];
        for (const [k, v] of Object.entries(attribs)) {
          const key = k.toLowerCase();
          if (n === "a" && key === "href") { if (!goodHref(v)) unsafeLinks++; continue; }
          if (n === "a" && (key === "rel" || key === "target")) continue; // rel is set by the cleaner; the editor adds target
          if (key === "style" && (n === "table" || n === "td" || n === "th" || n === "col")) continue; // editor column widths
          if (!keep.includes(key)) bump(attrs, key.startsWith("on") ? "event handlers" : key === "style" ? "inline styles" : key === "class" || key === "id" ? "class and id names" : key === "target" ? "link targets" : `"${key}" attributes`);
        }
      },
      onclosetag(name) { if (DROP_CONTENT.includes(name.toLowerCase()) && depthDrop > 0) depthDrop--; },
    },
    { lowerCaseTags: true, lowerCaseAttributeNames: true, decodeEntities: true },
  );
  parser.write(input);
  parser.end();
  const out: string[] = [];
  const wording: Record<string, string> = { div: "<div> wrappers (their text is kept)", span: "<span> wrappers (their text is kept)", img: "images", script: "scripts", style: "style blocks", iframe: "embedded frames", svg: "svg graphics", font: "<font> tags (their text is kept)", center: "<center> tags (their text is kept)", form: "form tags", button: "buttons", input: "form fields", video: "video", audio: "audio", object: "embedded objects", embed: "embedded objects", hr: "horizontal rules", blockquote: "<blockquote> tags (their text is kept)", pre: "<pre> tags (their text is kept)", code: "<code> tags (their text is kept)", u: "underline tags (their text is kept)", s: "strikethrough tags (their text is kept)", small: "<small> tags (their text is kept)", sup: "superscript tags (their text is kept)", sub: "subscript tags (their text is kept)" };
  for (const [t, n] of tags) out.push(`${wording[t] ?? `<${t}> tags (their text is kept where there is any)`} (${n})`.replace(/\) \(/, ", "));
  for (const [a, n] of attrs) out.push(`${a} (${n})`);
  if (unsafeLinks) out.push(`links with an address we do not accept (${unsafeLinks}); the link text is kept`);
  return out;
}

// The visible text of some HTML, for checks that a cleaning kept the words (tests and the diff warning).
export function htmlText(html: string): string {
  // a space at every block boundary, so "<li>a</li><li>b</li>" reads "a b" and not "ab"
  const spaced = String(html ?? "").replace(/<\/?(?:p|h[1-6]|ul|ol|li|table|thead|tbody|tr|th|td|br|div)\b[^>]*>/gi, " ");
  return sanitize(spaced, { allowedTags: [], allowedAttributes: {}, nonTextTags: DROP_CONTENT })
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
