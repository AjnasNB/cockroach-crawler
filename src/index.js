import { createHash } from "node:crypto";
import { createServer as createTcpServer } from "node:net";
import * as cheerio from "cheerio";
import robotsParser from "robots-parser";
import TurndownService from "turndown";
import { getSetCookies } from "undici";
import { PACKAGE_VERSION } from "./version.js";
import {
  createCrawlerSecurityError,
  resolveUrlTarget,
  withPinnedFetch
} from "./security.js";

const DEFAULT_USER_AGENT = `CockroachCrawler/${PACKAGE_VERSION} (+https://github.com/AjnasNB/cockroach-crawler)`;
const DEFAULT_MAX_BYTES = 3 * 1024 * 1024;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const BROWSER_WAIT_STATES = new Set(["load", "domcontentloaded", "networkidle", "commit"]);
const EXTRACTION_SOURCES = new Set(["text", "html", "attribute"]);
const EXTRACTION_KEYS = new Set([
  "fields",
  "maxFields",
  "maxItemsPerField",
  "maxInputCharacters",
  "maxValueLength",
  "maxTotalValues",
  "maxTotalCharacters"
]);
const EXTRACTION_FIELD_KEYS = new Set([
  "selector",
  "source",
  "attribute",
  "multiple",
  "limit",
  "resolveUrl"
]);
const SENSITIVE_PATH_PATTERN = /(?:login|logout|signin|sign-in|signup|auth|account|admin|dashboard|checkout|cart|billing|private|session|password|reset|wp-admin)/i;
const MAX_SENSITIVE_DECODE_PASSES = 8;
const BROWSER_KEYS = new Set([
  "headless",
  "headed",
  "channel",
  "executablePath",
  "storageState",
  "saveStorageState",
  "waitUntil",
  "waitFor",
  "click"
]);
const CRAWL_OPTION_KEYS = new Set([
  "seeds",
  "urls",
  "maxPages",
  "maxSeeds",
  "maxRequests",
  "maxQueue",
  "maxLinksPerPage",
  "maxUrlLength",
  "maxDepth",
  "concurrency",
  "sameOrigin",
  "allowedOrigins",
  "include",
  "exclude",
  "skipSensitivePaths",
  "publicOnly",
  "includeSitemaps",
  "maxSitemaps",
  "maxUrlsPerSitemap",
  "obeyRobots",
  "allowPrivateNetworks",
  "userAgent",
  "delayMs",
  "timeoutMs",
  "maxDurationMs",
  "maxBytes",
  "maxTotalBytes",
  "maxRedirects",
  "maxRetries",
  "retryDelayMs",
  "browser",
  "rendered",
  "extract",
  "onPage",
  "onError",
  "signal",
  "dnsLookup"
]);
const BROWSER_REQUEST_HEADER_BLOCKLIST = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);
const BROWSER_RESPONSE_HEADER_BLOCKLIST = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
  "set-cookie",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);

function snapshotOptionRecord(value, label, recognizedKeys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of recognizedKeys) {
    const descriptor = Object.hasOwn(descriptors, key) ? descriptors[key] : null;
    if (!descriptor && key in value) {
      throw new TypeError(`Inherited ${label} option '${key}' is not allowed.`);
    }
    if (descriptor && (!descriptor.enumerable || !Object.hasOwn(descriptor, "value"))) {
      throw new TypeError(`${label} option '${key}' must be an own enumerable data property.`);
    }
  }
  const snapshot = Object.create(null);
  for (const key of Reflect.ownKeys(descriptors)) {
    const printable = typeof key === "symbol" ? key.toString() : key;
    if (typeof key !== "string" || !recognizedKeys.has(key)) {
      throw new TypeError(`Unknown ${label} option '${printable}'.`);
    }
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`${label} option '${key}' must be an own enumerable data property.`);
    }
    snapshot[key] = descriptor.value;
  }
  return snapshot;
}

function snapshotArrayValues(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const length = descriptors.length?.value;
  if (!Number.isSafeInteger(length) || length < 0) throw new TypeError(`${label} has an invalid length.`);
  const values = [];
  for (let index = 0; index < length; index += 1) {
    const key = String(index);
    const descriptor = descriptors[key];
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`${label}[${index}] must be an own enumerable data property.`);
    }
    values.push(descriptor.value);
  }
  for (const key of Reflect.ownKeys(descriptors)) {
    if (key === "length") continue;
    const index = typeof key === "string" && /^(?:0|[1-9]\d*)$/.test(key) ? Number(key) : -1;
    if (!Number.isSafeInteger(index) || index < 0 || index >= length) {
      const printable = typeof key === "symbol" ? key.toString() : key;
      throw new TypeError(`${label} contains unsupported property '${printable}'.`);
    }
  }
  return values;
}

function snapshotNamedDataRecord(value, label, maximumProperties) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const snapshot = Object.create(null);
  let count = 0;
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== "string") {
      throw new TypeError(`${label} contains an unsupported symbol property.`);
    }
    if (!/^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/.test(key)
      || key === "__proto__"
      || key === "constructor"
      || key === "prototype") {
      throw new TypeError(`${label} contains invalid field name '${key}'.`);
    }
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`${label}.${key} must be an own enumerable data property.`);
    }
    count += 1;
    if (count > maximumProperties) {
      throw new TypeError(`${label} exceeds maxFields (${count} > ${maximumProperties}).`);
    }
    snapshot[key] = descriptor.value;
  }
  return snapshot;
}

function abortError(signal) {
  if (signal?.reason instanceof Error) return signal.reason;
  const error = new Error("Crawler operation was aborted.");
  error.name = "AbortError";
  error.code = "CRAWL_ABORTED";
  return error;
}

function limitError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function sleep(ms, signal) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError(signal));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError(signal));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function awaitWithSignal(value, signal) {
  const promise = Promise.resolve(value);
  if (!signal) return promise;
  if (signal.aborted) {
    promise.catch(() => {});
    return Promise.reject(abortError(signal));
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(abortError(signal));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (result) => {
        signal.removeEventListener("abort", onAbort);
        resolve(result);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      }
    );
  });
}

async function runBoundedCallback(callback, value, signal) {
  if (!callback) return;
  if (signal?.aborted) throw abortError(signal);
  // Starting through a promise ensures synchronous throws use the same path.
  // Synchronous CPU work cannot be preempted, but an asynchronous callback
  // can no longer keep the crawl alive beyond its AbortSignal deadline.
  await awaitWithSignal(Promise.resolve().then(() => callback(value)), signal);
}

function asList(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function toUrl(value, base) {
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

function normalizeUrl(value, maxLength = 32_768) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError("Only absolute HTTP(S) URLs are supported.");
  }
  if (url.username || url.password) {
    throw new TypeError("URLs containing embedded credentials are not allowed.");
  }
  url.hash = "";
  if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) {
    url.port = "";
  }
  const normalized = url.toString();
  if (normalized.length > maxLength) {
    throw new TypeError(`URL exceeds maxUrlLength (${normalized.length} > ${maxLength}).`);
  }
  return normalized;
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
  } catch {
    return false;
  }
}

function integerOption(value, name, fallback, minimum, maximum) {
  const candidate = value === undefined ? fallback : value;
  if (typeof candidate !== "number" || !Number.isSafeInteger(candidate) || candidate < minimum || candidate > maximum) {
    throw new TypeError(`${name} must be a safe integer from ${minimum} to ${maximum}.`);
  }
  return candidate;
}

function normalizeAllowedOrigins(values = []) {
  const snapshot = snapshotArrayValues(values, "allowedOrigins");
  return [...new Set(snapshot.map((value) => {
    if (typeof value !== "string") {
      throw new TypeError("allowedOrigins entries must be primitive HTTP(S) origin strings.");
    }
    if (!isHttpUrl(value)) throw new TypeError(`Invalid allowed origin '${value}'.`);
    const url = new URL(value);
    if (url.pathname !== "/" || url.search || url.hash) {
      throw new TypeError(`allowedOrigins entries must be origins without paths: '${value}'.`);
    }
    return url.origin;
  }))];
}

function compilePatterns(values, label) {
  const list = asList(values);
  if (list.length > 20) throw new TypeError(`${label} accepts at most 20 patterns.`);
  return list.map((value) => {
    if (value instanceof RegExp) return value;
    const source = String(value);
    if (!source || source.length > 256) {
      throw new TypeError(`${label} patterns must be 1-256 characters.`);
    }
    // Reject the most common catastrophic nested-quantifier shape. URL length
    // and pattern count are bounded as a second line of defense.
    if (/(?:\([^)]*[+*][^)]*\)|\[[^\]]*\][+*])[+*{]/.test(source)) {
      throw new TypeError(`Unsafe ${label} regex '${source}'.`);
    }
    try {
      return new RegExp(source);
    } catch (error) {
      throw new TypeError(`Invalid ${label} regex '${source}': ${error.message}`);
    }
  });
}

function matchesAny(value, patterns) {
  return patterns.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });
}

function hasSensitivePath(value) {
  const parsed = new URL(value);
  let candidate = `${parsed.pathname}${parsed.search}`;
  for (let pass = 0; pass < MAX_SENSITIVE_DECODE_PASSES; pass += 1) {
    if (SENSITIVE_PATH_PATTERN.test(candidate.normalize("NFKC"))) return true;
    let decoded;
    try {
      decoded = decodeURIComponent(candidate);
    } catch {
      // A malformed escape can be interpreted differently by downstream
      // servers/frameworks. The path heuristic therefore fails closed.
      return true;
    }
    if (decoded === candidate) return false;
    candidate = decoded;
  }
  // Excessively nested encoding is ambiguous by design. Do not let it evade
  // the sensitive-path boundary merely by exceeding our canonicalization cap.
  return true;
}

function stringOption(value, name, maximum = 4_096) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !value || value.length > maximum || /[\r\n\0]/.test(value)) {
    throw new TypeError(`${name} must be a non-empty string up to ${maximum} characters without control line breaks.`);
  }
  return value;
}

function normalizeBrowserOptions(value, timeoutMs) {
  if (!value) return null;
  const browser = value === true
    ? Object.create(null)
    : snapshotOptionRecord(value, "browser", BROWSER_KEYS);
  const unknown = Object.keys(browser).filter((key) => !BROWSER_KEYS.has(key));
  if (unknown.length) throw new TypeError(`Unknown browser option(s): ${unknown.join(", ")}.`);
  if (browser.headed !== undefined && typeof browser.headed !== "boolean") {
    throw new TypeError("browser.headed must be a boolean.");
  }
  if (browser.headless !== undefined && typeof browser.headless !== "boolean") {
    throw new TypeError("browser.headless must be a boolean.");
  }
  if (browser.headed === true && browser.headless === true) {
    throw new TypeError("browser.headed and browser.headless cannot both be true.");
  }

  const waitUntil = browser.waitUntil || "domcontentloaded";
  if (!BROWSER_WAIT_STATES.has(waitUntil)) {
    throw new TypeError(`browser.waitUntil must be one of: ${[...BROWSER_WAIT_STATES].join(", ")}.`);
  }

  let waitFor = browser.waitFor ?? null;
  if (waitFor !== null) {
    if (typeof waitFor === "number") {
      waitFor = integerOption(waitFor, "browser.waitFor", 0, 0, timeoutMs);
    } else {
      waitFor = stringOption(waitFor, "browser.waitFor", 2_048);
      const match = waitFor.match(/^ms:(\d+)$/i);
      if (match) integerOption(Number(match[1]), "browser.waitFor delay", 0, 0, timeoutMs);
    }
  }

  const click = asList(browser.click);
  if (click.length > 10) throw new TypeError("browser.click accepts at most 10 selectors.");
  const selectors = click.map((selector) => stringOption(selector, "browser.click selector", 2_048));

  return {
    headless: browser.headless ?? !browser.headed,
    channel: stringOption(browser.channel, "browser.channel", 128),
    executablePath: stringOption(browser.executablePath, "browser.executablePath", 4_096),
    storageState: stringOption(browser.storageState, "browser.storageState", 4_096),
    saveStorageState: stringOption(browser.saveStorageState, "browser.saveStorageState", 4_096),
    waitUntil,
    waitFor,
    click: selectors
  };
}

function normalizeExtractionOptions(value) {
  if (value === undefined || value === null || value === false) return null;
  const extraction = snapshotOptionRecord(value, "extract", EXTRACTION_KEYS);
  const maxFields = integerOption(extraction.maxFields, "extract.maxFields", 32, 1, 128);
  const maxItemsPerField = integerOption(
    extraction.maxItemsPerField,
    "extract.maxItemsPerField",
    50,
    1,
    1_000
  );
  const maxInputCharacters = integerOption(
    extraction.maxInputCharacters,
    "extract.maxInputCharacters",
    5 * 1024 * 1024,
    1_024,
    50 * 1024 * 1024
  );
  const maxValueLength = integerOption(
    extraction.maxValueLength,
    "extract.maxValueLength",
    16_384,
    1,
    262_144
  );
  const maxTotalValues = integerOption(
    extraction.maxTotalValues,
    "extract.maxTotalValues",
    500,
    1,
    10_000
  );
  const maxTotalCharacters = integerOption(
    extraction.maxTotalCharacters,
    "extract.maxTotalCharacters",
    262_144,
    1,
    4 * 1024 * 1024
  );
  const rawFields = snapshotNamedDataRecord(extraction.fields, "extract.fields", maxFields);
  if (!Object.keys(rawFields).length) throw new TypeError("extract.fields must contain at least one field.");

  const selectorValidator = cheerio.load("<html><body></body></html>");
  const fields = Object.create(null);
  for (const [name, rawField] of Object.entries(rawFields)) {
    const field = typeof rawField === "string"
      ? { selector: rawField }
      : snapshotOptionRecord(rawField, `extract.fields.${name}`, EXTRACTION_FIELD_KEYS);
    const selector = stringOption(field.selector, `extract.fields.${name}.selector`, 2_048);
    try {
      selectorValidator(selector);
    } catch (cause) {
      const error = new TypeError(`extract.fields.${name}.selector is not a valid CSS selector.`);
      error.cause = cause;
      throw error;
    }
    const source = field.source ?? "text";
    if (!EXTRACTION_SOURCES.has(source)) {
      throw new TypeError(
        `extract.fields.${name}.source must be one of: ${[...EXTRACTION_SOURCES].join(", ")}.`
      );
    }
    if (field.multiple !== undefined && typeof field.multiple !== "boolean") {
      throw new TypeError(`extract.fields.${name}.multiple must be a boolean.`);
    }
    if (field.resolveUrl !== undefined && typeof field.resolveUrl !== "boolean") {
      throw new TypeError(`extract.fields.${name}.resolveUrl must be a boolean.`);
    }
    const attribute = source === "attribute"
      ? stringOption(field.attribute, `extract.fields.${name}.attribute`, 256)
      : undefined;
    if (source !== "attribute" && field.attribute !== undefined) {
      throw new TypeError(`extract.fields.${name}.attribute requires source='attribute'.`);
    }
    if (field.resolveUrl === true && source !== "attribute") {
      throw new TypeError(`extract.fields.${name}.resolveUrl requires source='attribute'.`);
    }
    if (attribute && !/^[A-Za-z_:][A-Za-z0-9_.:-]*$/.test(attribute)) {
      throw new TypeError(`extract.fields.${name}.attribute is not a valid HTML attribute name.`);
    }
    const multiple = field.multiple === true;
    fields[name] = Object.freeze({
      selector,
      source,
      attribute,
      multiple,
      limit: integerOption(
        field.limit,
        `extract.fields.${name}.limit`,
        multiple ? maxItemsPerField : 1,
        1,
        maxItemsPerField
      ),
      resolveUrl: field.resolveUrl === true
    });
  }

  return Object.freeze({
    fields: Object.freeze(fields),
    maxFields,
    maxItemsPerField,
    maxInputCharacters,
    maxValueLength,
    maxTotalValues,
    maxTotalCharacters
  });
}

function normalizeOptions(input, seedCount) {
  input = snapshotOptionRecord(input, "crawl", CRAWL_OPTION_KEYS);
  const maxPages = integerOption(input.maxPages, "maxPages", 50, 1, 10_000);
  const maxSeeds = integerOption(input.maxSeeds, "maxSeeds", 100, 1, 1_000);
  if (seedCount > maxSeeds) throw new TypeError(`seeds exceeds maxSeeds (${seedCount} > ${maxSeeds}).`);
  const maxBytes = integerOption(input.maxBytes, "maxBytes", DEFAULT_MAX_BYTES, 1_024, 50 * 1024 * 1024);
  const defaultTotalBytes = Math.min(256 * 1024 * 1024, Math.max(maxBytes, maxBytes * Math.min(maxPages, 50)));
  const timeoutMs = integerOption(input.timeoutMs, "timeoutMs", 15_000, 100, 120_000);
  const userAgent = String(input.userAgent || DEFAULT_USER_AGENT);
  if (!userAgent || userAgent.length > 256 || /[\r\n\0]/.test(userAgent)) {
    throw new TypeError("userAgent must be 1-256 characters without line breaks.");
  }
  const sameOrigin = input.sameOrigin !== false;
  if (input.skipSensitivePaths !== undefined && typeof input.skipSensitivePaths !== "boolean") {
    throw new TypeError("skipSensitivePaths must be a boolean.");
  }
  if (input.publicOnly !== undefined && typeof input.publicOnly !== "boolean") {
    throw new TypeError("publicOnly must be a boolean.");
  }
  const allowedOrigins = normalizeAllowedOrigins(input.allowedOrigins || []);
  if (!sameOrigin && !allowedOrigins.length) {
    throw new TypeError("sameOrigin=false requires an explicit allowedOrigins allowlist.");
  }

  return {
    maxPages,
    maxSeeds,
    maxRequests: integerOption(input.maxRequests, "maxRequests", Math.min(50_000, Math.max(50, maxPages * 8)), 1, 50_000),
    maxQueue: integerOption(input.maxQueue, "maxQueue", Math.min(100_000, Math.max(100, maxPages * 20)), 1, 100_000),
    maxLinksPerPage: integerOption(input.maxLinksPerPage, "maxLinksPerPage", 2_000, 1, 20_000),
    maxUrlLength: integerOption(input.maxUrlLength, "maxUrlLength", 4_096, 256, 32_768),
    maxDepth: integerOption(input.maxDepth, "maxDepth", 2, 0, 100),
    concurrency: integerOption(input.concurrency, "concurrency", 4, 1, 64),
    sameOrigin,
    allowedOrigins,
    include: compilePatterns(input.include, "include"),
    exclude: compilePatterns(input.exclude, "exclude"),
    skipSensitivePaths: input.skipSensitivePaths ?? input.publicOnly ?? true,
    includeSitemaps: input.includeSitemaps === true,
    maxSitemaps: integerOption(input.maxSitemaps, "maxSitemaps", 20, 0, 1_000),
    maxUrlsPerSitemap: integerOption(input.maxUrlsPerSitemap, "maxUrlsPerSitemap", 5_000, 1, 50_000),
    obeyRobots: input.obeyRobots !== false,
    allowPrivateNetworks: input.allowPrivateNetworks === true,
    userAgent,
    delayMs: integerOption(input.delayMs, "delayMs", 250, 0, 60_000),
    timeoutMs,
    maxDurationMs: integerOption(input.maxDurationMs, "maxDurationMs", 600_000, 100, 3_600_000),
    maxBytes,
    maxTotalBytes: integerOption(input.maxTotalBytes, "maxTotalBytes", defaultTotalBytes, 1_024, 512 * 1024 * 1024),
    maxRedirects: integerOption(input.maxRedirects, "maxRedirects", 5, 0, 10),
    maxRetries: integerOption(input.maxRetries, "maxRetries", 1, 0, 5),
    retryDelayMs: integerOption(input.retryDelayMs, "retryDelayMs", 250, 0, 30_000),
    browser: normalizeBrowserOptions(input.browser || input.rendered, timeoutMs),
    extract: normalizeExtractionOptions(input.extract),
    onPage: typeof input.onPage === "function" ? input.onPage : null,
    onError: typeof input.onError === "function" ? input.onError : null,
    signal: input.signal || null,
    dnsLookup: input.dnsLookup || null
  };
}

async function readResponseBody(response, options) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > options.maxBytes) {
    await response.body?.cancel();
    throw new Error(`Response too large: ${declaredLength} bytes`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    const bytes = Buffer.byteLength(text);
    if (bytes > options.maxBytes) throw new Error(`Response exceeded maxBytes: ${options.maxBytes}`);
    options.consumeBytes?.(bytes);
    return { text, bytes };
  }

  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > options.maxBytes) {
      await reader.cancel();
      throw new Error(`Response exceeded maxBytes: ${options.maxBytes}`);
    }
    options.consumeBytes?.(value.byteLength);
    chunks.push(Buffer.from(value));
  }
  return { text: Buffer.concat(chunks).toString("utf8"), bytes: received };
}

async function fetchText(startUrl, options) {
  let currentUrl = normalizeUrl(startUrl, options.maxUrlLength);
  const redirectChain = [];

  for (let hop = 0; ; hop += 1) {
    if (options.signal?.aborted) throw abortError(options.signal);
    if (!options.isUrlAllowed(currentUrl)) {
      throw createCrawlerSecurityError("Crawler URL is outside the configured URL policy.", {
        url: currentUrl,
        origin: new URL(currentUrl).origin
      });
    }
    await options.beforeRequest?.(currentUrl);

    const controller = new AbortController();
    const remainingMs = Math.max(1, options.deadlineAt - Date.now());
    const requestTimeoutMs = Math.min(options.timeoutMs, remainingMs);
    const timeout = setTimeout(() => {
      controller.abort(limitError("CRAWL_REQUEST_TIMEOUT", `Request timed out after ${requestTimeoutMs}ms.`));
    }, requestTimeoutMs);
    const signal = options.signal
      ? AbortSignal.any([options.signal, controller.signal])
      : controller.signal;

    try {
      const result = await withPinnedFetch(currentUrl, {
        headers: {
          "user-agent": options.userAgent,
          accept: options.accept || "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5"
        },
        signal
      }, {
        allowPrivateNetworks: options.allowPrivateNetworks,
        lookup: options.dnsLookup || undefined,
        signal
      }, async (response, target) => {
        if (REDIRECT_STATUSES.has(response.status)) {
          const location = response.headers.get("location");
          await response.body?.cancel();
          if (!location) throw new Error(`Redirect response ${response.status} did not include Location.`);
          let redirect;
          try {
            redirect = normalizeUrl(new URL(location, target.url), options.maxUrlLength);
          } catch (cause) {
            const error = createCrawlerSecurityError("Redirect target failed URL policy validation.", {
              from: target.url.toString(),
              location
            });
            error.cause = cause;
            throw error;
          }
          return {
            redirect,
            status: response.status
          };
        }

        const { text, bytes } = await readResponseBody(response, options);
        return {
          status: response.status,
          ok: response.ok,
          text,
          bytes,
          contentType: response.headers.get("content-type") || "",
          retryAfter: response.headers.get("retry-after"),
          etag: response.headers.get("etag"),
          lastModified: response.headers.get("last-modified")
        };
      });

      if (!result.redirect) return { ...result, finalUrl: currentUrl, redirectChain };
      if (hop >= options.maxRedirects) {
        throw new Error(`Redirect limit exceeded (${options.maxRedirects}).`);
      }
      if (!options.isUrlAllowed(result.redirect)) {
        throw createCrawlerSecurityError("Redirect target is outside the configured URL policy.", {
          from: currentUrl,
          to: result.redirect,
          status: result.status
        });
      }
      redirectChain.push({ from: currentUrl, to: result.redirect, status: result.status });
      currentUrl = result.redirect;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function parseRobotsSitemaps(robotsText, robotsUrl, limit, maxUrlLength) {
  const values = [];
  for (const line of robotsText.split(/\r?\n/)) {
    if (values.length >= limit) break;
    const trimmed = line.trim();
    if (!/^sitemap:/i.test(trimmed)) continue;
    const resolved = toUrl(trimmed.replace(/^sitemap:\s*/i, "").trim(), robotsUrl);
    if (!resolved || !isHttpUrl(resolved)) continue;
    try {
      values.push(normalizeUrl(resolved, maxUrlLength));
    } catch {
      // Invalid and overlong sitemap URLs are ignored.
    }
  }
  return [...new Set(values)];
}

async function loadRobots(origin, options) {
  const robotsUrl = new URL("/robots.txt", origin).toString();
  const denyAll = () => ({
    parser: robotsParser(robotsUrl, "User-agent: *\nDisallow: /\n"),
    sitemaps: [],
    crawlDelayMs: 0,
    unavailable: true
  });
  try {
    const result = await fetchText(robotsUrl, {
      ...options,
      accept: "text/plain,*/*;q=0.5",
      maxBytes: Math.min(options.maxBytes, 512 * 1024),
      isUrlAllowed: options.isRobotsUrlAllowed,
      beforeRequest: options.beforeNetworkRequest
    });
    if (result.status === 404 || result.status === 410) {
      return { parser: robotsParser(robotsUrl, ""), sitemaps: [], crawlDelayMs: 0 };
    }
    if (!result.ok) return denyAll();
    const parser = robotsParser(robotsUrl, result.text);
    const seconds = Number(parser.getCrawlDelay(options.userAgent));
    return {
      parser,
      sitemaps: parseRobotsSitemaps(result.text, robotsUrl, options.maxSitemaps, options.maxUrlLength),
      crawlDelayMs: Number.isFinite(seconds) ? Math.min(60_000, Math.max(0, seconds * 1_000)) : 0
    };
  } catch (error) {
    if (["CRAWLER_URL_BLOCKED", "CRAWL_REQUEST_LIMIT", "CRAWL_DURATION_LIMIT", "CRAWL_TOTAL_BYTES_LIMIT"].includes(error?.code)
      || options.signal?.aborted) {
      throw error;
    }
    return denyAll();
  }
}

function parseSitemap(text, maxUrls, maxUrlLength) {
  const $ = cheerio.load(text, { xmlMode: true });
  const urls = new Set();
  const sitemaps = new Set();
  const add = (target, value) => {
    if (urls.size + sitemaps.size >= maxUrls || !isHttpUrl(value)) return;
    try {
      target.add(normalizeUrl(value, maxUrlLength));
    } catch {
      // Invalid or overlong URLs are ignored.
    }
  };
  $("urlset > url > loc").each((_, element) => {
    if (urls.size + sitemaps.size >= maxUrls) return false;
    add(urls, $(element).text().trim());
    return undefined;
  });
  $("sitemapindex > sitemap > loc").each((_, element) => {
    if (urls.size + sitemaps.size >= maxUrls) return false;
    add(sitemaps, $(element).text().trim());
    return undefined;
  });
  return { urls: [...urls], sitemaps: [...sitemaps] };
}

async function discoverSitemapDocument(sitemapUrl, options) {
  try {
    const result = await fetchText(sitemapUrl, {
      ...options,
      accept: "application/xml,text/xml,*/*;q=0.5",
      isUrlAllowed: options.isSitemapUrlAllowed,
      beforeRequest: options.beforeNetworkRequest
    });
    if (!result.ok || (!result.contentType.includes("xml") && !result.text.trim().startsWith("<"))) {
      return { urls: [], sitemaps: [] };
    }
    return parseSitemap(result.text, options.maxUrlsPerSitemap, options.maxUrlLength);
  } catch (error) {
    await options.recordFailure?.(sitemapUrl, error, "sitemap");
    if (isFatalCrawlError(error)) throw error;
    return { urls: [], sitemaps: [] };
  }
}

function extractLinks($, baseUrl, maxLinks, maxUrlLength) {
  const links = new Set();
  $("a[href]").each((_, element) => {
    if (links.size >= maxLinks) return false;
    const resolved = toUrl($(element).attr("href"), baseUrl);
    if (!resolved || !isHttpUrl(resolved)) return undefined;
    try {
      links.add(normalizeUrl(resolved, maxUrlLength));
    } catch {
      // Invalid or overlong URLs are ignored.
    }
    return undefined;
  });
  return [...links];
}

function cleanForExtraction($) {
  $("script, style, noscript, template, svg, canvas, iframe, object, embed").remove();
  $("[hidden], [aria-hidden='true']").remove();
}

function boundedExtractValue($, element, field, url, limits, state, fieldName) {
  let value;
  if (field.source === "html") {
    value = $(element).html() ?? "";
  } else if (field.source === "attribute") {
    value = $(element).attr(field.attribute) ?? "";
    if (field.resolveUrl && value) {
      const resolved = toUrl(value, url);
      if (!resolved || !isHttpUrl(resolved)) {
        state.warnings.add(`${fieldName}: ignored a non-HTTP(S) or invalid URL attribute.`);
        value = "";
      } else {
        try {
          value = normalizeUrl(resolved);
        } catch {
          state.warnings.add(`${fieldName}: ignored an invalid or overlong URL attribute.`);
          value = "";
        }
      }
    }
  } else {
    value = $(element).text().replace(/\s+/g, " ").trim();
  }

  if (value.length > limits.maxValueLength) {
    value = value.slice(0, limits.maxValueLength);
    state.warnings.add(`${fieldName}: value truncated at ${limits.maxValueLength} characters.`);
  }
  const remainingCharacters = limits.maxTotalCharacters - state.characters;
  if (remainingCharacters <= 0) {
    state.warnings.add(`Extraction stopped at maxTotalCharacters (${limits.maxTotalCharacters}).`);
    return null;
  }
  if (value.length > remainingCharacters) {
    value = value.slice(0, remainingCharacters);
    state.warnings.add(`Extraction stopped at maxTotalCharacters (${limits.maxTotalCharacters}).`);
  }
  state.characters += value.length;
  state.values += 1;
  return value;
}

function extractStructuredFromDocument($, url, extraction) {
  const data = Object.create(null);
  const state = {
    characters: 0,
    values: 0,
    warnings: new Set()
  };

  for (const [name, field] of Object.entries(extraction.fields)) {
    if (field.source === "html") {
      state.warnings.add(
        `${name}: HTML output is untrusted markup and is not safe for direct DOM insertion.`
      );
    }
    if (state.values >= extraction.maxTotalValues) {
      state.warnings.add(`Extraction stopped at maxTotalValues (${extraction.maxTotalValues}).`);
      data[name] = field.multiple ? [] : null;
      continue;
    }
    const elements = $(field.selector).slice(0, field.limit).toArray();
    const values = [];
    for (const element of elements) {
      if (state.values >= extraction.maxTotalValues) {
        state.warnings.add(`Extraction stopped at maxTotalValues (${extraction.maxTotalValues}).`);
        break;
      }
      const value = boundedExtractValue($, element, field, url, extraction, state, name);
      if (value === null) break;
      values.push(value);
    }
    data[name] = field.multiple ? values : (values[0] ?? null);
  }

  return {
    data,
    warnings: [...state.warnings]
  };
}

export function extractStructured(html, url, input = {}) {
  if (typeof html !== "string") throw new TypeError("html must be a string.");
  if (typeof url !== "string" || !isHttpUrl(url)) {
    throw new TypeError("url must be an absolute HTTP(S) URL.");
  }
  const extraction = normalizeExtractionOptions(input);
  if (!extraction) throw new TypeError("extract options are required.");
  if (html.length > extraction.maxInputCharacters) {
    throw new TypeError(
      `html exceeds extract.maxInputCharacters (${html.length} > ${extraction.maxInputCharacters}).`
    );
  }
  const $ = cheerio.load(html);
  cleanForExtraction($);
  return extractStructuredFromDocument($, normalizeUrl(url), extraction);
}

export function extractPage(html, url, options = {}) {
  const maxLinksPerPage = integerOption(options.maxLinksPerPage, "maxLinksPerPage", 2_000, 1, 20_000);
  const maxUrlLength = integerOption(options.maxUrlLength, "maxUrlLength", 4_096, 256, 32_768);
  const $ = cheerio.load(html);
  cleanForExtraction($);

  const title = ($("title").first().text() || $("h1").first().text() || "").trim().replace(/\s+/g, " ");
  const description = ($("meta[name='description']").attr("content") || "").trim();
  const h1 = $("h1").first().text().trim().replace(/\s+/g, " ");
  const canonicalValue = toUrl($("link[rel='canonical']").attr("href") || url, url);
  let canonical = null;
  try {
    canonical = canonicalValue ? normalizeUrl(canonicalValue, maxUrlLength) : null;
  } catch {
    canonical = null;
  }
  const links = extractLinks($, url, maxLinksPerPage, maxUrlLength);
  const language = ($("html").attr("lang") || "").trim() || null;

  const main = $("main, article, [role='main']").first();
  const contentRoot = main.length ? main : $("body");
  const htmlFragment = contentRoot.html() || "";
  const text = contentRoot.text().replace(/\s+/g, " ").trim();
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-"
  });
  const markdown = turndown.turndown(htmlFragment).replace(/\n{3,}/g, "\n\n").trim();

  const page = {
    url,
    canonical,
    title,
    description,
    h1,
    language,
    text,
    markdown,
    links,
    fetchedAt: new Date().toISOString()
  };
  const extraction = normalizeExtractionOptions(options.extract);
  if (extraction) {
    if (html.length > extraction.maxInputCharacters) {
      throw new TypeError(
        `html exceeds extract.maxInputCharacters (${html.length} > ${extraction.maxInputCharacters}).`
      );
    }
    const result = extractStructuredFromDocument($, url, extraction);
    page.structured = result.data;
    page.extractionWarnings = result.warnings;
  }
  return page;
}

class CrawlQueue {
  constructor() {
    this.items = [];
    this.offset = 0;
  }

  push(item) {
    this.items.push(item);
  }

  shift() {
    if (this.offset >= this.items.length) return null;
    const value = this.items[this.offset];
    this.offset += 1;
    if (this.offset > 1_000 && this.offset * 2 > this.items.length) {
      this.items = this.items.slice(this.offset);
      this.offset = 0;
    }
    return value;
  }

  get length() {
    return this.items.length - this.offset;
  }
}

function retryDelay(error, attempt, options) {
  if (error?.retryAfter) {
    const seconds = Number(error.retryAfter);
    if (Number.isFinite(seconds)) return Math.min(30_000, Math.max(0, seconds * 1_000));
    const date = Date.parse(error.retryAfter);
    if (Number.isFinite(date)) return Math.min(30_000, Math.max(0, date - Date.now()));
  }
  return Math.min(30_000, options.retryDelayMs * (2 ** attempt));
}

function isRetryable(error) {
  if ([
    "CRAWLER_URL_BLOCKED",
    "ROBOTS_DENIED",
    "CRAWL_REQUEST_LIMIT",
    "CRAWL_TOTAL_BYTES_LIMIT",
    "CRAWL_DURATION_LIMIT",
    "CRAWL_ABORTED"
  ].includes(error?.code)) return false;
  return !Number.isFinite(error?.status) || error.status === 408 || error.status === 429 || error.status >= 500;
}

function isFatalCrawlError(error) {
  return [
    "CRAWLER_URL_BLOCKED",
    "CRAWL_REQUEST_LIMIT",
    "CRAWL_TOTAL_BYTES_LIMIT",
    "CRAWL_DURATION_LIMIT",
    "CRAWL_ABORTED"
  ].includes(error?.code) || error?.name === "AbortError";
}

function remainingCrawlDuration(options) {
  if (options.signal?.aborted) throw abortError(options.signal);
  const remainingMs = options.deadlineAt - Date.now();
  if (remainingMs <= 0) {
    throw limitError("CRAWL_DURATION_LIMIT", `Crawl exceeded maxDurationMs (${options.maxDurationMs}).`);
  }
  return Math.max(1, remainingMs);
}

function remainingBrowserTimeout(options) {
  return Math.min(options.timeoutMs, remainingCrawlDuration(options));
}

async function waitForBrowserTarget(page, target, options) {
  if (target === null || target === undefined) return;
  if (typeof target === "number") {
    await sleep(target, options.signal);
    return;
  }
  const match = target.match(/^ms:(\d+)$/i);
  if (match) {
    await sleep(Number(match[1]), options.signal);
    return;
  }
  await page.waitForSelector(target, { timeout: remainingBrowserTimeout(options) });
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch (cause) {
    const error = new Error("Browser mode requires Playwright. Install it alongside Cockroach Crawler and run: npx playwright install chromium");
    error.code = "BROWSER_UNAVAILABLE";
    error.cause = cause;
    throw error;
  }
}

async function readBrowserResponseBody(response, options) {
  const reader = response.body?.getReader();
  if (!reader) return { body: Buffer.alloc(0), bytes: 0 };

  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    options.consumeBytes(value.byteLength);
    if (received > options.maxBytes) {
      await reader.cancel().catch(() => {});
      throw limitError("CRAWL_RESPONSE_BYTES_LIMIT", `Browser resource exceeded maxBytes (${options.maxBytes}).`);
    }
    chunks.push(Buffer.from(value));
  }
  return { body: Buffer.concat(chunks), bytes: received };
}

async function browserRequestHeaders(request, userAgent) {
  const source = await request.allHeaders();
  const headers = Object.create(null);
  for (const [rawName, value] of Object.entries(source)) {
    const name = rawName.toLowerCase();
    if (BROWSER_REQUEST_HEADER_BLOCKLIST.has(name) || name === "accept-encoding") continue;
    headers[name] = value;
  }
  headers["user-agent"] = userAgent;
  // Undici still decodes a compressed response if a server ignores this. The
  // body reader below accounts the decoded bytes actually supplied to Chromium.
  headers["accept-encoding"] = "identity";
  return headers;
}

function browserResponseHeaders(source) {
  const headers = Object.create(null);
  for (const [rawName, value] of source.entries()) {
    const name = rawName.toLowerCase();
    if (BROWSER_RESPONSE_HEADER_BLOCKLIST.has(name)) continue;
    headers[name] = value;
  }
  return headers;
}

function parseSetCookieAttributes(raw) {
  return raw.split(";").slice(1).map((part) => {
    const equals = part.indexOf("=");
    const name = (equals < 0 ? part : part.slice(0, equals)).trim().toLowerCase();
    const value = equals < 0 ? null : part.slice(equals + 1).trim();
    return { name, value };
  }).filter((attribute) => attribute.name);
}

function lastSetCookieAttribute(attributes, name) {
  for (let index = attributes.length - 1; index >= 0; index -= 1) {
    if (attributes[index].name === name) return attributes[index];
  }
  return null;
}

function parseMaxAgeSeconds(attribute) {
  const value = attribute?.value;
  if (typeof value !== "string" || !/^-?\d+$/.test(value)) return null;
  try {
    const seconds = BigInt(value);
    if (seconds <= 0n) return 0;
    if (seconds > BigInt(Number.MAX_SAFE_INTEGER)) return Number.MAX_SAFE_INTEGER;
    return Number(seconds);
  } catch {
    return null;
  }
}

function parseResponseCookie(raw) {
  try {
    const headers = new Headers();
    headers.append("set-cookie", raw);
    const [cookie] = getSetCookies(headers);
    if (!cookie) return null;
    const list = parseSetCookieAttributes(raw);
    const path = lastSetCookieAttribute(list, "path");
    return {
      cookie,
      attributes: {
        domain: list.some((attribute) => attribute.name === "domain"),
        partitioned: list.some((attribute) => attribute.name === "partitioned"),
        secure: list.some((attribute) => attribute.name === "secure"),
        httpOnly: list.some((attribute) => attribute.name === "httponly"),
        pathPresent: Boolean(path),
        path: path?.value,
        maxAgeSeconds: parseMaxAgeSeconds(lastSetCookieAttribute(list, "max-age"))
      }
    };
  } catch {
    return null;
  }
}

function responseCookies(source) {
  try {
    // getSetCookie preserves one raw line per cookie. Parsing each line keeps
    // security-relevant attributes that Undici otherwise places in `unparsed`
    // or drops (notably Partitioned and negative Max-Age).
    return source.getSetCookie().map(parseResponseCookie).filter(Boolean);
  } catch {
    // Chromium ignores malformed Set-Cookie lines. Treat them the same way
    // rather than turning an unrelated response-header defect into authority.
    return [];
  }
}

function defaultCookiePath(sourceUrl) {
  const pathname = new URL(sourceUrl).pathname;
  if (!pathname.startsWith("/") || pathname === "/") return "/";
  const rightMostSlash = pathname.lastIndexOf("/");
  return rightMostSlash <= 0 ? "/" : pathname.slice(0, rightMostSlash);
}

function responseCookiePath(sourceUrl, attributes) {
  if (attributes.pathPresent && typeof attributes.path === "string" && attributes.path.startsWith("/")) {
    return attributes.path;
  }
  return defaultCookiePath(sourceUrl);
}

function hasValidCookiePrefix(cookie, attributes, secureOrigin) {
  const securePrefix = cookie.name.startsWith("__Secure-");
  const hostPrefix = cookie.name.startsWith("__Host-");
  const httpPrefix = cookie.name.startsWith("__Http-");
  const hostHttpPrefix = cookie.name.startsWith("__Host-Http-");
  if (securePrefix && (!attributes.secure || !secureOrigin)) return false;
  if (hostPrefix && (!attributes.secure || !secureOrigin || attributes.domain
    || !attributes.pathPresent || attributes.path !== "/")) return false;
  if (httpPrefix && (!attributes.secure || !secureOrigin || !attributes.httpOnly)) return false;
  if (hostHttpPrefix && (!attributes.secure || !secureOrigin || !attributes.httpOnly
    || attributes.domain || !attributes.pathPresent || attributes.path !== "/")) return false;
  return true;
}

function toPlaywrightCookie(sourceUrl, responseCookie) {
  const cookie = responseCookie?.cookie;
  const attributes = responseCookie?.attributes;
  if (!cookie || !attributes || typeof cookie.name !== "string" || !cookie.name
    || typeof cookie.value !== "string") return null;
  const url = new URL(sourceUrl);
  const secureOrigin = url.protocol === "https:";
  // The browser proxy intentionally supports only host-only, unpartitioned
  // response cookies. Domain/CHIPS semantics cannot be preserved through
  // Playwright's additive cookie API without risking adjacent-site authority.
  if (attributes.domain || attributes.partitioned) return null;
  if (attributes.secure && !secureOrigin) return null;
  if (cookie.sameSite === "None" && (!attributes.secure || !secureOrigin)) return null;
  if (!hasValidCookiePrefix(cookie, attributes, secureOrigin)) return null;
  const result = {
    name: cookie.name,
    value: cookie.value,
    domain: url.hostname.toLowerCase(),
    path: responseCookiePath(sourceUrl, attributes),
    httpOnly: attributes.httpOnly,
    secure: attributes.secure
  };
  if (["Strict", "Lax", "None"].includes(cookie.sameSite)) result.sameSite = cookie.sameSite;

  if (attributes.maxAgeSeconds !== null) {
    result.expires = attributes.maxAgeSeconds <= 0
      ? 1
      : Math.floor(Date.now() / 1_000) + attributes.maxAgeSeconds;
  } else if (cookie.expires instanceof Date && Number.isFinite(cookie.expires.getTime())) {
    result.expires = Math.floor(cookie.expires.getTime() / 1_000);
  }
  return result;
}

function cookiePathMatches(requestPath, cookiePath) {
  if (requestPath === cookiePath) return true;
  if (!requestPath.startsWith(cookiePath)) return false;
  return cookiePath.endsWith("/") || requestPath[cookiePath.length] === "/";
}

function eligibleHostOnlyCookies(cookies, url) {
  const target = new URL(url);
  const hostname = target.hostname.toLowerCase();
  const pathname = target.pathname || "/";
  const now = Date.now() / 1_000;
  return cookies.map((cookie, index) => ({ cookie, index })).filter(({ cookie }) => {
    if (!cookie || typeof cookie.name !== "string" || !cookie.name || typeof cookie.value !== "string") return false;
    if (cookie.partitionKey) return false;
    if (typeof cookie.domain !== "string" || cookie.domain.startsWith(".")
      || cookie.domain.toLowerCase() !== hostname) return false;
    if (typeof cookie.path !== "string" || !cookie.path.startsWith("/")
      || !cookiePathMatches(pathname, cookie.path)) return false;
    if (cookie.secure === true && target.protocol !== "https:") return false;
    if (Number.isFinite(cookie.expires) && cookie.expires >= 0 && cookie.expires <= now) return false;
    return true;
  }).sort((left, right) => right.cookie.path.length - left.cookie.path.length || left.index - right.index)
    .map(({ cookie }) => cookie);
}

function sameSchemefulHost(left, right) {
  const leftUrl = new URL(left);
  const rightUrl = new URL(right);
  return leftUrl.protocol === rightUrl.protocol
    && leftUrl.hostname.toLowerCase() === rightUrl.hostname.toLowerCase();
}

async function proxyBrowserRequest(url, method, headers, options, hooks) {
  const controller = new AbortController();
  const requestTimeoutMs = remainingBrowserTimeout(options);
  const timer = setTimeout(() => {
    controller.abort(limitError("CRAWL_REQUEST_TIMEOUT", `Browser resource timed out after ${requestTimeoutMs}ms.`));
  }, requestTimeoutMs);
  const signal = options.signal
    ? AbortSignal.any([options.signal, controller.signal])
    : controller.signal;

  try {
    return await withPinnedFetch(url, {
      method,
      headers,
      signal
    }, {
      allowPrivateNetworks: options.allowPrivateNetworks,
      lookup: options.dnsLookup || undefined,
      signal
    }, async (response) => {
      const { body, bytes } = await readBrowserResponseBody(response, {
        maxBytes: options.maxBytes,
        consumeBytes: hooks.consumeBytes
      });
      return {
        status: response.status,
        ok: response.ok,
        headers: browserResponseHeaders(response.headers),
        setCookies: responseCookies(response.headers),
        location: response.headers.get("location"),
        body: method === "HEAD" || response.status === 204 || response.status === 304
          ? Buffer.alloc(0)
          : body,
        bytes,
        contentType: response.headers.get("content-type") || "",
        retryAfter: response.headers.get("retry-after"),
        etag: response.headers.get("etag"),
        lastModified: response.headers.get("last-modified")
      };
    });
  } finally {
    clearTimeout(timer);
  }
}

async function proxyBrowserRequestChain(
  startUrl,
  method,
  request,
  navigation,
  allowCrossOriginRedirect,
  siteContext,
  options,
  hooks
) {
  const initialOrigin = new URL(startUrl).origin;
  const baseHeaders = await browserRequestHeaders(request, options.userAgent);
  // Playwright does not expose Fetch's credentials mode. For subresources,
  // Chromium's own Cookie header is the only reliable positive signal that
  // credentials were permitted. Navigations are credentialed by definition.
  // When that signal is absent, fail closed for both sending and Set-Cookie.
  const credentialsPermitted = navigation || Boolean(baseHeaders.cookie);
  const effectiveSiteContext = {
    ...siteContext,
    complete: siteContext.complete === true && baseHeaders.origin !== "null"
  };
  const redirectChain = [];
  let currentUrl = startUrl;

  while (true) {
    await hooks.beforeRequest(currentUrl, { navigation });
    const headers = { ...baseHeaders };
    delete headers.cookie;
    if (new URL(currentUrl).origin !== initialOrigin) {
      // A browser would recompute credentials and referrer policy for a new
      // origin. Never forward source-origin authority through our manual hop.
      delete headers.authorization;
      delete headers.origin;
      delete headers.referer;
    }
    // Always recompute cookies for the actual hop after source-origin
    // credentials have been removed. This preserves target-origin cookies
    // without forwarding source-origin authority across a redirect.
    const cookie = credentialsPermitted
      ? await hooks.cookieHeader(currentUrl, {
          ...effectiveSiteContext,
          navigation,
          topLevel: allowCrossOriginRedirect,
          method
        })
      : "";
    if (cookie) headers.cookie = cookie;
    else delete headers.cookie;
    const result = await proxyBrowserRequest(currentUrl, method, headers, options, hooks);
    await hooks.applyResponseCookies(currentUrl, result.setCookies, {
      ...effectiveSiteContext,
      navigation,
      topLevel: allowCrossOriginRedirect,
      method,
      credentialsPermitted
    });
    if (!REDIRECT_STATUSES.has(result.status)) {
      return { ...result, url: currentUrl, redirectChain };
    }
    if (!result.location) {
      throw new Error(`Redirect response ${result.status} did not include Location.`);
    }
    if (redirectChain.length >= options.maxRedirects) {
      throw limitError("CRAWL_REDIRECT_LIMIT", `Redirect limit exceeded (${options.maxRedirects}).`);
    }

    let redirect;
    try {
      redirect = normalizeUrl(new URL(result.location, currentUrl), options.maxUrlLength);
    } catch (cause) {
      const error = createCrawlerSecurityError("Browser redirect target failed URL validation.", {
        from: currentUrl,
        location: result.location
      });
      error.cause = cause;
      throw error;
    }
    await hooks.validateRequestUrl(redirect, { navigation });
    if (!allowCrossOriginRedirect && new URL(redirect).origin !== new URL(currentUrl).origin) {
      throw createCrawlerSecurityError(
        "Cross-origin browser redirects are only supported for the top-level page.",
        { from: currentUrl, to: redirect, navigation }
      );
    }
    redirectChain.push({ from: currentUrl, to: redirect, status: result.status });
    currentUrl = redirect;
  }
}

async function createBrowserEgressSink(onConnection) {
  const sockets = new Set();
  const server = createTcpServer((socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
    onConnection?.();
    socket.destroy();
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  server.unref();
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    async close() {
      for (const socket of sockets) socket.destroy();
      if (!server.listening) return;
      await new Promise((resolve) => server.close(() => resolve()));
    }
  };
}

async function createBrowserFetcher(options, hooks) {
  if (!options.browser) return null;
  const { chromium } = await loadPlaywright();
  let activeSession = null;
  let browser;
  let context;
  let sink;
  let proxyHooks;
  const emergencyClose = () => {
    context?.close({ reason: "Crawler operation aborted." }).catch(() => {});
    browser?.close().catch(() => {});
    sink?.close().catch(() => {});
  };
  options.signal?.addEventListener("abort", emergencyClose, { once: true });
  try {
    if (options.signal?.aborted) throw abortError(options.signal);
    sink = await createBrowserEgressSink(() => {
      activeSession?.recordBlocked(createCrawlerSecurityError(
        "Chromium attempted network egress outside the pinned browser proxy.",
        { transport: "browser-proxy-sink" }
      ));
    });
    browser = await chromium.launch({
      headless: options.browser.headless,
      channel: options.browser.channel,
      executablePath: options.browser.executablePath,
      // Browser process startup is bounded by the crawl deadline, not the
      // per-request timeout. A small network timeout must not make Chromium
      // startup flaky on slower runners.
      timeout: remainingCrawlDuration(options),
      proxy: { server: sink.url },
      args: [
        "--proxy-bypass-list=<-loopback>",
        "--disable-background-networking",
        "--disable-component-update",
        "--disable-domain-reliability",
        "--disable-quic",
        "--disable-sync",
        "--dns-prefetch-disable",
        "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
        "--no-first-run"
      ]
    });
    if (options.signal?.aborted) throw abortError(options.signal);
    context = await browser.newContext({
      userAgent: options.userAgent,
      storageState: options.browser.storageState,
      serviceWorkers: "block",
      acceptDownloads: false
    });
    proxyHooks = {
      ...hooks,
      async cookieHeader(url, requestContext) {
        const allCookies = await awaitWithSignal(context.cookies(), options.signal);
        const cookies = eligibleHostOnlyCookies(allCookies, url);
        const requestSites = requestContext.siteUrls.filter((siteUrl) => isHttpUrl(siteUrl));
        const sameSite = requestContext.complete === true && requestSites.length > 0
          && requestSites.every((siteUrl) => sameSchemefulHost(url, siteUrl));
        const secureTarget = new URL(url).protocol === "https:";
        return cookies.filter((cookie) => {
          // Partitioned-cookie keys are browser-internal site state; without a
          // browser-generated redirected request, fail closed rather than
          // guessing and potentially crossing a partition boundary.
          if (cookie.partitionKey) return false;
          if (cookie.sameSite === "None") return cookie.secure === true && secureTarget;
          if (sameSite) return true;
          // Chromium defaults unspecified SameSite to Lax. Lax cookies are
          // available on safe top-level navigations, but not cross-site frames
          // or subresources; Strict cookies remain withheld.
          return cookie.sameSite !== "Strict"
            && requestContext.navigation
            && requestContext.topLevel
            && ["GET", "HEAD"].includes(requestContext.method);
        }).map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
      },
      async applyResponseCookies(url, cookies, requestContext) {
        if (requestContext.credentialsPermitted !== true) return;
        const requestSites = requestContext.siteUrls.filter((siteUrl) => isHttpUrl(siteUrl));
        const sameSite = requestContext.complete === true && requestSites.length > 0
          && requestSites.every((siteUrl) => sameSchemefulHost(url, siteUrl));
        const topLevelNavigation = requestContext.navigation === true && requestContext.topLevel === true;
        for (const source of cookies) {
          // Chromium rejects Strict, Lax, and Lax-by-default cookies set by a
          // cross-site subresource or nested-frame response. Because addCookies
          // bypasses response processing, enforce that acceptance rule here.
          // SameSite=None and cookie authority attributes are validated again
          // by toPlaywrightCookie before the additive browser API is called.
          const declaredSameSite = typeof source?.cookie?.sameSite === "string"
            ? source.cookie.sameSite.toLowerCase()
            : "";
          if (declaredSameSite !== "none" && !sameSite && !topLevelNavigation) continue;
          const cookie = toPlaywrightCookie(url, source);
          if (!cookie) continue;
          try {
            await awaitWithSignal(context.addCookies([cookie]), options.signal);
          } catch (error) {
            if (options.signal?.aborted) throw abortError(options.signal);
            // Chromium would ignore malformed, prefix-invalid, or otherwise
            // unacceptable Set-Cookie values. Do not fail the crawl for them.
          }
        }
      }
    };
    await context.addInitScript(() => {
      for (const key of ["RTCPeerConnection", "webkitRTCPeerConnection", "WebTransport", "Worker", "SharedWorker"]) {
        try {
          Object.defineProperty(window, key, {
            configurable: false,
            writable: false,
            value: undefined
          });
        } catch {
          // The browser-level proxy and WebRTC policy remain the network boundary.
        }
      }
      try {
        Object.defineProperty(navigator, "sendBeacon", {
          configurable: false,
          writable: false,
          value: () => false
        });
      } catch {
        // Non-GET/HEAD requests are also blocked by the context-wide route.
      }
    });

    await context.routeWebSocket(/^(?:ws|wss):\/\//i, async (webSocket) => {
      const error = createCrawlerSecurityError("Browser WebSocket egress is disabled.", {
        url: webSocket.url(),
        transport: "websocket"
      });
      const session = activeSession;
      session?.recordBlocked(error);
      const pending = webSocket.close({ code: 1008, reason: "WebSocket egress is disabled" });
      if (session) {
        session.pending.add(pending);
        pending.then(
          () => session.pending.delete(pending),
          () => session.pending.delete(pending)
        );
      }
      await pending;
    });

    await context.route("**/*", async (route, request) => {
      const session = activeSession;
      if (!session || session.closing) {
        await route.abort("blockedbyclient");
        return;
      }
      const pending = session.handleRoute(route, request);
      session.pending.add(pending);
      try {
        await pending;
      } finally {
        session.pending.delete(pending);
      }
    });
  } catch (error) {
    options.signal?.removeEventListener("abort", emergencyClose);
    const cleanup = Promise.allSettled([
      context?.close(),
      browser?.close(),
      sink?.close()
    ].filter(Boolean));
    await awaitWithSignal(cleanup, options.signal).catch(() => {});
    if (options.signal?.aborted) throw abortError(options.signal);
    if (/executable|browser.*install|doesn't exist/i.test(error?.message || "")) {
      error.message = `${error.message}\nInstall a compatible browser with: npx playwright install chromium`;
    }
    throw error;
  }

  let serialTail = Promise.resolve();
  return {
    async fetch(startUrl) {
      const previous = serialTail;
      let release;
      serialTail = new Promise((resolve) => { release = resolve; });
      await previous;

      const session = {
        page: null,
        blockedError: null,
        mainResponse: null,
        mainReplay: null,
        redirectChain: [],
        topLevelSiteUrl: startUrl,
        frameSites: new WeakMap(),
        closing: false,
        pending: new Set(),
        popups: new Set(),
        recordBlocked(error) {
          this.blockedError ||= error;
        },
        siteContextFor(frame, isMainNavigation) {
          if (isMainNavigation) {
            return {
              siteUrls: [this.topLevelSiteUrl],
              complete: isHttpUrl(this.topLevelSiteUrl)
            };
          }

          const siteUrls = [this.topLevelSiteUrl];
          let complete = isHttpUrl(this.topLevelSiteUrl) && Boolean(frame);
          const ancestry = [];
          const visited = new Set();
          let cursor = frame;
          while (cursor) {
            if (visited.has(cursor)) {
              complete = false;
              break;
            }
            visited.add(cursor);
            ancestry.unshift(cursor);
            try {
              cursor = cursor.parentFrame();
            } catch {
              complete = false;
              break;
            }
          }

          for (const ancestor of ancestry) {
            let siteUrl = this.frameSites.get(ancestor);
            if (!siteUrl) {
              try {
                const currentUrl = ancestor.url();
                if (isHttpUrl(currentUrl)) siteUrl = currentUrl;
              } catch {
                // Detached or not-yet-exposed frames fail closed below.
              }
            }
            if (!siteUrl || !isHttpUrl(siteUrl)) {
              complete = false;
              continue;
            }
            siteUrls.push(siteUrl);
          }

          return { siteUrls, complete };
        },
        async hasOpaqueSandboxAncestor(frame) {
          let cursor = frame;
          while (cursor) {
            let parent;
            try {
              parent = cursor.parentFrame();
            } catch {
              return true;
            }
            if (!parent) return false;
            let frameElement;
            try {
              frameElement = await awaitWithSignal(cursor.frameElement(), options.signal);
              const sandbox = await awaitWithSignal(frameElement.getAttribute("sandbox"), options.signal);
              if (sandbox !== null) {
                const tokens = sandbox.toLowerCase().split(/\s+/).filter(Boolean);
                if (!tokens.includes("allow-same-origin")) return true;
              }
            } catch {
              // If sandbox authority cannot be inspected, SameSite state is
              // incomplete and must fail closed.
              return true;
            } finally {
              await frameElement?.dispose().catch(() => {});
            }
            cursor = parent;
          }
          return true;
        },
        async handleRoute(route, request) {
          if (this.closing || this.blockedError) {
            await route.abort("blockedbyclient").catch(() => {});
            return;
          }
          try {
            const method = request.method().toUpperCase();
            if (method !== "GET" && method !== "HEAD") {
              throw createCrawlerSecurityError(`Browser method '${method}' is disabled.`, {
                url: request.url(),
                method
              });
            }
            let url;
            try {
              url = normalizeUrl(request.url(), options.maxUrlLength);
            } catch (cause) {
              const error = createCrawlerSecurityError("Browser request failed URL validation.", {
                url: request.url()
              });
              error.cause = cause;
              throw error;
            }
            const navigation = request.isNavigationRequest();
            let isMainNavigation = false;
            let frame = null;
            if (navigation && this.page) {
              try {
                frame = request.frame();
                isMainNavigation = frame === this.page.mainFrame();
              } catch {
                // Popup first requests exist before Playwright exposes a Frame.
                // They remain fully handled by this context-wide route.
              }
            } else {
              try {
                frame = request.frame();
              } catch {
                // Popup first requests can exist before a Frame is exposed.
              }
            }

            const requestSiteContext = this.siteContextFor(frame, isMainNavigation);
            if (frame && !isMainNavigation && await this.hasOpaqueSandboxAncestor(frame)) {
              requestSiteContext.complete = false;
            }

            if (isMainNavigation && this.mainReplay?.url === url) {
              const replay = this.mainReplay;
              this.mainReplay = null;
              this.mainResponse = replay.result;
              this.topLevelSiteUrl = replay.url;
              if (frame) this.frameSites.set(frame, replay.url);
              await route.fulfill({
                status: replay.result.status,
                headers: replay.result.headers,
                body: replay.result.body
              });
              return;
            }

            const result = await proxyBrowserRequestChain(
              url,
              method,
              request,
              navigation,
              isMainNavigation,
              requestSiteContext,
              options,
              proxyHooks
            );
            if (isMainNavigation) this.redirectChain = result.redirectChain;
            if (isMainNavigation && result.redirectChain.length) {
              this.mainReplay = { url: result.url, result };
              await route.fulfill({
                status: 200,
                headers: { "content-type": "text/html; charset=utf-8" },
                body: Buffer.alloc(0)
              });
              return;
            }
            if (navigation && frame) this.frameSites.set(frame, result.url);
            if (isMainNavigation) {
              this.mainResponse = result;
              this.topLevelSiteUrl = result.url;
            }
            await route.fulfill({
              status: result.status,
              headers: result.headers,
              body: result.body
            });
          } catch (error) {
            this.recordBlocked(options.signal?.aborted ? abortError(options.signal) : error);
            await route.abort("blockedbyclient").catch(() => {});
          }
        }
      };

      const drainRoutes = async () => {
        while (session.pending.size) {
          await Promise.allSettled([...session.pending]);
        }
      };

      let page;
      let response;
      const completeMainReplay = async () => {
        while (session.mainReplay) {
          const target = session.mainReplay.url;
          response = await page.goto(target, {
            waitUntil: options.browser.waitUntil,
            timeout: remainingBrowserTimeout(options)
          });
          await drainRoutes();
          if (options.signal?.aborted) throw abortError(options.signal);
          if (session.blockedError) throw session.blockedError;
        }
      };
      activeSession = session;
      try {
        if (options.signal?.aborted) throw abortError(options.signal);
        page = await context.newPage();
        session.page = page;
        session.frameSites.set(page.mainFrame(), startUrl);
        page.on("popup", (popup) => {
          session.popups.add(popup);
          popup.close().catch(() => {});
        });
        response = await page.goto(startUrl, {
          waitUntil: options.browser.waitUntil,
          timeout: remainingBrowserTimeout(options)
        });
        await drainRoutes();
        if (options.signal?.aborted) throw abortError(options.signal);
        if (session.blockedError) throw session.blockedError;
        await completeMainReplay();
        for (const selector of options.browser.click) {
          await page.click(selector, { timeout: remainingBrowserTimeout(options) });
          await drainRoutes();
          if (options.signal?.aborted) throw abortError(options.signal);
          if (session.blockedError) throw session.blockedError;
          await completeMainReplay();
        }
        await waitForBrowserTarget(page, options.browser.waitFor, options);
        await drainRoutes();
        if (options.signal?.aborted) throw abortError(options.signal);
        if (session.blockedError) throw session.blockedError;
        await completeMainReplay();

        // Freeze the session before the final snapshot. New routes are aborted
        // without proxying, while routes that already began are drained and
        // checked before page state is accepted.
        session.closing = true;
        await drainRoutes();
        if (options.signal?.aborted) throw abortError(options.signal);
        if (session.blockedError) throw session.blockedError;
        const finalUrl = normalizeUrl(page.url(), options.maxUrlLength);
        await hooks.validateFinalUrl(finalUrl);
        const text = await page.content();
        const bytes = Buffer.byteLength(text, "utf8");
        if (bytes > options.maxBytes) {
          throw new Error(`Rendered page exceeded maxBytes: ${options.maxBytes}`);
        }
        const main = session.mainResponse;
        return {
          ok: main?.ok ?? response?.ok() ?? true,
          status: main?.status ?? response?.status() ?? 200,
          finalUrl,
          redirectChain: session.redirectChain,
          text,
          bytes,
          contentType: main?.contentType || "text/html; charset=utf-8",
          retryAfter: main?.retryAfter || null,
          etag: main?.etag || null,
          lastModified: main?.lastModified || null
        };
      } catch (error) {
        if (options.signal?.aborted) throw abortError(options.signal);
        if (session.blockedError) throw session.blockedError;
        throw error;
      } finally {
        session.closing = true;
        const closePages = Promise.allSettled([
          ...(page ? [page.close()] : []),
          ...[...session.popups].map((popup) => popup.close())
        ]);
        await awaitWithSignal(closePages, options.signal).catch(() => {});
        await awaitWithSignal(drainRoutes(), options.signal).catch(() => {});
        if (!options.signal?.aborted) {
          // Give context-level route and proxy-sink events queued by page.close
          // a turn to attach, then perform one final deterministic drain/check.
          await new Promise((resolve) => setImmediate(resolve));
          await awaitWithSignal(drainRoutes(), options.signal).catch(() => {});
        }
        const finalError = options.signal?.aborted
          ? abortError(options.signal)
          : session.blockedError;
        if (activeSession === session) activeSession = null;
        release();
        if (finalError) throw finalError;
      }
    },
    async close() {
      try {
        await awaitWithSignal(serialTail, options.signal);
        if (options.browser.saveStorageState && !options.signal?.aborted) {
          await awaitWithSignal(
            context.storageState({ path: options.browser.saveStorageState }),
            options.signal
          );
        }
      } finally {
        options.signal?.removeEventListener("abort", emergencyClose);
        const cleanup = Promise.allSettled([
          context.close(),
          browser.close(),
          sink.close()
        ]);
        await awaitWithSignal(cleanup, options.signal).catch(() => {});
      }
    }
  };
}

export async function crawlDetailed(input = {}) {
  input = snapshotOptionRecord(input, "crawl", CRAWL_OPTION_KEYS);
  const rawSeeds = asList(input.seeds || input.urls || []);
  if (!rawSeeds.length) throw new TypeError("At least one http(s) seed URL is required.");
  const options = normalizeOptions(input, rawSeeds.length);
  const uniqueSeeds = [...new Set(rawSeeds.map((seed) => {
    if (typeof seed !== "string" || !isHttpUrl(seed)) {
      throw new TypeError(`Invalid HTTP(S) seed URL '${seed}'.`);
    }
    return normalizeUrl(seed, options.maxUrlLength);
  }))];

  const startedAtMs = Date.now();
  const deadlineAt = startedAtMs + options.maxDurationMs;
  const deadlineController = new AbortController();
  const durationError = limitError("CRAWL_DURATION_LIMIT", `Crawl exceeded maxDurationMs (${options.maxDurationMs}).`);
  const durationTimer = setTimeout(() => deadlineController.abort(durationError), options.maxDurationMs);
  const operationSignal = options.signal
    ? AbortSignal.any([options.signal, deadlineController.signal])
    : deadlineController.signal;
  options.signal = operationSignal;

  const queue = new CrawlQueue();
  const seen = new Set();
  const seenFinal = new Set();
  const enqueued = new Set();
  const pages = [];
  const failures = [];
  const robotsByOrigin = new Map();
  const lastFetchByOrigin = new Map();
  const originGates = new Map();
  const seedOrigins = new Set(uniqueSeeds.map((seed) => new URL(seed).origin));
  const allowedOrigins = new Set(options.allowedOrigins);
  const stats = {
    fetched: 0,
    requests: 0,
    bytes: 0,
    retries: 0,
    skippedRobots: 0,
    skippedFiltered: 0,
    skippedNonPublic: 0,
    skippedOrigin: 0,
    queueDropped: 0,
    errors: 0
  };
  let browserFetcher = null;

  const isOriginAllowed = (url) => {
    const origin = new URL(url).origin;
    if (allowedOrigins.size && !allowedOrigins.has(origin)) return false;
    return !options.sameOrigin || seedOrigins.has(origin);
  };

  const isSensitiveUrl = (url) => {
    if (!options.skipSensitivePaths) return false;
    return hasSensitivePath(url);
  };

  const isNetworkUrlAllowed = (url) => {
    try {
      normalizeUrl(url, options.maxUrlLength);
      return isOriginAllowed(url);
    } catch {
      return false;
    }
  };

  const isRobotsUrlAllowed = (url) => isNetworkUrlAllowed(url) && !isSensitiveUrl(url);
  const isSitemapUrlAllowed = (url) => isNetworkUrlAllowed(url) && !isSensitiveUrl(url);

  const isBrowserResourceUrlAllowed = (url) => {
    if (!isNetworkUrlAllowed(url)) return false;
    if (options.exclude.length && matchesAny(url, options.exclude)) return false;
    return !isSensitiveUrl(url);
  };

  const isPageUrlAllowed = (url, countSkip = false) => {
    if (!isNetworkUrlAllowed(url)) {
      if (countSkip) stats.skippedOrigin += 1;
      return false;
    }
    if (options.include.length && !matchesAny(url, options.include)) {
      if (countSkip) stats.skippedFiltered += 1;
      return false;
    }
    if (options.exclude.length && matchesAny(url, options.exclude)) {
      if (countSkip) stats.skippedFiltered += 1;
      return false;
    }
    if (isSensitiveUrl(url)) {
      if (countSkip) stats.skippedNonPublic += 1;
      return false;
    }
    return true;
  };

  const consumeBytes = (bytes) => {
    if (!Number.isSafeInteger(bytes) || bytes < 0) throw new TypeError("Byte accounting received an invalid value.");
    if (stats.bytes + bytes > options.maxTotalBytes) {
      throw limitError("CRAWL_TOTAL_BYTES_LIMIT", `Crawl exceeded maxTotalBytes (${options.maxTotalBytes}).`);
    }
    stats.bytes += bytes;
  };

  const enqueue = (url, depth = 0, discoveredFrom = null, isSeed = false) => {
    let normalized;
    try {
      normalized = normalizeUrl(url, options.maxUrlLength);
    } catch {
      if (isSeed) throw createCrawlerSecurityError("Seed URL failed URL policy validation.", { url: String(url) });
      return false;
    }
    if (depth > options.maxDepth || enqueued.has(normalized) || seen.has(normalized)) return false;
    if (!isPageUrlAllowed(normalized, !isSeed)) {
      if (isSeed) {
        throw createCrawlerSecurityError("Seed URL is outside the configured origin/filter policy.", {
          url: normalized,
          origin: new URL(normalized).origin
        });
      }
      return false;
    }
    if (queue.length >= options.maxQueue) {
      stats.queueDropped += 1;
      return false;
    }
    enqueued.add(normalized);
    queue.push({ url: normalized, depth, discoveredFrom });
    return true;
  };

  async function waitForOrigin(url, minimumDelayMs = 0) {
    const origin = new URL(url).origin;
    const previous = originGates.get(origin) || Promise.resolve();
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const scheduled = previous.catch(() => {}).then(() => gate);
    originGates.set(origin, scheduled);
    await previous.catch(() => {});
    try {
      const delayMs = Math.max(options.delayMs, minimumDelayMs);
      const nextAt = (lastFetchByOrigin.get(origin) || 0) + delayMs;
      await sleep(Math.max(0, nextAt - Date.now()), operationSignal);
      lastFetchByOrigin.set(origin, Date.now());
    } finally {
      release();
      if (originGates.get(origin) === scheduled) originGates.delete(origin);
    }
  }

  async function beforeNetworkRequest(url, minimumDelayMs = 0) {
    if (operationSignal.aborted) throw abortError(operationSignal);
    if (Date.now() >= deadlineAt) throw durationError;
    if (stats.requests >= options.maxRequests) {
      throw limitError("CRAWL_REQUEST_LIMIT", `Crawl exceeded maxRequests (${options.maxRequests}).`);
    }
    stats.requests += 1;
    await waitForOrigin(url, minimumDelayMs);
  }

  async function getRobots(url) {
    const origin = new URL(url).origin;
    if (!robotsByOrigin.has(origin)) {
      robotsByOrigin.set(origin, loadRobots(origin, {
        ...options,
        deadlineAt,
        isRobotsUrlAllowed,
        beforeNetworkRequest,
        consumeBytes
      }));
    }
    return robotsByOrigin.get(origin);
  }

  async function assertRobotsAllowed(url) {
    if (!options.obeyRobots) return 0;
    const robots = await getRobots(url);
    if (robots.parser?.isAllowed(url, options.userAgent) === false) {
      stats.skippedRobots += 1;
      const error = new Error(`robots.txt disallows ${url}`);
      error.code = "ROBOTS_DENIED";
      throw error;
    }
    return robots.crawlDelayMs || 0;
  }

  async function recordFailure(url, error, phase = "page") {
    const failure = {
      url,
      phase,
      code: error?.code || "CRAWL_ERROR",
      error: error?.message || String(error)
    };
    failures.push(failure);
    stats.errors += 1;
    await runBoundedCallback(options.onError, { ...failure }, operationSignal);
  }

  try {
    for (const seed of uniqueSeeds) {
      enqueue(seed, 0, null, true);
      await resolveUrlTarget(seed, {
        allowPrivateNetworks: options.allowPrivateNetworks,
        lookup: options.dnsLookup || undefined,
        signal: operationSignal
      });
    }

    if (options.includeSitemaps && options.maxSitemaps > 0) {
      const sitemapQueue = [];
      const queuedSitemaps = new Set();
      const enqueueSitemap = (value) => {
        if (queuedSitemaps.size >= options.maxSitemaps) return;
        let normalized;
        try {
          normalized = normalizeUrl(value, options.maxUrlLength);
        } catch {
          return;
        }
        if (queuedSitemaps.has(normalized) || !isSitemapUrlAllowed(normalized)) return;
        queuedSitemaps.add(normalized);
        sitemapQueue.push(normalized);
      };
      for (const seed of uniqueSeeds) {
        const robots = await getRobots(seed);
        const sitemapCandidates = robots.unavailable
          ? []
          : (robots.sitemaps.length
              ? robots.sitemaps
              : [new URL("/sitemap.xml", new URL(seed).origin).toString()]);
        for (const sitemap of sitemapCandidates) {
          enqueueSitemap(sitemap);
        }
      }
      const visitedSitemaps = new Set();
      while (sitemapQueue.length && visitedSitemaps.size < options.maxSitemaps) {
        const sitemapUrl = sitemapQueue.shift();
        if (visitedSitemaps.has(sitemapUrl) || !isSitemapUrlAllowed(sitemapUrl)) continue;
        visitedSitemaps.add(sitemapUrl);
        const document = await discoverSitemapDocument(sitemapUrl, {
          ...options,
          deadlineAt,
          isSitemapUrlAllowed,
          beforeNetworkRequest,
          consumeBytes,
          recordFailure
        });
        for (const url of document.urls) enqueue(url, 0, sitemapUrl);
        for (const nested of document.sitemaps) enqueueSitemap(nested);
      }
    }

    browserFetcher = await createBrowserFetcher({ ...options, deadlineAt }, {
      consumeBytes,
      async beforeRequest(value, { navigation }) {
        const url = normalizeUrl(value, options.maxUrlLength);
        const allowed = navigation ? isPageUrlAllowed(url) : isBrowserResourceUrlAllowed(url);
        if (!allowed) {
          throw createCrawlerSecurityError("Browser request is outside the configured URL policy.", {
            url,
            navigation
          });
        }
        const crawlDelayMs = await assertRobotsAllowed(url);
        await beforeNetworkRequest(url, crawlDelayMs);
      },
      async validateRequestUrl(value, { navigation }) {
        const allowed = navigation ? isPageUrlAllowed(value) : isBrowserResourceUrlAllowed(value);
        if (!allowed) {
          throw createCrawlerSecurityError("Browser redirect target is outside the configured URL policy.", {
            url: value,
            navigation
          });
        }
      },
      async validateFinalUrl(value) {
        if (!isPageUrlAllowed(value)) {
          throw createCrawlerSecurityError("Browser navigation ended outside the configured page policy.", {
            url: value
          });
        }
      }
    });

    async function processItem(item) {
      if (seen.has(item.url)) return null;
      seen.add(item.url);
      const attempts = options.browser ? 1 : options.maxRetries + 1;

      for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
          let result;
          if (browserFetcher) {
            result = await browserFetcher.fetch(item.url);
          } else {
            result = await fetchText(item.url, {
              ...options,
              deadlineAt,
              isUrlAllowed: isPageUrlAllowed,
              consumeBytes,
              beforeRequest: async (url) => {
                const crawlDelayMs = await assertRobotsAllowed(url);
                await beforeNetworkRequest(url, crawlDelayMs);
              }
            });
          }

          if (!result.ok) {
            const error = new Error(`HTTP ${result.status}`);
            error.status = result.status;
            error.retryAfter = result.retryAfter;
            throw error;
          }
          stats.fetched += 1;
          if (result.contentType && !/html|xml|text\//i.test(result.contentType)) return null;
          if (seenFinal.has(result.finalUrl)) return null;
          seenFinal.add(result.finalUrl);

          const page = extractPage(result.text, result.finalUrl, {
            maxLinksPerPage: options.maxLinksPerPage,
            maxUrlLength: options.maxUrlLength,
            extract: options.extract
          });
          page.status = result.status;
          page.contentType = result.contentType;
          page.bytes = result.bytes;
          page.contentHash = `sha256:${createHash("sha256").update(result.text).digest("hex")}`;
          page.depth = item.depth;
          page.discoveredFrom = item.discoveredFrom;
          page.redirectChain = result.redirectChain;
          page.etag = result.etag || null;
          page.lastModified = result.lastModified || null;
          page.robotsAllowed = options.obeyRobots;
          return page;
        } catch (error) {
          if (operationSignal.aborted) throw abortError(operationSignal);
          if (attempt + 1 < attempts && isRetryable(error) && Date.now() < deadlineAt) {
            stats.retries += 1;
            await sleep(retryDelay(error, attempt, options), operationSignal);
            continue;
          }
          if (error?.code !== "ROBOTS_DENIED") await recordFailure(item.url, error, "page");
          if (isFatalCrawlError(error)) throw error;
          return null;
        }
      }
      return null;
    }

    while (queue.length && pages.length < options.maxPages) {
      if (operationSignal.aborted) throw abortError(operationSignal);
      if (Date.now() >= deadlineAt) throw durationError;
      const batch = [];
      const batchSize = Math.min(options.concurrency, options.maxPages - pages.length);
      while (batch.length < batchSize && queue.length) batch.push(queue.shift());
      const settled = await Promise.allSettled(batch.map(processItem));
      const rejected = settled.find((entry) => entry.status === "rejected");
      if (rejected) throw rejected.reason;
      const batchPages = settled.map((entry) => entry.value);
      for (const page of batchPages) {
        if (!page || pages.length >= options.maxPages) continue;
        pages.push(page);
        await runBoundedCallback(options.onPage, { ...page, links: [...page.links] }, operationSignal);
        if (page.depth < options.maxDepth) {
          for (const link of page.links) enqueue(link, page.depth + 1, page.url);
        }
      }
    }

    if (operationSignal.aborted) throw abortError(operationSignal);
    if (Date.now() >= deadlineAt) throw durationError;
    const finishedAtMs = Date.now();
    return {
      pages,
      failures,
      stats: {
        ...stats,
        pages: pages.length,
        failures: failures.length,
        queued: enqueued.size,
        seen: seen.size,
        durationMs: finishedAtMs - startedAtMs,
        startedAt: new Date(startedAtMs).toISOString(),
        finishedAt: new Date(finishedAtMs).toISOString()
      }
    };
  } finally {
    try {
      if (browserFetcher) {
        await awaitWithSignal(browserFetcher.close(), operationSignal);
      }
    } finally {
      clearTimeout(durationTimer);
    }
  }
}

export async function crawl(input = {}) {
  const result = await crawlDetailed(input);
  Object.defineProperty(result.pages, "stats", {
    value: result.stats,
    enumerable: false
  });
  Object.defineProperty(result.pages, "failures", {
    value: result.failures,
    enumerable: false
  });
  return result.pages;
}

export async function mapSite(input = {}) {
  const result = await crawlDetailed(input);
  return {
    entries: result.pages.map((page) => ({
      url: page.url,
      canonical: page.canonical,
      title: page.title,
      description: page.description,
      status: page.status,
      contentType: page.contentType,
      depth: page.depth,
      discoveredFrom: page.discoveredFrom,
      contentHash: page.contentHash,
      linkCount: page.links.length,
      fetchedAt: page.fetchedAt
    })),
    failures: result.failures,
    stats: result.stats
  };
}

export async function discoverSitemapUrls(sitemapUrl, inputOptions = {}) {
  if (!isHttpUrl(sitemapUrl)) throw new TypeError("sitemapUrl must be an absolute HTTP(S) URL.");
  inputOptions = snapshotOptionRecord(inputOptions, "crawl", CRAWL_OPTION_KEYS);
  const options = normalizeOptions({
    ...inputOptions,
    maxPages: inputOptions.maxPages || 1,
    maxSeeds: 1,
    includeSitemaps: true
  }, 1);
  const initialUrl = normalizeUrl(sitemapUrl, options.maxUrlLength);
  const initialOrigin = new URL(initialUrl).origin;
  const allowedOrigins = new Set(options.allowedOrigins);
  const isSensitiveUrl = (value) => options.skipSensitivePaths && hasSensitivePath(value);
  const isNetworkUrlAllowed = (value) => {
    try {
      const normalized = normalizeUrl(value, options.maxUrlLength);
      const origin = new URL(normalized).origin;
      if (allowedOrigins.size && !allowedOrigins.has(origin)) return false;
      return !options.sameOrigin || origin === initialOrigin;
    } catch {
      return false;
    }
  };
  const isSitemapUrlAllowed = (value) => isNetworkUrlAllowed(value) && !isSensitiveUrl(value);
  if (!isSitemapUrlAllowed(initialUrl)) {
    throw createCrawlerSecurityError("Sitemap URL is outside the configured origin policy.", { url: initialUrl });
  }

  const startedAt = Date.now();
  const deadlineAt = startedAt + options.maxDurationMs;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(limitError("CRAWL_DURATION_LIMIT", `Sitemap discovery exceeded maxDurationMs (${options.maxDurationMs}).`));
  }, options.maxDurationMs);
  const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
  let requests = 0;
  let bytes = 0;
  let lastRequestAt = 0;
  const consumeBytes = (count) => {
    if (bytes + count > options.maxTotalBytes) {
      throw limitError("CRAWL_TOTAL_BYTES_LIMIT", `Sitemap discovery exceeded maxTotalBytes (${options.maxTotalBytes}).`);
    }
    bytes += count;
  };
  const beforeNetworkRequest = async () => {
    if (signal.aborted) throw abortError(signal);
    if (requests >= options.maxRequests) {
      throw limitError("CRAWL_REQUEST_LIMIT", `Sitemap discovery exceeded maxRequests (${options.maxRequests}).`);
    }
    requests += 1;
    await sleep(Math.max(0, lastRequestAt + options.delayMs - Date.now()), signal);
    lastRequestAt = Date.now();
  };

  const queue = [initialUrl];
  const queued = new Set(queue);
  const visited = new Set();
  const discovered = new Set();
  try {
    await resolveUrlTarget(initialUrl, {
      allowPrivateNetworks: options.allowPrivateNetworks,
      lookup: options.dnsLookup || undefined,
      signal
    });
    while (queue.length && visited.size < options.maxSitemaps && discovered.size < options.maxQueue) {
      const current = queue.shift();
      if (visited.has(current) || !isSitemapUrlAllowed(current)) continue;
      visited.add(current);
      const document = await discoverSitemapDocument(current, {
        ...options,
        signal,
        deadlineAt,
        isSitemapUrlAllowed,
        beforeNetworkRequest,
        consumeBytes,
        recordFailure: null
      });
      for (const value of document.urls) {
        if (discovered.size >= options.maxQueue) break;
        if (!isNetworkUrlAllowed(value)) continue;
        if (options.include.length && !matchesAny(value, options.include)) continue;
        if (options.exclude.length && matchesAny(value, options.exclude)) continue;
        if (isSensitiveUrl(value)) continue;
        discovered.add(value);
      }
      for (const nested of document.sitemaps) {
        if (queued.size >= options.maxSitemaps || queued.has(nested)
          || !isSitemapUrlAllowed(nested)) continue;
        queued.add(nested);
        queue.push(nested);
      }
    }
    return [...discovered];
  } finally {
    clearTimeout(timer);
  }
}

export { normalizeUrl };
export { classifyIpAddress, isPublicIpAddress, resolveUrlTarget } from "./security.js";
