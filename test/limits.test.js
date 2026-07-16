import assert from "node:assert/strict";
import { createServer } from "node:http";
import { afterEach, test } from "node:test";
import { crawl, crawlDetailed, discoverSitemapUrls, extractPage } from "../src/index.js";

const servers = new Set();

async function listen(handler) {
  const server = createServer(handler);
  servers.add(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

afterEach(async () => {
  await Promise.all([...servers].map((server) => new Promise((resolve) => {
    server.close(() => resolve());
    server.closeAllConnections?.();
  })));
  servers.clear();
});

const localOptions = {
  obeyRobots: false,
  allowPrivateNetworks: true,
  delayMs: 0,
  maxRetries: 0
};

test("maxPages and onPage are exact under concurrency", async () => {
  let hits = 0;
  const baseUrl = await listen((request, response) => {
    hits += 1;
    response.setHeader("content-type", "text/html");
    response.end(`<main><h1>${request.url}</h1></main>`);
  });
  const observed = [];
  const pages = await crawl({
    ...localOptions,
    seeds: Array.from({ length: 8 }, (_, index) => `${baseUrl}/page-${index}`),
    maxPages: 3,
    concurrency: 8,
    onPage: (page) => observed.push(page.url)
  });
  assert.equal(pages.length, 3);
  assert.equal(observed.length, 3);
  assert.equal(hits, 3);
});

test("request budget is enforced atomically under concurrency", async () => {
  let hits = 0;
  const baseUrl = await listen(async (request, response) => {
    hits += 1;
    await new Promise((resolve) => setTimeout(resolve, 20));
    response.setHeader("content-type", "text/html");
    response.end("<main>ok</main>");
  });
  await assert.rejects(
    () => crawlDetailed({
      ...localOptions,
      seeds: ["/a", "/b", "/c"].map((path) => `${baseUrl}${path}`),
      maxPages: 3,
      maxRequests: 2,
      concurrency: 3
    }),
    (error) => error.code === "CRAWL_REQUEST_LIMIT"
  );
  assert.equal(hits, 2);
});

test("numeric, seed, URL, regex, and link collection limits are validated", async () => {
  for (const input of [
    { maxPages: 0 },
    { concurrency: 0 },
    { delayMs: -1 },
    { maxRequests: 1.5 },
    { maxDurationMs: Infinity },
    { maxPages: "1" },
    { maxPages: true },
    { maxRequests: "2" }
  ]) {
    await assert.rejects(() => crawl({ seeds: ["https://example.com"], ...input }), TypeError);
  }
  await assert.rejects(
    () => crawl({ seeds: ["https://one.example", "https://two.example"], maxSeeds: 1 }),
    /seeds exceeds maxSeeds/
  );
  await assert.rejects(
    () => crawl({ seeds: ["https://example.com"], include: ["(a+)+$"] }),
    /Unsafe include regex/
  );

  const page = extractPage(
    '<main><a href="/one">one</a><a href="/two">two</a><a href="/three">three</a></main>',
    "https://example.com/",
    { maxLinksPerPage: 2 }
  );
  assert.deepEqual(page.links, ["https://example.com/one", "https://example.com/two"]);
});

test("per-response and total byte budgets stop oversized content", async () => {
  const baseUrl = await listen((request, response) => {
    response.setHeader("content-type", "text/html");
    response.end(`<main>${"x".repeat(4_096)}</main>`);
  });
  const perPage = await crawlDetailed({
    ...localOptions,
    seeds: [baseUrl],
    maxBytes: 1_024
  });
  assert.equal(perPage.pages.length, 0);
  assert.match(perPage.failures[0].error, /maxBytes|too large/i);

  await assert.rejects(
    () => crawlDetailed({
      ...localOptions,
      seeds: [baseUrl],
      maxBytes: 8_192,
      maxTotalBytes: 1_024
    }),
    (error) => error.code === "CRAWL_TOTAL_BYTES_LIMIT"
  );
});

test("queue and URL-length budgets bound discovered links", async () => {
  let baseUrl;
  baseUrl = await listen((request, response) => {
    response.setHeader("content-type", "text/html");
    if (request.url === "/") {
      response.end(`<main>
        <a href="${baseUrl}/one">one</a>
        <a href="${baseUrl}/two">two</a>
        <a href="${baseUrl}/${"x".repeat(500)}">long</a>
      </main>`);
      return;
    }
    response.end(`<main><h1>${request.url}</h1></main>`);
  });
  const result = await crawlDetailed({
    ...localOptions,
    seeds: [baseUrl],
    maxPages: 3,
    maxQueue: 1,
    maxUrlLength: 256
  });
  assert.equal(result.pages.length, 2);
  assert.ok(result.stats.queueDropped >= 1);
  assert.equal(result.pages.some((page) => page.url.includes("x".repeat(100))), false);
});

test("total crawl deadline aborts an in-flight request", async () => {
  const baseUrl = await listen(async (request, response) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    response.setHeader("content-type", "text/html");
    response.end("<main>late</main>");
  });
  await assert.rejects(
    () => crawl({
      ...localOptions,
      seeds: [baseUrl],
      timeoutMs: 1_000,
      maxDurationMs: 100
    }),
    (error) => error.code === "CRAWL_DURATION_LIMIT"
  );
});

test("total crawl deadline bounds onPage and onError callbacks", async () => {
  const okUrl = await listen((request, response) => {
    response.setHeader("content-type", "text/html");
    response.end("<main><h1>callback</h1></main>");
  });
  let startedAt = Date.now();
  await assert.rejects(
    () => crawl({
      ...localOptions,
      seeds: [okUrl],
      maxDurationMs: 100,
      onPage: () => new Promise(() => {})
    }),
    (error) => error.code === "CRAWL_DURATION_LIMIT"
  );
  assert.ok(Date.now() - startedAt < 750, "onPage must not outlive the total deadline");

  const errorUrl = await listen((request, response) => {
    response.statusCode = 500;
    response.end("failure");
  });
  startedAt = Date.now();
  await assert.rejects(
    () => crawl({
      ...localOptions,
      seeds: [errorUrl],
      maxDurationMs: 100,
      onError: () => new Promise(() => {})
    }),
    (error) => error.code === "CRAWL_DURATION_LIMIT"
  );
  assert.ok(Date.now() - startedAt < 750, "onError must not outlive the total deadline");
});

test("AbortSignal stops a crawl before network requests", async () => {
  let hits = 0;
  const baseUrl = await listen((request, response) => {
    hits += 1;
    response.end("unexpected");
  });
  const controller = new AbortController();
  controller.abort(new Error("cancelled by test"));
  await assert.rejects(
    () => crawl({ ...localOptions, seeds: [baseUrl], signal: controller.signal }),
    /cancelled by test|aborted/i
  );
  assert.equal(hits, 0);
});

test("nested sitemap traversal obeys document and URL limits", async () => {
  const sitemapHits = new Map();
  let baseUrl;
  baseUrl = await listen((request, response) => {
    sitemapHits.set(request.url, (sitemapHits.get(request.url) || 0) + 1);
    response.setHeader("content-type", request.url.endsWith(".xml") ? "application/xml" : "text/html");
    if (request.url === "/s1.xml") {
      response.end(`<sitemapindex><sitemap><loc>${baseUrl}/s2.xml</loc></sitemap><sitemap><loc>${baseUrl}/s3.xml</loc></sitemap></sitemapindex>`);
    } else if (request.url === "/s2.xml" || request.url === "/s3.xml") {
      response.end(`<urlset>${Array.from({ length: 5 }, (_, index) => `<url><loc>${baseUrl}/page-${index}</loc></url>`).join("")}</urlset>`);
    } else {
      response.end("<main>page</main>");
    }
  });

  const urls = await discoverSitemapUrls(`${baseUrl}/s1.xml`, {
    allowPrivateNetworks: true,
    delayMs: 0,
    maxSitemaps: 2,
    maxUrlsPerSitemap: 2
  });
  assert.equal(sitemapHits.get("/s1.xml"), 1);
  assert.equal(sitemapHits.get("/s2.xml"), 1);
  assert.equal(sitemapHits.get("/s3.xml"), undefined);
  assert.deepEqual(urls.sort(), [`${baseUrl}/page-0`, `${baseUrl}/page-1`]);
});

test("sitemap entries obey origin, include, exclude, and sensitive-path policy", async () => {
  let baseUrl;
  baseUrl = await listen((request, response) => {
    response.setHeader("content-type", "application/xml");
    response.end(`<urlset>
      <url><loc>${baseUrl}/docs/allowed</loc></url>
      <url><loc>${baseUrl}/docs/private</loc></url>
      <url><loc>${baseUrl}/login</loc></url>
      <url><loc>http://127.0.0.1:1/docs/cross-origin</loc></url>
      <url><loc>${baseUrl}/blog/not-included</loc></url>
    </urlset>`);
  });
  const urls = await discoverSitemapUrls(`${baseUrl}/sitemap.xml`, {
    allowPrivateNetworks: true,
    delayMs: 0,
    include: ["/docs/"],
    exclude: ["/private"]
  });
  assert.deepEqual(urls, [`${baseUrl}/docs/allowed`]);
});

test("sensitive-path policy fails closed on encoded pages, redirects, and sitemaps", async () => {
  let encodedPageHits = 0;
  let encodedSitemapHits = 0;
  let baseUrl;
  baseUrl = await listen((request, response) => {
    if (/%(?:25)*61dmin/i.test(request.url)) {
      if (request.url.endsWith("sitemap.xml")) encodedSitemapHits += 1;
      else encodedPageHits += 1;
      response.end("must not be reached");
      return;
    }
    if (request.url === "/start") {
      response.setHeader("content-type", "text/html");
      response.end(`<main>
        <a href="/%61dmin">encoded</a>
        <a href="/%2561dmin">double encoded</a>
        <a href="/%252561dmin?next=%2561dmin">nested encoded</a>
        <a href="/safe">safe</a>
      </main>`);
      return;
    }
    if (request.url === "/redirect") {
      response.writeHead(302, { location: "/%2561dmin" });
      response.end();
      return;
    }
    if (request.url === "/sitemap.xml") {
      response.setHeader("content-type", "application/xml");
      response.end(`<sitemapindex>
        <sitemap><loc>${baseUrl}/%2561dmin-sitemap.xml</loc></sitemap>
        <sitemap><loc>${baseUrl}/safe-sitemap.xml</loc></sitemap>
      </sitemapindex>`);
      return;
    }
    if (request.url === "/redirecting-sitemap.xml") {
      response.writeHead(302, { location: "/%252561dmin/sitemap.xml" });
      response.end();
      return;
    }
    if (request.url === "/nested-index.xml") {
      response.setHeader("content-type", "application/xml");
      response.end(`<sitemapindex>
        <sitemap><loc>${baseUrl}/nested-redirect.xml</loc></sitemap>
      </sitemapindex>`);
      return;
    }
    if (request.url === "/nested-redirect.xml") {
      response.writeHead(302, { location: "/%252561dmin/sitemap.xml" });
      response.end();
      return;
    }
    if (request.url === "/safe-sitemap.xml") {
      response.setHeader("content-type", "application/xml");
      response.end(`<urlset>
        <url><loc>${baseUrl}/%61dmin</loc></url>
        <url><loc>${baseUrl}/%2561dmin</loc></url>
        <url><loc>${baseUrl}/safe</loc></url>
      </urlset>`);
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end("<main><h1>Safe</h1></main>");
  });

  const pages = await crawl({
    ...localOptions,
    seeds: [`${baseUrl}/start`],
    maxPages: 5,
    maxDepth: 1
  });
  assert.deepEqual(pages.map((page) => new URL(page.url).pathname).sort(), ["/safe", "/start"]);
  assert.equal(encodedPageHits, 0);

  await assert.rejects(
    () => crawl({ ...localOptions, seeds: [`${baseUrl}/redirect`] }),
    (error) => error.code === "CRAWLER_URL_BLOCKED"
  );
  assert.equal(encodedPageHits, 0);

  const urls = await discoverSitemapUrls(`${baseUrl}/sitemap.xml`, {
    allowPrivateNetworks: true,
    delayMs: 0
  });
  assert.deepEqual(urls, [`${baseUrl}/safe`]);
  assert.equal(encodedSitemapHits, 0);

  await assert.rejects(
    () => discoverSitemapUrls(`${baseUrl}/%61dmin-sitemap.xml`, {
      allowPrivateNetworks: true,
      delayMs: 0
    }),
    (error) => error.code === "CRAWLER_URL_BLOCKED"
  );
  assert.equal(encodedSitemapHits, 0);

  await assert.rejects(
    () => discoverSitemapUrls(`${baseUrl}/redirecting-sitemap.xml`, {
      allowPrivateNetworks: true,
      delayMs: 0
    }),
    (error) => error.code === "CRAWLER_URL_BLOCKED"
  );
  assert.equal(encodedSitemapHits, 0);

  await assert.rejects(
    () => discoverSitemapUrls(`${baseUrl}/nested-index.xml`, {
      allowPrivateNetworks: true,
      delayMs: 0
    }),
    (error) => error.code === "CRAWLER_URL_BLOCKED"
  );
  assert.equal(encodedSitemapHits, 0);
});

test("manual redirects retain provenance and obey maxRedirects", async () => {
  const baseUrl = await listen((request, response) => {
    if (request.url === "/start") {
      response.writeHead(302, { location: "/final" });
      response.end();
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end("<main><h1>Final</h1></main>");
  });
  const [page] = await crawl({ ...localOptions, seeds: [`${baseUrl}/start`], maxRedirects: 1 });
  assert.deepEqual(page.redirectChain, [{
    from: `${baseUrl}/start`,
    to: `${baseUrl}/final`,
    status: 302
  }]);

  const blocked = await crawlDetailed({ ...localOptions, seeds: [`${baseUrl}/start`], maxRedirects: 0 });
  assert.equal(blocked.pages.length, 0);
  assert.match(blocked.failures[0].error, /Redirect limit exceeded/);
});
