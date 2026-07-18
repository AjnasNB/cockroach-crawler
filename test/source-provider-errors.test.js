import assert from "node:assert/strict";
import test from "node:test";
import { createSourceRegistry, SourceAccessError } from "../src/sources.js";

const secrets = {
  github: "github-fixture-token",
  youtube: "youtube-fixture-key",
  x: "x-fixture-bearer",
  redditId: "reddit-fixture-client",
  redditSecret: "reddit-fixture-secret",
  redditToken: "reddit-fixture-access-token"
};

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...headers } });
}

function invalidJson() {
  return new Response("{not-json", { status: 200, headers: { "content-type": "application/json" } });
}

function oversized() {
  return new Response("x".repeat(2_048), { status: 200, headers: { "content-length": "2048" } });
}

function hanging(_value, init = {}) {
  return new Promise((_resolve, reject) => {
    const abort = () => reject(init.signal?.reason || new Error("aborted"));
    if (init.signal?.aborted) abort();
    else init.signal?.addEventListener("abort", abort, { once: true });
  });
}

function errorIs(code, secretMarkers = []) {
  return (error) => {
    assert.ok(error instanceof SourceAccessError);
    assert.equal(error.code, code);
    const serialized = JSON.stringify({ message: error.message, code: error.code, details: error.details });
    for (const marker of secretMarkers) assert.equal(serialized.includes(marker), false);
    return true;
  };
}

test("GitHub offline error contracts cover rate limits, not found, invalid JSON, timeout, cancellation, and size", async (t) => {
  for (const authenticated of [false, true]) {
    await t.test(`${authenticated ? "authenticated" : "unauthenticated"} rate limit`, async () => {
      let request;
      const registry = createSourceRegistry({
        github: authenticated ? { token: secrets.github } : {},
        fetch: async (value, init = {}) => {
          request = { url: new URL(value), init };
          return json({ message: "rate limited" }, authenticated ? 429 : 403, { "x-ratelimit-remaining": "0" });
        }
      });
      await assert.rejects(registry.search("github", { query: "crawler" }), errorIs("SOURCE_QUOTA_EXCEEDED", [secrets.github]));
      assert.equal(request.url.hostname, "api.github.com");
      assert.equal(request.url.pathname, "/search/repositories");
      assert.equal(request.init.method ?? "GET", "GET");
      assert.equal(request.init.headers.authorization, authenticated ? `Bearer ${secrets.github}` : undefined);
    });
  }

  const cases = [
    ["not found", async () => json({ message: "not found" }, 404), "SOURCE_NOT_FOUND", (registry) => registry.read("github", "missing/repository")],
    ["invalid JSON", async () => invalidJson(), "SOURCE_INVALID_RESPONSE", (registry) => registry.search("github", { query: "crawler" })],
    ["response too large", async () => oversized(), "SOURCE_RESPONSE_TOO_LARGE", (registry) => registry.search("github", { query: "crawler" })]
  ];
  for (const [name, fetch, code, run] of cases) {
    await t.test(name, async () => {
      const registry = createSourceRegistry({ fetch, maxResponseBytes: 1_024 });
      await assert.rejects(run(registry), errorIs(code));
    });
  }

  await t.test("timeout", async () => {
    const registry = createSourceRegistry({ fetch: hanging, timeoutMs: 100 });
    await assert.rejects(registry.search("github", { query: "crawler" }), errorIs("SOURCE_TIMEOUT"));
  });
  await t.test("cancellation", async () => {
    const controller = new AbortController();
    controller.abort(new Error("caller details stay private"));
    const registry = createSourceRegistry({ fetch: hanging });
    await assert.rejects(registry.search("github", { query: "crawler", signal: controller.signal }), errorIs("SOURCE_ABORTED"));
  });
});

test("GitHub rejects invalid successful payload shapes without exposing credentials", async (t) => {
  const invalidSearchPayloads = [
    ["null", null],
    ["array", []],
    ["missing items", {}],
    ["non-array items", { items: {} }],
    ["invalid repository item", { items: [{}] }],
    ["invalid issue item", { items: [{ id: 1, title: "Issue", html_url: "https://github.com/example/project/issues/1", created_at: "2025-01-01T00:00:00Z" }] }]
  ];
  for (const [name, payload] of invalidSearchPayloads) {
    await t.test(name, async () => {
      const registry = createSourceRegistry({
        github: { token: secrets.github },
        fetch: async () => json(payload)
      });
      const kind = name === "invalid issue item" ? "issues" : "repositories";
      await assert.rejects(
        registry.search("github", { query: "crawler", kind }),
        errorIs("SOURCE_INVALID_RESPONSE", [secrets.github])
      );
    });
  }

  await t.test("valid empty search remains successful", async () => {
    const registry = createSourceRegistry({
      github: { token: secrets.github },
      fetch: async () => json({ items: [] })
    });
    assert.deepEqual(await registry.search("github", { query: "no results" }), []);
  });

  for (const [name, payload] of [["null repository", null], ["incompatible repository", { id: 1 }]]) {
    await t.test(name, async () => {
      const registry = createSourceRegistry({
        github: { token: secrets.github },
        fetch: async (value) => {
          const url = new URL(value);
          if (url.pathname.endsWith("/readme")) return new Response("# Fixture");
          return json(payload);
        }
      });
      await assert.rejects(
        registry.read("github", "example/project"),
        errorIs("SOURCE_INVALID_RESPONSE", [secrets.github])
      );
    });
  }
});

test("YouTube offline contracts cover public metadata, keyed empty/quota/error paths, and no transcripts", async (t) => {
  const publicRegistry = createSourceRegistry({
    fetch: async (value, init = {}) => {
      const url = new URL(value);
      assert.equal(url.hostname, "www.youtube.com");
      assert.equal(url.pathname, "/oembed");
      assert.equal(init.method ?? "GET", "GET");
      return json({ title: "Public fixture", author_name: "Fixture", thumbnail_url: "https://i.ytimg.com/fixture.jpg" });
    }
  });
  const [publicRecord] = await publicRegistry.read("youtube", "abcdefghijk");
  assert.equal(publicRecord.metadata.transcriptAvailable, false);
  assert.equal(publicRecord.provenance.credentialed, false);

  const empty = createSourceRegistry({
    youtube: { apiKey: secrets.youtube },
    fetch: async (value, init = {}) => {
      const url = new URL(value);
      assert.equal(url.hostname, "www.googleapis.com");
      assert.equal(url.pathname, "/youtube/v3/search");
      assert.equal(init.method ?? "GET", "GET");
      assert.equal(init.headers["x-goog-api-key"], secrets.youtube);
      return json({ items: [] });
    }
  });
  assert.deepEqual(await empty.search("youtube", { query: "no results" }), []);

  const cases = [
    ["quota", async () => json({ error: { code: 403 } }, 403), "SOURCE_QUOTA_EXCEEDED"],
    ["invalid JSON", async () => invalidJson(), "SOURCE_INVALID_RESPONSE"],
    ["response too large", async () => oversized(), "SOURCE_RESPONSE_TOO_LARGE"],
    ["timeout", hanging, "SOURCE_TIMEOUT"]
  ];
  for (const [name, fetch, code] of cases) {
    await t.test(name, async () => {
      const registry = createSourceRegistry({ youtube: { apiKey: secrets.youtube }, fetch, timeoutMs: 100, maxResponseBytes: 1_024 });
      await assert.rejects(registry.search("youtube", { query: "crawler" }), errorIs(code, [secrets.youtube]));
      assert.equal(registry.doctor().find(({ id }) => id === "youtube").capabilities.transcript, false);
    });
  }
  await t.test("cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    const registry = createSourceRegistry({ youtube: { apiKey: secrets.youtube }, fetch: hanging });
    await assert.rejects(registry.search("youtube", { query: "crawler", signal: controller.signal }), errorIs("SOURCE_ABORTED", [secrets.youtube]));
  });
});

test("X offline contracts cover missing credentials, official read-only routes, auth/quota/not-found, invalid JSON, timeout, and cancellation", async (t) => {
  let dispatches = 0;
  const missing = createSourceRegistry({ fetch: async () => { dispatches += 1; return json({}); } });
  await assert.rejects(missing.search("x", { query: "crawler" }), errorIs("SOURCE_NOT_CONFIGURED"));
  assert.equal(dispatches, 0);

  const cases = [
    ["invalid token", async () => json({ title: "Unauthorized" }, 401), "SOURCE_AUTH_FAILED"],
    ["quota", async () => json({ title: "Too Many Requests" }, 429), "SOURCE_QUOTA_EXCEEDED"],
    ["not found", async () => json({ data: null }), "SOURCE_NOT_FOUND"],
    ["invalid JSON", async () => invalidJson(), "SOURCE_INVALID_RESPONSE"],
    ["response too large", async () => oversized(), "SOURCE_RESPONSE_TOO_LARGE"],
    ["timeout", hanging, "SOURCE_TIMEOUT"]
  ];
  for (const [name, fetchResult, code] of cases) {
    await t.test(name, async () => {
      let request;
      const registry = createSourceRegistry({
        x: { bearerToken: secrets.x },
        timeoutMs: 100,
        maxResponseBytes: 1_024,
        fetch: async (value, init) => {
          request = { url: new URL(value), init };
          return fetchResult(value, init);
        }
      });
      await assert.rejects(registry.read("x", "1893456789012345678"), errorIs(code, [secrets.x]));
      assert.equal(request.url.hostname, "api.x.com");
      assert.equal(request.url.pathname, "/2/tweets/1893456789012345678");
      assert.equal(request.init.method ?? "GET", "GET");
      assert.equal(request.init.headers.authorization, `Bearer ${secrets.x}`);
    });
  }
  await t.test("cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    const registry = createSourceRegistry({ x: { bearerToken: secrets.x }, fetch: hanging });
    await assert.rejects(registry.search("x", { query: "crawler", signal: controller.signal }), errorIs("SOURCE_ABORTED", [secrets.x]));
  });
});

test("Reddit offline contracts cover OAuth expiry, read-only routes, budgets, auth/quota/errors, timeout, and cancellation", async (t) => {
  const config = { clientId: secrets.redditId, clientSecret: secrets.redditSecret, userAgent: "cockroach-crawler-fixture/1.0 by maintainer" };
  let tokenRequests = 0;
  let searchRequests = 0;
  const registry = createSourceRegistry({
    reddit: config,
    fetch: async (value, init = {}) => {
      const url = new URL(value);
      if (url.pathname === "/api/v1/access_token") {
        tokenRequests += 1;
        assert.equal(init.method, "POST");
        assert.match(init.headers.authorization, /^Basic /);
        return json({ access_token: secrets.redditToken, expires_in: 1 });
      }
      searchRequests += 1;
      assert.equal(url.hostname, "oauth.reddit.com");
      assert.equal(url.pathname, "/r/testing/search");
      assert.equal(init.method ?? "GET", "GET");
      assert.equal(init.headers.authorization, `Bearer ${secrets.redditToken}`);
      return json({ data: { children: [] } });
    }
  });
  await registry.search("reddit", { query: "crawler", subreddit: "testing" });
  await registry.search("reddit", { query: "crawler", subreddit: "testing" });
  assert.equal(tokenRequests, 2, "an expired one-second token is not reused");
  assert.equal(searchRequests, 2);

  const authFailure = createSourceRegistry({ reddit: config, fetch: async () => json({ error: "invalid_client" }, 401) });
  await assert.rejects(authFailure.search("reddit", { query: "crawler" }), errorIs("SOURCE_AUTH_FAILED", Object.values(secrets)));

  await t.test("quota and bounded comments", async () => {
    let mode = "quota";
    const bounded = createSourceRegistry({
      reddit: config,
      fetch: async (value) => {
        const url = new URL(value);
        if (url.pathname === "/api/v1/access_token") return json({ access_token: secrets.redditToken, expires_in: 3600 });
        if (mode === "quota") return json({ message: "quota" }, 429);
        const post = { id: "abc123", title: "Fixture", permalink: "/r/testing/comments/abc123/fixture/", selftext: "Body", author: "tester", created_utc: 1_735_689_600, subreddit: "testing", num_comments: 3 };
        return json([{ data: { children: [{ kind: "t3", data: post }] } }, { data: { children: [
          { kind: "t1", data: { id: "c1", body: "one" } },
          { kind: "t1", data: { id: "c2", body: "two" } }
        ] } }]);
      }
    });
    await assert.rejects(bounded.search("reddit", { query: "crawler" }), errorIs("SOURCE_QUOTA_EXCEEDED", Object.values(secrets)));
    mode = "comments";
    const [post] = await bounded.read("reddit", { target: "abc123", maxResults: 1 });
    assert.equal(post.metadata.commentsSample.length, 1);
  });

  const cases = [
    ["invalid JSON", async () => invalidJson(), "SOURCE_INVALID_RESPONSE"],
    ["response too large", async () => oversized(), "SOURCE_RESPONSE_TOO_LARGE"],
    ["timeout", hanging, "SOURCE_TIMEOUT"]
  ];
  for (const [name, tokenFetch, code] of cases) {
    await t.test(name, async () => {
      const failing = createSourceRegistry({ reddit: config, fetch: tokenFetch, timeoutMs: 100, maxResponseBytes: 1_024 });
      await assert.rejects(failing.search("reddit", { query: "crawler" }), errorIs(code, Object.values(secrets)));
    });
  }
  await t.test("cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    const failing = createSourceRegistry({ reddit: config, fetch: hanging });
    await assert.rejects(failing.search("reddit", { query: "crawler", signal: controller.signal }), errorIs("SOURCE_ABORTED", Object.values(secrets)));
  });
});
