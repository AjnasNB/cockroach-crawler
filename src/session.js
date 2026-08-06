import { getSetCookies } from "undici";

const JAR_SCHEMA = "cockroach.cookie-jar.v1";
const ROTATOR_STRATEGIES = Object.freeze(["cycle", "random", "sticky"]);

function integer(value, label, fallback, minimum, maximum) {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label} must be a safe integer from ${minimum} to ${maximum}.`);
  }
  return result;
}

function ownRecord(value, label, maximum = 32) {
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
  return parsed;
}

function defaultPath(pathname) {
  if (!pathname.startsWith("/")) return "/";
  const index = pathname.lastIndexOf("/");
  return index <= 0 ? "/" : pathname.slice(0, index);
}

function domainMatches(host, domain) {
  if (host === domain) return true;
  return host.endsWith(`.${domain}`);
}

function pathMatches(requestPath, cookiePath) {
  if (requestPath === cookiePath) return true;
  if (!requestPath.startsWith(cookiePath)) return false;
  return cookiePath.endsWith("/") || requestPath[cookiePath.length] === "/";
}

function expiryOf(cookie) {
  if (typeof cookie.maxAge === "number" && Number.isFinite(cookie.maxAge)) {
    return Date.now() + cookie.maxAge * 1_000;
  }
  if (cookie.expires instanceof Date) {
    const time = cookie.expires.getTime();
    return Number.isNaN(time) ? null : time;
  }
  if (typeof cookie.expires === "string") {
    const time = Date.parse(cookie.expires);
    return Number.isNaN(time) ? null : time;
  }
  return null;
}

export class CookieJar {
  constructor(options = {}) {
    const settings = ownRecord(options, "CookieJar options", 8);
    const unknown = Object.keys(settings).filter(
      (key) => !["maxCookies", "maxPerDomain", "maxValueLength"].includes(key)
    );
    if (unknown.length) throw new TypeError(`Unknown CookieJar option(s): ${unknown.join(", ")}.`);
    this.maxCookies = integer(settings.maxCookies, "maxCookies", 500, 1, 10_000);
    this.maxPerDomain = integer(settings.maxPerDomain, "maxPerDomain", 50, 1, 1_000);
    this.maxValueLength = integer(settings.maxValueLength, "maxValueLength", 4_096, 1, 65_536);
    this.entries = new Map();
  }

  get size() {
    this.prune();
    return this.entries.size;
  }

  keyFor(record) {
    return `${record.domain}|${record.path}|${record.name}`;
  }

  prune() {
    const now = Date.now();
    for (const [key, record] of this.entries) {
      if (record.expiresAtMs !== null && record.expiresAtMs <= now) this.entries.delete(key);
    }
  }

  setFromResponse(url, headers) {
    const target = httpUrl(url, "url");
    const raw = [];
    if (Array.isArray(headers)) {
      raw.push(...headers.map((entry) => String(entry)));
    } else if (headers && typeof headers.getSetCookie === "function") {
      raw.push(...headers.getSetCookie());
    } else if (typeof headers === "string") {
      raw.push(headers);
    } else {
      throw new TypeError("headers must be a Headers object, an array of Set-Cookie lines, or a string.");
    }

    let stored = 0;
    for (const line of raw.slice(0, this.maxPerDomain * 2)) {
      if (this.store(target, line)) stored += 1;
    }
    return stored;
  }

  store(url, rawSetCookie) {
    const target = httpUrl(url, "url");
    const container = new Headers();
    container.append("set-cookie", String(rawSetCookie));
    const [cookie] = getSetCookies(container);
    if (!cookie || typeof cookie.name !== "string" || !cookie.name) return false;
    if (String(cookie.value ?? "").length > this.maxValueLength) return false;

    const host = target.hostname.toLowerCase();
    let domain = host;
    let hostOnly = true;
    if (typeof cookie.domain === "string" && cookie.domain.trim()) {
      const candidate = cookie.domain.trim().replace(/^\./u, "").toLowerCase();
      if (!candidate || !domainMatches(host, candidate)) return false;
      domain = candidate;
      hostOnly = false;
    }

    const path = typeof cookie.path === "string" && cookie.path.startsWith("/")
      ? cookie.path
      : defaultPath(target.pathname);

    const record = {
      name: cookie.name,
      value: String(cookie.value ?? ""),
      domain,
      hostOnly,
      path,
      secure: cookie.secure === true,
      httpOnly: cookie.httpOnly === true,
      sameSite: cookie.sameSite ?? null,
      expiresAtMs: expiryOf(cookie),
      createdAtMs: Date.now()
    };

    const key = this.keyFor(record);
    if (record.expiresAtMs !== null && record.expiresAtMs <= Date.now()) {
      this.entries.delete(key);
      return false;
    }

    const forDomain = [...this.entries.values()].filter((entry) => entry.domain === domain);
    if (!this.entries.has(key) && forDomain.length >= this.maxPerDomain) {
      const oldest = forDomain.sort((left, right) => left.createdAtMs - right.createdAtMs)[0];
      this.entries.delete(this.keyFor(oldest));
    }

    this.entries.set(key, record);
    this.prune();

    while (this.entries.size > this.maxCookies) {
      const first = this.entries.keys().next();
      if (first.done) break;
      this.entries.delete(first.value);
    }
    return true;
  }

  matching(url) {
    const target = httpUrl(url, "url");
    const host = target.hostname.toLowerCase();
    const secure = target.protocol === "https:";
    this.prune();

    return [...this.entries.values()]
      .filter((record) => {
        if (record.secure && !secure) return false;
        if (record.hostOnly ? record.domain !== host : !domainMatches(host, record.domain)) return false;
        return pathMatches(target.pathname || "/", record.path);
      })
      .sort((left, right) => right.path.length - left.path.length || left.createdAtMs - right.createdAtMs);
  }

  headerFor(url) {
    const matched = this.matching(url);
    if (!matched.length) return "";
    return matched.map((record) => `${record.name}=${record.value}`).join("; ");
  }

  clear() {
    this.entries.clear();
  }

  toJSON() {
    this.prune();
    return {
      schema: JAR_SCHEMA,
      cookies: [...this.entries.values()].map((record) => ({ ...record }))
    };
  }

  static fromJSON(value, options = {}) {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (parsed?.schema !== JAR_SCHEMA || !Array.isArray(parsed.cookies)) {
      throw new TypeError(`Cookie state must be a ${JAR_SCHEMA} record.`);
    }
    const jar = new CookieJar(options);
    const now = Date.now();
    for (const entry of parsed.cookies) {
      const record = ownRecord(entry, "cookie", 16);
      if (typeof record.name !== "string" || typeof record.domain !== "string") continue;
      if (record.expiresAtMs !== null && typeof record.expiresAtMs === "number" && record.expiresAtMs <= now) continue;
      jar.entries.set(jar.keyFor(record), {
        name: record.name,
        value: String(record.value ?? ""),
        domain: record.domain,
        hostOnly: record.hostOnly !== false,
        path: typeof record.path === "string" ? record.path : "/",
        secure: record.secure === true,
        httpOnly: record.httpOnly === true,
        sameSite: record.sameSite ?? null,
        expiresAtMs: typeof record.expiresAtMs === "number" ? record.expiresAtMs : null,
        createdAtMs: typeof record.createdAtMs === "number" ? record.createdAtMs : now
      });
    }
    return jar;
  }
}

export class ProxyRotator {
  constructor(options = {}) {
    const settings = ownRecord(options, "ProxyRotator options", 8);
    const unknown = Object.keys(settings).filter(
      (key) => !["proxies", "strategy", "maxFailures", "cooldownMs"].includes(key)
    );
    if (unknown.length) throw new TypeError(`Unknown ProxyRotator option(s): ${unknown.join(", ")}.`);

    if (!Array.isArray(settings.proxies) || settings.proxies.length === 0) {
      throw new TypeError("ProxyRotator requires a non-empty proxies array.");
    }
    if (settings.proxies.length > 1_000) throw new TypeError("proxies exceeds its 1000-entry limit.");

    const strategy = settings.strategy ?? "cycle";
    if (!ROTATOR_STRATEGIES.includes(strategy)) {
      throw new TypeError(`strategy must be one of: ${ROTATOR_STRATEGIES.join(", ")}.`);
    }

    this.strategy = strategy;
    this.maxFailures = integer(settings.maxFailures, "maxFailures", 3, 1, 100);
    this.cooldownMs = integer(settings.cooldownMs, "cooldownMs", 60_000, 0, 3_600_000);
    this.cursor = 0;
    this.sticky = new Map();
    this.pool = settings.proxies.map((entry) => {
      const url = httpUrl(entry, "proxies entry");
      return { url: url.toString(), failures: 0, disabledUntilMs: 0, uses: 0 };
    });
  }

  get available() {
    const now = Date.now();
    return this.pool.filter((entry) => entry.disabledUntilMs <= now);
  }

  get healthy() {
    return this.available.length;
  }

  next(key = null) {
    const candidates = this.available.length ? this.available : this.pool;
    if (this.strategy === "sticky" && key !== null) {
      const held = this.sticky.get(String(key));
      const stillGood = held && candidates.some((entry) => entry.url === held);
      if (stillGood) {
        const entry = this.pool.find((item) => item.url === held);
        entry.uses += 1;
        return entry.url;
      }
    }

    let chosen;
    if (this.strategy === "random") {
      chosen = candidates[Math.floor(Math.random() * candidates.length)];
    } else {
      chosen = candidates[this.cursor % candidates.length];
      this.cursor = (this.cursor + 1) % Math.max(1, candidates.length);
    }

    chosen.uses += 1;
    if (this.strategy === "sticky" && key !== null) this.sticky.set(String(key), chosen.url);
    return chosen.url;
  }

  report(proxyUrl, succeeded) {
    let normalized;
    try {
      normalized = httpUrl(proxyUrl, "proxyUrl").toString();
    } catch {
      return false;
    }
    const entry = this.pool.find((item) => item.url === normalized);
    if (!entry) return false;
    if (succeeded) {
      entry.failures = 0;
      entry.disabledUntilMs = 0;
      return true;
    }
    entry.failures += 1;
    if (entry.failures >= this.maxFailures) {
      entry.disabledUntilMs = Date.now() + this.cooldownMs;
      entry.failures = 0;
    }
    return true;
  }

  stats() {
    const now = Date.now();
    return Object.freeze(this.pool.map((entry) => Object.freeze({
      url: entry.url,
      uses: entry.uses,
      failures: entry.failures,
      disabled: entry.disabledUntilMs > now
    })));
  }
}

export class CrawlSession {
  constructor(options = {}) {
    const settings = ownRecord(options, "CrawlSession options", 32);
    const { cookies, proxy, ...defaults } = settings;

    if (cookies !== undefined && !(cookies instanceof CookieJar)) {
      throw new TypeError("cookies must be a CookieJar.");
    }
    if (proxy !== undefined && !(proxy instanceof ProxyRotator)) {
      throw new TypeError("proxy must be a ProxyRotator.");
    }

    this.cookies = cookies ?? new CookieJar();
    this.proxy = proxy ?? null;
    this.defaults = Object.freeze({ ...defaults });
    this.requests = 0;
  }

  headersFor(url) {
    const cookie = this.cookies.headerFor(url);
    return cookie ? Object.freeze({ cookie }) : Object.freeze({});
  }

  absorb(url, headers) {
    return this.cookies.setFromResponse(url, headers);
  }

  optionsFor(input = {}) {
    const request = ownRecord(input, "session request", 48);
    this.requests += 1;
    const merged = { ...this.defaults, ...request };
    if (this.proxy) merged.proxyUrl = this.proxy.next(merged.seeds?.[0] ?? merged.urls?.[0] ?? null);
    return merged;
  }

  toJSON() {
    return {
      requests: this.requests,
      cookies: this.cookies.toJSON(),
      proxies: this.proxy ? this.proxy.stats() : null
    };
  }
}

export const sessionDefaults = Object.freeze({
  jarSchema: JAR_SCHEMA,
  rotatorStrategies: ROTATOR_STRATEGIES
});
