#!/usr/bin/env node
import { createWriteStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { crawl } from "../src/index.js";

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
  --help                  Show this help

This crawler respects robots.txt by default and does not bypass access controls.
`);
}

async function urlsFromFile(file) {
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
    } else if (arg === "--url-file") {
      urls.push(...(await urlsFromFile(argv[++i])));
    } else if (arg === "--max-pages") {
      options.maxPages = Number(argv[++i]);
    } else if (arg === "--max-depth") {
      options.maxDepth = Number(argv[++i]);
    } else if (arg === "--concurrency") {
      options.concurrency = Number(argv[++i]);
    } else if (arg === "--delay") {
      options.delayMs = Number(argv[++i]);
    } else if (arg === "--timeout") {
      options.timeoutMs = Number(argv[++i]);
    } else if (arg === "--sitemaps") {
      options.includeSitemaps = true;
    } else if (arg === "--all-origins") {
      options.sameOrigin = false;
    } else if (arg === "--include") {
      include.push(argv[++i]);
    } else if (arg === "--exclude") {
      exclude.push(argv[++i]);
    } else if (arg === "--allow-non-public") {
      options.publicOnly = false;
    } else if (arg === "--jsonl") {
      options.jsonl = true;
    } else if (arg === "--output" || arg === "-o") {
      options.output = argv[++i];
    } else if (arg === "--user-agent") {
      options.userAgent = argv[++i];
    } else if (arg === "--contact") {
      const contact = argv[++i];
      options.userAgent = `CockroachCrawler/0.1 (+${contact})`;
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

function writeOutput(pages, options) {
  const body = options.jsonl
    ? pages.map((page) => JSON.stringify(page)).join("\n") + "\n"
    : JSON.stringify({ pages, stats: pages.stats || null }, null, 2) + "\n";

  if (!options.output) {
    process.stdout.write(body);
    return;
  }
  const stream = createWriteStream(options.output, { encoding: "utf8" });
  stream.end(body);
}

async function main() {
  const { urls, options } = await readArgs(process.argv.slice(2));
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

  writeOutput(pages, options);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message || String(error)}\n`);
  process.exitCode = 1;
});
