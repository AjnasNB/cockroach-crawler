#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { crawlDetailed, extractPage } from "../../src/index.js";

const scriptPath = fileURLToPath(import.meta.url);
const publicDirectory = path.dirname(scriptPath);
const root = path.resolve(publicDirectory, "../..");
const sources = JSON.parse(await readFile(path.join(publicDirectory, "sources.json"), "utf8"));
const robotCorpus = JSON.parse(await readFile(path.join(publicDirectory, "robots-vectors.json"), "utf8"));
const outputFlag = process.argv.indexOf("--output");
if (process.argv.some((argument, index) => argument.startsWith("--") && index !== outputFlag)) {
  throw new TypeError("Only --output <path> is supported.");
}
const output = outputFlag >= 0 ? process.argv[outputFlag + 1] : "";
if (outputFlag >= 0 && !output) throw new TypeError("--output requires a path.");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function sourceFingerprint() {
  const inputs = [
    "src/index.js",
    "package.json",
    "package-lock.json",
    "bench/public/sources.json",
    "bench/public/robots-vectors.json",
    "bench/public/conformance-benchmark.mjs"
  ];
  const hash = createHash("sha256");
  for (const relative of inputs) {
    hash.update(relative);
    hash.update("\0");
    hash.update(await readFile(path.join(root, relative)));
    hash.update("\0");
  }
  return { algorithm: "sha256", value: hash.digest("hex"), inputs };
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

let currentRobots = "";
let pageRequests = 0;
const server = createServer((request, response) => {
  if (request.url === "/robots.txt") {
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end(currentRobots);
    return;
  }
  pageRequests += 1;
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end("<main><h1>Public conformance fixture</h1></main>");
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

const origin = `http://127.0.0.1:${server.address().port}`;
const robotsResults = [];
try {
  for (const vector of robotCorpus.cases) {
    currentRobots = vector.robots;
    const before = pageRequests;
    const result = await crawlDetailed({
      seeds: [`${origin}${vector.path}`],
      userAgent: "CockroachCrawler",
      maxPages: 1,
      maxRequests: 2,
      maxRetries: 0,
      delayMs: 0,
      includeSitemaps: false,
      allowPrivateNetworks: true
    });
    const requested = pageRequests > before;
    const observedAllowed = result.pages.length === 1 && requested;
    const observedDenied = result.pages.length === 0 && !requested && result.stats.skippedRobots === 1;
    robotsResults.push({
      name: vector.name,
      expectedAllowed: vector.allowed,
      observedAllowed,
      passed: vector.allowed ? observedAllowed : observedDenied
    });
  }
} finally {
  await new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections?.();
  });
}

const wptUrl = `https://raw.githubusercontent.com/web-platform-tests/wpt/${sources.wptUrl.revision}/${sources.wptUrl.path}`;
const response = await fetch(wptUrl, { redirect: "error" });
if (!response.ok) throw new Error(`WPT download failed with HTTP ${response.status}.`);
const wptBytes = Buffer.from(await response.arrayBuffer());
const wptHash = sha256(wptBytes);
if (wptHash !== sources.wptUrl.sha256) {
  throw new Error(`WPT corpus hash mismatch: expected ${sources.wptUrl.sha256}, received ${wptHash}.`);
}
const wptCorpus = JSON.parse(wptBytes);
const selectedWptCases = wptCorpus
  .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
  .filter((entry) => ["http:", "https:"].includes(entry.protocol))
  .filter((entry) => !entry.username && !entry.password)
  .filter((entry) => typeof entry.input === "string" && typeof entry.base === "string" && typeof entry.href === "string")
  .slice(0, 500);

const wptResults = selectedWptCases.map((entry, index) => {
  const expected = new URL(entry.href);
  expected.hash = "";
  const html = `<html><head><link rel="canonical" href="${escapeAttribute(entry.input)}"></head><body></body></html>`;
  const actual = extractPage(html, entry.base).canonical;
  return {
    index,
    expected: expected.toString(),
    actual,
    passed: actual === expected.toString()
  };
});

const packageManifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const result = {
  schemaVersion: 1,
  benchmark: "cockroach-crawler-public-conformance",
  scope: {
    description: "Public-source conformance probes for robots dispatch and HTTP(S) canonical URL normalization.",
    intendedClaims: [
      "pass rate on the named Google robots vectors adapted through the real crawler dispatch path",
      "pass rate on the named pinned WPT HTTP(S) URL subset through extractPage canonical normalization"
    ],
    excludedClaims: [
      "complete RFC 9309 certification",
      "complete WHATWG URL certification",
      "browser-engine certification",
      "network throughput or production capacity"
    ]
  },
  package: {
    name: packageManifest.name,
    version: packageManifest.version,
    source: await sourceFingerprint()
  },
  robots: {
    source: robotCorpus.source,
    rfc: sources.rfc9309.url,
    cases: robotsResults.length,
    passed: robotsResults.filter((entry) => entry.passed).length,
    passRate: robotsResults.filter((entry) => entry.passed).length / robotsResults.length,
    results: robotsResults
  },
  wptUrl: {
    source: sources.wptUrl,
    selection: "All applicable corpus entries, up to 500, with HTTP(S) expected protocol, no URL credentials, and string input/base/href fields.",
    corpusSha256: wptHash,
    cases: wptResults.length,
    passed: wptResults.filter((entry) => entry.passed).length,
    passRate: wptResults.filter((entry) => entry.passed).length / wptResults.length,
    results: wptResults
  }
};

const serialized = `${JSON.stringify(result, null, 2)}\n`;
if (output) {
  const outputPath = path.resolve(root, output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serialized, "utf8");
}
process.stdout.write(serialized);
