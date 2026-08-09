import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const reviewedPackageCommit = "62f270636a019c9bcc617a13fe254640bcd06925";
const stableVersion = "0.7.0";
const errors = [];

function git(args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch (error) {
    const detail = error?.stderr?.toString?.().trim() || error?.message || "git command failed";
    throw new Error(`stable runtime invariant cannot inspect Git history: ${detail}`);
  }
}

function requireValue(condition, message) {
  if (!condition) errors.push(message);
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function currentJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

function historicalJson(path) {
  return JSON.parse(git(["show", `${reviewedPackageCommit}:${path}`]));
}

git(["cat-file", "-e", `${reviewedPackageCommit}^{commit}`]);

const runtimePaths = [
  "bin",
  "src",
  "types",
  "schemas",
  "Dockerfile",
  "worker/worker.js",
  "worker/wrangler.jsonc",
  "bench/local-benchmark.mjs",
  "bench/public",
  "bench/results/ci-validated.json",
  "bench/results/extraction-comparison-0.7.0.json",
  "bench/results/public-conformance-0.7.0.json",
  "bench/results/wceb-core-observed-0.7.0.json",
  "bench/results/wceb-quality-development-0.7.0.json",
  "bench/results/wceb-quality-fail-closed-observed-0.7.0.json",
  "bench/results/wceb-quality-observed-0.7.0.json",
  "server.json",
  "package.json",
  "package-lock.json"
];
const approvedRuntimeMetadata = new Set([
  "package-lock.json",
  "package.json",
  "server.json",
  "src/version.js"
]);
const runtimeChanges = git([
  "diff",
  "--name-only",
  reviewedPackageCommit,
  "--",
  ...runtimePaths
]).split(/\r?\n/).filter(Boolean);
const unexpectedRuntimeChanges = runtimeChanges.filter((path) => !approvedRuntimeMetadata.has(path));
requireValue(
  unexpectedRuntimeChanges.length === 0,
  `shipped runtime, container, benchmark executable, or evidence changed since reviewed RC package commit: ${unexpectedRuntimeChanges.join(", ")}`
);

const currentPackage = await currentJson("package.json");
const historicalPackage = historicalJson("package.json");
const normalizedCurrentPackage = structuredClone(currentPackage);
const normalizedHistoricalPackage = structuredClone(historicalPackage);
delete normalizedCurrentPackage.version;
delete normalizedHistoricalPackage.version;
delete normalizedCurrentPackage.scripts;
delete normalizedHistoricalPackage.scripts;
requireValue(
  deepEqual(normalizedCurrentPackage, normalizedHistoricalPackage),
  "package metadata, files, exports, engines, or dependency declarations drifted from the reviewed RC package"
);
requireValue(currentPackage.version === stableVersion, `package.json must identify ${stableVersion}`);

const permittedScriptChanges = new Set([
  "mcp:glama:smoke",
  "release:check",
  "release:runtime-invariant",
  "test"
]);
const scriptKeys = new Set([
  ...Object.keys(currentPackage.scripts || {}),
  ...Object.keys(historicalPackage.scripts || {})
]);
const changedScripts = [...scriptKeys].filter(
  (key) => currentPackage.scripts?.[key] !== historicalPackage.scripts?.[key]
);
requireValue(
  changedScripts.every((key) => permittedScriptChanges.has(key)),
  `unapproved package script drift since reviewed RC package commit: ${changedScripts.filter((key) => !permittedScriptChanges.has(key)).join(", ")}`
);
requireValue(
  currentPackage.scripts?.["release:runtime-invariant"] === "node scripts/check-stable-runtime-invariant.mjs",
  "release:runtime-invariant must invoke the fail-closed stable runtime check"
);
requireValue(
  currentPackage.scripts?.["release:check"]?.startsWith("npm run release:runtime-invariant && npm run publication:check && npm run bench:public:verify -- --historical-source && "),
  "release:check must run runtime, publication, and historical benchmark invariants before other gates"
);

const currentLock = await currentJson("package-lock.json");
const historicalLock = historicalJson("package-lock.json");
requireValue(currentLock.version === stableVersion, `package-lock.json must identify ${stableVersion}`);
requireValue(currentLock.packages?.[""]?.version === stableVersion, `package-lock root package must identify ${stableVersion}`);
currentLock.version = historicalLock.version;
currentLock.packages[""].version = historicalLock.packages[""].version;
requireValue(
  deepEqual(currentLock, historicalLock),
  "package-lock dependency graph drifted from the reviewed RC package"
);

const currentServer = await currentJson("server.json");
const historicalServer = historicalJson("server.json");
requireValue(currentServer.version === stableVersion, `server.json must identify ${stableVersion}`);
requireValue(
  currentServer.packages?.every((entry) => entry.version === stableVersion),
  `every server.json package entry must identify ${stableVersion}`
);
currentServer.version = historicalServer.version;
for (let index = 0; index < currentServer.packages.length; index += 1) {
  currentServer.packages[index].version = historicalServer.packages[index].version;
}
requireValue(deepEqual(currentServer, historicalServer), "server.json changed beyond approved stable version metadata");

const currentRuntimeVersion = (await readFile(new URL("src/version.js", root), "utf8")).replaceAll("\r\n", "\n");
const historicalRuntimeVersion = git(["show", `${reviewedPackageCommit}:src/version.js`]).replaceAll("\r\n", "\n");
requireValue(
  currentRuntimeVersion.trimEnd() === historicalRuntimeVersion.replace("0.7.0-rc.1", stableVersion).trimEnd(),
  "src/version.js changed beyond the approved stable version literal"
);

const immutableEvidencePaths = [
  ".zenodo.json",
  "bench/public/sources.json",
  "bench/results/extraction-comparison-0.7.0.json",
  "bench/results/public-conformance-0.7.0.json",
  "bench/results/wceb-core-observed-0.7.0.json",
  "bench/results/wceb-quality-development-0.7.0.json",
  "bench/results/wceb-quality-fail-closed-observed-0.7.0.json",
  "bench/results/wceb-quality-observed-0.7.0.json",
  "docs/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.build.json",
  "docs/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.md",
  "docs/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.pdf",
  "docs/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.sha256",
  "docs/zenodo/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.metadata.json",
  "docs/zenodo/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.publication.json",
  "output/pdf/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.pdf",
  "scripts/build-crawler-whitepaper-pdf.py",
  "website/paper/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.pdf"
];
const evidenceChanges = git([
  "diff",
  "--name-only",
  reviewedPackageCommit,
  "--",
  ...immutableEvidencePaths
]).split(/\r?\n/).filter(Boolean);
requireValue(
  evidenceChanges.length === 0,
  `frozen benchmark or RC-paper evidence changed: ${evidenceChanges.join(", ")}`
);

const qualityBytes = await readFile(new URL("bench/results/wceb-quality-observed-0.7.0.json", root));
requireValue(
  sha256(qualityBytes) === "a71c884e9521d1cd1c6326dc07c1d1a5c36344244c45d4900a078ae92a8de535",
  "published observed-development benchmark digest changed"
);

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    stableVersion,
    reviewedPackageCommit,
    approvedRuntimeMetadata: [...approvedRuntimeMetadata].sort(),
    unchangedRuntimeFiles: runtimePaths,
    immutableEvidenceFiles: immutableEvidencePaths.length,
    observedQualitySha256: sha256(qualityBytes)
  }, null, 2));
}
