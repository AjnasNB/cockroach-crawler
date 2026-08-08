# Cockroach Crawler public claims checklist

## Release identity

- [ ] `npm view cockroach-crawler@next version dist.integrity` resolves to reviewed prerelease `0.7.0-rc.1` with integrity `sha512-FtieUIKrI1aIuv2QXtoinA/OptW7MEUmM9sf/ZsPO5Mow8Xr45PqInI3SFgjA5gazOWK9iPcWuxOCHtpit2kyA==` and verified provenance.
- [ ] npm `latest` remains `0.6.1`; no copy calls the prerelease stable.
- [ ] A registry-only install passes the doctor, bounded crawl, package exports, and CLI-bin checks.
- [ ] The website, captions, social card, and release links work signed out.

## Supported

- [ ] Explicit public-web crawling works without a provider API key.
- [ ] Public GitHub reads work at public rate limits; optional tokens raise documented limits.
- [ ] Optional `youtube-no-key` uses a separately installed audited `yt-dlp` route for bounded search and metadata.
- [ ] Optional X, Reddit, Facebook, Instagram, LinkedIn, and Xiaohongshu session providers are fixed read-only commands requiring explicit operator login state.
- [ ] Optional providers are separate authority tiers, dry-run setup by default, and never silent fallbacks.
- [ ] Records keep source identity, content hashes, warnings, and request provenance.
- [ ] Local and serverless network guarantees are described separately.
- [ ] Map search is described as ranking fetch-validated entries, not universal
  web search or discovery beyond admitted pages.
- [ ] Regex extraction is described as restricted and bounded.
- [ ] The bundled job queue is described as process-local and non-durable.
- [ ] The proxy gateway is described as one fixed operator-owned integration,
  not a bundled or managed proxy fleet.
- [ ] npm `mcpName`, packaged `server.json`, and release version are identical
  before MCP Registry publication.

## Always qualify

- [ ] No-key access still has provider terms, regional availability, public limits, and changing upstream behavior.
- [ ] A browser session is a sensitive operator-controlled input, not authorization to extract or expose cookies.
- [ ] Browser mode reduces authority but is not a process or JavaScript sandbox.
- [ ] Serverless has no local DNS classification or address pinning.
- [ ] Crawled content is untrusted data and may contain prompt injection.
- [ ] Benchmark numbers apply only to the committed loopback fixture and environment.

## Do not claim

- [ ] universal internet access, universal search, or every-site support;
- [ ] authentication, CAPTCHA, paywall, robots, authorization, or provider-policy bypass;
- [ ] cookie extraction, hidden credential reuse, or provider write operations;
- [ ] SSRF-proof, prompt-injection-proof, safest, fastest, perfect, zero-risk, or universally production-ready operation;
- [ ] that the restricted serverless profile has the local crawler's DNS guarantees; or
- [ ] a partnership, certification, or endorsement without written evidence.

## Community and media

- [ ] The maintainer discloses authorship and follows each community's current rules.
- [ ] No one is asked to upvote, star, review, comment, or coordinate engagement.
- [ ] Terminal output and provider states come from real reviewed artifacts.
- [ ] Images contain no secrets, private paths, browser profiles, account data, or fabricated dashboards.
- [ ] Every video has captions and every image has useful alt text.

If a skeptical reader cannot reproduce a claim from tagged source, a published artifact, an official provider contract, or a clearly scoped benchmark, narrow the claim before launch.
