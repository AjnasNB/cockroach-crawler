import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import Ajv from "ajv";
import * as cheerio from "cheerio";
import fontoxpath from "fontoxpath";

const { evaluateXPathToNodes } = fontoxpath;

const FIELD_KEYS = new Set(["xpath", "source", "attribute", "multiple", "limit", "resolveUrl"]);
const SOURCES = new Set(["text", "html", "attribute"]);

function integer(value, label, fallback, minimum, maximum) {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label} must be a safe integer from ${minimum} to ${maximum}.`);
  }
  return result;
}

function ownRecord(value, label, maximum = 128) {
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

function normalizeField(value, name, maxItemsPerField) {
  const field = typeof value === "string" ? { xpath: value } : ownRecord(value, `fields.${name}`, 8);
  const unknown = Object.keys(field).filter((key) => !FIELD_KEYS.has(key));
  if (unknown.length) throw new TypeError(`Unknown XPath field option(s) for '${name}': ${unknown.join(", ")}.`);
  if (typeof field.xpath !== "string" || !field.xpath.trim() || field.xpath.length > 4_096) {
    throw new TypeError(`fields.${name}.xpath must contain 1-4096 characters.`);
  }
  const source = field.source ?? "text";
  if (!SOURCES.has(source)) {
    throw new TypeError(`fields.${name}.source must be one of: ${[...SOURCES].join(", ")}.`);
  }
  const multiple = field.multiple === true;
  if (field.multiple !== undefined && typeof field.multiple !== "boolean") {
    throw new TypeError(`fields.${name}.multiple must be a boolean.`);
  }
  if (field.resolveUrl !== undefined && typeof field.resolveUrl !== "boolean") {
    throw new TypeError(`fields.${name}.resolveUrl must be a boolean.`);
  }
  const attribute = source === "attribute" ? field.attribute : undefined;
  if (source === "attribute" && (
    typeof attribute !== "string"
    || !/^[A-Za-z_:][A-Za-z0-9_.:-]{0,255}$/.test(attribute)
  )) {
    throw new TypeError(`fields.${name}.attribute must be a valid attribute name.`);
  }
  if (source !== "attribute" && field.attribute !== undefined) {
    throw new TypeError(`fields.${name}.attribute requires source='attribute'.`);
  }
  if (field.resolveUrl === true && source !== "attribute") {
    throw new TypeError(`fields.${name}.resolveUrl requires source='attribute'.`);
  }
  return Object.freeze({
    xpath: field.xpath,
    source,
    attribute,
    multiple,
    limit: integer(field.limit, `fields.${name}.limit`, multiple ? maxItemsPerField : 1, 1, maxItemsPerField),
    resolveUrl: field.resolveUrl === true
  });
}

function normalizeHtmlForXpath(html) {
  const $ = cheerio.load(html);
  $("script, style, noscript, template").remove();
  return $.xml();
}

function boundedValue(value, maximum, warnings, name) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= maximum) return text;
  warnings.push(`XPath field '${name}' value was truncated at maxValueLength (${maximum}).`);
  return text.slice(0, maximum);
}

function resolveHttpValue(value, url) {
  try {
    const resolved = new URL(value, url);
    if (!["http:", "https:"].includes(resolved.protocol)) return "";
    resolved.hash = "";
    return resolved.toString();
  } catch {
    return "";
  }
}

export function extractWithXPath(html, url, options = {}) {
  if (typeof html !== "string") throw new TypeError("html must be a string.");
  const normalizedUrl = new URL(url).toString();
  const maxInputCharacters = integer(
    options.maxInputCharacters,
    "maxInputCharacters",
    5 * 1024 * 1024,
    1_024,
    50 * 1024 * 1024
  );
  if (html.length > maxInputCharacters) {
    throw new RangeError(`html exceeds maxInputCharacters (${html.length} > ${maxInputCharacters}).`);
  }
  const maxFields = integer(options.maxFields, "maxFields", 32, 1, 128);
  const maxItemsPerField = integer(options.maxItemsPerField, "maxItemsPerField", 50, 1, 1_000);
  const maxValueLength = integer(options.maxValueLength, "maxValueLength", 16_384, 1, 262_144);
  const maxTotalCharacters = integer(
    options.maxTotalCharacters,
    "maxTotalCharacters",
    262_144,
    1,
    4 * 1024 * 1024
  );
  const fields = ownRecord(options.fields, "fields", maxFields);
  if (!Object.keys(fields).length) throw new TypeError("fields must contain at least one XPath field.");

  const document = new DOMParser({
    onError: () => {}
  }).parseFromString(normalizeHtmlForXpath(html), "application/xhtml+xml");
  const serializer = new XMLSerializer();
  const warnings = [];
  const data = Object.create(null);
  let totalCharacters = 0;

  for (const [name, raw] of Object.entries(fields)) {
    const field = normalizeField(raw, name, maxItemsPerField);
    let nodes;
    try {
      nodes = evaluateXPathToNodes(field.xpath, document);
    } catch (cause) {
      const error = new TypeError(`fields.${name}.xpath is not a valid XPath expression.`);
      error.cause = cause;
      throw error;
    }
    const values = [];
    for (const node of nodes.slice(0, field.limit)) {
      let value;
      if (field.source === "html") {
        value = Array.from(node.childNodes || []).map((child) => serializer.serializeToString(child)).join("");
      } else if (field.source === "attribute") {
        value = typeof node.getAttribute === "function" ? node.getAttribute(field.attribute) : "";
        if (field.resolveUrl) value = resolveHttpValue(value, normalizedUrl);
      } else {
        value = node.textContent;
      }
      value = boundedValue(value, maxValueLength, warnings, name);
      if (totalCharacters + value.length > maxTotalCharacters) {
        const remaining = Math.max(0, maxTotalCharacters - totalCharacters);
        value = value.slice(0, remaining);
        warnings.push(`XPath extraction reached maxTotalCharacters (${maxTotalCharacters}).`);
      }
      totalCharacters += value.length;
      values.push(value);
      if (totalCharacters >= maxTotalCharacters) break;
    }
    data[name] = field.multiple ? values : (values[0] ?? null);
  }
  return { data, warnings };
}

export async function extractWithLlm(document, options = {}) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new TypeError("document must be an object.");
  }
  if (typeof options.adapter !== "function") {
    throw new TypeError("adapter must be a host-supplied async function.");
  }
  if (!options.schema || typeof options.schema !== "object" || Array.isArray(options.schema)) {
    throw new TypeError("schema must be a JSON Schema object.");
  }
  const maxInputCharacters = integer(
    options.maxInputCharacters,
    "maxInputCharacters",
    100_000,
    256,
    2_000_000
  );
  const maxOutputCharacters = integer(
    options.maxOutputCharacters,
    "maxOutputCharacters",
    100_000,
    2,
    2_000_000
  );
  const sourceText = String(document.markdown ?? document.text ?? "").slice(0, maxInputCharacters);
  const request = Object.freeze({
    url: typeof document.url === "string" ? document.url : null,
    title: typeof document.title === "string" ? document.title.slice(0, 4_096) : null,
    content: sourceText,
    schema: structuredClone(options.schema),
    instruction: typeof options.instruction === "string"
      ? options.instruction.slice(0, 8_192)
      : "Extract only values supported by the supplied document."
  });
  let result = await options.adapter(request);
  if (typeof result === "string") {
    if (result.length > maxOutputCharacters) {
      throw new RangeError(`LLM extractor output exceeds maxOutputCharacters (${result.length}).`);
    }
    try {
      result = JSON.parse(result);
    } catch (cause) {
      const error = new TypeError("LLM extractor returned invalid JSON.");
      error.cause = cause;
      throw error;
    }
  }
  const serialized = JSON.stringify(result);
  if (serialized === undefined || serialized.length > maxOutputCharacters) {
    throw new RangeError(`LLM extractor output exceeds maxOutputCharacters (${maxOutputCharacters}).`);
  }
  const validate = new Ajv({ allErrors: true, strict: false }).compile(options.schema);
  if (!validate(result)) {
    const error = new TypeError("LLM extractor output failed the supplied JSON Schema.");
    error.validationErrors = structuredClone(validate.errors || []);
    throw error;
  }
  return {
    data: structuredClone(result),
    provenance: {
      method: "host-supplied-llm-adapter",
      inputCharacters: sourceText.length,
      outputCharacters: serialized.length,
      schemaValidated: true
    }
  };
}
