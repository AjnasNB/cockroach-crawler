#!/usr/bin/env node
import { createWriteStream } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { crawl, mapSite } from "../src/index.js";

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
  --max-requests <n>      Total network-request budget. Default: derived from max-pages
  --max-duration <ms>     Total crawl deadline. Default: 600000
  --max-bytes <n>         Maximum decoded bytes per page. Default: 3145728
  --max-total-bytes <n>   Total decoded-byte budget
  --max-redirects <n>     Maximum validated redirect hops. Default: 5
  --concurrency <n>       Concurrent workers. Default: 4
  --delay <ms>            Minimum delay per origin. Default: 250
  --timeout <ms>          Request timeout. Default: 15000
  --sitemaps              Discover URLs from robots.txt sitemaps and /sitemap.xml
  --map                   Emit compact fetch-validated URL map entries
  --extract <json-file>   Apply bounded deterministic CSS extraction fields
  --all-origins           Use the explicit --allow-origin allowlist across origins
  --allow-origin <origin> Permit an HTTP(S) origin. Can be repeated
  --allow-private-networks
                          Trust private/loopback networks; metadata/link-local stay blocked
  --include <regex>       Only crawl URLs matching regex. Can be repeated
  --exclude <regex>       Skip URLs matching regex. Can be repeated
  --allow-sensitive-paths Allow likely login/account/admin/cart paths
  --jsonl                 Output JSON Lines instead of a JSON array
  --output <file>         Write output to a file
  --user-agent <ua>       Custom user agent
  --contact <email/url>   Add contact detail to the default user agent
  --browser               Render pages with Playwright before extraction
  --headed                Launch Playwright with a visible browser window
  --wait-until <state>    Browser wait state: load, domcontentloaded, networkidle, commit
  --wait-for <target>     Wait for selector or ms:<number> in browser mode
  --click <selector>      Click selector in browser mode. Can be repeated
  --storage-state <file>  Load Playwright storage state for authorized sessions
  --save-storage-state <file>
                          Save Playwright storage state after the crawl
  --browser-channel <id>  Playwright browser channel, for example chrome
  --browser-executable <path>
                          Custom browser executable path
  --version               Show package version
  --help                  Show this help

This crawler enforces robots.txt and public-network policy by default.
Browser mode requires Playwright installed alongside Cockroach Crawler, plus: npx playwright install chromium
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

async function extractionFromFile(file) {
  if (!file) throw new Error("Missing value for --extract.");
  let value;
  try {
    value = JSON.parse(await readFile(file, "utf8"));
  } catch (cause) {
    const error = new Error(`Could not read --extract JSON file '${file}'.`);
    error.cause = cause;
    throw error;
  }
  return value;
}

async function readArgs(argv) {
  const urls = [];
  const include = [];
  const exclude = [];
  const options = {
    maxPages: 50,
    maxDepth: 2,
    maxRequests: undefined,
    maxDurationMs: 600_000,
    maxBytes: 3 * 1024 * 1024,
    maxTotalBytes: undefined,
    maxRedirects: 5,
    concurrency: 4,
    delayMs: 250,
    timeoutMs: 15_000,
    includeSitemaps: false,
    map: false,
    extract: null,
    sameOrigin: true,
    allowedOrigins: [],
    allowPrivateNetworks: false,
    skipSensitivePaths: true,
    jsonl: false,
    output: null,
    userAgent: undefined,
    browser: null
  };

  const ensureBrowser = () => {
    options.browser ||= {};
    return options.browser;
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
    } else if (arg === "--max-requests") {
      options.maxRequests = parseInteger(readValue(argv, i, "--max-requests"), "--max-requests", 1);
      i += 1;
    } else if (arg === "--max-duration") {
      options.maxDurationMs = parseInteger(readValue(argv, i, "--max-duration"), "--max-duration", 100);
      i += 1;
    } else if (arg === "--max-bytes") {
      options.maxBytes = parseInteger(readValue(argv, i, "--max-bytes"), "--max-bytes", 1024);
      i += 1;
    } else if (arg === "--max-total-bytes") {
      options.maxTotalBytes = parseInteger(readValue(argv, i, "--max-total-bytes"), "--max-total-bytes", 1024);
      i += 1;
    } else if (arg === "--max-redirects") {
      options.maxRedirects = parseInteger(readValue(argv, i, "--max-redirects"), "--max-redirects", 0);
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
    } else if (arg === "--map") {
      options.map = true;
    } else if (arg === "--extract") {
      options.extract = await extractionFromFile(readValue(argv, i, "--extract"));
      i += 1;
    } else if (arg === "--all-origins") {
      options.sameOrigin = false;
    } else if (arg === "--allow-origin") {
      options.allowedOrigins.push(readValue(argv, i, "--allow-origin"));
      i += 1;
    } else if (arg === "--allow-private-networks") {
      options.allowPrivateNetworks = true;
    } else if (arg === "--include") {
      include.push(readValue(argv, i, "--include"));
      i += 1;
    } else if (arg === "--exclude") {
      exclude.push(readValue(argv, i, "--exclude"));
      i += 1;
    } else if (arg === "--allow-sensitive-paths" || arg === "--allow-non-public") {
      options.skipSensitivePaths = false;
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
    } else if (arg === "--browser" || arg === "--rendered") {
      ensureBrowser();
    } else if (arg === "--headed") {
      ensureBrowser().headed = true;
    } else if (arg === "--wait-until") {
      ensureBrowser().waitUntil = readValue(argv, i, "--wait-until");
      i += 1;
    } else if (arg === "--wait-for") {
      ensureBrowser().waitFor = readValue(argv, i, "--wait-for");
      i += 1;
    } else if (arg === "--click") {
      const browser = ensureBrowser();
      browser.click ||= [];
      browser.click.push(readValue(argv, i, "--click"));
      i += 1;
    } else if (arg === "--storage-state") {
      ensureBrowser().storageState = readValue(argv, i, "--storage-state");
      i += 1;
    } else if (arg === "--save-storage-state") {
      ensureBrowser().saveStorageState = readValue(argv, i, "--save-storage-state");
      i += 1;
    } else if (arg === "--browser-channel") {
      ensureBrowser().channel = readValue(argv, i, "--browser-channel");
      i += 1;
    } else if (arg === "--browser-executable") {
      ensureBrowser().executablePath = readValue(argv, i, "--browser-executable");
      i += 1;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      urls.push(arg);
    }
  }

  options.include = include;
  options.exclude = exclude;
  if (!options.sameOrigin && !options.allowedOrigins.length) {
    throw new Error("--all-origins requires at least one --allow-origin entry.");
  }
  return { urls, options };
}

async function writeOutput(result, options) {
  const records = options.map ? result.entries : result;
  const body = options.jsonl
    ? records.map((record) => JSON.stringify(record)).join("\n") + "\n"
    : JSON.stringify(
        options.map
          ? result
          : { pages: result, failures: result.failures || [], stats: result.stats || null },
        null,
        2
      ) + "\n";

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

  const crawlOptions = {
    seeds: urls,
    maxPages: options.maxPages,
    maxDepth: options.maxDepth,
    maxRequests: options.maxRequests,
    maxDurationMs: options.maxDurationMs,
    maxBytes: options.maxBytes,
    maxTotalBytes: options.maxTotalBytes,
    maxRedirects: options.maxRedirects,
    concurrency: options.concurrency,
    delayMs: options.delayMs,
    timeoutMs: options.timeoutMs,
    includeSitemaps: options.includeSitemaps,
    sameOrigin: options.sameOrigin,
    allowedOrigins: options.allowedOrigins,
    allowPrivateNetworks: options.allowPrivateNetworks,
    skipSensitivePaths: options.skipSensitivePaths,
    include: options.include,
    exclude: options.exclude,
    userAgent: options.userAgent,
    browser: options.browser,
    extract: options.extract,
    onError: (failure) => {
      process.stderr.write(`crawl warning: ${failure.url}: ${failure.error}\n`);
    }
  };
  const result = options.map
    ? await mapSite(crawlOptions)
    : await crawl(crawlOptions);

  await writeOutput(result, options);
}

main().catch((error) => {
  process.stderr.write(`cockroach-crawl: ${error.message || String(error)}\n`);
  process.exitCode = 1;
});
