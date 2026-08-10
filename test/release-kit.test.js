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
  const sources = await readFile(path.join(ROOT, "docs", "SOURCES.md"), "utf8");
  const benchmark = await readFile(path.join(ROOT, "docs", "BENCHMARK.md"), "utf8");
  const release = await readFile(path.join(ROOT, "docs", "RELEASE.md"), "utf8");
  const capabilities = await readFile(path.join(ROOT, "docs", "CAPABILITIES.md"), "utf8");
  const identityGuide = await readFile(path.join(ROOT, "docs", "SELECTORS-AND-IDENTITY.md"), "utf8");

  assert.ok(manifest.files.includes("docs/FEATURES.md"));
  assert.ok(
    !manifest.files.some((entry) => entry === "assets/" || entry.startsWith("assets/")),
    "the npm package must not ship unused README or website artwork"
  );
  assert.doesNotMatch(readme, /assets\/readme-proof-still/i);
  assert.match(readme, /complete feature inventory/i);
  assert.match(readme, /npm install cockroach-crawler@0\.7\.0/);
  assert.doesNotMatch(readme, /npm install cockroach-crawler@0\.6\.[12]/);
  assert.match(sources, /npm install cockroach-crawler@0\.7\.0/);
  assert.doesNotMatch(sources, /npm install cockroach-crawler@0\.6\.[12]/);
  assert.match(features, /Eight CLIs:/);
  assert.match(features, /`cockroach-shell`/);
  assert.match(readme, /curated top-level catalog/i);
  assert.match(readme, /built-in browser mode currently applies only the declared user agent/i);
  assert.match(readme, /applicable\s+Chromium client hints/i);
  assert.match(readme, /exported `identityBrowserContext\(\)` helper/i);
  assert.match(features, /stable `0\.7\.0`/i);
  assert.match(capabilities, /browser crawling inside `crawl\(\)`\s+currently applies only the profile's declared user agent/i);
  assert.match(capabilities, /applicable\s+Chromium client hints/i);
  assert.match(capabilities, /`identityBrowserContext\(\)` helper returns optional Playwright context settings/i);
  assert.doesNotMatch(capabilities, /platform, locale, and\s+timezone headers/i);
  assert.match(identityGuide, /built-in browser\s+mode does not consume that helper today/i);
  assert.match(identityGuide, /trusted\s+Playwright caller may choose to apply/i);
  assert.doesNotMatch(identityGuide, /drives both tiers from one\s+declaration/i);
  for (const publicationCopy of [readme, benchmark, release]) {
    assert.match(publicationCopy, /90825063d447f07345388d040b1428a311109c2b/);
    assert.match(publicationCopy, /62f270636a019c9bcc617a13fe254640bcd06925/);
    assert.match(publicationCopy, /0\.7\.0/);
    assert.match(publicationCopy, /valid GitHub signature/i);
    assert.match(publicationCopy, /annotated\s+tag\s+without a cryptographic tag signature/i);
    assert.doesNotMatch(publicationCopy, /signed tag/i);
  }
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

test("the immutable stable tag retains the reviewed 0.7.0 runtime and evidence", () => {
  const git = (args, options = {}) => execFileSync("git", args, { cwd: ROOT, ...options });
  assert.equal(
    git(["rev-parse", "v0.7.0^{commit}"], { encoding: "utf8" }).trim(),
    "b80984625256821484731f29aca4d65011507628"
  );
  assert.equal(
    git(["rev-parse", "v0.7.0^{tree}"], { encoding: "utf8" }).trim(),
    "707a1b2f71a51da75aa637d26e6d2a5e03ea29b1"
  );
  const stableManifest = JSON.parse(git(["show", "v0.7.0:package.json"], { encoding: "utf8" }));
  assert.equal(stableManifest.version, "0.7.0");
  const qualityBytes = git(["show", "v0.7.0:bench/results/wceb-quality-observed-0.7.0.json"]);
  assert.equal(
    createHash("sha256").update(qualityBytes).digest("hex"),
    "a71c884e9521d1cd1c6326dc07c1d1a5c36344244c45d4900a078ae92a8de535"
  );
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
  assert.match(
    workflow,
    /- name: Check out approved commit[\s\S]*?fetch-depth:\s*0[\s\S]*?persist-credentials:\s*false/,
    "release verification must fetch immutable historical evidence before running the full gate"
  );
  assert.match(
    workflow,
    /- name: Verify published benchmark evidence\s+run: npm run bench:public:verify -- --historical-source/,
    "release publication must verify the unchanged benchmark against its immutable source commit"
  );
});

test("release workflows retry transient registry propagation and still fail closed", async () => {
  const [publishWorkflow, deployWorkflow] = await Promise.all([
    readFile(path.join(ROOT, ".github", "workflows", "publish-npm.yml"), "utf8"),
    readFile(path.join(ROOT, ".github", "workflows", "deploy-site.yml"), "utf8")
  ]);

  assert.match(publishWorkflow, /for attempt in \{1\.\.10\}/);
  assert.match(publishWorkflow, /for attempt in \{1\.\.20\}/);
  assert.match(publishWorkflow, /dist\.attestations\.provenance\.predicateType/);
  assert.match(publishWorkflow, /signatures_verified=false/);
  assert.match(publishWorkflow, /if npm audit signatures; then/);
  assert.match(publishWorkflow, /await import\('cockroach-crawler\/quality'\)/);
  assert.match(publishWorkflow, /Registry signature verification did not succeed after 20 attempts/);
  assert.match(publishWorkflow, /if \[\[ "\$\{verified\}" != "true" \]\]; then/);

  const waitIndex = deployWorkflow.indexOf("- name: Wait for the exact npm package version");
  const releaseAssetsIndex = deployWorkflow.indexOf("- name: Wait for the stable GitHub release assets");
  const buildIndex = deployWorkflow.indexOf("- name: Build");
  const deployIndex = deployWorkflow.indexOf("- name: Deploy");
  assert.ok(waitIndex >= 0 && waitIndex < releaseAssetsIndex && releaseAssetsIndex < buildIndex && buildIndex < deployIndex);
  assert.match(deployWorkflow, /- name: Require the main deployment ref[\s\S]*?"\$\{GITHUB_REF\}" != "refs\/heads\/main"/);
  assert.match(deployWorkflow, /for attempt in \{1\.\.30\}/);
  assert.match(deployWorkflow, /\[\[ "\$\{published_version\}" == "\$\{version\}" && "\$\{published_latest\}" == "\$\{version\}" \]\]/);
  assert.match(deployWorkflow, /npm view "cockroach-crawler@latest" version/);
  assert.match(deployWorkflow, /"\$\{published_latest\}" == "\$\{version\}"/);
  assert.match(deployWorkflow, /refusing to build or deploy the site/);
  assert.match(deployWorkflow, /releases\/tags\/v\$\{version\}/);
  assert.match(deployWorkflow, /release\?\.draft \|\| release\?\.prerelease/);
  assert.match(deployWorkflow, /git\/ref\/tags\/v\$\{version\}/);
  assert.match(deployWorkflow, /compare\/\$\{target_sha\}\.\.\.\$\{GITHUB_SHA\}/);
  assert.match(deployWorkflow, /\['identical', 'ahead'\]\.includes\(compare\?\.status\)/);
  assert.match(deployWorkflow, /compare\?\.base_commit\?\.sha !== targetSha/);
  assert.match(deployWorkflow, /compare\?\.head_commit\?\.sha !== process\.env\.EXPECTED_SHA/);
  assert.match(deployWorkflow, /timeout-minutes:\s*60/);
  for (const asset of ["SHA256SUMS.txt", "extraction-comparison-0.7.0.json", "wceb-quality-observed-0.7.0.json"]) {
    assert.match(deployWorkflow, new RegExp(asset.replaceAll(".", "\\.")));
  }
  assert.match(deployWorkflow, /asset\?\.state !== "uploaded"/);
  assert.match(deployWorkflow, /asset\.size <= 0/);
  assert.doesNotMatch(
    deployWorkflow,
    /^\s*(?:-\s+)?uses:\s+[^\s]+@(?![0-9a-f]{40}(?:\s|$))/m,
    "every deploy-site action must use a full commit SHA"
  );
  assert.match(deployWorkflow, /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/);
  assert.match(deployWorkflow, /persist-credentials:\s*false/);
  assert.match(deployWorkflow, /cloudflare\/wrangler-action@9acf94ace14e7dc412b076f2c5c20b8ce93c79cd/);
  assert.match(publishWorkflow, /default:\s*0\.7\.0/);
});

test("publication validation accepts Git-compatible CRLF checkouts without weakening hashes", async () => {
  const publicationCheck = await readFile(new URL("../scripts/check-publication.mjs", import.meta.url), "utf8");
  assert.match(publicationCheck, /function canonicalTextBytes\(value\)/);
  assert.match(publicationCheck, /source\.replaceAll\("\\r\\n", "\\n"\)/);
  assert.match(publicationCheck, /withoutCrLf\.includes\("\\r"\)/);
  assert.match(publicationCheck, /sha256\(canonicalTextBytes\(manuscript\)\)/);
  assert.match(publicationCheck, /sha256\(canonicalTextBytes\(builder\)\)/);
});
