const IDENTITY_SCHEMA = "cockroach.identity-profile.v1";
const CHALLENGE_SCHEMA = "cockroach.challenge-report.v1";

const CHALLENGE_MODES = Object.freeze(["deny", "report", "operator"]);

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

function headerToken(value, label, maximum = 512) {
  const text = String(value ?? "");
  if (!text.trim() || text.length > maximum) {
    throw new TypeError(`${label} must contain 1-${maximum} characters.`);
  }
  if (/[\r\n\0]/u.test(text)) throw new TypeError(`${label} must not contain control characters.`);
  return text;
}

const BASE_ACCEPT = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8";

const PROFILES = Object.freeze({
  "chrome-windows": Object.freeze({
    engine: "chromium",
    brand: "Chrome",
    majorVersion: 141,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    platform: "Windows",
    platformVersion: "15.0.0",
    architecture: "x86",
    bitness: "64",
    mobile: false,
    viewport: Object.freeze({ width: 1920, height: 1080, deviceScaleFactor: 1 }),
    acceptLanguage: "en-US,en;q=0.9",
    accept: BASE_ACCEPT,
    tlsProfile: "chrome-141"
  }),
  "chrome-macos": Object.freeze({
    engine: "chromium",
    brand: "Chrome",
    majorVersion: 141,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    platform: "macOS",
    platformVersion: "15.6.0",
    architecture: "arm",
    bitness: "64",
    mobile: false,
    viewport: Object.freeze({ width: 1728, height: 1117, deviceScaleFactor: 2 }),
    acceptLanguage: "en-US,en;q=0.9",
    accept: BASE_ACCEPT,
    tlsProfile: "chrome-141"
  }),
  "edge-windows": Object.freeze({
    engine: "chromium",
    brand: "Microsoft Edge",
    majorVersion: 141,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
    platform: "Windows",
    platformVersion: "15.0.0",
    architecture: "x86",
    bitness: "64",
    mobile: false,
    viewport: Object.freeze({ width: 1920, height: 1080, deviceScaleFactor: 1 }),
    acceptLanguage: "en-US,en;q=0.9",
    accept: BASE_ACCEPT,
    tlsProfile: "edge-141"
  }),
  "firefox-windows": Object.freeze({
    engine: "firefox",
    brand: "Firefox",
    majorVersion: 146,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0",
    platform: "Windows",
    platformVersion: "15.0.0",
    architecture: "x86",
    bitness: "64",
    mobile: false,
    viewport: Object.freeze({ width: 1920, height: 1080, deviceScaleFactor: 1 }),
    acceptLanguage: "en-US,en;q=0.5",
    accept: BASE_ACCEPT,
    tlsProfile: "firefox-146"
  }),
  "safari-macos": Object.freeze({
    engine: "webkit",
    brand: "Safari",
    majorVersion: 18,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15",
    platform: "macOS",
    platformVersion: "15.6.0",
    architecture: "arm",
    bitness: "64",
    mobile: false,
    viewport: Object.freeze({ width: 1728, height: 1117, deviceScaleFactor: 2 }),
    acceptLanguage: "en-US,en;q=0.9",
    accept: BASE_ACCEPT,
    tlsProfile: "safari-18"
  }),
  "chrome-android": Object.freeze({
    engine: "chromium",
    brand: "Chrome",
    majorVersion: 141,
    userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
    platform: "Android",
    platformVersion: "15.0.0",
    architecture: "arm",
    bitness: "64",
    mobile: true,
    viewport: Object.freeze({ width: 412, height: 915, deviceScaleFactor: 2.625 }),
    acceptLanguage: "en-US,en;q=0.9",
    accept: BASE_ACCEPT,
    tlsProfile: "chrome-141"
  }),
  "safari-ios": Object.freeze({
    engine: "webkit",
    brand: "Safari",
    majorVersion: 18,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
    platform: "iOS",
    platformVersion: "18.6.0",
    architecture: "arm",
    bitness: "64",
    mobile: true,
    viewport: Object.freeze({ width: 393, height: 852, deviceScaleFactor: 3 }),
    acceptLanguage: "en-US,en;q=0.9",
    accept: BASE_ACCEPT,
    tlsProfile: "safari-18"
  })
});

export const identityProfileNames = Object.freeze(Object.keys(PROFILES));

export function resolveIdentity(value = "chrome-windows", overrides = {}) {
  let base;
  if (typeof value === "string") {
    base = PROFILES[value];
    if (!base) {
      throw new TypeError(`Unknown identity profile '${value}'. Known: ${identityProfileNames.join(", ")}.`);
    }
  } else {
    const supplied = ownRecord(value, "identity", 16);
    base = PROFILES[supplied.profile ?? "chrome-windows"];
    if (!base) {
      throw new TypeError(`Unknown identity profile '${supplied.profile}'.`);
    }
    overrides = { ...supplied, ...ownRecord(overrides, "identity overrides", 16) };
    delete overrides.profile;
  }

  const patch = ownRecord(overrides, "identity overrides", 16);
  const allowed = new Set([
    "userAgent",
    "acceptLanguage",
    "accept",
    "viewport",
    "platform",
    "platformVersion",
    "mobile",
    "timezone",
    "locale"
  ]);
  const unknown = Object.keys(patch).filter((key) => !allowed.has(key));
  if (unknown.length) throw new TypeError(`Unknown identity override(s): ${unknown.join(", ")}.`);

  const viewport = patch.viewport === undefined
    ? base.viewport
    : Object.freeze({
      width: integer(ownRecord(patch.viewport, "viewport", 4).width, "viewport.width", base.viewport.width, 160, 7_680),
      height: integer(ownRecord(patch.viewport, "viewport", 4).height, "viewport.height", base.viewport.height, 160, 4_320),
      deviceScaleFactor: base.viewport.deviceScaleFactor
    });

  return Object.freeze({
    schema: IDENTITY_SCHEMA,
    name: typeof value === "string" ? value : (value.profile ?? "chrome-windows"),
    engine: base.engine,
    brand: base.brand,
    majorVersion: base.majorVersion,
    userAgent: patch.userAgent === undefined ? base.userAgent : headerToken(patch.userAgent, "userAgent"),
    platform: patch.platform === undefined ? base.platform : headerToken(patch.platform, "platform", 64),
    platformVersion: patch.platformVersion === undefined
      ? base.platformVersion
      : headerToken(patch.platformVersion, "platformVersion", 32),
    architecture: base.architecture,
    bitness: base.bitness,
    mobile: patch.mobile === undefined ? base.mobile : patch.mobile === true,
    viewport,
    acceptLanguage: patch.acceptLanguage === undefined
      ? base.acceptLanguage
      : headerToken(patch.acceptLanguage, "acceptLanguage", 256),
    accept: patch.accept === undefined ? base.accept : headerToken(patch.accept, "accept", 1_024),
    locale: patch.locale === undefined ? "en-US" : headerToken(patch.locale, "locale", 32),
    timezone: patch.timezone === undefined ? "UTC" : headerToken(patch.timezone, "timezone", 64),
    tlsProfile: base.tlsProfile
  });
}

export function identityHeaders(identity, options = {}) {
  const profile = identity?.schema === IDENTITY_SCHEMA ? identity : resolveIdentity(identity);
  const settings = ownRecord(options, "identityHeaders options", 8);
  const secure = settings.secure !== false;

  const headers = Object.create(null);
  headers["user-agent"] = profile.userAgent;
  headers.accept = profile.accept;
  headers["accept-language"] = profile.acceptLanguage;
  headers["accept-encoding"] = "gzip, deflate, br";
  headers["upgrade-insecure-requests"] = "1";

  if (profile.engine === "chromium") {
    const brands = [
      `"${profile.brand}";v="${profile.majorVersion}"`,
      `"Chromium";v="${profile.majorVersion}"`,
      '"Not?A_Brand";v="24"'
    ];
    headers["sec-ch-ua"] = brands.join(", ");
    headers["sec-ch-ua-mobile"] = profile.mobile ? "?1" : "?0";
    headers["sec-ch-ua-platform"] = `"${profile.platform}"`;
    if (settings.fullClientHints === true) {
      headers["sec-ch-ua-platform-version"] = `"${profile.platformVersion}"`;
      headers["sec-ch-ua-arch"] = `"${profile.architecture}"`;
      headers["sec-ch-ua-bitness"] = `"${profile.bitness}"`;
      headers["sec-ch-ua-full-version-list"] = brands.join(", ");
    }
  }

  if (secure) {
    headers["sec-fetch-dest"] = "document";
    headers["sec-fetch-mode"] = "navigate";
    headers["sec-fetch-site"] = "none";
    headers["sec-fetch-user"] = "?1";
  }

  return Object.freeze(headers);
}

export function identityBrowserContext(identity) {
  const profile = identity?.schema === IDENTITY_SCHEMA ? identity : resolveIdentity(identity);
  return Object.freeze({
    userAgent: profile.userAgent,
    locale: profile.locale,
    timezoneId: profile.timezone,
    isMobile: profile.mobile,
    hasTouch: profile.mobile,
    deviceScaleFactor: profile.viewport.deviceScaleFactor,
    viewport: Object.freeze({ width: profile.viewport.width, height: profile.viewport.height }),
    extraHTTPHeaders: identityHeaders(profile, { secure: false })
  });
}

function inAttribute(token) {
  return new RegExp(`(?:src|id|class|data-sitekey)\\s*=\\s*["'][^"']*${token}`, "iu");
}

function loadedFrom(host, pathPrefix = "") {
  const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(
    `(?:src|href)\\s*=\\s*["']https?://(?:[a-z0-9-]+\\.)*${escape(host)}/${escape(pathPrefix)}`,
    "iu"
  );
}

const CHALLENGE_SIGNATURES = Object.freeze([
  Object.freeze({
    vendor: "cloudflare",
    kind: "interstitial",
    headers: ["cf-mitigated"],
    body: [
      loadedFrom("challenges.cloudflare.com"),
      /__cf_chl_/iu,
      inAttribute("cf-challenge-running"),
      /<title>\s*just a moment/iu
    ]
  }),
  Object.freeze({
    vendor: "cloudflare",
    kind: "captcha",
    headers: [],
    body: [inAttribute("cf-turnstile"), /data-sitekeys*=s*["'][^"']*turnstile/iu]
  }),
  Object.freeze({
    vendor: "datadome",
    kind: "captcha",
    headers: ["x-datadome"],
    body: [loadedFrom("captcha-delivery.com"), inAttribute("datadome")]
  }),
  Object.freeze({
    vendor: "perimeterx",
    kind: "captcha",
    headers: [],
    body: [inAttribute("px-captcha"), /_pxhd/iu, inAttribute("perimeterx")]
  }),
  Object.freeze({
    vendor: "akamai",
    kind: "interstitial",
    headers: [],
    body: [/_abck\b/iu, /akamai[^<>]{0,120}reference\s*#/iu]
  }),
  Object.freeze({
    vendor: "recaptcha",
    kind: "captcha",
    headers: [],
    body: [loadedFrom("google.com", "recaptcha/"), inAttribute("g-recaptcha")]
  }),
  Object.freeze({
    vendor: "hcaptcha",
    kind: "captcha",
    headers: [],
    body: [loadedFrom("hcaptcha.com"), inAttribute("h-captcha")]
  })
]);

export function detectChallenge(input = {}) {
  const request = ownRecord(input, "detectChallenge input", 8);
  const body = typeof request.body === "string" ? request.body.slice(0, 200_000) : "";
  const status = request.status === undefined ? 200 : integer(request.status, "status", 200, 100, 599);
  const headers = Object.create(null);
  if (request.headers !== undefined) {
    const supplied = ownRecord(request.headers, "headers", 128);
    for (const key of Object.keys(supplied)) {
      headers[key.toLowerCase()] = String(supplied[key] ?? "");
    }
  }

  const evidence = [];
  let vendor = null;
  let kind = null;

  for (const signature of CHALLENGE_SIGNATURES) {
    for (const name of signature.headers) {
      if (headers[name] !== undefined) {
        evidence.push(`header:${name}`);
        vendor ??= signature.vendor;
        kind ??= signature.kind;
      }
    }
    for (const pattern of signature.body) {
      if (pattern.test(body)) {
        evidence.push(`body:${signature.vendor}:${pattern.source.slice(0, 40)}`);
        vendor ??= signature.vendor;
        kind ??= signature.kind;
      }
    }
  }

  if (!vendor && (status === 403 || status === 429) && body.length < 4_096) {
    vendor = "unknown";
    kind = status === 429 ? "rate-limit" : "block";
    evidence.push(`status:${status}`);
  }

  return Object.freeze({
    schema: CHALLENGE_SCHEMA,
    challenged: Boolean(vendor),
    vendor,
    kind,
    status,
    evidence: Object.freeze(evidence.slice(0, 16)),
    url: typeof request.url === "string" ? request.url : null
  });
}

export class ChallengeError extends Error {
  constructor(report, message) {
    super(message ?? `Request was answered with a ${report.vendor ?? "unknown"} ${report.kind ?? "challenge"}.`);
    this.name = "ChallengeError";
    this.report = report;
    this.code = "CHALLENGE_ENCOUNTERED";
  }
}

export function normalizeChallengePolicy(value = {}) {
  if (value === false || value === undefined || value === null) {
    return Object.freeze({ mode: "deny", handler: null, authorization: null, allowOrigins: Object.freeze([]), maxAttempts: 0 });
  }
  const supplied = ownRecord(value, "challengePolicy", 8);
  const unknown = Object.keys(supplied).filter(
    (key) => !["mode", "handler", "authorization", "allowOrigins", "maxAttempts"].includes(key)
  );
  if (unknown.length) throw new TypeError(`Unknown challengePolicy option(s): ${unknown.join(", ")}.`);

  const mode = supplied.mode ?? "deny";
  if (!CHALLENGE_MODES.includes(mode)) {
    throw new TypeError(`challengePolicy.mode must be one of: ${CHALLENGE_MODES.join(", ")}.`);
  }

  if (mode !== "operator") {
    if (supplied.handler !== undefined) {
      throw new TypeError("challengePolicy.handler requires mode='operator'.");
    }
    return Object.freeze({
      mode,
      handler: null,
      authorization: null,
      allowOrigins: Object.freeze([]),
      maxAttempts: 0
    });
  }

  if (typeof supplied.handler !== "function") {
    throw new TypeError("challengePolicy.mode='operator' requires an operator-supplied handler function.");
  }
  const authorization = supplied.authorization;
  if (typeof authorization !== "string" || authorization.trim().length < 8) {
    throw new TypeError(
      "challengePolicy.mode='operator' requires an 'authorization' statement naming the operator's right to access the target."
    );
  }
  if (!Array.isArray(supplied.allowOrigins) || supplied.allowOrigins.length === 0) {
    throw new TypeError("challengePolicy.mode='operator' requires a non-empty allowOrigins array.");
  }
  const allowOrigins = supplied.allowOrigins.map((entry) => {
    const parsed = new URL(String(entry));
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new TypeError("challengePolicy.allowOrigins entries must be http(s) origins.");
    }
    return parsed.origin;
  });
  if (allowOrigins.length > 64) throw new TypeError("challengePolicy.allowOrigins exceeds its 64-entry limit.");

  return Object.freeze({
    mode,
    handler: supplied.handler,
    authorization: authorization.trim().slice(0, 512),
    allowOrigins: Object.freeze([...new Set(allowOrigins)]),
    maxAttempts: integer(supplied.maxAttempts, "maxAttempts", 1, 1, 5)
  });
}

export async function applyChallengePolicy(report, policy, context = {}) {
  if (report?.schema !== CHALLENGE_SCHEMA) {
    throw new TypeError(`report must be a ${CHALLENGE_SCHEMA} record.`);
  }
  const resolved = policy?.mode ? policy : normalizeChallengePolicy(policy);
  if (!report.challenged) {
    return Object.freeze({ resolved: true, action: "none", report });
  }
  if (resolved.mode === "deny") {
    throw new ChallengeError(report);
  }
  if (resolved.mode === "report") {
    return Object.freeze({ resolved: false, action: "reported", report });
  }

  const url = context.url ?? report.url;
  if (typeof url !== "string") {
    throw new TypeError("applyChallengePolicy requires a url in operator mode.");
  }
  const origin = new URL(url).origin;
  if (!resolved.allowOrigins.includes(origin)) {
    throw new ChallengeError(
      report,
      `Challenge at ${origin} is outside challengePolicy.allowOrigins. Add the origin only if you are authorized to access it.`
    );
  }

  const outcome = await resolved.handler(
    Object.freeze({
      report,
      url,
      origin,
      authorization: resolved.authorization,
      attempt: integer(context.attempt, "attempt", 1, 1, 5)
    })
  );

  if (!outcome || typeof outcome !== "object") {
    return Object.freeze({ resolved: false, action: "handler-declined", report });
  }
  const supplied = ownRecord(outcome, "challenge handler result", 8);
  return Object.freeze({
    resolved: supplied.resolved === true,
    action: "handler",
    report,
    cookies: Array.isArray(supplied.cookies) ? Object.freeze([...supplied.cookies]) : Object.freeze([]),
    headers: supplied.headers === undefined ? Object.freeze({}) : Object.freeze({ ...ownRecord(supplied.headers, "headers", 32) })
  });
}

export const identityDefaults = Object.freeze({
  profileSchema: IDENTITY_SCHEMA,
  challengeSchema: CHALLENGE_SCHEMA,
  challengeModes: CHALLENGE_MODES,
  profiles: identityProfileNames
});
