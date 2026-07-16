import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { crawl, discoverSitemapUrls, extractPage } from "../src/index.js";
import { createCockroachCrawlerTool, runCockroachCrawlerTool } from "../src/agent.js";

let server;
let baseUrl;

before(async () => {
  server = createServer((req, res) => {
    if (req.url === "/robots.txt") {
      res.setHeader("content-type", "text/plain");
      res.end("User-agent: *\nDisallow: /private\nSitemap: /sitemap.xml\n");
      return;
    }
    if (req.url === "/sitemap.xml") {
      res.setHeader("content-type", "application/xml");
      res.end(`<?xml version="1.0"?><sitemapindex><sitemap><loc>${baseUrl}/nested-sitemap.xml</loc></sitemap></sitemapindex>`);
      return;
    }
    if (req.url === "/nested-sitemap.xml") {
      res.setHeader("content-type", "application/xml");
      res.end(`<?xml version="1.0"?><urlset><url><loc>${baseUrl}/about</loc></url></urlset>`);
      return;
    }
    if (req.url === "/") {
      res.setHeader("content-type", "text/html");
      res.end(`
        <html>
          <head><title>Home</title><meta name="description" content="Home description"></head>
          <body><main><h1>Home page</h1><p>Hello crawler.</p><a href="/about">About</a><a href="/private">Private</a></main></body>
        </html>
      `);
      return;
    }
    if (req.url === "/about") {
      res.setHeader("content-type", "text/html");
      res.end("<html><body><main><h1>About</h1><p>About text.</p></main></body></html>");
      return;
    }
    if (req.url === "/private") {
      res.setHeader("content-type", "text/html");
      res.end("<html><body><main><h1>Private</h1></main></body></html>");
      return;
    }
    res.statusCode = 404;
    res.end("missing");
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("extractPage returns agent-friendly fields", () => {
  const page = extractPage("<html><head><title>Test</title></head><body><main><h1>Hello</h1><p>World</p></main></body></html>", "https://example.com/");
  assert.equal(page.title, "Test");
  assert.equal(page.h1, "Hello");
  assert.match(page.markdown, /Hello/);
  assert.match(page.text, /World/);
});

test("crawler respects robots.txt and extracts linked pages", async () => {
  const pages = await crawl({
    seeds: [`${baseUrl}/`],
    maxPages: 5,
    concurrency: 2,
    delayMs: 0,
    allowPrivateNetworks: true
  });

  const urls = pages.map((page) => new URL(page.url).pathname).sort();
  assert.deepEqual(urls, ["/", "/about"]);
  assert.equal(pages.some((page) => page.url.endsWith("/private")), false);
});

test("crawler can discover sitemap URLs", async () => {
  const pages = await crawl({
    seeds: [`${baseUrl}/`],
    includeSitemaps: true,
    maxPages: 2,
    delayMs: 0,
    allowPrivateNetworks: true
  });

  assert.ok(pages.some((page) => page.url.endsWith("/about")));
});

test("discoverSitemapUrls follows sitemap indexes", async () => {
  const urls = await discoverSitemapUrls(`${baseUrl}/sitemap.xml`, {
    userAgent: "CockroachCrawlerTest/1.0",
    timeoutMs: 15_000,
    maxBytes: 1024 * 1024,
    allowPrivateNetworks: true,
    delayMs: 0
  });

  assert.deepEqual(urls, [`${baseUrl}/about`]);
});

test("crawler validates bad inputs early", async () => {
  await assert.rejects(
    () => crawl({ seeds: ["notaurl"] }),
    /Invalid HTTP\(S\) seed URL/
  );

  await assert.rejects(
    () => crawl({ seeds: [`${baseUrl}/`], maxPages: 0 }),
    /maxPages must be a safe integer from 1/
  );

  await assert.rejects(
    () => crawl({ seeds: [`${baseUrl}/`], include: ["["], allowPrivateNetworks: true }),
    /Invalid include regex/
  );

  await assert.rejects(
    () => crawl({ seeds: [`${baseUrl}/`], browser: { waitUntil: "idle-ish" }, allowPrivateNetworks: true }),
    /browser\.waitUntil must be one of/
  );
});

test("agent adapter exposes executable crawler tool", async () => {
  const tool = createCockroachCrawlerTool({
    maxPages: 1,
    delayMs: 0,
    allowPrivateNetworks: true
  });

  assert.equal(tool.name, "cockroach_crawl");
  assert.equal(typeof tool.execute, "function");
  assert.equal(tool.parameters.required.includes("urls"), true);

  const result = await tool.execute({
    urls: [`${baseUrl}/`]
  });

  assert.equal(result.pages.length, 1);
  assert.equal(result.pages[0].title, "Home");
  assert.equal(result.stats.fetched, 1);
});

test("agent adapter can run directly", async () => {
  const result = await runCockroachCrawlerTool({
    urls: [`${baseUrl}/`],
    maxPages: 1
  }, {
    maxPages: 1,
    delayMs: 0,
    allowPrivateNetworks: true
  });

  assert.equal(result.pages[0].h1, "Home page");
});
