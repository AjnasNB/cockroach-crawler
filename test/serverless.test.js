import assert from "node:assert/strict";
import test from "node:test";
import { createServerlessCrawler, ServerlessCrawlerError } from "../src/serverless.js";

function html(body, status = 200, headers = {}) {
  return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", ...headers } });
}

test("serverless crawler requires explicit public HTTPS origins", () => {
  assert.throws(() => createServerlessCrawler({ allowedOrigins: [] }), /1-32 entries/);
  assert.throws(() => createServerlessCrawler({ allowedOrigins: ["http://example.com"] }), /HTTPS origins/);
  assert.throws(() => createServerlessCrawler({ allowedOrigins: ["https://127.0.0.1"] }), /IP literals/);
  assert.throws(() => createServerlessCrawler({ allowedOrigins: ["https://localhost."] }), /localhost names/);
  assert.throws(() => createServerlessCrawler({ allowedOrigins: ["https://tools.localhost."] }), /localhost names/);
  assert.throws(() => createServerlessCrawler({ allowedOrigins: ["https://example.com/path"] }), /without paths/);
  assert.throws(() => createServerlessCrawler({ allowedOrigins: ["https://example.com"], unexpected: true }), /Unknown serverless crawler option/);
});

test("serverless tier crawls bounded allowlisted HTML and exposes its weaker runtime boundary", async () => {
  const requests = [];
  const crawler = createServerlessCrawler({
    allowedOrigins: ["https://docs.example.com"],
    delayMs: 0,
    fetch: async (value) => {
      const url = new URL(value);
      requests.push(url.toString());
      if (url.pathname === "/robots.txt") return new Response("User-agent: *\nAllow: /\n", { headers: { "content-type": "text/plain" } });
      if (url.pathname === "/") {
        return html(`<!doctype html><html><head><title>Serverless fixture</title><meta name="description" content="A bounded page"></head>
          <body><h1>Fixture</h1><p>Hello &amp; safe.</p>
          <script>window.secret = "script-content-must-not-leak"</script >
          <style>.hidden::after { content: "style-content-must-not-leak"; }</style >
          <noscript>noscript-content-must-not-leak</noscript >
          <svg><text>svg-content-must-not-leak</text></svg >
          <a href="/next">Next</a><a href="https://outside.example/">Outside</a></body></html>`);
      }
      if (url.pathname === "/next") return html("<html><head><title>Next page</title></head><body><h1>Next</h1></body></html>");
      throw new Error(`Unexpected path ${url.pathname}`);
    }
  });
  const result = await crawler.crawl({ url: "https://docs.example.com/", maxPages: 2, maxDepth: 1 });
  assert.equal(result.pages.length, 2);
  assert.equal(result.pages[0].title, "Serverless fixture");
  assert.match(result.pages[0].text, /Hello & safe/);
  assert.doesNotMatch(result.pages[0].text, /content-must-not-leak/);
  assert.deepEqual(result.pages[0].links, ["https://docs.example.com/next"]);
  assert.match(result.pages[0].contentHash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(result.runtime.dnsValidation, false);
  assert.equal(result.runtime.resolvedAddressClassification, false);
  assert.equal(result.runtime.dnsPinning, false);
  assert.equal(result.runtime.allowlistScope, "operator-owned-or-trusted-origins");
  assert.equal(result.runtime.browser, false);
  assert.equal(Object.isFrozen(result.runtime.allowlistedOrigins), true);
  assert.throws(() => result.runtime.allowlistedOrigins.push("https://other.example"), TypeError);
  assert.deepEqual(requests, [
    "https://docs.example.com/robots.txt",
    "https://docs.example.com/",
    "https://docs.example.com/next"
  ]);
});

test("serverless extraction parses raw-text elements instead of filtering HTML with regular expressions", async () => {
  const crawler = createServerlessCrawler({
    allowedOrigins: ["https://docs.example.com"],
    delayMs: 0,
    fetch: async (value) => {
      const url = new URL(value);
      if (url.pathname === "/robots.txt") return new Response("User-agent: *\nAllow: /\n");
      return html(`<html><head><title>Parser fixture</title></head><body>
        <p>Visible</p><p>evidence</p>
        <SCRIPT>script-content-must-not-leak<a href="/must-not-leak">hidden</a></SCRIPT data-extra="ignored">
        <style>style-content-must-not-leak</style data-extra="ignored">
        <noscript>noscript-content-must-not-leak</noscript >
        <svg><text>svg-content-must-not-leak</text></svg >
        <a href="/allowed">Allowed evidence</a>
      </body></html>`);
    }
  });

  const result = await crawler.crawl({ url: "https://docs.example.com/", maxPages: 1, maxDepth: 0 });
  assert.equal(result.pages.length, 1);
  assert.match(result.pages[0].text, /Visible evidence/);
  assert.doesNotMatch(result.pages[0].text, /content-must-not-leak/);
  assert.deepEqual(result.pages[0].links, ["https://docs.example.com/allowed"]);
});

test("serverless tier rejects an unlisted seed before network dispatch", async () => {
  let calls = 0;
  const crawler = createServerlessCrawler({
    allowedOrigins: ["https://docs.example.com"],
    fetch: async () => { calls += 1; return html("ok"); }
  });
  await assert.rejects(
    crawler.crawl({ url: "https://other.example/" }),
    (error) => error instanceof ServerlessCrawlerError && error.code === "SERVERLESS_ORIGIN_DENIED"
  );
  assert.equal(calls, 0);
});

test("serverless redirect validation blocks an origin escape before target contact", async () => {
  const requests = [];
  const crawler = createServerlessCrawler({
    allowedOrigins: ["https://docs.example.com"],
    delayMs: 0,
    fetch: async (value) => {
      const url = new URL(value);
      requests.push(url.toString());
      if (url.pathname === "/robots.txt") return new Response("User-agent: *\nAllow: /\n");
      return new Response(null, { status: 302, headers: { location: "https://outside.example/private" } });
    }
  });
  const result = await crawler.crawl({ url: "https://docs.example.com/" });
  assert.equal(result.pages.length, 0);
  assert.equal(result.failures[0].code, "SERVERLESS_ORIGIN_DENIED");
  assert.deepEqual(requests, ["https://docs.example.com/robots.txt", "https://docs.example.com/"]);
});

test("serverless redirects re-check the destination robots policy before dispatch", async () => {
  const requests = [];
  const crawler = createServerlessCrawler({
    allowedOrigins: ["https://a.example", "https://b.example"],
    delayMs: 0,
    fetch: async (value) => {
      const url = new URL(value);
      requests.push(url.toString());
      if (url.hostname === "a.example" && url.pathname === "/robots.txt") {
        return new Response("User-agent: *\nAllow: /\n");
      }
      if (url.hostname === "a.example") {
        return new Response(null, { status: 302, headers: { location: "https://b.example/private" } });
      }
      if (url.hostname === "b.example" && url.pathname === "/robots.txt") {
        return new Response("User-agent: *\nDisallow: /private\n");
      }
      throw new Error("redirect target must not be contacted when robots denies it");
    }
  });
  const result = await crawler.crawl({ url: "https://a.example/" });
  assert.equal(result.pages.length, 0);
  assert.equal(result.failures[0].code, "SERVERLESS_ROBOTS_DENIED");
  assert.deepEqual(requests, [
    "https://a.example/robots.txt",
    "https://a.example/",
    "https://b.example/robots.txt"
  ]);
});

test("serverless redirects add the final URL to crawl deduplication", async () => {
  const requests = [];
  const crawler = createServerlessCrawler({
    allowedOrigins: ["https://docs.example.com"],
    delayMs: 0,
    fetch: async (value) => {
      const url = new URL(value);
      requests.push(url.toString());
      if (url.pathname === "/robots.txt") return new Response("User-agent: *\nAllow: /\n");
      if (url.pathname === "/a") return new Response(null, { status: 302, headers: { location: "/b" } });
      if (url.pathname === "/b") return html('<title>Final page</title><a href="/b">same final URL</a>');
      throw new Error(`Unexpected path ${url.pathname}`);
    }
  });

  const result = await crawler.crawl({ url: "https://docs.example.com/a", maxPages: 2, maxDepth: 1 });
  assert.equal(result.pages.length, 1);
  assert.equal(result.pages[0].url, "https://docs.example.com/b");
  assert.equal(result.stats.seen, 2);
  assert.deepEqual(requests, [
    "https://docs.example.com/robots.txt",
    "https://docs.example.com/a",
    "https://docs.example.com/b"
  ]);
});

test("serverless converging redirect aliases return and dispatch their completed target once", async () => {
  const requests = [];
  const crawler = createServerlessCrawler({
    allowedOrigins: ["https://docs.example.com"],
    delayMs: 0,
    fetch: async (value) => {
      const url = new URL(value);
      requests.push(url.toString());
      if (url.pathname === "/robots.txt") return new Response("User-agent: *\nAllow: /\n");
      if (url.pathname === "/") return html('<a href="/a">alias a</a><a href="/c">alias c</a>');
      if (url.pathname === "/a" || url.pathname === "/c") {
        return new Response(null, { status: 302, headers: { location: "/b" } });
      }
      if (url.pathname === "/b") return html("<title>Canonical target</title>");
      throw new Error(`Unexpected path ${url.pathname}`);
    }
  });

  const result = await crawler.crawl({ url: "https://docs.example.com/", maxPages: 3, maxDepth: 1 });
  assert.deepEqual(result.pages.map((page) => page.url), [
    "https://docs.example.com/",
    "https://docs.example.com/b"
  ]);
  assert.equal(result.stats.seen, 4);
  assert.deepEqual(requests, [
    "https://docs.example.com/robots.txt",
    "https://docs.example.com/",
    "https://docs.example.com/a",
    "https://docs.example.com/b",
    "https://docs.example.com/c"
  ]);
});

test("serverless robots failures fail closed", async () => {
  const crawler = createServerlessCrawler({
    allowedOrigins: ["https://docs.example.com"],
    fetch: async (value) => {
      const url = new URL(value);
      if (url.pathname === "/robots.txt") return new Response("upstream failed", { status: 503 });
      throw new Error("page must not be contacted");
    }
  });
  const result = await crawler.crawl({ url: "https://docs.example.com/" });
  assert.equal(result.pages.length, 0);
  assert.equal(result.failures[0].code, "SERVERLESS_ROBOTS_UNAVAILABLE");
  assert.equal(result.stats.requests, 1);
});

test("serverless API handler requires a deployment secret and never accepts it in the request body", async () => {
  const noToken = createServerlessCrawler({ allowedOrigins: ["https://docs.example.com"] });
  const unavailable = await noToken.fetch(new Request("https://worker.example/v1/crawl", {
    method: "POST",
    body: JSON.stringify({ url: "https://docs.example.com/" })
  }));
  assert.equal(unavailable.status, 503);

  const crawler = createServerlessCrawler({
    allowedOrigins: ["https://docs.example.com"],
    accessToken: "deployment-secret",
    fetch: async (value) => {
      const url = new URL(value);
      if (url.pathname === "/robots.txt") return new Response("User-agent: *\nAllow: /\n");
      return html("<title>API fixture</title><h1>Ready</h1>");
    }
  });
  const unauthorized = await crawler.fetch(new Request("https://worker.example/v1/crawl", {
    method: "POST",
    headers: { authorization: "Bearer wrong" },
    body: JSON.stringify({ url: "https://docs.example.com/" })
  }));
  assert.equal(unauthorized.status, 401);
  const accepted = await crawler.fetch(new Request("https://worker.example/v1/crawl", {
    method: "POST",
    headers: { authorization: "Bearer deployment-secret", "content-type": "application/json" },
    body: JSON.stringify({ url: "https://docs.example.com/", maxPages: 1 })
  }));
  assert.equal(accepted.status, 200);
  const result = await accepted.json();
  assert.equal(result.pages[0].title, "API fixture");
  assert.equal(JSON.stringify(result).includes("deployment-secret"), false);
});

test("serverless per-page byte limits terminate oversized bodies", async () => {
  const crawler = createServerlessCrawler({
    allowedOrigins: ["https://docs.example.com"],
    maxBytes: 1_024,
    fetch: async (value) => {
      const url = new URL(value);
      if (url.pathname === "/robots.txt") return new Response("User-agent: *\nAllow: /\n");
      return html("x".repeat(1_025), 200, { "content-length": "1025" });
    }
  });
  const result = await crawler.crawl({ url: "https://docs.example.com/" });
  assert.equal(result.pages.length, 0);
  assert.equal(result.failures[0].code, "SERVERLESS_PAGE_TOO_LARGE");
});

test("serverless response streams cannot outlive the request or crawl deadline", async () => {
  const crawler = createServerlessCrawler({
    allowedOrigins: ["https://docs.example.com"],
    timeoutMs: 100,
    maxDurationMs: 100,
    delayMs: 0,
    fetch: async (value) => {
      const url = new URL(value);
      if (url.pathname === "/robots.txt") return new Response("User-agent: *\nAllow: /\n");
      return new Response(new ReadableStream({ start() {} }), {
        headers: { "content-type": "text/html; charset=utf-8" }
      });
    }
  });
  const startedAt = Date.now();
  await assert.rejects(
    crawler.crawl({ url: "https://docs.example.com/" }),
    (error) => error instanceof ServerlessCrawlerError && error.code === "SERVERLESS_TIMEOUT"
  );
  assert.ok(Date.now() - startedAt < 750, "stalled response body must be aborted promptly");
});

test("serverless politeness delays remain inside the total crawl deadline", async () => {
  const crawler = createServerlessCrawler({
    allowedOrigins: ["https://docs.example.com"],
    delayMs: 200,
    maxDurationMs: 100,
    fetch: async (value) => {
      const url = new URL(value);
      if (url.pathname === "/robots.txt") return new Response("User-agent: *\nAllow: /\n");
      return html('<a href="/next">next</a>');
    }
  });
  await assert.rejects(
    crawler.crawl({ url: "https://docs.example.com/", maxPages: 2, maxDepth: 1 }),
    (error) => error instanceof ServerlessCrawlerError && error.code === "SERVERLESS_TIMEOUT"
  );
});

test("serverless API bounds streaming input and maps validation failures to 400", async () => {
  const crawler = createServerlessCrawler({
    allowedOrigins: ["https://docs.example.com"],
    accessToken: "deployment-secret"
  });
  const chunks = [new Uint8Array(5_000), new Uint8Array(5_000)];
  const oversized = await crawler.fetch(new Request("https://worker.example/v1/crawl", {
    method: "POST",
    headers: { authorization: "Bearer deployment-secret", "content-type": "application/json" },
    body: new ReadableStream({
      pull(controller) {
        const chunk = chunks.shift();
        if (chunk) controller.enqueue(chunk);
        else controller.close();
      }
    }),
    duplex: "half"
  }));
  assert.equal(oversized.status, 413);
  assert.equal((await oversized.json()).code, "SERVERLESS_INPUT_TOO_LARGE");

  const invalid = await crawler.fetch(new Request("https://worker.example/v1/crawl", {
    method: "POST",
    headers: { authorization: "Bearer deployment-secret", "content-type": "application/json" },
    body: JSON.stringify({ url: "https://docs.example.com/", unexpected: true })
  }));
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).code, "SERVERLESS_INVALID_INPUT");
});
