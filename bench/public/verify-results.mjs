#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const publicDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(publicDirectory, "../..");

async function fingerprint(inputs) {
  const hash = createHash("sha256");
  for (const relative of inputs) {
    hash.update(relative);
    hash.update("\0");
    const text = await readFile(path.join(root, relative), "utf8");
    hash.update(text.replace(/\r\n?/g, "\n"));
    hash.update("\0");
  }
  return hash.digest("hex");
}

const wceb = JSON.parse(await readFile(path.join(root, "bench/results/wceb-test-0.6.0.json"), "utf8"));
assert.equal(wceb.schemaVersion, 1);
assert.equal(wceb.benchmark, "cockroach-crawler-wceb-main-content");
assert.equal(wceb.dataset.revision, "62ff86d12ea72c80c31fb810ff1a724fad687bea");
assert.equal(wceb.dataset.split, "test");
assert.equal(wceb.package.source.normalization, "utf8-lf");
assert.equal(wceb.package.version, "0.6.0");
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

const conformance = JSON.parse(await readFile(path.join(root, "bench/results/public-conformance-0.6.0.json"), "utf8"));
assert.equal(conformance.schemaVersion, 1);
assert.equal(conformance.benchmark, "cockroach-crawler-public-conformance");
assert.equal(conformance.package.source.normalization, "utf8-lf");
assert.equal(conformance.package.version, "0.6.0");
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

process.stdout.write("Public benchmark evidence verified.\n");
