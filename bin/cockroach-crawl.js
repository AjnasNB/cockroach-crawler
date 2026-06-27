#!/usr/bin/env node
import { createWriteStream } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { crawl } from "../src/index.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

function usage() {
  console.log(`
Cockroach Crawler

Usage:
  cockroach-crawl <url> [more urls...] [options]

Options:
  --url-file <file>       Read seed URLs from a text file, one URL per line
  --max-pages <n>         Maximum pages to return. Default: 50
  --max-depth <n>         Maximum link depth from seeds. Default: 2
  --concurrency <n>       Concurrent workers. Default: 4
  --delay <ms>            Minimum delay per origin. Default: 250
  --timeout <ms>          Request timeout. Default: 15000
  --sitemaps              Discover URLs from robots.txt sitemaps and /sitemap.xml
  --all-origins           Allow crawling across origins discovered from links
  --include <regex>       Only crawl URLs matching regex. Can be repeated
  --exclude <regex>       Skip URLs matching regex. Can be repeated
  --allow-non-public      Allow likely login/account/admin/cart URLs
  --jsonl                 Output JSON Lines instead of a JSON array
  --output <file>         Write output to a file
  --user-agent <ua>       Custom user agent
  --contact <email/url>   Add contact detail to the default user agent
  --version               Show package version
  --help                  Show this help

This crawler respects robots.txt by default and does not bypass access controls.
`);
}

function readValue(argv, index, option) {
  if (index + 1 >= argv.length) {
    throw new Error(`Missing value for ${option}.`);
  }
  return argv[index + 1];
}

function parseInteger(value, option, min) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min) {
    throw new Error(`${option} must be an integer >= ${min}.`);
  }
  return number;
}

async function urlsFromFile(file) {
  if (!file) {
    throw new Error("Missing value for --url-file.");
  }
  const text = await readFile(file, "utf8");
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

async function readArgs(argv) {
  const urls = [];
  const include = [];
  const exclude = [];
  const options = {
    maxPages: 50,
    maxDepth: 2,
    concurrency: 4,
    delayMs: 250,
    timeoutMs: 15_000,
    includeSitemaps: false,
    sameOrigin: true,
    publicOnly: true,
    jsonl: false,
    output: null,
    userAgent: undefined
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--version" || arg === "-v") {
      options.version = true;
    } else if (arg === "--url-file") {
      const value = readValue(argv, i, "--url-file");
      urls.push(...(await urlsFromFile(value)));
      i += 1;
    } else if (arg === "--max-pages") {
      options.maxPages = parseInteger(readValue(argv, i, "--max-pages"), "--max-pages", 1);
      i += 1;
    } else if (arg === "--max-depth") {
      options.maxDepth = parseInteger(readValue(argv, i, "--max-depth"), "--max-depth", 0);
      i += 1;
    } else if (arg === "--concurrency") {
      options.concurrency = parseInteger(readValue(argv, i, "--concurrency"), "--concurrency", 1);
      i += 1;
    } else if (arg === "--delay") {
      options.delayMs = parseInteger(readValue(argv, i, "--delay"), "--delay", 0);
      i += 1;
    } else if (arg === "--timeout") {
      options.timeoutMs = parseInteger(readValue(argv, i, "--timeout"), "--timeout", 1);
      i += 1;
    } else if (arg === "--sitemaps") {
      options.includeSitemaps = true;
    } else if (arg === "--all-origins") {
      options.sameOrigin = false;
    } else if (arg === "--include") {
      include.push(readValue(argv, i, "--include"));
      i += 1;
    } else if (arg === "--exclude") {
      exclude.push(readValue(argv, i, "--exclude"));
      i += 1;
    } else if (arg === "--allow-non-public") {
      options.publicOnly = false;
    } else if (arg === "--jsonl") {
      options.jsonl = true;
    } else if (arg === "--output" || arg === "-o") {
      options.output = readValue(argv, i, arg);
      i += 1;
    } else if (arg === "--user-agent") {
      options.userAgent = readValue(argv, i, "--user-agent");
      i += 1;
    } else if (arg === "--contact") {
      const contact = readValue(argv, i, "--contact");
      options.userAgent = `CockroachCrawler/${version} (+${contact})`;
      i += 1;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      urls.push(arg);
    }
  }

  options.include = include;
  options.exclude = exclude;
  return { urls, options };
}

async function writeOutput(pages, options) {
  const body = options.jsonl
    ? pages.map((page) => JSON.stringify(page)).join("\n") + "\n"
    : JSON.stringify({ pages, stats: pages.stats || null }, null, 2) + "\n";

  if (!options.output) {
    process.stdout.write(body);
    return;
  }
  await mkdir(path.dirname(path.resolve(options.output)), { recursive: true });
  await new Promise((resolve, reject) => {
    const stream = createWriteStream(options.output, { encoding: "utf8" });
    stream.on("error", reject);
    stream.on("finish", resolve);
    stream.end(body);
  });
}

async function main() {
  const { urls, options } = await readArgs(process.argv.slice(2));
  if (options.version) {
    console.log(version);
    return;
  }
  if (options.help) {
    usage();
    return;
  }
  if (!urls.length) {
    usage();
    process.exitCode = 1;
    return;
  }

  const pages = await crawl({
    seeds: urls,
    maxPages: options.maxPages,
    maxDepth: options.maxDepth,
    concurrency: options.concurrency,
    delayMs: options.delayMs,
    timeoutMs: options.timeoutMs,
    includeSitemaps: options.includeSitemaps,
    sameOrigin: options.sameOrigin,
    publicOnly: options.publicOnly,
    include: options.include,
    exclude: options.exclude,
    userAgent: options.userAgent,
    onError: (failure) => {
      process.stderr.write(`crawl warning: ${failure.url}: ${failure.error}\n`);
    }
  });

  await writeOutput(pages, options);
}

main().catch((error) => {
  process.stderr.write(`cockroach-crawl: ${error.message || String(error)}\n`);
  process.exitCode = 1;
});
