import { ebayProductText, htmlToPlain, innerOfDivById, repairMojibake } from "../src/ebay-description";
let fails = 0;
const eq = (label: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(ok ? "ok  " : "FAIL", label, ok ? "" : "\n   got  " + JSON.stringify(got) + "\n   want " + JSON.stringify(want)); };

const page = `<html><body><div id="header"><div class="nav">Home About Us</div></div>
<div id="description"><div id="descriptiontitle">Description</div><div id="descriptioncontent"><p>Upgrade your classic Chevrolet with the Wilwood kit.</p><div class="note"><b>Fits</b> 1959-1964</div><ul><li>Forged calipers</li><li>Drilled rotors</li></ul></div></div>
<div id="helpful_links_content">Shipping and returns</div></body></html>`;

eq("finds the product block with nested divs inside", innerOfDivById(page, "descriptioncontent"), `<p>Upgrade your classic Chevrolet with the Wilwood kit.</p><div class="note"><b>Fits</b> 1959-1964</div><ul><li>Forged calipers</li><li>Drilled rotors</li></ul>`);
eq("a missing id is null", innerOfDivById("<div>x</div>", "descriptioncontent"), null);
const t = ebayProductText(page);
eq("templated page: the product text only", [t.templated, t.html.includes("Wilwood kit"), t.html.includes("Shipping and returns"), t.html.includes("Home About Us")], [true, true, false, false]);
const plain = ebayProductText("<p>Just text</p>");
eq("a listing that is not a template page is returned whole", [plain.templated, plain.html], [false, "<p>Just text</p>"]);
eq("an unclosed block takes the rest", innerOfDivById('<div id="descriptioncontent"><p>a</p>', "descriptioncontent"), "<p>a</p>");
eq("plain text keeps paragraphs and list items on lines", htmlToPlain("<p>One &amp; two</p><ul><li>Three</li><li>Four</li></ul>"), "One & two\nThree\nFour");
eq("mojibake: an en dash and an apostrophe stored as Latin-1 are repaired", repairMojibake("MBRP â T409 for truckâs sound"), "MBRP – T409 for truck’s sound");
eq("mojibake: normal text and real accented letters are left alone", repairMojibake("Café and plain text"), "Café and plain text");
console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);
