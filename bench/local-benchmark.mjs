#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { crawlDetailed } from "../src/index.js";

const benchmarkDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(benchmarkDirectory, "..");
const schemaVersion = 1;

function integerEnvironment(name, fallback, minimum, maximum) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  if (!/^(?:0|[1-9]\d*)$/.test(raw)) {
    throw new TypeError(`${name} must be an integer from ${minimum} to ${maximum}.`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new TypeError(`${name} must be an integer from ${minimum} to ${maximum}.`);
  }
  return value;
}

const pageCount = integerEnvironment("PAGES", 120, 1, 1_000);
const concurrency = integerEnvironment("CONCURRENCY", 8, 1, 64);
const warmupRuns = integerEnvironment("WARMUP_RUNS", 2, 0, 20);
const measuredRuns = integerEnvironment("SAMPLES", 7, 3, 50);
const outputValue = process.env.BENCH_OUTPUT?.trim() || null;
const outputPath = outputValue ? path.resolve(repositoryRoot, outputValue) : null;

function pageHtml(index, origin) {
  const next = index + 1 < pageCount ? `<a href="${origin}/page-${index + 1}">Next</a>` : "";
  const previous = index > 0 ? `<a href="${origin}/page-${index - 1}">Previous</a>` : "";
  return `<!doctype html>
<html>
  <head>
    <title>Benchmark Page ${index}</title>
    <meta name="description" content="Synthetic local regression page ${index}">
  </head>
  <body>
    <main>
      <h1>Benchmark Page ${index}</h1>
      <p>Deterministic public fixture content for page ${index}. It validates text and markdown extraction.</p>
      ${previous}
      ${next}
      <a href="${origin}/login">Sensitive path</a>
    </main>
  </body>
</html>`;
}

const requestCounts = new Map();
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, "http://fixture.invalid").pathname;
  requestCounts.set(pathname, (requestCounts.get(pathname) || 0) + 1);

  if (pathname === "/robots.txt") {
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end("User-agent: *\nDisallow: /blocked\nSitemap: /sitemap.xml\n");
    return;
  }

  if (pathname === "/sitemap.xml") {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const urls = Array.from(
      { length: pageCount },
      (_, index) => `<url><loc>${origin}/page-${index}</loc></url>`
    ).join("");
    response.writeHead(200, { "content-type": "application/xml; charset=utf-8" });
    response.end(`<?xml version="1.0" encoding="UTF-8"?><urlset>${urls}</urlset>`);
    return;
  }

  const match = pathname.match(/^\/page-(\d+)$/);
  if (match) {
    const index = Number(match[1]);
    if (index >= 0 && index < pageCount) {
      const origin = `http://127.0.0.1:${server.address().port}`;
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(pageHtml(index, origin));
      return;
    }
  }

  response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  response.end("Not found");
});

function percentile(sorted, probability) {
  const rank = Math.max(0, Math.ceil(probability * sorted.length) - 1);
  return sorted[rank];
}

function median(sorted) {
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function rounded(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function summarize(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return {
    minimum: rounded(sorted[0]),
    median: rounded(median(sorted)),
    p95: rounded(percentile(sorted, 0.95)),
    maximum: rounded(sorted.at(-1)),
    spread: rounded(sorted.at(-1) - sorted[0])
  };
}

function git(...args) {
  try {
    return execFileSync("git", args, {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trimEnd();
  } catch {
    return null;
  }
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(candidate));
    else if (entry.isFile()) files.push(candidate);
  }
  return files;
}

async function sourceState() {
  const inputs = [
    ...await collectFiles(path.join(repositoryRoot, "src")),
    path.join(repositoryRoot, "package.json"),
    path.join(repositoryRoot, "package-lock.json"),
    fileURLToPath(import.meta.url)
  ].sort((left, right) => left.localeCompare(right));
  const hash = createHash("sha256");
  const relativeInputs = [];
  for (const input of inputs) {
    const relative = path.relative(repositoryRoot, input).replaceAll("\\", "/");
    relativeInputs.push(relative);
    hash.update(relative);
    hash.update("\0");
    hash.update(await readFile(input));
    hash.update("\0");
  }

  const rawStatus = git("status", "--porcelain=v1", "--untracked-files=all") || "";
  const excludedOutput = outputPath
    ? path.relative(repositoryRoot, outputPath).replaceAll("\\", "/")
    : null;
  const changes = rawStatus
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => line.slice(3).replaceAll("\\", "/") !== excludedOutput);

  return {
    commit: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
    dirty: changes.length > 0,
    changes,
    fingerprint: {
      algorithm: "sha256",
      value: hash.digest("hex"),
      inputs: relativeInputs
    }
  };
}

function countFor(pathname) {
  return requestCounts.get(pathname) || 0;
}

function requestSnapshot() {
  return new Map(requestCounts);
}

function requestDelta(before, pathname) {
  return countFor(pathname) - (before.get(pathname) || 0);
}

async function runFixture(origin, phase, iteration) {
  const before = requestSnapshot();
  const startedAt = performance.now();
  const result = await crawlDetailed({
    seeds: [`${origin}/page-0`],
    maxPages: pageCount,
    maxDepth: Math.min(pageCount, 100),
    maxRequests: pageCount + 4,
    maxQueue: pageCount + 4,
    concurrency,
    delayMs: 0,
    maxRetries: 0,
    allowPrivateNetworks: true,
    includeSitemaps: true
  });
  const elapsedMs = performance.now() - startedAt;

  const expectedPaths = Array.from({ length: pageCount }, (_, index) => `/page-${index}`);
  const actualPaths = result.pages.map((page) => new URL(page.url).pathname).sort();
  assert.deepEqual(actualPaths, [...expectedPaths].sort(), `${phase} ${iteration}: URL set changed`);
  assert.equal(new Set(actualPaths).size, pageCount, `${phase} ${iteration}: duplicate page returned`);
  assert.equal(result.pages.length, pageCount, `${phase} ${iteration}: page count changed`);
  assert.equal(result.failures.length, 0, `${phase} ${iteration}: fixture crawl had failures`);
  assert.equal(result.stats.fetched, pageCount, `${phase} ${iteration}: fetched count changed`);
  assert.equal(result.stats.pages, pageCount, `${phase} ${iteration}: stats page count changed`);
  assert.equal(requestDelta(before, "/robots.txt"), 1, `${phase} ${iteration}: robots fetch count changed`);
  assert.equal(requestDelta(before, "/sitemap.xml"), 1, `${phase} ${iteration}: sitemap fetch count changed`);
  assert.equal(requestDelta(before, "/login"), 0, `${phase} ${iteration}: sensitive URL was requested`);

  for (let index = 0; index < pageCount; index += 1) {
    const page = result.pages.find((candidate) => new URL(candidate.url).pathname === `/page-${index}`);
    assert.equal(page?.title, `Benchmark Page ${index}`, `${phase} ${iteration}: title extraction changed`);
    assert.equal(page?.h1, `Benchmark Page ${index}`, `${phase} ${iteration}: h1 extraction changed`);
    assert.match(page?.text || "", new RegExp(`fixture content for page ${index}\\b`), `${phase} ${iteration}: text extraction changed`);
    assert.match(page?.markdown || "", new RegExp(`Benchmark Page ${index}`), `${phase} ${iteration}: markdown extraction changed`);
    assert.match(page?.contentHash || "", /^sha256:[a-f0-9]{64}$/, `${phase} ${iteration}: content hash missing`);
    assert.equal(requestDelta(before, `/page-${index}`), 1, `${phase} ${iteration}: page request count changed`);
  }

  return {
    iteration,
    elapsedMs: rounded(elapsedMs),
    pagesPerSecond: rounded(pageCount / (elapsedMs / 1_000)),
    pages: result.pages.length,
    requests: result.stats.requests,
    bytes: result.stats.bytes,
    correctness: "passed"
  };
}

async function runPolicyProbes(origin) {
  const blockedBefore = countFor("/blocked");
  const blocked = await crawlDetailed({
    seeds: [`${origin}/blocked`],
    maxPages: 1,
    maxRequests: 2,
    maxRetries: 0,
    delayMs: 0,
    allowPrivateNetworks: true,
    includeSitemaps: false
  });
  assert.equal(blocked.pages.length, 0, "robots-disallowed page was returned");
  assert.equal(blocked.stats.skippedRobots, 1, "robots denial was not recorded");
  assert.equal(countFor("/blocked"), blockedBefore, "robots-disallowed page reached the server");

  const loginBefore = countFor("/login");
  await assert.rejects(
    () => crawlDetailed({
      seeds: [`${origin}/login`],
      maxPages: 1,
      delayMs: 0,
      allowPrivateNetworks: true
    }),
    (error) => error?.code === "CRAWLER_URL_BLOCKED",
    "sensitive seed must fail closed before dispatch"
  );
  assert.equal(countFor("/login"), loginBefore, "sensitive seed reached the server");

  return {
    robotsDisallowedPathNotFetched: true,
    sensitiveSeedRejectedBeforeRequest: true
  };
}

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

try {
  const generatedAt = new Date().toISOString();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const repository = await sourceState();

  for (let iteration = 1; iteration <= warmupRuns; iteration += 1) {
    await runFixture(origin, "warmup", iteration);
  }

  const samples = [];
  for (let iteration = 1; iteration <= measuredRuns; iteration += 1) {
    samples.push(await runFixture(origin, "sample", iteration));
  }

  const policyProbes = await runPolicyProbes(origin);
  const cpus = os.cpus();
  const result = {
    schemaVersion,
    benchmark: "cockroach-crawler-local-regression",
    generatedAt,
    scope: {
      description: "Synthetic loopback HTTP crawl using the non-browser Node.js engine.",
      intendedUse: "Project-local performance regression and deterministic correctness checks.",
      excludedClaims: [
        "industry or global standard",
        "competitor ranking",
        "production capacity or SLA",
        "public-internet latency"
      ]
    },
    configuration: {
      pages: pageCount,
      concurrency,
      warmupRuns,
      measuredRuns,
      includeSitemaps: true,
      obeyRobots: true,
      browserRendering: false,
      network: "IPv4 loopback only"
    },
    environment: {
      node: process.version,
      v8: process.versions.v8,
      platform: process.platform,
      operatingSystem: `${os.type()} ${os.release()}`,
      architecture: process.arch,
      cpuModel: cpus[0]?.model?.trim() || "unknown",
      logicalCpuCount: cpus.length,
      totalMemoryBytes: os.totalmem()
    },
    source: repository,
    correctness: {
      status: "passed",
      assertionsPerRun: [
        "exact expected URL set",
        "no duplicate pages",
        "exact page and request counts",
        "zero crawl failures",
        "title, h1, text, markdown, and content-hash extraction",
        "one robots.txt and one sitemap request",
        "sensitive path not requested"
      ],
      policyProbes
    },
    results: {
      units: {
        elapsed: "milliseconds",
        throughput: "pages/second",
        bytes: "response bytes accounted by crawler"
      },
      elapsedMs: summarize(samples.map((sample) => sample.elapsedMs)),
      pagesPerSecond: summarize(samples.map((sample) => sample.pagesPerSecond)),
      samples
    }
  };

  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (outputPath) {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, serialized, "utf8");
  }
  process.stdout.write(serialized);
} finally {
  await new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections?.();
  });
}
