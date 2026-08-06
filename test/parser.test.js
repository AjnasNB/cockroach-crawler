import assert from "node:assert/strict";
import test from "node:test";

import { Selector, SelectorList, parseDocument } from "../src/parser.js";

const PAGE = `<html><body><div id="app"><ul class="products">
<li class="product" data-id="1"><h2 class="title">Widget A</h2><a href="/a">Buy</a><span class="price">$10</span></li>
<li class="product featured" data-id="2"><h2 class="title">Widget B</h2><a href="/b">Buy</a><span class="price">$20</span></li>
<li class="promo"><h2 class="title">Clearance sale</h2></li>
</ul></div></body></html>`;

function doc(options = {}) {
  return Selector.parse(PAGE, { url: "https://shop.test/catalog", ...options });
}

test("Selector.parse validates its inputs", () => {
  assert.throws(() => Selector.parse(42), /html must be a string/);
  assert.throws(() => Selector.parse(PAGE, { url: "ftp://x.test" }), /must be an http\(s\) URL/);
  assert.throws(() => Selector.parse(PAGE, { nope: 1 }), /Unknown parse option/);
  assert.throws(
    () => Selector.parse(`<p>${"x".repeat(2_000)}</p>`, { maxInputCharacters: 1_024 }),
    /exceeds maxInputCharacters/
  );
});

test("css returns a SelectorList and supports ::text", () => {
  const titles = doc().css(".title::text");
  assert.ok(titles instanceof SelectorList);
  assert.deepEqual(titles.getall(), ["Widget A", "Widget B", "Clearance sale"]);
  assert.equal(titles.get(0), "Widget A");
});

test("css ::attr resolves relative http urls against the document url", () => {
  assert.deepEqual(doc().css("a::attr(href)").getall(), [
    "https://shop.test/a",
    "https://shop.test/b"
  ]);
});

test("css scopes to the current element when chained", () => {
  const second = doc().css("li.product").last;
  assert.equal(second.css(".price::text").get(), "$20");
  assert.equal(second.css(".title::text").getall().length, 1);
});

test("css rejects invalid selectors and honours limits", () => {
  assert.throws(() => doc().css("li[["), /Invalid CSS selector/);
  assert.throws(() => doc().css(""), /must contain 1-4096 characters/);
  assert.equal(doc().css("li", { limit: 2 }).length, 2);
});

test("xpath resolves back to live nodes that keep traversal", () => {
  const prices = doc().xpath("//span[@class='price']");
  assert.deepEqual(prices.map((entry) => entry.text), ["$10", "$20"]);
  assert.equal(prices.first.parent.tag, "li");
  assert.equal(prices.first.parent.attributes["data-id"], "1");
});

test("xpath validates the expression", () => {
  assert.throws(() => doc().xpath(""), /must contain 1-4096 characters/);
  assert.throws(() => doc().xpath("//["), /Invalid XPath/);
});

test("findAll filters by tag and attributes", () => {
  const page = doc();
  assert.equal(page.findAll("li", { class_: "product" }).length, 2);
  assert.equal(page.findAll("li", { "data-id": "2" }).length, 1);
  assert.equal(page.findAll("li", { class_: "product featured" }).length, 1);
  assert.equal(page.findAll("li", { "data-id": true }).length, 2);
  assert.equal(page.findAll("li", { "data-id": false }).length, 1);
  assert.equal(page.findAll("li", { "data-id": /^[0-9]$/ }).length, 2);
});

test("findAll rejects unsafe attribute records", () => {
  assert.throws(() => doc().findAll("li", JSON.parse('{"__proto__":"x"}')), /unsafe property/);
  assert.throws(() => doc().findAll("li", []), /must be an object/);
  assert.throws(() => doc().findAll(7), /tag must be a string/);
});

test("findByText matches substrings, exact values, and regular expressions", () => {
  const page = doc();
  assert.equal(page.findByText("Widget B").first.tag, "h2");
  assert.equal(page.findByText("widget b").length, 1);
  assert.equal(page.findByText("widget b", { ignoreCase: false }).length, 0);
  assert.equal(page.findByText("Widget A", { exact: true }).first.text, "Widget A");
  assert.equal(page.findByText(/clearance/iu).first.text, "Clearance sale");
  assert.equal(page.findByText("Widget", { tag: "h2" }).length, 2);
});

test("findByText prefers the deepest matching element", () => {
  const match = doc().findByText("Clearance sale");
  assert.equal(match.first.tag, "h2");
});

test("findByText requires usable input", () => {
  assert.throws(() => doc().findByText(""), /non-empty string or RegExp/);
});

test("navigation exposes parent, children, siblings, and order", () => {
  const first = doc().css("li.product").first;
  assert.equal(first.parent.tag, "ul");
  assert.equal(first.children.length, 3);
  assert.equal(first.next.attributes["data-id"], "2");
  assert.equal(first.next.previous.attributes["data-id"], "1");
  assert.equal(first.previous, null);
  assert.equal(first.siblings.length, 2);
  assert.ok(first.parents.some((entry) => entry.tag === "body"));
});

test("attr resolves document-relative urls only for url-bearing attributes", () => {
  const link = doc().css("a").first;
  assert.equal(link.attr("href"), "https://shop.test/a");
  assert.equal(link.attr("missing"), null);
  assert.equal(doc().css("li.product").first.attr("data-id"), "1");
});

test("cssPath and xpathPath round-trip to the same element", () => {
  const page = doc();
  const target = page.css("li.product").last;
  const rebuilt = page.css(target.cssPath());
  assert.equal(rebuilt.length, 1);
  assert.equal(rebuilt.first.attributes["data-id"], "2");
  assert.match(target.xpathPath(), /\/li\[2\]$/);
});

test("findSimilar returns sibling records without the anchor", () => {
  const first = doc().css("li.product").first;
  const similar = first.findSimilar({ threshold: 0.7 });
  assert.equal(similar.length, 1);
  assert.equal(similar.first.attributes["data-id"], "2");
});

test("similarityTo scores structural closeness", () => {
  const page = doc();
  const product = page.css("li.product").first;
  const promo = page.css("li.promo").first;
  assert.equal(product.similarityTo(product), 1);
  assert.ok(product.similarityTo(promo) < 0.7);
  assert.throws(() => product.similarityTo({}), /requires a Selector/);
});

test("relocate carries a selection across a redesign", () => {
  const redesigned = `<html><body><div id="app"><section><ul class="items">
<li class="card" data-id="1"><h3 class="name">Widget A</h3><span class="cost">$10</span></li>
</ul></section></div></body></html>`;
  const result = doc().css("h2.title").first.relocate(redesigned);
  assert.equal(result.found, true);
  assert.equal(result.element.text, "Widget A");
});

test("SelectorList aggregates text and attributes", () => {
  const page = doc();
  assert.equal(page.css("a").attr("href").length, 2);
  assert.match(page.css(".title").text, /Widget A Widget B Clearance sale/);
  assert.equal(page.css(".nothing").first, null);
  assert.equal(page.css(".nothing").get(0), null);
});

test("toJSON produces a serializable record", () => {
  const record = doc().css("li.product").first.toJSON();
  assert.equal(record.tag, "li");
  assert.equal(record.attributes["data-id"], "1");
  assert.ok(record.selector.length > 0);
  assert.doesNotThrow(() => JSON.stringify(record));
});

test("fingerprint and path helpers require an element selection", () => {
  const root = parseDocument("<html><body><p>x</p></body></html>");
  assert.equal(root.tag, "");
  assert.throws(() => root.fingerprint(), /requires an element selection/);
  assert.throws(() => root.cssPath(), /requires an element selection/);
  assert.throws(() => root.xpathPath(), /requires an element selection/);
});
