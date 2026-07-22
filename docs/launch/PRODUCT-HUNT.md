# Product Hunt launch package

## Listing

**Name:** Cockroach Crawler

**Tagline:** Give AI agents eyes on the web - with boundaries

**Description (under 260 characters):** Crawl, search, and normalize public sources for AI agents without exposing an unrestricted browser. Local-first Node.js, explicit network and resource budgets, read-only provider routes, provenance, and no signup.

**Topics:** Developer Tools, Open Source, Artificial Intelligence, Web Scraping, Security

**Pricing:** Free

## Maker comment

I built Cockroach Crawler because “browser access” is not one permission. An explicit public URL, a provider API, a logged-in read session, a browser action, and a serverless fetch all have different authority.

Version `0.3.0` exposes those choices. The local crawler validates and pins admitted addresses. The provider doctor reports which route is available before dispatch. Optional no-key and session providers are separately installed and never silent fallbacks. The restricted Worker profile states that it does not have the local DNS boundary.

The project is deliberately read-only and does not include cookie extraction, stealth, CAPTCHA/paywall/login bypass, or social write operations. I would value a reproducible provider, redirect, robots, SSRF, browser, or budget failure more than a generic feature request.

## Gallery

1. **Bounded eyes on the public web.** Show explicit inputs crossing policy and budget gates into normalized records.
2. **Know which route is ready.** Show public, keyed, credentialed, no-key, and session-backed doctor states.
3. **Every discovery path spends a budget.** Show pages, depth, bytes, requests, concurrency, and deadline.
4. **Two runtimes, two honest boundaries.** Compare local DNS pinning with the restricted serverless allowlist.

Product Hunt currently recommends a 240 x 240 square thumbnail, 1270 x 760 gallery images, at least two gallery assets, a direct product URL, a description within 260 characters, and a public full YouTube URL for video.

Use `media/launch-assets/png/product-hunt-thumbnail.png` and the numbered Product Hunt assets in `media/launch-assets/png/` after regenerating and validating them.

## Day-two update

Publish only concrete outcomes: clean installs, first successful crawls, confirmed failures, fixed documentation, or scoped issues. Do not report raw views, stars, or downloads as product success.
