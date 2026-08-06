import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

const FINGERPRINT_SCHEMA = "cockroach.element-fingerprint.v1";
const STORE_SCHEMA = "cockroach.element-store.v1";

const IDENTITY_ATTRIBUTES = Object.freeze([
  "id",
  "name",
  "role",
  "type",
  "itemprop",
  "aria-label",
  "data-testid",
  "data-test",
  "data-id",
  "data-qa"
]);

const DEFAULT_WEIGHTS = Object.freeze({
  tag: 0.1,
  id: 0.14,
  classes: 0.1,
  attributes: 0.08,
  text: 0.3,
  path: 0.14,
  structure: 0.14
});

const TAG_FAMILIES = Object.freeze({
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
  h5: "heading",
  h6: "heading",
  div: "container",
  section: "container",
  article: "container",
  main: "container",
  aside: "container",
  header: "container",
  footer: "container",
  ul: "list",
  ol: "list",
  menu: "list",
  li: "listitem",
  span: "inline",
  em: "inline",
  strong: "inline",
  b: "inline",
  i: "inline",
  small: "inline",
  label: "inline",
  p: "text",
  blockquote: "text",
  input: "field",
  textarea: "field",
  select: "field",
  button: "action",
  a: "action"
});

const MAX_DEPTH = 64;
const MAX_CLASSES = 32;
const MAX_CHILD_TAGS = 32;
const MAX_TOKENS = 64;

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

function ownRecord(value, label, maximum = 64) {
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

function safeSegment(value, label) {
  const result = String(value ?? "default").normalize("NFKC");
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(result) || result === "." || result === "..") {
    throw new TypeError(`${label} must contain only letters, digits, dot, underscore, or hyphen.`);
  }
  return result;
}

function normalizeText(value, maximum = 240) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > maximum ? text.slice(0, maximum) : text;
}

function tokenize(value) {
  const tokens = normalizeText(value, 1_024)
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter((token) => token.length > 0);
  return tokens.slice(0, MAX_TOKENS);
}

function jaccard(left, right) {
  const a = new Set(left);
  const b = new Set(right);
  if (!a.size && !b.size) return null;
  let shared = 0;
  for (const entry of a) if (b.has(entry)) shared += 1;
  const union = a.size + b.size - shared;
  return union === 0 ? null : shared / union;
}

function bigrams(value) {
  const text = value.toLowerCase();
  const result = new Set();
  for (let index = 0; index + 1 < text.length; index += 1) {
    result.add(text.slice(index, index + 2));
  }
  return result;
}

function dice(left, right) {
  if (!left && !right) return null;
  if (!left || !right) return 0;
  const a = bigrams(left);
  const b = bigrams(right);
  if (!a.size || !b.size) return left === right ? 1 : 0;
  let shared = 0;
  for (const entry of a) if (b.has(entry)) shared += 1;
  return (2 * shared) / (a.size + b.size);
}

function longestCommonSubsequence(left, right) {
  if (!left.length || !right.length) return 0;
  let previous = new Array(right.length + 1).fill(0);
  let current = new Array(right.length + 1).fill(0);
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = left[row - 1] === right[column - 1]
        ? previous[column - 1] + 1
        : Math.max(previous[column], current[column - 1]);
    }
    const swap = previous;
    previous = current;
    current = swap;
    current.fill(0);
  }
  return previous[right.length];
}

function tagAffinity(left, right) {
  if (left === right) return 1;
  if (!left || !right) return 0;
  const leftFamily = TAG_FAMILIES[left];
  const rightFamily = TAG_FAMILIES[right];
  return leftFamily && leftFamily === rightFamily ? 0.5 : 0;
}

function tagNameOf(node) {
  return typeof node?.tagName === "string" ? node.tagName.toLowerCase() : "";
}

function elementChildren($, node) {
  return $(node).children().toArray().filter((child) => tagNameOf(child));
}

function structuralPath($, node) {
  const chain = [];
  let current = node;
  let guard = 0;
  while (current && tagNameOf(current) && guard < MAX_DEPTH) {
    const parent = $(current).parent().get(0);
    const tag = tagNameOf(current);
    let index = 0;
    if (parent && tagNameOf(parent)) {
      const siblings = elementChildren($, parent).filter((child) => tagNameOf(child) === tag);
      index = siblings.indexOf(current);
    }
    chain.push({ tag, index: index < 0 ? 0 : index });
    current = parent && tagNameOf(parent) ? parent : null;
    guard += 1;
  }
  return chain.reverse();
}

export function fingerprintElement($, node, options = {}) {
  const settings = ownRecord(options, "fingerprint options", 8);
  const maxTextLength = integer(settings.maxTextLength, "maxTextLength", 240, 16, 4_096);
  const tag = tagNameOf(node);
  if (!tag) throw new TypeError("fingerprintElement requires an element node.");

  const selection = $(node);
  const attributes = selection.attr() ?? {};
  const classes = String(attributes.class ?? "")
    .split(/\s+/u)
    .filter((entry) => entry.length > 0)
    .slice(0, MAX_CLASSES)
    .sort();

  const identity = Object.create(null);
  for (const name of IDENTITY_ATTRIBUTES) {
    const value = attributes[name];
    if (typeof value === "string" && value.trim()) {
      identity[name] = normalizeText(value, 128);
    }
  }

  const text = normalizeText(selection.text(), maxTextLength);
  const chain = structuralPath($, node);
  const parent = selection.parent().get(0);
  const siblings = parent && tagNameOf(parent) ? elementChildren($, parent) : [node];
  const childTags = elementChildren($, node)
    .map((child) => tagNameOf(child))
    .slice(0, MAX_CHILD_TAGS);

  const fingerprint = {
    schema: FINGERPRINT_SCHEMA,
    tag,
    identity,
    classes,
    text,
    textTokens: tokenize(text),
    path: chain.map((entry) => ({ tag: entry.tag, index: entry.index })),
    depth: chain.length,
    siblingIndex: Math.max(0, siblings.indexOf(node)),
    siblingCount: siblings.length,
    childTags,
    parentTag: parent ? tagNameOf(parent) : ""
  };

  fingerprint.digest = createHash("sha256")
    .update(JSON.stringify({
      tag: fingerprint.tag,
      identity: fingerprint.identity,
      classes: fingerprint.classes,
      text: fingerprint.text,
      path: fingerprint.path
    }))
    .digest("hex");

  return Object.freeze(fingerprint);
}

function normalizeWeights(value) {
  if (value === undefined) return DEFAULT_WEIGHTS;
  const supplied = ownRecord(value, "weights", 8);
  const unknown = Object.keys(supplied).filter((key) => !Object.hasOwn(DEFAULT_WEIGHTS, key));
  if (unknown.length) throw new TypeError(`Unknown weight(s): ${unknown.join(", ")}.`);
  const result = Object.create(null);
  let total = 0;
  for (const key of Object.keys(DEFAULT_WEIGHTS)) {
    result[key] = finite(supplied[key], `weights.${key}`, DEFAULT_WEIGHTS[key], 0, 1);
    total += result[key];
  }
  if (total <= 0) throw new TypeError("weights must sum to a positive value.");
  for (const key of Object.keys(result)) result[key] /= total;
  return Object.freeze(result);
}

export function scoreFingerprints(reference, candidate, options = {}) {
  if (reference?.schema !== FINGERPRINT_SCHEMA || candidate?.schema !== FINGERPRINT_SCHEMA) {
    throw new TypeError(`Both fingerprints must use ${FINGERPRINT_SCHEMA}.`);
  }
  const weights = normalizeWeights(options.weights);

  const components = Object.create(null);
  components.tag = tagAffinity(reference.tag, candidate.tag);

  const referenceIdentity = Object.keys(reference.identity);
  if (!referenceIdentity.length) {
    components.id = null;
    components.attributes = null;
  } else {
    const primary = reference.identity.id;
    components.id = primary === undefined
      ? null
      : (candidate.identity.id === primary ? 1 : 0);
    let matched = 0;
    for (const name of referenceIdentity) {
      if (candidate.identity[name] === reference.identity[name]) matched += 1;
    }
    components.attributes = matched / referenceIdentity.length;
  }

  components.classes = jaccard(reference.classes, candidate.classes);

  const tokenScore = jaccard(reference.textTokens, candidate.textTokens);
  const literalScore = dice(reference.text, candidate.text);
  components.text = tokenScore === null && literalScore === null
    ? null
    : Math.max(tokenScore ?? 0, literalScore ?? 0);

  const referenceChain = reference.path.slice(0, -1).map((entry) => entry.tag);
  const candidateChain = candidate.path.slice(0, -1).map((entry) => entry.tag);
  const shortest = Math.min(referenceChain.length, candidateChain.length);
  components.path = shortest === 0
    ? null
    : longestCommonSubsequence(referenceChain, candidateChain) / shortest;

  const depthScore = 1 - Math.min(1, Math.abs(reference.depth - candidate.depth) / 8);
  const siblingScore = 1 - Math.min(1, Math.abs(reference.siblingIndex - candidate.siblingIndex) / 16);
  const childScore = jaccard(reference.childTags, candidate.childTags);
  const structureParts = [depthScore, siblingScore];
  if (childScore !== null) structureParts.push(childScore);
  components.structure = structureParts.reduce((sum, entry) => sum + entry, 0) / structureParts.length;

  let score = 0;
  let applied = 0;
  for (const key of Object.keys(weights)) {
    const component = components[key];
    if (component === null || component === undefined) continue;
    score += weights[key] * component;
    applied += weights[key];
  }

  return Object.freeze({
    score: applied === 0 ? 0 : score / applied,
    components: Object.freeze({ ...components })
  });
}

function escapeIdentifier(value) {
  return value.replace(/[^A-Za-z0-9_-]/gu, (character) => `\\${character}`);
}

export function generateCssSelector($, node, options = {}) {
  const settings = ownRecord(options, "generateCssSelector options", 4);
  const maxDepth = integer(settings.maxDepth, "maxDepth", 12, 1, MAX_DEPTH);
  if (!tagNameOf(node)) throw new TypeError("generateCssSelector requires an element node.");

  const identifier = $(node).attr("id");
  if (identifier && /^[A-Za-z][A-Za-z0-9_-]*$/.test(identifier)) {
    const candidate = `#${identifier}`;
    if ($(candidate).length === 1) return candidate;
  }

  const parts = [];
  let current = node;
  let depth = 0;
  while (current && tagNameOf(current) && depth < maxDepth) {
    const tag = tagNameOf(current);
    const parent = $(current).parent().get(0);
    let part = tag;

    const currentId = $(current).attr("id");
    if (currentId && /^[A-Za-z][A-Za-z0-9_-]*$/.test(currentId)) {
      part = `#${currentId}`;
      parts.unshift(part);
      break;
    }

    const classes = String($(current).attr("class") ?? "")
      .split(/\s+/u)
      .filter((entry) => /^[A-Za-z_-][A-Za-z0-9_-]*$/.test(entry))
      .slice(0, 3);
    if (classes.length) {
      part += classes.map((entry) => `.${escapeIdentifier(entry)}`).join("");
    }

    if (parent && tagNameOf(parent)) {
      const sameTag = elementChildren($, parent).filter((child) => tagNameOf(child) === tag);
      if (sameTag.length > 1) {
        part += `:nth-of-type(${sameTag.indexOf(current) + 1})`;
      }
    }

    parts.unshift(part);
    const candidate = parts.join(" > ");
    if ($(candidate).length === 1 && $(candidate).get(0) === node) return candidate;

    current = parent && tagNameOf(parent) ? parent : null;
    depth += 1;
  }

  return parts.join(" > ");
}

export function generateXPath($, node, options = {}) {
  const settings = ownRecord(options, "generateXPath options", 4);
  const maxDepth = integer(settings.maxDepth, "maxDepth", MAX_DEPTH, 1, MAX_DEPTH);
  if (!tagNameOf(node)) throw new TypeError("generateXPath requires an element node.");
  const chain = structuralPath($, node).slice(-maxDepth);
  return `/${chain.map((entry) => `${entry.tag}[${entry.index + 1}]`).join("/")}`;
}

function collectElements($, options) {
  const maxNodes = integer(options.maxNodes, "maxNodes", 20_000, 1, 200_000);
  const root = options.scope ? $(options.scope) : $.root();
  const nodes = root.find("*").toArray().filter((node) => tagNameOf(node));
  if (nodes.length > maxNodes) {
    throw new RangeError(`Document exceeds maxNodes (${nodes.length} > ${maxNodes}).`);
  }
  return nodes;
}

export function relocateElement(html, reference, options = {}) {
  if (typeof html !== "string") throw new TypeError("html must be a string.");
  if (reference?.schema !== FINGERPRINT_SCHEMA) {
    throw new TypeError(`reference must be a ${FINGERPRINT_SCHEMA} fingerprint.`);
  }
  const settings = ownRecord(options, "relocateElement options", 10);
  const unknown = Object.keys(settings).filter((key) => ![
    "threshold",
    "maxNodes",
    "maxCandidates",
    "maxTextLength",
    "weights",
    "tagLock"
  ].includes(key));
  if (unknown.length) throw new TypeError(`Unknown relocate option(s): ${unknown.join(", ")}.`);

  const threshold = finite(settings.threshold, "threshold", 0.62, 0, 1);
  const maxCandidates = integer(settings.maxCandidates, "maxCandidates", 20_000, 1, 200_000);
  const maxTextLength = integer(settings.maxTextLength, "maxTextLength", 240, 16, 4_096);
  const tagLock = settings.tagLock === true;
  if (settings.tagLock !== undefined && typeof settings.tagLock !== "boolean") {
    throw new TypeError("tagLock must be a boolean.");
  }

  const $ = cheerio.load(html);
  const nodes = collectElements($, { maxNodes: settings.maxNodes });

  let best = null;
  let inspected = 0;
  for (const node of nodes) {
    if (inspected >= maxCandidates) break;
    if (tagLock && tagNameOf(node) !== reference.tag) continue;
    inspected += 1;
    const candidate = fingerprintElement($, node, { maxTextLength });
    const scored = scoreFingerprints(reference, candidate, { weights: settings.weights });
    if (!best || scored.score > best.scored.score) {
      best = { node, candidate, scored };
    }
    if (scored.score === 1) break;
  }

  if (!best || best.scored.score < threshold) {
    return Object.freeze({
      found: false,
      score: best ? best.scored.score : 0,
      threshold,
      inspected,
      element: null
    });
  }

  return Object.freeze({
    found: true,
    score: best.scored.score,
    threshold,
    inspected,
    components: best.scored.components,
    exact: best.candidate.digest === reference.digest,
    element: Object.freeze({
      tag: best.candidate.tag,
      selector: generateCssSelector($, best.node),
      xpath: generateXPath($, best.node),
      text: best.candidate.text,
      html: $.html(best.node),
      fingerprint: best.candidate
    })
  });
}

export function findSimilarElements(html, reference, options = {}) {
  if (typeof html !== "string") throw new TypeError("html must be a string.");
  if (reference?.schema !== FINGERPRINT_SCHEMA) {
    throw new TypeError(`reference must be a ${FINGERPRINT_SCHEMA} fingerprint.`);
  }
  const settings = ownRecord(options, "findSimilarElements options", 8);
  const threshold = finite(settings.threshold, "threshold", 0.7, 0, 1);
  const limit = integer(settings.limit, "limit", 100, 1, 10_000);
  const maxTextLength = integer(settings.maxTextLength, "maxTextLength", 240, 16, 4_096);
  const ignoreText = settings.ignoreText === true;

  const weights = ignoreText
    ? { ...DEFAULT_WEIGHTS, text: 0, structure: DEFAULT_WEIGHTS.structure + DEFAULT_WEIGHTS.text }
    : settings.weights;

  const $ = cheerio.load(html);
  const nodes = collectElements($, { maxNodes: settings.maxNodes });

  const matches = [];
  for (const node of nodes) {
    const candidate = fingerprintElement($, node, { maxTextLength });
    const scored = scoreFingerprints(reference, candidate, { weights });
    if (scored.score < threshold) continue;
    matches.push({
      score: scored.score,
      tag: candidate.tag,
      selector: generateCssSelector($, node),
      xpath: generateXPath($, node),
      text: candidate.text,
      html: $.html(node)
    });
  }

  matches.sort((left, right) => right.score - left.score);
  return Object.freeze(matches.slice(0, limit).map((entry) => Object.freeze(entry)));
}

async function atomicJsonWrite(filename, value) {
  const temporary = `${filename}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, filename);
}

export class ElementFingerprintStore {
  constructor(options = {}) {
    const settings = ownRecord(options, "ElementFingerprintStore options", 8);
    if (typeof settings.directory !== "string" || !settings.directory.trim()) {
      throw new TypeError("ElementFingerprintStore requires an explicit directory.");
    }
    this.directory = path.resolve(settings.directory);
    this.namespace = safeSegment(settings.namespace, "namespace");
    this.maxEntries = integer(settings.maxEntries, "maxEntries", 5_000, 1, 100_000);
  }

  filename(key) {
    const digest = createHash("sha256")
      .update(`${this.namespace} ${String(key)}`)
      .digest("hex");
    return path.join(this.directory, `${digest}.json`);
  }

  async save(key, fingerprint, metadata = {}) {
    if (fingerprint?.schema !== FINGERPRINT_SCHEMA) {
      throw new TypeError(`fingerprint must be a ${FINGERPRINT_SCHEMA} record.`);
    }
    const context = ownRecord(metadata, "metadata", 16);
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    await atomicJsonWrite(this.filename(key), {
      schema: STORE_SCHEMA,
      namespace: this.namespace,
      key: String(key),
      savedAtMs: Date.now(),
      metadata: context,
      fingerprint
    });
    await this.prune();
    return this.filename(key);
  }

  async load(key) {
    let parsed;
    try {
      parsed = JSON.parse(await readFile(this.filename(key), "utf8"));
    } catch (error) {
      if (error?.code === "ENOENT" || error instanceof SyntaxError) return null;
      throw error;
    }
    if (
      parsed?.schema !== STORE_SCHEMA
      || parsed.namespace !== this.namespace
      || parsed.key !== String(key)
      || parsed.fingerprint?.schema !== FINGERPRINT_SCHEMA
    ) {
      return null;
    }
    return Object.freeze({
      key: parsed.key,
      savedAtMs: parsed.savedAtMs,
      metadata: Object.freeze(parsed.metadata ?? {}),
      fingerprint: Object.freeze(parsed.fingerprint)
    });
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
      if (error?.code === "ENOENT") return { removed: 0, entries: 0 };
      throw error;
    }
    if (names.length <= this.maxEntries) return { removed: 0, entries: names.length };
    const removable = names.slice(0, names.length - this.maxEntries);
    for (const name of removable) {
      await unlink(path.join(this.directory, name)).catch(() => {});
    }
    return { removed: removable.length, entries: this.maxEntries };
  }
}

export function createAdaptiveLocator(store, options = {}) {
  if (!store || typeof store.save !== "function" || typeof store.load !== "function") {
    throw new TypeError("store must expose async save(key, fingerprint) and load(key).");
  }
  const defaults = ownRecord(options, "createAdaptiveLocator options", 8);

  return async function locate(key, html, input = {}) {
    if (typeof html !== "string") throw new TypeError("html must be a string.");
    const request = ownRecord(input, "locate input", 8);
    const selector = request.selector;
    if (typeof selector !== "string" || !selector.trim()) {
      throw new TypeError("locate requires a selector string.");
    }

    const $ = cheerio.load(html);
    const direct = $(selector).get(0);
    if (direct && tagNameOf(direct)) {
      const fingerprint = fingerprintElement($, direct, {});
      if (request.save !== false) {
        await store.save(key, fingerprint, { selector, locatedBy: "selector" });
      }
      return Object.freeze({
        found: true,
        locatedBy: "selector",
        score: 1,
        selector,
        text: fingerprint.text,
        html: $.html(direct),
        fingerprint
      });
    }

    const saved = await store.load(key);
    if (!saved) {
      return Object.freeze({ found: false, locatedBy: "none", score: 0, selector, reason: "no-stored-fingerprint" });
    }

    const relocated = relocateElement(html, saved.fingerprint, {
      threshold: request.threshold ?? defaults.threshold,
      weights: request.weights ?? defaults.weights,
      maxNodes: request.maxNodes ?? defaults.maxNodes
    });

    if (!relocated.found) {
      return Object.freeze({
        found: false,
        locatedBy: "none",
        score: relocated.score,
        selector,
        reason: "below-threshold"
      });
    }

    if (request.save !== false) {
      await store.save(key, relocated.element.fingerprint, {
        selector: relocated.element.selector,
        locatedBy: "relocated",
        previousSelector: selector
      });
    }

    return Object.freeze({
      found: true,
      locatedBy: "relocated",
      score: relocated.score,
      selector: relocated.element.selector,
      previousSelector: selector,
      xpath: relocated.element.xpath,
      text: relocated.element.text,
      html: relocated.element.html,
      fingerprint: relocated.element.fingerprint
    });
  };
}

export const adaptiveDefaults = Object.freeze({
  weights: DEFAULT_WEIGHTS,
  identityAttributes: IDENTITY_ATTRIBUTES,
  fingerprintSchema: FINGERPRINT_SCHEMA,
  storeSchema: STORE_SCHEMA
});
