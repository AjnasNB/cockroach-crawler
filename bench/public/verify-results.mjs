#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const publicDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(publicDirectory, "../..");

const historicalRelease = Object.freeze({
  version: "0.6.1",
  tagObject: "ff7000579240658bfd99f3def6df4e59e6911b28",
  commit: "e71ee10f6fd3931b9fd6c09f8a69bf7808d4a316",
  tree: "b9008158d90b1b050cad6ab566b44fd794f9c1dd"
});

const historicalLockSnapshot = "bench/public/package-lock-0.6.1.json";
const historicalLockSha256 = "6916a86bc65bb2c85692814c0f385ea9e756784a03c57f8377f21c335e9d8c8e";

function countOccurrences(text, value) {
  return text.split(value).length - 1;
}

function replaceExact(text, from, to, expected, label) {
  assert.equal(countOccurrences(text, from), expected,
    `${label} does not have the exact maintenance-version shape`);
  return text.replaceAll(from, to);
}

function canonicalizeHistoricalLockSnapshot(bytes) {
  const text = bytes.toString("utf8");
  assert.deepEqual(Buffer.from(text, "utf8"), bytes,
    `${historicalLockSnapshot} must contain valid UTF-8 bytes`);
  assert.doesNotMatch(text, /\r(?!\n)/,
    `${historicalLockSnapshot} contains a bare carriage return`);
  if (text.includes("\r\n")) {
    assert.doesNotMatch(text.replaceAll("\r\n", ""), /\n/,
      `${historicalLockSnapshot} mixes LF and CRLF newlines`);
  }
  return text.replaceAll("\r\n", "\n");
}

async function historicalInputMode() {
  const text = Object.fromEntries(await Promise.all([
    "package.json",
    "server.json",
    "src/version.js"
  ].map(async (relative) => [relative, await readFile(path.join(root, relative), "utf8")])));
  let lockIsHistoricalSnapshot = false;
  try {
    text["package-lock.json"] = await readFile(path.join(root, "package-lock.json"), "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    lockIsHistoricalSnapshot = true;
    text["package-lock.json"] = canonicalizeHistoricalLockSnapshot(
      await readFile(path.join(root, historicalLockSnapshot))
    );
  }

  const manifest = JSON.parse(text["package.json"]);
  const lock = JSON.parse(text["package-lock.json"]);
  const server = JSON.parse(text["server.json"]);
  const version = manifest.version;

  assert.ok(version === historicalRelease.version || version === "0.6.2",
    `unsupported benchmark-verifier package version: ${version}`);
  assert.equal(server.version, version);
  assert.equal(server.packages?.[0]?.version, version);
  assert.match(text["src/version.js"],
    new RegExp(`^export const PACKAGE_VERSION = "${version.replaceAll(".", "\\.")}";\\s*$`, "m"));

  const jsonToken = `"version": "${version}"`;
  assert.equal(countOccurrences(text["package.json"], jsonToken), 1);
  assert.equal(countOccurrences(text["server.json"], jsonToken), 2);
  assert.equal(countOccurrences(text["src/version.js"], `PACKAGE_VERSION = "${version}"`), 1);

  if (lockIsHistoricalSnapshot) {
    const historicalToken = `"version": "${historicalRelease.version}"`;
    assert.equal(lock.version, historicalRelease.version);
    assert.equal(lock.packages?.[""]?.version, historicalRelease.version);
    assert.equal(countOccurrences(text["package-lock.json"], historicalToken), 2,
      `${historicalLockSnapshot} does not have the exact historical-version shape`);
    assert.equal(
      createHash("sha256").update(text["package-lock.json"]).digest("hex"),
      historicalLockSha256,
      `${historicalLockSnapshot} SHA-256 does not match the immutable v0.6.1 lockfile`
    );
  } else {
    assert.equal(lock.version, version);
    assert.equal(lock.packages?.[""]?.version, version);
    assert.equal(countOccurrences(text["package-lock.json"], jsonToken), 2);
  }

  if (version === historicalRelease.version) {
    return {
      version,
      read: async (relative) => relative === "package-lock.json"
        ? text["package-lock.json"]
        : readFile(path.join(root, relative), "utf8"),
      normalize: (_relative, value) => value
    };
  }

  const historicalJsonToken = `"version": "${historicalRelease.version}"`;
  return {
    version,
    read: async (relative) => relative === "package-lock.json"
      ? text["package-lock.json"]
      : readFile(path.join(root, relative), "utf8"),
    normalize(relative, value) {
      if (relative === "package.json") {
        return replaceExact(value, jsonToken, historicalJsonToken, 1, relative);
      }
      if (relative === "package-lock.json") {
        return lockIsHistoricalSnapshot
          ? value
          : replaceExact(value, jsonToken, historicalJsonToken, 2, relative);
      }
      if (relative === "server.json") {
        return replaceExact(value, jsonToken, historicalJsonToken, 2, relative);
      }
      if (relative === "src/version.js") {
        return replaceExact(
          value,
          `PACKAGE_VERSION = "${version}"`,
          `PACKAGE_VERSION = "${historicalRelease.version}"`,
          1,
          relative
        );
      }
      return value;
    }
  };
}

const inputMode = await historicalInputMode();

async function fingerprint(inputs) {
  const hash = createHash("sha256");
  for (const relative of inputs) {
    hash.update(relative);
    hash.update("\0");
    const text = await inputMode.read(relative);
    hash.update(inputMode.normalize(relative, text).replace(/\r\n?/g, "\n"));
    hash.update("\0");
  }
  return hash.digest("hex");
}

const wceb = JSON.parse(await readFile(path.join(root, "bench/results/wceb-test-0.6.1.json"), "utf8"));
assert.equal(wceb.schemaVersion, 1);
assert.equal(wceb.benchmark, "cockroach-crawler-wceb-main-content");
assert.equal(wceb.dataset.revision, "62ff86d12ea72c80c31fb810ff1a724fad687bea");
assert.equal(wceb.dataset.split, "test");
assert.equal(wceb.package.source.normalization, "utf8-lf");
assert.equal(wceb.package.version, "0.6.1");
assert.equal(wceb.results.pages, 511);
assert.equal(wceb.pages.length, 511);
assert.equal(new Set(wceb.pages.map((page) => page.id)).size, 511);
assert.equal(
  await fingerprint(wceb.package.source.inputs),
  wceb.package.source.value,
  "WCEB result source fingerprint does not match the current extractor and evaluator."
);
for (const metric of ["precision", "recall", "f1", "requiredSnippetRecall", "unwantedSnippetInclusion"]) {
  assert.ok(Number.isFinite(wceb.results[metric]) && wceb.results[metric] >= 0 && wceb.results[metric] <= 1, metric);
}

const conformance = JSON.parse(await readFile(path.join(root, "bench/results/public-conformance-0.6.1.json"), "utf8"));
assert.equal(conformance.schemaVersion, 1);
assert.equal(conformance.benchmark, "cockroach-crawler-public-conformance");
assert.equal(conformance.package.source.normalization, "utf8-lf");
assert.equal(conformance.package.version, "0.6.1");
assert.equal(conformance.robots.cases, conformance.robots.results.length);
assert.equal(conformance.wptUrl.cases, conformance.wptUrl.results.length);
assert.equal(conformance.wptUrl.corpusSha256, "355c9f1e5f34aae66ba8adfabf3c853f5cd30ea22964ef7a53eb292e7975d81e");
assert.ok(conformance.robots.cases >= 20);
assert.equal(conformance.robots.passed, conformance.robots.cases);
assert.equal(conformance.wptUrl.cases, 101);
assert.equal(conformance.wptUrl.passed, conformance.wptUrl.cases);
assert.equal(
  await fingerprint(conformance.package.source.inputs),
  conformance.package.source.value,
  "Conformance result source fingerprint does not match the current implementation and vectors."
);

process.stdout.write(
  `Public benchmark evidence verified against ${historicalRelease.version} ` +
  `(${historicalRelease.tagObject} -> ${historicalRelease.commit} -> ${historicalRelease.tree}) ` +
  `from package ${inputMode.version}.\n`
);
