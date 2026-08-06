import assert from "node:assert/strict";
import test from "node:test";

import { exportFormats, exportRecords, toCsv, toJson, toJsonl, toXml } from "../src/exporters.js";

const ROWS = [
  { title: "Widget A", price: 10, url: "https://x.test/a" },
  { title: "Widget B", price: 20, note: "second" }
];

test("toCsv derives a stable union of columns", () => {
  const csv = toCsv(ROWS);
  const lines = csv.trimEnd().split("\n");
  assert.equal(lines[0], "title,price,url,note");
  assert.equal(lines[1], "Widget A,10,https://x.test/a,");
  assert.equal(lines[2], "Widget B,20,,second");
});

test("toCsv quotes separators, quotes, and newlines", () => {
  const csv = toCsv([{ value: 'He said "hi", then left' }, { value: "line1\nline2" }]);
  assert.match(csv, /"He said ""hi"", then left"/);
  assert.match(csv, /"line1\nline2"/);
});

test("toCsv neutralises spreadsheet formula injection by default", () => {
  assert.match(toCsv([{ f: "=cmd|'/c calc'!A1" }]), /'=cmd/);
  assert.match(toCsv([{ f: "+1" }]), /'\+1/);
  assert.match(toCsv([{ f: "@x" }]), /'@x/);
  assert.doesNotMatch(toCsv([{ f: "=1+1" }], { injectionGuard: false }), /'=/);
});

test("toCsv honours explicit columns, delimiter, header, and newline", () => {
  const csv = toCsv(ROWS, { columns: ["title", "price"], delimiter: ";", newline: "\r\n", header: false });
  assert.equal(csv, "Widget A;10\r\nWidget B;20\r\n");
});

test("toCsv rejects malformed options", () => {
  assert.throws(() => toCsv(ROWS, { delimiter: '"' }), /delimiter must be/);
  assert.throws(() => toCsv(ROWS, { delimiter: "ab" }), /delimiter must be/);
  assert.throws(() => toCsv(ROWS, { newline: "\t" }), /newline must be/);
  assert.throws(() => toCsv(ROWS, { columns: [] }), /non-empty array/);
  assert.throws(() => toCsv(ROWS, { nope: 1 }), /Unknown toCsv option/);
  assert.throws(() => toCsv("nope"), /rows must be an array/);
});

test("toCsv refuses non-serializable values", () => {
  assert.throws(() => toCsv([{ f: () => {} }]), /must not be functions or symbols/);
});

test("toCsv serializes scalars predictably", () => {
  const csv = toCsv([{ a: null, b: undefined, c: true, d: new Date("2026-01-02T03:04:05Z"), e: 10n, f: { x: 1 } }]);
  const values = csv.trimEnd().split("\n")[1];
  assert.equal(values, ',,true,2026-01-02T03:04:05.000Z,10,"{""x"":1}"');
});

test("toXml emits a declaration, root, and escaped values", () => {
  const xml = toXml([{ title: "A & B <script>", price: 5 }], { rootName: "products", rowName: "product" });
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<products>/);
  assert.match(xml, /<title>A &amp; B &lt;script&gt;<\/title>/);
  assert.match(xml, /<\/products>\n$/);
});

test("toXml strips control characters that would break the document", () => {
  const xml = toXml([{ title: `bad${String.fromCharCode(7)}value` }]);
  assert.match(xml, /<title>badvalue<\/title>/);
});

test("toXml validates element names", () => {
  assert.throws(() => toXml(ROWS, { rootName: "1bad" }), /must be a valid XML name/);
  assert.throws(() => toXml([{ "not a name": 1 }]), /must be a valid XML name/);
  assert.throws(() => toXml(ROWS, { nope: 1 }), /Unknown toXml option/);
});

test("toJsonl emits one compact object per line", () => {
  const lines = toJsonl(ROWS).trimEnd().split("\n");
  assert.equal(lines.length, 2);
  assert.deepEqual(JSON.parse(lines[0]), ROWS[0]);
  assert.equal(toJsonl([]), "");
});

test("toJson emits an indented array and can project columns", () => {
  const parsed = JSON.parse(toJson(ROWS, { columns: ["title"] }));
  assert.deepEqual(parsed, [{ title: "Widget A" }, { title: "Widget B" }]);
  assert.match(toJson(ROWS), /\n {2}\{/);
});

test("exportRecords dispatches every published format", () => {
  assert.deepEqual(exportFormats, ["csv", "xml", "jsonl", "json"]);
  for (const format of exportFormats) {
    assert.ok(exportRecords(ROWS, format).length > 0, `${format} should produce output`);
  }
  assert.throws(() => exportRecords(ROWS, "yaml"), /Unknown export format/);
});

test("exporters reject prototype-polluting rows", () => {
  assert.throws(() => toCsv([JSON.parse('{"__proto__":"x"}')]), /unsafe property/);
  assert.throws(() => toJsonl([JSON.parse('{"constructor":"x"}')]), /unsafe property/);
});
