import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createSourceRegistry,
  createSourceRegistryFromEnv,
  SourceAccessError
} from "../src/sources.js";
import { PACKAGE_VERSION } from "../src/version.js";
import packageManifest from "../package.json" with { type: "json" };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("runtime version stays aligned with the package manifest", () => {
  assert.equal(PACKAGE_VERSION, packageManifest.version);
});

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers }
  });
}

test("source doctor reports exact unauthenticated capability boundaries", () => {
  const report = createSourceRegistryFromEnv({}).doctor();
  assert.deepEqual(report.map(({ id, status }) => [id, status]), [
    ["web", "ready"],
    ["github", "ready"],
    ["youtube", "partial"],
    ["x", "missing_credentials"],
    ["reddit", "missing_credentials"]
  ]);
  assert.equal(report.find(({ id }) => id === "youtube").capabilities.transcript, false);
  assert.throws(() => { report[0].status = "unavailable"; }, TypeError);
});

test("source registry rejects inherited authority, accessors, and unknown options", () => {
  assert.throws(() => createSourceRegistry({ github: Object.create({ token: "secret" }) }), /plain object/);
  assert.throws(() => createSourceRegistry({ github: { get token() { return "secret"; } } }), /data property/);
  assert.throws(() => createSourceRegistry({ youtube: { apiKey: "key", unexpected: true } }), /Unknown youtube provider option/);
  assert.throws(() => createSourceRegistry({ unexpected: true }), /Unknown source registry option/);
});

test("web crawl options and environment registry options reject accessors without invoking them", () => {
  let crawlOptionReads = 0;
  const crawlOptions = {};
  Object.defineProperty(crawlOptions, "maxPages", {
    enumerable: true,
    get() {
      crawlOptionReads += 1;
      return 1;
    }
  });
  assert.throws(
    () => createSourceRegistry({ web: { crawlOptions } }),
    /web\.crawlOptions option 'maxPages' must be an own enumerable data property/
  );
  assert.equal(crawlOptionReads, 0);

  let optionReads = 0;
  const options = {};
  Object.defineProperty(options, "fetch", {
    enumerable: true,
    get() {
      optionReads += 1;
      return globalThis.fetch;
    }
  });
  assert.throws(
    () => createSourceRegistryFromEnv({}, options),
    /source registry environment option 'fetch' must be an own enumerable data property/
  );
  assert.equal(optionReads, 0);

  let environmentReads = 0;
  const env = {};
  Object.defineProperty(env, "YOUTUBE_API_KEY", {
    enumerable: true,
    get() {
      environmentReads += 1;
      return "private-fixture-key";
    }
  });
  assert.throws(
    () => createSourceRegistryFromEnv(env),
    /env property 'YOUTUBE_API_KEY' must be an own enumerable data property/
  );
  assert.equal(environmentReads, 0);
});

test("GitHub provider normalizes public REST search and read results", async () => {
  const requests = [];
  const fetch = async (value, init = {}) => {
    const url = new URL(value);
    requests.push({ url, init });
    if (url.pathname === "/search/repositories") {
      return json({ items: [{
        id: 42,
        full_name: "example/project",
        html_url: "https://github.com/example/project",
        description: "A deterministic fixture",
        owner: { login: "example" },
        created_at: "2025-01-02T03:04:05Z",
        stargazers_count: 7,
        forks_count: 2,
        language: "TypeScript",
        license: { spdx_id: "MIT" },
        default_branch: "main"
      }] });
    }
    if (url.pathname === "/repos/example/project") {
      return json({
        id: 42,
        full_name: "example/project",
        html_url: "https://github.com/example/project",
        description: "Fixture",
        owner: { login: "example" },
        created_at: "2025-01-02T03:04:05Z",
        updated_at: "2025-02-02T03:04:05Z",
        stargazers_count: 7,
        forks_count: 2,
        open_issues_count: 1,
        language: "TypeScript",
        license: { spdx_id: "MIT" },
        default_branch: "main"
      });
    }
    if (url.pathname === "/repos/example/project/readme") return new Response("# Fixture README");
    throw new Error(`Unexpected request ${url.pathname}`);
  };
  const registry = createSourceRegistry({ fetch });
  const [searchResult] = await registry.search("github", { query: "crawler", maxResults: 1 });
  assert.equal(searchResult.title, "example/project");
  assert.equal(searchResult.metadata.stars, 7);
  assert.match(searchResult.contentHash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(searchResult.provenance.authenticated, false);
  const [readResult] = await registry.read("github", "example/project");
  assert.equal(readResult.text, "# Fixture README");
  assert.equal(requests.length, 3);
  assert.equal(requests[0].init.headers.authorization, undefined);
  assert.throws(() => { readResult.metadata.stars = 99; }, TypeError);
});

test("YouTube separates public metadata reads, keyed search, and transcripts", async () => {
  const publicRegistry = createSourceRegistry({
    fetch: async (value) => {
      const url = new URL(value);
      assert.equal(url.hostname, "www.youtube.com");
      assert.equal(url.pathname, "/oembed");
      return json({
        title: "Fixture video",
        author_name: "Fixture channel",
        author_url: "https://www.youtube.com/@fixture",
        thumbnail_url: "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg"
      });
    }
  });
  await assert.rejects(
    publicRegistry.search("youtube", { query: "crawler" }),
    (error) => error instanceof SourceAccessError && error.code === "SOURCE_NOT_CONFIGURED"
  );
  const [metadata] = await publicRegistry.read("youtube", "https://youtu.be/abcdefghijk");
  assert.equal(metadata.title, "Fixture video");
  assert.equal(metadata.metadata.metadataOnly, true);
  assert.equal(metadata.metadata.transcriptAvailable, false);

  let observedUrl = "";
  let observedApiKey = "";
  const keyedRegistry = createSourceRegistry({
    youtube: { apiKey: "private-fixture-key" },
    fetch: async (value, init = {}) => {
      observedUrl = String(value);
      observedApiKey = init.headers["x-goog-api-key"];
      return json({ items: [{
        id: { videoId: "abcdefghijk" },
        snippet: {
          title: "Search fixture",
          description: "Description",
          channelTitle: "Channel",
          channelId: "channel-id",
          publishedAt: "2025-03-01T00:00:00Z"
        }
      }] });
    }
  });
  const [result] = await keyedRegistry.search("youtube", { query: "crawler", maxResults: 1 });
  assert.equal(result.title, "Search fixture");
  assert.equal(observedApiKey, "private-fixture-key");
  assert.equal(new URL(observedUrl).searchParams.has("key"), false);
  assert.equal(observedUrl.includes("private-fixture-key"), false);
  assert.equal(result.provenance.authenticated, false);
  assert.equal(result.provenance.credentialed, true);
  assert.equal(JSON.stringify(result).includes("private-fixture-key"), false);

  const failingRegistry = createSourceRegistry({
    youtube: { apiKey: "private-fixture-key" },
    fetch: async () => {
      throw new Error("transport failed");
    }
  });
  await assert.rejects(
    failingRegistry.search("youtube", { query: "crawler", maxResults: 1 }),
    (error) => error.code === "SOURCE_REQUEST_FAILED"
      && !error.message.includes("private-fixture-key")
      && !JSON.stringify(error).includes("private-fixture-key")
  );
});

test("X provider requires official bearer configuration and never serializes it", async () => {
  await assert.rejects(
    createSourceRegistry().search("x", { query: "crawler" }),
    (error) => error.code === "SOURCE_NOT_CONFIGURED" && !JSON.stringify(error).includes("Bearer")
  );
  let authorization = "";
  const registry = createSourceRegistry({
    x: { bearerToken: "fixture-bearer" },
    fetch: async (_value, init) => {
      authorization = init.headers.authorization;
      return json({
        data: [{ id: "123456", text: "A crawler post", author_id: "u1", created_at: "2025-01-01T00:00:00Z" }],
        includes: { users: [{ id: "u1", username: "maintainer" }] }
      });
    }
  });
  const [result] = await registry.search("x", { query: "crawler", maxResults: 1 });
  assert.equal(authorization, "Bearer fixture-bearer");
  assert.equal(result.author, "maintainer");
  assert.equal(JSON.stringify(result).includes("fixture-bearer"), false);
});

test("Reddit provider uses application-only OAuth, caches the token, and normalizes posts", async () => {
  let tokenRequests = 0;
  const registry = createSourceRegistry({
    reddit: {
      clientId: "fixture-client",
      clientSecret: "fixture-secret",
      userAgent: "cockroach-crawler-test/1.0 by maintainer"
    },
    fetch: async (value, init = {}) => {
      const url = new URL(value);
      if (url.pathname === "/api/v1/access_token") {
        tokenRequests += 1;
        assert.match(init.headers.authorization, /^Basic /);
        return json({ access_token: "access-token", expires_in: 3600 });
      }
      assert.equal(init.headers.authorization, "Bearer access-token");
      const post = {
         id: "abc123",
         title: "Crawler fixture",
         permalink: "/r/testing/comments/abc123/crawler_fixture/",
        selftext: "Fixture body",
        author: "tester",
        created_utc: 1_735_689_600,
        subreddit: "testing",
         score: 4,
         num_comments: 2,
         over_18: false
      };
      if (url.pathname === "/comments/abc123") {
        return json([
          { data: { children: [{ kind: "t3", data: post }] } },
          { data: { children: [{ kind: "t1", data: { id: "comment-1", author: "reader", body: "Useful", score: 3 } }] } }
        ]);
      }
      return json({ data: { children: [{ kind: "t3", data: post }] } });
    }
  });
  const [first] = await registry.search("reddit", { query: "crawler", subreddit: "testing" });
  const [second] = await registry.search("reddit", { query: "crawler" });
  const [readResult] = await registry.read("reddit", "abc123");
  assert.equal(first.title, "Crawler fixture");
  assert.equal(second.source, "reddit");
  assert.equal(readResult.provenance.authenticated, true);
  assert.equal(readResult.provenance.credentialed, true);
  assert.equal(readResult.metadata.commentsSample[0].id, "comment-1");
  assert.equal(tokenRequests, 1);
  assert.equal(JSON.stringify(first).includes("access-token"), false);
});

test("web provider routes an explicit URL through the hardened crawler", async (t) => {
  const server = createServer((request, response) => {
    if (request.url === "/robots.txt") {
      response.writeHead(404).end();
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end("<html><head><title>Local source</title></head><body><h1>Fixture</h1></body></html>");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const { port } = server.address();
  const registry = createSourceRegistry({
    web: { crawlOptions: { allowPrivateNetworks: true, delayMs: 0, maxPages: 1, maxRequests: 5 } }
  });
  const [result] = await registry.read("web", `http://127.0.0.1:${port}/`);
  assert.equal(result.title, "Local source");
  assert.equal(result.provenance.method, "crawler");
});

test("cockroach-sources CLI exposes a secret-free doctor report", () => {
  const result = spawnSync(process.execPath, [path.join(root, "bin", "cockroach-sources.js"), "doctor", "--json"], {
    cwd: root,
    encoding: "utf8",
    env: { PATH: process.env.PATH }
  });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.find(({ id }) => id === "github").status, "ready");
  assert.equal(report.find(({ id }) => id === "x").status, "missing_credentials");
});
