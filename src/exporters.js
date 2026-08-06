const MAX_ROWS = 1_000_000;
const MAX_COLUMNS = 512;

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

function normalizeRows(rows, label) {
  if (!Array.isArray(rows)) throw new TypeError(`${label} must be an array.`);
  if (rows.length > MAX_ROWS) throw new RangeError(`${label} exceeds ${MAX_ROWS} rows.`);
  return rows.map((row, index) => ownRecord(row, `${label}[${index}]`, MAX_COLUMNS));
}

function collectColumns(rows, supplied) {
  if (supplied !== undefined) {
    if (!Array.isArray(supplied) || !supplied.length) {
      throw new TypeError("columns must be a non-empty array of strings.");
    }
    if (supplied.length > MAX_COLUMNS) throw new RangeError(`columns exceeds ${MAX_COLUMNS} entries.`);
    return supplied.map((entry) => {
      if (typeof entry !== "string" || !entry.length) throw new TypeError("columns entries must be strings.");
      return entry;
    });
  }
  const seen = [];
  const known = new Set();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (known.has(key)) continue;
      known.add(key);
      seen.push(key);
      if (seen.length > MAX_COLUMNS) throw new RangeError(`Derived columns exceed ${MAX_COLUMNS}.`);
    }
  }
  return seen;
}

function scalarText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol") {
    throw new TypeError("Export values must not be functions or symbols.");
  }
  return JSON.stringify(value);
}

function csvField(value, delimiter, injectionGuard) {
  let text = scalarText(value).replace(/\r\n?/gu, "\n");
  if (injectionGuard && /^[=+\-@\t\r]/u.test(text)) text = `'${text}`;
  const mustQuote = text.includes(delimiter) || text.includes("\n") || text.includes('"');
  return mustQuote ? `"${text.replace(/"/gu, '""')}"` : text;
}

export function toCsv(rows, options = {}) {
  const settings = ownRecord(options, "toCsv options", 8);
  const unknown = Object.keys(settings).filter(
    (key) => !["columns", "delimiter", "header", "newline", "bom", "injectionGuard"].includes(key)
  );
  if (unknown.length) throw new TypeError(`Unknown toCsv option(s): ${unknown.join(", ")}.`);

  const delimiter = settings.delimiter ?? ",";
  if (typeof delimiter !== "string" || delimiter.length !== 1 || '"\n\r'.includes(delimiter)) {
    throw new TypeError("delimiter must be a single character other than quote or newline.");
  }
  const newline = settings.newline ?? "\n";
  if (!["\n", "\r\n"].includes(newline)) throw new TypeError("newline must be '\\n' or '\\r\\n'.");

  const normalized = normalizeRows(rows, "rows");
  const columns = collectColumns(normalized, settings.columns);
  const injectionGuard = settings.injectionGuard !== false;

  const lines = [];
  if (settings.header !== false) {
    lines.push(columns.map((column) => csvField(column, delimiter, false)).join(delimiter));
  }
  for (const row of normalized) {
    lines.push(columns.map((column) => csvField(row[column], delimiter, injectionGuard)).join(delimiter));
  }

  return `${settings.bom === true ? "﻿" : ""}${lines.join(newline)}${lines.length ? newline : ""}`;
}

function xmlText(value) {
  let result = "";
  for (const character of scalarText(value)) {
    const code = character.codePointAt(0);
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) continue;
    if (character === "&") result += "&amp;";
    else if (character === "<") result += "&lt;";
    else if (character === ">") result += "&gt;";
    else if (character === String.fromCharCode(34)) result += "&quot;";
    else result += character;
  }
  return result;
}

function xmlName(value, label) {
  const text = String(value ?? "");
  if (!/^[A-Za-z_][A-Za-z0-9._-]{0,127}$/.test(text)) {
    throw new TypeError(`${label} must be a valid XML name.`);
  }
  return text;
}

export function toXml(rows, options = {}) {
  const settings = ownRecord(options, "toXml options", 8);
  const unknown = Object.keys(settings).filter(
    (key) => !["columns", "rootName", "rowName", "indent", "declaration"].includes(key)
  );
  if (unknown.length) throw new TypeError(`Unknown toXml option(s): ${unknown.join(", ")}.`);

  const rootName = xmlName(settings.rootName ?? "items", "rootName");
  const rowName = xmlName(settings.rowName ?? "item", "rowName");
  const indent = integer(settings.indent, "indent", 2, 0, 8);
  const pad = " ".repeat(indent);

  const normalized = normalizeRows(rows, "rows");
  const columns = collectColumns(normalized, settings.columns);
  for (const column of columns) xmlName(column, `columns.${column}`);

  const lines = [];
  if (settings.declaration !== false) lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(`<${rootName}>`);
  for (const row of normalized) {
    lines.push(`${pad}<${rowName}>`);
    for (const column of columns) {
      if (row[column] === undefined) continue;
      lines.push(`${pad}${pad}<${column}>${xmlText(row[column])}</${column}>`);
    }
    lines.push(`${pad}</${rowName}>`);
  }
  lines.push(`</${rootName}>`);
  return `${lines.join("\n")}\n`;
}

export function toJsonl(rows, options = {}) {
  const settings = ownRecord(options, "toJsonl options", 4);
  const normalized = normalizeRows(rows, "rows");
  const columns = settings.columns === undefined ? null : collectColumns(normalized, settings.columns);
  return normalized
    .map((row) => {
      const value = columns
        ? Object.fromEntries(columns.filter((column) => row[column] !== undefined).map((column) => [column, row[column]]))
        : { ...row };
      return JSON.stringify(value);
    })
    .join("\n")
    .concat(normalized.length ? "\n" : "");
}

export function toJson(rows, options = {}) {
  const settings = ownRecord(options, "toJson options", 4);
  const indent = integer(settings.indent, "indent", 2, 0, 8);
  const normalized = normalizeRows(rows, "rows");
  const columns = settings.columns === undefined ? null : collectColumns(normalized, settings.columns);
  const shaped = columns
    ? normalized.map((row) =>
      Object.fromEntries(columns.filter((column) => row[column] !== undefined).map((column) => [column, row[column]])))
    : normalized.map((row) => ({ ...row }));
  return `${JSON.stringify(shaped, null, indent)}\n`;
}

const FORMATS = Object.freeze({
  csv: toCsv,
  xml: toXml,
  jsonl: toJsonl,
  json: toJson
});

export const exportFormats = Object.freeze(Object.keys(FORMATS));

export function exportRecords(rows, format, options = {}) {
  const exporter = FORMATS[format];
  if (!exporter) {
    throw new TypeError(`Unknown export format '${format}'. Known: ${exportFormats.join(", ")}.`);
  }
  return exporter(rows, options);
}
