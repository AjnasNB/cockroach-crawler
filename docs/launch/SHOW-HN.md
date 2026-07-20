# Show HN launch package

Submit only after the alpha package, tag, release, site, and demo all resolve from a signed-out browser.

## Recommended title

**Show HN: Cockroach Crawler – bounded web reads for agent tools**

Alternate:

**Show HN: A local-first crawler with explicit network limits for agents**

## Submission body

Hi HN — I built Cockroach Crawler because giving an agent a raw URL fetcher or general browser felt like too much ambient authority for many research and indexing jobs.

It is an MIT-licensed Node.js crawler with two intentionally different execution tiers:

- a hardened local CLI/API that validates complete DNS answers, pins each redirect hop to a validated address, fails closed when robots policy cannot be verified, and applies exact page/request/byte/depth/time limits;
- a smaller serverless crawler for 1–32 deployment-configured HTTPS origins. It checks robots at every redirect target, but reports that it has no DNS resolution/pinning, browser mode, authenticated source providers, or request-selected arbitrary-origin crawling.

The new alpha also adds read-only source adapters with a `doctor` command. Public web and public GitHub reads work without credentials. A known YouTube URL returns public oEmbed metadata without a key; YouTube search needs an API key. X and Reddit require their official API credentials. No cookie extraction, stealth, login bypass, or write actions are included.

```bash
npm install --global cockroach-crawler@0.3.0-alpha.2
cockroach-sources doctor
cockroach-crawl https://example.com/docs --max-pages 10 --jsonl
```

I would especially value feedback on three things:

1. Is the local/serverless boundary explained clearly enough?
2. Which read-only provider should receive the next offline contract fixture?
3. Which failure mode or budget would you want before placing this behind an agent?

Code: <https://github.com/AjnasNB/cockroach-crawler>

Demo: [DEMO_URL]

The release is an alpha, not a claim of complete internet coverage or a replacement for distributed crawlers and hosted extraction services.

## First comment

Some details that did not fit in the post:

- The web adapter is a crawler for explicit URLs, not a search index.
- Source records include provider, source ID, URL, author, retrieval time, adapter version, content hash, warnings, metadata, and whether retrieval was authenticated.
- The agent adapter snapshots creator policy and rejects inherited/accessor/unknown input. Model-supplied limits may narrow authority but cannot expand creator limits.
- Optional Playwright mode is behind creator opt-in. It routes HTTP(S) through the validated transport and blocks several browser egress paths, but it is still not a process sandbox.
- The complete local Node test command passed on 2026-07-18. I will link the tagged CI run here before submitting: [CI_URL].

I chose to label the serverless tier's missing DNS pinning in its returned runtime metadata rather than imply it has the same security properties as the local crawler. If you have experience making this boundary clearer, I would appreciate the critique.

## Response bank

### “When should I use a larger crawling platform?”

Use a larger platform when you need managed extraction, distributed queues, proxy infrastructure, or advanced browser orchestration. Cockroach Crawler is a compact Node boundary with explicit origins, strict budgets, read-only provider adapters, and portable records.

### “Can it read X or Reddit without credentials?”

No. The built-in adapters use the official APIs. X requires a bearer token; Reddit uses application-only OAuth plus a contact-aware user agent. `cockroach-sources doctor` reports those providers as unavailable until configured.

### “Is serverless SSRF-safe?”

It rejects IP literals and accepts only an explicit list of operator-owned or independently trusted HTTPS origins, validates every redirect against that list, re-checks robots for redirect targets, and fails closed on robots errors. It does not resolve, classify, or pin DNS answers, so an allowlisted hostname can resolve internally. Deployment isolation and egress controls still matter.

### “Why robots fail closed?”

If policy cannot be checked because the robots endpoint is failing, proceeding would turn an infrastructure error into permission. True absence (`404`/`410`) is handled differently from server failure.

### “Can it log in or bypass CAPTCHA?”

No. It intentionally excludes stealth, CAPTCHA, paywall, authentication, and authorization bypasses. Browser storage state is a trusted-operator input, not something the crawler discovers or steals.

### “What is the business model?”

The current project is MIT licensed and local-first. There is no required hosted account. The immediate goal is to make the open-source boundary useful and well tested; any hosted offering would need a separate, explicit scope and threat model.
