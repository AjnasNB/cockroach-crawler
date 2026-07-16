import assert from "node:assert/strict";
import { createServer } from "node:http";
import { afterEach, test } from "node:test";
import { createCockroachCrawlerTool } from "../src/agent.js";
import {
  classifyIpAddress,
  crawl,
  crawlDetailed,
  resolveUrlTarget
} from "../src/index.js";

const servers = new Set();

async function listen(handler) {
  const server = createServer(handler);
  servers.add(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    server,
    url: `http://127.0.0.1:${server.address().port}`
  };
}

afterEach(async () => {
  await Promise.all([...servers].map((server) => new Promise((resolve) => {
    server.close(() => resolve());
    server.closeAllConnections?.();
  })));
  servers.clear();
});

test("IP classification covers private, mapped, metadata, and multicast ranges", () => {
  assert.equal(classifyIpAddress("127.0.0.1").range, "loopback");
  assert.equal(classifyIpAddress("10.0.0.1").range, "private");
  assert.equal(classifyIpAddress("169.254.169.254").range, "metadata");
  assert.equal(classifyIpAddress("::1").range, "loopback");
  assert.equal(classifyIpAddress("::ffff:127.0.0.1").range, "loopback");
  assert.equal(classifyIpAddress("fd00:ec2::254").range, "metadata");
  assert.equal(classifyIpAddress("168.63.129.16").range, "metadata");
  assert.equal(classifyIpAddress("::ffff:168.63.129.16").range, "metadata");
  assert.equal(classifyIpAddress("224.0.0.1").range, "multicast");
  assert.equal(classifyIpAddress("8.8.8.8").isPublic, true);
});

test("Azure and other provider platform endpoints are denied in every supported form", async () => {
  for (const url of [
    "http://168.63.129.16/",
    "http://2822734096/",
    "http://0xa83f8110/",
    "http://[::ffff:168.63.129.16]/",
    "http://100.100.100.200/",
    "http://192.0.0.192/"
  ]) {
    await assert.rejects(
      () => resolveUrlTarget(url, { allowPrivateNetworks: true }),
      (error) => error.code === "CRAWLER_URL_BLOCKED" && error.details.range === "metadata"
    );
  }

  await assert.rejects(
    () => resolveUrlTarget("https://platform-alias.example/", {
      allowPrivateNetworks: true,
      lookup: async () => [{ address: "168.63.129.16", family: 4 }]
    }),
    (error) => error.code === "CRAWLER_URL_BLOCKED"
      && error.details.address === "168.63.129.16"
      && error.details.range === "metadata"
  );
});

test("URL resolution blocks credentials, unsafe schemes, alternate IP forms, and mixed DNS", async () => {
  for (const url of [
    "file:///etc/passwd",
    "http://user:pass@example.com/",
    "http://127.0.0.1/",
    "http://2130706433/",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://metadata.google.internal/",
    "http://instance-data.ec2.internal/"
  ]) {
    await assert.rejects(
      () => resolveUrlTarget(url),
      (error) => error.code === "CRAWLER_URL_BLOCKED"
    );
  }

  await assert.rejects(
    () => resolveUrlTarget("https://mixed.example/", {
      lookup: async () => [
        { address: "8.8.8.8", family: 4 },
        { address: "127.0.0.1", family: 4 }
      ]
    }),
    (error) => error.code === "CRAWLER_URL_BLOCKED" && error.details.address === "127.0.0.1"
  );
});

test("private-network opt-in never permits metadata, link-local, multicast, or unspecified targets", async () => {
  const target = await resolveUrlTarget("http://127.0.0.1/", { allowPrivateNetworks: true });
  assert.equal(target.address, "127.0.0.1");

  for (const address of ["169.254.169.254", "224.0.0.1", "0.0.0.0", "[fd00:ec2::254]"]) {
    await assert.rejects(
      () => resolveUrlTarget(`http://${address}/`, { allowPrivateNetworks: true }),
      (error) => error.code === "CRAWLER_URL_BLOCKED"
    );
  }
});

test("exported URL resolver snapshots and validates its security options", async () => {
  Object.defineProperty(Object.prototype, "allowPrivateNetworks", {
    configurable: true,
    enumerable: true,
    value: true
  });
  try {
    await assert.rejects(
      () => resolveUrlTarget("http://127.0.0.1/"),
      /Inherited URL security option 'allowPrivateNetworks'/
    );
  } finally {
    delete Object.prototype.allowPrivateNetworks;
  }

  let getterCalls = 0;
  const accessorOptions = Object.create(null);
  Object.defineProperty(accessorOptions, "allowPrivateNetworks", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return true;
    }
  });
  Object.defineProperty(Object.prototype, "value", {
    configurable: true,
    value: true
  });
  try {
    await assert.rejects(
      () => resolveUrlTarget("http://127.0.0.1/", accessorOptions),
      /must be an own enumerable data property/
    );
  } finally {
    delete Object.prototype.value;
  }
  assert.equal(getterCalls, 0);

  const inheritedLookup = Object.create({ lookup: async () => [{ address: "127.0.0.1", family: 4 }] });
  await assert.rejects(
    () => resolveUrlTarget("https://example.invalid/", inheritedLookup),
    /Inherited URL security option 'lookup'/
  );
  await assert.rejects(
    () => resolveUrlTarget("https://example.invalid/", { unexpected: true }),
    /Unknown URL security option 'unexpected'/
  );
});

test("crawler blocks loopback by default and permits it only with trusted opt-in", async () => {
  const { url } = await listen((request, response) => {
    response.setHeader("content-type", "text/html");
    response.end("<main><h1>Local fixture</h1></main>");
  });

  await assert.rejects(
    () => crawl({ seeds: [url], obeyRobots: false, delayMs: 0 }),
    (error) => error.code === "CRAWLER_URL_BLOCKED"
  );

  const pages = await crawl({
    seeds: [url],
    obeyRobots: false,
    delayMs: 0,
    allowPrivateNetworks: true
  });
  assert.equal(pages[0].h1, "Local fixture");
});

test("direct and agent options reject inherited authority and accessors", async () => {
  let targetHits = 0;
  const { url } = await listen((request, response) => {
    targetHits += 1;
    response.end("must not be reached");
  });

  Object.defineProperty(Object.prototype, "allowPrivateNetworks", {
    configurable: true,
    enumerable: true,
    value: true
  });
  try {
    await assert.rejects(
      () => crawl({ seeds: [url], obeyRobots: false, delayMs: 0 }),
      /Inherited crawl option 'allowPrivateNetworks'/
    );
    assert.throws(
      () => createCockroachCrawlerTool({ maxPages: 1 }),
      /Inherited Agent tool defaults field 'allowPrivateNetworks'/
    );
  } finally {
    delete Object.prototype.allowPrivateNetworks;
  }

  let getterCalls = 0;
  const accessorOptions = { seeds: [url], obeyRobots: false, delayMs: 0 };
  Object.defineProperty(accessorOptions, "allowPrivateNetworks", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return true;
    }
  });
  await assert.rejects(
    () => crawl(accessorOptions),
    /must be an own enumerable data property/
  );
  assert.equal(getterCalls, 0);
  assert.equal(targetHits, 0);
});

test("direct and creator options reject every unknown own key", async () => {
  await assert.rejects(
    () => crawl({ seeds: ["https://example.com"], maxRequest: 1 }),
    /Unknown crawl option 'maxRequest'/
  );
  assert.throws(
    () => createCockroachCrawlerTool({ maxRequest: 1 }),
    /Unknown Agent tool defaults field.*maxRequest/
  );

  const symbolOptions = { seeds: ["https://example.com"] };
  symbolOptions[Symbol("authority")] = true;
  await assert.rejects(() => crawl(symbolOptions), /Unknown crawl option 'Symbol\(authority\)'/);

  const hiddenOptions = { seeds: ["https://example.com"] };
  Object.defineProperty(hiddenOptions, "maxRequest", { value: 1, enumerable: false });
  await assert.rejects(() => crawl(hiddenOptions), /Unknown crawl option 'maxRequest'/);
});

test("agent allowed-origin policy is normalized to immutable primitive values", () => {
  const mutableUrl = new URL("https://one.example/");
  assert.throws(
    () => createCockroachCrawlerTool({ sameOrigin: false, allowedOrigins: [mutableUrl] }),
    /primitive HTTP\(S\) origin strings/
  );
  assert.throws(
    () => createCockroachCrawlerTool({
      sameOrigin: false,
      allowedOrigins: [{ toString: () => "https://one.example/" }]
    }),
    /primitive HTTP\(S\) origin strings/
  );

  const origins = ["https://one.example/"];
  const tool = createCockroachCrawlerTool({ sameOrigin: false, allowedOrigins: origins });
  origins[0] = "https://two.example/";
  assert.equal(Object.isFrozen(tool), true);
});

test("every redirect hop is origin-checked before the target receives a request", async () => {
  let targetHits = 0;
  const target = await listen((request, response) => {
    targetHits += 1;
    response.end("must not be reached");
  });
  const source = await listen((request, response) => {
    response.writeHead(302, { location: `${target.url}/private` });
    response.end();
  });

  await assert.rejects(
    () => crawl({
      seeds: [`${source.url}/start`],
      obeyRobots: false,
      delayMs: 0,
      allowPrivateNetworks: true
    }),
    (error) => error.code === "CRAWLER_URL_BLOCKED"
  );
  assert.equal(targetHits, 0);
});

test("unsafe-scheme and credential-bearing redirects are rejected as security errors", async () => {
  for (const location of ["file:///etc/passwd", "http://user:pass@example.com/"]) {
    const source = await listen((request, response) => {
      response.writeHead(302, { location });
      response.end();
    });
    await assert.rejects(
      () => crawl({
        seeds: [source.url],
        obeyRobots: false,
        delayMs: 0,
        allowPrivateNetworks: true
      }),
      (error) => error.code === "CRAWLER_URL_BLOCKED"
    );
  }
});

test("non-browser transport pins DNS independently for each redirect hop", async () => {
  let requestHits = 0;
  const target = await listen((request, response) => {
    requestHits += 1;
    if (request.url === "/start") {
      response.writeHead(302, { location: "/final" });
      response.end();
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end("<main><h1>Pinned</h1></main>");
  });
  const port = new URL(target.url).port;
  let lookupCalls = 0;
  const pages = await crawl({
    seeds: [`http://pinned.example:${port}/start`],
    obeyRobots: false,
    delayMs: 0,
    allowPrivateNetworks: true,
    dnsLookup: async () => {
      lookupCalls += 1;
      return [{ address: "127.0.0.1", family: 4 }];
    }
  });
  assert.equal(pages[0].h1, "Pinned");
  assert.equal(requestHits, 2);
  assert.equal(lookupCalls, 3); // seed preflight plus one pinned resolution per hop
});

test("redirect targets are rechecked against robots before the redirected request", async () => {
  let blockedHits = 0;
  const source = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nDisallow: /blocked\n");
      return;
    }
    if (request.url === "/start") {
      response.writeHead(302, { location: "/blocked" });
      response.end();
      return;
    }
    blockedHits += 1;
    response.end("must not be fetched");
  });
  const pages = await crawl({
    seeds: [`${source.url}/start`],
    delayMs: 0,
    allowPrivateNetworks: true
  });
  assert.equal(pages.length, 0);
  assert.equal(blockedHits, 0);
  assert.equal(pages.stats.skippedRobots, 1);
});

test("robots redirects reject recursively encoded sensitive paths before network contact", async () => {
  for (const nested of [false, true]) {
    let intermediateHits = 0;
    let encodedHits = 0;
    let pageHits = 0;
    const source = await listen((request, response) => {
      if (request.url === "/robots.txt") {
        response.writeHead(302, {
          location: nested ? "/robots-hop" : "/%252561dmin/robots.txt"
        });
        response.end();
        return;
      }
      if (request.url === "/robots-hop") {
        intermediateHits += 1;
        response.writeHead(302, { location: "/%252561dmin/robots.txt" });
        response.end();
        return;
      }
      if (request.url === "/%252561dmin/robots.txt") {
        encodedHits += 1;
        response.end("User-agent: *\nAllow: /\n");
        return;
      }
      if (request.url === "/page") {
        pageHits += 1;
        response.setHeader("content-type", "text/html");
        response.end("<main>must not be reached</main>");
        return;
      }
      response.statusCode = 404;
      response.end("missing");
    });

    await assert.rejects(
      () => crawl({
        seeds: [`${source.url}/page`],
        allowPrivateNetworks: true,
        delayMs: 0,
        maxRetries: 0
      }),
      (error) => error.code === "CRAWLER_URL_BLOCKED"
    );
    assert.equal(intermediateHits, nested ? 1 : 0);
    assert.equal(encodedHits, 0, "encoded robots redirect targets must be denied before contact");
    assert.equal(pageHits, 0);
  }
});

test("cross-origin sitemap declarations are not fetched under same-origin policy", async () => {
  let externalSitemapHits = 0;
  const target = await listen((request, response) => {
    externalSitemapHits += 1;
    response.setHeader("content-type", "application/xml");
    response.end("<urlset></urlset>");
  });
  let sourceUrl;
  const source = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end(`User-agent: *\nSitemap: ${target.url}/sitemap.xml\n`);
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end("<main>source</main>");
  });
  sourceUrl = source.url;

  const pages = await crawl({
    seeds: [sourceUrl],
    includeSitemaps: true,
    maxPages: 1,
    delayMs: 0,
    allowPrivateNetworks: true
  });
  assert.equal(pages.length, 1);
  assert.equal(externalSitemapHits, 0);
});

test("robots server failures fail closed while true absence permits crawling", async () => {
  let blockedHits = 0;
  const unavailable = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.statusCode = 503;
      response.end("unavailable");
      return;
    }
    blockedHits += 1;
    response.setHeader("content-type", "text/html");
    response.end("<main>blocked</main>");
  });
  const denied = await crawlDetailed({
    seeds: [`${unavailable.url}/page`],
    includeSitemaps: true,
    allowPrivateNetworks: true,
    delayMs: 0,
    maxRetries: 0
  });
  assert.equal(denied.pages.length, 0);
  assert.equal(denied.stats.skippedRobots, 1);
  assert.equal(blockedHits, 0);

  const absent = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.statusCode = 404;
      response.end("missing");
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end("<main><h1>allowed</h1></main>");
  });
  const allowed = await crawl({
    seeds: [`${absent.url}/page`],
    allowPrivateNetworks: true,
    delayMs: 0
  });
  assert.equal(allowed[0].h1, "allowed");
});

test("agent adapter rejects undeclared policy overrides and browser mode without creator opt-in", async () => {
  const tool = createCockroachCrawlerTool({ maxPages: 2 });
  await assert.rejects(
    () => tool.execute({ urls: ["https://example.com"], obeyRobots: false }),
    /Unknown agent tool field.*obeyRobots/
  );
  await assert.rejects(
    () => tool.execute({ urls: ["https://example.com"], allowPrivateNetworks: true }),
    /Unknown agent tool field.*allowPrivateNetworks/
  );
  await assert.rejects(
    () => tool.execute({ urls: ["https://example.com"], maxPages: 3 }),
    /maxPages must be a safe integer from 1 to 2/
  );
  await assert.rejects(
    () => tool.execute({ urls: ["https://example.com"], maxPages: "1" }),
    /maxPages must be a safe integer/
  );
  await assert.rejects(
    () => tool.execute({ urls: ["https://example.com"], maxDepth: true }),
    /maxDepth must be a safe integer/
  );
  await assert.rejects(
    () => createCockroachCrawlerTool({ maxPages: "2" }).execute({ urls: ["https://example.com"] }),
    /defaults\.maxPages must be a safe integer/
  );
  await assert.rejects(
    () => tool.execute({ urls: ["https://example.com"], browser: {} }),
    /Browser mode is disabled/
  );
});

test("agent creator limits remain authoritative when browser mode is explicitly enabled", async () => {
  const tool = createCockroachCrawlerTool({
    maxPages: 2,
    maxDepth: 1,
    allowBrowser: true,
    browser: { headless: true }
  });
  await assert.rejects(
    () => tool.execute({
      urls: ["https://example.com"],
      maxDepth: 2,
      browser: { executablePath: "malicious" }
    }),
    /maxDepth must be a safe integer from 0 to 1|Unknown browser field.*executablePath/
  );
});

test("agent policy snapshots cannot be broadened by post-creation mutations", async () => {
  const target = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end("<main><h1>fixture</h1></main>");
  });
  const defaults = {
    maxPages: 1,
    allowedOrigins: ["http://127.0.0.1:1"],
    exclude: [],
    allowPrivateNetworks: true,
    delayMs: 0
  };
  const tool = createCockroachCrawlerTool(defaults);
  defaults.allowedOrigins.push(target.url);
  defaults.exclude.push("fixture");
  await assert.rejects(
    () => tool.execute({ urls: [`${target.url}/fixture`] }),
    (error) => error.code === "CRAWLER_URL_BLOCKED"
  );

  const browserDefaults = {
    maxPages: 1,
    allowBrowser: true,
    browser: { click: [] }
  };
  const browserTool = createCockroachCrawlerTool(browserDefaults);
  browserDefaults.browser.click.push(...Array.from({ length: 11 }, () => "button"));
  await assert.rejects(
    () => browserTool.execute({ urls: ["http://127.0.0.1/"] }),
    (error) => error.code === "CRAWLER_URL_BLOCKED"
  );
});

test("agent include and exclude values are literal fragments rather than executable regex", async () => {
  const target = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end("<main><h1>literal pattern</h1></main>");
  });
  const tool = createCockroachCrawlerTool({
    maxPages: 1,
    allowPrivateNetworks: true,
    delayMs: 0
  });
  const result = await tool.execute({
    urls: [`${target.url}/(a+)+$`],
    include: ["(a+)+$"]
  });
  assert.equal(result.pages[0].h1, "literal pattern");
});

test("DNS resolution honors AbortSignal without waiting for a stalled resolver", async () => {
  const controller = new AbortController();
  const pending = resolveUrlTarget("https://stalled.example/", {
    signal: controller.signal,
    lookup: () => new Promise(() => {})
  });
  controller.abort(new Error("stop now"));
  await assert.rejects(
    () => pending,
    (error) => error.code === "CRAWLER_URL_BLOCKED" && error.cause?.message === "stop now"
  );
});
