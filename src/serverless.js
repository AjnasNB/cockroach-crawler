import { load } from "cheerio/slim";
import robotsParser from "robots-parser";
import { PACKAGE_VERSION } from "./version.js";

const CONFIG_KEYS = new Set([
  "allowedOrigins",
  "fetch",
  "accessToken",
  "userAgent",
  "maxPages",
  "maxDepth",
  "maxRequests",
  "maxBytes",
  "maxTotalBytes",
  "timeoutMs",
  "maxDurationMs",
  "maxRedirects",
  "delayMs"
]);
const INPUT_KEYS = new Set(["url", "maxPages", "maxDepth"]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export class ServerlessCrawlerError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "ServerlessCrawlerError";
    this.code = code;
    this.status = status;
  }
}

function snapshot(value, label, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${label} must be a plain object.`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const output = Object.create(null);
  for (const key of Reflect.ownKeys(descriptors)) {
    const printable = typeof key === "symbol" ? key.toString() : key;
    if (typeof key !== "string" || !keys.has(key)) throw new TypeError(`Unknown ${label} option '${printable}'.`);
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`${label} option '${key}' must be an own enumerable data property.`);
    }
    output[key] = descriptor.value;
  }
  return output;
}

function integer(value, label, fallback, minimum, maximum) {
  const candidate = value === undefined ? fallback : value;
  if (!Number.isSafeInteger(candidate) || candidate < minimum || candidate > maximum) {
    throw new TypeError(`${label} must be a safe integer from ${minimum} to ${maximum}.`);
  }
  return candidate;
}

function string(value, label, maximum, optional = false) {
  if (optional && (value === undefined || value === null || value === "")) return undefined;
  if (typeof value !== "string" || !value.trim() || value.length > maximum || /[\0\r\n]/.test(value)) {
    throw new TypeError(`${label} must be a non-empty primitive string up to ${maximum} characters.`);
  }
  return value.trim();
}

function snapshotStrings(value, label, maximum) {
  if (!Array.isArray(value) || !value.length || value.length > maximum) {
    throw new TypeError(`${label} must contain 1-${maximum} entries.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const values = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`${label}[${index}] must be an own enumerable data property.`);
    }
    values.push(descriptor.value);
  }
  return values;
}

function normalizeOrigin(value) {
  const primitive = string(value, "allowed origin", 2_048);
  const url = new URL(primitive);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new TypeError("Serverless allowed origins must be credential-free HTTPS origins without paths.");
  }
  if (isIpLiteral(url.hostname) || isLocalHostname(url.hostname)) {
    throw new TypeError("Serverless allowed origins cannot use IP literals or localhost names.");
  }
  return url.origin;
}

function policyHostname(hostname) {
  return String(hostname || "").replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
}

function isIpLiteral(hostname) {
  const host = policyHostname(hostname);
  return /^\d+(?:\.\d+){3}$/.test(host) || host.includes(":");
}

function isLocalHostname(hostname) {
  const host = policyHostname(hostname);
  return host === "localhost" || host.endsWith(".localhost");
}

function normalizeTarget(value, allowedOrigins) {
  const primitive = string(value, "url", 4_096);
  let url;
  try {
    url = new URL(primitive);
  } catch {
    throw new ServerlessCrawlerError("SERVERLESS_INVALID_URL", "url must be an absolute HTTPS URL.");
  }
  url.hash = "";
  if (url.protocol !== "https:" || url.username || url.password || isIpLiteral(url.hostname) || isLocalHostname(url.hostname)) {
    throw new ServerlessCrawlerError("SERVERLESS_INVALID_URL", "Only credential-free HTTPS URLs with DNS hostnames are supported.");
  }
  if (!allowedOrigins.has(url.origin)) {
    throw new ServerlessCrawlerError("SERVERLESS_ORIGIN_DENIED", "The target origin is not allowlisted.", 403);
  }
  return url.toString();
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function domText(node) {
  if (!node) return "";
  if (node.type === "text") return node.data || "";
  if (!Array.isArray(node.children)) return "";
  return node.children.map(domText).join(" ");
}

function metaContent($, name) {
  const expected = name.toLowerCase();
  let content = "";
  $("meta").each((_, element) => {
    if (content) return;
    const meta = $(element);
    const key = String(meta.attr("name") || meta.attr("property") || "").toLowerCase();
    if (key === expected) content = normalizeText(meta.attr("content"));
  });
  return content;
}

function extractLinks($, baseUrl, allowedOrigins, maximum = 500) {
  const links = [];
  const seen = new Set();
  $("a[href]").each((_, element) => {
    if (links.length >= maximum) return false;
    const raw = $(element).attr("href") || "";
    try {
      const url = new URL(raw, baseUrl);
      url.hash = "";
      if (url.protocol !== "https:" || url.username || url.password || !allowedOrigins.has(url.origin)) return;
      const normalized = url.toString();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        links.push(normalized);
      }
    } catch {
      // Ignore malformed links in untrusted HTML.
    }
  });
  return links;
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function abortError(signal) {
  return signal?.reason instanceof Error
    ? signal.reason
    : new ServerlessCrawlerError("SERVERLESS_TIMEOUT", "Crawler deadline exceeded.", 504);
}

async function abortable(promise, signal, onAbort) {
  if (!signal) return promise;
  if (signal.aborted) {
    await onAbort?.();
    throw abortError(signal);
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", handleAbort);
      callback(value);
    };
    const handleAbort = () => {
      Promise.resolve(onAbort?.()).catch(() => {});
      finish(reject, abortError(signal));
    };
    signal.addEventListener("abort", handleAbort, { once: true });
    Promise.resolve(promise).then(
      (value) => finish(resolve, value),
      (error) => finish(reject, error)
    );
  });
}

async function readBody(response, maximum, consume, signal) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > maximum) {
    await response.body?.cancel?.();
    throw new ServerlessCrawlerError("SERVERLESS_PAGE_TOO_LARGE", `Response exceeds ${maximum} bytes.`, 413);
  }
  const reader = response.body?.getReader?.();
  if (!reader) {
    const text = await abortable(response.text(), signal, () => response.body?.cancel?.());
    const bytes = new TextEncoder().encode(text).byteLength;
    if (bytes > maximum) throw new ServerlessCrawlerError("SERVERLESS_PAGE_TOO_LARGE", `Response exceeds ${maximum} bytes.`, 413);
    consume(bytes);
    return text;
  }
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { value, done } = await abortable(reader.read(), signal, () => reader.cancel());
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximum) {
        await reader.cancel();
        throw new ServerlessCrawlerError("SERVERLESS_PAGE_TOO_LARGE", `Response exceeds ${maximum} bytes.`, 413);
      }
      consume(value.byteLength);
      text += decoder.decode(value, { stream: true });
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  }
  return text + decoder.decode();
}

function timeoutSignal(deadlineAt, timeoutMs, reason = new ServerlessCrawlerError("SERVERLESS_TIMEOUT", "Crawler deadline exceeded.", 504)) {
  const controller = new AbortController();
  const remaining = Math.max(1, Math.min(timeoutMs, deadlineAt - Date.now()));
  const timer = setTimeout(() => controller.abort(reason), remaining);
  return { signal: controller.signal, close: () => clearTimeout(timer) };
}

async function fetchManual(url, config, state, { robots = false } = {}) {
  let current = normalizeTarget(url, config.allowedOrigins);
  for (let hop = 0; ; hop += 1) {
    if (!robots && state.completedFinalUrls.has(current)) return null;
    if (!robots) {
      const policy = await robotsFor(new URL(current).origin, config, state);
      if (!policy.isAllowed(current, config.userAgent)) {
        throw new ServerlessCrawlerError("SERVERLESS_ROBOTS_DENIED", "robots.txt denied this URL.", 403);
      }
    }
    if (state.requests >= config.maxRequests) throw new ServerlessCrawlerError("SERVERLESS_REQUEST_LIMIT", "Request budget exhausted.", 429);
    if (Date.now() >= state.deadlineAt) throw new ServerlessCrawlerError("SERVERLESS_TIMEOUT", "Crawler deadline exceeded.", 504);
    state.requests += 1;
    const timer = timeoutSignal(state.deadlineAt, config.timeoutMs);
    try {
      const response = await config.fetch(current, {
        method: "GET",
        redirect: "manual",
        headers: { "user-agent": config.userAgent, accept: robots ? "text/plain" : "text/html,application/xhtml+xml" },
        signal: timer.signal
      });
      if (REDIRECT_STATUSES.has(response.status)) {
        await response.body?.cancel?.();
        timer.close();
        if (hop >= config.maxRedirects) throw new ServerlessCrawlerError("SERVERLESS_REDIRECT_LIMIT", "Redirect limit exceeded.", 502);
        const location = response.headers.get("location");
        if (!location) throw new ServerlessCrawlerError("SERVERLESS_BAD_REDIRECT", "Redirect response has no location.", 502);
        current = normalizeTarget(new URL(location, current).toString(), config.allowedOrigins);
        continue;
      }
      return { response, finalUrl: current, signal: timer.signal, close: timer.close };
    } catch (error) {
      timer.close();
      if (error instanceof ServerlessCrawlerError) throw error;
      if (timer.signal.aborted && timer.signal.reason instanceof Error) throw timer.signal.reason;
      throw new ServerlessCrawlerError("SERVERLESS_FETCH_FAILED", "The upstream request failed.", 502);
    }
  }
}

async function robotsFor(origin, config, state) {
  if (state.robots.has(origin)) return state.robots.get(origin);
  const url = `${origin}/robots.txt`;
  const resource = await fetchManual(url, config, state, { robots: true });
  try {
    const { response, finalUrl } = resource;
    if (response.status === 404 || response.status === 410) {
      await response.body?.cancel?.();
      const parser = robotsParser(finalUrl, "");
      state.robots.set(origin, parser);
      return parser;
    }
    if (!response.ok) {
      await response.body?.cancel?.();
      throw new ServerlessCrawlerError("SERVERLESS_ROBOTS_UNAVAILABLE", "robots.txt could not be verified; crawl denied.", 502);
    }
    const text = await readBody(response, Math.min(config.maxBytes, 256 * 1024), (bytes) => state.consume(bytes), resource.signal);
    const parser = robotsParser(finalUrl, text);
    state.robots.set(origin, parser);
    return parser;
  } finally {
    resource.close();
  }
}

async function deadlineDelay(milliseconds, deadlineAt) {
  const remaining = deadlineAt - Date.now();
  if (remaining <= 0) throw new ServerlessCrawlerError("SERVERLESS_TIMEOUT", "Crawler deadline exceeded.", 504);
  if (milliseconds > remaining) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
    throw new ServerlessCrawlerError("SERVERLESS_TIMEOUT", "Crawler deadline exceeded.", 504);
  }
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readRequestBody(request, maximum) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > maximum) {
    await request.body?.cancel?.();
    throw new ServerlessCrawlerError("SERVERLESS_INPUT_TOO_LARGE", "Request body is too large.", 413);
  }
  const timer = timeoutSignal(
    Date.now() + 5_000,
    5_000,
    new ServerlessCrawlerError("SERVERLESS_INPUT_TIMEOUT", "Request body deadline exceeded.", 408)
  );
  try {
    const reader = request.body?.getReader?.();
    if (!reader) {
      const text = await abortable(request.text(), timer.signal, () => request.body?.cancel?.());
      if (new TextEncoder().encode(text).byteLength > maximum) {
        throw new ServerlessCrawlerError("SERVERLESS_INPUT_TOO_LARGE", "Request body is too large.", 413);
      }
      return text;
    }
    const decoder = new TextDecoder();
    let bytes = 0;
    let text = "";
    try {
      while (true) {
        const { value, done } = await abortable(reader.read(), timer.signal, () => reader.cancel());
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maximum) {
          await reader.cancel();
          throw new ServerlessCrawlerError("SERVERLESS_INPUT_TOO_LARGE", "Request body is too large.", 413);
        }
        text += decoder.decode(value, { stream: true });
      }
      return text + decoder.decode();
    } catch (error) {
      await reader.cancel().catch(() => {});
      throw error;
    }
  } finally {
    timer.close();
  }
}

async function extractPage(html, url, depth, discoveredFrom, allowedOrigins) {
  const $ = load(html);
  $("script, style, noscript, svg").remove();
  const text = normalizeText(domText($.root()[0]));
  return Object.freeze({
    url,
    title: normalizeText(domText($("title").first()[0])),
    description: metaContent($, "description") || metaContent($, "og:description"),
    h1: normalizeText(domText($("h1").first()[0])),
    text,
    markdown: text,
    links: Object.freeze(extractLinks($, url, allowedOrigins)),
    depth,
    discoveredFrom,
    fetchedAt: new Date().toISOString(),
    contentHash: await sha256(`${url}\0${text}`)
  });
}

function constantTimeEqual(left, right) {
  const a = new TextEncoder().encode(String(left || ""));
  const b = new TextEncoder().encode(String(right || ""));
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) difference |= (a[index] || 0) ^ (b[index] || 0);
  return difference === 0;
}

function json(value, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(value, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extraHeaders
    }
  });
}

export function createServerlessCrawler(inputConfig) {
  const input = snapshot(inputConfig, "serverless crawler", CONFIG_KEYS);
  const origins = new Set(snapshotStrings(input.allowedOrigins, "allowedOrigins", 32).map(normalizeOrigin));
  const fetchImpl = input.fetch || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new TypeError("A Fetch-compatible function is required.");
  const accessToken = string(input.accessToken, "accessToken", 8_192, true);
  const config = Object.freeze({
    allowedOrigins: origins,
    fetch: fetchImpl,
    accessToken,
    userAgent: string(input.userAgent, "userAgent", 256, true) || `CockroachCrawler-Serverless/${PACKAGE_VERSION}`,
    maxPages: integer(input.maxPages, "maxPages", 5, 1, 25),
    maxDepth: integer(input.maxDepth, "maxDepth", 1, 0, 3),
    maxRequests: integer(input.maxRequests, "maxRequests", 25, 1, 100),
    maxBytes: integer(input.maxBytes, "maxBytes", 1024 * 1024, 1_024, 5 * 1024 * 1024),
    maxTotalBytes: integer(input.maxTotalBytes, "maxTotalBytes", 5 * 1024 * 1024, 1_024, 20 * 1024 * 1024),
    timeoutMs: integer(input.timeoutMs, "timeoutMs", 8_000, 100, 30_000),
    maxDurationMs: integer(input.maxDurationMs, "maxDurationMs", 15_000, 100, 60_000),
    maxRedirects: integer(input.maxRedirects, "maxRedirects", 3, 0, 5),
    delayMs: integer(input.delayMs, "delayMs", 100, 0, 5_000)
  });

  async function crawl(value) {
    const request = snapshot(value, "serverless crawl", INPUT_KEYS);
    const maxPages = integer(request.maxPages, "maxPages", config.maxPages, 1, config.maxPages);
    const maxDepth = integer(request.maxDepth, "maxDepth", config.maxDepth, 0, config.maxDepth);
    const seed = normalizeTarget(request.url, config.allowedOrigins);
    const state = {
      requests: 0,
      bytes: 0,
      deadlineAt: Date.now() + config.maxDurationMs,
      robots: new Map(),
      completedFinalUrls: new Set(),
      consume(bytes) {
        this.bytes += bytes;
        if (this.bytes > config.maxTotalBytes) {
          throw new ServerlessCrawlerError("SERVERLESS_TOTAL_BYTES_LIMIT", "Total byte budget exhausted.", 413);
        }
      }
    };
    const queue = [{ url: seed, depth: 0, discoveredFrom: null }];
    const seen = new Set([seed]);
    const pages = [];
    const failures = [];
    while (queue.length && pages.length < maxPages) {
      const item = queue.shift();
      try {
        const resource = await fetchManual(item.url, config, state);
        if (!resource) continue;
        try {
          const { response, finalUrl } = resource;
          seen.add(finalUrl);
          if (state.completedFinalUrls.has(finalUrl)) {
            await response.body?.cancel?.();
            continue;
          }
          if (!response.ok) {
            await response.body?.cancel?.();
            failures.push({ url: item.url, code: "SERVERLESS_HTTP_ERROR", error: `HTTP ${response.status}` });
            continue;
          }
          const contentType = response.headers.get("content-type") || "";
          if (!/(?:text\/html|application\/xhtml\+xml)/i.test(contentType)) {
            await response.body?.cancel?.();
            failures.push({ url: item.url, code: "SERVERLESS_UNSUPPORTED_CONTENT", error: "Only HTML is supported." });
            continue;
          }
          const html = await readBody(response, config.maxBytes, (bytes) => state.consume(bytes), resource.signal);
          const page = await extractPage(html, finalUrl, item.depth, item.discoveredFrom, config.allowedOrigins);
          state.completedFinalUrls.add(finalUrl);
          pages.push(page);
          if (item.depth < maxDepth) {
            for (const link of page.links) {
              if (seen.has(link)) continue;
              seen.add(link);
              queue.push({ url: link, depth: item.depth + 1, discoveredFrom: finalUrl });
            }
          }
        } finally {
          resource.close();
        }
        if (config.delayMs && queue.length) await deadlineDelay(config.delayMs, state.deadlineAt);
      } catch (error) {
        if (error instanceof ServerlessCrawlerError && ["SERVERLESS_REQUEST_LIMIT", "SERVERLESS_TIMEOUT", "SERVERLESS_TOTAL_BYTES_LIMIT"].includes(error.code)) {
          throw error;
        }
        failures.push({
          url: item.url,
          code: error instanceof ServerlessCrawlerError ? error.code : "SERVERLESS_PAGE_FAILED",
          error: error instanceof Error ? error.message : "Page failed."
        });
      }
    }
    return Object.freeze({
      pages: Object.freeze(pages),
      failures: Object.freeze(failures.map(Object.freeze)),
      stats: Object.freeze({
        pages: pages.length,
        failures: failures.length,
        requests: state.requests,
        bytes: state.bytes,
        queued: queue.length,
        seen: seen.size
      }),
      runtime: Object.freeze({
        tier: "serverless",
        version: PACKAGE_VERSION,
        browser: false,
        authenticatedProviders: false,
        dnsValidation: false,
        resolvedAddressClassification: false,
        dnsPinning: false,
        allowlistScope: "operator-owned-or-trusted-origins",
        allowlistedOrigins: Object.freeze([...config.allowedOrigins])
      })
    });
  }

  async function handle(request) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true,
        product: "Cockroach Crawler Serverless",
        version: PACKAGE_VERSION,
        configured: Boolean(config.accessToken),
        capabilities: {
          html: true,
          robots: true,
          browser: false,
          socialProviders: false,
          arbitraryOrigins: false,
          dnsValidation: false,
          resolvedAddressClassification: false,
          dnsPinning: false
        }
      });
    }
    if (request.method !== "POST" || url.pathname !== "/v1/crawl") {
      return json({ error: "Not found." }, 404);
    }
    if (!config.accessToken) {
      return json({ error: "Serverless API token is not configured.", code: "SERVERLESS_AUTH_NOT_CONFIGURED" }, 503);
    }
    const authorization = request.headers.get("authorization") || "";
    const expected = `Bearer ${config.accessToken}`;
    if (!constantTimeEqual(authorization, expected)) {
      return json({ error: "Unauthorized.", code: "SERVERLESS_UNAUTHORIZED" }, 401, { "www-authenticate": "Bearer" });
    }
    let bodyText;
    try {
      bodyText = await readRequestBody(request, 8 * 1024);
    } catch (error) {
      if (error instanceof ServerlessCrawlerError) {
        return json({ error: error.message, code: error.code }, error.status);
      }
      return json({ error: "Request body could not be read.", code: "SERVERLESS_INVALID_INPUT" }, 400);
    }
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return json({ error: "Request body must be JSON.", code: "SERVERLESS_INVALID_JSON" }, 400);
    }
    try {
      return json(await crawl(body));
    } catch (error) {
      if (error instanceof ServerlessCrawlerError) {
        return json({ error: error.message, code: error.code }, error.status);
      }
      if (error instanceof TypeError) {
        return json({ error: error.message, code: "SERVERLESS_INVALID_INPUT" }, 400);
      }
      return json({ error: "Serverless crawl failed.", code: "SERVERLESS_INTERNAL_ERROR" }, 500);
    }
  }

  return Object.freeze({ crawl, fetch: handle });
}
