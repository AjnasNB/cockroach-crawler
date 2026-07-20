<p align="center">
  <img src="./assets/readme-proof-still.svg" alt="Cockroach Crawler system map: a public URL and read-only APIs pass through explicit policy and budget gates into normalized evidence records" width="960">
</p>

# Cockroach Crawler

**Cockroach Crawler gives an agent a bounded, read-only route to web evidence across explicit URLs and supported public source APIs.** It combines a hardened local Node.js crawler, normalized provider adapters, and a restricted self-hosted Worker for allowlisted sites.

The stable npm release remains `0.2.0`. The current prerelease is `0.3.0-alpha.2`. Install it through the `next` tag or its exact version; stable users are not moved automatically.

The local crawler produces structured JSON/JSONL with readable text, Markdown, links, response metadata, redirect provenance, and content hashes for documentation indexing, RAG ingestion, content inventory, QA, research, and agent tools. The source adapters normalize GitHub, YouTube, X, and Reddit records when each provider's documented access requirements are met.

It does not call an LLM, require a hosted account, or include stealth, CAPTCHA, paywall, authentication, or authorization bypasses.

Documentation: [website](https://cockroachcrawler.com/docs/) · [architecture](./docs/ARCHITECTURE.md) · [source adapters](./docs/SOURCES.md) · [serverless profile](./docs/SERVERLESS.md) · [security](./SECURITY.md) · [contributing](./CONTRIBUTING.md)

## Check reach before you call a source

The prerelease source registry reports what the current machine can use before an agent makes a request. This command reads configuration state only; it does not print secrets or contact a provider.

```bash
npx -y --package cockroach-crawler@0.3.0-alpha.2 cockroach-sources doctor
```

| Capability | No developer API key | Optional configuration | Honest boundary |
| --- | --- | --- | --- |
| Public web pages | Yes | None for normal public HTTP(S) | URL-directed crawling, not general web search |
| Public GitHub repositories and issues | Yes | `GITHUB_TOKEN` or `GH_TOKEN` raises documented REST limits | Read-only REST operations |
| Known YouTube video | Metadata only | `YOUTUBE_API_KEY` enables search and richer metadata | No transcript support in this package |
| X and Reddit | No | Official provider credentials are required | No cookie extraction or session scraping |
| RSS, available YouTube captions, and hosted-anonymous search | Available through a separately configured Maqam source adapter | The host supplies and governs the selected adapter | Not silently bundled into Cockroach Crawler |

No-key does not mean no constraints. Provider terms, public rate limits, regional availability, robots policy, and network controls still apply.

## One governed agent stack

Cockroach Crawler is the reach layer, not the whole agent platform. The projects compose through explicit adapters so each security boundary remains inspectable.

```mermaid
flowchart LR
  Agent["Agent host"] --> Loop["ProductLoop OS: orchestrate"]
  Loop --> Context["Qarinah: compile context"]
  Loop --> Maqam["Maqam: govern registered actions"]
  Maqam --> Crawl["Cockroach Crawler: collect bounded public evidence"]
  Crawl --> Evidence["Normalized records and provenance"]
  Evidence --> Context
  Maqam --> Evidence
```

| Layer | What it contributes | Public status |
| --- | --- | --- |
| [Cockroach Crawler](https://github.com/AjnasNB/cockroach-crawler) | Bounded web crawling, source capability checks, normalized records, and a restricted serverless profile | Stable crawler plus public provider/serverless prerelease |
| [Maqam](https://github.com/AjnasNB/maqam) | Policy, exact one-use approvals, registered tool execution, browser-action contracts, traces, and evidence | Public npm package |
| [ProductLoop OS](https://github.com/AjnasNB/productloop-os) | Workflow, policy, approval, connector, skill, evaluation, provenance, and research composition | Public npm package |
| Qarinah | Local-first context ledger, deterministic graph/index, compact cited context packs, and Codex/Claude hooks | Private alpha; no public install claim yet |

The stack does not ship a model, browser engine, proxy network, CAPTCHA bypass, hidden credential reuse, operating-system sandbox, or universal interception. A call is governed only when the host routes the real operation through its registered boundary.

## Two execution tiers

| Tier | Best for | Boundary |
| --- | --- | --- |
| Hardened local crawler | Agent tools, CI, RAG ingestion, authorized browser rendering, arbitrary public sites | DNS validation and address pinning, manual redirects, robots, strict budgets, optional restricted Playwright |
| Self-hosted serverless crawler | Small synchronous crawls of deployment-owned allowlisted origins | HTTPS origin allowlist, bearer auth, Cloudflare rate limit, per-hop robots checks, manual redirects, and small hard budgets; no browser, social providers, or DNS pinning |

The Worker is a separate transport. Cloudflare Workers cannot preserve the local engine's `node:dns`, `node:net`, Undici dispatcher, or Playwright boundary. It does not resolve, classify, or pin DNS answers; an allowlisted hostname can resolve internally. Use only operator-owned or independently trusted origins plus infrastructure egress controls. The API reports that difference in every result.

## Security defaults

- Public-network-only by default, with complete DNS-answer validation for IPv4, IPv6, and IPv4-mapped addresses.
- Manual, bounded redirects. The normal HTTP transport DNS-pins every hop with Undici.
- Blocks embedded URL credentials, unsafe schemes, private/loopback/link-local/multicast/reserved ranges, and cloud metadata endpoints.
- `allowPrivateNetworks` is an explicit trusted-operator opt-in for loopback/private/unique-local targets. It still never permits metadata or link-local targets.
- Same-origin crawling by default. Cross-origin mode requires an explicit origin allowlist.
- Robots failures fail closed except true absence (`404`/`410`), and supported crawl-delay directives increase per-origin pacing.
- Bounded seeds, requests, queue entries, links, sitemaps, URL length, redirects, retries, concurrency, per-page bytes, total bytes, and total duration.
- The agent adapter cannot disable robots, expand creator limits, enable private networks, or enable browser mode unless its creator explicitly authorizes those capabilities.

Read [SECURITY.md](./SECURITY.md) before exposing crawling to model-generated or user-controlled URLs. Crawled content is untrusted data and may contain prompt injection.

## Use cases

| Use case | Fit |
| --- | --- |
| Public documentation, blogs, help centers, and marketing pages | Strong |
| JSONL/Markdown records for RAG and indexing | Strong |
| Bounded local crawling from Node.js or a CLI | Strong |
| A strictly limited crawler tool inside an agent runtime | Strong, with creator-owned origin and resource policy |
| JavaScript-rendered pages with bounded explicit clicks | Optional Chromium mode; isolate it for untrusted targets |
| Large distributed queues, proxy rotation, or hosted extraction APIs | Outside this compact single-process boundary; use a distributed or managed platform |
| Bypass paywalls, CAPTCHA, login walls, owner policy, or access control | Not supported |

## Install

Supports the maintained Node.js 22 LTS, 24 LTS, and 26 Current release lines.

```bash
npm install cockroach-crawler
```

Install the prerelease explicitly rather than moving stable users automatically:

```bash
npm install cockroach-crawler@next
```

For the stable crawler CLI:

```bash
npm install --global cockroach-crawler
cockroach-crawl https://example.com --max-pages 20 --jsonl
```

## CLI

Public same-origin crawl:

```bash
cockroach-crawl https://example.com/docs \
  --max-pages 50 \
  --max-requests 200 \
  --max-duration 120000 \
  --jsonl \
  --output crawl.jsonl
```

Sitemap discovery and a URL filter:

```bash
cockroach-crawl https://example.com/docs/ \
  --sitemaps \
  --include "/docs/" \
  --max-pages 200 \
  --output docs.json
```

Cross-origin crawling must enumerate every permitted origin, including the seed origin:

```bash
cockroach-crawl https://example.com \
  --all-origins \
  --allow-origin https://example.com \
  --allow-origin https://docs.example.com
```

Intentional local/private crawling requires a trusted operator flag. Metadata and link-local targets remain blocked:

```bash
cockroach-crawl http://127.0.0.1:3000 \
  --allow-private-networks \
  --max-pages 5
```

Important options:

- `--url-file <file>`: seed URLs, one per line.
- `--max-pages <n>` / `--max-depth <n>`: returned-page and traversal limits.
- `--max-requests <n>` / `--max-duration <ms>`: total network and time budgets.
- `--max-bytes <n>` / `--max-total-bytes <n>`: per-response and total decoded-byte budgets.
- `--max-redirects <n>`: manually validated redirect-hop limit.
- `--concurrency <n>` / `--delay <ms>` / `--timeout <ms>`: scheduling controls.
- `--sitemaps`: bounded robots and `/sitemap.xml` discovery.
- `--all-origins` plus repeated `--allow-origin <origin>`: explicit cross-origin policy.
- `--allow-private-networks`: trusted private/loopback opt-in; never metadata/link-local.
- `--include <regex>` / `--exclude <regex>`: bounded trusted CLI regex filters.
- `--allow-sensitive-paths`: disable the login/account/admin/cart path heuristic. This does not change network reachability or authorization.
- `--jsonl` / `--output <file>`: output format and destination.
- `--contact <email-or-url>`: contact-aware crawler user agent.

Run `cockroach-crawl --help` for the complete browser and output option list.

## Source adapters

`cockroach-sources` is read-only. It never accepts secrets on command-line flags, extracts browser cookies, installs provider tools, or silently falls back from an official API to session scraping.

```bash
npm install cockroach-crawler@next
npx cockroach-sources doctor
npx cockroach-sources search github "secure web crawler" --max-results 5
npx cockroach-sources read github AjnasNB/cockroach-crawler
npx cockroach-sources read youtube https://youtu.be/VIDEO_ID
```

Current capability contract:

| Provider | Without credentials | With operator credentials | Deliberate limit |
| --- | --- | --- | --- |
| Web | Hardened URL crawl | Same; trusted creator may opt into private networks/browser | No search engine or access-control bypass |
| GitHub | Public repository/issue search and repository read at the unauthenticated limit | Higher documented REST limit with `GITHUB_TOKEN` or `GH_TOKEN` | Read-only REST calls |
| YouTube | Public oEmbed video metadata read | Search and richer metadata with `YOUTUBE_API_KEY` | No universal transcript claim; `transcript: false` |
| X | Unavailable | Recent search/read with an approved `X_BEARER_TOKEN` | Official X API v2 only; no cookie scraping |
| Reddit | Unavailable | Search/read with `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, and `COCKROACH_REDDIT_USER_AGENT` | Application-only OAuth; comply with Reddit data terms |

```js
import { createSourceRegistryFromEnv } from "cockroach-crawler/sources";

const sources = createSourceRegistryFromEnv(process.env);
console.table(sources.doctor());

const records = await sources.search("github", {
  query: "robots.txt crawler",
  maxResults: 5
});

console.log(records[0]?.contentHash, records[0]?.provenance);
```

Every normalized record includes `source`, `id`, `type`, `title`, `url`, `text`, author/time metadata, a content hash, adapter version, warnings, and request provenance. Credentials never appear in records or typed provider errors.

## Self-hosted serverless crawler

The Worker is an allowlist-first deployment template, not a public hosted scraping service. Before deployment, replace the example origin in `worker/wrangler.jsonc` with origins you operate or are explicitly authorized to crawl. Store the API token as a Cloudflare secret, never in the config or repository. The following commands run from a source checkout; package consumers can copy the included `worker/` template into their deployment repository first.

```bash
npm run worker:check
npx wrangler secret put CRAWLER_API_TOKEN --config worker/wrangler.jsonc
npx wrangler deploy --config worker/wrangler.jsonc
```

```bash
curl https://YOUR-WORKER.example/v1/crawl \
  -H "Authorization: Bearer YOUR_DEPLOYMENT_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"url":"https://docs.example.com/","maxPages":3,"maxDepth":1}'
```

The included deployment requires a bearer secret and a Cloudflare Rate Limiting binding. The default ceilings are five pages, one link-depth level, 25 subrequests, 1 MiB per page, 5 MiB total, and 15 seconds. Do not remove authentication or expose an arbitrary-origin proxy.

For direct Worker integration:

```js
import { createServerlessCrawler } from "cockroach-crawler/serverless";

export default {
  async fetch(request, env) {
    const crawler = createServerlessCrawler({
      allowedOrigins: ["https://docs.example.com"],
      accessToken: env.CRAWLER_API_TOKEN
    });
    return crawler.fetch(request);
  }
};
```

`createServerlessCrawler` enforces its application-level allowlist and budgets, but a custom integration must also supply platform rate limiting and infrastructure egress policy. The included Worker template demonstrates the rate-limit binding.

## JavaScript API

```js
import { crawl } from "cockroach-crawler";

const pages = await crawl({
  seeds: ["https://example.com/docs"],
  maxPages: 25,
  maxRequests: 150,
  maxDepth: 2,
  concurrency: 4,
  includeSitemaps: true,
  include: ["/docs/"],
  exclude: ["/archive/"],
  onPage(page) {
    console.log(page.url, page.contentHash);
  }
});

console.log(pages[0]?.markdown);
console.log(pages.stats);
console.log(pages.failures);
```

`crawlDetailed(options)` returns `{ pages, failures, stats }`. `AbortSignal`, custom DNS lookup for controlled testing, allowed origins, retry controls, and every resource budget are declared in the included TypeScript definitions.

## Agent adapter

```js
import { createCockroachCrawlerTool } from "cockroach-crawler/agent";

const crawlTool = createCockroachCrawlerTool({
  maxPages: 10,
  maxDepth: 1,
  maxRequests: 80,
  maxDurationMs: 60_000,
  allowedOrigins: ["https://example.com"],
  includeSitemaps: true
});

const result = await crawlTool.execute({
  urls: ["https://example.com/docs"],
  maxPages: 5,
  includeSitemaps: true
});

console.log(result.pages[0]?.markdown);
```

The object exposes `name`, `description`, JSON Schema through `parameters` and `input_schema`, and `execute(input)`. Runtime validation is strict; JSON Schema metadata is not treated as the only enforcement layer. Agent `include` and `exclude` values are escaped literal URL fragments, not regular expressions.

Browser input is rejected by default. A trusted creator must set `allowBrowser: true` and configure any authentication state, executable, or browser channel itself. Model input can then supply only bounded waits and click selectors.

## Browser mode

Install Playwright alongside the crawler and install Chromium:

```bash
npm install cockroach-crawler playwright
npx playwright install chromium
```

```js
import { crawl } from "cockroach-crawler";

const pages = await crawl({
  seeds: ["https://example.com/app"],
  maxPages: 3,
  maxRequests: 100,
  browser: {
    waitUntil: "domcontentloaded",
    click: ["button.load-more"],
    waitFor: ".loaded"
  }
});
```

The Chromium adapter installs a context-wide route before any page is created. Every HTTP(S) `GET` or `HEAD` request—including navigations, redirects, subresources, frames, and popup first requests—is fetched by the crawler's DNS-validated, address-pinned Undici transport and fulfilled back into Chromium. Chromium itself is placed behind a local deny-by-default egress sink. Redirect hops retain the URL/origin/robots/sensitive-path policy and redirect limit; exclusion patterns also apply to browser resources, while inclusion patterns select page navigations so required assets can still load. Redirect cookies are synchronized through Chromium before the next validated hop, preventing source-origin credentials from being forwarded while recomputing eligible target-origin cookies with conservative SameSite handling. The proxy intentionally accepts and sends only host-only, unpartitioned cookies: response `Domain` and `Partitioned` attributes are rejected, cookie prefixes and Secure/HTTPS requirements are checked before storage, and outbound host, RFC path-boundary, expiry, Secure, credentials-mode, and SameSite rules are applied explicitly. Strict, Lax, and unspecified/Lax-by-default cookies from cross-site subresource or nested-frame responses are rejected before Playwright storage. SameSite comparison deliberately requires the same scheme and exact host, so sibling subdomains are treated as cross-site; incomplete ancestry, opaque sandbox state, and non-navigation requests without a Chromium-emitted Cookie credential signal fail closed. Top-level redirects are replayed at the final URL; cross-origin redirects for subresources, frames, and popups are rejected because fulfilling them at the original URL could weaken browser origin/CORS semantics.

Browser WebSockets and state-changing HTTP methods are blocked. Service workers, downloads, workers, WebTransport, beacons, and WebRTC/STUN are disabled as defense in depth, and observed popups are closed after their first request has passed through the context route. Decoded bytes from every proxied response count against the per-resource and total budgets; rendered DOM size is checked separately. All browser waits and actions use the remaining crawl deadline, and abort closes outstanding browser and network work.

Browser mode is still **not a process or JavaScript sandbox**. Hostile pages can consume CPU or memory and may target Chromium vulnerabilities. The byte totals cover decoded response bodies, not HTTP headers, compression overhead, or other wire framing. Use the bundled Playwright Chromium where possible, and retain process/container isolation and restricted host egress for untrusted targets.

Storage-state files contain cookies and tokens. Keep them out of source control. Only `GET` and `HEAD` leave the browser proxy, but page JavaScript and explicit clicks can invoke server-side behavior implemented on unsafe `GET` endpoints. Sensitive-path filtering is a heuristic, not authorization; use browser mode only on authorized pages with operator-reviewed policy and selectors.

## Output

Each page includes core extraction fields plus crawl provenance:

```json
{
  "url": "https://example.com/",
  "canonical": "https://example.com/",
  "title": "Example",
  "h1": "Example",
  "text": "Readable text...",
  "markdown": "# Example\n\nReadable markdown...",
  "links": ["https://example.com/about"],
  "status": 200,
  "contentType": "text/html; charset=utf-8",
  "bytes": 1250,
  "contentHash": "sha256:...",
  "redirectChain": [],
  "robotsAllowed": true,
  "fetchedAt": "2026-07-15T00:00:00.000Z"
}
```

## Why Cockroach Crawler

| Surface | What it gives you | Use it for |
| --- | --- | --- |
| Hardened local CLI/API | DNS-aware destination checks, per-hop policy, browser controls, and strict crawl budgets | Agent tools, research jobs, RAG ingestion, documentation indexing |
| Restricted serverless API | A small authenticated endpoint with deployment-owned HTTPS origins and exact limits | Owned documentation, support sites, and narrowly scoped hosted reads |
| Source registry | One read-only record format for web, GitHub, YouTube, X, and Reddit | Provider-aware search, metadata collection, and capability diagnostics |
| Evidence records | Content hashes, retrieval time, source URL, adapter version, warnings, and authentication state | Auditable pipelines, deduplication, QA, and reproducible research |

The two crawler tiers intentionally share records rather than network authority: choose the hardened local runtime when model-generated destinations need address-level controls, or the restricted serverless runtime when a deployment owns a small fixed origin set.

## License and release provenance

Cockroach Crawler is MIT licensed. Release visuals, videos, and command evidence are generated from the committed project sources; the resolved direct dependencies are MIT or Apache-2.0. See [docs/PROVENANCE.md](./docs/PROVENANCE.md) and [docs/DEPENDENCY_LICENSES.md](./docs/DEPENDENCY_LICENSES.md). From a source checkout, run `npm run audit:licenses` to verify the lockfile snapshot.

## Launch kit

The reviewable launch plan, channel drafts, claims checklist, media-size matrix,
and release messaging are in [docs/launch](./docs/launch/README.md). Captioned
demo renders and their editable Remotion source are in
[media/remotion](./media/remotion), and platform-sized campaign artwork is in
[media/launch-assets](./media/launch-assets). The same map is published on the
[website launch page](https://cockroachcrawler.com/launch/).

## Development and release verification

```bash
npm ci --ignore-scripts
npm test
npm run test:types
npm run bench
npm run audit:licenses
npm run worker:check
npm run worker:types
npx playwright install chromium
npm run test:browser
npm audit --omit=dev --audit-level=high
npm pack --dry-run --json --ignore-scripts
```

The normal suite covers adversarial SSRF (including Azure's host-platform address), IPv4/IPv6/provider endpoints, mixed DNS, pinned redirects, robots failure modes, sitemap origin policy, exact budgets and callback deadlines, unknown-key/prototype/accessor resistance, immutable agent policy, literal-only agent filters, CLI behavior, and packed external TypeScript consumption. The real Chromium suite verifies rendering/clicks, pinned proxying, redirect cookies and provenance, sensitive subresource/redirect denial, close-time request races, popup first requests, robots on subresources, decoded-byte and duration limits, WebSocket blocking, WebRTC/STUN blocking, and denial of state-changing methods.

See [docs/RELEASE.md](./docs/RELEASE.md) for the complete release gate.

## License

MIT
