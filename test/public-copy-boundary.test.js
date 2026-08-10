import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const prohibited = ["pup", "pet", "eer"].join("").toLowerCase();

test("tracked and proposed public source stays inside the product-owned naming boundary", () => {
  const files = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true
  }).split("\0").filter(Boolean);
  const findings = [];
  for (const file of files) {
    const content = readFileSync(file);
    if (content.toString("utf8").toLowerCase().includes(prohibited)) findings.push(file);
  }
  assert.deepEqual(findings, []);
});
