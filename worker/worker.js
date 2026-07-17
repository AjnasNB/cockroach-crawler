import { createServerlessCrawler } from "../src/serverless.js";

function origins(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function json(value, status) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

function equal(left, right) {
  const a = new TextEncoder().encode(String(left || ""));
  const b = new TextEncoder().encode(String(right || ""));
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) difference |= (a[index] || 0) ^ (b[index] || 0);
  return difference === 0;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const allowedOrigins = origins(env.CRAWLER_ALLOWED_ORIGINS);
    if (!allowedOrigins.length) {
      return json({ error: "No deployment origins are configured.", code: "SERVERLESS_ORIGINS_NOT_CONFIGURED" }, 503);
    }
    let crawler;
    try {
      crawler = createServerlessCrawler({
        allowedOrigins,
        accessToken: env.CRAWLER_API_TOKEN,
        maxPages: 5,
        maxDepth: 1,
        maxRequests: 25,
        maxBytes: 1024 * 1024,
        maxTotalBytes: 5 * 1024 * 1024,
        maxDurationMs: 15_000
      });
    } catch {
      return json({ error: "Serverless deployment configuration is invalid.", code: "SERVERLESS_INVALID_DEPLOYMENT" }, 503);
    }

    if (request.method === "POST" && url.pathname === "/v1/crawl") {
      const expected = `Bearer ${env.CRAWLER_API_TOKEN || ""}`;
      if (!equal(request.headers.get("authorization"), expected)) {
        return crawler.fetch(request);
      }
      if (!env.CRAWLER_RATE_LIMITER || typeof env.CRAWLER_RATE_LIMITER.limit !== "function") {
        return json({ error: "Rate limiting is not configured.", code: "SERVERLESS_RATE_LIMIT_NOT_CONFIGURED" }, 503);
      }
      const { success } = await env.CRAWLER_RATE_LIMITER.limit({ key: "crawler-api" });
      if (!success) return json({ error: "Rate limit exceeded.", code: "SERVERLESS_RATE_LIMITED" }, 429);
    }
    return crawler.fetch(request);
  }
};
