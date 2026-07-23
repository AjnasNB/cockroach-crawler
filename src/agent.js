import { crawl } from "./index.js";

const AGENT_INPUT_KEYS = new Set([
  "urls",
  "maxPages",
  "maxDepth",
  "sameOrigin",
  "includeSitemaps",
  "skipSensitivePaths",
  "include",
  "exclude",
  "browser"
]);
const AGENT_BROWSER_KEYS = new Set(["waitUntil", "waitFor", "click"]);
const TRUSTED_BROWSER_KEYS = new Set([
  "headless",
  "headed",
  "channel",
  "executablePath",
  "storageState",
  "saveStorageState",
  "waitUntil",
  "waitFor",
  "click",
  "scroll",
  "flattenShadowDom",
  "flattenIframes",
  "artifactDirectory",
  "maxArtifactBytes",
  "screenshot",
  "pdf",
  "profileDirectory",
  "allowPersistentProfile"
]);
const AGENT_DEFAULT_KEYS = new Set([
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
  "extract",
  "traversal",
  "allowBrowser",
  "browser",
  "signal",
  "dnsLookup",
  "onPage",
  "onError"
]);

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export const cockroachCrawlerToolSchema = deepFreeze({
  type: "object",
  additionalProperties: false,
  properties: {
    urls: {
      type: "array",
      items: { type: "string", minLength: 8, maxLength: 4_096 },
      minItems: 1,
      maxItems: 20,
      description: "Absolute HTTP(S) seed URLs. Network and origin policy is enforced at execution time."
    },
    maxPages: {
      type: "integer",
      minimum: 1,
      maximum: 50,
      default: 10
    },
    maxDepth: {
      type: "integer",
      minimum: 0,
      maximum: 5,
      default: 1
    },
    sameOrigin: {
      type: "boolean",
      default: true
    },
    includeSitemaps: {
      type: "boolean",
      default: false
    },
    skipSensitivePaths: {
      type: "boolean",
      default: true,
      description: "Keep login, account, admin, checkout, and similar paths out of the crawl."
    },
    include: {
      type: "array",
      maxItems: 20,
      items: { type: "string", minLength: 1, maxLength: 256 },
      description: "Literal URL fragments that page URLs must contain."
    },
    exclude: {
      type: "array",
      maxItems: 20,
      items: { type: "string", minLength: 1, maxLength: 256 },
      description: "Literal URL fragments for page URLs to skip."
    },
    browser: {
      type: "object",
      additionalProperties: false,
      description: "Restricted browser actions. Rejected unless the tool creator explicitly enables browser mode.",
      properties: {
        waitUntil: {
          type: "string",
          enum: ["load", "domcontentloaded", "networkidle", "commit"]
        },
        waitFor: {
          type: "string",
          minLength: 1,
          maxLength: 2_048,
          description: "Selector or bounded ms:<number> delay."
        },
        click: {
          type: "array",
          maxItems: 10,
          items: { type: "string", minLength: 1, maxLength: 2_048 }
        }
      }
    }
  },
  required: ["urls"]
});

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function snapshotRecord(value, recognizedKeys, label) {
  assertPlainObject(value, label);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of recognizedKeys) {
    const descriptor = Object.hasOwn(descriptors, key) ? descriptors[key] : null;
    if (!descriptor && key in value) {
      throw new TypeError(`Inherited ${label} field '${key}' is not allowed.`);
    }
    if (descriptor && (!descriptor.enumerable || !Object.hasOwn(descriptor, "value"))) {
      throw new TypeError(`${label} field '${key}' must be an own enumerable data property.`);
    }
  }
  const snapshot = Object.create(null);
  for (const key of Reflect.ownKeys(descriptors)) {
    const printable = typeof key === "symbol" ? key.toString() : key;
    if (typeof key !== "string" || !recognizedKeys.has(key)) {
      const unknownLabel = label === "Agent tool input" ? "agent tool" : label;
      throw new TypeError(`Unknown ${unknownLabel} field(s): ${printable}.`);
    }
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`${label} field '${key}' must be an own enumerable data property.`);
    }
    snapshot[key] = descriptor.value;
  }
  return snapshot;
}

function assertKnownKeys(value, allowed, label) {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) throw new TypeError(`Unknown ${label} field(s): ${unknown.join(", ")}.`);
}

function snapshotArrayValues(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const length = descriptors.length?.value;
  if (!Number.isSafeInteger(length) || length < 0) throw new TypeError(`${label} has an invalid length.`);
  const values = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
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

function snapshotPlainData(value, label, depth = 0) {
  if (depth > 6) throw new TypeError(`${label} exceeds the supported nesting depth.`);
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
  if (Array.isArray(value)) {
    return Object.freeze(snapshotArrayValues(value, label).map((entry, index) => (
      snapshotPlainData(entry, `${label}[${index}]`, depth + 1)
    )));
  }
  if (!value || typeof value !== "object") {
    throw new TypeError(`${label} must contain only JSON-like data values.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const snapshot = Object.create(null);
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== "string" || ["__proto__", "constructor", "prototype"].includes(key)) {
      throw new TypeError(`${label} contains unsupported property '${String(key)}'.`);
    }
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`${label}.${key} must be an own enumerable data property.`);
    }
    snapshot[key] = snapshotPlainData(descriptor.value, `${label}.${key}`, depth + 1);
  }
  return Object.freeze(snapshot);
}

function snapshotAllowedOrigins(value) {
  const values = snapshotArrayValues(value, "defaults.allowedOrigins");
  return Object.freeze([...new Set(values.map((entry) => {
    if (typeof entry !== "string") {
      throw new TypeError("defaults.allowedOrigins entries must be primitive HTTP(S) origin strings.");
    }
    let url;
    try {
      url = new URL(entry);
    } catch {
      throw new TypeError(`Invalid defaults.allowedOrigins entry '${entry}'.`);
    }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password
      || url.pathname !== "/" || url.search || url.hash) {
      throw new TypeError(`defaults.allowedOrigins entry '${entry}' must be an HTTP(S) origin without credentials or a path.`);
    }
    return url.origin;
  }))]);
}

function boundedInteger(value, label, fallback, minimum, maximum) {
  const candidate = value === undefined ? fallback : value;
  if (typeof candidate !== "number" || !Number.isSafeInteger(candidate) || candidate < minimum || candidate > maximum) {
    throw new TypeError(`${label} must be a safe integer from ${minimum} to ${maximum}.`);
  }
  return candidate;
}

function validateStringList(value, label, maximumItems, maximumLength) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > maximumItems) {
    throw new TypeError(`${label} must be an array with at most ${maximumItems} entries.`);
  }
  return value.map((entry) => {
    if (typeof entry !== "string" || !entry || entry.length > maximumLength || /[\r\n\0]/.test(entry)) {
      throw new TypeError(`${label} entries must be non-empty strings up to ${maximumLength} characters.`);
    }
    return entry;
  });
}

function escapeRegexLiteral(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clonePattern(value) {
  return value instanceof RegExp ? new RegExp(value.source, value.flags) : String(value);
}

function snapshotDefaults(defaults) {
  const source = snapshotRecord(defaults, AGENT_DEFAULT_KEYS, "Agent tool defaults");
  const snapshot = Object.assign(Object.create(null), source);
  if (source.allowedOrigins !== undefined) {
    snapshot.allowedOrigins = snapshotAllowedOrigins(source.allowedOrigins);
  }
  for (const key of ["include", "exclude"]) {
    if (source[key] !== undefined) {
      const values = Array.isArray(source[key])
        ? snapshotArrayValues(source[key], `defaults.${key}`)
        : [source[key]];
      snapshot[key] = Object.freeze(values.map(clonePattern));
    }
  }
  if (source.browser && source.browser !== true) {
    const browserSource = snapshotRecord(source.browser, TRUSTED_BROWSER_KEYS, "defaults.browser");
    const browser = Object.assign(Object.create(null), browserSource);
    if (Array.isArray(browserSource.click)) {
      browser.click = Object.freeze(snapshotArrayValues(browserSource.click, "defaults.browser.click").map((entry) => {
        if (typeof entry !== "string") throw new TypeError("defaults.browser.click entries must be strings.");
        return entry;
      }));
    }
    for (const key of ["scroll", "screenshot", "pdf"]) {
      if (browserSource[key] && browserSource[key] !== true) {
        browser[key] = snapshotPlainData(browserSource[key], `defaults.browser.${key}`);
      }
    }
    snapshot.browser = Object.freeze(browser);
  }
  if (source.extract !== undefined) {
    snapshot.extract = snapshotPlainData(source.extract, "defaults.extract");
  }
  if (source.traversal !== undefined) {
    snapshot.traversal = typeof source.traversal === "string"
      ? source.traversal
      : snapshotPlainData(source.traversal, "defaults.traversal");
  }
  return Object.freeze(snapshot);
}

function validateInput(input, defaults) {
  input = snapshotRecord(input, AGENT_INPUT_KEYS, "Agent tool input");
  assertKnownKeys(input, AGENT_INPUT_KEYS, "agent tool");
  const maxSeeds = boundedInteger(defaults.maxSeeds, "defaults.maxSeeds", 20, 1, 20);
  const urls = validateStringList(input.urls, "urls", maxSeeds, defaults.maxUrlLength || 4_096);
  if (!urls?.length) throw new TypeError("urls must contain at least one absolute HTTP(S) URL.");
  for (const value of urls) {
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new TypeError(`Invalid URL '${value}'.`);
    }
    if (!(["http:", "https:"].includes(url.protocol)) || url.username || url.password) {
      throw new TypeError(`Agent URL '${value}' must be absolute HTTP(S) without embedded credentials.`);
    }
  }

  const configuredMaxPages = boundedInteger(defaults.maxPages, "defaults.maxPages", 10, 1, 50);
  const configuredMaxDepth = boundedInteger(defaults.maxDepth, "defaults.maxDepth", 1, 0, 5);
  const maxPages = boundedInteger(input.maxPages, "maxPages", configuredMaxPages, 1, configuredMaxPages);
  const maxDepth = boundedInteger(input.maxDepth, "maxDepth", configuredMaxDepth, 0, configuredMaxDepth);

  if (input.sameOrigin !== undefined && typeof input.sameOrigin !== "boolean") {
    throw new TypeError("sameOrigin must be a boolean.");
  }
  const configuredSameOrigin = defaults.sameOrigin !== false;
  if (input.sameOrigin === false && configuredSameOrigin) {
    throw new TypeError("Agent input cannot disable the creator's same-origin policy.");
  }
  const sameOrigin = configuredSameOrigin ? true : input.sameOrigin !== true ? false : true;

  if (input.includeSitemaps !== undefined && typeof input.includeSitemaps !== "boolean") {
    throw new TypeError("includeSitemaps must be a boolean.");
  }
  if (input.includeSitemaps === true && defaults.includeSitemaps !== true) {
    throw new TypeError("Agent input cannot enable sitemap expansion unless the tool creator enabled it.");
  }

  if (input.skipSensitivePaths !== undefined && typeof input.skipSensitivePaths !== "boolean") {
    throw new TypeError("skipSensitivePaths must be a boolean.");
  }
  const configuredSkipSensitive = defaults.skipSensitivePaths !== false && defaults.publicOnly !== false;
  if (input.skipSensitivePaths === false && configuredSkipSensitive) {
    throw new TypeError("Agent input cannot disable sensitive-path filtering.");
  }

  const includeValues = validateStringList(input.include, "include", 20, 256);
  const excludeValues = validateStringList(input.exclude, "exclude", 20, 256);
  const include = includeValues?.map(escapeRegexLiteral);
  const exclude = excludeValues?.map(escapeRegexLiteral);
  if (include && defaults.include) {
    throw new TypeError("Agent include patterns cannot replace a creator-configured include policy.");
  }

  let browser = null;
  if (input.browser !== undefined) {
    if (defaults.allowBrowser !== true) {
      throw new TypeError("Browser mode is disabled for this agent tool. The tool creator must opt in explicitly.");
    }
    const browserInput = snapshotRecord(input.browser, AGENT_BROWSER_KEYS, "browser");
    assertKnownKeys(browserInput, AGENT_BROWSER_KEYS, "browser");
    const click = validateStringList(browserInput.click, "browser.click", 10, 2_048);
    const waitFor = browserInput.waitFor;
    if (waitFor !== undefined && (typeof waitFor !== "string" || !waitFor || waitFor.length > 2_048)) {
      throw new TypeError("browser.waitFor must be a non-empty string up to 2,048 characters.");
    }
    const waitUntil = browserInput.waitUntil;
    if (waitUntil !== undefined && !["load", "domcontentloaded", "networkidle", "commit"].includes(waitUntil)) {
      throw new TypeError("browser.waitUntil is invalid.");
    }
    const trustedBrowser = defaults.browser === true ? {} : (defaults.browser || {});
    browser = {
      ...trustedBrowser,
      ...(waitUntil === undefined ? {} : { waitUntil }),
      ...(waitFor === undefined ? {} : { waitFor }),
      ...(click === undefined ? {} : { click })
    };
  } else if (defaults.browser) {
    if (defaults.allowBrowser !== true) {
      throw new TypeError("defaults.browser requires defaults.allowBrowser=true for an agent tool.");
    }
    browser = defaults.browser;
  }

  return {
    urls,
    maxPages,
    maxDepth,
    sameOrigin,
    includeSitemaps: defaults.includeSitemaps === true && input.includeSitemaps !== false,
    skipSensitivePaths: configuredSkipSensitive ? true : input.skipSensitivePaths !== false,
    include: include || defaults.include,
    exclude: [...(defaults.exclude || []), ...(exclude || [])],
    browser
  };
}

function toPublicResult(pages) {
  return {
    pages,
    stats: pages.stats || null,
    failures: pages.failures || []
  };
}

export async function runCockroachCrawlerTool(input = {}, defaults = {}) {
  return createCockroachCrawlerTool(defaults).execute(input);
}

export function createCockroachCrawlerTool(defaults = {}) {
  const trustedDefaults = snapshotDefaults(defaults);
  return Object.freeze({
    name: "cockroach_crawl",
    description: "Crawl public or explicitly trusted HTTP(S) pages and return untrusted, agent-readable JSON and Markdown. Robots and network policy remain enforced.",
    parameters: cockroachCrawlerToolSchema,
    input_schema: cockroachCrawlerToolSchema,
    async execute(input) {
      const validated = validateInput(input, trustedDefaults);
      const pages = await crawl({
        seeds: validated.urls,
        maxPages: validated.maxPages,
        maxSeeds: trustedDefaults.maxSeeds ?? 20,
        maxRequests: trustedDefaults.maxRequests ?? Math.max(50, validated.maxPages * 8),
        maxQueue: trustedDefaults.maxQueue ?? Math.max(100, validated.maxPages * 20),
        maxLinksPerPage: trustedDefaults.maxLinksPerPage ?? 2_000,
        maxUrlLength: trustedDefaults.maxUrlLength ?? 4_096,
        maxDepth: validated.maxDepth,
        concurrency: trustedDefaults.concurrency ?? 4,
        sameOrigin: validated.sameOrigin,
        allowedOrigins: trustedDefaults.allowedOrigins || [],
        include: validated.include,
        exclude: validated.exclude,
        skipSensitivePaths: validated.skipSensitivePaths,
        includeSitemaps: validated.includeSitemaps,
        maxSitemaps: trustedDefaults.maxSitemaps ?? 20,
        maxUrlsPerSitemap: trustedDefaults.maxUrlsPerSitemap ?? 5_000,
        obeyRobots: true,
        allowPrivateNetworks: trustedDefaults.allowPrivateNetworks === true,
        userAgent: trustedDefaults.userAgent,
        delayMs: trustedDefaults.delayMs ?? 250,
        timeoutMs: trustedDefaults.timeoutMs ?? 15_000,
        maxDurationMs: trustedDefaults.maxDurationMs ?? 600_000,
        maxBytes: trustedDefaults.maxBytes ?? 3 * 1024 * 1024,
        maxTotalBytes: trustedDefaults.maxTotalBytes,
        maxRedirects: trustedDefaults.maxRedirects ?? 5,
        maxRetries: trustedDefaults.maxRetries ?? 1,
        retryDelayMs: trustedDefaults.retryDelayMs ?? 250,
        browser: validated.browser,
        extract: trustedDefaults.extract,
        traversal: trustedDefaults.traversal,
        signal: trustedDefaults.signal,
        dnsLookup: trustedDefaults.dnsLookup,
        onPage: trustedDefaults.onPage,
        onError: trustedDefaults.onError
      });
      return toPublicResult(pages);
    }
  });
}
