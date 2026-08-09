# Changelog

## 0.6.2 - 2026-08-09

### Changed

- Refreshed the npm README so it opens with the stable crawler, rendering,
  extraction, integration, and provenance capabilities instead of a
  competitor table.
- Kept the `0.6.1` runtime, scorers, and source-pinned benchmark artifacts
  unchanged. The artifact names continue to identify the runtime that was
  actually measured.
- Added a packed-source historical verifier for the exact `v0.6.1` evidence
  inputs and a full-Git maintenance gate that binds the annotated tag, commit,
  tree, ancestry, and changed-path allowlist.
- Restricted trusted publication to manual, digest-bound dispatch from the
  protected `release/0.6.x` branch while npm `latest` remains `0.6.1`.
- Kept final npm signature verification fail-closed while retrying the bounded
  attestation-propagation window observed after a successful publication.

## 0.6.1 - 2026-08-07

### Added

- Boilerplate removal before extraction, with four presets. The default removes
  only HTML landmarks the specification already places outside main content;
  `balanced` and `aggressive` trade recall for precision.
- Content-block scoring when a page carries no `main`, `article`, or
  `[role=main]` landmark, replacing the previous whole-body fallback.
- Sentence-aware filtering that drops blocks which are both link-heavy and
  free of sentence punctuation, which is what separates a category menu from a
  paragraph that happens to cite several sources.
- A reproducible extraction comparison against trafilatura and readability-lxml
  with extraction and scoring as separate processes.

### Changed

- Default extraction output now excludes landmark boilerplate. Measured across
  all 511 pages of the pinned WCEB split, precision moves 0.7330 to 0.7938 and
  unwanted-boilerplate inclusion falls from 0.3885 to 0.1787, for 0.026 of
  recall. Set `boilerplate: "off"` to restore the previous behaviour.
- Every npm publishing path now lives in `publish-npm.yml`, the only workflow
  filename npm trusts for this package. `docs/RELEASE.md` explains why a second
  publishing workflow fails with a misleading registry 404.

## 0.6.0 - 2026-08-06

### Added

- Document selection API at `cockroach-crawler/parser`: CSS with `::text` and
  `::attr()` pseudo-elements, XPath that resolves back to live traversable
  nodes, attribute and text search, structural navigation, similarity ranking,
  and generated CSS/XPath paths.
- Adaptive element relocation at `cockroach-crawler/adaptive`. Elements are
  fingerprinted by tag family, identity attributes, class set, text, ancestor
  chain, and sibling structure, then recovered after a redesign when the score
  clears an explicit threshold. Relocation abstains below threshold instead of
  returning a best guess.
- Named request identity profiles at `cockroach-crawler/identity` covering
  Chrome, Edge, Firefox, and Safari on desktop and mobile. A profile keeps user
  agent, client hints, `Accept-Language`, viewport, platform, locale, and
  timezone coherent across the HTTP and browser tiers.
- Access-challenge detection and a deny-by-default challenge policy. A challenge
  is reported as a first-class outcome rather than treated as page content.
  `operator` mode delegates resolution to an operator-supplied handler and
  requires an explicit authorization statement plus an origin allowlist. No
  solver is bundled and no solving service is used.
- Record exporters at `cockroach-crawler/exporters` for CSV, XML, JSON, and
  JSONL under column, row, and value ceilings. CSV neutralises spreadsheet
  formula injection by default.

- Cookie-persisting sessions, an RFC 6265-style cookie jar, and proxy rotation
  at `cockroach-crawler/session`. The jar enforces Secure, host-only, Domain,
  Path, and expiry rules and serialises to JSON. `ProxyRotator` supports cycle,
  random, and sticky strategies with failure cooldowns.
- A copy-paste quickstart covering the CLI, the library, and MCP host
  configuration for Claude Code, Claude Desktop, Cursor, Windsurf, and Codex.
- Automatic npm publication when the package version changes on main, gated by
  the full release gate and an artifact digest check across jobs.

### Changed

- The capability contract now describes request identity and governed challenge
  handling. Bundled solvers, solving services, and identity profiles that
  impersonate a named individual, session, or account remain excluded.
- Public benchmark evidence regenerated for 0.6.0. Extraction and conformance
  results are byte-identical to 0.5.2 apart from the version fingerprint.
- Resolved high-severity advisories in `undici` and `fast-uri`.

## 0.5.2 - 2026-07-24

- Standardize public package, documentation, website, and launch copy on plain hyphens.
- Preserve the complete 0.5.1 runtime and security surface without behavioral changes.

## 0.5.1 - 2026-07-24

### Fixed

- Corrected the official MCP Registry identity to the case-sensitive GitHub
  namespace `io.github.AjnasNB/cockroach-crawler`.
- Replaced the runtime MCP SDK dependency with a purpose-built JSON-RPC stdio
  transport while retaining the official SDK as a development-only
  conformance client. Fresh production installs therefore do not inherit the
  affected Windows static-server dependency reported by
  `GHSA-frvp-7c67-39w9`.
- Kept the crawler, extraction, job, proxy, and network-authority contracts
  unchanged from `0.5.0`.

## 0.5.0 - 2026-07-24

### Added

- Added deterministic search and result limits to fetch-validated site maps
  across the JavaScript API, CLI, authenticated HTTP API, and native MCP tool.
- Added bounded restricted-regex extraction beside the existing CSS, XPath,
  PDF, Markdown, and host-model JSON Schema strategies.
- Added a process-local asynchronous crawl/map queue with concurrency, pending,
  retained-record, result-byte, status, cancellation, and shutdown controls.
- Added a fixed self-hosted proxy-gateway provider whose endpoint, credential,
  timeout, redirect behavior, and response ceiling remain operator owned.
- Added official MCP Registry metadata through matching npm `mcpName` and
  packaged `server.json` identities.
- Expanded the documentation portal to 50 searchable capability manuals and
  documented the dedicated map, queue, extraction, proxy, and MCP surfaces.

### Security

- Search ranks only entries already fetched under the crawler's origin, DNS,
  redirect, robots, sensitive-path, and resource policy.
- Regex extraction rejects lookarounds, backreferences, unsupported flags,
  suspicious nested repetition, and output beyond explicit ceilings.
- Agent and MCP input cannot select proxy endpoints or credentials, create
  queue authority, add origins, enable private networks, or raise host limits.
- The bundled queue is explicitly process-local and non-durable; the fixed
  gateway is an operator integration point, not a stealth or bypass network.

## 0.4.2 - 2026-07-24

- Expanded the public documentation into task-focused crawling, browser,
  extraction, MCP, Docker, and complete-reference manuals.
- Added persistent grouped documentation navigation, per-page tables of
  contents, copyable stable API examples, and mobile/desktop regression checks
  for every new route.
- Added the complete documentation map to the package README so npm users can
  move directly from installation to each stable feature surface.

## 0.4.1 - 2026-07-23

- Replaced the npm README's obsolete `0.3.0` candidate notice with the stable
  `0.4.1` install, registry-integrity command, and current capability links.
- Rebuilt the public documentation as a searchable 46-capability portal with
  runnable deep-crawl, browser, extraction, MCP, Docker, provider, and
  deployment examples.
- Updated the homepage, provider matrix, roadmap, comparison, release page,
  structured metadata, `llms.txt`, and regression checks to the stable `0.4`
  capability line.
- Kept the npm README image-free so the registry page leads with install and
  product capability instead of the obsolete oversized proof banner.

## 0.4.0 - 2026-07-23

### Added

- Added BFS, DFS, best-first, and adaptive/relevance traversal strategies under
  the existing crawl authority and resource limits.
- Added hash-verified, TTL-bounded persistent crawl caching.
- Added browser screenshots, PDF generation, PDF parsing, open Shadow DOM and
  readable iframe flattening, bounded virtual scroll, trusted page hooks, and
  explicitly authorized persistent profiles.
- Added bounded XPath extraction and optional host-supplied LLM extraction
  with mandatory JSON Schema validation.
- Added explicit provider/proxy escalation with attempt provenance and
  access-challenge detection.
- Added an authenticated Node/Docker API, responsive playground, native MCP
  tools/resource, and dedicated document, MCP, and server CLIs.
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
- Advanced browser, MCP, server, cache, extraction, and provider inputs cannot
  silently expand deployment-owned origins, credentials, private-network
  access, page hooks, profiles, or resource ceilings.
- Access challenges stop by default. The release adds no CAPTCHA, paywall,
  login, robots, or authorization bypass.

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
