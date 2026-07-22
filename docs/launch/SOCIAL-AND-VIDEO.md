# Social and video launch copy

## X thread

1. AI agents need eyes on the web. They do not need the keys to your network. Cockroach Crawler gives Node.js agents bounded, read-only reach across public pages and explicit source providers.
2. The hardened local crawler validates public destinations, pins each admitted redirect hop, enforces robots, and spends creator-owned limits for pages, requests, bytes, depth, concurrency, and time.
3. `cockroach-sources doctor` shows which public, keyed, credentialed, no-key, or session-backed route is actually available before an agent dispatches.
4. Optional YouTube and social-session routes are separately installed, fixed read-only commands. No cookie extraction, stealth, login bypass, or silent fallback.
5. The output is Markdown/JSON/JSONL plus source URLs, hashes, warnings, and retrieval provenance. Reproduce it: `npx -y --package cockroach-crawler@0.3.0 cockroach-crawl https://example.com --max-pages 3 --jsonl`
6. Source, docs, and explicit limitations: https://cockroachcrawler.com/

## LinkedIn

“Give the agent a browser” sounds like one feature. It is actually a collection of authority decisions: which origins, which redirects, which provider account, which login state, how many pages, how many bytes, and when the workflow must stop.

Cockroach Crawler turns those decisions into a bounded reading layer. The local Node.js path validates destinations and redirect hops. Source routes report whether they are public, keyed, credentialed, no-key, or session-backed. Optional reach providers are separately installed and read-only. Results keep source identity and retrieval provenance attached.

It does not supply a model, proxy fleet, process sandbox, cookie extractor, or access-control bypass. The restricted serverless profile also states plainly that it lacks the local DNS boundary.

Version `0.3.0` is MIT licensed and available on npm. I am looking for one reproducible provider, robots, redirect, SSRF, browser, or resource-budget failure that should become the next fixture.

## Short launch post

Give your AI agent eyes on the web - without giving it the keys to your network.

Cockroach Crawler `0.3.0` is a local-first Node.js reading layer with bounded public-web crawling, explicit provider diagnostics, optional read-only reach providers, normalized evidence records, a governed browser-host contract, and a restricted Worker profile.

Try the two-command proof:

```sh
npx -y --package cockroach-crawler@0.3.0 cockroach-sources doctor
npx -y --package cockroach-crawler@0.3.0 cockroach-crawl https://example.com --max-pages 3 --jsonl
```

## YouTube

**Title:** Give AI agents eyes on the web - with boundaries | Cockroach Crawler 0.3.0

**Description:** See a real source doctor, bounded crawl, and normalized evidence record. Cockroach Crawler is an open-source Node.js reading layer with creator-owned network and resource limits, optional explicit no-key or session-backed providers, and no cookie extraction or write actions. Reproduce the demo from npm: https://cockroachcrawler.com/docs/

**60-second structure:**

- `00:00` The problem: raw browser or network authority.
- `00:08` Run `cockroach-sources doctor`.
- `00:18` Run a three-page bounded crawl.
- `00:32` Inspect source URL, hashes, warnings, and provenance.
- `00:42` Show local versus serverless DNS boundaries.
- `00:50` Show optional reach as separate read-only authority.
- `00:57` Link source, reproduction, captions, and limits.

## Video integrity

Use real commands from the reviewed package. Show no credentials, cookies, private browser state, or production paths. Add VTT and SRT captions. State that no-key providers remain subject to upstream terms and availability, and that browser mode is not a process sandbox.
