#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const publicDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(publicDirectory, "../..");
const version = "0.7.0";
const revision = "62ff86d12ea72c80c31fb810ff1a724fad687bea";
const historicalEvidence = Object.freeze({
  commit: "90825063d447f07345388d040b1428a311109c2b",
  tree: "167311df2a0b4ad20005c441d60d1e435e64a781"
});
const resultFiles = Object.freeze({
  coreObserved: "wceb-core-observed-0.7.0.json",
  qualityDevelopment: "wceb-quality-development-0.7.0.json",
  qualityObserved: "wceb-quality-observed-0.7.0.json",
  qualityFailClosedObserved: "wceb-quality-fail-closed-observed-0.7.0.json",
  comparison: "extraction-comparison-0.7.0.json",
  conformance: "public-conformance-0.7.0.json"
});

function parseArguments(argv) {
  let resultsDirectory = path.join(root, "bench/results");
  let sourceMode = "current";
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--historical-source") {
      sourceMode = "historical";
    } else if (argument === "--results-dir") {
      const value = argv[++index] || "";
      if (!value) throw new TypeError("--results-dir requires a path.");
      resultsDirectory = path.resolve(value);
    } else {
      throw new TypeError(`Unknown argument: ${argument}`);
    }
  }
  return { resultsDirectory, sourceMode };
}

function assertSafeSourcePath(relative) {
  assert.equal(typeof relative, "string", "Source fingerprint paths must be strings.");
  assert.match(relative, /^[A-Za-z0-9][A-Za-z0-9._/-]*$/u, `Unsafe source path: ${relative}`);
  assert.equal(path.posix.normalize(relative), relative, `Non-canonical source path: ${relative}`);
}

function appendFingerprintInput(hash, relative, text) {
  hash.update(relative);
  hash.update("\0");
  hash.update(text.replace(/\r\n?/gu, "\n"));
  hash.update("\0");
}

async function currentSourceFingerprint(inputs) {
  const hash = createHash("sha256");
  for (const relative of inputs) {
    assertSafeSourcePath(relative);
    const text = await readFile(path.join(root, relative), "utf8");
    appendFingerprintInput(hash, relative, text);
  }
  return hash.digest("hex");
}

function gitBuffer(args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });
  } catch (error) {
    const detail = error?.stderr?.toString("utf8").trim() || error?.message || "unknown Git error";
    throw new Error(
      `Historical source commit ${historicalEvidence.commit} is unavailable; `
      + `verify from a full Git checkout. ${detail}`
    );
  }
}

function gitText(args) {
  return gitBuffer(args).toString("utf8").trim();
}

function assertHistoricalCommit() {
  assert.equal(
    gitText(["rev-parse", `${historicalEvidence.commit}^{commit}`]),
    historicalEvidence.commit,
    "Historical evidence commit identity drifted."
  );
  assert.equal(
    gitText(["rev-parse", `${historicalEvidence.commit}^{tree}`]),
    historicalEvidence.tree,
    "Historical evidence tree identity drifted."
  );
  gitBuffer(["merge-base", "--is-ancestor", historicalEvidence.commit, "HEAD"]);
}

function historicalSourceFingerprint(inputs) {
  const hash = createHash("sha256");
  for (const relative of inputs) {
    assertSafeSourcePath(relative);
    const text = gitBuffer(["show", `${historicalEvidence.commit}:${relative}`]).toString("utf8");
    appendFingerprintInput(hash, relative, text);
  }
  return hash.digest("hex");
}

function gitBlobId(bytes) {
  return createHash("sha1")
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
}

async function assertSourceBinding(directory, filename, source, sourceMode) {
  if (sourceMode === "current") {
    assert.equal(
      await currentSourceFingerprint(source.inputs),
      source.value,
      `${filename} source fingerprint does not match current implementation.`
    );
    return;
  }

  assertHistoricalCommit();
  const artifactPath = `bench/results/${filename}`;
  const historicalBlob = gitText(["rev-parse", `${historicalEvidence.commit}:${artifactPath}`]);
  const artifactText = await readFile(path.join(directory, filename), "utf8");
  const canonicalArtifactBytes = Buffer.from(artifactText.replace(/\r\n?/gu, "\n"), "utf8");
  assert.equal(
    gitBlobId(canonicalArtifactBytes),
    historicalBlob,
    `${filename} canonical UTF-8/LF bytes do not match the immutable historical artifact.`
  );
  assert.equal(
    historicalSourceFingerprint(source.inputs),
    source.value,
    `${filename} source fingerprint does not match immutable historical source commit ${historicalEvidence.commit}.`
  );
}

function assertUnit(value, label) {
  assert.ok(Number.isFinite(value) && value >= 0 && value <= 1, label);
}

function assertMetrics(actual, expected, label) {
  for (const [metric, value] of Object.entries(expected)) {
    assert.equal(actual[metric], value, `${label} ${metric} drifted.`);
    assertUnit(actual[metric], `${label} ${metric}`);
  }
}

function roundedAverage(rows, key) {
  return Number((rows.reduce((total, row) => total + row[key], 0) / rows.length).toFixed(6));
}

function recomputedMetrics(rows) {
  return Object.fromEntries([
    "precision",
    "recall",
    "f1",
    "requiredSnippetRecall",
    "unwantedSnippetInclusion"
  ].map((metric) => [metric, roundedAverage(rows, metric)]));
}

async function readResult(directory, filename) {
  return JSON.parse(await readFile(path.join(directory, filename), "utf8"));
}

async function verifyWceb(directory, filename, expected, sourceMode) {
  const artifact = await readResult(directory, filename);
  assert.equal(artifact.schemaVersion, 1);
  assert.equal(artifact.benchmark, "cockroach-crawler-wceb-main-content");
  assert.equal(artifact.dataset.revision, revision);
  assert.equal(artifact.dataset.split, expected.split);
  assert.equal(artifact.dataset.upstreamSplitName, expected.split);
  assert.equal(artifact.package.version, version);
  assert.equal(artifact.package.source.normalization, "utf8-lf");
  assert.equal(artifact.scope.confirmatoryEligible, false);
  assert.match(artifact.scope.evaluationStatus, /development-evidence/u);
  assert.equal(artifact.configuration.engine, expected.engine);
  assert.equal(artifact.configuration.boilerplate, expected.boilerplate);
  assert.equal(artifact.configuration.qualityProfile, expected.qualityProfile);
  assert.equal(artifact.configuration.failClosed, expected.failClosed);
  assert.equal(artifact.results.pages, expected.pages);
  assert.equal(artifact.results.accepted, expected.accepted);
  assert.equal(artifact.results.abstained, expected.abstained);
  assert.equal(artifact.pages.length, expected.pages);
  assert.equal(new Set(artifact.pages.map((page) => page.id)).size, expected.pages);
  for (const page of artifact.pages) {
    assert.match(page.id, /^\d+$/u);
    for (const metric of [
      "precision",
      "recall",
      "f1",
      "requiredSnippetRecall",
      "unwantedSnippetInclusion"
    ]) assertUnit(page[metric], `${filename} ${page.id} ${metric}`);
  }
  assert.equal(
    artifact.pages.filter((page) => page.extractionStatus === "abstained").length,
    expected.abstained
  );
  assertMetrics(artifact.results, expected.metrics, filename);
  assertMetrics(recomputedMetrics(artifact.pages), expected.metrics, `${filename} page rows`);
  assert.ok(
    artifact.package.source.inputs.includes("src/boilerplate.js")
      && artifact.package.source.inputs.includes("bench/public/wceb-integrity.mjs"),
    "WCEB fingerprint must cover the core implementation and checkout-integrity gate."
  );
  if (expected.engine === "quality") {
    assert.ok(
      artifact.package.source.inputs.includes("src/quality.js")
        && artifact.package.source.inputs.includes("types/quality.d.ts"),
      "WCEB fingerprint must cover the quality implementation and declaration."
    );
  }
  await assertSourceBinding(directory, filename, artifact.package.source, sourceMode);
  return artifact;
}

const { resultsDirectory, sourceMode } = parseArguments(process.argv.slice(2));

const coreObserved = await verifyWceb(resultsDirectory, resultFiles.coreObserved, {
  split: "test",
  engine: "core",
  boilerplate: "structural",
  qualityProfile: null,
  failClosed: false,
  pages: 511,
  accepted: 511,
  abstained: 0,
  metrics: {
    precision: 0.793763,
    recall: 0.873844,
    f1: 0.7915,
    requiredSnippetRecall: 0.835584,
    unwantedSnippetInclusion: 0.178735
  }
}, sourceMode);

const qualityDevelopment = await verifyWceb(resultsDirectory, resultFiles.qualityDevelopment, {
  split: "dev",
  engine: "quality",
  boilerplate: null,
  qualityProfile: "balanced",
  failClosed: false,
  pages: 1497,
  accepted: 1497,
  abstained: 0,
  metrics: {
    precision: 0.852784,
    recall: 0.896259,
    f1: 0.847064,
    requiredSnippetRecall: 0.755867,
    unwantedSnippetInclusion: 0.096181
  }
}, sourceMode);

const qualityObserved = await verifyWceb(resultsDirectory, resultFiles.qualityObserved, {
  split: "test",
  engine: "quality",
  boilerplate: null,
  qualityProfile: "balanced",
  failClosed: false,
  pages: 511,
  accepted: 511,
  abstained: 0,
  metrics: {
    precision: 0.894101,
    recall: 0.926022,
    f1: 0.890524,
    requiredSnippetRecall: 0.86409,
    unwantedSnippetInclusion: 0.111383
  }
}, sourceMode);

const qualityFailClosedObserved = await verifyWceb(
  resultsDirectory,
  resultFiles.qualityFailClosedObserved,
  {
    split: "test",
    engine: "quality",
    boilerplate: null,
    qualityProfile: "balanced",
    failClosed: true,
    pages: 511,
    accepted: 468,
    abstained: 43,
    metrics: {
      precision: 0.847901,
      recall: 0.87508,
      f1: 0.844935,
      requiredSnippetRecall: 0.812035,
      unwantedSnippetInclusion: 0.104207
    }
  },
  sourceMode
);

assert.ok(qualityDevelopment.results.precision > coreObserved.results.precision);
assert.ok(qualityDevelopment.results.recall > coreObserved.results.recall);
assert.ok(qualityDevelopment.results.f1 > coreObserved.results.f1);
assert.ok(qualityObserved.results.precision < 0.9, "Observed precision must not be rounded into a 0.90 claim.");
assert.ok(qualityFailClosedObserved.results.abstained > 0);

const comparison = await readResult(resultsDirectory, resultFiles.comparison);
assert.equal(comparison.schemaVersion, 1);
assert.equal(comparison.benchmark, "cockroach-crawler-extraction-comparison");
assert.equal(comparison.dataset.revision, revision);
assert.equal(comparison.dataset.split, "test");
assert.equal(comparison.dataset.pages, 511);
assert.equal(comparison.package.version, version);
assert.equal(comparison.scope.confirmatoryEligible, false);
assert.equal(comparison.configuration.coreBoilerplate, "structural");
assert.equal(comparison.configuration.qualityProfile, "balanced");
assert.equal(comparison.configuration.qualityFailClosed, false);
assert.deepEqual(comparison.tools, [
  "cockroach-crawler-core",
  "cockroach-crawler-quality",
  "readability",
  "trafilatura"
]);
assert.deepEqual(comparison.missingBaselineOutputs, { readability: 0, trafilatura: 0 });
assert.equal(comparison.baselineManifest.schemaVersion, 1);
assert.equal(comparison.baselineManifest.datasetRevision, revision);
assert.equal(comparison.baselineManifest.pages, 511);
assert.deepEqual(comparison.baselineManifest.dependencies, {
  certifi: "2026.7.22",
  chardet: "7.5.1",
  "charset-normalizer": "3.4.9",
  courlan: "1.4.0",
  cssselect: "1.5.0",
  htmldate: "1.10.0",
  jusText: "3.0.2",
  lxml: "6.1.1",
  "readability-lxml": "0.8.4.1",
  trafilatura: "2.2.0"
});
assert.equal(comparison.baselineManifest.python, "3.10.0");
assert.deepEqual(comparison.baselineManifest.failures, { readability: 0, trafilatura: 0 });
assert.deepEqual(comparison.baselineManifest.outputSha256, {
  readability: "7da5cd8c7a6923f0071db0528b40ed448d1629c9576017ddd174ef8b3e2a1e7e",
  trafilatura: "ac538f754a3f29862af32a6e599ce17c8136cfeaef4011afd45d441e85d958b6"
});
const comparisonExpected = {
  "cockroach-crawler-core": {
    precision: 0.793763,
    recall: 0.873844,
    f1: 0.7915,
    requiredSnippetRecall: 0.835584,
    unwantedSnippetInclusion: 0.178735
  },
  "cockroach-crawler-quality": {
    precision: 0.894101,
    recall: 0.926022,
    f1: 0.890524,
    requiredSnippetRecall: 0.86409,
    unwantedSnippetInclusion: 0.111383
  },
  readability: {
    precision: 0.869408,
    recall: 0.626326,
    f1: 0.656537,
    requiredSnippetRecall: 0.550359,
    unwantedSnippetInclusion: 0.051696
  },
  trafilatura: {
    precision: 0.890108,
    recall: 0.868258,
    f1: 0.860042,
    requiredSnippetRecall: 0.796641,
    unwantedSnippetInclusion: 0.082355
  }
};
for (const tool of comparison.tools) {
  assert.equal(comparison.summaries[tool].pages, 511);
  assert.equal(comparison.pages[tool].length, 511);
  assert.equal(new Set(comparison.pages[tool].map((page) => page.id)).size, 511);
  assertMetrics(comparison.summaries[tool], comparisonExpected[tool], `${tool} comparison`);
  assertMetrics(recomputedMetrics(comparison.pages[tool]), comparisonExpected[tool], `${tool} rows`);
}
assert.ok(
  comparison.package.source.inputs.includes("src/boilerplate.js")
    && comparison.package.source.inputs.includes("src/quality.js")
    && comparison.package.source.inputs.includes("bench/public/wceb-integrity.mjs")
    && comparison.package.source.inputs.includes("bench/public/baselines/requirements.lock.txt"),
  "Comparison fingerprint must cover both extractors, checkout integrity, and the exact baseline environment."
);
await assertSourceBinding(
  resultsDirectory,
  resultFiles.comparison,
  comparison.package.source,
  sourceMode
);

const conformance = await readResult(resultsDirectory, resultFiles.conformance);
assert.equal(conformance.schemaVersion, 1);
assert.equal(conformance.benchmark, "cockroach-crawler-public-conformance");
assert.equal(conformance.package.source.normalization, "utf8-lf");
assert.equal(conformance.package.version, version);
assert.equal(conformance.robots.cases, conformance.robots.results.length);
assert.equal(conformance.wptUrl.cases, conformance.wptUrl.results.length);
assert.equal(conformance.wptUrl.corpusSha256, "355c9f1e5f34aae66ba8adfabf3c853f5cd30ea22964ef7a53eb292e7975d81e");
assert.ok(conformance.robots.cases >= 20);
assert.equal(conformance.robots.passed, conformance.robots.cases);
assert.equal(conformance.wptUrl.cases, 101);
assert.equal(conformance.wptUrl.passed, conformance.wptUrl.cases);
await assertSourceBinding(
  resultsDirectory,
  resultFiles.conformance,
  conformance.package.source,
  sourceMode
);

process.stdout.write(sourceMode === "historical"
  ? `Cockroach Crawler 0.7.0 public benchmark evidence verified as immutable historical evidence from ${historicalEvidence.commit} (${historicalEvidence.tree}); current source was not asserted.\n`
  : "Cockroach Crawler 0.7.0 public benchmark evidence verified against current source.\n");
