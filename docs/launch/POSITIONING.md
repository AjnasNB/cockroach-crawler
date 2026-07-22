# Positioning and message guide

## Plain-language explanation

An agent needs eyes on the web, but it should not receive an unrestricted browser or raw network client. Cockroach Crawler is the controlled reading layer: the creator decides which routes exist and how much work they may perform; the agent receives normalized records with source identity and retrieval provenance.

## Primary promise

> Give your AI agent eyes on the web - without giving it the keys to your network.

## Proof points

- hardened local HTTP crawling with public-network admission and per-hop address pinning;
- robots, redirect, sensitive-path, origin, page, request, byte, depth, queue, concurrency, and deadline controls;
- public GitHub reads and explicit official-provider credential states;
- optional reviewed no-developer-key YouTube search/metadata through separately installed `yt-dlp`;
- optional fixed read-only session providers for X, Reddit, Facebook, Instagram, LinkedIn, and Xiaohongshu through operator-controlled browser login state;
- ordered source routes that fall back only on declared error codes;
- normalized records with source URL, adapter identity, content hash, warnings, and retrieval provenance;
- a separately restricted serverless profile and a structural browser-host contract; and
- local-first MIT code with no required Cockroach Crawler account or model provider.

## Boundary statement

Cockroach Crawler does not bypass login, paywall, CAPTCHA, robots policy, access control, provider terms, or rate limits. It does not extract browser cookies, expose social write operations, supply a model, or become a process sandbox. Optional providers are separately installed, explicit, read-only, and never silent fallbacks from official routes.

## Who it is for

- agent-tool authors who need creator-owned network and resource limits;
- Node.js teams building research, indexing, RAG, QA, or documentation workflows;
- security-conscious teams that want provider and serverless limitations returned instead of hidden;
- self-hosters who prefer a local CLI/API and a small restricted Worker option; and
- maintainers who want inspectable normalized records rather than an opaque hosted result.

## Product vocabulary

| Say | Meaning |
| --- | --- |
| bounded eyes | permitted read-only reach with explicit budgets |
| source doctor | local capability and credential-state inspection before dispatch |
| optional reach | separately installed no-key or session-backed read providers |
| normalized evidence record | source identity, content, hashes, warnings, and provenance in one shape |
| governed browser host | structural action contract that a governance layer can approve; not the browser driver |

## FAQ

### What works without a developer API key?

Explicit public web crawling and public GitHub reads work without provider credentials. The optional audited `youtube-no-key` route uses a separately installed `yt-dlp` for bounded YouTube search and metadata. Optional social session providers do not need developer keys but do require explicit operator-controlled browser login state and OpenCLI. Provider terms, availability, and rate limits still apply.

### Does it read social sites automatically?

No. Official routes remain closed until their credentials exist. Session routes are separate, read-only providers that the operator installs and selects explicitly. The package never reads cookie/profile files and never silently swaps an official provider for a browser session.

### Is the web adapter a search engine?

No. The hardened crawler follows explicit seed URLs. Search exists only through an explicitly selected source provider.

### Is browser mode safe for hostile pages?

It reduces network authority and applies budgets, but Chromium remains untrusted code. Use process or container isolation and restricted host egress for hostile targets.

### Is the serverless profile equivalent to the local crawler?

No. It enforces an HTTPS origin allowlist and strict budgets but cannot provide the local engine's DNS classification and address pinning. Use it only for operator-owned or independently trusted origins with suitable infrastructure controls.

### Does it write to a provider?

No built-in or optional provider in `0.3.0` posts, comments, likes, follows, edits, submits, or deletes.

## Approved descriptions

**Short:** Give AI agents bounded eyes on the public web: crawl, search, and normalize evidence without exposing an unrestricted browser.

**Medium:** Cockroach Crawler gives Node.js agents bounded read-only reach across public pages and explicit source providers. Creator-owned policy limits the network and workload; normalized records keep source identity and retrieval provenance attached.

**Boilerplate:** Cockroach Crawler is an MIT-licensed Node.js reading layer for agent workflows. It combines a hardened local crawler, capability-aware source routing, optional explicit reach providers, a governed browser-host contract, and a deliberately restricted serverless profile. It does not bypass authentication or hide provider authority.
