import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import worker from "../worker/worker.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOKEN = "worker-test-secret";
const BASE_ENV = Object.freeze({
  CRAWLER_ALLOWED_ORIGINS: "https://docs.example.com",
  CRAWLER_API_TOKEN: TOKEN
});

function crawlRequest(token = TOKEN) {
  return new Request("https://worker.example/v1/crawl", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ url: "https://docs.example.com/" })
  });
}

test("checked-in Worker template has no crawlable origin until the operator configures one", async () => {
  const config = JSON.parse(await readFile(path.join(ROOT, "worker", "wrangler.jsonc"), "utf8"));
  assert.equal(config.vars.CRAWLER_ALLOWED_ORIGINS, "");

  const response = await worker.fetch(crawlRequest(), {
    CRAWLER_ALLOWED_ORIGINS: config.vars.CRAWLER_ALLOWED_ORIGINS,
    CRAWLER_API_TOKEN: TOKEN,
    CRAWLER_RATE_LIMITER: { async limit() { return { success: true }; } }
  });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "SERVERLESS_ORIGINS_NOT_CONFIGURED");
});

test("worker rejects an invalid token without invoking the rate limiter", async () => {
  let limiterCalls = 0;
  const request = crawlRequest("wrong-token");
  const response = await worker.fetch(request, {
    ...BASE_ENV,
    CRAWLER_RATE_LIMITER: {
      async limit() {
        limiterCalls += 1;
        return { success: true };
      }
    }
  });

  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "SERVERLESS_UNAUTHORIZED");
  assert.equal(limiterCalls, 0);
  assert.equal(request.bodyUsed, false);
});

test("worker returns 429 when the configured limiter denies an authenticated request", async () => {
  const limiterInputs = [];
  const request = crawlRequest();
  const response = await worker.fetch(request, {
    ...BASE_ENV,
    CRAWLER_RATE_LIMITER: {
      async limit(input) {
        limiterInputs.push(input);
        return { success: false };
      }
    }
  });

  assert.equal(response.status, 429);
  assert.equal((await response.json()).code, "SERVERLESS_RATE_LIMITED");
  assert.deepEqual(limiterInputs, [{ key: "crawler-api" }]);
  assert.equal(request.bodyUsed, false);
});

test("worker fails closed when rate limiting is not configured", async () => {
  const request = crawlRequest();
  const response = await worker.fetch(request, { ...BASE_ENV });

  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "SERVERLESS_RATE_LIMIT_NOT_CONFIGURED");
  assert.equal(request.bodyUsed, false);
});

test("worker delegates an authenticated, rate-limited request exactly once", async () => {
  let authorizationReads = 0;
  let bodyReads = 0;
  const limiterInputs = [];
  const request = {
    url: "https://worker.example/v1/crawl",
    method: "POST",
    body: null,
    headers: {
      get(name) {
        if (name === "authorization") {
          authorizationReads += 1;
          return `Bearer ${TOKEN}`;
        }
        return null;
      }
    },
    async text() {
      bodyReads += 1;
      return "{";
    }
  };
  const response = await worker.fetch(request, {
    ...BASE_ENV,
    CRAWLER_RATE_LIMITER: {
      async limit(input) {
        limiterInputs.push(input);
        return { success: true };
      }
    }
  });

  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "SERVERLESS_INVALID_JSON");
  assert.deepEqual(limiterInputs, [{ key: "crawler-api" }]);
  assert.equal(authorizationReads, 2, "the wrapper and one downstream handler each authenticate once");
  assert.equal(bodyReads, 1, "the downstream handler receives the request exactly once");
});
