import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_BROWSER_BUDGET,
  createBrowserHandoff,
  createBrowserSessionInput,
  runCrawlerBrowserHandoff
} from "../examples/cockroach-browser-handoff.mjs";

const exec = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXAMPLE = path.join(ROOT, "examples", "cockroach-browser-handoff.mjs");
const FORBIDDEN_CRAWLER_AUTHORITY = /cookie|credential|profile|storage|token|auth|purpose|action|effect/i;

test("the crawler package keeps Cockroach Browser separate and release claims current", async () => {
  const [
    manifestText,
    lockText,
    boundary,
    readme,
    reach,
    security,
    licenseInventory
  ] = await Promise.all([
    readFile(path.join(ROOT, "package.json"), "utf8"),
    readFile(path.join(ROOT, "package-lock.json"), "utf8"),
    readFile(path.join(ROOT, "docs", "COCKROACH-BROWSER.md"), "utf8"),
    readFile(path.join(ROOT, "README.md"), "utf8"),
    readFile(path.join(ROOT, "docs", "REACH-AND-BROWSER.md"), "utf8"),
    readFile(path.join(ROOT, "SECURITY.md"), "utf8"),
    readFile(path.join(ROOT, "docs", "DEPENDENCY_LICENSES.md"), "utf8")
  ]);
  const manifest = JSON.parse(manifestText);
  const lockfile = JSON.parse(lockText);

  for (const section of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies"
  ]) {
    assert.equal(
      manifest[section]?.["cockroach-browser"],
      undefined,
      `cockroach-browser must not enter ${section}`
    );
  }
  assert.equal(
    lockfile.packages?.["node_modules/cockroach-browser"],
    undefined,
    "the AGPL browser runtime must not enter the crawler lockfile"
  );
  for (const document of [boundary, readme, reach, security, licenseInventory]) {
    assert.match(document, /cockroach-browser@0\.1\.0/i);
  }
  assert.match(boundary, /AGPL-3\.0-or-later/);
  assert.match(boundary, /not a\s+runtime, peer, optional, or development dependency/i);
  assert.match(boundary, /Profiles, cookies, storage state, secret references, and authenticated\s+page state never flow through Cockroach Crawler/i);
  assert.match(readme, /docs\/COCKROACH-BROWSER\.md/);
  assert.doesNotMatch(
    [boundary, readme, reach, security, licenseInventory].join("\n"),
    /Cockroach Browser[^\n.]{0,100}(?:is not public|is unpublished|future package|planned release)/i
  );
});

test("the handoff schema rejects authority drift and contains only URL, origins, and budget", () => {
  const handoff = createBrowserHandoff({
    targetUrl: "https://example.com/docs",
    allowedOrigins: ["https://example.com"],
    budget: DEFAULT_BROWSER_BUDGET
  });

  assert.deepEqual(Object.keys(handoff).sort(), ["allowedOrigins", "budget", "targetUrl"]);
  assert.deepEqual(handoff, {
    targetUrl: "https://example.com/docs",
    allowedOrigins: ["https://example.com"],
    budget: DEFAULT_BROWSER_BUDGET
  });
  assert.equal(Object.isFrozen(handoff), true);
  assert.equal(Object.isFrozen(handoff.budget), true);

  for (const field of ["profile", "cookies", "storageState", "token", "authorization", "purpose"]) {
    assert.throws(
      () => createBrowserHandoff({
        targetUrl: "https://example.com/docs",
        allowedOrigins: ["https://example.com"],
        budget: DEFAULT_BROWSER_BUDGET,
        [field]: "must-not-cross"
      }),
      /unknown authority-bearing field/
    );
  }
  assert.throws(
    () => createBrowserHandoff({
      targetUrl: "https://example.com/docs",
      allowedOrigins: ["https://example.com"],
      budget: { ...DEFAULT_BROWSER_BUDGET, maxCookies: 1 }
    }),
    /unknown authority-bearing field/
  );
  assert.throws(
    () => createBrowserHandoff({
      targetUrl: "https://other.example/docs",
      allowedOrigins: ["https://example.com"],
      budget: DEFAULT_BROWSER_BUDGET
    }),
    /explicit allowedOrigins/
  );

  const sessionInput = createBrowserSessionInput({
    handoff,
    purpose: "Capture reviewed public evidence"
  });
  assert.equal(sessionInput.startUrl, handoff.targetUrl);
  assert.deepEqual(sessionInput.policy.allowedOrigins, handoff.allowedOrigins);
  assert.deepEqual(sessionInput.policy.budget, handoff.budget);
  assert.equal("profile" in sessionInput, false);
  assert.equal("extraHTTPHeaders" in sessionInput, false);
  assert.equal(sessionInput.policy.allowCookieRead, false);
  assert.equal(sessionInput.policy.allowCookieWrite, false);
  assert.deepEqual(sessionInput.policy.allowedEffects, ["read"]);
});

test("crawler discovery completes before browser auth and forwards no browser state", async () => {
  const events = [];
  let crawlerInput;
  const browserCalls = [];
  const result = await runCrawlerBrowserHandoff({
    seed: "https://example.com/",
    targetUrl: "https://example.com/docs",
    allowedOrigins: ["https://example.com"],
    purpose: "Capture reviewed public evidence",
    maxPages: 4,
    browserBudget: DEFAULT_BROWSER_BUDGET,
    tokenFile: "browser-token-file",
    dryRun: false
  }, {
    async mapSite(input) {
      events.push("crawl");
      crawlerInput = structuredClone(input);
      return {
        entries: [{
          url: "https://example.com/docs",
          canonical: null,
          title: "Documentation",
          fetchedAt: "2026-07-29T00:00:00.000Z",
          contentHash: `sha256:${"a".repeat(64)}`
        }],
        failures: [],
        stats: {}
      };
    },
    async readFile(filename, encoding) {
      events.push("read-browser-token");
      assert.equal(filename, "browser-token-file");
      assert.equal(encoding, "utf8");
      return "daemon-secret\n";
    },
    async fetch(url, init) {
      events.push("browser-request");
      browserCalls.push({
        url: String(url),
        headers: { ...init.headers },
        body: JSON.parse(init.body)
      });
      if (browserCalls.length === 1) {
        return successfulJson({ id: "session-a", state: "ready" });
      }
      return successfulJson({
        url: "https://example.com/docs",
        title: "Documentation",
        capturedAt: "2026-07-29T00:00:01.000Z",
        digest: `sha256:${"b".repeat(64)}`,
        refs: [{ ref: "heading" }]
      });
    }
  });

  assert.deepEqual(events, [
    "crawl",
    "read-browser-token",
    "browser-request",
    "browser-request"
  ]);
  assert.deepEqual(Object.keys(crawlerInput).sort(), [
    "allowedOrigins",
    "maxDepth",
    "maxDurationMs",
    "maxPages",
    "maxRequests",
    "maxTotalBytes",
    "obeyRobots",
    "seeds"
  ]);
  assert.doesNotMatch(JSON.stringify(crawlerInput), FORBIDDEN_CRAWLER_AUTHORITY);
  assert.equal("browser" in crawlerInput, false);

  assert.equal(browserCalls.length, 2);
  assert.equal(browserCalls[0].url, "http://127.0.0.1:43110/v1/sessions");
  assert.equal(browserCalls[0].headers.authorization, "Bearer daemon-secret");
  assert.equal(browserCalls[0].body.startUrl, "https://example.com/docs");
  assert.deepEqual(browserCalls[0].body.policy.allowedOrigins, ["https://example.com"]);
  assert.deepEqual(browserCalls[0].body.policy.budget, DEFAULT_BROWSER_BUDGET);
  assert.doesNotMatch(JSON.stringify(browserCalls[0].body), /contentHash|fetchedAt/);
  assert.equal(
    browserCalls[1].url,
    "http://127.0.0.1:43110/v1/sessions/session-a/snapshot"
  );
  assert.equal(result.browserSnapshot.referenceCount, 1);
  assert.doesNotMatch(JSON.stringify(result), /daemon-secret|browser-token-file/);
});

test("the handoff example exposes a runnable help path without browser installation", async () => {
  const { stdout, stderr } = await exec(process.execPath, [EXAMPLE, "--help"], {
    cwd: ROOT,
    windowsHide: true
  });
  assert.equal(stderr, "");
  assert.match(stdout, /--seed https:\/\/example\.com\//);
  assert.match(stdout, /--dry-run/);
  assert.match(stdout, /--token-file/);
});

function successfulJson(value) {
  return {
    ok: true,
    status: 200,
    async json() {
      return structuredClone(value);
    }
  };
}
