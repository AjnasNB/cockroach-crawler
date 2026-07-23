import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("the packed feature inventory stays complete and release-honest", async () => {
  const manifest = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8"));
  const readme = await readFile(path.join(ROOT, "README.md"), "utf8");
  const features = await readFile(path.join(ROOT, "docs", "FEATURES.md"), "utf8");

  assert.ok(manifest.files.includes("docs/FEATURES.md"));
  assert.match(readme, /complete feature inventory/i);
  for (const section of [
    "Public-web crawl and discovery",
    "Page extraction and output",
    "Network and SSRF boundary",
    "Optional Playwright browser rendering",
    "Built-in read-only source registry",
    "Provider routing and plug-in contracts",
    "Optional Agent-Reach-style channel layer",
    "Maqam-compatible structural browser host",
    "Restricted serverless Worker tier",
    "Verification and supply-chain features",
    "What the latest branch adds",
    "Crawl4AI parity matrix"
  ]) {
    assert.match(features, new RegExp(`^## ${section}$`, "m"), section);
  }
  assert.match(features, /Not implemented/);
  assert.match(features, /Do not\s+claim those features/);
});

test("alpha release checksums match every named release source asset", async () => {
  const attributes = await readFile(path.join(ROOT, ".gitattributes"), "utf8");
  assert.match(attributes, /^\*\.vtt text eol=lf$/m, "release captions must have canonical LF bytes");

  const manifestPath = path.join(ROOT, "media", "release-assets", "v0.3.0-alpha.1", "SHA256SUMS.txt");
  const manifest = await readFile(manifestPath, "utf8");
  const entries = manifest.trim().split(/\r?\n/).map((line) => {
    const match = /^([0-9a-f]{64}) {2}([^/\\]+)$/.exec(line);
    assert.ok(match, `Invalid checksum entry: ${line}`);
    return { expected: match[1], filename: match[2] };
  });

  assert.equal(entries.length, 27, "the alpha kit must name every reviewed release asset");
  assert.equal(new Set(entries.map(({ filename }) => filename)).size, entries.length, "release filenames must be unique");
  for (const { expected, filename } of entries) {
    const directory = filename.endsWith(".png") && !filename.includes("poster")
      ? path.join(ROOT, "media", "launch-assets", "png")
      : path.join(ROOT, "media", "remotion", "renders");
    const bytes = await readFile(path.join(directory, filename));
    const canonicalBytes = filename.endsWith(".vtt")
      ? Buffer.from(bytes.toString("utf8").replace(/\r\n?/g, "\n"), "utf8")
      : bytes;
    assert.equal(createHash("sha256").update(canonicalBytes).digest("hex"), expected, filename);
  }
});

test("trusted npm publication binds dispatch approval to the exact reviewed commit and artifact", async () => {
  const workflow = await readFile(path.join(ROOT, ".github", "workflows", "publish-npm.yml"), "utf8");
  assert.match(workflow, /expected_git_commit:/);
  assert.match(workflow, /EXPECTED_GIT_COMMIT: \$\{\{ inputs\.expected_git_commit \}\}/);
  assert.match(workflow, /\^\[0-9a-f\]\{40\}\$/);
  assert.ok(
    workflow.match(/\[\[ "\$\{EXPECTED_GIT_COMMIT\}" == "\$\{GITHUB_SHA\}" \]\]/g)?.length >= 2,
    "both verification and publication must bind the approved commit to GITHUB_SHA"
  );
  for (const input of ["expected_size_bytes", "expected_sha256", "expected_integrity"]) {
    assert.match(workflow, new RegExp(`${input}:`));
  }
});
