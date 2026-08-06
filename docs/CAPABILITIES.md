# Capability contract

Cockroach Crawler is a local, evidence-first crawler and read-only source
router for agents. Its differentiator is not an unlimited scrape claim. It is
that every fetch, redirect, provider choice, browser request, output record,
and optional authority tier keeps a reviewable boundary.

This document separates stable `0.5.x` behavior, optional adapters, planned
work, and deliberate exclusions. A capability
becomes a release claim only after its code, tests, package artifact, public
types, and documentation ship together.

## Public-web crawl

| Capability | Status | Contract |
| --- | --- | --- |
| Static HTTP(S) crawl | Stable `0.5.x` | Same-origin by default, public network by default, robots enforced, manual validated redirects |
| Sitemap discovery | Stable `0.5.x` | Bounded robots-declared or conventional sitemap traversal with origin and URL policy |
| Markdown, text, links, JSON, JSONL | Stable `0.5.x` | Cleaned readable page records with hashes and retrieval metadata |
| Compact site map and search | Stable `0.5.x` | `mapSite` / `--map` returns fetch-validated URL metadata; optional search ranks only fetched entries |
| Deterministic CSS extraction | Stable `0.5.x` | Text, cleaned inner HTML, or attributes with independent output ceilings |
| JavaScript rendering | Stable `0.5.x`, optional | Playwright peer dependency behind the crawler's deny-by-default request proxy |
| Deep crawl | Stable `0.5.x` | BFS, DFS, best-first, and adaptive queue order under fixed depth, page, request, origin, and filter limits |
| Adaptive or relevance-driven crawl | Stable `0.5.x` | A bounded scorer prioritizes already-admitted URLs and cannot expand creator-owned network or resource authority |
| Persistent crawl cache | Stable `0.5.x` | Explicit namespace, policy-bearing input key, expiry, content digest, entry, and byte limits |
| PDF document parsing | Stable `0.5.x` | Explicit local bytes, signature check, byte/page/text ceilings, no URL fetch or embedded-script execution |
| Browser screenshots and PDF | Stable `0.5.x` | Explicit artifact directory, byte limit, media type, and SHA-256 |
| Shadow DOM, iframe, and virtual scroll | Stable `0.5.x` | Open/readable DOM only, bounded cloning and scroll work |
| Docker API, playground, and MCP | Stable `0.5.x` | Deployment-owned origins and budgets; caller input can only narrow |
| Named request identity profiles | Stable `0.6.x` | Coherent declared user agent, client hints, locale, and viewport across HTTP and browser tiers |
| Access-challenge detection | Stable `0.6.x` | Vendor and kind reported as a first-class outcome; deny-by-default policy |

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
- XPath extraction from inactive markup through `cockroach-crawler/extractors`;
- restricted regex extraction with bounded input, fields, matches, values, and
  output, rejecting backreferences, lookarounds, and nested repetition;
- optional host-supplied model extraction with mandatory JSON Schema
  validation.

Stable `0.6.x` adds a document selection API through
`cockroach-crawler/parser`: CSS with `::text` and `::attr()` pseudo-elements,
XPath that resolves back to live nodes, attribute and text search, structural
navigation, similarity ranking, and generated CSS/XPath paths for any element.

It also adds adaptive element relocation through `cockroach-crawler/adaptive`.
A selection is fingerprinted by tag family, identity attributes, class set,
text, ancestor chain, and sibling structure. When a stored selector stops
matching, the fingerprint is scored against the new document and the element is
recovered if it clears an explicit threshold. Relocation abstains rather than
guessing: below threshold it reports a miss and returns no element. Every
weight, threshold, and node ceiling is caller-visible.

Export helpers in `cockroach-crawler/exporters` emit CSV, XML, JSON, and JSONL
under column, row, and value ceilings. CSV neutralises spreadsheet formula
injection by default; XML validates element names and strips control
characters.

CSS, XPath, and regex extraction do not run JavaScript from the extraction schema.
Stable `0.5.x` also exposes a host-supplied model adapter with bounded
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

- distributed durable job queues, crash recovery, or multi-process leases (the
  Node API includes a bounded process-local queue with status and
  cancellation);
- bundled proxy pools, residential routing, or geo-routing (an operator may
  compose explicit transports or the fixed self-hosted proxy-gateway adapter);
- multi-tenant billing, quotas, and API-key management;
- hosted search-engine aggregation;
- webhook delivery and replay infrastructure;
- persistent remote browser sessions and live-view streaming;
- bundled models or autonomous research agents;
- universal provider access.

They can be built as services around the package. Keeping them outside core
lets a local install remain small, auditable, self-hostable, and free of
implicit third-party data disclosure.

## Request identity

Stable `0.6.x` ships named identity profiles so a crawl presents one coherent,
declared browser identity instead of a mismatched default. A profile fixes the
user agent, client hints, `Accept-Language`, viewport, platform, locale, and
timezone together, and the same profile drives both the HTTP and browser tiers.

This exists because an incoherent identity is a correctness problem: many sites
serve degraded markup, or refuse service outright, to a client whose headers do
not describe any real browser. Declaring a consistent identity is not the same
as concealing one. Profiles are named, inspectable, and version-pinned in the
package; none of them impersonate a specific person, session, or account.

## Access challenges

A challenge page is an access-control decision by the site operator. The
crawler treats one as a first-class outcome rather than as page content, so a
challenge never silently becomes a "successful" empty extraction.

| Mode | Behaviour |
| --- | --- |
| `deny` (default) | Detect the challenge and fail with `ChallengeError` |
| `report` | Return the challenge report so the caller can decide |
| `operator` | Delegate to an operator-supplied handler under explicit authority |

`operator` mode is the governed path for the case where the crawl is
authorized but an over-broad protection rule blocks it anyway. It fails closed
and requires all of: an explicit `authorization` statement naming the
operator's right to access the target, a non-empty `allowOrigins` list, and a
caller-supplied handler. A challenge outside `allowOrigins` is refused even
when a valid handler is present. The handler is where an operator supplies
authority they already hold — a WAF allowlist entry, an issued clearance
token, a contract-backed credential, or a human who answered the challenge in
an attended browser session.

The package ships no solver. Resolution authority comes from the operator, is
recorded in the policy, and is auditable after the fact.

## Deliberate exclusions

Cockroach Crawler will not add:

- a bundled CAPTCHA, Turnstile, or anti-bot solver, or any dependency on a
  third-party solving service;
- paywall, authentication, authorization, or robots bypass;
- hidden cookie/profile extraction or silent credential reuse;
- identity profiles that impersonate a named individual, session, or account;
- social posting, liking, following, messaging, deleting, or purchasing;
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
