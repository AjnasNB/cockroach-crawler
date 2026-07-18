# Community launch posts

Each post should be submitted by a maintainer who can stay for questions. Read each community's current rules before posting. Do not cross-post identical text across subreddits, and do not ask for stars or votes.

## Reddit: Node.js / JavaScript developers

**Title:** I built a bounded Node.js crawler for agent tools; the alpha now separates local, serverless, and official API reads

**Body:**

I have been working on Cockroach Crawler, an MIT-licensed Node.js crawler for jobs where handing model input a raw `fetch` or browser feels too broad.

The published `0.3.0-alpha.1` prerelease (npm `next`, not `latest`) has three pieces:

- a local CLI/API with public-network validation, DNS-pinned redirect hops, robots enforcement, exact resource limits, Markdown/JSONL output, and optional operator-enabled Playwright;
- a smaller serverless HTML crawler for deployment-configured HTTPS origins that reports it has no DNS resolution/pinning or browser mode;
- read-only source adapters for web, GitHub, YouTube, X, and Reddit. `cockroach-sources doctor` reports exactly what the current environment can use.

Without credentials, public web and public GitHub search/read work, and a known YouTube URL can return oEmbed metadata. X and Reddit require official credentials; YouTube search needs an API key. There is no cookie extraction, login/CAPTCHA bypass, or write API.

The complete local Node suite passes across the new adapters/serverless tier and the existing network and budget behavior. The tagged CI run will be linked at release time. The alpha still needs real-world feedback and should not be treated as universally production-ready.

Repository: <https://github.com/AjnasNB/cockroach-crawler>

I would appreciate review of the API shape and TypeScript declarations, especially from people who maintain agent tools or SSRF-sensitive Node services.

## Reddit: self-hosting / open source

**Title:** Cockroach Crawler alpha: local-first web extraction plus an allowlisted serverless endpoint

**Body:**

Cockroach Crawler is a small MIT-licensed crawler that runs without a hosted account or model dependency. The main CLI produces Markdown, JSON, or JSONL from bounded public-web crawls.

This alpha adds an optional serverless entry point for a narrow use case: expose HTML extraction for a fixed set of HTTPS sites that you own or independently trust. Origins are configured at deployment, not accepted from arbitrary requests; robots errors fail closed; redirect targets are re-checked against robots and the allowlist; and page/depth/request/byte/time limits are enforced.

Important limitation: the serverless runtime does not resolve, classify, or pin DNS answers, so an allowlisted hostname can resolve internally. The response says `dnsPinning: false`. Use only operator-owned/trusted hostnames and add infrastructure egress policy when internal destinations are reachable; use the local tier when address-level validation matters.

The project also has read-only official source adapters, but X/Reddit access still requires provider credentials and YouTube search needs a key.

Code: <https://github.com/AjnasNB/cockroach-crawler>

I am looking for deployment reviews and documentation feedback, not star requests. What would you need to audit before self-hosting a crawler endpoint?

## Lobsters

**Title:** Cockroach Crawler: bounded local crawling and an explicitly weaker serverless tier

**URL:** Use the canonical technical article, not the homepage.

**Optional comment:**

I am the author. The design question is whether two runtimes with different network controls should share one API surface. I chose separate exports and returned capability metadata: the local crawler validates and pins DNS answers, while the serverless crawler accepts only deployment-configured HTTPS origins and says `dnsPinning: false`. Operators must still use trusted hostnames and egress policy. The alpha also adds read-only official source adapters whose `doctor` output reports missing credentials rather than pretending the source works. Critical review is welcome.

## Indie Hackers

**Title:** I narrowed the promise before widening the crawler

**Body:**

I wanted Cockroach Crawler to give agent workflows one inspectable reading layer across the web and supported public sources. The hard product problem was making provider credentials, quotas, robots rules, and runtime security properties visible instead of hiding them behind one generic tool call.

So the alpha's product decision is narrower:

- hardened local crawling for explicit URLs;
- a separate allowlist-first serverless tier for known sites;
- official, read-only source adapters that announce their actual capabilities.

That gives me a less dramatic headline but a better product contract. Public web and GitHub work without credentials; YouTube is metadata-only without a key; X and Reddit require their official credentials.

My open questions for other builders:

1. Does a capability `doctor` command reduce setup confusion?
2. Would you pay for a hosted version if it stayed allowlist-first, or is local-first the core value?
3. Which proof builds trust fastest: threat-model docs, reproducible fixtures, or a live request trace?

Repository: <https://github.com/AjnasNB/cockroach-crawler>

## Community follow-up rule

Turn repeated, actionable requests into scoped issues with testable acceptance criteria. Do not promise a provider, date, or security property in a comment before the maintainer has accepted the scope.

## Open-source contributor invitation

Use this only in communities where an offline Node.js testing task is relevant:

> Cockroach Crawler is looking for a small independent contract test, not a
> generic endorsement. Issue #20 checks how the read-only GitHub adapter handles
> HTTP 200 responses containing valid JSON with an invalid shape. The fixture is
> synthetic and offline: no GitHub account, token, or network request is needed.
> Start by commenting on the issue, then work from a fork and a focused branch.
> Please include your exact Node version and commands in the pull request.
>
> Task: <https://github.com/AjnasNB/cockroach-crawler/issues/20>
> Contribution guide: <https://github.com/AjnasNB/cockroach-crawler/blob/main/CONTRIBUTING.md>

Do not ask for stars, votes, or mass testing. Ask for one reproducible result or
one reviewable fixture from people for whom the contract is relevant.
