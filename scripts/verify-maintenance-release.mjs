#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RELEASE_VERSION = "0.6.2";
const BASE_TAG = "v0.6.1";
const BASE_TAG_OBJECT = "ff7000579240658bfd99f3def6df4e59e6911b28";
const BASE_COMMIT = "e71ee10f6fd3931b9fd6c09f8a69bf7808d4a316";
const BASE_TREE = "b9008158d90b1b050cad6ab566b44fd794f9c1dd";
const BASE_LOCK_SHA256 = "6916a86bc65bb2c85692814c0f385ea9e756784a03c57f8377f21c335e9d8c8e";

const ALLOWED_PATHS = new Set([
  ".github/workflows/ci.yml",
  ".github/workflows/codeql.yml",
  ".github/workflows/publish-npm.yml",
  "CHANGELOG.md",
  "README.md",
  "SECURITY.md",
  "bench/public/package-lock-0.6.1.json",
  "bench/public/verify-results.mjs",
  "docs/RELEASE.md",
  "package-lock.json",
  "package.json",
  "scripts/verify-maintenance-release.mjs",
  "server.json",
  "src/version.js",
  "test/public-benchmark.test.js",
  "test/release-kit.test.js"
]);

function git(args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function gitRaw(args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function gitBytes(args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function changedPaths() {
  const commands = [
    ["diff", "--name-only", `${BASE_COMMIT}..HEAD`],
    ["diff", "--name-only"],
    ["diff", "--cached", "--name-only"],
    ["ls-files", "--others", "--exclude-standard"]
  ];
  const paths = new Set();
  for (const args of commands) {
    for (const entry of git(args).split(/\r?\n/)) {
      if (entry) paths.add(entry.replaceAll("\\", "/"));
    }
  }
  return [...paths].sort();
}

function readJson(relative) {
  return JSON.parse(readFileSync(path.join(ROOT, relative), "utf8"));
}

function versionToken(relative, version) {
  if (["package.json", "package-lock.json", "server.json"].includes(relative)) {
    return `"version": "${version}"`;
  }
  if (relative === "src/version.js") return `PACKAGE_VERSION = "${version}"`;
  throw new Error(`unsupported version metadata path: ${relative}`);
}

function expectedOccurrences(relative) {
  if (relative === "package.json" || relative === "src/version.js") return 1;
  if (relative === "package-lock.json" || relative === "server.json") return 2;
  throw new Error(`unsupported version metadata path: ${relative}`);
}

export function normalizeVersionMetadata(relative, text, fromVersion, toVersion) {
  const from = versionToken(relative, fromVersion);
  const to = versionToken(relative, toVersion);
  const count = text.split(from).length - 1;
  assert.equal(count, expectedOccurrences(relative),
    `${relative} does not have the exact ${fromVersion} occurrence shape`);
  return text.replaceAll(from, to);
}

export function assertVersionOnlyMetadata(relative, current, historical) {
  normalizeVersionMetadata(relative, historical, "0.6.1", "0.6.1");
  const normalized = normalizeVersionMetadata(relative, current, RELEASE_VERSION, "0.6.1");
  assert.equal(
    normalized.replace(/\r\n?/g, "\n"),
    historical.replace(/\r\n?/g, "\n"),
    `${relative} drifted from v0.6.1 outside the exact version occurrences`
  );
}

export function canonicalizeHistoricalLockSnapshot(bytes) {
  const raw = Buffer.from(bytes);
  const text = raw.toString("utf8");
  assert.deepEqual(Buffer.from(text, "utf8"), raw,
    "the packaged historical lock snapshot must contain valid UTF-8 bytes");
  assert.doesNotMatch(text, /\r(?!\n)/,
    "the packaged historical lock snapshot contains a bare carriage return");
  if (text.includes("\r\n")) {
    assert.doesNotMatch(text.replaceAll("\r\n", ""), /\n/,
      "the packaged historical lock snapshot mixes LF and CRLF newlines");
  }
  return Buffer.from(text.replaceAll("\r\n", "\n"), "utf8");
}

assert.equal(git(["rev-parse", `refs/tags/${BASE_TAG}`]), BASE_TAG_OBJECT,
  "v0.6.1 must remain the reviewed annotated tag object");
assert.equal(git(["cat-file", "-t", BASE_TAG_OBJECT]), "tag",
  "v0.6.1 must remain annotated");

const tag = git(["cat-file", "-p", BASE_TAG_OBJECT]);
assert.match(tag, new RegExp(`^object ${BASE_COMMIT}$`, "m"));
assert.match(tag, /^type commit$/m);
assert.match(tag, new RegExp(`^tag ${BASE_TAG}$`, "m"));
assert.equal(git(["rev-list", "-n", "1", BASE_TAG]), BASE_COMMIT,
  "v0.6.1 must peel to the reviewed release commit");
assert.equal(git(["show", "-s", "--format=%T", BASE_COMMIT]), BASE_TREE,
  "the reviewed v0.6.1 source tree changed");

execFileSync("git", ["merge-base", "--is-ancestor", BASE_COMMIT, "HEAD"], {
  cwd: ROOT,
  stdio: "ignore"
});

const manifest = readJson("package.json");
const lock = readJson("package-lock.json");
const server = readJson("server.json");
const runtimeVersion = readFileSync(path.join(ROOT, "src/version.js"), "utf8");

assert.equal(manifest.version, RELEASE_VERSION);
assert.equal(lock.version, RELEASE_VERSION);
assert.equal(lock.packages?.[""]?.version, RELEASE_VERSION);
assert.equal(server.version, RELEASE_VERSION);
assert.equal(server.packages?.[0]?.version, RELEASE_VERSION);
assert.match(runtimeVersion, /^export const PACKAGE_VERSION = "0\.6\.2";\s*$/m);

for (const relative of [
  "package.json",
  "package-lock.json",
  "server.json",
  "src/version.js"
]) {
  assertVersionOnlyMetadata(
    relative,
    readFileSync(path.join(ROOT, relative), "utf8"),
    gitRaw(["show", `${BASE_COMMIT}:${relative}`])
  );
}

const historicalLockBytes = gitBytes(["show", `${BASE_COMMIT}:package-lock.json`]);
assert.equal(
  createHash("sha256").update(historicalLockBytes).digest("hex"),
  BASE_LOCK_SHA256,
  "the immutable v0.6.1 lockfile no longer has the reviewed LF byte hash"
);
assert.deepEqual(
  canonicalizeHistoricalLockSnapshot(
    readFileSync(path.join(ROOT, "bench/public/package-lock-0.6.1.json"))
  ),
  historicalLockBytes,
  "the packaged historical lock snapshot must be byte-identical to the immutable v0.6.1 lockfile"
);

const changes = changedPaths();
assert.ok(changes.length > 0, "maintenance release must contain an allowlisted diff");
const forbidden = changes.filter((entry) => !ALLOWED_PATHS.has(entry));
assert.deepEqual(forbidden, [],
  `0.6.2 changes files outside the maintenance allowlist: ${forbidden.join(", ")}`);

for (const required of [
  "package.json",
  "package-lock.json",
  "server.json",
  "src/version.js"
]) {
  assert.ok(changes.includes(required), `maintenance version metadata is missing ${required}`);
}

process.stdout.write(
  `Maintenance release verified: ${BASE_TAG_OBJECT} -> ${BASE_COMMIT} -> ${BASE_TREE}; ` +
  `${changes.length} allowlisted paths; runtime source unchanged outside src/version.js.\n`
);
