import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const stableVersion = "0.7.0";
const candidateVersion = "0.8.0-rc.1";
const stableCommit = "b80984625256821484731f29aca4d65011507628";
const stableTree = "707a1b2f71a51da75aa637d26e6d2a5e03ea29b1";
const observedQualitySha256 = "a71c884e9521d1cd1c6326dc07c1d1a5c36344244c45d4900a078ae92a8de535";
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
    throw new Error(`release runtime invariant cannot inspect Git history: ${detail}`);
  }
}

function requireValue(condition, message) {
  if (!condition) errors.push(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function json(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

const packageJson = await json("package.json");

if (packageJson.version === stableVersion) {
  execFileSync(process.execPath, [fileURLToPath(new URL("./check-stable-runtime-invariant.mjs", import.meta.url))], {
    cwd: root,
    stdio: "inherit"
  });
  process.exit(0);
}

requireValue(
  packageJson.version === candidateVersion,
  `release runtime invariant supports only ${stableVersion} and ${candidateVersion}; found ${packageJson.version}`
);

requireValue(git(["rev-parse", "v0.7.0^{commit}"]) === stableCommit, "immutable v0.7.0 commit changed");
requireValue(git(["rev-parse", "v0.7.0^{tree}"]) === stableTree, "immutable v0.7.0 tree changed");

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
const evidenceChanges = git(["diff", "--name-only", "v0.7.0", "--", ...immutableEvidencePaths])
  .split(/\r?\n/)
  .filter(Boolean);
requireValue(evidenceChanges.length === 0, `frozen 0.7 benchmark or paper evidence changed: ${evidenceChanges.join(", ")}`);

const packageLock = await json("package-lock.json");
const server = await json("server.json");
const runtimeVersion = (await readFile(new URL("src/version.js", root), "utf8")).replaceAll("\r\n", "\n");
requireValue(packageLock.version === candidateVersion, `package-lock.json must identify ${candidateVersion}`);
requireValue(packageLock.packages?.[""]?.version === candidateVersion, `package-lock root package must identify ${candidateVersion}`);
requireValue(server.version === candidateVersion, `server.json must identify ${candidateVersion}`);
requireValue(server.packages?.every((entry) => entry.version === candidateVersion), `every server.json package entry must identify ${candidateVersion}`);
requireValue(runtimeVersion.includes(`PACKAGE_VERSION = "${candidateVersion}"`), `src/version.js must identify ${candidateVersion}`);

const qualityBytes = await readFile(new URL("bench/results/wceb-quality-observed-0.7.0.json", root));
requireValue(sha256(qualityBytes) === observedQualitySha256, "published observed-development benchmark digest changed");

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    candidateVersion,
    preservedStableVersion: stableVersion,
    stableCommit,
    stableTree,
    immutableEvidenceFiles: immutableEvidencePaths.length,
    observedQualitySha256
  }, null, 2));
}
