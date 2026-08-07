import { createRequire } from "node:module";

const EXPECTED_BACKEND_VERSION = "0.2.0";
const DEFAULT_MAX_INPUT_CHARACTERS = 10_000_000;
const ABSOLUTE_MAX_INPUT_CHARACTERS = 20_000_000;
const DEFAULT_MAX_OUTPUT_CHARACTERS = 2_000_000;
const ABSOLUTE_MAX_OUTPUT_CHARACTERS = 5_000_000;
const DEFAULT_MAX_IMAGES = 100;
const ABSOLUTE_MAX_IMAGES = 1_000;

const PROFILE_OPTIONS = Object.freeze({
  balanced: Object.freeze({
    favorPrecision: false,
    favorRecall: false,
    useFallbackExtraction: true
  }),
  precision: Object.freeze({
    favorPrecision: true,
    favorRecall: false,
    useFallbackExtraction: false
  }),
  recall: Object.freeze({
    favorPrecision: false,
    favorRecall: true,
    useFallbackExtraction: true
  })
});

const PAGE_TYPES = new Set([
  "article",
  "forum",
  "product",
  "collection",
  "listing",
  "documentation",
  "service"
]);

const OPTION_KEYS = new Set([
  "profile",
  "url",
  "failClosed",
  "diagnostics",
  "minQuality",
  "minOutputCharacters",
  "minOutputWords",
  "maxInputCharacters",
  "maxOutputCharacters",
  "maxImages",
  "includeComments",
  "includeTables",
  "includeImages",
  "includeLinks",
  "targetLanguage",
  "pageType"
]);

const STRONG_CHALLENGE_PATTERNS = Object.freeze([
  /(?:class|id)=["'][^"']*(?:cf-chl|challenge-platform|turnstile|g-recaptcha|h-captcha|hcaptcha)[^"']*["']/iu,
  /(?:src|href)=["'][^"']*\/cdn-cgi\/challenge-platform\//iu,
  /<title[^>]*>\s*(?:just a moment|attention required|access denied|security check)/iu
]);

const CHALLENGE_TEXT_PATTERNS = Object.freeze([
  /\bverify (?:that )?you are (?:a )?human\b/iu,
  /\bchecking (?:your )?browser\b/iu,
  /\bcomplete the security check\b/iu,
  /\bcaptcha\b/iu
]);

const APPLICATION_SHELL_PATTERN = /<(?:div|main)[^>]+id=["'](?:__next|__nuxt|root|app)["'][^>]*>/iu;

export class QualityExtractionError extends Error {
  constructor(code, message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "QualityExtractionError";
    this.code = code;
  }
}

function backendUnavailable(cause, detail = "") {
  const suffix = detail ? ` ${detail}` : "";
  return new QualityExtractionError(
    "QUALITY_BACKEND_UNAVAILABLE",
    `The optional Node quality backend trafilatura@${EXPECTED_BACKEND_VERSION} is unavailable.${suffix}`,
    { cause }
  );
}

const require = createRequire(import.meta.url);
let nativeExtract;
try {
  const manifest = require("trafilatura/package.json");
  if (manifest?.version !== EXPECTED_BACKEND_VERSION) {
    throw new Error(
      `Backend version mismatch: expected ${EXPECTED_BACKEND_VERSION}, received ${manifest?.version || "unknown"}.`
    );
  }
  const backend = await import("trafilatura");
  if (typeof backend.extract !== "function") {
    throw new TypeError("The trafilatura package does not export extract().");
  }
  nativeExtract = backend.extract;
} catch (error) {
  throw backendUnavailable(
    error,
    "Install the exact dependency and a supported native platform package; no core-extractor fallback was attempted."
  );
}

export const qualityBackend = Object.freeze({
  name: "trafilatura",
  version: EXPECTED_BACKEND_VERSION,
  runtime: "node-native"
});

function optionSnapshot(value) {
  if (value === undefined) return Object.create(null);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("quality options must be a plain object.");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("quality options must be a plain object.");
  }

  const result = Object.create(null);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== "string" || !OPTION_KEYS.has(key)) {
      throw new TypeError(`Unknown quality option: ${String(key)}.`);
    }
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`quality options.${key} must be an own enumerable data property.`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function booleanOption(value, label, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw new TypeError(`${label} must be a boolean.`);
  return value;
}

function finiteOption(value, label, fallback, minimum, maximum) {
  const result = value === undefined ? fallback : value;
  if (typeof result !== "number" || !Number.isFinite(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label} must be a finite number from ${minimum} to ${maximum}.`);
  }
  return result;
}

function integerOption(value, label, fallback, minimum, maximum) {
  const result = finiteOption(value, label, fallback, minimum, maximum);
  if (!Number.isInteger(result)) throw new TypeError(`${label} must be an integer.`);
  return result;
}

function normalizeUrl(value) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value || value.length > 4_096) {
    throw new TypeError("quality options.url must be an absolute HTTP(S) URL of at most 4096 characters.");
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new TypeError("quality options.url must be an absolute HTTP(S) URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new TypeError("quality options.url must be an HTTP(S) URL without embedded credentials.");
  }
  return parsed.toString();
}

function normalizeLanguage(value) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u.test(value)) {
    throw new TypeError("quality options.targetLanguage must be a valid language tag.");
  }
  return value;
}

function normalizeOptions(value) {
  const input = optionSnapshot(value);
  const profile = input.profile ?? "balanced";
  if (typeof profile !== "string" || !Object.hasOwn(PROFILE_OPTIONS, profile)) {
    throw new TypeError("quality options.profile must be balanced, precision, or recall.");
  }
  if (input.pageType !== undefined && (typeof input.pageType !== "string" || !PAGE_TYPES.has(input.pageType))) {
    throw new TypeError(`quality options.pageType must be one of: ${[...PAGE_TYPES].join(", ")}.`);
  }

  const maxInputCharacters = integerOption(
    input.maxInputCharacters,
    "quality options.maxInputCharacters",
    DEFAULT_MAX_INPUT_CHARACTERS,
    1,
    ABSOLUTE_MAX_INPUT_CHARACTERS
  );
  const maxOutputCharacters = integerOption(
    input.maxOutputCharacters,
    "quality options.maxOutputCharacters",
    DEFAULT_MAX_OUTPUT_CHARACTERS,
    1,
    ABSOLUTE_MAX_OUTPUT_CHARACTERS
  );
  const minOutputCharacters = integerOption(
    input.minOutputCharacters,
    "quality options.minOutputCharacters",
    200,
    0,
    maxOutputCharacters
  );

  return Object.freeze({
    profile,
    url: normalizeUrl(input.url),
    failClosed: booleanOption(input.failClosed, "quality options.failClosed", false),
    diagnostics: booleanOption(input.diagnostics, "quality options.diagnostics", false),
    minQuality: finiteOption(input.minQuality, "quality options.minQuality", 0.5, 0, 1),
    minOutputCharacters,
    minOutputWords: integerOption(input.minOutputWords, "quality options.minOutputWords", 40, 0, 100_000),
    maxInputCharacters,
    maxOutputCharacters,
    maxImages: integerOption(
      input.maxImages,
      "quality options.maxImages",
      DEFAULT_MAX_IMAGES,
      0,
      ABSOLUTE_MAX_IMAGES
    ),
    includeComments: booleanOption(input.includeComments, "quality options.includeComments", false),
    includeTables: booleanOption(input.includeTables, "quality options.includeTables", true),
    includeImages: booleanOption(input.includeImages, "quality options.includeImages", false),
    includeLinks: booleanOption(input.includeLinks, "quality options.includeLinks", false),
    targetLanguage: normalizeLanguage(input.targetLanguage),
    pageType: input.pageType
  });
}

function optionalString(value, label, maximum = DEFAULT_MAX_OUTPUT_CHARACTERS) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new QualityExtractionError("QUALITY_BACKEND_RESPONSE_INVALID", `${label} must be a string.`);
  }
  if (value.length > maximum) return value;
  return value;
}

function boundedBackendString(value, label, maximum = 16_384) {
  const normalized = optionalString(value, label, maximum);
  if (normalized !== null && normalized.length > maximum) {
    throw new QualityExtractionError(
      "QUALITY_BACKEND_RESPONSE_INVALID",
      `${label} exceeds its ${maximum}-character response bound.`
    );
  }
  return normalized;
}

function stringArray(value, label, maximumEntries = 128, maximumLength = 4_096) {
  if (!Array.isArray(value)) {
    throw new QualityExtractionError("QUALITY_BACKEND_RESPONSE_INVALID", `${label} must be an array.`);
  }
  if (value.length > maximumEntries) {
    throw new QualityExtractionError(
      "QUALITY_BACKEND_RESPONSE_INVALID",
      `${label} exceeds its ${maximumEntries}-entry response bound.`
    );
  }
  return Object.freeze(value.map((entry, index) => {
    if (typeof entry !== "string" || entry.length > maximumLength) {
      throw new QualityExtractionError(
        "QUALITY_BACKEND_RESPONSE_INVALID",
        `${label}[${index}] must be a string of at most ${maximumLength} characters.`
      );
    }
    return entry;
  }));
}

function boundedMetadataArray(value, label, maximumEntries = 128, maximumLength = 4_096) {
  if (!Array.isArray(value)) {
    throw new QualityExtractionError("QUALITY_BACKEND_RESPONSE_INVALID", `${label} must be an array.`);
  }
  const truncated = value.length > maximumEntries;
  const selected = value.slice(0, maximumEntries);
  const values = selected.map((entry, index) => {
    if (typeof entry !== "string" || entry.length > maximumLength) {
      throw new QualityExtractionError(
        "QUALITY_BACKEND_RESPONSE_INVALID",
        `${label}[${index}] must be a string of at most ${maximumLength} characters.`
      );
    }
    return entry;
  });
  return { values: Object.freeze(values), truncated };
}

function normalizedMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new QualityExtractionError("QUALITY_BACKEND_RESPONSE_INVALID", "backend metadata must be an object.");
  }
  const categories = boundedMetadataArray(value.categories ?? [], "metadata.categories");
  const tags = boundedMetadataArray(value.tags ?? [], "metadata.tags");
  return {
    value: Object.freeze({
    title: boundedBackendString(value.title, "metadata.title"),
    author: boundedBackendString(value.author, "metadata.author"),
    url: boundedBackendString(value.url, "metadata.url"),
    hostname: boundedBackendString(value.hostname, "metadata.hostname"),
    description: boundedBackendString(value.description, "metadata.description"),
    siteName: boundedBackendString(value.siteName, "metadata.siteName"),
    date: boundedBackendString(value.date, "metadata.date"),
    categories: categories.values,
    tags: tags.values,
    id: boundedBackendString(value.id, "metadata.id"),
    fingerprint: boundedBackendString(value.fingerprint, "metadata.fingerprint"),
    license: boundedBackendString(value.license, "metadata.license"),
    language: boundedBackendString(value.language, "metadata.language"),
    image: boundedBackendString(value.image, "metadata.image"),
    pageType: boundedBackendString(value.pageType, "metadata.pageType")
    }),
    truncated: categories.truncated || tags.truncated
  };
}

function normalizedImages(value, maximum) {
  if (!Array.isArray(value)) {
    throw new QualityExtractionError("QUALITY_BACKEND_RESPONSE_INVALID", "backend images must be an array.");
  }
  const overLimit = value.length > maximum;
  const selected = overLimit ? [] : value;
  const images = selected.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new QualityExtractionError("QUALITY_BACKEND_RESPONSE_INVALID", `images[${index}] must be an object.`);
    }
    if (typeof entry.isHero !== "boolean") {
      throw new QualityExtractionError("QUALITY_BACKEND_RESPONSE_INVALID", `images[${index}].isHero must be a boolean.`);
    }
    return Object.freeze({
      src: boundedBackendString(entry.src, `images[${index}].src`) ?? "",
      filename: boundedBackendString(entry.filename, `images[${index}].filename`) ?? "",
      alt: boundedBackendString(entry.alt, `images[${index}].alt`),
      caption: boundedBackendString(entry.caption, `images[${index}].caption`),
      isHero: entry.isHero
    });
  });
  return { images: Object.freeze(images), overLimit };
}

function normalizedScore(value, label, required) {
  if (!required && (value === undefined || value === null)) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new QualityExtractionError("QUALITY_BACKEND_RESPONSE_INVALID", `${label} must be a number from 0 to 1.`);
  }
  return value;
}

function wordCount(value) {
  return value?.match(/[\p{L}\p{N}_]+/gu)?.length ?? 0;
}

function includesPattern(patterns, value) {
  return patterns.some((pattern) => pattern.test(value));
}

function assessRisks(html, text, quality, options, warnings, outputLimitExceeded, imageLimitExceeded) {
  const reasons = [];
  const outputWords = wordCount(text);
  const challenge = includesPattern(STRONG_CHALLENGE_PATTERNS, html)
    || (outputWords < 300 && includesPattern(CHALLENGE_TEXT_PATTERNS, `${html}\n${text || ""}`));
  const shell = APPLICATION_SHELL_PATTERN.test(html)
    && outputWords < Math.max(options.minOutputWords, 50);

  if (challenge) reasons.push("CHALLENGE_PAGE");
  if (shell) reasons.push("APPLICATION_SHELL");
  if (!text?.trim()) reasons.push("EMPTY_OUTPUT");
  else if (text.length < options.minOutputCharacters || outputWords < options.minOutputWords) {
    reasons.push("OUTPUT_TOO_SHORT");
  }
  if (quality < options.minQuality) reasons.push("LOW_EXTRACTION_QUALITY");
  if (outputLimitExceeded) reasons.push("OUTPUT_LIMIT_EXCEEDED");
  if (imageLimitExceeded) reasons.push("IMAGE_LIMIT_EXCEEDED");

  return Object.freeze({
    reasons: Object.freeze(reasons),
    outputWords,
    challenge,
    shell,
    nativeFallbackUsed: warnings.some((warning) => /used fallback extraction/iu.test(warning))
  });
}

/**
 * Runs the exact native trafilatura backend through an opt-in Node-only API.
 * Core and serverless entry points deliberately do not import this module.
 */
export function extractPageQuality(html, options = undefined) {
  if (typeof html !== "string" || !html.trim()) {
    throw new TypeError("html must be a non-empty string.");
  }
  const settings = normalizeOptions(options);
  if (html.length > settings.maxInputCharacters) {
    const error = new RangeError(
      `html exceeds quality options.maxInputCharacters (${html.length} > ${settings.maxInputCharacters}).`
    );
    error.code = "QUALITY_INPUT_LIMIT";
    throw error;
  }

  const profile = PROFILE_OPTIONS[settings.profile];
  const backendOptions = {
    includeComments: settings.includeComments,
    includeTables: settings.includeTables,
    includeImages: settings.includeImages,
    includeLinks: settings.includeLinks,
    favorPrecision: profile.favorPrecision,
    favorRecall: profile.favorRecall,
    deduplicate: true,
    includeFormatting: true,
    useFallbackExtraction: profile.useFallbackExtraction,
    includeTitleInContent: true,
    outputMarkdown: true
  };
  if (settings.url) backendOptions.url = settings.url;
  if (settings.targetLanguage) backendOptions.targetLanguage = settings.targetLanguage;
  if (settings.pageType) backendOptions.pageType = settings.pageType;

  let nativeResult;
  try {
    nativeResult = nativeExtract(html, backendOptions);
  } catch (error) {
    throw new QualityExtractionError(
      "QUALITY_EXTRACTION_FAILED",
      "The native quality backend failed; no core-extractor fallback was attempted.",
      { cause: error }
    );
  }
  if (!nativeResult || typeof nativeResult !== "object" || typeof nativeResult.then === "function") {
    throw new QualityExtractionError(
      "QUALITY_BACKEND_RESPONSE_INVALID",
      "The native quality backend returned an invalid result."
    );
  }

  const text = optionalString(nativeResult.contentText, "contentText");
  const contentHtml = optionalString(nativeResult.contentHtml, "contentHtml");
  const markdown = optionalString(nativeResult.contentMarkdown, "contentMarkdown");
  const commentsText = optionalString(nativeResult.commentsText, "commentsText");
  const commentsHtml = optionalString(nativeResult.commentsHtml, "commentsHtml");
  const totalOutputCharacters = [text, contentHtml, markdown, commentsText, commentsHtml]
    .reduce((total, value) => total + (value?.length ?? 0), 0);
  const outputLimitExceeded = totalOutputCharacters > settings.maxOutputCharacters;
  const warnings = stringArray(nativeResult.warnings ?? [], "warnings");
  const { value: metadata, truncated: metadataTruncated } = normalizedMetadata(nativeResult.metadata);
  const quality = normalizedScore(nativeResult.extractionQuality, "extractionQuality", true);
  const classificationConfidence = normalizedScore(
    nativeResult.classificationConfidence,
    "classificationConfidence",
    false
  );
  const { images, overLimit: imageLimitExceeded } = normalizedImages(
    nativeResult.images ?? [],
    settings.maxImages
  );
  const assessment = assessRisks(
    html,
    text,
    quality,
    settings,
    warnings,
    outputLimitExceeded,
    imageLimitExceeded
  );

  if (!settings.failClosed && (outputLimitExceeded || imageLimitExceeded)) {
    const error = new RangeError(
      outputLimitExceeded
        ? `quality output exceeds maxOutputCharacters (${settings.maxOutputCharacters}).`
        : `quality output exceeds maxImages (${settings.maxImages}).`
    );
    error.code = outputLimitExceeded ? "QUALITY_OUTPUT_LIMIT" : "QUALITY_IMAGE_LIMIT";
    throw error;
  }

  const abstained = settings.failClosed && assessment.reasons.length > 0;
  const result = {
    status: abstained ? "abstained" : "accepted",
    accepted: !abstained,
    backend: qualityBackend,
    profile: settings.profile,
    text: abstained ? null : text,
    html: abstained ? null : contentHtml,
    markdown: abstained ? null : markdown,
    commentsText: abstained ? null : commentsText,
    commentsHtml: abstained ? null : commentsHtml,
    metadata,
    images: abstained ? Object.freeze([]) : images,
    extractionQuality: quality,
    classificationConfidence,
    warnings,
    abstention: abstained
      ? Object.freeze({ reasons: assessment.reasons })
      : null
  };

  if (settings.diagnostics || abstained) {
    result.diagnostics = Object.freeze({
      inputCharacters: html.length,
      outputCharacters: totalOutputCharacters,
      textCharacters: text?.length ?? 0,
      outputWords: assessment.outputWords,
      htmlCharacters: contentHtml?.length ?? 0,
      markdownCharacters: markdown?.length ?? 0,
      commentCharacters: commentsText?.length ?? 0,
      challengeDetected: assessment.challenge,
      shellDetected: assessment.shell,
      nativeFallbackUsed: assessment.nativeFallbackUsed,
      metadataTruncated,
      riskSignals: assessment.reasons
    });
  }

  return Object.freeze(result);
}
