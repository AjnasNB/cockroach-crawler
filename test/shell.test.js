import assert from "node:assert/strict";
import test from "node:test";

import { createShellSession } from "../src/shell.js";

const PAGE = `<html><body><div id="app"><ul class="products">
<li class="product" data-id="1"><h2 class="title">Widget A</h2><a href="/a">Buy</a><span class="price">$10</span></li>
<li class="product" data-id="2"><h2 class="title">Widget B</h2><a href="/b">Buy</a><span class="price">$20</span></li>
</ul></div></body></html>`;

function session() {
  const shell = createShellSession({});
  return shell;
}

async function load(shell) {
  await shell.execute(`load ${PAGE}`);
  return shell;
}

test("help lists every command", async () => {
  const output = await session().execute("help");
  for (const name of ["fetch", "css", "xpath", "text", "similar", "path", "extract", "export", "identity", "status"]) {
    assert.match(output, new RegExp(`\\b${name}\\b`), `help should mention ${name}`);
  }
});

test("an empty line is a no-op and unknown commands are rejected", async () => {
  const shell = session();
  assert.equal(await shell.execute("   "), "");
  await assert.rejects(() => shell.execute("frobnicate"), /Unknown command 'frobnicate'/);
});

test("queries require a loaded page", async () => {
  await assert.rejects(() => session().execute("css .title"), /Load a page first/);
});

test("load then css returns matches", async () => {
  const shell = await load(session());
  const output = await shell.execute("css .title::text");
  assert.match(output, /Widget A/);
  assert.match(output, /Widget B/);
});

test("css reports no match cleanly", async () => {
  const shell = await load(session());
  assert.equal(await shell.execute("css .nothing"), "No match.");
});

test("xpath queries the loaded page", async () => {
  const shell = await load(session());
  const output = await shell.execute("xpath //span[@class='price']");
  assert.match(output, /\$10/);
  assert.match(output, /\$20/);
});

test("text finds elements by content", async () => {
  const shell = await load(session());
  const output = await shell.execute("text Widget B");
  assert.match(output, /h2/);
  assert.match(output, /Widget B/);
});

test("similar pulls the sibling record", async () => {
  const shell = await load(session());
  const output = await shell.execute("similar li.product");
  assert.match(output, /li/);
  assert.match(output, /1\.000|0\.\d+/);
});

test("path prints a round-trippable css and xpath", async () => {
  const shell = await load(session());
  const output = await shell.execute("path li.product");
  assert.match(output, /^css: {3}/mu);
  assert.match(output, /^xpath: /mu);
});

test("extract then export produces csv", async () => {
  const shell = await load(session());
  const extracted = await shell.execute("extract title=.title price=.price");
  assert.match(extracted, /Widget A/);

  const csv = await shell.execute("export csv");
  assert.match(csv, /title,price/);
  assert.match(csv, /Widget A/);
});

test("export refuses before an extraction and rejects a bad format", async () => {
  const shell = await load(session());
  assert.match(await shell.execute("export csv"), /Nothing to export/);
  await shell.execute("extract title=.title");
  await assert.rejects(() => shell.execute("export yaml"), /Unknown export format/);
});

test("extract rejects a malformed field", async () => {
  const shell = await load(session());
  await assert.rejects(() => shell.execute("extract nonsense"), /Malformed field/);
});

test("identity shows and sets a profile", async () => {
  const shell = session();
  assert.match(await shell.execute("identity"), /chrome-windows/);
  assert.match(await shell.execute("identity safari-ios"), /iPhone/);
  assert.equal(shell.state.identity, "safari-ios");
  await assert.rejects(() => shell.execute("identity netscape"), /Unknown identity profile/);
});

test("challenge classifies the loaded markup", async () => {
  const shell = await load(session());
  assert.match(await shell.execute("challenge"), /"challenged": false/);

  await shell.execute(`load <html><body><script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script></body></html>`);
  assert.match(await shell.execute("challenge"), /"vendor": "cloudflare"/);
});

test("status reports the loaded state", async () => {
  const shell = await load(session());
  const output = await shell.execute("status");
  assert.match(output, /loaded {4}\d+ chars/);
  assert.match(output, /identity {2}default/);
});

test("a wrapped free-form argument has its quotes stripped", async () => {
  const shell = await load(session());
  assert.match(await shell.execute(`text "Widget A"`), /Widget A/);
});

test("quotes inside an expression are preserved", async () => {
  const shell = await load(session());
  assert.match(await shell.execute("xpath //span[@class='price']"), /\$10/);
  assert.match(await shell.execute(`css li[data-id="2"] .title::text`), /Widget B/);
});

test("markup keeps its attribute quotes when loaded", async () => {
  const shell = session();
  await shell.execute(`load <html><body><a href="/x" id="link">Go</a></body></html>`);
  assert.match(await shell.execute("css #link::attr(href)"), /\/x/);
});

test("an unterminated quote is still refused for discrete arguments", async () => {
  await assert.rejects(() => session().execute(`relocate "unterminated`), /Unterminated quote/);
});

test("oversized input is refused", async () => {
  await assert.rejects(() => session().execute(`css ${"a".repeat(9_000)}`), /exceeds 8192 characters/);
});
