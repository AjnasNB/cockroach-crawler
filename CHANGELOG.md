# Changelog

## Unreleased

### Added

- Added `mapSite(options)` and CLI `--map` for compact, fetch-validated URL
  inventories that retain hashes, discovery metadata, failures, and crawl
  statistics without returning page bodies.
- Added `extractStructured(html, url, options)`, the crawl-level `extract`
  option, and CLI `--extract <json-file>` for deterministic CSS text, HTML, and
  attribute extraction.
- Added strict field, item, value, total-value, and total-character ceilings,
  URL resolution, truncation warnings, and TypeScript declarations for
  structured extraction.

### Security

- Structured extraction rejects accessors, inherited or unknown options,
  prototype-sensitive field names, invalid selectors, and incompatible field
  settings before crawl dispatch.
- Map and extraction operations retain the crawler's robots, origin, redirect,
  DNS, sensitive-path, request, byte, queue, and duration boundaries.

## 0.3.0 - 2026-07-21

### Added

- Promoted the capability-aware source registry, ordered source routing, optional read-only reach providers, governed browser-host contract, normalized source records, and restricted self-hosted Worker profile to the stable package line.
- Added maintained Node.js 22, 24, and 26 support across the stable CI and package contract.

### Security

- Preserved explicit provider selection, typed capability/error reporting, bounded fallback rules, creator-owned crawl budgets, DNS-pinned local requests, exact Maqam-shaped browser authority, and fail-closed handling for indeterminate mutations.
- Kept optional external commands behind fixed read-only command maps, reduced environments, output/deadline bounds, explicit installation, and no-shell execution.
- Kept the Worker as a separately documented allowlist-first transport without local DNS pinning, browser mode, social providers, or arbitrary-origin claims.

## 0.3.0-alpha.3 - 2026-07-21

### Added

- Added `cockroach-crawler/source-router` for named read/search capabilities backed by ordered built-in or host-supplied providers.
- Added route-level doctor output, selected-provider reporting, bounded attempt diagnostics, strict TypeScript declarations, and packed-consumer coverage.
- Added `cockroach-crawler/external-sources` with fixed read-only OpenCLI mappings for X, Reddit, Facebook, Instagram, LinkedIn, and Xiaohongshu, plus hardened no-key YouTube search/read through `yt-dlp`.
- Added the `cockroach-reach` doctor and pinned setup/update planner. Plans are dry-run by default and require explicit `--apply`; browser extension and alternative LinkedIn MCP setup remain manual.
- Added `cockroach-crawler/browser-host`, a Maqam-compatible stateful structural host with opaque element IDs, monotonic revisions, post-approval value resolution, operation deduplication, and honest runtime capability reporting.

### Security

- Provider changes occur before dispatch when a capability is unavailable, or after dispatch only for an exact error code declared by the route creator.
- Cancellation, authentication, invalid-response, oversized-response, and timeout failures cannot be configured as fallbacks.
- Router configuration rejects inherited options, accessors, symbols, sparse arrays, duplicate providers, duplicate error codes, and unknown fields.
- External commands use `execFile` with `shell: false`, fixed command maps, reduced environments, abort/deadline/output bounds, no cookie/profile file import, and no exposed social write operations. Bilibili is excluded.
- The YouTube executable path disables configuration, plugins, remote components, cookies, cache, watched-state changes, media downloads, and unbounded output before dispatch.
- Browser mutations require Maqam-shaped execution authority, exact origin scope, consumed apply/submit approval, live revision and role compatibility, and all-false prohibited-effect attestation. Indeterminate post-dispatch failures remain bound to their operation ID and cannot be retried silently.

## 0.3.0-alpha.2 - 2026-07-20

### Changed

- Replaced the end-of-life Node 20 baseline with explicit support and CI coverage for maintained Node 22 LTS, Node 24 LTS, and Node 26 Current release lines.
- Hardened successful provider-response validation so malformed JSON and incompatible payload shapes fail explicitly instead of being normalized as empty results.
- Hardened Cloudflare Worker release checks and npm package metadata, and refreshed the development-only AJV lockfile entry.

## 0.3.0-alpha.1 - 2026-07-18

### Added

- A read-only `cockroach-crawler/sources` registry with immutable capability diagnostics and normalized evidence records.
- Offline-tested GitHub public/token REST, YouTube oEmbed/Data API, X API v2 bearer, Reddit application-only OAuth, and hardened web-crawler adapters.
- The `cockroach-sources` CLI with `doctor`, `search`, and `read` commands. Credentials are environment-only and never accepted as CLI flags.
- Content hashes, adapter versions, warnings, authentication state, and retrieval provenance on normalized source records.
- A separate `cockroach-crawler/serverless` entry point and Cloudflare Worker template for small, bearer-authenticated, rate-limited crawls of deployment-owned allowlisted HTTPS origins.
- Worker dry-run bundling and generated-binding type checks through Wrangler.
- A versioned JSON Schema for normalized source records and deterministic fixtures for web, GitHub, YouTube, X, and Reddit.
- A reusable offline `SourceProvider` conformance harness for third-party adapters.
- Explicit text labels for every doctor state, including predictable `NO_COLOR` and JSON behavior.

### Security

- Provider options reject inherited authority, accessors, symbols, unknown keys, control characters, and unsafe result limits.
- Social providers use documented official API paths and never extract browser cookies or silently fall back to session scraping.
- Credential values are held in provider closures and excluded from records, doctor output, and typed error details.
- Serverless requests require an explicit HTTPS origin allowlist and bearer secret; IP literals, localhost, URL credentials, non-HTTPS targets, and cross-origin redirects are denied.
- Serverless robots failures fail closed and page/request/redirect/byte/depth/time ceilings are enforced.
- The deployment template requires Cloudflare's Rate Limiting binding and reports the absence of rate limiting as unavailable rather than serving a crawl.
- Provider error contracts now distinguish authentication, quota/access, missing-resource, malformed-payload, timeout, cancellation, and response-size failures without serializing credentials.
- A serverless threat-model draft documents DNS/runtime assumptions, abuse cases, observability, rollback, and residual risks pending independent review.

### Known alpha limits

- YouTube transcript retrieval is not implemented; the capability is reported as false.
- X and Reddit require operator-owned approved credentials. No cookie or unofficial API adapter is bundled.
- The Worker is a self-host template, not a hosted arbitrary-origin API, and it cannot provide the local CLI's DNS pinning or Playwright boundary.
- Distributed jobs, proxy rotation, CSS/XPath schemas, PDF/media extraction, and competitor API compatibility remain roadmap work.

## 0.2.0 - 2026-07-15

### Added

- Optional Chromium rendering through Playwright, including bounded waits and explicit clicks.
- A strict `cockroach-crawler/agent` adapter with creator-owned limits and browser opt-in.
- Public TypeScript declarations for the root and agent entry points, verified from a packed external consumer.
- Content hashes, redirect provenance, detailed failures, request/byte statistics, AbortSignal support, and bounded retry controls.
- Security policy, release checklist, pinned-action CI for Node 20.18.1/22/24, and a real Chromium integration job.
- Original-code provenance notes and an automated direct-dependency license audit.

### Security

- Public-network-only default with IPv4/IPv6, IPv4-mapped, DNS, metadata, credential, and unsafe-scheme validation.
- Unconditional denial of known provider-local platform endpoints, including Azure WireServer at `168.63.129.16`, across literals, alternate IPv4 forms, mapped IPv6, and DNS aliases.
- DNS-pinned Undici requests and manually validated redirect hops for the non-browser transport.
- Consistent URL/origin policy for seeds, links, robots, sitemaps, and redirects.
- Recursively decoded sensitive-path policy on robots and sitemap documents and every redirect hop, enforced before target contact.
- Robots failures fail closed except true absence (`404`/`410`).
- Exact, bounded seed/request/queue/link/sitemap/URL/page/byte/concurrency/time budgets.
- Context-wide browser proxying through the DNS-validated, address-pinned Undici transport for navigations, redirects, subresources, frames, and popup first requests.
- Browser sensitive-path/exclusion enforcement on subresources and redirect targets, redirect-cookie synchronization with target-origin recomputation, a conservative host-only/unpartitioned cookie bridge with raw attribute and prefix validation, native-parity host/path/Secure/expiry/SameSite checks, opaque-sandbox and credentials fail-closed behavior, accurate final-navigation provenance, and fail-closed session draining.
- Browser denial of WebSockets, WebRTC/STUN, WebTransport, workers, beacons, and state-changing HTTP methods, backed by a local deny-by-default egress sink.
- Exact decoded browser-response accounting and deadline-aware cancellation for requests, actions, selectors, and explicit waits.
- Total-deadline enforcement for asynchronous callbacks and browser finalization.
- Null-prototype option snapshots that reject inherited authority, accessors, non-enumerable fields, symbols, and every unknown own key in direct library and agent-tool input.
- Strict agent input validation, immutable trusted-policy snapshots, non-overridable safety defaults, and literal-only agent filters.

### Changed

- `--allow-sensitive-paths` accurately names the path heuristic formerly exposed as `--allow-non-public` (the older flag remains an undocumented compatibility alias).
- Cross-origin crawling now requires one or more explicit `--allow-origin` entries.
- Node.js support is declared as `>=20.18.1`, matching the installed dependency floor.
- Browser mode requires Playwright `>=1.48.0 <2`, and release/prepublish gates now run the real Chromium suite.
- Chromium process startup uses the total crawl deadline while network and page operations retain the configured per-request timeout, avoiding false startup failures with strict request budgets.
- Numeric library and agent options reject booleans and numeric strings instead of coercing them.

## 0.1.1 - 2026-06-27

- Hardened CLI execution and published the initial npm patch release.

## 0.1.0 - 2026-06-27

- Initial public crawler, CLI, robots, sitemap, extraction, and JSON/JSONL release.
