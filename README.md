<p align="center">
  <img src="https://raw.githubusercontent.com/AjnasNB/cockroach-crawler/main/assets/logo.png" alt="Cockroach Crawler" width="620">
</p>

# Cockroach Crawler

Cockroach Crawler is a local Node.js crawler for public or explicitly trusted HTTP(S) pages. It produces structured JSON/JSONL with readable text, Markdown, links, response metadata, redirect provenance, and content hashes for documentation indexing, RAG ingestion, content inventory, QA, research, and agent tools.

It does not call an LLM, require a hosted account, or include stealth, CAPTCHA, paywall, authentication, or authorization bypasses.

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
| Large distributed queues, proxy rotation, or hosted extraction APIs | Use Crawlee, Scrapy, Firecrawl, Crawl4AI, or a managed crawler |
| Bypass paywalls, CAPTCHA, login walls, owner policy, or access control | Not supported |

## Install

Requires Node.js `>=20.18.1`.

```bash
npm install cockroach-crawler
```

For the CLI:

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

## Comparison

Cockroach Crawler is deliberately smaller than [Crawlee](https://github.com/apify/crawlee), [Scrapy](https://github.com/scrapy/scrapy), [Firecrawl](https://github.com/firecrawl/firecrawl), [Crawl4AI](https://github.com/unclecode/crawl4ai), and browser-agent products. Those projects are better choices for distributed persistence, proxy management, hosted APIs, broad browser automation, or advanced extraction. Cockroach Crawler focuses on a compact Node API/CLI, explicit network policy, strict budgets, agent-safe defaults, and portable JSON/Markdown records.

## Provenance and third-party licensing

Cockroach Crawler is an original MIT-licensed implementation. The maintainer records that Crawl4AI and Firecrawl were consulted only as public product references and that no source from either project was incorporated. At the dated revisions reviewed, Crawl4AI's license file contained the Apache License 2.0 text plus a project-specific mandatory-attribution section, while Firecrawl's core license was GNU AGPL v3 or later (`AGPL-3.0-or-later`). See the exact revisions and scope in [docs/PROVENANCE.md](./docs/PROVENANCE.md). This provenance record is a maintainer attestation, not independent proof or legal advice.

The resolved direct dependencies are all MIT or Apache-2.0. See [docs/DEPENDENCY_LICENSES.md](./docs/DEPENDENCY_LICENSES.md); from a source checkout, run `npm run audit:licenses` to verify the lockfile snapshot.

## Development and release verification

```bash
npm ci --ignore-scripts
npm test
npm run test:types
npm run bench
npm run audit:licenses
npx playwright install chromium
npm run test:browser
npm audit --omit=dev --audit-level=high
npm pack --dry-run --json --ignore-scripts
```

The normal suite covers adversarial SSRF (including Azure's host-platform address), IPv4/IPv6/provider endpoints, mixed DNS, pinned redirects, robots failure modes, sitemap origin policy, exact budgets and callback deadlines, unknown-key/prototype/accessor resistance, immutable agent policy, literal-only agent filters, CLI behavior, and packed external TypeScript consumption. The real Chromium suite verifies rendering/clicks, pinned proxying, redirect cookies and provenance, sensitive subresource/redirect denial, close-time request races, popup first requests, robots on subresources, decoded-byte and duration limits, WebSocket blocking, WebRTC/STUN blocking, and denial of state-changing methods.

See [docs/RELEASE.md](./docs/RELEASE.md) for the complete release gate.

## License

MIT
