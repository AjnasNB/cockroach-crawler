import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { crawlDetailed } from "./index.js";

const CHECKPOINT_SCHEMA = "cockroach.spider-checkpoint.v1";

function integer(value, label, fallback, minimum, maximum) {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label} must be a safe integer from ${minimum} to ${maximum}.`);
  }
  return result;
}

function finite(value, label, fallback, minimum, maximum) {
  const result = Number(value ?? fallback);
  if (!Number.isFinite(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label} must be a finite number from ${minimum} to ${maximum}.`);
  }
  return result;
}

function ownRecord(value, label, maximum = 48) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const result = Object.create(null);
  let count = 0;
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== "string" || ["__proto__", "prototype", "constructor"].includes(key)) {
      throw new TypeError(`${label} contains an unsafe property.`);
    }
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`${label}.${key} must be an own enumerable data property.`);
    }
    count += 1;
    if (count > maximum) throw new TypeError(`${label} exceeds its ${maximum}-property limit.`);
    result[key] = descriptor.value;
  }
  return result;
}

function httpUrl(value, label) {
  const parsed = value instanceof URL ? value : new URL(String(value));
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new TypeError(`${label} must be an http(s) URL.`);
  }
  parsed.hash = "";
  return parsed.toString();
}

function normalizePattern(value, label) {
  if (value instanceof RegExp) return value;
  if (typeof value === "string") {
    if (!value.length || value.length > 2_048) {
      throw new TypeError(`${label} must contain 1-2048 characters.`);
    }
    return value;
  }
  throw new TypeError(`${label} must be a string or RegExp.`);
}

function patternMatches(pattern, url) {
  return pattern instanceof RegExp ? pattern.test(url) : url.includes(pattern);
}

function normalizeRule(value, index) {
  const rule = ownRecord(value, `rules[${index}]`, 8);
  const unknown = Object.keys(rule).filter(
    (key) => !["allow", "deny", "callback", "follow", "name"].includes(key)
  );
  if (unknown.length) throw new TypeError(`Unknown rule option(s) at rules[${index}]: ${unknown.join(", ")}.`);

  const toList = (input, label) => {
    if (input === undefined) return [];
    const list = Array.isArray(input) ? input : [input];
    if (list.length > 64) throw new TypeError(`${label} exceeds its 64-entry limit.`);
    return list.map((entry, position) => normalizePattern(entry, `${label}[${position}]`));
  };

  if (rule.callback !== undefined && typeof rule.callback !== "function") {
    throw new TypeError(`rules[${index}].callback must be a function.`);
  }
  if (rule.follow !== undefined && typeof rule.follow !== "boolean") {
    throw new TypeError(`rules[${index}].follow must be a boolean.`);
  }

  return Object.freeze({
    name: typeof rule.name === "string" ? rule.name.slice(0, 64) : `rule-${index}`,
    allow: Object.freeze(toList(rule.allow, `rules[${index}].allow`)),
    deny: Object.freeze(toList(rule.deny, `rules[${index}].deny`)),
    callback: rule.callback ?? null,
    follow: rule.follow !== false
  });
}

export class AutoThrottle {
  constructor(options = {}) {
    const settings = ownRecord(options, "AutoThrottle options", 8);
    const unknown = Object.keys(settings).filter(
      (key) => !["targetLatencyMs", "minDelayMs", "maxDelayMs", "startDelayMs", "smoothing"].includes(key)
    );
    if (unknown.length) throw new TypeError(`Unknown AutoThrottle option(s): ${unknown.join(", ")}.`);

    this.targetLatencyMs = integer(settings.targetLatencyMs, "targetLatencyMs", 1_000, 50, 60_000);
    this.minDelayMs = integer(settings.minDelayMs, "minDelayMs", 0, 0, 60_000);
    this.maxDelayMs = integer(settings.maxDelayMs, "maxDelayMs", 10_000, this.minDelayMs, 300_000);
    this.smoothing = finite(settings.smoothing, "smoothing", 0.5, 0.01, 1);
    this.delayMs = integer(settings.startDelayMs, "startDelayMs", 250, this.minDelayMs, this.maxDelayMs);
    this.samples = 0;
  }

  observe(latencyMs, throttled = false) {
    const latency = finite(latencyMs, "latencyMs", 0, 0, 600_000);
    this.samples += 1;

    if (throttled) {
      this.delayMs = Math.min(this.maxDelayMs, Math.max(this.minDelayMs, this.delayMs * 2 || 100));
      return this.delayMs;
    }

    const ratio = latency / this.targetLatencyMs;
    const target = ratio > 1
      ? this.delayMs * Math.min(4, ratio)
      : this.delayMs * Math.max(0.5, ratio);
    const blended = this.delayMs + (target - this.delayMs) * this.smoothing;
    this.delayMs = Math.round(Math.min(this.maxDelayMs, Math.max(this.minDelayMs, blended)));
    return this.delayMs;
  }
}

async function atomicJsonWrite(filename, value) {
  const temporary = `${filename}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, filename);
}

export class SpiderCheckpoint {
  constructor(options = {}) {
    const settings = ownRecord(options, "SpiderCheckpoint options", 8);
    if (typeof settings.directory !== "string" || !settings.directory.trim()) {
      throw new TypeError("SpiderCheckpoint requires an explicit directory.");
    }
    this.directory = path.resolve(settings.directory);
    this.name = String(settings.name ?? "default");
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(this.name)) {
      throw new TypeError("name must contain only letters, digits, dot, underscore, or hyphen.");
    }
    this.maxUrls = integer(settings.maxUrls, "maxUrls", 200_000, 1, 5_000_000);
  }

  get filename() {
    const digest = createHash("sha256").update(this.name).digest("hex").slice(0, 32);
    return path.join(this.directory, `spider-${digest}.json`);
  }

  async save(state) {
    const record = ownRecord(state, "checkpoint state", 8);
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    await atomicJsonWrite(this.filename, {
      schema: CHECKPOINT_SCHEMA,
      name: this.name,
      savedAtMs: Date.now(),
      visited: [...(record.visited ?? [])].slice(0, this.maxUrls),
      frontier: [...(record.frontier ?? [])].slice(0, this.maxUrls),
      itemCount: integer(record.itemCount, "itemCount", 0, 0, Number.MAX_SAFE_INTEGER)
    });
    return this.filename;
  }

  async load() {
    let parsed;
    try {
      parsed = JSON.parse(await readFile(this.filename, "utf8"));
    } catch (error) {
      if (error?.code === "ENOENT" || error instanceof SyntaxError) return null;
      throw error;
    }
    if (parsed?.schema !== CHECKPOINT_SCHEMA || parsed.name !== this.name) return null;
    if (!Array.isArray(parsed.visited) || !Array.isArray(parsed.frontier)) return null;
    return Object.freeze({
      savedAtMs: parsed.savedAtMs,
      visited: parsed.visited.filter((entry) => typeof entry === "string"),
      frontier: parsed.frontier.filter((entry) => typeof entry === "string"),
      itemCount: Number.isSafeInteger(parsed.itemCount) ? parsed.itemCount : 0
    });
  }
}

export class Spider {
  constructor(options = {}) {
    const settings = ownRecord(options, "Spider options", 48);
    const {
      startUrls,
      urls,
      rules,
      parse,
      maxPages,
      maxDepth,
      batchSize,
      autoThrottle,
      checkpoint,
      checkpointEvery,
      allowedOrigins,
      sameOrigin,
      ...crawlOptions
    } = settings;

    const seeds = startUrls ?? urls;
    const seedList = seeds === undefined ? [] : (Array.isArray(seeds) ? seeds : [seeds]);
    if (!seedList.length) throw new TypeError("Spider requires startUrls.");
    if (seedList.length > 1_000) throw new TypeError("startUrls exceeds its 1000-entry limit.");
    this.startUrls = seedList.map((entry, index) => httpUrl(entry, `startUrls[${index}]`));

    if (rules !== undefined && !Array.isArray(rules)) throw new TypeError("rules must be an array.");
    if (Array.isArray(rules) && rules.length > 64) throw new TypeError("rules exceeds its 64-entry limit.");
    this.rules = Object.freeze((rules ?? []).map((entry, index) => normalizeRule(entry, index)));

    if (parse !== undefined && typeof parse !== "function") throw new TypeError("parse must be a function.");
    this.parseFn = parse ?? null;

    this.maxPages = integer(maxPages, "maxPages", 100, 1, 100_000);
    this.maxDepth = integer(maxDepth, "maxDepth", 3, 0, 50);
    this.batchSize = integer(batchSize, "batchSize", 10, 1, 100);
    this.checkpointEvery = integer(checkpointEvery, "checkpointEvery", 1, 1, 1_000);

    if (autoThrottle !== undefined && autoThrottle !== false && !(autoThrottle instanceof AutoThrottle)) {
      if (autoThrottle === true) {
        this.throttle = new AutoThrottle();
      } else {
        this.throttle = new AutoThrottle(autoThrottle);
      }
    } else {
      this.throttle = autoThrottle instanceof AutoThrottle ? autoThrottle : null;
    }

    if (checkpoint !== undefined && !(checkpoint instanceof SpiderCheckpoint)) {
      throw new TypeError("checkpoint must be a SpiderCheckpoint.");
    }
    this.checkpoint = checkpoint ?? null;

    this.sameOrigin = sameOrigin !== false;
    this.allowedOrigins = allowedOrigins;
    this.crawlOptions = Object.freeze({ ...crawlOptions });

    this.visited = new Set();
    this.frontier = [];
    this.itemCount = 0;
    this.pageCount = 0;
    this.failures = [];
  }

  matchRule(url) {
    if (!this.rules.length) return { follow: true, callback: null, name: "default" };
    for (const rule of this.rules) {
      if (rule.deny.some((pattern) => patternMatches(pattern, url))) continue;
      if (rule.allow.length && !rule.allow.some((pattern) => patternMatches(pattern, url))) continue;
      return rule;
    }
    return null;
  }

  async parse(page, context) {
    if (context?.rule?.callback) return context.rule.callback(page, context);
    if (this.parseFn) return this.parseFn(page, context);
    return {
      url: page.url,
      title: page.title,
      description: page.description,
      markdown: page.markdown,
      depth: context?.depth ?? 0
    };
  }

  async resume() {
    if (!this.checkpoint) return false;
    const saved = await this.checkpoint.load();
    if (!saved) return false;
    this.visited = new Set(saved.visited);
    this.frontier = saved.frontier.map((entry) => {
      const [url, depth] = entry.split(" ");
      return { url, depth: Number.parseInt(depth ?? "0", 10) || 0 };
    });
    this.itemCount = saved.itemCount;
    return true;
  }

  async persist() {
    if (!this.checkpoint) return null;
    return this.checkpoint.save({
      visited: [...this.visited],
      frontier: this.frontier.map((entry) => `${entry.url} ${entry.depth}`),
      itemCount: this.itemCount
    });
  }

  async *stream() {
    const resumed = await this.resume();
    if (!resumed) {
      for (const url of this.startUrls) this.frontier.push({ url, depth: 0 });
    }

    let sinceCheckpoint = 0;

    while (this.frontier.length && this.pageCount < this.maxPages) {
      const batch = [];
      while (batch.length < this.batchSize && this.frontier.length && this.pageCount + batch.length < this.maxPages) {
        const next = this.frontier.shift();
        if (this.visited.has(next.url)) continue;
        this.visited.add(next.url);
        batch.push(next);
      }
      if (!batch.length) break;

      const depths = new Map(batch.map((entry) => [entry.url, entry.depth]));
      const startedAt = Date.now();

      const result = await crawlDetailed({
        ...this.crawlOptions,
        seeds: batch.map((entry) => entry.url),
        maxSeeds: batch.length,
        maxPages: batch.length,
        maxDepth: 0,
        sameOrigin: this.sameOrigin,
        ...(this.allowedOrigins ? { allowedOrigins: this.allowedOrigins } : {}),
        ...(this.throttle ? { delayMs: this.throttle.delayMs } : {})
      });

      const elapsed = Date.now() - startedAt;
      const throttled = result.failures.some(
        (failure) => failure.code === "CHALLENGE_ENCOUNTERED" || /429/.test(String(failure.error))
      );
      if (this.throttle) this.throttle.observe(elapsed / Math.max(1, batch.length), throttled);

      this.failures.push(...result.failures);

      for (const page of result.pages) {
        this.pageCount += 1;
        const depth = depths.get(page.url) ?? 0;
        const rule = this.matchRule(page.url) ?? { follow: true, callback: null, name: "default" };

        const item = await this.parse(page, { depth, rule, spider: this });
        if (item !== null && item !== undefined) {
          this.itemCount += 1;
          yield item;
        }

        if (rule.follow && depth < this.maxDepth) {
          for (const link of page.links ?? []) {
            let normalized;
            try {
              normalized = httpUrl(link, "link");
            } catch {
              continue;
            }
            if (this.visited.has(normalized)) continue;
            if (this.rules.length && !this.matchRule(normalized)) continue;
            if (this.frontier.length >= this.maxPages * 4) break;
            this.frontier.push({ url: normalized, depth: depth + 1 });
          }
        }
      }

      sinceCheckpoint += 1;
      if (this.checkpoint && sinceCheckpoint >= this.checkpointEvery) {
        sinceCheckpoint = 0;
        await this.persist();
      }
    }

    if (this.checkpoint) await this.persist();
  }

  async run() {
    const items = [];
    for await (const item of this.stream()) items.push(item);
    return Object.freeze({
      items,
      stats: Object.freeze({
        pages: this.pageCount,
        items: this.itemCount,
        visited: this.visited.size,
        remaining: this.frontier.length,
        failures: this.failures.length
      }),
      failures: Object.freeze([...this.failures])
    });
  }
}

export class CrawlSpider extends Spider {}

export class SitemapSpider extends Spider {
  constructor(options = {}) {
    const settings = ownRecord(options, "SitemapSpider options", 48);
    super({ ...settings, includeSitemaps: true });
  }
}

export const spiderDefaults = Object.freeze({
  checkpointSchema: CHECKPOINT_SCHEMA
});
