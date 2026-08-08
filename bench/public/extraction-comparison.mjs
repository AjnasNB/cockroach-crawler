#!/usr/bin/env node
// Scores Cockroach Crawler and any number of baseline tools on the pinned WCEB
// corpus using one metric implementation, so the numbers are comparable.
//
// Baseline outputs come from bench/public/baselines/extract_baselines.py, which
// runs in a separate process. This script never invokes another extractor: it
// only scores plain-text files it is handed. A comparison whose author also
// controls how the opposing tool is invoked is not worth much, so the two
// halves stay separable and can be run separately.
//
//   python bench/public/baselines/extract_baselines.py --dataset <wceb> --out <dir>
//   node bench/public/extraction-comparison.mjs --dataset <wceb> --baselines <dir>

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGunzip } from "node:zlib";

import { extractPage } from "../../src/index.js";
import { extractPageQuality } from "../../src/quality.js";
import { assertWcebCheckout } from "./wceb-integrity.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const expectedRevision = "62ff86d12ea72c80c31fb810ff1a724fad687bea";
const boilerplateProfiles = new Set(["off", "structural", "balanced", "aggressive"]);

function parseArguments(argv) {
  const options = {
    dataset: process.env.WCEB_DIR || "",
    baselines: "",
    split: "test",
    output: "",
    boilerplate: "structural"
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--dataset") options.dataset = argv[++index] || "";
    else if (argument === "--baselines") options.baselines = argv[++index] || "";
    else if (argument === "--split") options.split = argv[++index] || "";
    else if (argument === "--output") options.output = argv[++index] || "";
    else if (argument === "--boilerplate") options.boilerplate = argv[++index] || "";
    else throw new TypeError(`Unknown argument '${argument}'.`);
  }
  if (!options.dataset) throw new TypeError("Pass --dataset <WCEB v1.0 checkout> or set WCEB_DIR.");
  if (!["dev", "test"].includes(options.split)) throw new TypeError("--split must be dev or test.");
  if (!boilerplateProfiles.has(options.boilerplate)) {
    throw new TypeError(`--boilerplate must be one of: ${[...boilerplateProfiles].join(", ")}.`);
  }
  return {
    dataset: path.resolve(options.dataset),
    baselines: options.baselines ? path.resolve(options.baselines) : "",
    split: options.split,
    output: options.output ? path.resolve(root, options.output) : "",
    boilerplate: options.boilerplate
  };
}

async function gunzipUtf8(file) {
  const chunks = [];
  for await (const chunk of createReadStream(file).pipe(createGunzip())) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

// Identical to wceb-benchmark.mjs. Every tool is scored by this one function.
function tokenize(value) {
  return String(value || "").toLocaleLowerCase("und").match(/[\p{L}\p{N}_]+/gu) || [];
}

function tokenCounts(tokens) {
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
  return counts;
}

function wordMetrics(predicted, reference) {
  const prediction = tokenize(predicted);
  const truth = tokenize(reference);
  if (!truth.length) return prediction.length ? { precision: 0, recall: 0, f1: 0 } : { precision: 1, recall: 1, f1: 1 };
  if (!prediction.length) return { precision: 0, recall: 0, f1: 0 };
  const predictedCounts = tokenCounts(prediction);
  const truthCounts = tokenCounts(truth);
  let overlap = 0;
  for (const [token, count] of predictedCounts) {
    overlap += Math.min(count, truthCounts.get(token) || 0);
  }
  const precision = overlap / prediction.length;
  const recall = overlap / truth.length;
  return {
    precision,
    recall,
    f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0
  };
}

function snippetRate(text, snippets) {
  if (!snippets.length) return 1;
  const normalized = String(text || "").toLocaleLowerCase("und");
  return snippets.filter((entry) => normalized.includes(String(entry).toLocaleLowerCase("und"))).length / snippets.length;
}

function round(value) {
  return Number(value.toFixed(6));
}

function average(rows, key) {
  return rows.length ? rows.reduce((total, row) => total + row[key], 0) / rows.length : 0;
}

async function fingerprint(inputs) {
  const hash = createHash("sha256");
  for (const relative of inputs) {
    hash.update(relative);
    hash.update("\0");
    hash.update((await readFile(path.join(root, relative), "utf8")).replace(/\r\n/g, "\n"));
    hash.update("\0");
  }
  return hash.digest("hex");
}

const options = parseArguments(process.argv.slice(2));

const revision = assertWcebCheckout({
  dataset: options.dataset,
  split: options.split,
  expectedRevision,
  output: options.output
});

const groundTruthDirectory = path.join(options.dataset, options.split, "ground-truth");
const htmlDirectory = path.join(options.dataset, options.split, "html");

const baselineNames = options.baselines
  ? (await readdir(options.baselines, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "en"))
  : [];
const baselineManifest = options.baselines
  ? JSON.parse(await readFile(path.join(options.baselines, "_manifest.json"), "utf8"))
  : null;

const files = (await readdir(groundTruthDirectory))
  .filter((filename) => filename.endsWith(".json"))
  .sort((left, right) => left.localeCompare(right, "en"));

if (baselineManifest) {
  if (baselineManifest.schemaVersion !== 1
      || baselineManifest.datasetRevision !== revision
      || baselineManifest.split !== options.split
      || baselineManifest.pages !== files.length) {
    throw new Error("Baseline manifest does not match the pinned WCEB dataset and split.");
  }
  if (JSON.stringify([...baselineManifest.tools].sort()) !== JSON.stringify(baselineNames)) {
    throw new Error("Baseline manifest tools do not match the supplied output directories.");
  }
}

const tools = ["cockroach-crawler-core", "cockroach-crawler-quality", ...baselineNames];
const rows = new Map(tools.map((tool) => [tool, []]));
const missing = new Map(baselineNames.map((tool) => [tool, 0]));
const baselineDigests = new Map(baselineNames.map((tool) => [tool, createHash("sha256")]));

for (const filename of files) {
  const id = path.basename(filename, ".json");
  const record = JSON.parse(await readFile(path.join(groundTruthDirectory, filename), "utf8"));
  const truth = record.ground_truth || {};
  const reference = truth.main_content || "";
  const pageTypeValue = record._internal?.page_type;
  const rawPageType = typeof pageTypeValue === "string" ? pageTypeValue : pageTypeValue?.primary || "article";
  const pageType = rawPageType === "category" ? "collection" : rawPageType;

  const html = await gunzipUtf8(path.join(htmlDirectory, `${id}.html.gz`));

  const outputs = new Map();
  outputs.set("cockroach-crawler-core", extractPage(html, record.url, {
    maxLinksPerPage: 20_000,
    boilerplate: options.boilerplate
  }).text);
  const sourceUrl = typeof record.url === "string" && record.url.trim() ? record.url : undefined;
  outputs.set("cockroach-crawler-quality", extractPageQuality(html, {
    ...(sourceUrl ? { url: sourceUrl } : {}),
    profile: "balanced"
  }).text || "");
  for (const tool of baselineNames) {
    let text = "";
    try {
      text = await readFile(path.join(options.baselines, tool, `${id}.txt`), "utf8");
    } catch {
      missing.set(tool, missing.get(tool) + 1);
    }
    baselineDigests.get(tool).update(id, "utf8");
    baselineDigests.get(tool).update("\0", "utf8");
    baselineDigests.get(tool).update(text.replace(/\r\n?/gu, "\n"), "utf8");
    baselineDigests.get(tool).update("\0", "utf8");
    outputs.set(tool, text);
  }

  for (const tool of tools) {
    const extracted = outputs.get(tool);
    const metrics = wordMetrics(extracted, reference);
    rows.get(tool).push({
      id,
      pageType,
      precision: round(metrics.precision),
      recall: round(metrics.recall),
      f1: round(metrics.f1),
      requiredSnippetRecall: round(snippetRate(extracted, truth.with || [])),
      unwantedSnippetInclusion: round(snippetRate(extracted, truth.without || [])),
      extractedCharacters: extracted.length
    });
  }
}

if (baselineManifest) {
  for (const tool of baselineNames) {
    const observed = baselineDigests.get(tool).digest("hex");
    if (baselineManifest.outputSha256?.[tool] !== observed) {
      throw new Error(`Baseline output digest mismatch for ${tool}.`);
    }
  }
}

const pageTypes = [...new Set(rows.get("cockroach-crawler-core").map((row) => row.pageType))].sort();

function summarize(list) {
  const byPageType = {};
  for (const pageType of pageTypes) {
    const selected = list.filter((row) => row.pageType === pageType);
    if (!selected.length) continue;
    byPageType[pageType] = {
      pages: selected.length,
      precision: round(average(selected, "precision")),
      recall: round(average(selected, "recall")),
      f1: round(average(selected, "f1"))
    };
  }
  return {
    pages: list.length,
    precision: round(average(list, "precision")),
    recall: round(average(list, "recall")),
    f1: round(average(list, "f1")),
    requiredSnippetRecall: round(average(list, "requiredSnippetRecall")),
    unwantedSnippetInclusion: round(average(list, "unwantedSnippetInclusion")),
    byPageType
  };
}

const summaries = Object.fromEntries(tools.map((tool) => [tool, summarize(rows.get(tool))]));

const result = {
  schemaVersion: 1,
  benchmark: "cockroach-crawler-extraction-comparison",
  scope: {
    description:
      "Main-content extraction quality for Cockroach Crawler and separately generated baseline outputs, all scored by the same metric implementation on the pinned WCEB split.",
    metric:
      "Macro average of page-level Unicode word precision, recall, and F1. Snippet rates use case-insensitive literal inclusion.",
    intendedClaims: [
      "relative main-content extraction quality on the pinned WCEB split under one scorer"
    ],
    excludedClaims: [
      "extraction quality on any corpus other than this split",
      "speed, memory, or throughput",
      "quality of any capability other than main-content text extraction",
      "that the baseline tools were tuned or configured optimally"
    ],
    baselineNote:
      "Baseline outputs are generated in a separate Python process by bench/public/baselines/extract_baselines.py, then evaluated by this same published scorer in an exact recorded dependency environment. This is not third-party independent validation. A tool configured differently may score differently; the extraction script and output manifest are published so that can be checked and disputed.",
    evaluationStatus: options.split === "test"
      ? "observed-development-evidence-after-project-iteration"
      : "development-evidence",
    confirmatoryEligible: false,
    interpretation:
      "The upstream split name is preserved, but this project previously inspected and iterated against the 511-page test split. This comparison is not fresh confirmatory evidence."
  },
  dataset: {
    name: "Web Content Extraction Benchmark",
    revision,
    split: options.split,
    pages: files.length
  },
  package: {
    name: "cockroach-crawler",
    version: JSON.parse(await readFile(path.join(root, "package.json"), "utf8")).version,
    source: {
      algorithm: "sha256",
      normalization: "utf8-lf",
      inputs: [
        "src/index.js",
        "src/boilerplate.js",
        "src/quality.js",
        "types/quality.d.ts",
        "package.json",
        "package-lock.json",
        "bench/public/extraction-comparison.mjs",
        "bench/public/wceb-integrity.mjs",
        "bench/public/baselines/extract_baselines.py",
        "bench/public/baselines/requirements.lock.txt"
      ],
      value: await fingerprint([
        "src/index.js",
        "src/boilerplate.js",
        "src/quality.js",
        "types/quality.d.ts",
        "package.json",
        "package-lock.json",
        "bench/public/extraction-comparison.mjs",
        "bench/public/wceb-integrity.mjs",
        "bench/public/baselines/extract_baselines.py",
        "bench/public/baselines/requirements.lock.txt"
      ])
    }
  },
  configuration: {
    coreBoilerplate: options.boilerplate,
    qualityProfile: "balanced",
    qualityFailClosed: false
  },
  baselineManifest,
  tools,
  missingBaselineOutputs: Object.fromEntries(missing),
  summaries,
  pages: Object.fromEntries(tools.map((tool) => [tool, rows.get(tool)]))
};

const serialized = `${JSON.stringify(result, null, 2)}\n`;
if (options.output) {
  await mkdir(path.dirname(options.output), { recursive: true });
  await writeFile(options.output, serialized, "utf8");
}

const width = Math.max(...tools.map((tool) => tool.length));
console.log(`\n${"tool".padEnd(width)}  precision  recall     F1         req-recall  unwanted`);
console.log("-".repeat(width + 54));
for (const tool of tools) {
  const summary = summaries[tool];
  console.log(
    `${tool.padEnd(width)}  ${summary.precision.toFixed(4).padEnd(9)}  ${summary.recall.toFixed(4).padEnd(9)}  `
    + `${summary.f1.toFixed(4).padEnd(9)}  ${summary.requiredSnippetRecall.toFixed(4).padEnd(10)}  ${summary.unwantedSnippetInclusion.toFixed(4)}`
  );
}
console.log(
  `\n${files.length} pages, WCEB ${revision.slice(0, 10)}, split ${options.split}, `
  + `boilerplate ${options.boilerplate}`
);
