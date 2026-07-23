import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const CACHE_SCHEMA = "cockroach.crawl-cache.v1";

function safeInteger(value, label, fallback, minimum, maximum) {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label} must be a safe integer from ${minimum} to ${maximum}.`);
  }
  return result;
}

function safeSegment(value, label) {
  const result = String(value ?? "default").normalize("NFKC");
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(result) || result === "." || result === "..") {
    throw new TypeError(`${label} must contain only letters, digits, dot, underscore, or hyphen.`);
  }
  return result;
}

function stableValue(value, seen = new WeakSet()) {
  if (typeof value === "function" || typeof value === "symbol") {
    throw new TypeError(
      "Cache key input contains non-serializable authority. Supply an explicit cache key."
    );
  }
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
    || (typeof value === "number" && Number.isFinite(value))
  ) {
    return value;
  }
  if (value instanceof RegExp) return { $regex: value.source, $flags: value.flags };
  if (value instanceof URL) return value.toString();
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry, seen));
  if (value && typeof value === "object") {
    if (seen.has(value)) throw new TypeError("Cache key input cannot contain cycles.");
    seen.add(value);
    const result = Object.create(null);
    for (const key of Object.keys(value).sort()) {
      const entry = value[key];
      if (entry === undefined) continue;
      if (typeof entry === "function" || typeof entry === "symbol") {
        throw new TypeError(
          `Cache key input contains non-serializable authority at '${key}'. Supply an explicit cache key.`
        );
      }
      result[key] = stableValue(entry, seen);
    }
    seen.delete(value);
    return result;
  }
  throw new TypeError(`Unsupported cache-key value type '${typeof value}'.`);
}

export function createCrawlCacheKey(input, namespace = "default") {
  const payload = JSON.stringify({
    namespace: safeSegment(namespace, "namespace"),
    input: stableValue(input)
  });
  return createHash("sha256").update(payload).digest("hex");
}

async function atomicJsonWrite(filename, value) {
  const temporary = `${filename}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, filename);
}

export class FileCrawlCache {
  constructor(options = {}) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("FileCrawlCache options must be an object.");
    }
    const root = options.directory;
    if (typeof root !== "string" || !root.trim()) {
      throw new TypeError("FileCrawlCache requires an explicit directory.");
    }
    this.directory = path.resolve(root);
    this.namespace = safeSegment(options.namespace, "namespace");
    this.ttlMs = safeInteger(options.ttlMs, "ttlMs", 24 * 60 * 60 * 1_000, 1, 365 * 24 * 60 * 60 * 1_000);
    this.maxEntries = safeInteger(options.maxEntries, "maxEntries", 1_000, 1, 100_000);
    this.maxBytes = safeInteger(options.maxBytes, "maxBytes", 512 * 1024 * 1024, 1_024, 8 * 1024 * 1024 * 1024);
  }

  key(input) {
    return createCrawlCacheKey(input, this.namespace);
  }

  filename(key) {
    if (!/^[0-9a-f]{64}$/.test(key)) throw new TypeError("Cache key must be a SHA-256 hex digest.");
    return path.join(this.directory, `${key}.json`);
  }

  async get(key) {
    let parsed;
    try {
      parsed = JSON.parse(await readFile(this.filename(key), "utf8"));
    } catch (error) {
      if (error?.code === "ENOENT" || error instanceof SyntaxError) return null;
      throw error;
    }
    if (
      parsed?.schema !== CACHE_SCHEMA
      || parsed.key !== key
      || !Number.isSafeInteger(parsed.createdAtMs)
      || !Number.isSafeInteger(parsed.expiresAtMs)
      || parsed.expiresAtMs <= Date.now()
    ) {
      await unlink(this.filename(key)).catch(() => {});
      return null;
    }
    const serialized = JSON.stringify(parsed.value);
    const digest = createHash("sha256").update(serialized).digest("hex");
    if (digest !== parsed.valueSha256) {
      await unlink(this.filename(key)).catch(() => {});
      return null;
    }
    return structuredClone(parsed.value);
  }

  async set(key, value, options = {}) {
    const ttlMs = safeInteger(options.ttlMs, "ttlMs", this.ttlMs, 1, 365 * 24 * 60 * 60 * 1_000);
    const serialized = JSON.stringify(value);
    const byteLength = Buffer.byteLength(serialized);
    if (byteLength > this.maxBytes) {
      throw new RangeError(`Cache value exceeds maxBytes (${byteLength} > ${this.maxBytes}).`);
    }
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const createdAtMs = Date.now();
    await atomicJsonWrite(this.filename(key), {
      schema: CACHE_SCHEMA,
      key,
      createdAtMs,
      expiresAtMs: createdAtMs + ttlMs,
      valueSha256: createHash("sha256").update(serialized).digest("hex"),
      value
    });
    await this.prune();
  }

  async delete(key) {
    await unlink(this.filename(key)).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
  }

  async prune() {
    let names;
    try {
      names = (await readdir(this.directory)).filter((name) => /^[0-9a-f]{64}\.json$/.test(name));
    } catch (error) {
      if (error?.code === "ENOENT") return { removed: 0, entries: 0, bytes: 0 };
      throw error;
    }
    const entries = [];
    for (const name of names) {
      const filename = path.join(this.directory, name);
      try {
        const info = await stat(filename);
        entries.push({ filename, mtimeMs: info.mtimeMs, size: info.size });
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
    entries.sort((left, right) => right.mtimeMs - left.mtimeMs);
    let bytes = 0;
    let kept = 0;
    let removed = 0;
    for (const entry of entries) {
      if (kept >= this.maxEntries || bytes + entry.size > this.maxBytes) {
        await unlink(entry.filename).catch(() => {});
        removed += 1;
      } else {
        kept += 1;
        bytes += entry.size;
      }
    }
    return { removed, entries: kept, bytes };
  }
}

export function createCachedCrawler(cache, crawler) {
  if (!cache || typeof cache.get !== "function" || typeof cache.set !== "function") {
    throw new TypeError("cache must expose async get(key) and set(key, value).");
  }
  if (typeof crawler !== "function") throw new TypeError("crawler must be a function.");
  return async function cachedCrawl(input = {}, options = {}) {
    const key = options.key || (
      typeof cache.key === "function"
        ? cache.key(input)
        : createCrawlCacheKey(input, options.namespace)
    );
    if (options.refresh !== true) {
      const cached = await cache.get(key);
      if (cached !== null) return { ...cached, cache: { hit: true, key } };
    }
    const value = await crawler(input);
    await cache.set(key, value, { ttlMs: options.ttlMs });
    return { ...value, cache: { hit: false, key } };
  };
}
