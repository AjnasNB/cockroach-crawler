import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const snapshotUrl = new URL(
  "../docs/compatibility/puppeteer-25.5.0-api-snapshot.json",
  import.meta.url
);
const matrixUrl = new URL(
  "../docs/compatibility/puppeteer-25.5.0-gap-matrix.json",
  import.meta.url
);

test("Puppeteer 25.5.0 snapshot and gap matrix remain exhaustive and truthful", async () => {
  const snapshot = JSON.parse(await readFile(snapshotUrl, "utf8"));
  const matrix = JSON.parse(await readFile(matrixUrl, "utf8"));
  assert.equal(snapshot.upstream.version, "25.5.0");
  assert.equal(snapshot.counts.classes, 43);
  assert.equal(snapshot.counts.classMembers, 436);
  assert.equal(matrix.claim.fullParity, false);
  assert.equal(matrix.claim.apiCompatible, false);
  assert.equal(matrix.inventory.matrixItems, snapshot.counts.classMembers);
  assert.equal(matrix.items.length, snapshot.counts.classMembers);
  assert.equal(new Set(matrix.items.map((item) => item.id)).size, matrix.items.length);
  assert.equal(matrix.categories.every((category) => category.memberCount > 0), true);

  const statuses = new Set(["supported", "partial", "missing", "not-applicable"]);
  for (const item of matrix.items) {
    assert.equal(typeof item.upstreamDocs, "string");
    assert.equal(statuses.has(item.status.crawler), true);
    assert.equal(statuses.has(item.status.cockroachBrowser), true);
    assert.equal(statuses.has(item.status.crawlerAdapter), true);
  }

  for (const key of ["crawler", "cockroachBrowser", "crawlerAdapter"]) {
    const counted = Object.values(matrix.summary[key]).reduce((total, count) => total + count, 0);
    assert.equal(counted, matrix.items.length);
  }
});
