import assert from "node:assert/strict";
import test from "node:test";

import { normalizeRequestPolicy, requestPolicyDefaults, shouldBlockRequest } from "../src/blocklist.js";

test("an absent policy blocks nothing", () => {
  const policy = normalizeRequestPolicy();
  assert.equal(policy.blockTrackers, false);
  assert.deepEqual([...policy.blockResources], []);
  assert.equal(shouldBlockRequest("https://x.test/a.png", "image", policy), null);
  assert.equal(shouldBlockRequest("https://x.test/a.png", "image", false), null);
});

test("resource presets expand to the documented sets", () => {
  assert.deepEqual([...normalizeRequestPolicy({ blockResources: "media" }).blockResources], ["image", "media", "font"]);
  assert.deepEqual(
    [...normalizeRequestPolicy({ blockResources: "assets" }).blockResources],
    ["image", "media", "font", "stylesheet"]
  );
  assert.ok(normalizeRequestPolicy({ blockResources: "text" }).blockResources.includes("script"));
});

test("blocked resource types are refused and others pass", () => {
  const policy = normalizeRequestPolicy({ blockResources: "assets" });
  assert.equal(shouldBlockRequest("https://x.test/a.png", "image", policy).reason, "resource-type");
  assert.equal(shouldBlockRequest("https://x.test/a.css", "stylesheet", policy).reason, "resource-type");
  assert.equal(shouldBlockRequest("https://x.test/a.js", "script", policy), null);
  assert.equal(shouldBlockRequest("https://x.test/api", "xhr", policy), null);
});

test("a policy may never block the document itself", () => {
  assert.throws(
    () => normalizeRequestPolicy({ blockResources: ["document"] }),
    /must not block 'document'/
  );
});

test("explicit domains are blocked including subdomains", () => {
  const policy = normalizeRequestPolicy({ blockDomains: ["ads.test", "cdn.other.test"] });
  assert.equal(shouldBlockRequest("https://ads.test/x", "script", policy).reason, "blocked-domain");
  assert.equal(shouldBlockRequest("https://deep.ads.test/x", "script", policy).reason, "blocked-domain");
  assert.equal(shouldBlockRequest("https://cdn.other.test/x", "script", policy).reason, "blocked-domain");
  assert.equal(shouldBlockRequest("https://other.test/x", "script", policy), null);
  assert.equal(shouldBlockRequest("https://notads.test/x", "script", policy), null);
});

test("a hostname/path prefix only blocks that path", () => {
  const policy = normalizeRequestPolicy({ blockDomains: ["x.test/track"] });
  assert.equal(shouldBlockRequest("https://x.test/track/hit", "script", policy).reason, "blocked-domain");
  assert.equal(shouldBlockRequest("https://x.test/content", "script", policy), null);
});

test("the tracker list is opt-in and matches known analytics hosts", () => {
  const off = normalizeRequestPolicy({});
  assert.equal(shouldBlockRequest("https://www.google-analytics.com/collect", "script", off), null);

  const on = normalizeRequestPolicy({ blockTrackers: true });
  assert.equal(shouldBlockRequest("https://www.google-analytics.com/collect", "script", on).reason, "tracker");
  assert.equal(shouldBlockRequest("https://connect.facebook.net/en_US/fbevents.js", "script", on).reason, "tracker");
  assert.equal(shouldBlockRequest("https://static.hotjar.com/c/hotjar.js", "script", on).reason, "tracker");
  assert.equal(shouldBlockRequest("https://cdn.example.com/app.js", "script", on), null);
  assert.ok(requestPolicyDefaults.trackerDomainCount > 100);
});

test("allowDomains overrides every other block", () => {
  const policy = normalizeRequestPolicy({
    blockTrackers: true,
    blockResources: "assets",
    blockDomains: ["x.test"],
    allowDomains: ["x.test", "www.google-analytics.com"]
  });
  assert.equal(shouldBlockRequest("https://x.test/a.png", "image", policy), null);
  assert.equal(shouldBlockRequest("https://www.google-analytics.com/collect", "script", policy), null);
});

test("a malformed url is not blocked and never throws", () => {
  const policy = normalizeRequestPolicy({ blockTrackers: true });
  assert.equal(shouldBlockRequest("not a url", "script", policy), null);
});

test("the policy rejects malformed configuration", () => {
  assert.throws(() => normalizeRequestPolicy({ nope: 1 }), /Unknown requestPolicy option/);
  assert.throws(() => normalizeRequestPolicy({ blockResources: "everything" }), /must be one of/);
  assert.throws(() => normalizeRequestPolicy({ blockResources: ["laser"] }), /unknown resource type/);
  assert.throws(() => normalizeRequestPolicy({ blockTrackers: "yes" }), /must be a boolean/);
  assert.throws(() => normalizeRequestPolicy({ blockDomains: [""] }), /must be hostnames/);
  assert.throws(() => normalizeRequestPolicy([]), /must be an object/);
});
