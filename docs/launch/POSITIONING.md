# Positioning and message guide

## Plain-language explanation

An agent can decide *what* it wants to read, but somebody still has to control *where the request goes, how far the crawl expands, how much data it can consume, and what happens when a site's rules cannot be checked*. Cockroach Crawler is that controlled reading layer.

It is not an agent framework. It does not choose goals, call a model, or take actions on social accounts. It accepts an explicit read request, applies creator-owned network and resource limits, returns normalized records, and exposes provenance such as the source URL, retrieval time, adapter version, and content hash.

## Message hierarchy

### Primary promise

Give an agent a bounded way to read public sources without handing model input an unrestricted browser or network client.

### Proof points

- Explicit web destinations and provider capabilities that are visible before a workflow runs.
- Public-network checks and DNS-pinned hops in the hardened local crawler.
- Robots, redirect, sensitive-path, request, byte, page, depth, queue, concurrency, and deadline limits.
- Read-only official adapters for GitHub, YouTube, X, and Reddit with capability reporting.
- Immutable normalized records with content hashes and retrieval provenance.
- A smaller serverless API for operator-owned allowlisted HTTPS sites that names its weaker boundary.
- Local-first, MIT licensed, no hosted account, and no model dependency.

### Boundary statement

Cockroach Crawler does not bypass logins, paywalls, CAPTCHA, robots policy, access controls, provider approval, or API pricing. It is not a distributed crawl queue, proxy-rotation service, universal search index, credential broker, or browser sandbox.

## Two-tier selection guide

| Choose | When | Strongest property | Important limitation |
| --- | --- | --- | --- |
| Hardened local CLI/API | Model-generated URLs, local batch jobs, stronger SSRF controls, optional rendering | Complete DNS-answer validation and per-hop address pinning | You operate Node and, for browser mode, isolate Chromium |
| Serverless API | A small hosted endpoint for known documentation or owned sites | Origin allowlist plus strict page/depth/request/byte/time budgets | No DNS resolution/classification, pinning, browser, or source-provider auth; infrastructure egress policy still matters |
| Source registry | You want consistent records from explicit web URLs or official provider APIs | Capability doctor, read-only operations, provenance, content hashes | Provider credentials, quotas, terms, and endpoint coverage still apply |

## Who it is for

- Agent-tool authors who need a small crawler with creator-owned limits.
- Security-conscious Node.js teams that do not want model input to control raw `fetch` or a general browser.
- Documentation, RAG, QA, and research pipelines that need Markdown/JSONL plus source provenance.
- Self-hosters who prefer a local CLI or a narrowly allowlisted serverless endpoint.
- Open-source maintainers who want an inspectable boundary rather than a hosted black box.

## Real examples

### Documentation assistant

An internal assistant can read only `https://docs.example.com`, crawl at most 50 pages and two levels, stop after 60 seconds, and return Markdown with content hashes. It cannot silently follow a link to another origin unless that origin was explicitly allowed.

### Release research

A release-note workflow can search public GitHub repositories and issues, read known YouTube video metadata, and crawl linked public documentation. X or Reddit results appear only when the operator configured approved official credentials.

### Support-site index

A small Worker-style endpoint can expose bounded HTML extraction for the company's own support origin. The deployment token stays in the environment; requests cannot supply or override it. This is a convenience tier, not the hardened crawler's network boundary.

### Agent tool

The creator configures allowed origins and maximum pages when constructing the crawler tool. Model input may narrow those values but cannot expand them, disable robots, turn on private networks, or enable browser mode unless the creator opted in.

## FAQ

### Which sources are ready today?

Explicit public web pages and public GitHub search/read work without provider credentials. Known YouTube video metadata works without a key; YouTube search uses an API key. X search/read uses an approved bearer token, and Reddit search/read uses application OAuth. `cockroach-sources doctor` reports the exact current state for every adapter.

### Is it a search engine?

No. The web provider crawls explicit URLs. GitHub, YouTube, X, and Reddit search use their official APIs when the required access is available.

### Does it scrape social sites without credentials?

No. X requires an approved bearer token. Reddit requires application-only OAuth credentials and a contact-aware user agent. YouTube search requires an API key; only known-video oEmbed metadata is public in the no-key path.

### Why two crawler tiers?

The hardened local crawler can validate and pin DNS results before contact. A portable serverless fetch runtime generally cannot provide the same address-level control, so the serverless tier accepts only deployment-configured HTTPS origins, reports that DNS pinning is absent, and requires operator-owned/trusted hostnames plus infrastructure egress controls when internal destinations are reachable.

### Is browser mode safe for hostile pages?

It reduces network exposure with a deny-by-default proxy and strict request controls, but it is not a process or JavaScript sandbox. Untrusted browser targets still need container or process isolation and restricted host egress.

### Does it write to providers?

No. The built-in source adapters are read-only. They do not post, comment, like, follow, edit, or delete.

### Is the alpha production-ready?

No universal production claim is appropriate. `0.3.0-alpha.1` is an integration preview. Operators must review the limits, run the release checks, and test against their own deployment and threat model.

## Approved short descriptions

**20 words:** Bounded public-web crawling and official read-only source adapters for local-first Node.js agent workflows.

**40 words:** Cockroach Crawler gives Node.js agents bounded public-web reads, normalized source records, and explicit provenance. Use the hardened local crawler for stronger network controls or a smaller allowlist-first serverless tier for operator-owned HTTPS origins.

**Boilerplate:** Cockroach Crawler is an MIT-licensed Node.js crawler for agent workflows. It combines a hardened local CLI/API, a capability-aware read-only source registry, and a deliberately limited serverless crawler. It does not bypass authentication, owner policy, or provider access rules.
