import assert from "node:assert/strict";
import test from "node:test";

import { createShellSession, parseCurl } from "../src/shell.js";

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

test("parseCurl extracts url, headers, and method", () => {
  const parsed = parseCurl('curl "https://shop.example/p?page=2" -H "Accept-Language: de-DE" -A "Mozilla/5.0" --compressed');
  assert.equal(parsed.url, "https://shop.example/p?page=2");
  assert.equal(parsed.method, "GET");
  assert.equal(parsed.headers["accept-language"], "de-DE");
  assert.equal(parsed.headers["user-agent"], "Mozilla/5.0");
  assert.deepEqual(parsed.crawlOptions.seeds, ["https://shop.example/p?page=2"]);
});

test("parseCurl infers POST from a body and warns it cannot be reproduced", () => {
  const parsed = parseCurl('curl https://x.test/api -d "a=1"');
  assert.equal(parsed.method, "POST");
  assert.ok(parsed.warnings.some((entry) => entry.includes("GET and HEAD only")));
});

test("parseCurl drops an Authorization header and says so", () => {
  const parsed = parseCurl('curl https://x.test/a -H "Authorization: Bearer secret"');
  assert.equal(parsed.headers.authorization, undefined);
  assert.ok(parsed.warnings.some((entry) => entry.includes("Authorization")));
  assert.equal(JSON.stringify(parsed).includes("secret"), false, "the token must not survive anywhere");
});

test("parseCurl handles --url, cookies, and line continuations", () => {
  const parsed = parseCurl('curl --url https://x.test/a -b "sid=1"');
  assert.equal(parsed.url, "https://x.test/a");
  assert.equal(parsed.headers.cookie, "sid=1");

  const wrapped = parseCurl("curl https://x.test/b \\n  -H 'Accept: text/html'");
  assert.equal(wrapped.url, "https://x.test/b");
  assert.equal(wrapped.headers.accept, "text/html");
});

test("parseCurl rejects non-curl and non-http input", () => {
  assert.throws(() => parseCurl("wget https://x.test"), /Not a curl command/);
  assert.throws(() => parseCurl("curling https://x.test"), /Not a curl command/);
  assert.throws(() => parseCurl("curl ftp://x.test/a"), /Only http\(s\) URLs/);
  assert.throws(() => parseCurl("curl -X GET"), /No URL found/);
});

test("the curl command prints runnable crawl options", async () => {
  const output = await session().execute("curl curl https://x.test/a -H 'Accept: text/html'");
  assert.match(output, /url {6}https:\/\/x\.test\/a/);
  assert.match(output, /await crawl\(/);
  assert.match(output, /"seeds"/);
});
