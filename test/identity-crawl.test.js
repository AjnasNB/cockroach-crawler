import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";

import { crawl, crawlDetailed } from "../src/index.js";
import { resolveIdentity } from "../src/identity.js";

let server;
let baseUrl;
let received;

before(async () => {
  server = createServer((request, response) => {
    received.push({ url: request.url, headers: { ...request.headers } });

    if (request.url === "/robots.txt") {
      response.setHeader("content-type", "text/plain");
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    if (request.url === "/challenged") {
      response.statusCode = 403;
      response.setHeader("content-type", "text/html");
      response.end(
        '<html><head><title>Just a moment...</title></head><body>'
        + '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script>'
        + "</body></html>"
      );
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end("<html><head><title>Home</title></head><body><main><h1>Home</h1><p>Body text.</p></main></body></html>");
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

function reset() {
  received = [];
}

test("crawl sends a coherent identity when one is declared", async () => {
  reset();
  const identity = resolveIdentity("chrome-windows");
  const pages = await crawl({
    seeds: [`${baseUrl}/`],
    maxPages: 1,
    allowPrivateNetworks: true,
    identity: "chrome-windows"
  });

  assert.equal(pages.length, 1);
  const page = received.find((entry) => entry.url === "/");
  assert.equal(page.headers["user-agent"], identity.userAgent);
  assert.equal(page.headers["accept-language"], identity.acceptLanguage);
  assert.equal(page.headers["sec-ch-ua-platform"], '"Windows"');
  assert.equal(page.headers["sec-ch-ua-mobile"], "?0");
});

test("a mobile identity is sent coherently end to end", async () => {
  reset();
  const identity = resolveIdentity("safari-ios");
  await crawl({
    seeds: [`${baseUrl}/`],
    maxPages: 1,
    allowPrivateNetworks: true,
    identity: "safari-ios"
  });

  const page = received.find((entry) => entry.url === "/");
  assert.equal(page.headers["user-agent"], identity.userAgent);
  assert.equal(page.headers["sec-ch-ua"], undefined);
});

test("crawl keeps the default user agent when no identity is declared", async () => {
  reset();
  await crawl({ seeds: [`${baseUrl}/`], maxPages: 1, allowPrivateNetworks: true });
  const page = received.find((entry) => entry.url === "/");
  assert.match(page.headers["user-agent"], /cockroach-crawler/i);
  assert.equal(page.headers["sec-ch-ua"], undefined);
});

test("identity and userAgent cannot both be set", async () => {
  await assert.rejects(
    () => crawl({
      seeds: [`${baseUrl}/`],
      allowPrivateNetworks: true,
      identity: "chrome-windows",
      userAgent: "custom/1.0"
    }),
    /Set either identity or userAgent/
  );
});

test("crawl rejects an unknown identity profile", async () => {
  await assert.rejects(
    () => crawl({ seeds: [`${baseUrl}/`], allowPrivateNetworks: true, identity: "netscape" }),
    /Unknown identity profile/
  );
});

test("a challenge page fails closed instead of becoming empty content", async () => {
  reset();
  const result = await crawlDetailed({
    seeds: [`${baseUrl}/challenged`],
    maxPages: 1,
    allowPrivateNetworks: true,
    maxRetries: 0
  });

  assert.equal(result.pages.length, 0);
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].code, "CHALLENGE_ENCOUNTERED");
  assert.match(result.failures[0].error, /cloudflare/);
});

test("report mode admits the page instead of failing it", async () => {
  reset();
  const result = await crawlDetailed({
    seeds: [`${baseUrl}/challenged`],
    maxPages: 1,
    allowPrivateNetworks: true,
    maxRetries: 0,
    challengePolicy: { mode: "report" }
  });
  assert.equal(result.failures.filter((entry) => entry.code === "CHALLENGE_ENCOUNTERED").length, 0);
});

test("an ordinary page is never reported as challenged", async () => {
  reset();
  const pages = await crawl({
    seeds: [`${baseUrl}/`],
    maxPages: 1,
    allowPrivateNetworks: true,
    challengePolicy: { mode: "report" }
  });
  assert.equal(pages.length, 1);
  assert.match(pages[0].markdown ?? pages[0].text ?? "", /Home/);
});
