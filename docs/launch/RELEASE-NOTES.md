# Release notes for 0.3.0-alpha.1

This copy records the published alpha release. Registry truth last verified 19 July 2026: npm `latest` points to stable `0.2.0`, while npm `next` points to prerelease `0.3.0-alpha.1`. “Published prerelease” does not mean stable, and it does not prove that the product site or a reference Worker deployment is live.

## GitHub release title

**Cockroach Crawler v0.3.0-alpha.1 — source adapters and allowlist-first serverless crawling**

## GitHub release body

`0.3.0-alpha.1` is an integration preview that adds two new entry points while preserving the hardened local crawler as the stronger network boundary.

### Added

- `cockroach-crawler/sources`: a typed registry for normalized, read-only source records.
- `cockroach-sources`: a CLI for capability checks, searches, and reads.
- Built-in source adapters for explicit public web URLs, GitHub REST, YouTube APIs/oEmbed, X API v2, and Reddit application-only OAuth.
- `cockroach-crawler/serverless`: a bounded HTML crawler and bearer-protected request handler for 1–32 deployment-configured HTTPS origins.
- TypeScript declarations and packed-consumer coverage for the two new exports.
- Runtime/package version alignment through one `PACKAGE_VERSION` value.

### Capability boundaries

With no provider credentials:

| Provider | Status | Available |
| --- | --- | --- |
| Web | Ready | Crawl/read an explicit URL through the hardened crawler |
| GitHub | Ready | Public repository/issue search and repository read at unauthenticated limits |
| YouTube | Partial | Known-video oEmbed metadata; no search or transcript |
| X | Missing credentials | Requires `X_BEARER_TOKEN` for approved API v2 access |
| Reddit | Missing credentials | Requires client ID, client secret, and a contact-aware user agent |

Run `cockroach-sources doctor --json` in the deployment environment instead of assuming a provider is configured.

### Serverless boundary

The serverless crawler:

- requires an explicit list of operator-owned or independently trusted HTTPS origins;
- rejects IP literals and unlisted seeds before network dispatch;
- validates every redirect against the allowlist;
- fails closed when robots policy is unavailable;
- enforces page, depth, request, response-byte, total-byte, redirect, timeout, delay, and duration limits;
- optionally requires a deployment bearer token that cannot be supplied in the request body.

It does **not** resolve, classify, or pin DNS answers; an allowlisted hostname can resolve internally. It also has no browser mode, authenticated provider adapters, or request-selected arbitrary-origin crawling. Use only operator-owned/trusted hostnames, add infrastructure egress controls when internal destinations are reachable, and use the local crawler when stronger destination guarantees are required.

### Read-only and non-goals

The built-in source adapters do not post, comment, like, follow, edit, or delete. The project does not extract browser cookies, bypass authentication, solve CAPTCHA, bypass paywalls, evade robots policy, or provide a universal search index.

### Release evidence

The registry exposes `0.3.0-alpha.1` through `next` with trusted-publishing provenance; `latest` remains on `0.2.0`. Independently verify the exact artifact before relying on it:

- inspect `npm view cockroach-crawler dist-tags --json`;
- inspect version, integrity, and attestations for `0.3.0-alpha.1`;
- confirm the Git tag and GitHub prerelease point to the reviewed publish commit;
- run the real Chromium integration and packed external TypeScript consumer checks;
- run the production dependency and direct-license audits;
- test both CLI bins and all exports from a clean registry-only install.

### Install

```bash
npm install --global cockroach-crawler@0.3.0-alpha.1
cockroach-sources doctor
```

### Feedback requested

- Provider contract gaps that can be reproduced without real accounts or secrets.
- Serverless deployment reviews and missing failure fixtures.
- Normalized record fields needed by indexing and research workflows.
- Documentation examples for real, authorized public sources.

### Upgrade notes

- The existing root and `/agent` APIs remain available.
- The CLI version parser now accepts prerelease SemVer.
- Source credentials are environment-only; they are not accepted as CLI arguments.
- This is an alpha. Pin the exact version and review the returned capability metadata before integration.

## npm release summary

Use in prerelease-specific copy while `next` remains on `0.3.0-alpha.1`:

> `cockroach-crawler@0.3.0-alpha.1` adds typed, read-only source adapters and a deliberately limited serverless crawler. Use `cockroach-sources doctor` to inspect exact GitHub, YouTube, X, Reddit, and web availability. The hardened local CLI remains the stronger network boundary; the serverless tier is allowlist-first and explicitly reports that DNS pinning and browser mode are absent.

## Verification commands

```bash
npm view cockroach-crawler@0.3.0-alpha.1 version dist.integrity dist.attestations
npm install --global cockroach-crawler@0.3.0-alpha.1
cockroach-crawl --version
cockroach-sources doctor --json
```

Run registry-only JavaScript and TypeScript consumers from a new temporary directory. Do not reuse the source checkout's `node_modules`.
