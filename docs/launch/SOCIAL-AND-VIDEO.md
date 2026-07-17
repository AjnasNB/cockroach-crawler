# Social and video copy

## X launch thread

**1/8**

“Give the agent web access” is not one permission.

It is destination access, crawl budget, browser authority, and provider credentials.

Cockroach Crawler `0.3.0-alpha.1` makes those boundaries explicit. Open source, Node.js, local first. 🧵

**2/8**

The hardened local crawler validates complete DNS answers, pins redirect hops to approved addresses, checks robots policy, and limits pages, requests, depth, bytes, redirects, concurrency, and time.

That is the strong boundary.

**3/8**

The serverless tier is intentionally smaller:

- deployment-configured HTTPS allowlist
- HTML only
- bounded redirects + robots
- exact resource budgets

It returns `dnsPinning: false`. Convenience does not inherit a security claim it cannot enforce.

**4/8**

New: `cockroach-sources doctor`

It reports what each read-only adapter can actually do in the current environment—before the agent tries it.

No credential flags. No cookie extraction. No write actions.

**5/8**

Without credentials today:

✅ explicit public web URLs
✅ public GitHub search + repository reads
◐ known YouTube video metadata
✗ X search/read
✗ Reddit search/read

Provider rules still apply.

**6/8**

Every normalized source record includes its URL, provider, retrieval time, adapter version, content hash, metadata, warnings, and whether retrieval was authenticated.

Useful for RAG ingestion, docs indexing, QA, and research traces.

**7/8**

Use the hardened local tier for address-level controls. Use the restricted serverless tier for a small deployment-owned origin set. Both return the same evidence-oriented records.

**8/8**

Try the alpha after release:

`npm i -g cockroach-crawler@0.3.0-alpha.1`

`cockroach-sources doctor`

Code: <https://github.com/AjnasNB/cockroach-crawler>

Which missing contract fixture would you review or contribute?

## Single X post

Cockroach Crawler `0.3.0-alpha.1`: bounded web reads for agent tools.

Hardened local crawling, an explicitly limited allowlist-first serverless tier, and read-only source adapters that report their real credential requirements.

Inspect the source, boundaries, fixtures, and release evidence: <https://github.com/AjnasNB/cockroach-crawler>

## YouTube title options

1. **Give an AI agent web access without giving it an open browser**
2. **Cockroach Crawler in 60 seconds: local, serverless, and source adapters**
3. **Why this agent crawler has two network boundaries**

Use “AI agent” in the title only for discoverability; the video must immediately explain that the crawler itself does not call a model.

## YouTube description

Cockroach Crawler is an MIT-licensed Node.js crawler for bounded, read-only agent workflows.

This 60-second overview introduces three separate capabilities:

1. a hardened local CLI/API with network and resource controls;
2. a smaller allowlist-first serverless HTML crawler whose returned metadata names its weaker runtime boundary;
3. official read-only source adapters with a `doctor` command for GitHub, YouTube, X, Reddit, and public web.

What works without provider credentials in `0.3.0-alpha.1`:

- explicit public web URL crawling;
- public GitHub REST search and repository reads at the unauthenticated limit;
- public YouTube oEmbed metadata for a known video URL or ID.

YouTube search requires an API key. X requires an approved API v2 bearer token. Reddit requires application-only OAuth credentials and a contact-aware user agent. Transcripts are not implemented in this alpha.

Install after release:

```bash
npm install --global cockroach-crawler@0.3.0-alpha.1
cockroach-sources doctor
cockroach-crawl https://example.com/docs --max-pages 10 --jsonl
```

Repository: <https://github.com/AjnasNB/cockroach-crawler>

Documentation/site: <https://cockroachcrawler.com/>

Release: [RELEASE_URL]

Separate real workflow proof: [WORKFLOW_PROOF_URL]

Chapters:

```text
00:00 Bounded public-web evidence
00:10 Hardened local crawler
00:20 Source capability doctor
00:30 Restricted serverless tier
00:40 Tests and local benchmark scope
00:50 Stable versus alpha
```

This alpha does not bypass authentication, paywalls, CAPTCHA, robots policy, provider approval, or API pricing. It is not a process sandbox or a universal search index.

## Pinned YouTube comment

The most important visible boundary in the overview is **NO DNS PINNING** on the serverless tier. That tier is useful for operator-owned or independently trusted HTTPS origins, but it is not equivalent to the local crawler. The separate 45-second workflow proof shows the real CLI allow/deny flow and normalized record. Please review the threat model before deploying either tier.

What should the next offline provider contract test cover?

## 60-second overview narration

**0–10s**

Cockroach Crawler gives agent workflows a bounded path to public web evidence. It is not a browser free-for-all.

**10–20s**

The hardened Node CLI validates every seed, DNS answer, redirect, robots rule, and byte budget before network dispatch.

**20–30s**

Source doctor reports what is actually available. Web and public GitHub are ready. YouTube is partial. X and Reddit need official credentials.

**30–40s**

A separate serverless Worker accepts only allowlisted HTTPS origins, requires a bearer secret, rate limits requests, and fails closed.

**40–50s**

The complete local Node suite passes. A separate one hundred twenty page fixture checks regressions. It is not an industry or global benchmark.

**50–60s**

Use stable zero point two today, or review the zero point three alpha candidate in source. Understand the boundary before you trust the output.

Do not synthesize terminal output. Record the actual commands against a deterministic fixture and mask all environment values.
