# Product Hunt launch package

## Listing

**Name:** Cockroach Crawler

**Tagline (49 characters):** Bounded web reads for agents—local or serverless

**Short description:** An MIT-licensed Node.js crawler with a hardened local CLI, a limited allowlist-first serverless tier, and official read-only source adapters with explicit capability reporting.

**Topics:** Developer Tools, Open Source, Artificial Intelligence, Web Scraping, Security

## Product description

Agents need information, but a raw browser or unrestricted `fetch` gives model input more network authority than many jobs require.

Cockroach Crawler turns reading into an explicit boundary:

- **Local CLI/API:** public-network validation, DNS-pinned redirect hops, robots enforcement, origin policy, and exact page/request/byte/depth/time budgets.
- **Serverless API:** bounded HTML extraction from a deployment-configured HTTPS allowlist, with its weaker runtime properties returned in every result.
- **Source adapters:** normalized, read-only records for public web, GitHub, YouTube, X, and Reddit. Availability is reported before use; official credentials are required where providers require them.

It returns Markdown or JSON/JSONL with source URLs, retrieval provenance, redirect details, and content hashes. It does not require a model or hosted account, and it does not bypass logins, paywalls, CAPTCHA, robots policy, or provider access rules.

`0.3.0-alpha.1` is an integration preview. Try it, inspect the limits, and tell us which contract fixture or failure mode should come next.

## Maker comment

I made Cockroach Crawler after repeatedly seeing “give the agent browsing” treated as one feature. In practice, there are several very different trust decisions: arbitrary URL vs allowlisted origin, local DNS control vs serverless fetch, static HTML vs browser execution, and public endpoints vs official authenticated APIs.

This release exposes those decisions instead of hiding them. The `doctor` command tells you exactly which source adapters can search or read in the current environment. The serverless result says plainly that it has no DNS pinning or browser mode. The local agent adapter will not let model input expand the limits chosen by its creator.

The product is deliberately not “the whole internet in one command.” I would rather ship narrower capabilities whose boundaries can be tested than imply coverage we do not have.

Questions and critical feedback are welcome, especially from people who build agent tools, crawlers, RAG pipelines, or SSRF defenses.

## Gallery sequence

1. **Two crawl tiers. One honest boundary.** Compare the DNS-pinned local transport with the allowlist-only serverless gate.
2. **Know which sources are ready.** Show the exact five-provider `cockroach-sources doctor` capability states.
3. **Every discovery path spends a budget.** Show the hard ceilings for pages, depth, bytes, requests, concurrency, and time.

The three matching 1270×760 assets are in `media/launch-assets/png/`; use them in this order. The thumbnail is a separate 240×240 asset.

Use the size and content guidance in [MEDIA-MATRIX.md](./MEDIA-MATRIX.md). Do not use unrelated 3D insects, generic robots, floating glass cards, or fake provider dashboards.

## Launch-day comments

### Technical follow-up

The most important design choice is what the serverless tier does **not** claim. It requires an explicit HTTPS origin allowlist and validates redirects against it, but it cannot offer the local crawler's address pinning. That difference is in the API result, docs, and tests.

### Contribution prompt

If you want to contribute, the most useful first tasks are offline provider contract fixtures, documentation examples, output-schema fixtures, and accessibility/SEO checks for the site. Security-sensitive network-policy changes require focused tests and maintainer review.

### Day-two update template

Thank you for the feedback. The top three concrete requests were:

1. `[REQUEST_ONE]`
2. `[REQUEST_TWO]`
3. `[REQUEST_THREE]`

We converted them into scoped issues with acceptance criteria rather than adding broad roadmap promises: `[ISSUE_LINKS]`.
