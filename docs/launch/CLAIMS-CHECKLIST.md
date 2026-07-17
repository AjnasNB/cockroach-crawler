# Credibility and claims checklist

Run this checklist against every release note, page, screenshot, video, article, and social post. One unchecked blocking item stops publication.

## Version and availability

- [ ] The version shown in copy matches `package.json`, `package-lock.json`, `src/version.js`, the Git tag, GitHub release, and npm.
- [ ] `npm view cockroach-crawler@0.3.0-alpha.1 version dist.integrity dist.attestations` resolves to the reviewed tarball and trusted-publishing provenance.
- [ ] Install commands were tested from a clean registry-only directory.
- [ ] Both CLI bins and all four exports were tested from the published package.
- [ ] The site and demo load without authentication in a signed-out browser.
- [ ] “Live,” “released,” and “published” appear only after those checks pass.

## Source capabilities

- [ ] Public web is described as explicit URL crawling, not search.
- [ ] GitHub unauthenticated access is described with rate-limit caveats.
- [ ] YouTube without a key is described as known-video oEmbed metadata only.
- [ ] YouTube transcripts are described as not implemented.
- [ ] X is described as requiring approved official API v2 bearer access.
- [ ] Reddit is described as requiring application-only OAuth and a contact-aware user agent.
- [ ] No provider is described as working merely because a mock fixture passes.
- [ ] Provider terms, quotas, pricing, and account approval remain external constraints.
- [ ] Read-only means no post, comment, like, follow, edit, or delete operation.

## Local vs serverless boundary

- [ ] DNS validation and pinning are attributed only to the hardened local crawler.
- [ ] Serverless is described as deployment-configured, operator-owned/trusted HTTPS allowlist-only.
- [ ] Serverless limitations include no DNS resolution/classification/pinning, no browser, no authenticated providers, and no request-selected arbitrary origins; infrastructure egress controls are recommended.
- [ ] Browser mode is described as defense in depth, not a process or JavaScript sandbox.
- [ ] Deployment isolation and infrastructure egress remain operator responsibilities.
- [ ] Robots failures and true absence are described accurately.
- [ ] Sensitive-path filtering is described as a heuristic, not authorization.

## Security and privacy

- [ ] No secret is present in source, Git history, screenshots, video frames, captions, logs, issue bodies, release assets, shell history, or npm config.
- [ ] Any token disclosed in chat or logs has been revoked and is not used.
- [ ] npm publication uses trusted publishing/provenance rather than a pasted token.
- [ ] Credentials are described as environment-held and are not shown as CLI flags.
- [ ] Crawled content is described as untrusted and potentially prompt-injecting.
- [ ] The project does not claim to bypass authentication, paywalls, CAPTCHA, robots, or access control.
- [ ] Storage-state files are identified as sensitive operator inputs.

## Testing and benchmarks

- [ ] Public test counts link to the exact green commit/run.
- [ ] Local results are labeled local and dated.
- [ ] The real Chromium suite is separate from mocked unit tests.
- [ ] Provider contract fixtures are not presented as live-provider end-to-end tests.
- [ ] Benchmark claims include hardware, OS, Node version, fixture, warmup, samples, statistic, interval/variance, raw output, and commit.
- [ ] No benchmark is called a global standard, certification, SLA, capacity result, or universal competitor ranking.
- [ ] No “fastest,” “safest,” “best,” “perfect,” “unstoppable,” “zero risk,” or “production ready for everyone” language appears.

## Compatibility and provenance claims

- [ ] Every advertised provider and runtime capability has a linked implementation or test.
- [ ] No partnership, certification, endorsement, or compatibility claim is implied without written evidence.
- [ ] Third-party code, assets, fonts, audio, and fixtures have reviewed licenses and attribution where required.
- [ ] Vendored or adapted material records its exact source revision, license, modifications, and notices.

## Media integrity

- [ ] Terminal output comes from a deterministic real command, not a fabricated mockup.
- [ ] Provider status colors match the exact status text and remain understandable without color.
- [ ] 3D visuals map to documented product behavior and do not depict unsupported features.
- [ ] Text, logos, commands, and version numbers are overlays, not hallucinated image-generation text.
- [ ] Captions match narration and include every material limitation spoken in the video.
- [ ] Alt text explains the diagram or proof, not its aesthetic.
- [ ] All asset dimensions and compression were checked on the destination platform.

## Community conduct

- [ ] Posts match the target community's current rules.
- [ ] A maintainer is available to answer questions after submission.
- [ ] No vote, upvote, star, review, or comment manipulation is requested.
- [ ] The same copy is not spammed across unrelated communities.
- [ ] Criticism is answered with evidence, limitations, or a scoped issue—not an inflated promise.
- [ ] User counts, logos, testimonials, quotes, stars, forks, and adoption metrics are real, current, and linked.

## Final blocking question

Can a skeptical reader reproduce every factual claim from the tagged source, green checks, official provider behavior, published artifact, or a clearly labeled local result?

If not, narrow the claim or add the missing evidence before release.
