# Architecture

Cockroach Crawler has separate entry points because their network and credential boundaries are not equivalent.

```text
explicit URL or provider request
              |
      creator-owned policy
              |
   +----------+----------------+-----------+
   |          |                |           |
   v          v                v           v
local Node   sources       source router  serverless
crawler      registry      ordered reads  HTML profile
   |          |                |           |
DNS pinning  official      explicit       operator HTTPS
robots       read APIs     fallback        allowlist
budgets      capability    route doctor    no DNS pinning
optional     doctor        no actions      no browser
browser      normalized    no auth drift   small budgets
   |          |                |           |
   +----------+----------------+-----------+
              |
      records + provenance
```

## Hardened local crawler

`cockroach-crawler` is the main Node.js transport. It validates complete DNS answers, pins requests to the validated address, checks every redirect and robots target, applies sensitive-path and origin policy, and enforces request, page, queue, byte, concurrency, retry, and deadline budgets. Optional Playwright rendering routes HTTP(S) through that transport, but Chromium remains untrusted code and still needs process or container isolation.

## Source registry

`cockroach-crawler/sources` exposes a read-only registry with `doctor`, `search`, and `read`. Web requests delegate to the hardened crawler. GitHub, YouTube, X, and Reddit use their documented APIs and normalize results into immutable records. Capability status is explicit: missing credentials are not replaced with cookies or scraping fallbacks.

## Source router

`cockroach-crawler/source-router` maps a named read or search capability to an ordered list of registry providers. It skips providers whose doctor status says the requested capability is unavailable. A dispatched provider changes only after a route-creator-declared error code; authentication, invalid-response, cancellation, timeout, and response-size failures are permanently non-fallbackable. The router never executes browser actions or reuses login sessions.

## Serverless profile

`cockroach-crawler/serverless` is a smaller Fetch-compatible HTML crawler. It requires one to 32 deployment-configured HTTPS origins, checks each redirect against the allowlist and robots policy, and applies small hard ceilings. It does not resolve, classify, or pin DNS answers; an allowlisted hostname can resolve internally. Use only operator-owned or independently trusted origins plus infrastructure egress controls. It has no browser, provider registry, distributed queue, or arbitrary-origin endpoint.

The Worker template adds a deployment bearer secret and Cloudflare Rate Limiting binding. Those controls are deployment responsibilities, not package-global guarantees.

## Website and media

`website/` is a separately built static documentation site. `media/` contains release-video source and rendered assets. Neither belongs in the npm tarball. Public pages must identify the currently published stable version separately from source-only candidates.
