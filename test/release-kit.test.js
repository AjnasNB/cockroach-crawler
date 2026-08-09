import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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
  assert.ok(
    !manifest.files.some((entry) => entry === "assets/" || entry.startsWith("assets/")),
    "the npm package must not ship unused README or website artwork"
  );
  assert.doesNotMatch(readme, /assets\/readme-proof-still/i);
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
    "Advanced deep-crawl, browser, extraction, and deployment modules",
    "Verification and supply-chain features",
    "What the latest branch adds",
    "Crawl4AI parity matrix"
  ]) {
    assert.match(features, new RegExp(`^## ${section}$`, "m"), section);
  }
  for (const capability of [
    "BFS, DFS, best-first, and adaptive/relevance",
    "Hash-verified persistent JSON crawl cache",
    "Full-page PNG/JPEG screenshot",
    "Local PDF parsing",
    "Open Shadow DOM flattening",
    "Readable same-origin iframe flattening",
    "Bounded infinite/virtual-scroll",
    "Trusted operator page hooks",
    "XPath extraction",
    "Restricted regex extraction",
    "Optional host-supplied LLM extraction",
    "Explicit provider/proxy rotation",
    "optional lexical map search",
    "process-local",
    "asynchronous job queue",
    "fixed self-hosted proxy-gateway",
    "Native MCP tools",
    "Authenticated Node/Docker API"
  ]) {
    assert.match(features, new RegExp(capability.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
  assert.doesNotMatch(features, /DFS and relevance\/adaptive strategies \| Not implemented/);
});

test("MCP Registry metadata matches the packed npm package", async () => {
  const manifest = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8"));
  const server = JSON.parse(await readFile(path.join(ROOT, "server.json"), "utf8"));

  assert.equal(manifest.mcpName, "io.github.AjnasNB/cockroach-crawler");
  assert.equal(
    manifest.dependencies?.["@modelcontextprotocol/sdk"],
    undefined,
    "the native MCP server must not add the SDK HTTP stack to production installs"
  );
  assert.match(
    manifest.devDependencies?.["@modelcontextprotocol/sdk"] || "",
    /^\^1\.29\./,
    "the official SDK remains the development-only conformance client"
  );
  assert.ok(manifest.files.includes("server.json"), "server.json must ship in the npm artifact");
  assert.equal(server.name, manifest.mcpName);
  assert.equal(server.version, manifest.version);
  assert.equal(
    server.$schema,
    "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json"
  );
  assert.deepEqual(server.packages, [{
    registryType: "npm",
    identifier: manifest.name,
    version: manifest.version,
    transport: { type: "stdio" },
    environmentVariables: [{
      description: "Comma-separated HTTP(S) origins that the MCP server may crawl.",
      isRequired: true,
      format: "string",
      isSecret: false,
      name: "COCKROACH_ALLOWED_ORIGINS"
    }]
  }]);
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

test("0.6.2 maintenance publication is branch-bound, allowlisted, and manual", async () => {
  const output = execFileSync(process.execPath, ["scripts/verify-maintenance-release.mjs"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(output, /ff7000579240658bfd99f3def6df4e59e6911b28/);
  assert.match(output, /e71ee10f6fd3931b9fd6c09f8a69bf7808d4a316/);
  assert.match(output, /b9008158d90b1b050cad6ab566b44fd794f9c1dd/);

  const publish = await readFile(path.join(ROOT, ".github", "workflows", "publish-npm.yml"), "utf8");
  const ci = await readFile(path.join(ROOT, ".github", "workflows", "ci.yml"), "utf8");
  const codeql = await readFile(path.join(ROOT, ".github", "workflows", "codeql.yml"), "utf8");

  assert.match(publish, /refs\/heads\/release\/0\.6\.x/);
  assert.match(publish, /Manual dispatch only\./);
  assert.doesNotMatch(publish, /^\s+push:\s*$/m);
  assert.match(publish, /EXPECTED_VERSION\}" == "0\.6\.2"/);
  assert.match(publish, /DIST_TAG\}" == "latest"/);
  assert.match(publish, /options: \[latest\]/);
  assert.match(publish, /Expected npm latest 0\.6\.1/);
  assert.match(publish, /for attempt in \{1\.\.20\}/);
  assert.match(publish, /Registry signature verification did not succeed after 20 attempts/);
  assert.ok(
    publish.match(/node scripts\/verify-maintenance-release\.mjs/g)?.length >= 2,
    "verify and publish must both bind the maintenance tree"
  );
  assert.ok(
    publish.match(/fetch-depth: 0/g)?.length >= 2,
    "both publishing jobs need the annotated tag and full ancestry"
  );
  assert.match(ci, /branches: \[main, release\/0\.6\.x\]/);
  assert.match(
    ci,
    /name: Node \$\{\{ matrix\.node \}\}[\s\S]*?fetch-depth: 0[\s\S]*?fetch-tags: true/,
    "the Node matrix must fetch the immutable v0.6.1 tag used by maintenance tests"
  );
  assert.match(codeql, /branches: \[main, release\/0\.6\.x\]/);
});

test("maintenance metadata accepts only exact version substitutions", async () => {
  const maintenance = await import("../scripts/verify-maintenance-release.mjs");
  const current = await readFile(path.join(ROOT, "package.json"), "utf8");
  const historical = execFileSync(
    "git",
    ["show", "e71ee10f6fd3931b9fd6c09f8a69bf7808d4a316:package.json"],
    { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );

  assert.doesNotThrow(() => {
    maintenance.assertVersionOnlyMetadata("package.json", current, historical);
  });

  const dependencyDrift = current.replace('"ajv": "^8.18.0"', '"ajv": "^8.99.0"');
  assert.notEqual(dependencyDrift, current, "dependency mutation fixture must change package.json");
  assert.throws(
    () => maintenance.assertVersionOnlyMetadata("package.json", dependencyDrift, historical),
    /drifted from v0\.6\.1 outside the exact version occurrences/
  );

  const malformedVersion = current.replace('"version": "0.6.2"', '"version":"0.6.2"');
  assert.notEqual(malformedVersion, current, "version-shape mutation fixture must change package.json");
  assert.throws(
    () => maintenance.normalizeVersionMetadata("package.json", malformedVersion, "0.6.2", "0.6.1"),
    /does not have the exact 0\.6\.2 occurrence shape/
  );

  const historicalLock = execFileSync(
    "git",
    ["show", "e71ee10f6fd3931b9fd6c09f8a69bf7808d4a316:package-lock.json"],
    { cwd: ROOT, encoding: "buffer", stdio: ["ignore", "pipe", "pipe"] }
  );
  assert.deepEqual(maintenance.canonicalizeHistoricalLockSnapshot(historicalLock), historicalLock);
  const crlfLock = Buffer.from(historicalLock.toString("utf8").replaceAll("\n", "\r\n"), "utf8");
  assert.deepEqual(maintenance.canonicalizeHistoricalLockSnapshot(crlfLock), historicalLock);
  assert.throws(
    () => maintenance.canonicalizeHistoricalLockSnapshot(
      Buffer.from(historicalLock.toString("utf8").replace("\n", "\r"), "utf8")
    ),
    /contains a bare carriage return/
  );
  assert.throws(
    () => maintenance.canonicalizeHistoricalLockSnapshot(
      Buffer.from(historicalLock.toString("utf8").replace("\n", "\r\n"), "utf8")
    ),
    /mixes LF and CRLF newlines/
  );
});
