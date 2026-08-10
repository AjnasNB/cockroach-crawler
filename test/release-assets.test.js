import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseDirectory = path.join(root, "release-assets", "v0.8.0-rc.1");

test("the 0.8 prerelease assets are deterministic and checksum-complete", async () => {
  execFileSync(process.execPath, ["scripts/stage-release-assets.mjs", "--check"], { cwd: root, stdio: "pipe" });
  const expectedNames = [
    "RELEASE-NOTES.md",
    "SHA256SUMS.txt",
    "browser-automation-capabilities.schema.json",
    "browser-automation-capability-matrix.json",
    "browser-automation-real-engine-verified-actions.json",
    "release-receipt.json"
  ];
  const manifest = await readFile(path.join(releaseDirectory, "SHA256SUMS.txt"), "utf8");
  const entries = manifest.trim().split("\n").map((line) => {
    const match = /^([0-9a-f]{64}) {2}([^/\\]+)$/.exec(line);
    assert.ok(match, `invalid checksum entry: ${line}`);
    return { sha256: match[1], name: match[2] };
  });
  assert.deepEqual(entries.map(({ name }) => name).sort(), expectedNames.filter((name) => name !== "SHA256SUMS.txt").sort());
  for (const entry of entries) {
    const bytes = await readFile(path.join(releaseDirectory, entry.name));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), entry.sha256, entry.name);
  }
  const receipt = JSON.parse(await readFile(path.join(releaseDirectory, "release-receipt.json"), "utf8"));
  assert.deepEqual(receipt.capabilityAccounting, {
    catalogedActions: 102,
    catalogedCategories: 16,
    builtInHandlerActions: 60,
    trustedServiceRequiredActions: 11,
    maximumConfiguredHandlers: 71,
    explicitlyUnsupportedActions: 31,
    realEngineIntegrationVerifiedActionsPerEngine: 28,
    testedEngines: ["chromium", "firefox"]
  });
});
