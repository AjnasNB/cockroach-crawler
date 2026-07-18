# Self-hosted serverless profile

The serverless profile is for small synchronous HTML crawls of origins selected by the deployment operator. It is intentionally separate from the hardened Node transport.

```js
import { createServerlessCrawler } from "cockroach-crawler/serverless";

const crawler = createServerlessCrawler({
  allowedOrigins: ["https://docs.example.com"],
  accessToken: process.env.CRAWLER_API_TOKEN,
  maxPages: 5,
  maxDepth: 1,
  maxRequests: 25,
  maxDurationMs: 15_000
});

const result = await crawler.crawl({
  url: "https://docs.example.com/start",
  maxPages: 3
});
```

The included `worker/` template exposes `POST /v1/crawl`, uses a Cloudflare secret for bearer authentication, and requires a Rate Limiting binding. It deliberately ships with an empty `CRAWLER_ALLOWED_ORIGINS` value, so the unconfigured template returns `503 SERVERLESS_ORIGINS_NOT_CONFIGURED`. Do not deploy the checked-in template unchanged.

Before deployment, the operator must complete all of these gates:

1. Set `CRAWLER_ALLOWED_ORIGINS` to one to 32 comma-separated, canonical HTTPS origins that the operator owns or independently trusts. Request input cannot add origins.
2. Review the configured Rate Limiting binding and limits for the target Cloudflare account.
3. Provision `CRAWLER_API_TOKEN` as a Cloudflare secret interactively; never place its value in config, command arguments, Git, screenshots, or logs.
4. Review [the restricted threat model](SERVERLESS-THREAT-MODEL.md), including the lack of DNS answer classification or pinning and the need for infrastructure egress restrictions where internal networks are reachable.
5. Run the dry-run bundle check and deployment-specific authentication, allowlist, rate-limit, robots, redirect, byte, and deadline probes.

The following commands run from a source checkout; package consumers can copy the included `worker/` template into their deployment repository first. Run the deploy command only after every gate above is satisfied.

```bash
npx wrangler secret put CRAWLER_API_TOKEN --config worker/wrangler.jsonc
npm run worker:check
npx wrangler deploy --config worker/wrangler.jsonc
```

Direct uses of `createServerlessCrawler` do not create platform rate limiting or egress controls automatically. Custom deployments must supply both; the included Worker template demonstrates the rate-limit binding.

## Boundary

- HTTPS origins are configured at deployment and cannot be broadened by request input.
- IP literals, localhost names, URL credentials, non-HTTPS targets, and redirects outside the allowlist are rejected.
- Robots policy is checked before the seed and again for every redirect target; retrieval errors fail closed except true absence.
- Page, depth, request, response-byte, total-byte, redirect, delay, request-timeout, and total-duration ceilings are hard-bounded.
- Request bodies are streamed with an 8 KiB ceiling rather than buffered without limit.

The profile does **not** resolve, classify, or pin DNS answers. An allowlisted hostname can resolve to an internal destination, so the allowlist is not a complete SSRF control. Use platform egress restrictions whenever internal networks are reachable. The profile also has no Playwright, provider credentials, social adapters, distributed queue, proxy rotation, or arbitrary-origin public proxy.

Read the complete [restricted serverless crawler threat model](SERVERLESS-THREAT-MODEL.md)
before deployment. It separates library, runtime, and operator controls and
documents abuse cases, observability, rollback, and residual risks. The current
threat-model draft still requires independent review under issue #13.
