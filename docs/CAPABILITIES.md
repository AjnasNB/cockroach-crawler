# Capability contract

Cockroach Crawler is a local, evidence-first crawler and read-only source
router for agents. Its differentiator is not an unlimited scrape claim. It is
that every fetch, redirect, provider choice, browser request, output record,
and optional authority tier keeps a reviewable boundary.

This document separates stable `0.4.x` behavior, optional adapters, planned
work, and deliberate exclusions. A capability
becomes a release claim only after its code, tests, package artifact, public
types, and documentation ship together.

## Public-web crawl

| Capability | Status | Contract |
| --- | --- | --- |
| Static HTTP(S) crawl | Stable `0.4.x` | Same-origin by default, public network by default, robots enforced, manual validated redirects |
| Sitemap discovery | Stable `0.4.x` | Bounded robots-declared or conventional sitemap traversal with origin and URL policy |
| Markdown, text, links, JSON, JSONL | Stable `0.4.x` | Cleaned readable page records with hashes and retrieval metadata |
| Compact site map | Stable `0.4.x` | `mapSite` / `--map` returns fetch-validated URL metadata without page bodies |
| Deterministic CSS extraction | Stable `0.4.x` | Text, cleaned inner HTML, or attributes with independent output ceilings |
| JavaScript rendering | Stable `0.4.x`, optional | Playwright peer dependency behind the crawler's deny-by-default request proxy |
| Deep crawl | Stable `0.4.x` | BFS, DFS, best-first, and adaptive queue order under fixed depth, page, request, origin, and filter limits |
| Adaptive or relevance-driven crawl | Stable `0.4.x` | A bounded scorer prioritizes already-admitted URLs and cannot expand creator-owned network or resource authority |
| Persistent crawl cache | Stable `0.4.x` | Explicit namespace, policy-bearing input key, expiry, content digest, entry, and byte limits |
| PDF document parsing | Stable `0.4.x` | Explicit local bytes, signature check, byte/page/text ceilings, no URL fetch or embedded-script execution |
| Browser screenshots and PDF | Stable `0.4.x` | Explicit artifact directory, byte limit, media type, and SHA-256 |
| Shadow DOM, iframe, and virtual scroll | Stable `0.4.x` | Open/readable DOM only, bounded cloning and scroll work |
| Docker API, playground, and MCP | Stable `0.4.x` | Deployment-owned origins and budgets; caller input can only narrow |

`mapSite` is deliberately a fetch-validated map. Entries identify pages that
passed transport and content policy; it does not claim the completeness of a
search-engine index.

## Structured extraction

The stable package supports:

- CSS selectors for visible text, cleaned inner HTML, or a named attribute;
- single or multiple values;
- relative HTTP(S) URL resolution for attribute fields;
- input-character, field-count, item-count, per-value-length, total-value, and
  total-character ceilings;
- deterministic truncation warnings;
- rejection of unknown options, getters/setters, inherited options,
  prototype-sensitive field names, invalid selectors, and incompatible
  attribute settings;
- identical extraction through `extractStructured`, the crawl `extract`
  option, and CLI `--extract`.

CSS and XPath extraction do not run JavaScript from the extraction schema.
Stable `0.4.x` also exposes a host-supplied model adapter with bounded
input/output and mandatory JSON Schema validation so model identity, data
disclosure, cost, credentials, and retry policy remain explicit.

HTML field values are untrusted markup, not sanitized application UI. Do not
insert them into a browser DOM.

## Provider reach

| Surface | Public/no-key route | Optional authority | Boundary |
| --- | --- | --- | --- |
| Public web | Hardened local HTTP(S) crawler | Explicit private/loopback opt-in or browser mode | No login, paywall, CAPTCHA, or access-control bypass |
| GitHub | Public REST read/search | Operator token for documented rate limits | Read only |
| YouTube | Public metadata plus reviewed pinned no-key route | Official API key for official search | No universal transcript claim |
| X and Reddit | No official credential-free API route | Official credentials or separately installed operator session route | Fixed read commands; no cookie extraction or writes |
| Facebook, Instagram, LinkedIn, Xiaohongshu | None in core | Separately installed operator session route | Fixed read commands; dry-run setup by default |

Run both doctors in the actual deployment:

```bash
npx cockroach-sources doctor --json
npx cockroach-reach doctor --json
```

No provider is silently substituted after authentication failure, malformed
data, or an unexpected runtime error.

## Runtime tiers

| Tier | Best fit | Security boundary |
| --- | --- | --- |
| Hardened Node crawler | Model-selected public URLs, CI, local research, indexing | DNS classification and pinning, manual redirects, robots, strict budgets |
| Restricted self-hosted Worker | Small crawls of deployment-owned fixed HTTPS origins | Bearer auth, deployment rate limit, configured origin allowlist, hard small budgets |
| Browser rendering | Authorized JavaScript pages where static HTTP is insufficient | Crawler-routed GET/HEAD requests plus required process/container isolation |
| Browser host contract | Maqam-governed structural actions | Host-injected runtime, opaque targets, revisions, preview/apply phases |

The Worker tier has no DNS resolution or address pinning and must not be
presented as equivalent to the Node transport.

## Platform-scale work

These are not core-package claims:

- distributed durable job queues, job cancellation, and crash recovery;
- bundled or hosted proxy pools, residential routing, or geo-routing (an
  operator may compose explicit provider transports locally);
- multi-tenant billing, quotas, and API-key management;
- hosted search-engine aggregation;
- webhook delivery and replay infrastructure;
- persistent remote browser sessions and live-view streaming;
- bundled models or autonomous research agents;
- universal provider access.

They can be built as services around the package. Keeping them outside core
lets a local install remain small, auditable, self-hostable, and free of
implicit third-party data disclosure.

## Deliberate exclusions

Cockroach Crawler will not add:

- CAPTCHA, paywall, authentication, authorization, or robots bypass;
- hidden cookie/profile extraction or silent credential reuse;
- social posting, liking, following, messaging, deleting, or purchasing;
- stealth fingerprints advertised as access-control evasion;
- arbitrary model-generated shell commands;
- a claim that browser request control is an operating-system sandbox.

## Definition of done for a new capability

1. The public contract names inputs, outputs, errors, and authority.
2. Runtime validation fails closed and is stronger than schema metadata alone.
3. Resource growth has explicit independent ceilings.
4. Adversarial tests cover malformed objects, redirects, network scope, and
   cancellation where applicable.
5. Strict packed-consumer TypeScript compilation passes.
6. Security, browser, Worker, license, audit, and tarball gates pass as
   applicable.
7. README, website, changelog, types, and release notes agree on status.
