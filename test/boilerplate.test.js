import assert from "node:assert/strict";
import test from "node:test";
import * as cheerio from "cheerio";

import { boilerplateDefaults, normalizeBoilerplateOptions, stripBoilerplate } from "../src/boilerplate.js";
import { extractPage } from "../src/index.js";

const PAGE = `<html><body>
  <header class="site-header"><nav class="main-nav"><a href="/a">Home</a><a href="/b">Docs</a><a href="/c">Blog</a></nav></header>
  <div class="cookie-consent">We use cookies to improve your experience. Accept all cookies?</div>
  <main>
    <h1>Understanding tokenizers</h1>
    <p>A tokenizer splits text into units a model can consume, and the choice of unit changes everything downstream.</p>
    <p>Byte pair encoding merges frequent adjacent pairs until the vocabulary reaches a target size.</p>
    <aside class="related-posts"><h3>Related</h3><ul><li><a href="/x">Another post</a></li><li><a href="/y">More reading</a></li></ul></aside>
  </main>
  <footer class="site-footer"><p>Copyright 2026. All rights reserved.</p></footer>
</body></html>`;

function strip(html, options) {
  const $ = cheerio.load(html);
  const root = $("main").length ? $("main") : $("body");
  const result = stripBoilerplate($, root, normalizeBoilerplateOptions(options));
  return { text: root.text().replace(/\s+/g, " ").trim(), result };
}

test("the default removes landmark boilerplate and keeps the article", () => {
  const extracted = extractPage(PAGE, "https://x.test/post").text;
  assert.match(extracted, /Understanding tokenizers/);
  assert.match(extracted, /Byte pair encoding/);
  assert.doesNotMatch(extracted, /Related/, "an aside inside main should go");
});

test("boilerplate can be turned off explicitly", () => {
  const off = extractPage(PAGE, "https://x.test/post", { boilerplate: "off" }).text;
  assert.match(off, /Related/, "off must keep everything");
  assert.equal(normalizeBoilerplateOptions(false).mode, "off");
  assert.equal(normalizeBoilerplateOptions(null).mode, "off");
});

test("balanced also removes labelled boilerplate outside landmarks", () => {
  const bodyOnly = PAGE.replace("<main>", "<div class='page'>").replace("</main>", "</div>");
  const structural = extractPage(bodyOnly, "https://x.test/post", { boilerplate: "structural" }).text;
  const balanced = extractPage(bodyOnly, "https://x.test/post", { boilerplate: "balanced" }).text;

  assert.match(structural, /cookies/, "a labelled cookie banner is not a landmark");
  assert.doesNotMatch(balanced, /cookies/, "balanced should remove it by label");
  assert.match(balanced, /Byte pair encoding/, "the article must survive either way");
});

test("an element holding most of the text is never removed", () => {
  const html = `<html><body><div class="content-header">
    <p>${"This is the entire article body and it happens to sit in a container whose class name looks like boilerplate. ".repeat(12)}</p>
  </div></body></html>`;
  const { text } = strip(html, "aggressive");
  assert.match(text, /entire article body/, "the text-share guard must protect the content");
});

test("the text-share guard is configurable and enforced", () => {
  const html = `<html><body><div class="sidebar"><p>${"padding ".repeat(60)}</p></div><p>tiny</p></body></html>`;
  const permissive = strip(html, { mode: "balanced", maxTextShare: 0.99 });
  assert.equal(permissive.result.removed >= 1, true, "a high share ceiling allows removal");

  const strict = strip(html, { mode: "balanced", maxTextShare: 0.01 });
  assert.match(strict.text, /padding/, "a low ceiling protects it");
});

test("link-dense blocks are removed and prose is not", () => {
  const html = `<html><body>
    <div class="block-one"><a href="/1">Getting started guide</a> <a href="/2">Configuration reference</a> <a href="/3">Deployment checklist</a> <a href="/4">Troubleshooting</a></div>
    <div class="block-two"><p>${"Ordinary prose that carries no links whatsoever and should be kept intact. ".repeat(4)}</p></div>
  </body></html>`;
  const { text } = strip(html, { mode: "balanced", maxTextShare: 0.9, labels: false, linkDensity: 0.8 });
  assert.doesNotMatch(text, /Deployment checklist/, "a wall of links is boilerplate");
  assert.match(text, /Ordinary prose/, "prose must survive");
});

test("structural mode leaves labelled elements alone", () => {
  const html = `<html><body><div class="newsletter-signup"><p>Subscribe to our newsletter for updates.</p></div><p>Body.</p></body></html>`;
  assert.match(strip(html, "structural").text, /Subscribe/);
  assert.doesNotMatch(strip(html, { mode: "balanced", maxTextShare: 0.9 }).text, /Subscribe/);
});

test("removal reasons are reported", () => {
  const { result } = strip(PAGE.replace("<main>", "<div>").replace("</main>", "</div>"), "balanced");
  assert.ok(result.removed > 0);
  assert.ok(Object.keys(result.reasons).length > 0);
  assert.ok(Object.values(result.reasons).every((count) => count > 0));
});

test("options are validated", () => {
  assert.throws(() => normalizeBoilerplateOptions("everything"), /must be one of/);
  assert.throws(() => normalizeBoilerplateOptions({ mode: "nope" }), /mode must be one of/);
  assert.throws(() => normalizeBoilerplateOptions({ nope: 1 }), /Unknown boilerplate option/);
  assert.throws(() => normalizeBoilerplateOptions({ maxTextShare: 2 }), /must be a finite number/);
  assert.throws(() => normalizeBoilerplateOptions({ labels: "yes" }), /must be a boolean/);
  assert.throws(() => normalizeBoilerplateOptions([]), /must be an object/);
});

test("presets and pattern inventory are published", () => {
  assert.deepEqual(boilerplateDefaults.presets, ["off", "structural", "balanced", "aggressive"]);
  assert.ok(boilerplateDefaults.labelPatternCount >= 15);
  assert.ok(boilerplateDefaults.structuralSelectors.includes("nav"));
});

test("an empty root is handled without throwing", () => {
  const $ = cheerio.load("<html><body></body></html>");
  const result = stripBoilerplate($, $("body"), normalizeBoilerplateOptions("balanced"));
  assert.equal(result.removed, 0);
});
