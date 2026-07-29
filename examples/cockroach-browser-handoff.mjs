#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { mapSite } from "cockroach-crawler";

const BROWSER_API_ORIGIN = "http://127.0.0.1:43110";
const HANDOFF_KEYS = ["allowedOrigins", "budget", "targetUrl"];
const BUDGET_KEYS = [
  "maxActions",
  "maxDownloadBytes",
  "maxDurationMs",
  "maxEvidenceBytes",
  "maxSnapshotChars",
  "maxTabs",
  "maxUploadBytes"
];
const BUDGET_CEILINGS = {
  maxActions: 100,
  maxDownloadBytes: 1_048_576,
  maxDurationMs: 600_000,
  maxEvidenceBytes: 33_554_432,
  maxSnapshotChars: 200_000,
  maxTabs: 4,
  maxUploadBytes: 1_048_576
};

export const DEFAULT_BROWSER_BUDGET = Object.freeze({
  maxActions: 10,
  maxDownloadBytes: 1_024,
  maxDurationMs: 120_000,
  maxEvidenceBytes: 8_388_608,
  maxSnapshotChars: 50_000,
  maxTabs: 1,
  maxUploadBytes: 1_024
});

export function createBrowserHandoff(input) {
  exactKeys(input, HANDOFF_KEYS, "browser handoff");
  const targetUrl = httpUrl(input.targetUrl, "targetUrl");
  const allowedOrigins = origins(input.allowedOrigins);
  const budget = browserBudget(input.budget);
  if (!allowedOrigins.includes(new URL(targetUrl).origin)) {
    throw new TypeError("targetUrl must belong to an explicit allowedOrigins entry.");
  }
  return Object.freeze({
    targetUrl,
    allowedOrigins: Object.freeze(allowedOrigins),
    budget: Object.freeze(budget)
  });
}

export function createBrowserSessionInput(input) {
  exactKeys(input, ["handoff", "purpose"], "browser session input");
  const handoff = createBrowserHandoff(input.handoff);
  return {
    purpose: nonEmpty(input.purpose, "purpose"),
    startUrl: handoff.targetUrl,
    mode: "headless",
    policy: {
      allowedOrigins: [...handoff.allowedOrigins],
      allowedActions: ["snapshot", "extract", "screenshot"],
      allowedEffects: ["read"],
      requireApprovalFor: [],
      allowCookieRead: false,
      allowCookieWrite: false,
      allowDownloads: false,
      allowUploads: false,
      budget: { ...handoff.budget }
    }
  };
}

export async function runCrawlerBrowserHandoff(options, dependencies = {}) {
  const map = dependencies.mapSite ?? mapSite;
  const fetcher = dependencies.fetch ?? globalThis.fetch;
  const readToken = dependencies.readFile ?? readFile;
  const seed = httpUrl(options.seed, "seed");
  const targetUrl = httpUrl(options.targetUrl, "targetUrl");
  const allowedOrigins = origins(options.allowedOrigins);
  if (!allowedOrigins.includes(new URL(seed).origin)) {
    throw new TypeError("seed must belong to an explicit allowedOrigins entry.");
  }

  const mapResult = await map({
    seeds: [seed],
    allowedOrigins,
    maxPages: integer(options.maxPages ?? 6, "maxPages", 12),
    maxDepth: 2,
    maxRequests: 48,
    maxDurationMs: 30_000,
    maxTotalBytes: 8_388_608,
    obeyRobots: true
  });
  const selected = mapResult.entries.find((entry) => {
    return entry.url === targetUrl || entry.canonical === targetUrl;
  });
  if (!selected) {
    throw new Error("The explicit target was not present in the crawler's fetch-validated map.");
  }

  const handoff = createBrowserHandoff({
    targetUrl,
    allowedOrigins,
    budget: options.browserBudget ?? DEFAULT_BROWSER_BUDGET
  });
  const sessionInput = createBrowserSessionInput({
    handoff,
    purpose: options.purpose
  });
  const crawlerEvidence = {
    url: selected.url,
    canonical: selected.canonical ?? null,
    title: selected.title,
    fetchedAt: selected.fetchedAt,
    contentHash: selected.contentHash ?? null
  };

  if (options.dryRun === true) {
    return {
      dispatched: false,
      crawlerEvidence,
      browserHandoff: handoff,
      browserSessionInput: sessionInput
    };
  }

  const token = (await readToken(nonEmpty(options.tokenFile, "tokenFile"), "utf8")).trim();
  if (!token) throw new Error("The Cockroach Browser daemon token file is empty.");
  const session = await browserRequest(fetcher, token, "/v1/sessions", sessionInput);
  const sessionId = nonEmpty(session.id, "browser session id");
  const snapshot = await browserRequest(
    fetcher,
    token,
    `/v1/sessions/${encodeURIComponent(sessionId)}/snapshot`,
    {}
  );
  return {
    dispatched: true,
    crawlerEvidence,
    browserHandoff: handoff,
    browserSession: {
      id: sessionId,
      state: typeof session.state === "string" ? session.state : null
    },
    browserSnapshot: {
      url: typeof snapshot.url === "string" ? snapshot.url : null,
      title: typeof snapshot.title === "string" ? snapshot.title : null,
      capturedAt: typeof snapshot.capturedAt === "string" ? snapshot.capturedAt : null,
      digest: typeof snapshot.digest === "string" ? snapshot.digest : null,
      referenceCount: Array.isArray(snapshot.refs) ? snapshot.refs.length : 0
    }
  };
}

async function browserRequest(fetcher, token, pathname, body) {
  const response = await fetcher(new URL(pathname, BROWSER_API_ORIGIN), {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`Cockroach Browser ${pathname} failed with HTTP ${response.status}.`);
  }
  return response.json();
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${label} must be a plain own-property object.`);
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== expected.length || keys.some((key) => !expected.includes(key))) {
    throw new TypeError(`${label} contains an unknown authority-bearing field or misses a required field.`);
  }
  for (const key of expected) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
      throw new TypeError(`${label}.${key} must be an enumerable data property.`);
    }
  }
}

function browserBudget(value) {
  exactKeys(value, BUDGET_KEYS, "browser budget");
  return Object.fromEntries(BUDGET_KEYS.map((key) => [
    key,
    integer(value[key], `browser budget.${key}`, BUDGET_CEILINGS[key])
  ]));
}

function origins(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) {
    throw new TypeError("allowedOrigins must contain 1-8 explicit origins.");
  }
  const result = value.map((entry, index) => {
    const text = nonEmpty(entry, `allowedOrigins[${index}]`);
    const parsed = new URL(text);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
      throw new TypeError(`allowedOrigins[${index}] must be credential-free HTTP(S).`);
    }
    if (text !== parsed.origin) throw new TypeError(`allowedOrigins[${index}] must be an origin.`);
    return parsed.origin;
  });
  if (new Set(result).size !== result.length) throw new TypeError("allowedOrigins has duplicates.");
  return result;
}

function httpUrl(value, label) {
  const parsed = new URL(nonEmpty(value, label));
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new TypeError(`${label} must be a credential-free HTTP(S) URL.`);
  }
  return parsed.href;
}

function integer(value, label, maximum) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new TypeError(`${label} must be an integer from 1 to ${maximum}.`);
  }
  return value;
}

function nonEmpty(value, label) {
  if (typeof value !== "string" || !value.trim() || value.length > 8_192) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function parseArguments(argv) {
  const options = { allowedOrigins: [], dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") return { help: true };
    if (argument === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    const next = argv[++index];
    if (!next) throw new TypeError(`${argument} requires a value.`);
    if (argument === "--seed") options.seed = next;
    else if (argument === "--target") options.targetUrl = next;
    else if (argument === "--origin") options.allowedOrigins.push(next);
    else if (argument === "--purpose") options.purpose = next;
    else if (argument === "--token-file") options.tokenFile = next;
    else if (argument === "--max-pages") options.maxPages = Number(next);
    else throw new TypeError(`Unknown option: ${argument}`);
  }
  return options;
}

function usage() {
  return `Usage:
  node examples/cockroach-browser-handoff.mjs \\
    --seed https://example.com/ \\
    --target https://example.com/ \\
    --origin https://example.com \\
    --purpose "Capture authorized interactive evidence" \\
    --token-file .cockroach-browser/auth-token

Use --dry-run to crawl and print the exact browser request without dispatch.
`;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) return void process.stdout.write(usage());
  const result = await runCrawlerBrowserHandoff(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
