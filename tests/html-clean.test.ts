// The HTML cleaner for the website description (src/html-clean.ts): an attack corpus, the allow-list, the mapped tags, idempotency and the
// 'removed' report. Pure: no database and no network.
import { htmlText, sanitizeHtml } from "../src/html-clean";

let fails = 0;
const check = (label: string, ok: boolean, extra = "") => { if (!ok) fails++; console.log(ok ? "ok  " : "FAIL", label, ok ? "" : extra); };
const clean = (s: string) => sanitizeHtml(s).html;

// 1. attacks: none of these may leave anything executable behind
const attacks: [string, string][] = [
  ["script tag", `<p>hi</p><script>alert(1)</script>`],
  ["script with attributes and CDATA", `<script type="text/javascript">//<![CDATA[\nalert(1)\n//]]></script>`],
  ["inline event handler", `<p onclick="alert(1)">x</p>`],
  ["img onerror", `<img src=x onerror=alert(1)>`],
  ["javascript: link", `<a href="javascript:alert(1)">click</a>`],
  ["javascript: with entities", `<a href="&#106;avascript:alert(1)">click</a>`],
  ["javascript: with a tab and newline", `<a href="java\tscript:alert(1)">click</a>`],
  ["javascript: with control characters", `<a href="\u0001javascript:alert(1)">click</a>`],
  ["data: link", `<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>`],
  ["vbscript link", `<a href="vbscript:msgbox(1)">x</a>`],
  ["protocol-relative link", `<a href="//evil.example/x">x</a>`],
  ["iframe", `<iframe src="https://evil.example"></iframe>`],
  ["iframe srcdoc", `<iframe srcdoc="<script>alert(1)</script>"></iframe>`],
  ["object and embed", `<object data="x.swf"></object><embed src="x.swf">`],
  ["svg with onload", `<svg onload="alert(1)"><circle/></svg>`],
  ["svg script", `<svg><script>alert(1)</script></svg>`],
  ["math", `<math><mi xlink:href="javascript:alert(1)">x</mi></math>`],
  ["style tag", `<style>body{background:url(javascript:alert(1))}</style><p>x</p>`],
  ["style attribute", `<p style="background:url(javascript:alert(1))">x</p>`],
  ["form", `<form action="https://evil.example"><input name="a"><button>go</button></form>`],
  ["meta refresh and base", `<meta http-equiv="refresh" content="0;url=https://evil.example"><base href="https://evil.example/">`],
  ["link tag", `<link rel="stylesheet" href="https://evil.example/x.css">`],
  ["broken tag trick", `<scr<script>ipt>alert(1)</scr</script>ipt>`],
  ["uppercase and mixed case", `<SCRIPT>alert(1)</SCRIPT><A HREF="JaVaScRiPt:alert(1)">x</A>`],
  ["nested template", `<template><script>alert(1)</script></template>`],
  ["noscript trick", `<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>`],
  ["target blank without rel", `<a href="https://example.com" target="_blank">x</a>`],
];
for (const [name, html] of attacks) {
  const out = clean(html);
  const bad = /<\s*(script|iframe|object|embed|svg|math|style|form|input|button|meta|base|link|img|template|noscript)\b/i.test(out) || /\bon\w+\s*=/i.test(out) || /javascript:|vbscript:|data:text/i.test(out) || /style\s*=/i.test(out) || /target\s*=/i.test(out) || /href="\/\//.test(out);
  check(`attack removed: ${name}`, !bad, out);
}
check("the words of a removed link are kept", htmlText(clean(`<a href="javascript:alert(1)">read more</a>`)) === "read more");
check("a good link keeps its address and gets rel=noopener, no target", clean(`<a href="https://example.com/a?b=1&amp;c=2" target="_blank">x</a>`) === `<a href="https://example.com/a?b=1&amp;c=2" rel="noopener">x</a>`, clean(`<a href="https://example.com/a?b=1&amp;c=2" target="_blank">x</a>`));
check("mailto and a store path are accepted", /href="mailto:a@b\.co"/.test(clean(`<a href="mailto:a@b.co">m</a>`)) && /href="\/brakes\/"/.test(clean(`<a href="/brakes/">b</a>`)));

// 2. the allow-list and the mapped tags
const rich = `<h2>Fits</h2><p>Text with <strong>bold</strong> and <em>italic</em><br />a break.</p><ul><li>one</li><li>two</li></ul><ol><li>a</li></ol><h3>Specs</h3><table><thead><tr><th colspan="2">H</th></tr></thead><tbody><tr><td>a</td><td rowspan="2">b</td></tr></tbody></table>`;
check("allowed markup passes unchanged", clean(rich) === rich, clean(rich));
check("b, i, h1 and h4 are mapped, not dropped", clean(`<h1>T</h1><p><b>x</b> <i>y</i></p><h4>s</h4>`) === `<h2>T</h2><p><strong>x</strong> <em>y</em></p><h3>s</h3>`, clean(`<h1>T</h1><p><b>x</b> <i>y</i></p><h4>s</h4>`));
check("div and span wrappers go but their text stays", clean(`<div class="a"><span style="color:red">kept words</span></div>`) === "kept words", clean(`<div class="a"><span style="color:red">kept words</span></div>`));
check("images are off", !/<img/i.test(clean(`<p>a<img src="https://example.com/x.png" alt="x">b</p>`)) && htmlText(clean(`<p>a<img src="https://example.com/x.png">b</p>`)) === "ab");
check("class, id and data attributes are dropped", clean(`<p class="x" id="y" data-z="1" title="t">p</p>`) === "<p>p</p>");
check("an empty or null input gives an empty string", clean("") === "" && sanitizeHtml(null as unknown as string).html === "");

// 3. idempotency over everything above and a few oddities
const samples = [...attacks.map((a) => a[1]), rich, `<h1>T</h1><div><b>x</b></div>`, `<p>5 < 6 & 7 > 3 "quoted" 'single'</p>`, `plain text only`, `<p>unclosed <strong>bold`, `<ul><li>a<ul><li>nested</li></ul></li></ul>`, `<a href="https://x.co">A</a><a>no href</a>`];
const notIdem = samples.filter((s) => clean(clean(s)) !== clean(s));
check("sanitizing twice equals sanitizing once, for every sample", notIdem.length === 0, JSON.stringify(notIdem));
check("text with symbols keeps them (escaped), not mangled", htmlText(clean(`<p>5 &lt; 6 &amp; 7 &gt; 3</p>`)) === "5 < 6 & 7 > 3", htmlText(clean(`<p>5 &lt; 6 &amp; 7 &gt; 3</p>`)));

// 4. the report of what was removed
const r = sanitizeHtml(`<div class="w" style="x:y"><p onclick="a()">t</p><script>alert(1)</script><img src="a.png"><a href="javascript:x()">l</a></div>`).removed.join(" | ");
check("the report names wrappers, inline styles, event handlers, scripts, images and the unsafe link", /div/.test(r) && /inline styles/.test(r) && /event handlers/.test(r) && /scripts/.test(r) && /images/.test(r) && /links with an address we do not accept/.test(r), r);
check("clean text reports nothing removed", sanitizeHtml(rich).removed.length === 0, sanitizeHtml(rich).removed.join(" | "));

console.log(fails ? `${fails} FAILED` : "all html-clean tests passed");
process.exit(fails ? 1 : 0);
