import * as cheerio from "cheerio";
import robotsParser from "robots-parser";
import TurndownService from "turndown";

const DEFAULT_USER_AGENT = "CockroachCrawler/0.1 (+https://github.com/AjnasNB/cockroach-crawler)";
const DEFAULT_MAX_BYTES = 3 * 1024 * 1024;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function toUrl(value, base) {
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

function normalizeUrl(value) {
  const url = new URL(value);
  url.hash = "";
  if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) {
    url.port = "";
  }
  return url.toString();
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function sameOrigin(a, b) {
  return new URL(a).origin === new URL(b).origin;
}

function compilePatterns(values) {
  return (values || []).map((value) => new RegExp(value));
}

function matchesAny(value, patterns) {
  return patterns.some((pattern) => pattern.test(value));
}

async function fetchText(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": options.userAgent,
        accept: options.accept || "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5"
      },
      redirect: "follow",
      signal: controller.signal
    });

    const contentType = response.headers.get("content-type") || "";
    const length = Number(response.headers.get("content-length") || 0);
    if (length > options.maxBytes) {
      throw new Error(`Response too large: ${length} bytes`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return { response, text: await response.text(), contentType };
    }

    const chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > options.maxBytes) {
        throw new Error(`Response exceeded maxBytes: ${options.maxBytes}`);
      }
      chunks.push(value);
    }
    const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
    return { response, text: buffer.toString("utf8"), contentType };
  } finally {
    clearTimeout(timeout);
  }
}

function parseRobotsSitemaps(robotsText) {
  return robotsText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^sitemap:/i.test(line))
    .map((line) => line.replace(/^sitemap:\s*/i, "").trim())
    .filter(Boolean);
}

async function loadRobots(origin, options) {
  const robotsUrl = new URL("/robots.txt", origin).toString();
  try {
    const { response, text } = await fetchText(robotsUrl, {
      ...options,
      accept: "text/plain,*/*;q=0.5",
      maxBytes: Math.min(options.maxBytes, 512 * 1024)
    });
    if (!response.ok) {
      return {
        parser: robotsParser(robotsUrl, ""),
        sitemaps: []
      };
    }
    return {
      parser: robotsParser(robotsUrl, text),
      sitemaps: parseRobotsSitemaps(text)
    };
  } catch {
    return {
      parser: robotsParser(robotsUrl, ""),
      sitemaps: []
    };
  }
}

async function discoverSitemapUrls(sitemapUrl, options) {
  const discovered = [];
  try {
    const { response, text, contentType } = await fetchText(sitemapUrl, {
      ...options,
      accept: "application/xml,text/xml,*/*;q=0.5"
    });
    if (!response.ok) return discovered;
    if (!contentType.includes("xml") && !text.trim().startsWith("<")) return discovered;

    const $ = cheerio.load(text, { xmlMode: true });
    $("url > loc").each((_, el) => {
      const value = $(el).text().trim();
      if (isHttpUrl(value)) discovered.push(normalizeUrl(value));
    });
    $("sitemap > loc").each((_, el) => {
      const value = $(el).text().trim();
      if (isHttpUrl(value)) discovered.push(normalizeUrl(value));
    });
  } catch {
    return discovered;
  }
  return discovered;
}

function extractLinks($, baseUrl) {
  const links = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    const resolved = toUrl(href, baseUrl);
    if (resolved && isHttpUrl(resolved)) {
      links.push(normalizeUrl(resolved));
    }
  });
  return [...new Set(links)];
}

function cleanForExtraction($) {
  $("script, style, noscript, template, svg, canvas, iframe").remove();
  $("[hidden], [aria-hidden='true']").remove();
}

export function extractPage(html, url) {
  const $ = cheerio.load(html);
  cleanForExtraction($);

  const title = ($("title").first().text() || $("h1").first().text() || "").trim().replace(/\s+/g, " ");
  const description = ($("meta[name='description']").attr("content") || "").trim();
  const h1 = $("h1").first().text().trim().replace(/\s+/g, " ");
  const canonical = toUrl($("link[rel='canonical']").attr("href") || url, url);
  const links = extractLinks($, url);

  const main = $("main").first();
  const contentRoot = main.length ? main : $("body");
  const htmlFragment = contentRoot.html() || "";
  const text = contentRoot.text().replace(/\s+/g, " ").trim();

  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-"
  });
  const markdown = turndown.turndown(htmlFragment).replace(/\n{3,}/g, "\n\n").trim();

  return {
    url,
    canonical,
    title,
    description,
    h1,
    text,
    markdown,
    links,
    fetchedAt: new Date().toISOString()
  };
}

class CrawlQueue {
  constructor() {
    this.items = [];
    this.offset = 0;
  }

  push(url) {
    const next = typeof url === "string" ? { url, depth: 0 } : url;
    this.items.push(next);
  }

  shift() {
    if (this.offset >= this.items.length) return null;
      const value = this.items[this.offset];
    this.offset += 1;
    if (this.offset > 1000 && this.offset * 2 > this.items.length) {
      this.items = this.items.slice(this.offset);
      this.offset = 0;
    }
    return value;
  }

  get length() {
    return this.items.length - this.offset;
  }
}

export async function crawl(input = {}) {
  const seeds = (input.seeds || input.urls || [])
    .map((seed) => (isHttpUrl(seed) ? normalizeUrl(seed) : null))
    .filter(Boolean);

  if (!seeds.length) {
    throw new Error("At least one http(s) seed URL is required.");
  }

  const options = {
    maxPages: input.maxPages ?? 50,
    concurrency: input.concurrency ?? 4,
    sameOrigin: input.sameOrigin ?? true,
    maxDepth: input.maxDepth ?? 2,
    include: compilePatterns(input.include),
    exclude: compilePatterns(input.exclude),
    publicOnly: input.publicOnly ?? true,
    includeSitemaps: input.includeSitemaps ?? false,
    obeyRobots: input.obeyRobots ?? true,
    userAgent: input.userAgent || DEFAULT_USER_AGENT,
    delayMs: input.delayMs ?? 250,
    timeoutMs: input.timeoutMs ?? 15_000,
    maxBytes: input.maxBytes ?? DEFAULT_MAX_BYTES,
    onPage: input.onPage || null,
    onError: input.onError || null
  };

  const queue = new CrawlQueue();
  const seen = new Set();
  const enqueued = new Set();
  const results = [];
  const stats = {
    fetched: 0,
    skippedRobots: 0,
    skippedFiltered: 0,
    skippedNonPublic: 0,
    errors: 0
  };
  const robotsByOrigin = new Map();
  const lastFetchByOrigin = new Map();
  const seedOrigins = new Set(seeds.map((seed) => new URL(seed).origin));

  const isAllowedByFilters = (url) => {
    if (options.include.length && !matchesAny(url, options.include)) return false;
    if (options.exclude.length && matchesAny(url, options.exclude)) return false;
    return true;
  };

  const isPublicUrl = (url) => {
    if (!options.publicOnly) return true;
    const parsed = new URL(url);
    const banned = /(?:login|signin|sign-in|signup|account|admin|dashboard|checkout|cart|billing|private|wp-admin)/i;
    return !banned.test(parsed.pathname);
  };

  const enqueue = (url, depth = 0) => {
    if (!url || enqueued.has(url) || seen.has(url)) return;
    if (options.sameOrigin && ![...seedOrigins].some((origin) => sameOrigin(url, origin))) return;
    if (!isAllowedByFilters(url)) {
      stats.skippedFiltered += 1;
      return;
    }
    if (!isPublicUrl(url)) {
      stats.skippedNonPublic += 1;
      return;
    }
    if (depth > options.maxDepth) return;
    enqueued.add(url);
    queue.push({ url, depth });
  };

  for (const seed of seeds) enqueue(seed, 0);

  async function getRobots(url) {
    const origin = new URL(url).origin;
    if (!robotsByOrigin.has(origin)) {
      robotsByOrigin.set(origin, await loadRobots(origin, options));
    }
    return robotsByOrigin.get(origin);
  }

  if (options.includeSitemaps) {
    for (const seed of seeds) {
      const robots = await getRobots(seed);
      const sitemapUrls = robots.sitemaps.length
        ? robots.sitemaps
        : [new URL("/sitemap.xml", new URL(seed).origin).toString()];
      for (const sitemapUrl of sitemapUrls) {
        const urls = await discoverSitemapUrls(sitemapUrl, options);
        for (const url of urls) enqueue(url, 0);
      }
    }
  }

  async function waitForOrigin(url) {
    const origin = new URL(url).origin;
    const last = lastFetchByOrigin.get(origin) || 0;
    const waitMs = Math.max(0, last + options.delayMs - Date.now());
    if (waitMs) await sleep(waitMs);
    lastFetchByOrigin.set(origin, Date.now());
  }

  async function worker() {
    while (results.length < options.maxPages) {
      const item = queue.shift();
      if (!item) return;
      const { url, depth } = item;
      if (seen.has(url)) continue;
      seen.add(url);

      try {
        if (options.obeyRobots) {
          const robots = await getRobots(url);
          if (robots.parser && !robots.parser.isAllowed(url, options.userAgent)) {
            stats.skippedRobots += 1;
            continue;
          }
        }

        await waitForOrigin(url);
        const { response, text, contentType } = await fetchText(url, options);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        stats.fetched += 1;
        if (!/html|xml|text\//i.test(contentType)) {
          continue;
        }

        const page = extractPage(text, response.url || url);
        page.status = response.status;
        page.contentType = contentType;
        results.push(page);
        if (options.onPage) await options.onPage(page);

        for (const link of page.links) {
          if (results.length + queue.length >= options.maxPages * 6) break;
          enqueue(link, depth + 1);
        }
      } catch (error) {
        stats.errors += 1;
        const failure = { url, error: error.message || String(error) };
        if (options.onError) await options.onError(failure);
      }
    }
  }

  const workerCount = Math.max(1, Math.min(options.concurrency, options.maxPages));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  const sliced = results.slice(0, options.maxPages);
  Object.defineProperty(sliced, "stats", {
    value: stats,
    enumerable: false
  });
  return sliced;
}

export { discoverSitemapUrls, normalizeUrl };
