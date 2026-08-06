import * as cheerio from "cheerio";
import { DOMParser } from "@xmldom/xmldom";
import fontoxpath from "fontoxpath";
import {
  fingerprintElement,
  findSimilarElements,
  generateCssSelector,
  generateXPath,
  relocateElement,
  scoreFingerprints
} from "./adaptive.js";

const { evaluateXPathToNodes } = fontoxpath;

const PSEUDO_TEXT = /::text$/u;
const PSEUDO_ATTR = /::attr\(\s*([A-Za-z_:][A-Za-z0-9_.:-]*)\s*\)$/u;

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

function tagNameOf(node) {
  return typeof node?.tagName === "string" ? node.tagName.toLowerCase() : "";
}

function normalizeText(value, maximum) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > maximum ? text.slice(0, maximum) : text;
}

function parsePseudo(selector) {
  if (typeof selector !== "string" || !selector.trim() || selector.length > 4_096) {
    throw new TypeError("selector must contain 1-4096 characters.");
  }
  const attribute = selector.match(PSEUDO_ATTR);
  if (attribute) {
    return { selector: selector.slice(0, attribute.index).trim() || "*", mode: "attribute", attribute: attribute[1] };
  }
  if (PSEUDO_TEXT.test(selector)) {
    return { selector: selector.replace(PSEUDO_TEXT, "").trim() || "*", mode: "text", attribute: null };
  }
  return { selector, mode: "html", attribute: null };
}

function resolveHttpValue(value, url) {
  if (!url) return value;
  try {
    const resolved = new URL(value, url);
    if (!["http:", "https:"].includes(resolved.protocol)) return value;
    return resolved.toString();
  } catch {
    return value;
  }
}

export class SelectorList extends Array {
  static get [Symbol.species]() {
    return Array;
  }

  get first() {
    return this.length ? this[0] : null;
  }

  get last() {
    return this.length ? this[this.length - 1] : null;
  }

  get(index = 0) {
    const entry = this[index];
    return entry ? entry.get() : null;
  }

  getall() {
    return this.map((entry) => entry.get());
  }

  get text() {
    return this.map((entry) => entry.text).join(" ").replace(/\s+/g, " ").trim();
  }

  attr(name) {
    return this.map((entry) => entry.attr(name)).filter((value) => value !== null);
  }

  toJSON() {
    return this.map((entry) => entry.toJSON());
  }
}

export class Selector {
  constructor(context, node) {
    if (!context || typeof context.$ !== "function") {
      throw new TypeError("Selector requires an internal parse context.");
    }
    this.$ = context.$;
    this.context = context;
    this.node = node ?? null;
  }

  static parse(html, options = {}) {
    if (typeof html !== "string") throw new TypeError("html must be a string.");
    const settings = ownRecord(options, "Selector.parse options", 8);
    const unknown = Object.keys(settings).filter(
      (key) => !["url", "maxInputCharacters", "maxTextLength"].includes(key)
    );
    if (unknown.length) throw new TypeError(`Unknown parse option(s): ${unknown.join(", ")}.`);
    const maxInputCharacters = integer(
      settings.maxInputCharacters,
      "maxInputCharacters",
      5_000_000,
      1_024,
      50_000_000
    );
    if (html.length > maxInputCharacters) {
      throw new RangeError(`html exceeds maxInputCharacters (${html.length} > ${maxInputCharacters}).`);
    }
    let url = null;
    if (settings.url !== undefined) {
      const parsed = new URL(settings.url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new TypeError("url must be an http(s) URL.");
      }
      url = parsed.toString();
    }
    const maxTextLength = integer(settings.maxTextLength, "maxTextLength", 240, 16, 65_536);
    const $ = cheerio.load(html);
    const context = { $, url, html, maxTextLength };
    return new Selector(context, $.root().get(0));
  }

  get tag() {
    return tagNameOf(this.node);
  }

  get exists() {
    return Boolean(this.node);
  }

  get url() {
    return this.context.url;
  }

  get text() {
    if (!this.node) return "";
    return normalizeText(this.$(this.node).text(), this.context.maxTextLength);
  }

  get fullText() {
    return this.node ? String(this.$(this.node).text() ?? "") : "";
  }

  get html() {
    if (!this.node) return "";
    return tagNameOf(this.node) ? String(this.$.html(this.node) ?? "") : String(this.$.html() ?? "");
  }

  get innerHtml() {
    return this.node ? String(this.$(this.node).html() ?? "") : "";
  }

  get attributes() {
    if (!this.node || !tagNameOf(this.node)) return Object.freeze({});
    const source = this.$(this.node).attr() ?? {};
    const result = Object.create(null);
    for (const key of Object.keys(source)) result[key] = source[key];
    return Object.freeze(result);
  }

  attr(name) {
    if (typeof name !== "string" || !name.trim()) throw new TypeError("attr name must be a string.");
    if (!this.node) return null;
    const value = this.$(this.node).attr(name);
    if (value === undefined) return null;
    return ["href", "src", "action", "poster"].includes(name)
      ? resolveHttpValue(value, this.context.url)
      : value;
  }

  get(mode = "auto") {
    if (!this.node) return null;
    if (mode === "text") return this.text;
    if (mode === "html") return this.html;
    return this.text;
  }

  wrap(node) {
    return new Selector(this.context, node);
  }

  list(nodes, mode = "html", attribute = null) {
    const result = SelectorList.from(
      nodes.filter((node) => tagNameOf(node)).map((node) => {
        const selector = this.wrap(node);
        if (mode === "text") selector.defaultMode = "text";
        if (mode === "attribute") {
          selector.defaultMode = "attribute";
          selector.defaultAttribute = attribute;
        }
        return selector;
      })
    );
    if (mode === "text" || mode === "attribute") {
      for (const entry of result) {
        entry.get = mode === "text"
          ? () => entry.text
          : () => entry.attr(attribute);
      }
    }
    return result;
  }

  css(selector, options = {}) {
    const settings = ownRecord(options, "css options", 4);
    const limit = integer(settings.limit, "limit", 10_000, 1, 100_000);
    const parsed = parsePseudo(selector);
    const scope = this.node && tagNameOf(this.node) ? this.$(this.node) : this.$.root();
    let found;
    try {
      found = scope.find(parsed.selector).toArray();
    } catch (error) {
      throw new TypeError(`Invalid CSS selector '${parsed.selector}': ${error.message}`);
    }
    return this.list(found.slice(0, limit), parsed.mode, parsed.attribute);
  }

  xpath(expression, options = {}) {
    if (typeof expression !== "string" || !expression.trim() || expression.length > 4_096) {
      throw new TypeError("xpath expression must contain 1-4096 characters.");
    }
    const settings = ownRecord(options, "xpath options", 4);
    const limit = integer(settings.limit, "limit", 10_000, 1, 100_000);

    if (!this.context.xmlDocument) {
      this.context.xmlDocument = new DOMParser({ onError: () => {} })
        .parseFromString(this.$.xml(), "text/xml");
    }

    let nodes;
    try {
      nodes = evaluateXPathToNodes(expression, this.context.xmlDocument);
    } catch (error) {
      throw new TypeError(`Invalid XPath '${expression}': ${error.message}`);
    }

    const mapped = [];
    for (const node of nodes.slice(0, limit)) {
      const resolved = this.resolveXmlNode(node);
      if (resolved) mapped.push(resolved);
    }
    return this.list(mapped, "html", null);
  }

  resolveXmlNode(node) {
    const chain = [];
    let current = node;
    let guard = 0;
    while (current && current.nodeType === 1 && guard < 64) {
      const parent = current.parentNode;
      if (!parent) break;
      const tag = String(current.nodeName ?? "").toLowerCase();
      let index = 0;
      for (const sibling of Array.from(parent.childNodes)) {
        if (sibling === current) break;
        if (sibling.nodeType === 1 && String(sibling.nodeName ?? "").toLowerCase() === tag) index += 1;
      }
      chain.push({ tag, index });
      current = parent.nodeType === 1 ? parent : null;
      guard += 1;
    }
    chain.reverse();
    if (!chain.length) return null;

    let cursor = this.$.root().get(0);
    for (const step of chain) {
      if (!cursor) return null;
      const matching = this.$(cursor)
        .children()
        .toArray()
        .filter((child) => tagNameOf(child) === step.tag);
      cursor = matching[step.index] ?? null;
    }
    return cursor;
  }

  findAll(tag, attributes = {}, options = {}) {
    if (tag !== undefined && tag !== null && typeof tag !== "string") {
      throw new TypeError("findAll tag must be a string when supplied.");
    }
    const filters = ownRecord(attributes, "findAll attributes", 24);
    const settings = ownRecord(options, "findAll options", 4);
    const limit = integer(settings.limit, "limit", 10_000, 1, 100_000);
    const name = tag && tag.trim() ? tag.trim().toLowerCase() : "*";

    const scope = this.node && tagNameOf(this.node) ? this.$(this.node) : this.$.root();
    const candidates = scope.find(name).toArray().filter((node) => tagNameOf(node));

    const keys = Object.keys(filters);
    const matched = candidates.filter((node) => {
      const selection = this.$(node);
      return keys.every((key) => {
        const expected = filters[key];
        const actualKey = key === "class_" ? "class" : key === "id_" ? "id" : key;
        const actual = selection.attr(actualKey);
        if (expected === true) return actual !== undefined;
        if (expected === false) return actual === undefined;
        if (actual === undefined) return false;
        if (expected instanceof RegExp) return expected.test(actual);
        if (actualKey === "class") {
          const present = String(actual).split(/\s+/u).filter(Boolean);
          return String(expected).split(/\s+/u).filter(Boolean).every((entry) => present.includes(entry));
        }
        return String(actual) === String(expected);
      });
    });

    return this.list(matched.slice(0, limit), "html", null);
  }

  findByText(text, options = {}) {
    const settings = ownRecord(options, "findByText options", 8);
    const limit = integer(settings.limit, "limit", 1_000, 1, 100_000);
    const tag = typeof settings.tag === "string" && settings.tag.trim()
      ? settings.tag.trim().toLowerCase()
      : "*";
    const exact = settings.exact === true;
    const ignoreCase = settings.ignoreCase !== false;

    let predicate;
    if (text instanceof RegExp) {
      predicate = (value) => text.test(value);
    } else {
      if (typeof text !== "string" || !text.length) {
        throw new TypeError("findByText requires a non-empty string or RegExp.");
      }
      const needle = ignoreCase ? text.toLowerCase() : text;
      predicate = (value) => {
        const haystack = ignoreCase ? value.toLowerCase() : value;
        return exact ? haystack === needle : haystack.includes(needle);
      };
    }

    const scope = this.node && tagNameOf(this.node) ? this.$(this.node) : this.$.root();
    const matched = scope
      .find(tag)
      .toArray()
      .filter((node) => tagNameOf(node) && predicate(normalizeText(this.$(node).text(), 4_096)));

    const deepest = matched.filter(
      (node) => !matched.some((other) => other !== node && this.$(other).parents().toArray().includes(node))
    );

    return this.list((deepest.length ? deepest : matched).slice(0, limit), "html", null);
  }

  get parent() {
    if (!this.node) return null;
    const parent = this.$(this.node).parent().get(0);
    return parent && tagNameOf(parent) ? this.wrap(parent) : null;
  }

  get parents() {
    if (!this.node) return SelectorList.from([]);
    return this.list(this.$(this.node).parents().toArray(), "html", null);
  }

  get children() {
    if (!this.node) return SelectorList.from([]);
    return this.list(this.$(this.node).children().toArray(), "html", null);
  }

  get siblings() {
    if (!this.node) return SelectorList.from([]);
    return this.list(this.$(this.node).siblings().toArray(), "html", null);
  }

  get next() {
    if (!this.node) return null;
    const sibling = this.$(this.node).next().get(0);
    return sibling && tagNameOf(sibling) ? this.wrap(sibling) : null;
  }

  get previous() {
    if (!this.node) return null;
    const sibling = this.$(this.node).prev().get(0);
    return sibling && tagNameOf(sibling) ? this.wrap(sibling) : null;
  }

  fingerprint() {
    if (!this.node || !tagNameOf(this.node)) {
      throw new TypeError("fingerprint requires an element selection.");
    }
    return fingerprintElement(this.$, this.node, { maxTextLength: this.context.maxTextLength });
  }

  cssPath() {
    if (!this.node || !tagNameOf(this.node)) {
      throw new TypeError("cssPath requires an element selection.");
    }
    return generateCssSelector(this.$, this.node);
  }

  xpathPath() {
    if (!this.node || !tagNameOf(this.node)) {
      throw new TypeError("xpathPath requires an element selection.");
    }
    return generateXPath(this.$, this.node);
  }

  findSimilar(options = {}) {
    const settings = ownRecord(options, "findSimilar options", 8);
    const reference = this.fingerprint();
    const matches = findSimilarElements(this.context.html, reference, settings);
    const seen = new Set();
    const nodes = [];
    for (const match of matches) {
      if (seen.has(match.selector)) continue;
      seen.add(match.selector);
      const node = this.$(match.selector).get(0);
      if (node && node !== this.node) nodes.push(node);
    }
    return this.list(nodes, "html", null);
  }

  relocate(html, options = {}) {
    return relocateElement(html, this.fingerprint(), options);
  }

  similarityTo(other, options = {}) {
    if (!(other instanceof Selector)) throw new TypeError("similarityTo requires a Selector.");
    return scoreFingerprints(this.fingerprint(), other.fingerprint(), options).score;
  }

  toJSON() {
    return {
      tag: this.tag,
      text: this.text,
      attributes: { ...this.attributes },
      selector: this.node && tagNameOf(this.node) ? this.cssPath() : null
    };
  }
}

export function parseDocument(html, options = {}) {
  return Selector.parse(html, options);
}
