# Cockroach Crawler 0.7.0 launch kit

Last verified: 2026-08-08.

> **Prerelease boundary:** npm `latest` is 0.6.2 and reviewed `0.7.0-rc.1` is
> published on npm `next`. Frozen raw-DOM attempt 003 failed five gates. Use
> this kit only for disclosed prerelease discussion; do not claim stable 0.7,
> best crawler, or universal 0.90 precision.

## The one-line story

> Give your AI agent eyes on the web - without giving it the keys to your network.

Cockroach Crawler turns permitted public pages and supported read-only sources into normalized evidence records behind explicit origin, redirect, robots, request, byte, depth, concurrency, and time limits.

## Product shape

1. **Hardened local crawler:** DNS admission and address pinning, bounded redirects, robots policy, extraction, and optional restricted Chromium.
2. **Source registry and router:** public web, GitHub, official provider APIs, explicit capability diagnostics, normalized records, and declared fallback rules.
3. **Optional reach providers:** reviewed no-developer-key YouTube or operator-controlled read-only session providers installed separately and never used as silent fallbacks.
4. **Restricted serverless profile:** small crawls for deployment-configured HTTPS origins, with its weaker DNS boundary stated in the result.
5. **Governed browser host:** structural observe, preview, apply, and submit contracts that can be wrapped by Maqam; it is not a browser engine or sandbox.

## Five-minute proof

```sh
npx -y --package cockroach-crawler@0.7.0-rc.1 cockroach-sources doctor
npx -y --package cockroach-crawler@0.7.0-rc.1 cockroach-crawl https://example.com --max-pages 3 --jsonl
```

Run `cockroach-reach setup` without `--apply` to inspect an optional-provider plan before it changes the machine.

## Launch order

1. Verify npm `next` resolves to `0.7.0-rc.1`, its integrity and provenance match, and `latest` resolves to `0.6.2`.
2. Run the provider doctor and bounded crawl from a clean install.
3. Confirm the website, media, captions, GitHub social card, and every launch link.
4. Publish one personally written Show HN submission while the maintainer can answer questions.
5. Spend the next week on different technical artifacts: SSRF boundary, provider routing, optional reach, browser-host contract, and serverless limitations.
6. Use community-specific discussions only where maintainers permit self-posts. Disclose authorship and ask for a concrete failure fixture, not stars.
7. Use Product Hunt after independent users can install, run the proof, and understand the two network tiers.

## Files

- [Positioning](POSITIONING.md)
- [Show HN facts](SHOW-HN.md)
- [Product Hunt](PRODUCT-HUNT.md)
- [Social and video](SOCIAL-AND-VIDEO.md)
- [Community discussions](COMMUNITIES.md)
- [Technical article](TECHNICAL-ARTICLE.md)
- [Article adaptations](ARTICLE-ADAPTATIONS.md)
- [Media matrix](MEDIA-MATRIX.md)
- [Claims checklist](CLAIMS-CHECKLIST.md)
- [Contributor issues](CONTRIBUTOR-ISSUES.md)

The current npm stable is `0.6.2`. The `0.7.0-rc.1` launch assets are prerelease drafts that must preserve the stated evidence limits.
