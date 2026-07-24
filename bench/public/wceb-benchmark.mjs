#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createGunzip } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractPage } from "../../src/index.js";

const scriptPath = fileURLToPath(import.meta.url);
const publicDirectory = path.dirname(scriptPath);
const root = path.resolve(publicDirectory, "../..");
const expectedRevision = "62ff86d12ea72c80c31fb810ff1a724fad687bea";

function parseArguments(argv) {
  const options = {
    dataset: process.env.WCEB_DIR || process.env.WCXB_DIR || "",
    split: "test",
    output: ""
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--dataset") options.dataset = argv[++index] || "";
    else if (argument === "--split") options.split = argv[++index] || "";
    else if (argument === "--output") options.output = argv[++index] || "";
    else throw new TypeError(`Unknown argument: ${argument}`);
  }
  if (!options.dataset) {
    throw new TypeError("Pass --dataset <WCEB v1.0 checkout> or set WCEB_DIR.");
  }
  if (!["dev", "test"].includes(options.split)) {
    throw new TypeError("--split must be dev or test.");
  }
  return {
    dataset: path.resolve(options.dataset),
    split: options.split,
    output: options.output ? path.resolve(root, options.output) : ""
  };
}

function git(directory, ...args) {
  return execFileSync("git", args, {
    cwd: directory,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

async function gunzipUtf8(filename) {
  const chunks = [];
  await new Promise((resolve, reject) => {
    createReadStream(filename)
      .pipe(createGunzip())
      .on("data", (chunk) => chunks.push(chunk))
      .on("error", reject)
      .on("end", resolve);
  });
  return Buffer.concat(chunks).toString("utf8");
}

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
  return snippets.filter((snippet) => normalized.includes(String(snippet).toLocaleLowerCase("und"))).length / snippets.length;
}

function round(value) {
  return Number(value.toFixed(6));
}

function average(rows, key) {
  return round(rows.reduce((total, row) => total + row[key], 0) / rows.length);
}

async function sourceFingerprint() {
  const inputs = [
    "src/index.js",
    "package.json",
    "package-lock.json",
    "bench/public/sources.json",
    "bench/public/wceb-benchmark.mjs"
  ];
  const hash = createHash("sha256");
  for (const relative of inputs) {
    hash.update(relative);
    hash.update("\0");
    const text = await readFile(path.join(root, relative), "utf8");
    hash.update(text.replace(/\r\n?/g, "\n"));
    hash.update("\0");
  }
  return { algorithm: "sha256", normalization: "utf8-lf", value: hash.digest("hex"), inputs };
}

function summarize(rows) {
  const byPageType = Object.create(null);
  for (const type of ["article", "service", "product", "collection", "forum", "listing", "documentation"]) {
    const selected = rows.filter((row) => row.pageType === type);
    if (selected.length) {
      byPageType[type] = {
        pages: selected.length,
        precision: average(selected, "precision"),
        recall: average(selected, "recall"),
        f1: average(selected, "f1"),
        requiredSnippetRecall: average(selected, "requiredSnippetRecall"),
        unwantedSnippetInclusion: average(selected, "unwantedSnippetInclusion")
      };
    }
  }
  return {
    pages: rows.length,
    precision: average(rows, "precision"),
    recall: average(rows, "recall"),
    f1: average(rows, "f1"),
    requiredSnippetRecall: average(rows, "requiredSnippetRecall"),
    unwantedSnippetInclusion: average(rows, "unwantedSnippetInclusion"),
    byPageType
  };
}

const options = parseArguments(process.argv.slice(2));
const revision = git(options.dataset, "rev-parse", "HEAD");
if (revision !== expectedRevision) {
  throw new Error(`WCEB revision mismatch: expected ${expectedRevision}, received ${revision}.`);
}
const datasetChanges = git(options.dataset, "status", "--porcelain=v1", "--untracked-files=no");
if (datasetChanges) throw new Error("WCEB checkout must be clean.");

const groundTruthDirectory = path.join(options.dataset, options.split, "ground-truth");
const htmlDirectory = path.join(options.dataset, options.split, "html");
const files = (await readdir(groundTruthDirectory))
  .filter((filename) => filename.endsWith(".json"))
  .sort((left, right) => left.localeCompare(right, "en"));
const pages = [];

for (const filename of files) {
  const id = path.basename(filename, ".json");
  const record = JSON.parse(await readFile(path.join(groundTruthDirectory, filename), "utf8"));
  const truth = record.ground_truth || {};
  const html = await gunzipUtf8(path.join(htmlDirectory, `${id}.html.gz`));
  const extracted = extractPage(html, record.url, { maxLinksPerPage: 20_000 }).text;
  const metrics = wordMetrics(extracted, truth.main_content || "");
  const pageTypeValue = record._internal?.page_type;
  const pageType = typeof pageTypeValue === "string"
    ? pageTypeValue
    : pageTypeValue?.primary || "article";
  pages.push({
    id,
    pageType: pageType === "category" ? "collection" : pageType,
    precision: round(metrics.precision),
    recall: round(metrics.recall),
    f1: round(metrics.f1),
    requiredSnippetRecall: round(snippetRate(extracted, truth.with || [])),
    unwantedSnippetInclusion: round(snippetRate(extracted, truth.without || [])),
    extractedCharacters: extracted.length,
    referenceCharacters: String(truth.main_content || "").length
  });
}

const result = {
  schemaVersion: 1,
  benchmark: "cockroach-crawler-wceb-main-content",
  scope: {
    description: "Deterministic main-content extraction from cached public HTML against human-reviewed WCEB annotations.",
    extractor: "cockroach-crawler extractPage(...).text",
    metric: "Macro average of page-level Unicode word precision, recall, and F1; snippet rates use case-insensitive literal inclusion.",
    intendedClaims: [
      "main-content extraction quality on the pinned WCEB split",
      "required-content retention and unwanted-boilerplate inclusion on the pinned WCEB split"
    ],
    excludedClaims: [
      "public-internet speed or capacity",
      "browser rendering quality",
      "OCR quality",
      "universal extraction quality",
      "competitor ranking without an identical independently reviewed protocol"
    ]
  },
  dataset: {
    name: "WCEB v1.0",
    repository: "https://github.com/Murrough-Foley/web-content-extraction-benchmark",
    homepage: "https://webcontentextraction.org/",
    revision,
    split: options.split,
    license: "CC-BY-4.0",
    cleanCheckout: true
  },
  package: {
    name: "cockroach-crawler",
    version: JSON.parse(await readFile(path.join(root, "package.json"), "utf8")).version,
    source: await sourceFingerprint()
  },
  results: summarize(pages),
  pages
};

const serialized = `${JSON.stringify(result, null, 2)}\n`;
if (options.output) {
  await mkdir(path.dirname(options.output), { recursive: true });
  await writeFile(options.output, serialized, "utf8");
}
process.stdout.write(serialized);
