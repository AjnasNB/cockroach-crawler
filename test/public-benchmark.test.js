import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("public benchmark evidence is source-pinned, packaged, and independently verifiable", async () => {
  const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const sources = JSON.parse(await readFile(path.join(root, "bench", "public", "sources.json"), "utf8"));

  assert.ok(manifest.files.includes("bench/public/"));
  assert.ok(manifest.files.includes("bench/results/wceb-test-0.6.0.json"));
  assert.ok(manifest.files.includes("bench/results/public-conformance-0.6.0.json"));
  assert.equal(sources.wceb.revision, "62ff86d12ea72c80c31fb810ff1a724fad687bea");
  assert.equal(sources.googleRobots.revision.length, 40);
  assert.equal(sources.wptUrl.revision.length, 40);
  assert.match(sources.wptUrl.sha256, /^[a-f0-9]{64}$/);

  assert.doesNotThrow(() => {
    execFileSync(process.execPath, ["bench/public/verify-results.mjs"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  });
});
