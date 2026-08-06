import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";

import { crawlDetailed } from "../src/index.js";

let server;
let baseUrl;

before(async () => {
  server = createServer((request, response) => {
    if (request.url === "/robots.txt") {
      response.setHeader("content-type", "text/plain");
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    if (request.url === "/api/products") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({
        products: [
          { sku: "A", price: 10, description: "A widget with a description long enough to exceed the ceiling." },
          { sku: "B", price: 20, description: "A second widget, also carrying a reasonably long description." }
        ]
      }));
      return;
    }
    if (request.url === "/api/tracking") {
      response.setHeader("content-type", "text/plain");
      response.end("ok");
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end(`<html><head><title>Shop</title></head><body><main><h1>Shop</h1><div id="out"></div></main>
      <script>
        fetch("/api/products").then((r) => r.json()).then((d) => {
          document.getElementById("out").textContent = d.products.length + " products";
        });
        fetch("/api/tracking");
      </script></body></html>`);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

async function crawlOnce(browser) {
  return crawlDetailed({
    seeds: [`${baseUrl}/`],
    maxPages: 1,
    maxDepth: 0,
    allowPrivateNetworks: true,
    browser: { waitUntil: "networkidle", ...browser }
  });
}

test("captureXhr records background api responses", async () => {
  const result = await crawlOnce({ captureXhr: true });
  assert.equal(result.pages.length, 1);

  const captured = result.pages[0].browserDetails.capturedXhr;
  assert.ok(captured.length >= 1, "expected at least one captured response");

  const products = captured.find((entry) => entry.url.endsWith("/api/products"));
  assert.ok(products, `expected /api/products in ${captured.map((c) => c.url).join(", ")}`);
  assert.equal(products.status, 200);
  assert.match(products.contentType, /application\/json/);
  assert.equal(products.truncated, false);
  assert.deepEqual(JSON.parse(products.body).products.length, 2);
});

test("captureXhr is off unless requested", async () => {
  const result = await crawlOnce({});
  assert.deepEqual(result.pages[0].browserDetails.capturedXhr, []);
});

test("captureXhr filters by content type", async () => {
  const result = await crawlOnce({ captureXhr: { contentTypes: ["application/json"] } });
  const captured = result.pages[0].browserDetails.capturedXhr;
  assert.ok(captured.length >= 1);
  assert.ok(
    captured.every((entry) => entry.contentType.includes("application/json")),
    `unexpected content types: ${captured.map((c) => c.contentType).join(", ")}`
  );
  assert.equal(captured.some((entry) => entry.url.endsWith("/api/tracking")), false);
});

test("captureXhr truncates a body past its ceiling and flags it", async () => {
  const result = await crawlOnce({ captureXhr: { maxBodyBytes: 64 } });
  const products = result.pages[0].browserDetails.capturedXhr
    .find((entry) => entry.url.endsWith("/api/products"));
  assert.ok(products);
  assert.equal(products.truncated, true);
  assert.ok(products.body.length <= 64);
  assert.ok(products.bytes > 64);
});

test("captureXhr honours its entry ceiling", async () => {
  const result = await crawlOnce({ captureXhr: { maxEntries: 1 } });
  assert.equal(result.pages[0].browserDetails.capturedXhr.length, 1);
});

test("captureXhr rejects malformed configuration", async () => {
  await assert.rejects(
    () => crawlOnce({ captureXhr: { nope: 1 } }),
    /Unknown browser.captureXhr option|Unknown browser option/
  );
  await assert.rejects(
    () => crawlOnce({ captureXhr: { contentTypes: "application/json" } }),
    /contentTypes must be an array/
  );
});

test("requestPolicy records what it blocked", async () => {
  const result = await crawlOnce({
    captureXhr: true,
    requestPolicy: { blockDomains: ["127.0.0.1/api/tracking"] }
  });
  const blocked = result.pages[0].browserDetails.blockedRequests;
  assert.ok(blocked.some((entry) => entry.url.endsWith("/api/tracking")), "tracking should be blocked");
  assert.equal(
    result.pages[0].browserDetails.capturedXhr.some((entry) => entry.url.endsWith("/api/tracking")),
    false,
    "a blocked request must not be captured"
  );
});
