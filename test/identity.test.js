import assert from "node:assert/strict";
import test from "node:test";

import {
  ChallengeError,
  applyChallengePolicy,
  detectChallenge,
  identityBrowserContext,
  identityDefaults,
  identityHeaders,
  identityProfileNames,
  normalizeChallengePolicy,
  resolveIdentity
} from "../src/identity.js";

test("resolveIdentity returns a coherent frozen profile", () => {
  const profile = resolveIdentity("chrome-windows");
  assert.equal(profile.schema, identityDefaults.profileSchema);
  assert.equal(profile.engine, "chromium");
  assert.match(profile.userAgent, /Chrome\/141/);
  assert.equal(profile.mobile, false);
  assert.ok(Object.isFrozen(profile));
});

test("every published profile is internally consistent", () => {
  for (const name of identityProfileNames) {
    const profile = resolveIdentity(name);
    assert.ok(profile.userAgent.length > 20, `${name} needs a user agent`);
    assert.ok(profile.viewport.width >= 160 && profile.viewport.height >= 160, `${name} viewport`);
    if (profile.mobile) assert.match(profile.userAgent, /Mobile|iPhone|Android/u, `${name} mobile UA`);
    const headers = identityHeaders(profile);
    assert.equal(headers["user-agent"], profile.userAgent);
    if (profile.engine === "chromium") {
      assert.equal(headers["sec-ch-ua-mobile"], profile.mobile ? "?1" : "?0");
      assert.equal(headers["sec-ch-ua-platform"], `"${profile.platform}"`);
    } else {
      assert.equal(headers["sec-ch-ua"], undefined, `${name} must not send chromium client hints`);
    }
  }
});

test("resolveIdentity rejects unknown profiles and overrides", () => {
  assert.throws(() => resolveIdentity("netscape"), /Unknown identity profile/);
  assert.throws(() => resolveIdentity("chrome-windows", { nope: 1 }), /Unknown identity override/);
  assert.throws(() => resolveIdentity("chrome-windows", { userAgent: "bad\nheader" }), /control characters/);
  assert.throws(() => resolveIdentity("chrome-windows", { userAgent: "" }), /must contain/);
});

test("resolveIdentity applies explicit overrides", () => {
  const profile = resolveIdentity("chrome-windows", {
    acceptLanguage: "de-DE,de;q=0.9",
    viewport: { width: 800, height: 600 },
    timezone: "Europe/Berlin",
    locale: "de-DE"
  });
  assert.equal(profile.acceptLanguage, "de-DE,de;q=0.9");
  assert.equal(profile.viewport.width, 800);
  assert.equal(profile.timezone, "Europe/Berlin");
  assert.equal(identityHeaders(profile)["accept-language"], "de-DE,de;q=0.9");
});

test("identityHeaders emits full client hints only when requested", () => {
  const profile = resolveIdentity("chrome-windows");
  assert.equal(identityHeaders(profile)["sec-ch-ua-arch"], undefined);
  assert.equal(identityHeaders(profile, { fullClientHints: true })["sec-ch-ua-arch"], '"x86"');
});

test("identityBrowserContext mirrors the http identity", () => {
  const profile = resolveIdentity("safari-ios");
  const context = identityBrowserContext(profile);
  assert.equal(context.userAgent, profile.userAgent);
  assert.equal(context.isMobile, true);
  assert.equal(context.hasTouch, true);
  assert.equal(context.viewport.width, profile.viewport.width);
  assert.equal(context.extraHTTPHeaders["user-agent"], profile.userAgent);
});

test("detectChallenge recognises vendor interstitials", () => {
  const report = detectChallenge({
    status: 403,
    url: "https://x.test/p",
    body: '<html><title>Just a moment...</title><script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script></html>'
  });
  assert.equal(report.challenged, true);
  assert.equal(report.vendor, "cloudflare");
  assert.ok(report.evidence.length > 0);
  assert.equal(report.url, "https://x.test/p");
});

test("detectChallenge reads vendor headers", () => {
  const report = detectChallenge({ status: 403, headers: { "X-DataDome": "protected" }, body: "" });
  assert.equal(report.vendor, "datadome");
  assert.ok(report.evidence.includes("header:x-datadome"));
});

test("detectChallenge flags bare blocks without inventing a vendor", () => {
  const report = detectChallenge({ status: 429, body: "slow down" });
  assert.equal(report.challenged, true);
  assert.equal(report.vendor, "unknown");
  assert.equal(report.kind, "rate-limit");
});

test("detectChallenge leaves ordinary pages alone", () => {
  const report = detectChallenge({ status: 200, body: "<html><body><h1>Docs</h1></body></html>" });
  assert.equal(report.challenged, false);
  assert.equal(report.vendor, null);
});

test("challenge policy denies by default", async () => {
  const report = detectChallenge({ status: 403, body: "cf-turnstile", url: "https://x.test/p" });
  const policy = normalizeChallengePolicy();
  assert.equal(policy.mode, "deny");
  await assert.rejects(() => applyChallengePolicy(report, policy, { url: "https://x.test/p" }), ChallengeError);
});

test("challenge policy can report without resolving", async () => {
  const report = detectChallenge({ status: 403, body: "cf-turnstile", url: "https://x.test/p" });
  const outcome = await applyChallengePolicy(report, normalizeChallengePolicy({ mode: "report" }), {
    url: "https://x.test/p"
  });
  assert.equal(outcome.resolved, false);
  assert.equal(outcome.action, "reported");
});

test("operator mode requires an authorization statement, origins, and a handler", () => {
  assert.throws(() => normalizeChallengePolicy({ mode: "operator" }), /requires an operator-supplied handler/);
  assert.throws(
    () => normalizeChallengePolicy({ mode: "operator", handler: () => ({}) }),
    /requires an 'authorization' statement/
  );
  assert.throws(
    () => normalizeChallengePolicy({ mode: "operator", handler: () => ({}), authorization: "I own this host." }),
    /requires a non-empty allowOrigins/
  );
  assert.throws(
    () => normalizeChallengePolicy({ mode: "deny", handler: () => ({}) }),
    /handler requires mode='operator'/
  );
  assert.throws(() => normalizeChallengePolicy({ mode: "solve" }), /mode must be one of/);
});

test("operator mode delegates to the operator handler inside the allowlist", async () => {
  const seen = [];
  const policy = normalizeChallengePolicy({
    mode: "operator",
    authorization: "I operate x.test and hold a documented WAF allowlist for this crawler.",
    allowOrigins: ["https://x.test"],
    handler: async (context) => {
      seen.push(context.origin);
      return { resolved: true, headers: { "cf-clearance": "operator-issued" } };
    }
  });

  const report = detectChallenge({ status: 403, body: "cf-turnstile", url: "https://x.test/p" });
  const outcome = await applyChallengePolicy(report, policy, { url: "https://x.test/p" });

  assert.equal(outcome.resolved, true);
  assert.equal(outcome.action, "handler");
  assert.equal(outcome.headers["cf-clearance"], "operator-issued");
  assert.deepEqual(seen, ["https://x.test"]);
});

test("operator mode refuses origins outside the allowlist", async () => {
  const policy = normalizeChallengePolicy({
    mode: "operator",
    authorization: "I operate x.test and hold a documented WAF allowlist for this crawler.",
    allowOrigins: ["https://x.test"],
    handler: async () => ({ resolved: true })
  });
  const report = detectChallenge({ status: 403, body: "cf-turnstile", url: "https://other.test/p" });
  await assert.rejects(
    () => applyChallengePolicy(report, policy, { url: "https://other.test/p" }),
    /outside challengePolicy.allowOrigins/
  );
});

test("a declining handler is not treated as a resolution", async () => {
  const policy = normalizeChallengePolicy({
    mode: "operator",
    authorization: "I operate x.test and hold a documented WAF allowlist for this crawler.",
    allowOrigins: ["https://x.test"],
    handler: async () => null
  });
  const report = detectChallenge({ status: 403, body: "cf-turnstile", url: "https://x.test/p" });
  const outcome = await applyChallengePolicy(report, policy, { url: "https://x.test/p" });
  assert.equal(outcome.resolved, false);
  assert.equal(outcome.action, "handler-declined");
});

test("an unchallenged report short-circuits every policy", async () => {
  const report = detectChallenge({ status: 200, body: "<html>ok</html>" });
  const outcome = await applyChallengePolicy(report, normalizeChallengePolicy(), {});
  assert.equal(outcome.resolved, true);
  assert.equal(outcome.action, "none");
});
