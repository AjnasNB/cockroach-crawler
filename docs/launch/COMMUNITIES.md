# Community-specific discussion drafts

Use only after reading the target community's current rules. Disclose that you maintain the project. Do not repost identical copy, automate comments, or ask for votes, stars, or reviews.

## Node.js or open-source engineering community

**Title:** I built a bounded Node.js reading layer for AI agents - looking for network and provider edge cases

I maintain Cockroach Crawler, an MIT-licensed Node.js package for turning explicit public pages and selected read-only sources into normalized records. The local transport validates public destinations, pins admitted redirect hops, enforces robots, and applies hard budgets. A source doctor reports whether each route is public, keyed, credentialed, no-key, or session-backed. Optional reach providers are separately installed and never silent fallbacks.

The package does not include a model, proxy network, cookie extraction, login/CAPTCHA bypass, or provider write operations. The quick proof is:

```sh
npx -y --package cockroach-crawler@0.3.0 cockroach-sources doctor
npx -y --package cockroach-crawler@0.3.0 cockroach-crawl https://example.com --max-pages 3 --jsonl
```

I would appreciate one reproducible redirect, robots, DNS, provider-payload, browser-egress, or budget failure that the current tests miss.

## Application-security community

**Title:** Review request: local DNS-pinned crawler versus allowlist-only Worker profile

I maintain a small crawler with two deliberately different network boundaries. The local Node.js transport resolves and validates complete DNS answers and pins each admitted HTTP hop. The Worker profile cannot provide that guarantee, so it accepts only deployment-configured HTTPS origins and reports `dnsPinning: false` in its runtime metadata.

I am not claiming SSRF-proof operation. The question is whether the residual serverless risk and required egress controls are stated and tested clearly enough. Threat model and fixtures: https://github.com/AjnasNB/cockroach-crawler

## Indie Hackers or founder community

**Title:** I stopped pitching “browser access” and split the product into explicit authority tiers

The product lesson behind Cockroach Crawler `0.3.0` was that public URLs, provider APIs, logged-in read sessions, browser actions, and serverless fetches are not one capability. Each has a different setup, failure mode, and trust boundary.

The launch now leads with one outcome - bounded eyes on the web - while the product keeps those authority tiers visible. I am looking for feedback from developers who have tried to package an infrastructure product without hiding its limitations: what made your first-time setup understandable?

## Moderation-safe behavior

- Prefer one technical question over a feature list.
- Link the repository or runnable docs, not a referral or tracking URL.
- If a post is filtered, do not repost repeatedly; ask moderators once and wait.
- Never have another account post a fake independent endorsement.
- Turn useful criticism into a scoped issue with an acceptance test.
