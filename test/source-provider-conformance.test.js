import assert from "node:assert/strict";
import test from "node:test";
import { runSourceProviderConformance } from "../src/source-conformance.js";
import { SourceAccessError } from "../src/sources.js";

const fixtureRecord = {
  source: "community-fixture",
  id: "fixture-1",
  type: "document",
  title: "Community adapter fixture",
  url: "https://example.com/fixture-1",
  text: "Deterministic offline content.",
  author: null,
  publishedAt: null,
  contentHash: `sha256:${"a".repeat(64)}`,
  adapterVersion: "1.0.0",
  warnings: [],
  metadata: { contract: "offline" },
  provenance: {
    retrievedAt: "2026-07-18T00:00:00.000Z",
    method: "fixture",
    authenticated: false,
    credentialed: false
  }
};

test("reusable conformance harness validates a third-party provider without importing it into core", async () => {
  const provider = {
    id: "community-fixture",
    status() {
      return {
        id: "community-fixture",
        status: "ready",
        capabilities: { search: true, read: false },
        authentication: "none",
        message: "Deterministic community fixture; no network access."
      };
    },
    async search(input) {
      if (input.signal?.aborted) throw new SourceAccessError("SOURCE_ABORTED", "Fixture request was aborted.");
      if (input.query === "deny") throw new SourceAccessError("SOURCE_DENIED", "Fixture policy denied the request.");
      return [fixtureRecord];
    }
  };
  const controller = new AbortController();
  controller.abort();
  const report = await runSourceProviderConformance({
    provider,
    secretMarkers: ["community-fixture-secret"],
    searchCase: { input: { query: "allow", maxResults: 1 } },
    errorCases: [
      {
        name: "unsupported-read",
        code: "SOURCE_CAPABILITY_UNAVAILABLE",
        run: (registry) => registry.read("community-fixture", "fixture-1")
      },
      {
        name: "deny",
        code: "SOURCE_DENIED",
        run: (registry) => registry.search("community-fixture", { query: "deny" })
      },
      {
        name: "cancellation",
        code: "SOURCE_ABORTED",
        run: (registry) => registry.search("community-fixture", { query: "allow", signal: controller.signal })
      }
    ]
  });
  assert.equal(report.passed, true);
  assert.equal(report.certification, false);
  assert.ok(report.checks.includes("search-immutability"));
  assert.ok(report.checks.includes("error:unsupported-read"));
});
