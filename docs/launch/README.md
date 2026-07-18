# Cockroach Crawler 0.3.0-alpha.1 launch kit

This directory contains review-ready launch copy for the `0.3.0-alpha.1` candidate. It is a working kit, not evidence that the alpha has been published or deployed.

## One-sentence definition

Cockroach Crawler gives agent workflows bounded, read-only access to public web pages and selected official source APIs, with a hardened local crawler for stronger network controls and a smaller allowlist-first serverless crawler for operator-owned or independently trusted HTTPS origins.

## The honest product shape

There are two crawler tiers and one source-adapter layer:

1. **Hardened local crawler.** The Node.js API and CLI validate complete DNS answers, pin each HTTP redirect hop to the validated address, fail closed when robots policy cannot be verified, and apply explicit origin, request, byte, depth, concurrency, redirect, and time budgets. Optional Playwright rendering remains a trusted-operator feature and is not a process sandbox.
2. **Allowlist-first serverless crawler.** `cockroach-crawler/serverless` crawls bounded HTML from 1–32 deployment-configured HTTPS origins. It checks every redirect against the allowlist and robots policy, but deliberately reports that it has no DNS resolution/pinning, browser mode, authenticated providers, or request-selected arbitrary-origin crawling.
3. **Official read-only source adapters.** `cockroach-crawler/sources` normalizes web, GitHub, YouTube, X, and Reddit records. Exact availability depends on the provider and credentials; run `cockroach-sources doctor` before making a capability claim.

## Current unauthenticated source state

| Source | Search | Read | What works without credentials |
| --- | --- | --- | --- |
| Public web | No | Yes | Explicit URLs through the hardened crawler |
| GitHub | Yes | Yes | Public REST search and repository reads at GitHub's unauthenticated rate limit |
| YouTube | No | Partial | Public oEmbed metadata for a known video URL or ID; no transcript |
| X | No | No | Official X API v2 bearer token required |
| Reddit | No | No | Application-only OAuth credentials and a contact-aware user agent required |

Credentialed access is read-only in this release. The CLI reads credentials from environment variables and never accepts them as command-line flags.

## Public links and release variables

Stable links:

- Repository: <https://github.com/AjnasNB/cockroach-crawler>
- npm package: <https://www.npmjs.com/package/cockroach-crawler>
- Planned product site: <https://cockroachcrawler.com/>

Replace these variables only after the target exists and has been tested:

- `[RELEASE_URL]`: GitHub release for the exact reviewed tag
- `[DEMO_URL]`: stable, captioned demo video
- `[WORKFLOW_PROOF_URL]`: 45-second real offline CLI workflow proof
- `[CI_URL]`: green workflow run for the tagged commit
- `[BENCHMARK_URL]`: reproducible benchmark methodology and raw result, if cited
- `[CANONICAL_ARTICLE_URL]`: primary article URL used by syndicated editions

## Files in this kit

- [POSITIONING.md](./POSITIONING.md): message hierarchy, audience, examples, comparisons, and FAQ.
- [SHOW-HN.md](./SHOW-HN.md): title, submission body, first comment, and response bank.
- [PRODUCT-HUNT.md](./PRODUCT-HUNT.md): listing copy, maker comment, gallery sequence, and launch-day prompts.
- [TECHNICAL-ARTICLE.md](./TECHNICAL-ARTICLE.md): canonical long-form article.
- [ARTICLE-ADAPTATIONS.md](./ARTICLE-ADAPTATIONS.md): Dev.to, Hashnode, Medium, HackerNoon, and LinkedIn packaging.
- [COMMUNITIES.md](./COMMUNITIES.md): Reddit, Lobsters, and Indie Hackers posts.
- [SOCIAL-AND-VIDEO.md](./SOCIAL-AND-VIDEO.md): X thread and YouTube copy.
- [RELEASE-NOTES.md](./RELEASE-NOTES.md): GitHub and npm release text for the alpha.
- [ROADMAP.md](./ROADMAP.md): public 30/60/90-day roadmap with exit criteria.
- [MEDIA-MATRIX.md](./MEDIA-MATRIX.md): platform sizes, shot list, hooks, captions, and product-specific visual direction.
- [CONTRIBUTOR-ISSUES.md](./CONTRIBUTOR-ISSUES.md): issue backlog designed for real contribution.
- [CLAIMS-CHECKLIST.md](./CLAIMS-CHECKLIST.md): factual, security, release, and asset preflight.

## Open-source contribution path

The launch should invite verification, not generic star requests. The current
credential-free entry point is [issue #20: validate successful GitHub payload
shapes](https://github.com/AjnasNB/cockroach-crawler/issues/20). It is a
sub-issue of the completed GitHub error-contract work in #8 and uses synthetic
Fetch responses only.

Contributor flow:

1. Comment on the issue before starting so work is not duplicated.
2. Fork the repository and create a purpose-named branch such as
   `test/github-payload-shapes`.
3. Add the failing deterministic fixture, then the smallest implementation.
4. Run `npm ci --ignore-scripts` and `npm run release:check`.
5. Open a pull request with the exact commit, Node version, commands, results,
   limitations, and any provenance notes. A maintainer reviews and merges it.

More maintained entry points are available through the
[`good first issue`](https://github.com/AjnasNB/cockroach-crawler/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
and [`help wanted`](https://github.com/AjnasNB/cockroach-crawler/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22)
filters. Do not include credentials, private payloads, cookies, or account data
in issues, fixtures, screenshots, recordings, or pull requests.

## Required release order

1. Review and merge the implementation through the repository's normal controls.
2. Run the full release gate from a clean checkout, including the real Chromium suite and packed-consumer type check.
3. Publish the exact reviewed artifact using npm trusted publishing and provenance.
4. Verify registry integrity, trusted-publishing attestations, exports, CLI bins, and a registry-only install.
5. Create the GitHub release at the same commit.
6. Deploy and smoke-test the site, then replace launch variables.
7. Publish the technical article before or with the launch so community posts can link to substance rather than a bare announcement.
8. Submit Show HN only when a visitor can immediately install, inspect, and run the product without signup.

Do not use a disclosed npm token. Revoke it and use the repository's trusted-publishing workflow.
