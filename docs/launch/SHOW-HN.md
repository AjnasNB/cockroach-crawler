# Show HN fact sheet

Hacker News asks users not to post generated or AI-edited text. Do not paste this file as a submission or comment. The maintainer must write the final title and discussion personally from the verified facts below.

## Preconditions

- `cockroach-crawler@0.7.0` resolves from npm `latest` and matches the reviewed GitHub release artifact and provenance;
- the repository and website work without signup;
- the two-command proof works from a clean install;
- the maintainer is available for the discussion; and
- nobody is asked to upvote, comment, or coordinate attention.

## Facts to explain in your own words

- You built it because “give the agent a browser” hides several different trust decisions.
- The local crawler admits public destinations, pins each accepted redirect hop, enforces robots, and spends exact resource budgets.
- A provider doctor shows which public, keyed, credentialed, no-key, or session-backed read route is actually available.
- Optional reach providers are separate, read-only, operator-selected, and never silent fallbacks.
- The serverless profile accepts only deployment-configured HTTPS origins and explicitly reports that it lacks local DNS pinning.
- The output is Markdown/JSON/JSONL plus source URLs, hashes, warnings, and retrieval provenance.
- Searchable site maps rank only URLs that the bounded crawler already fetched.
- Deterministic extraction covers CSS, XPath, and restricted regex; an optional
  host model must return JSON that passes the caller's schema.
- The self-hosted API includes bounded process-local jobs, and provider routing
  can use one fixed operator-owned proxy gateway.
- The native MCP server ships matching npm and `server.json` Registry
  identities.
- It does not include a bundled model, managed proxy fleet, durable distributed
  queue, stealth, CAPTCHA/paywall/login bypass, cookie extraction, or write
  actions.

## Runnable proof

```sh
npx -y --package cockroach-crawler@0.7.0 cockroach-sources doctor
npx -y --package cockroach-crawler@0.7.0 cockroach-crawl https://example.com \
  --map --map-search "example domain" --map-results 3 --json
```

## Possible factual title to rewrite

`Show HN: Cockroach Crawler – give AI agents the web while you keep the keys`

## Questions worth asking

1. Which provider or site-policy failure should become the next offline fixture?
2. Is the local/serverless security difference visible enough in the API and docs?
3. Which real workflow needs the browser-host contract instead of a general-purpose browser tool?

## Response facts

**Why not a larger crawler?** Cockroach Crawler now covers deep crawling,
browser evidence, searched maps, structured extraction, MCP, Docker,
process-local jobs, and a fixed proxy-gateway adapter in one Node.js package.
Use a managed service when you specifically need its operated distributed queue
or proxy fleet.

**Can it read YouTube without a developer key?** The optional pinned `youtube-no-key` provider uses a separately installed `yt-dlp` for bounded search and metadata. It does not promise that every video exposes captions, and official API access remains a separate route.

**Can it read X or Reddit without developer credentials?** Only through optional operator-controlled, read-only session providers. Those require an explicit browser login and separate OpenCLI installation. No cookies are extracted or returned.

**Is it SSRF-proof?** No universal claim. The local transport validates and pins admitted addresses. The serverless profile has a weaker allowlist-only DNS boundary that still needs trusted origins and infrastructure egress controls.
