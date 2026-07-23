# Cockroach Crawler Feature Inventory

This is the source-backed inventory for the `feature/bounded-map-extraction`
branch that is proposed for the next release. Stable npm remains `0.3.0` until
the reviewed branch is merged and a new immutable artifact is published.

Status terms:

- **Stable 0.3.0** means the feature exists in the current npm package.
- **Next release** means the implementation, public types, tests, and docs exist
  on the reviewed source branch but are not in npm `0.3.0`.
- **Optional** means the feature requires an explicitly installed peer,
  credential, executable, browser session, or deployment component.
- **Not implemented** means Cockroach Crawler must not advertise the feature.

## Installation and integration surfaces

- ESM npm package with maintained Node.js 22, 24, and 26 support.
- Strict public TypeScript declarations and a packed-consumer compile gate.
- Programmatic root API: `crawl`, `crawlDetailed`, `mapSite`,
  `discoverSitemapUrls`, `extractPage`, `extractStructured`, `normalizeUrl`,
  `classifyIpAddress`, `isPublicIpAddress`, and `resolveUrlTarget`.
- Agent-tool API: `cockroachCrawlerToolSchema`,
  `createCockroachCrawlerTool`, and `runCockroachCrawlerTool`.
- Source APIs: `createSourceRegistry`, `createSourceRegistryFromEnv`,
  `createSourceRouter`, custom provider contracts, and provider conformance.
- Optional reach APIs: fixed external read providers, a bounded process runner,
  dry-run setup/update plans, and provider health reports.
- Maqam-compatible browser-host API with an injected runtime.
- Restricted serverless crawler API and a checked-in Cloudflare Worker entry
  point.
- Four CLIs: `cockroach-crawl`, `cockroach-crawler`,
  `cockroach-sources`, and `cockroach-reach`.
- Machine-readable source record JSON Schema.
- MIT-licensed core package with direct dependency license auditing.

## Public-web crawl and discovery

- Multiple seed URLs and seed loading from a text file.
- Static HTTP and HTTPS crawling.
- Breadth-first link traversal with a creator-owned maximum depth.
- Same-origin traversal by default.
- Explicit cross-origin mode limited to a normalized origin allowlist.
- Include and exclude URL filters.
- Literal, escaped include/exclude fragments in the agent adapter so model input
  cannot introduce executable regular expressions.
- Sensitive-path rejection for likely login, account, checkout, cart, admin,
  and similar routes, with a trusted operator override.
- Robots.txt retrieval and enforcement by default.
- Fail-closed robots behavior for server and transport failures.
- Sitemap discovery from robots declarations and conventional sitemap paths.
- Nested sitemap-index traversal.
- Sitemap document, URL count, origin, include, exclude, sensitive-path, and
  request limits.
- Manual redirect following with validation before every destination request.
- Redirect provenance for every hop.
- Redirect-loop and maximum-redirect protection.
- URL normalization and deduplication.
- Exact page and request ceilings under concurrency.
- Per-origin politeness delay.
- Request timeout, total crawl deadline, and cooperative `AbortSignal`
  cancellation.
- Bounded page, queue, seed, link, URL length, callback, retry, sitemap, and
  decoded-byte growth.
- Async `onPage` and `onError` callbacks with detached, frozen records and
  deadline enforcement.
- **Next release:** fetch-validated compact site maps through `mapSite()` and
  CLI `--map`.

## Page extraction and output

- Clean readable text.
- Markdown generated from the cleaned document.
- Page title, meta description, first H1, language, canonical URL, and links.
- HTTP status, content type, decoded byte count, ETag, and Last-Modified.
- Fetch timestamp.
- SHA-256 content hash.
- Crawl depth and discovery parent.
- Redirect chain.
- Robots decision.
- Structured failures with URL, phase, code, and bounded message.
- Aggregate stats for fetched pages, requests, bytes, retries, filters,
  robots, origin/public-network skips, queue drops, failures, duration, queue,
  and seen URLs.
- JSON output.
- JSON Lines output.
- Atomic file output to explicit nested paths.
- **Next release:** deterministic CSS extraction from visible text, cleaned
  inner HTML, or a named attribute.
- **Next release:** single and multiple extraction values.
- **Next release:** per-field item limits.
- **Next release:** relative HTTP(S) URL resolution for attribute values.
- **Next release:** independent maximum field, input-character, item,
  per-value, total-value, and total-character limits.
- **Next release:** deterministic extraction truncation warnings.
- **Next release:** extraction through `extractStructured`, crawl option
  `extract`, agent creator defaults, and CLI `--extract`.
- **Next release:** rejection of unknown/inherited options, accessors,
  prototype-sensitive field names, invalid selectors, invalid attributes,
  active content, and incompatible settings before crawl dispatch.

Cleaned HTML extraction remains untrusted markup. It is not safe to insert
directly into an application DOM.

## Network and SSRF boundary

- HTTP(S)-only URL policy.
- Rejection of URL credentials.
- Rejection of malformed, oversized, alternate-form, and unsafe-scheme URLs.
- IPv4 and IPv6 classification.
- Rejection of loopback, private, link-local, multicast, unspecified,
  documentation, benchmark, carrier-grade NAT, and cloud metadata ranges by
  default.
- Rejection of IPv4-mapped private addresses.
- Rejection of mixed public/private DNS answers.
- DNS resolution that cooperates with cancellation.
- DNS pinning for the non-browser transport.
- Fresh destination validation and pinning for every redirect hop.
- Explicit trusted private-network opt-in.
- Metadata, link-local, multicast, and unspecified destinations remain blocked
  even with private-network opt-in.
- Creator-owned origin policy snapshotted before model input runs.
- Unknown security options, inherited authority, and accessors fail closed.
- Exact decoded-byte accounting and response-stream termination.
- No CAPTCHA, paywall, authentication, authorization, or robots bypass.
- No hidden browser-profile or cookie extraction.

## Optional Playwright browser rendering

- JavaScript-rendered page extraction through an optional Playwright peer.
- Headless or visible browser selection.
- Chromium channel or explicit executable selection.
- `load`, `domcontentloaded`, `networkidle`, and `commit` wait states.
- Bounded selector wait or millisecond wait.
- Explicit bounded click sequence.
- Operator-provided storage state loading and optional storage state saving.
- Main-frame and subresource requests routed through the crawler boundary.
- Validation before redirect and resource dispatch.
- Request, byte, redirect, origin, sensitive-path, robots, and total deadline
  enforcement in browser mode.
- GET/HEAD-only network policy; state-changing browser HTTP methods are blocked.
- WebSocket handshakes blocked.
- WebRTC disabled before STUN traffic.
- Cross-origin subrequests blocked unless creator-authorized.
- Cookie behavior tested across redirects, paths, frames, secure contexts,
  sibling subdomains, opaque sandboxed frames, and expiry.
- Browser-session completion waits for late blocked requests and fails closed.

Browser mode is not an operating-system sandbox. Untrusted targets still need
process, container, or virtual-machine isolation.

## Built-in read-only source registry

- Provider doctor with `ready`, `partial`, `missing_credentials`, and
  `unavailable` states.
- Public web reads through the hardened crawler.
- Public GitHub repository and issue search through REST.
- Public GitHub repository reads.
- Optional GitHub token from `GITHUB_TOKEN` or `GH_TOKEN`.
- Public YouTube metadata reads without a developer key through oEmbed.
- Official YouTube search and keyed reads when `YOUTUBE_API_KEY` is supplied.
- Official X post reads through a bearer token.
- Reddit application-only OAuth search/read with client id, client secret, and
  a contact-aware user agent.
- Credentials accepted only from configuration/environment, never CLI flags.
- Provider-specific response byte limits, timeouts, cancellation, HTTP error
  classification, payload validation, and secret-safe errors.
- Normalized source records with source id, item id, type, title, URL, text,
  author, publication time, SHA-256 content hash, adapter version, warnings,
  metadata, retrieval time, method, authentication state, and credential-use
  state.
- JSON and JSONL source CLI output.

## Provider routing and plug-in contracts

- Custom read-only `SourceProvider` registration.
- Capability-based provider selection.
- Deterministic provider priority.
- Unavailable providers skipped before dispatch.
- Runtime fallback only for explicitly allowed unavailable/error classes.
- Authentication, authorization, malformed output, policy, robots, security,
  and unexpected failures never silently widen to another authority.
- Bounded fallback-attempt diagnostics.
- Duplicate provider and malformed route rejection.
- Reusable provider conformance harness.
- JSON Schema validation for normalized source fixtures.
- Source schema and TypeScript declarations checked for alignment.

This is the package's plug-in surface: applications can add or replace a
provider without weakening the crawler's core transport or pretending that a
third-party service is built into the package.

## Optional Agent-Reach-style channel layer

- `cockroach-reach doctor` for deployed capability checks.
- Dry-run setup and update plans by default.
- Explicit `--apply` for reviewed, pinned commands only.
- Allowlisted command execution without a shell.
- Process timeout and output ceilings.
- No browser cookie/profile file reading by Cockroach Crawler.
- No social write commands.
- No implicit installation of system software.
- No-key YouTube search and reads through a separately installed `yt-dlp`.
- Fixed read-only OpenCLI mappings for X, Reddit, Facebook, Instagram, and
  Xiaohongshu.
- Exact public-profile URL validation for LinkedIn.
- Manual LinkedIn MCP alternative with an explicit boundary.
- Bilibili intentionally excluded from the current reviewed channel catalog.

Session-backed routes are optional operator authority. They are not anonymous
web access and are never automatic fallbacks after an official API failure.

## Maqam-compatible structural browser host

- Injected browser runtime rather than a falsely bundled executor.
- Trusted session open/list/close lifecycle.
- Origin allowlist fixed when a session opens.
- Opaque session, page, element, and revision identities.
- Structural observations of supported interactive roles and bounded states.
- Stale target and document revision rejection.
- Preview phase for apply and submit plans.
- Apply operations: set a value reference, select an option, and set checked.
- Submit operations: activate, submit form, and navigate.
- Value references resolved only after approval.
- Exact plan hash/token verification supplied by the governance layer.
- Expected-origin and new-page binding.
- Operation-id deduplication, including indeterminate submit outcomes.
- Re-observation after mutation.
- Required all-false attestation for external protocol, download, filesystem,
  file picker, clipboard, permission prompt, print, and modal effects.
- Independent session, page, element, text, and value limits.
- Capability report that truthfully says Playwright and pinned interactive
  networking are not bundled by this host contract.

## Restricted serverless Worker tier

- Fixed deployment-owned HTTPS origin allowlist.
- Bearer-token authentication.
- Deployment rate-limit binding.
- POST-only JSON crawl endpoint.
- Request-body stream and serialized-output ceilings.
- Small page, request, byte, redirect, delay, and total duration limits.
- Redirect destination and robots re-checks.
- Origin escape blocked before target contact.
- Sensitive-path and oversized-response rejection.
- Structured validation errors.
- Checked-in Worker configuration with no crawlable origin by default.

The Worker runtime does not provide Node DNS classification or pinning, browser
rendering, authenticated providers, session-backed social reads, or arbitrary
request-selected origins.

## Verification and supply-chain features

- 173 core, source, security, Worker, browser-host, CLI, and release tests on
  the proposed branch.
- 26 real Chromium integration tests.
- Node 22, 24, and 26 CI.
- Packed JavaScript and strict TypeScript consumer tests.
- Project-local loopback performance/correctness benchmark.
- Direct dependency license audit.
- Runtime vulnerability audit.
- CodeQL.
- Worker type generation and deployment dry-run.
- npm tarball dry-run.
- Exact release asset checksum tests.
- Trusted npm publishing workflow bound to the reviewed commit, tarball size,
  SHA-256, and npm SHA-512 integrity.

## What the latest branch adds

1. `mapSite()` and CLI `--map`.
2. `extractStructured()`, crawl-level extraction, CLI `--extract`, and
   creator-owned agent extraction.
3. Complete public TypeScript contracts for mapping and extraction.
4. Adversarial extraction and packed-consumer tests.
5. A map-and-extract website guide.
6. A benefit-first npm README without the oversized hero image.
7. Search-oriented package metadata.
8. Site-wide canonical, robots, Open Graph, Twitter, and JSON-LD metadata.
9. Updated sitemap and `llms.txt`.
10. A dated, factual comparison page for Cockroach Crawler, Firecrawl, and
    Crawl4AI.
11. Website regression checks for metadata, README drift, responsive layout,
    accessibility, internal links, and browser errors.
12. A Sharp 0.35 development override that resolves the known libvips
    vulnerability on the proposed branch.

## Crawl4AI parity matrix

The correct release claim is not "Crawl4AI rewritten in JavaScript." The
products overlap, but their complete surfaces are different.

| Capability family | Cockroach Crawler | Crawl4AI 0.9.x |
| --- | --- | --- |
| Static and JavaScript crawling | Implemented | Implemented |
| Breadth-first deep crawl | Implemented | Implemented |
| DFS and relevance/adaptive strategies | Not implemented | Implemented |
| Fetch-validated site map | Next release | Domain mapping implemented |
| Deterministic CSS extraction | Next release | Implemented, including wider CSS/XPath strategies |
| LLM extraction and schema generation | Not implemented in core | Implemented as optional model-backed strategies |
| Markdown | Implemented | Implemented with additional fit/BM25/citation strategies |
| Screenshots and PDF generation/parsing | Not implemented | Implemented |
| Shadow DOM and iframe flattening | Not implemented | Implemented |
| Infinite-scroll and virtual-scroll helpers | Not implemented | Implemented |
| Hooks and arbitrary page JavaScript | Deliberately not exposed in core | Implemented |
| Persistent crawl cache | Not implemented | Implemented |
| Proxy rotation and anti-bot escalation | Deliberately not implemented | Implemented |
| Session/browser profile features | Explicit storage state only | Wider session and managed-browser surface |
| Docker API, dashboard, playground, JWT, MCP | Not implemented | Implemented |
| Public source/social provider routing | Implemented | Not the primary product surface |
| DNS classification and pinning | Implemented in Node transport | Different transport boundary |
| Exact redirect/origin/resource evidence | Implemented | Different evidence model |
| Maqam exact one-use human approval composition | Implemented as a separate governed layer | Not the primary product surface |
| npm/TypeScript-native integration | Implemented | Python package and service APIs |

For adaptive crawling, caching, screenshots/PDF, Shadow DOM, iframe flattening,
virtual scroll, proxy escalation, Docker API/MCP, and optional model extraction,
use a separate reviewed implementation or contribute a bounded module. Do not
claim those features before code, tests, public types, docs, and a published
artifact exist.
