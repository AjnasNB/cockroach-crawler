import assert from "node:assert/strict";
import test from "node:test";

import { CookieJar, CrawlSession, ProxyRotator, sessionDefaults } from "../src/session.js";

test("CookieJar stores and replays a simple cookie", () => {
  const jar = new CookieJar();
  jar.store("https://x.test/", "sid=abc; Path=/");
  assert.equal(jar.headerFor("https://x.test/"), "sid=abc");
  assert.equal(jar.headerFor("https://x.test/deep/page"), "sid=abc");
});

test("CookieJar honours the Secure attribute", () => {
  const jar = new CookieJar();
  jar.store("https://x.test/", "sid=abc; Secure");
  assert.equal(jar.headerFor("https://x.test/"), "sid=abc");
  assert.equal(jar.headerFor("http://x.test/"), "");
});

test("CookieJar scopes host-only cookies to the exact host", () => {
  const jar = new CookieJar();
  jar.store("https://x.test/", "a=1");
  assert.equal(jar.headerFor("https://x.test/"), "a=1");
  assert.equal(jar.headerFor("https://sub.x.test/"), "");
});

test("CookieJar honours an explicit Domain attribute", () => {
  const jar = new CookieJar();
  jar.store("https://x.test/", "a=1; Domain=x.test");
  assert.equal(jar.headerFor("https://sub.x.test/"), "a=1");
});

test("CookieJar refuses a Domain the origin may not set", () => {
  const jar = new CookieJar();
  assert.equal(jar.store("https://evil.test/", "a=1; Domain=x.test"), false);
  assert.equal(jar.headerFor("https://x.test/"), "");
});

test("CookieJar scopes by path", () => {
  const jar = new CookieJar();
  jar.store("https://x.test/", "a=1; Path=/admin");
  assert.equal(jar.headerFor("https://x.test/admin"), "a=1");
  assert.equal(jar.headerFor("https://x.test/admin/users"), "a=1");
  assert.equal(jar.headerFor("https://x.test/adminx"), "");
  assert.equal(jar.headerFor("https://x.test/"), "");
});

test("CookieJar drops expired cookies and applies Max-Age", () => {
  const jar = new CookieJar();
  jar.store("https://x.test/", "gone=1; Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  assert.equal(jar.headerFor("https://x.test/"), "");

  jar.store("https://x.test/", "live=1; Max-Age=600");
  assert.equal(jar.headerFor("https://x.test/"), "live=1");
});

test("CookieJar overwrites a cookie with the same name, domain, and path", () => {
  const jar = new CookieJar();
  jar.store("https://x.test/", "sid=one; Path=/");
  jar.store("https://x.test/", "sid=two; Path=/");
  assert.equal(jar.headerFor("https://x.test/"), "sid=two");
  assert.equal(jar.size, 1);
});

test("CookieJar sends more specific paths first", () => {
  const jar = new CookieJar();
  jar.store("https://x.test/", "a=root; Path=/");
  jar.store("https://x.test/admin/", "a=deep; Path=/admin");
  const header = jar.headerFor("https://x.test/admin/page");
  assert.equal(header.indexOf("a=deep") < header.indexOf("a=root"), true);
});

test("CookieJar reads a Headers object and enforces ceilings", () => {
  const jar = new CookieJar({ maxPerDomain: 2 });
  const headers = new Headers();
  headers.append("set-cookie", "a=1");
  headers.append("set-cookie", "b=2");
  assert.equal(jar.setFromResponse("https://x.test/", headers), 2);

  jar.store("https://x.test/", "c=3");
  assert.ok(jar.size <= 2);
});

test("CookieJar rejects malformed input and oversized values", () => {
  const jar = new CookieJar({ maxValueLength: 8 });
  assert.equal(jar.store("https://x.test/", "big=123456789"), false);
  assert.equal(jar.store("https://x.test/", "not-a-cookie"), false);
  assert.throws(() => jar.setFromResponse("https://x.test/", 42), /headers must be/);
  assert.throws(() => jar.headerFor("ftp://x.test/"), /must be an http\(s\) URL/);
  assert.throws(() => new CookieJar({ nope: 1 }), /Unknown CookieJar option/);
});

test("CookieJar round-trips through JSON", () => {
  const jar = new CookieJar();
  jar.store("https://x.test/", "sid=abc; Path=/; Secure");
  const restored = CookieJar.fromJSON(JSON.parse(JSON.stringify(jar.toJSON())));
  assert.equal(restored.headerFor("https://x.test/"), "sid=abc");
  assert.equal(restored.headerFor("http://x.test/"), "");
  assert.equal(jar.toJSON().schema, sessionDefaults.jarSchema);
  assert.throws(() => CookieJar.fromJSON({ schema: "other" }), /must be a .* record/);
});

test("ProxyRotator cycles through the pool", () => {
  const rotator = new ProxyRotator({ proxies: ["http://a.test:8080", "http://b.test:8080"] });
  const first = rotator.next();
  const second = rotator.next();
  const third = rotator.next();
  assert.notEqual(first, second);
  assert.equal(first, third);
});

test("ProxyRotator disables a proxy after repeated failures and restores it", () => {
  const rotator = new ProxyRotator({
    proxies: ["http://a.test:8080", "http://b.test:8080"],
    maxFailures: 2,
    cooldownMs: 0
  });
  rotator.report("http://a.test:8080", false);
  rotator.report("http://a.test:8080", false);
  assert.equal(rotator.stats().find((entry) => entry.url.includes("a.test")).disabled, false);

  const strict = new ProxyRotator({ proxies: ["http://a.test:8080", "http://b.test:8080"], maxFailures: 1 });
  strict.report("http://a.test:8080", false);
  assert.equal(strict.healthy, 1);
  assert.match(strict.next(), /b\.test/);

  strict.report("http://a.test:8080", true);
  assert.equal(strict.healthy, 2);
});

test("ProxyRotator keeps a sticky proxy per key", () => {
  const rotator = new ProxyRotator({
    proxies: ["http://a.test:8080", "http://b.test:8080"],
    strategy: "sticky"
  });
  const first = rotator.next("https://site-one.test");
  assert.equal(rotator.next("https://site-one.test"), first);
});

test("ProxyRotator never returns an empty selection when all are cooling down", () => {
  const rotator = new ProxyRotator({ proxies: ["http://a.test:8080"], maxFailures: 1, cooldownMs: 60_000 });
  rotator.report("http://a.test:8080", false);
  assert.equal(rotator.healthy, 0);
  assert.match(rotator.next(), /a\.test/);
});

test("ProxyRotator validates its configuration", () => {
  assert.throws(() => new ProxyRotator({ proxies: [] }), /non-empty proxies array/);
  assert.throws(() => new ProxyRotator({ proxies: ["not a url"] }), /Invalid URL|must be an http/);
  assert.throws(() => new ProxyRotator({ proxies: ["http://a.test"], strategy: "spray" }), /strategy must be one of/);
  assert.throws(() => new ProxyRotator({ proxies: ["http://a.test"], nope: 1 }), /Unknown ProxyRotator option/);
});

test("CrawlSession carries cookies and merges defaults", () => {
  const session = new CrawlSession({ identity: "chrome-windows", maxPages: 5 });
  session.absorb("https://x.test/", ["sid=abc; Path=/"]);

  assert.equal(session.headersFor("https://x.test/").cookie, "sid=abc");
  const options = session.optionsFor({ seeds: ["https://x.test/"] });
  assert.equal(options.identity, "chrome-windows");
  assert.equal(options.maxPages, 5);
  assert.deepEqual(options.seeds, ["https://x.test/"]);
  assert.equal(session.requests, 1);
});

test("CrawlSession assigns a proxy per request when rotation is configured", () => {
  const session = new CrawlSession({
    proxy: new ProxyRotator({ proxies: ["http://a.test:8080", "http://b.test:8080"] })
  });
  const first = session.optionsFor({ seeds: ["https://one.test/"] });
  const second = session.optionsFor({ seeds: ["https://two.test/"] });
  assert.ok(first.proxyUrl);
  assert.notEqual(first.proxyUrl, second.proxyUrl);
});

test("CrawlSession validates its collaborators", () => {
  assert.throws(() => new CrawlSession({ cookies: {} }), /must be a CookieJar/);
  assert.throws(() => new CrawlSession({ proxy: {} }), /must be a ProxyRotator/);
});
