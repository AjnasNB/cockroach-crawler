import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(await readFile(path.join(root, "schemas", "source-record.schema.json"), "utf8"));
const fixtures = JSON.parse(await readFile(path.join(root, "test", "fixtures", "source-records.json"), "utf8"));

function interfaceFields(source, name) {
  const match = source.match(new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`));
  assert.ok(match, `${name} declaration is present`);
  return [...match[1].matchAll(/^\s*readonly\s+([A-Za-z][A-Za-z0-9]*):/gm)].map((entry) => entry[1]).sort();
}

test("normalized source fixtures satisfy the published JSON Schema", () => {
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  assert.deepEqual(fixtures.map((fixture) => fixture.source), ["web", "github", "youtube", "x", "reddit"]);
  for (const fixture of fixtures) {
    assert.equal(validate(fixture), true, `${fixture.source}: ${JSON.stringify(validate.errors)}`);
  }
});

test("JSON Schema required fields stay aligned with public TypeScript declarations", async () => {
  const declarations = await readFile(path.join(root, "types", "sources.d.ts"), "utf8");
  assert.deepEqual([...schema.required].sort(), interfaceFields(declarations, "SourceRecord"));
  assert.deepEqual([...schema.$defs.provenance.required].sort(), interfaceFields(declarations, "SourceProvenance"));
  assert.equal(schema.properties.metadata.additionalProperties, true);
});
