# Release notes for 0.3.0-alpha.2

This copy is prepared for a future reviewed alpha release. Do not paste “published” or “live” into public channels until npm, the Git tag, GitHub release, and registry-only verification all succeed at the same commit.

## GitHub release title

**Cockroach Crawler v0.3.0-alpha.2 — maintained Node releases and hardened provider responses**

## GitHub release body

`0.3.0-alpha.2` is an integration preview that retains the provider and serverless entry points, removes the end-of-life Node 20 baseline, and hardens successful provider-response validation while preserving the local crawler as the stronger network boundary.

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

### Verification before release

The working branch's complete local Node test command passed on 2026-07-18. This is not a substitute for the release gate. Before tagging, attach:

- [CI_URL] — Node 22, 24, and 26 jobs for the reviewed commit;
- the real Chromium integration result;
- packed external TypeScript consumer result;
- production dependency audit and direct-license audit;
- `npm pack --dry-run --json --ignore-scripts` inspection;
- registry-only smoke test after publish.

### Install

```bash
npm install --global cockroach-crawler@0.3.0-alpha.2
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

Use as the top of the README or npm announcement after publish:

> `cockroach-crawler@0.3.0-alpha.2` adds typed, read-only source adapters and a deliberately limited serverless crawler, supports maintained Node 22, 24, and 26 releases, and rejects incompatible successful provider payloads. Use `cockroach-sources doctor` to inspect exact GitHub, YouTube, X, Reddit, and web availability. The hardened local CLI remains the stronger network boundary; the serverless tier is allowlist-first and explicitly reports that DNS pinning and browser mode are absent.

## Verification commands

```bash
npm view cockroach-crawler@0.3.0-alpha.2 version dist.integrity dist.attestations
npm install --global cockroach-crawler@0.3.0-alpha.2
cockroach-crawl --version
cockroach-sources doctor --json
```

Run registry-only JavaScript and TypeScript consumers from a new temporary directory. Do not reuse the source checkout's `node_modules`.
