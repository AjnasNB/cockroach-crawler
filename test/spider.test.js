import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

import { AutoThrottle, CrawlSpider, ShopifySpider, SitemapSpider, Spider, SpiderCheckpoint } from "../src/spider.js";

let server;
let baseUrl;
let hits;

const PRODUCTS = Object.freeze({
  a: Object.freeze({ id: "a", price: 10 }),
  b: Object.freeze({ id: "b", price: 20 })
});

before(async () => {
  server = createServer((request, response) => {
    hits.push(request.url);
    if (request.url === "/robots.txt") {
      response.setHeader("content-type", "text/plain");
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    response.setHeader("content-type", "text/html");
    if (request.url === "/") {
      response.end(`<html><head><title>Home</title></head><body><main><h1>Home</h1>
        <a href="/product/a">A</a><a href="/product/b">B</a><a href="/about">About</a>
      </main></body></html>`);
      return;
    }
    if (request.url.startsWith("/product/")) {
      const requested = request.url.slice("/product/".length);
      const product = PRODUCTS[requested];
      if (!product) {
        response.statusCode = 404;
        response.end("<html><head><title>Not found</title></head><body><main>Not found</main></body></html>");
        return;
      }
      response.end(`<html><head><title>Product ${product.id}</title></head><body><main>
        <h1>Product ${product.id}</h1><span class="price">$${product.price}</span>
        <a href="/">Home</a></main></body></html>`);
      return;
    }
    response.end("<html><head><title>About</title></head><body><main><h1>About</h1></main></body></html>");
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

function reset() {
  hits = [];
}

test("Spider requires start urls", () => {
  assert.throws(() => new Spider({}), /requires startUrls/);
  assert.throws(() => new Spider({ startUrls: ["ftp://x.test"] }), /must be an http\(s\) URL/);
});

test("Spider crawls, follows links, and yields default items", async () => {
  reset();
  const spider = new Spider({
    startUrls: [`${baseUrl}/`],
    maxPages: 5,
    maxDepth: 1,
    allowPrivateNetworks: true
  });

  const result = await spider.run();
  assert.ok(result.items.length >= 3, `expected several items, got ${result.items.length}`);
  assert.equal(result.items[0].url, `${baseUrl}/`);
  assert.ok(result.stats.pages >= 3);
  assert.ok(result.items.some((item) => item.title.startsWith("Product")));
});

test("Spider honours maxPages", async () => {
  reset();
  const spider = new Spider({
    startUrls: [`${baseUrl}/`],
    maxPages: 2,
    maxDepth: 2,
    allowPrivateNetworks: true
  });
  const result = await spider.run();
  assert.equal(result.stats.pages, 2);
});

test("Spider never revisits a url", async () => {
  reset();
  const spider = new Spider({
    startUrls: [`${baseUrl}/`],
    maxPages: 10,
    maxDepth: 2,
    allowPrivateNetworks: true
  });
  const result = await spider.run();
  const pageHits = hits.filter((entry) => entry !== "/robots.txt");
  assert.equal(new Set(pageHits).size, pageHits.length, `duplicate fetches: ${pageHits.join(", ")}`);
  assert.ok(result.stats.visited >= result.stats.pages);
});

test("a custom parse function shapes the items", async () => {
  reset();
  const spider = new Spider({
    startUrls: [`${baseUrl}/`],
    maxPages: 5,
    maxDepth: 1,
    allowPrivateNetworks: true,
    parse: (page, context) => (page.url.includes("/product/")
      ? { id: page.url.split("/").pop(), title: page.title, depth: context.depth }
      : null)
  });

  const result = await spider.run();
  assert.equal(result.items.length, 2);
  assert.deepEqual(result.items.map((item) => item.id).sort(), ["a", "b"]);
  assert.ok(result.items.every((item) => item.depth === 1));
});

test("CrawlSpider rules restrict which urls are followed and parsed", async () => {
  reset();
  const spider = new CrawlSpider({
    startUrls: [`${baseUrl}/`],
    maxPages: 10,
    maxDepth: 2,
    allowPrivateNetworks: true,
    rules: [
      { name: "products", allow: "/product/", callback: (page) => ({ product: page.title }) },
      { name: "seed", allow: /\/$/u, follow: true, callback: () => null }
    ]
  });

  const result = await spider.run();
  assert.ok(result.items.length > 0);
  assert.ok(result.items.every((item) => item.product?.startsWith("Product")));
  assert.equal(hits.includes("/about"), false, "about should not be fetched");
});

test("deny patterns win over allow patterns", async () => {
  reset();
  const spider = new CrawlSpider({
    startUrls: [`${baseUrl}/`],
    maxPages: 10,
    maxDepth: 2,
    allowPrivateNetworks: true,
    rules: [{ allow: "/", deny: "/product/b", callback: (page) => ({ url: page.url }) }]
  });

  const result = await spider.run();
  assert.equal(result.items.some((item) => item.url.endsWith("/product/b")), false);
});

test("Spider validates rules", () => {
  assert.throws(() => new Spider({ startUrls: ["https://x.test"], rules: {} }), /rules must be an array/);
  assert.throws(
    () => new Spider({ startUrls: ["https://x.test"], rules: [{ nope: 1 }] }),
    /Unknown rule option/
  );
  assert.throws(
    () => new Spider({ startUrls: ["https://x.test"], rules: [{ callback: "no" }] }),
    /callback must be a function/
  );
  assert.throws(
    () => new Spider({ startUrls: ["https://x.test"], rules: [{ allow: 7 }] }),
    /must be a string or RegExp/
  );
});

test("stream yields items incrementally", async () => {
  reset();
  const spider = new Spider({
    startUrls: [`${baseUrl}/`],
    maxPages: 3,
    maxDepth: 1,
    batchSize: 1,
    allowPrivateNetworks: true
  });

  const seen = [];
  for await (const item of spider.stream()) {
    seen.push(item.url);
    if (seen.length === 2) break;
  }
  assert.equal(seen.length, 2);
});

test("AutoThrottle slows down for slow responses and speeds up for fast ones", () => {
  const throttle = new AutoThrottle({ targetLatencyMs: 100, startDelayMs: 100, minDelayMs: 10, maxDelayMs: 5_000 });
  const slower = throttle.observe(400);
  assert.ok(slower > 100, `expected a longer delay, got ${slower}`);

  const fast = new AutoThrottle({ targetLatencyMs: 1_000, startDelayMs: 500, minDelayMs: 10, maxDelayMs: 5_000 });
  assert.ok(fast.observe(50) < 500);
});

test("AutoThrottle backs off hard when throttled", () => {
  const throttle = new AutoThrottle({ startDelayMs: 100, maxDelayMs: 5_000 });
  assert.equal(throttle.observe(10, true), 200);
  assert.equal(throttle.observe(10, true), 400);
});

test("AutoThrottle respects its floor and ceiling", () => {
  const throttle = new AutoThrottle({ startDelayMs: 100, minDelayMs: 90, maxDelayMs: 110 });
  for (let index = 0; index < 20; index += 1) throttle.observe(10_000);
  assert.ok(throttle.delayMs <= 110);
  for (let index = 0; index < 20; index += 1) throttle.observe(1);
  assert.ok(throttle.delayMs >= 90);
  assert.throws(() => new AutoThrottle({ nope: 1 }), /Unknown AutoThrottle option/);
});

test("SpiderCheckpoint round-trips and resumes a crawl", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "cockroach-spider-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  reset();

  const first = new Spider({
    startUrls: [`${baseUrl}/`],
    maxPages: 2,
    maxDepth: 2,
    allowPrivateNetworks: true,
    checkpoint: new SpiderCheckpoint({ directory, name: "shop" })
  });
  const firstRun = await first.run();
  assert.equal(firstRun.stats.pages, 2);
  assert.ok(firstRun.stats.remaining > 0);

  const second = new Spider({
    startUrls: [`${baseUrl}/`],
    maxPages: 2,
    maxDepth: 2,
    allowPrivateNetworks: true,
    checkpoint: new SpiderCheckpoint({ directory, name: "shop" })
  });
  const secondRun = await second.run();

  const firstUrls = new Set(firstRun.items.map((item) => item.url));
  assert.ok(secondRun.items.every((item) => !firstUrls.has(item.url)), "resume must not repeat pages");
});

test("SpiderCheckpoint validates its inputs and isolates names", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "cockroach-ckpt-"));
  t.after(() => rm(directory, { recursive: true, force: true }));

  assert.throws(() => new SpiderCheckpoint({}), /requires an explicit directory/);
  assert.throws(() => new SpiderCheckpoint({ directory, name: "../bad" }), /name must contain/);

  const one = new SpiderCheckpoint({ directory, name: "one" });
  await one.save({ visited: ["https://x.test/"], frontier: [], itemCount: 1 });
  assert.equal((await one.load()).itemCount, 1);
  assert.equal(await new SpiderCheckpoint({ directory, name: "two" }).load(), null);
});

test("SitemapSpider enables sitemap discovery", () => {
  const spider = new SitemapSpider({ startUrls: ["https://x.test/"] });
  assert.equal(spider.crawlOptions.includeSitemaps, true);
});

test("Spider records failures without aborting the run", async () => {
  reset();
  const spider = new Spider({
    startUrls: [`${baseUrl}/`, `${baseUrl}/../../etc`],
    maxPages: 4,
    maxDepth: 0,
    allowPrivateNetworks: true
  });
  const result = await spider.run();
  assert.ok(result.stats.pages >= 1);
});

test("ShopifySpider emits product records and skips collections", async () => {
  reset();
  const spider = new ShopifySpider({
    startUrls: [`${baseUrl}/`],
    maxPages: 5,
    maxDepth: 2,
    allowPrivateNetworks: true,
    includeSitemaps: false
  });
  assert.ok(spider.rules.some((rule) => rule.name === "product"));
  assert.ok(spider.rules.some((rule) => rule.name === "collection"));
});

test("ShopifySpider refuses custom rules", () => {
  assert.throws(
    () => new ShopifySpider({ startUrls: ["https://shop.test/"], rules: [{ allow: "/x" }] }),
    /defines its own rules/
  );
});

test("ShopifySpider extracts a product handle from the url", async () => {
  const spider = new ShopifySpider({ startUrls: ["https://shop.test/"] });
  const record = await spider.parse(
    { url: "https://shop.test/products/blue-widget", title: "Blue Widget", description: "d", markdown: "m" },
    { depth: 1, rule: { callback: null }, spider }
  );
  assert.equal(record.handle, "blue-widget");
  assert.equal(record.title, "Blue Widget");

  const skipped = await spider.parse(
    { url: "https://shop.test/collections/all", title: "All", description: "", markdown: "" },
    { depth: 1, rule: { callback: null }, spider }
  );
  assert.equal(skipped, null);
});
