import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import * as cheerio from "cheerio";

import {
  ElementFingerprintStore,
  adaptiveDefaults,
  createAdaptiveLocator,
  findSimilarElements,
  fingerprintElement,
  generateCssSelector,
  generateXPath,
  relocateElement,
  scoreFingerprints
} from "../src/adaptive.js";

const ORIGINAL = `<html><body><div class="wrap"><main><ul class="products">
<li class="product" data-id="1"><h2 class="title">Widget A</h2><span class="price">$10</span></li>
<li class="product" data-id="2"><h2 class="title">Widget B</h2><span class="price">$20</span></li>
</ul></main></div></body></html>`;

const REDESIGNED = `<html><body><div class="wrap redesign"><main><section><ul class="items grid">
<li class="item card" data-id="1"><h3 class="name">Widget A</h3><span class="cost">$10</span></li>
<li class="item card" data-id="2"><h3 class="name">Widget B</h3><span class="cost">$20</span></li>
</ul></section></main></div></body></html>`;

function fingerprintOf(html, selector) {
  const $ = cheerio.load(html);
  const node = $(selector).get(0);
  assert.ok(node, `expected ${selector} to match`);
  return { $, node, fingerprint: fingerprintElement($, node, {}) };
}

test("fingerprintElement captures identity, structure, and a stable digest", () => {
  const { fingerprint } = fingerprintOf(ORIGINAL, "li.product[data-id='1']");
  assert.equal(fingerprint.schema, adaptiveDefaults.fingerprintSchema);
  assert.equal(fingerprint.tag, "li");
  assert.deepEqual(fingerprint.classes, ["product"]);
  assert.equal(fingerprint.identity["data-id"], "1");
  assert.deepEqual(fingerprint.childTags, ["h2", "span"]);
  assert.match(fingerprint.digest, /^[0-9a-f]{64}$/);

  const repeat = fingerprintOf(ORIGINAL, "li.product[data-id='1']").fingerprint;
  assert.equal(fingerprint.digest, repeat.digest);
});

test("fingerprintElement rejects non-element nodes", () => {
  const $ = cheerio.load(ORIGINAL);
  assert.throws(() => fingerprintElement($, $.root().get(0), {}), /requires an element node/);
});

test("scoreFingerprints returns 1 for an identical element", () => {
  const left = fingerprintOf(ORIGINAL, "h2.title").fingerprint;
  const right = fingerprintOf(ORIGINAL, "h2.title").fingerprint;
  assert.equal(scoreFingerprints(left, right).score, 1);
});

test("scoreFingerprints rejects foreign records", () => {
  const valid = fingerprintOf(ORIGINAL, "h2.title").fingerprint;
  assert.throws(() => scoreFingerprints(valid, { schema: "other" }), /fingerprints must use/);
});

test("relocateElement survives a redesign that changes tag, classes, and depth", () => {
  const { fingerprint } = fingerprintOf(ORIGINAL, "li.product[data-id='1'] h2.title");
  const result = relocateElement(REDESIGNED, fingerprint, {});
  assert.equal(result.found, true);
  assert.ok(result.score >= 0.62, `score ${result.score} should clear the threshold`);
  assert.equal(result.element.tag, "h3");
  assert.equal(result.element.text, "Widget A");
  assert.equal(result.exact, false);
});

test("relocateElement distinguishes between sibling records", () => {
  const { fingerprint } = fingerprintOf(ORIGINAL, "li.product[data-id='2'] h2.title");
  const result = relocateElement(REDESIGNED, fingerprint, {});
  assert.equal(result.found, true);
  assert.equal(result.element.text, "Widget B");
});

test("relocateElement abstains when the element is absent", () => {
  const { fingerprint } = fingerprintOf(
    `<html><body><form><input id="checkout-token" name="checkout-token" value="abc"></form></body></html>`,
    "#checkout-token"
  );
  const result = relocateElement("<html><body><p>Service unavailable</p></body></html>", fingerprint, {});
  assert.equal(result.found, false);
  assert.ok(result.score < 0.62);
  assert.equal(result.element, null);
});

test("relocateElement honours an explicit threshold and tagLock", () => {
  const { fingerprint } = fingerprintOf(ORIGINAL, "h2.title");
  assert.equal(relocateElement(REDESIGNED, fingerprint, { threshold: 0.99 }).found, false);
  assert.equal(relocateElement(REDESIGNED, fingerprint, { tagLock: true }).found, false);
});

test("relocateElement rejects unknown options and malformed references", () => {
  const { fingerprint } = fingerprintOf(ORIGINAL, "h2.title");
  assert.throws(() => relocateElement(REDESIGNED, fingerprint, { nope: 1 }), /Unknown relocate option/);
  assert.throws(() => relocateElement(REDESIGNED, { schema: "bad" }, {}), /must be a .* fingerprint/);
  assert.throws(() => relocateElement(42, fingerprint, {}), /html must be a string/);
});

test("relocateElement enforces a node ceiling", () => {
  const { fingerprint } = fingerprintOf(ORIGINAL, "h2.title");
  assert.throws(() => relocateElement(REDESIGNED, fingerprint, { maxNodes: 2 }), /exceeds maxNodes/);
});

test("findSimilarElements ranks repeated records and excludes weak matches", () => {
  const { fingerprint } = fingerprintOf(ORIGINAL, "li.product[data-id='1']");
  const matches = findSimilarElements(ORIGINAL, fingerprint, {});
  assert.equal(matches.length, 2);
  assert.equal(matches[0].score, 1);
  assert.ok(matches[1].score >= 0.7);
  assert.ok(matches.every((match) => match.tag === "li"));
});

test("generateCssSelector prefers a unique id and round-trips", () => {
  const $ = cheerio.load(`<html><body><div id="app"><p class="one">a</p><p class="two">b</p></div></body></html>`);
  assert.equal(generateCssSelector($, $("#app").get(0)), "#app");
  const second = generateCssSelector($, $("p.two").get(0));
  assert.equal($(second).length, 1);
  assert.equal($(second).text(), "b");
});

test("generateXPath produces a positional path", () => {
  const $ = cheerio.load(ORIGINAL);
  const xpath = generateXPath($, $("li.product").get(1));
  assert.match(xpath, /\/li\[2\]$/);
});

test("ElementFingerprintStore round-trips and isolates namespaces", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "cockroach-adaptive-"));
  t.after(() => rm(directory, { recursive: true, force: true }));

  const store = new ElementFingerprintStore({ directory, namespace: "catalog" });
  const { fingerprint } = fingerprintOf(ORIGINAL, "h2.title");
  await store.save("title", fingerprint, { selector: "h2.title" });

  const loaded = await store.load("title");
  assert.equal(loaded.fingerprint.digest, fingerprint.digest);
  assert.equal(loaded.metadata.selector, "h2.title");

  const other = new ElementFingerprintStore({ directory, namespace: "other" });
  assert.equal(await other.load("title"), null);

  await store.delete("title");
  assert.equal(await store.load("title"), null);
});

test("ElementFingerprintStore requires an explicit directory", () => {
  assert.throws(() => new ElementFingerprintStore({}), /requires an explicit directory/);
  assert.throws(() => new ElementFingerprintStore({ directory: "x", namespace: "../bad" }), /namespace must contain/);
});

test("createAdaptiveLocator uses the selector first, then relocates after a redesign", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "cockroach-locator-"));
  t.after(() => rm(directory, { recursive: true, force: true }));

  const locate = createAdaptiveLocator(new ElementFingerprintStore({ directory }));

  const first = await locate("product-title", ORIGINAL, { selector: "h2.title" });
  assert.equal(first.found, true);
  assert.equal(first.locatedBy, "selector");
  assert.equal(first.text, "Widget A");

  const second = await locate("product-title", REDESIGNED, { selector: "h2.title" });
  assert.equal(second.found, true);
  assert.equal(second.locatedBy, "relocated");
  assert.equal(second.text, "Widget A");
  assert.equal(second.previousSelector, "h2.title");

  const third = await locate("product-title", REDESIGNED, { selector: second.selector });
  assert.equal(third.locatedBy, "selector");
});

test("createAdaptiveLocator reports a miss instead of guessing", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "cockroach-locator-miss-"));
  t.after(() => rm(directory, { recursive: true, force: true }));

  const locate = createAdaptiveLocator(new ElementFingerprintStore({ directory }));
  const unknown = await locate("never-seen", REDESIGNED, { selector: ".missing" });
  assert.equal(unknown.found, false);
  assert.equal(unknown.reason, "no-stored-fingerprint");

  await locate("token", `<html><body><input id="t" name="csrf" value="1"></body></html>`, { selector: "#t" });
  const gone = await locate("token", "<html><body><p>maintenance</p></body></html>", { selector: "#t" });
  assert.equal(gone.found, false);
  assert.equal(gone.reason, "below-threshold");
});

test("createAdaptiveLocator validates its collaborators", () => {
  assert.throws(() => createAdaptiveLocator({}), /must expose async save/);
});
