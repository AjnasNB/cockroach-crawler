import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  capturePageArtifacts,
  normalizeScrollOptions,
  runPageHooks
} from "../src/browser.js";
import { createCachedCrawler, FileCrawlCache } from "../src/cache.js";
import { parsePdf } from "../src/documents.js";
import { extractWithLlm, extractWithRegex, extractWithXPath } from "../src/extractors.js";
import { createBoundedJobQueue } from "../src/jobs.js";
import { buildMcpCrawlOptions, createCockroachMcpServer } from "../src/mcp.js";
import {
  createEscalationRouter,
  createProxyGatewayProvider,
  detectAccessChallenge
} from "../src/providers.js";
import { startCrawlerApi } from "../src/server.js";
import { createTraversalQueue, scoreRelevance } from "../src/strategies.js";
import { crawl } from "../src/index.js";

let target;
let targetUrl;

async function waitForJobStatus(queue, id, expected, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  let job = queue.get(id);
  while (job?.status !== expected && Date.now() < deadline) {
    if (["failed", "cancelled"].includes(job?.status)) break;
    await new Promise((resolve) => setTimeout(resolve, 10));
    job = queue.get(id);
  }
  assert.equal(job?.status, expected);
  return job;
}

before(async () => {
  target = createServer((request, response) => {
    if (request.url === "/robots.txt") {
      response.setHeader("content-type", "text/plain");
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    if (request.url === "/") {
      response.setHeader("content-type", "text/html");
      response.end("<main><h1>Advanced crawler</h1><a href='/general'>General</a><a href='/invoice-approval'>Invoice approval</a></main>");
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end(`<main><h1>${request.url === "/invoice-approval" ? "Invoice approval" : "General"}</h1><p>Verified evidence.</p></main>`);
  });
  await new Promise((resolve) => target.listen(0, "127.0.0.1", resolve));
  targetUrl = `http://127.0.0.1:${target.address().port}`;
});

after(async () => {
  target.closeAllConnections?.();
  await new Promise((resolve) => target.close(resolve));
});

test("traversal queues implement BFS, DFS, and deterministic relevance priority", () => {
  const bfs = createTraversalQueue("bfs");
  bfs.push({ url: "https://example.com/first" });
  bfs.push({ url: "https://example.com/second" });
  assert.match(bfs.shift().url, /first$/);

  const dfs = createTraversalQueue("dfs");
  dfs.push({ url: "https://example.com/first" });
  dfs.push({ url: "https://example.com/second" });
  assert.match(dfs.shift().url, /second$/);

  const adaptive = createTraversalQueue({ mode: "adaptive", query: "invoice approval" });
  adaptive.push({ url: "https://example.com/general" });
  adaptive.push({ url: "https://example.com/invoice-approval" });
  assert.match(adaptive.shift().url, /invoice-approval$/);
  assert.ok(scoreRelevance({ url: "https://example.com/invoice" }, "invoice") > 0);
});

test("crawler traversal modes change admitted processing order without changing authority", async () => {
  const defaults = {
    seeds: [targetUrl],
    maxPages: 2,
    maxDepth: 1,
    concurrency: 1,
    delayMs: 0,
    allowPrivateNetworks: true
  };
  const bfs = await crawl({ ...defaults, traversal: "bfs" });
  const dfs = await crawl({ ...defaults, traversal: "dfs" });
  const adaptive = await crawl({
    ...defaults,
    traversal: { mode: "adaptive", query: "invoice approval" }
  });
  assert.equal(new URL(bfs[1].url).pathname, "/general");
  assert.equal(new URL(dfs[1].url).pathname, "/invoice-approval");
  assert.equal(new URL(adaptive[1].url).pathname, "/invoice-approval");
  assert.equal(bfs.stats.traversal, "bfs");
  assert.equal(dfs.stats.traversal, "dfs");
  assert.equal(adaptive.stats.traversal, "adaptive");
});

test("persistent cache verifies hashes, records hits, and honors refresh", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "cockroach-cache-"));
  try {
    const cache = new FileCrawlCache({ directory, namespace: "test", ttlMs: 60_000 });
    let calls = 0;
    const cached = createCachedCrawler(cache, async (input) => ({
      pages: [{ url: input.url }],
      stats: { calls: ++calls }
    }));
    const first = await cached({ url: "https://example.com" });
    const second = await cached({ url: "https://example.com" });
    const refreshed = await cached({ url: "https://example.com" }, { refresh: true });
    assert.equal(first.cache.hit, false);
    assert.equal(second.cache.hit, true);
    assert.equal(refreshed.cache.hit, false);
    assert.equal(calls, 2);
    assert.throws(
      () => cache.key({ browser: { hooks: [() => true] } }),
      /non-serializable authority/
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("XPath and optional host-supplied LLM extraction are bounded and schema validated", async () => {
  const xpath = extractWithXPath(
    "<html><body><main><h1>Catalog</h1><a href='/first'>First</a><a href='/second'>Second</a></main></body></html>",
    "https://example.com/catalog",
    {
      fields: {
        heading: "//*[local-name()='h1']",
        links: {
          xpath: "//*[local-name()='a']",
          source: "attribute",
          attribute: "href",
          resolveUrl: true,
          multiple: true
        }
      }
    }
  );
  assert.equal(xpath.data.heading, "Catalog");
  assert.deepEqual(xpath.data.links, [
    "https://example.com/first",
    "https://example.com/second"
  ]);

  const llm = await extractWithLlm(
    { url: "https://example.com", markdown: "# Invoice\nTotal: 42" },
    {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { total: { type: "number" } },
        required: ["total"]
      },
      adapter: async ({ content }) => ({ total: content.includes("42") ? 42 : 0 })
    }
  );
  assert.deepEqual(llm.data, { total: 42 });
  assert.equal(llm.provenance.schemaValidated, true);

  await assert.rejects(
    extractWithLlm(
      { text: "unsupported" },
      {
        schema: { type: "object", properties: { total: { type: "number" } }, required: ["total"] },
        adapter: async () => ({ total: "not-a-number" })
      }
    ),
    /failed the supplied JSON Schema/
  );
});

test("restricted regex extraction supports numbered and named groups with hard ceilings", () => {
  const result = extractWithRegex("Invoice INV-42 total $19.50; invoice INV-43 total $7.00", {
    fields: {
      ids: {
        pattern: "INV-(?<id>\\d+)",
        group: "id",
        multiple: true
      },
      firstTotal: {
        pattern: "\\$(\\d+\\.\\d{2})",
        group: 1
      }
    }
  });
  assert.deepEqual(result.data.ids, ["42", "43"]);
  assert.equal(result.data.firstTotal, "19.50");
  assert.throws(
    () => extractWithRegex("aaaaaaaa", { fields: { unsafe: "(a+)+$" } }),
    /nested repetition/
  );
});

test("restricted regex extraction rejects backtracking-prone repeated groups", () => {
  assert.throws(
    () => extractWithRegex(`${"a".repeat(1_000)}!`, {
      fields: { unsafe: { pattern: "^(a|aa)+$" } }
    }),
    /repeated alternation/
  );
  assert.throws(
    () => extractWithRegex("aaaa", {
      fields: { unsafe: { pattern: "^(a+)+$" } }
    }),
    /nested repetition/
  );
});

test("bounded self-hosted jobs expose status, cancellation, and result ceilings", async () => {
  const queue = createBoundedJobQueue({
    concurrency: 1,
    maxPending: 2,
    execute: async ({ value }, { signal }) => {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 5);
        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(signal.reason);
        }, { once: true });
      });
      return { value };
    }
  });
  const submitted = queue.submit({ value: 42 });
  const succeeded = await waitForJobStatus(queue, submitted.id, "succeeded");
  assert.deepEqual(succeeded.result, { value: 42 });
  const cancelled = queue.submit({ value: 7 });
  assert.equal(queue.cancel(cancelled.id), true);
  assert.equal(queue.get(cancelled.id).status, "cancelled");
  queue.close();
});

test("browser helpers bound scroll configuration, hook output, screenshots, and PDFs", async () => {
  assert.deepEqual(
    normalizeScrollOptions({ maxSteps: 2, stableIterations: 1 }),
    { maxSteps: 2, stepPixels: 800, delayMs: 100, stableIterations: 1 }
  );
  const hookPage = {
    evaluate: async (hook, argument) => hook(argument)
  };
  assert.deepEqual(
    await runPageHooks(hookPage, [({ index }) => ({ index })]),
    [{ index: 0 }]
  );

  const directory = await mkdtemp(path.join(tmpdir(), "cockroach-artifacts-"));
  try {
    const page = {
      screenshot: async () => Buffer.from("png-bytes"),
      pdf: async () => Buffer.from("%PDF-test")
    };
    const artifacts = await capturePageArtifacts(page, "https://example.com", {
      directory,
      screenshot: true,
      pdf: true
    });
    assert.equal(await readFile(artifacts.screenshot.path, "utf8"), "png-bytes");
    assert.equal(await readFile(artifacts.pdf.path, "utf8"), "%PDF-test");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("provider escalation rotates only under explicit policy and stops on access challenges", async () => {
  assert.equal(detectAccessChallenge({ status: 403, body: "Verify you are human" }).challenge, true);
  const router = createEscalationRouter({
    providers: [
      { id: "direct", execute: async () => ({ status: 503, body: "unavailable" }) },
      { id: "approved-proxy", authority: "operator-approved", execute: async () => ({ status: 200, body: "ok" }) }
    ]
  });
  const result = await router.execute({ url: "https://example.com" });
  assert.equal(result.provider, "approved-proxy");
  assert.equal(result.attempts.length, 2);

  const challenged = createEscalationRouter({
    providers: [{ id: "direct", execute: async () => ({ status: 403, body: "captcha" }) }]
  });
  await assert.rejects(challenged.execute({ url: "https://example.com" }), (error) => {
    assert.equal(error.code, "ACCESS_CHALLENGE");
    return true;
  });
});

test("fixed proxy gateway provider keeps endpoint and credentials operator-owned", async () => {
  let observed;
  const provider = createProxyGatewayProvider({
    id: "self-hosted-proxy",
    endpoint: "https://proxy.example.test/v1/fetch",
    token: "operator-secret-token",
    fetch: async (endpoint, init) => {
      observed = { endpoint: String(endpoint), init };
      return new Response(JSON.stringify({ status: 200, body: "ok" }), {
        headers: { "content-type": "application/json" }
      });
    }
  });
  const result = await provider.execute({ url: "https://example.com" });
  assert.equal(result.status, 200);
  assert.equal(observed.endpoint, "https://proxy.example.test/v1/fetch");
  assert.equal(observed.init.headers.authorization, "Bearer operator-secret-token");
});

test("fixed proxy gateway provider classifies gateway HTTP failures without exposing its token", async () => {
  const provider = createProxyGatewayProvider({
    id: "self-hosted",
    endpoint: "https://gateway.example/v1/read",
    token: "operator-secret-long-enough",
    fetch: async () => new Response("temporarily unavailable", { status: 503 })
  });
  await assert.rejects(
    provider.execute({ url: "https://example.com" }),
    (error) => {
      assert.equal(error.code, "PROXY_GATEWAY_HTTP");
      assert.equal(error.status, 503);
      assert.equal(error.retryable, true);
      assert.doesNotMatch(error.message, /operator-secret/);
      return true;
    }
  );
});

test("MCP surface clamps model input to operator-owned crawl limits", async () => {
  const options = buildMcpCrawlOptions(
    { maxPages: 5, maxDepth: 2, allowedOrigins: ["https://example.com"] },
    { urls: ["https://example.com"], maxPages: 3, maxDepth: 1, query: "evidence" }
  );
  assert.equal(options.maxPages, 3);
  assert.equal(options.maxDepth, 1);
  assert.deepEqual(options.allowedOrigins, ["https://example.com"]);
  assert.equal(options.traversal.mode, "adaptive");
  const server = createCockroachMcpServer({
    crawlDefaults: { maxPages: 5, maxDepth: 2, allowedOrigins: ["https://example.com"] }
  });
  assert.equal(typeof server.connect, "function");
  await server.close();
});

test("native MCP stdio transport exposes bounded tools and capability evidence", async () => {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => typeof value === "string")
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve("bin", "cockroach-mcp.js")],
    env: {
      ...env,
      COCKROACH_ALLOWED_ORIGINS: "https://example.com",
      COCKROACH_MAX_PAGES: "5",
      COCKROACH_MAX_DEPTH: "2"
    }
  });
  const client = new Client({ name: "cockroach-mcp-test", version: "1.0.0" });
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    assert.deepEqual(
      tools.tools.map(({ name }) => name).sort(),
      ["crawl", "crawl_spider", "export_records", "extract_structured", "find_similar", "map_site", "relocate_element", "select"]
    );
    const extraction = await client.callTool({
      name: "extract_structured",
      arguments: {
        html: "<main><h1>Native MCP</h1></main>",
        url: "https://example.com/evidence",
        fields: { heading: "h1" }
      }
    });
    assert.equal(extraction.isError, undefined);
    assert.equal(extraction.structuredContent.data.heading, "Native MCP");
    const resource = await client.readResource({ uri: "cockroach://capabilities" });
    const body = JSON.parse(resource.contents[0].text);
    assert.deepEqual(body.fixedPolicy.allowedOrigins, ["https://example.com"]);
    assert.equal(body.fixedPolicy.maxPages, 5);
    assert.ok(body.exclusions.includes("model-controlled origin expansion"));
  } finally {
    await client.close();
  }
});

test("Docker API serves a playground and authenticated bounded crawl", async () => {
  const token = "test-token-that-is-long-enough";
  const api = await startCrawlerApi({
    host: "127.0.0.1",
    port: 0,
    token,
    crawlDefaults: {
      allowedOrigins: [targetUrl],
      sameOrigin: true,
      allowPrivateNetworks: true,
      maxPages: 2,
      maxDepth: 1,
      maxRequests: 10,
      delayMs: 0
    }
  });
  try {
    const playground = await fetch(api.url);
    assert.equal(playground.status, 200);
    assert.match(await playground.text(), /Give your AI agent/);

    const unauthorized = await fetch(`${api.url}/v1/crawl`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ seeds: [targetUrl] })
    });
    assert.equal(unauthorized.status, 401);

    const response = await fetch(`${api.url}/v1/crawl`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ seeds: [targetUrl], maxPages: 1 })
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.pages.length, 1);

    const mapResponse = await fetch(`${api.url}/v1/map`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        seeds: [targetUrl],
        maxPages: 2,
        query: "invoice",
        search: "invoice",
        maxResults: 1
      })
    });
    assert.equal(mapResponse.status, 200);
    const mapBody = await mapResponse.json();
    assert.equal(mapBody.entries.length, 1);
    assert.match(mapBody.entries[0].url, /invoice-approval/);

    const jobResponse = await fetch(`${api.url}/v1/jobs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        operation: "map",
        input: { seeds: [targetUrl], maxPages: 1 }
      })
    });
    assert.equal(jobResponse.status, 202);
    const submittedJob = await jobResponse.json();
    let completedJob;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const statusResponse = await fetch(`${api.url}/v1/jobs/${submittedJob.id}`, {
        headers: { authorization: `Bearer ${token}` }
      });
      completedJob = await statusResponse.json();
      if (["succeeded", "failed"].includes(completedJob.status)) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(completedJob.status, "succeeded");
    assert.equal(completedJob.result.entries.length, 1);
  } finally {
    await api.close();
  }
});

test("PDF parser rejects non-PDF bytes before loading parser work", async () => {
  await assert.rejects(parsePdf(Buffer.from("not a pdf")), /%PDF-/);
});

test("container entry uses a maintained Node line, non-root user, and authenticated server", async () => {
  const dockerfile = await readFile(path.resolve("Dockerfile"), "utf8");
  const serverBin = await readFile(path.resolve("bin", "cockroach-server.js"), "utf8");
  assert.match(dockerfile, /^FROM node:24-bookworm-slim/m);
  assert.doesNotMatch(dockerfile, /node:20/);
  assert.match(dockerfile, /^USER node$/m);
  assert.match(serverBin, /COCKROACH_API_TOKEN is required/);
  assert.match(serverBin, /COCKROACH_ALLOWED_ORIGINS must contain at least one/);
});
