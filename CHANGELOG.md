# Changelog

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
- Numeric library and agent options reject booleans and numeric strings instead of coercing them.

## 0.1.1 - 2026-06-27

- Hardened CLI execution and published the initial npm patch release.

## 0.1.0 - 2026-06-27

- Initial public crawler, CLI, robots, sitemap, extraction, and JSON/JSONL release.
