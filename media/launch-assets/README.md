# Cockroach Crawler launch visual suite

This directory contains platform-ready PNGs and editable SVG originals for the Cockroach Crawler launch. The visual system extends the website's dark graphite, mint-green, and technical-isometric language. Every scene depicts a real product boundary or output: no robots, insect mascots, stock art, fabricated performance numbers, or universal-safety claims.

## Inventory

| Surface | Files | Dimensions | Publishing hook | Suggested alt text |
| --- | --- | ---: | --- | --- |
| GitHub social preview | `github-social-preview` | 1280 × 640 | Crawling with a boundary. | Cockroach Crawler routes public-web and read-only API inputs through a mechanical boundary gate into normalized records. |
| Product Hunt gallery 01 | `product-hunt-01-two-tiers` | 1270 × 760 | Choose the security boundary before the first request. | Side-by-side diagrams compare the DNS-pinned local tier with the restricted serverless tier and state their different network guarantees. |
| Product Hunt gallery 02 | `product-hunt-02-source-doctor` | 1270 × 760 | Know which sources are ready. | A terminal-like source doctor lists Web, GitHub, YouTube, X API, and Reddit API with visible credential states. |
| Product Hunt gallery 03 | `product-hunt-03-budgets` | 1270 × 760 | Every discovery path spends a budget. | A mechanical console shows hard ceilings for pages, depth, bytes, requests, concurrency, and deadline. |
| Product Hunt thumbnail | `product-hunt-thumbnail` | 240 × 240 | Bounded public-web reach. | A compact mechanical gate icon in the Cockroach Crawler graphite and mint palette. |
| X landscape | `x-landscape` | 1600 × 900 | Give agents reach—with boundaries. | A local crawler gate validates a public URL, rejects a private target, and emits a structured record. |
| X square | `x-square` | 1080 × 1080 | Crawl wider. Stay bounded. | A budget console puts hard limits around pages, depth, bytes, requests, concurrency, and time. |
| LinkedIn | `linkedin` | 1200 × 627 | Reach that names its boundary. | A public source passes into a normalized record that retains source, type, URL, title, text, content hash, and retrieval provenance. |
| Reddit | `reddit` | 1200 × 900 | A crawler that fails closed. | A hardened local gate checks DNS, redirects, robots, and limits before a public page becomes a record. |
| Dev.to cover | `devto-cover` | 1000 × 420 | Building an agent crawler that fails closed. | A compact local crawl gate visual accompanies a technical article about DNS admission, redirects, robots, and budgets. |
| Hashnode cover | `hashnode-cover` | 1600 × 840 | Two crawl tiers. One explicit security model. | Local DNS-pinned and restricted serverless crawler diagrams sit side by side with their documented guarantees. |
| Medium cover | `medium-cover` | 1400 × 788 | From public URL to normalized record. | A public source becomes a normalized record with source, type, URL, content hash, and retrieval provenance. |
| HackerNoon cover | `hackernoon-cover` | 1200 × 630 | Your crawler should know when to stop. | A mechanical budget board visualizes deterministic ceilings and a stop-at-ceiling state. |
| YouTube thumbnail | `youtube-thumbnail` | 1280 × 720 | Public-web reach. Checked first. | A source doctor terminal checks read-only provider readiness before the bounded crawl demo begins. |
| README proof still | `readme-proof-still` | 1600 × 900 | Bound the crawl. Keep the evidence. | Public-web and read-only API inputs enter a boundary gate and leave as normalized, attributable records. |

For every base name, use `svg/<name>.svg` as the editable source and `png/<name>.png` as the publishing asset.

## Capability map

- **Hardened local tier:** DNS answer validation, admitted-address pinning, redirect-hop rechecks, robots handling, and hard crawl budgets.
- **Restricted serverless tier:** deployment-configured HTTPS origins, robots handling, and hard budgets. It explicitly does not claim DNS classification or pinning; stronger isolation needs platform egress controls.
- **Source doctor:** surfaces adapter availability and credential state before dispatch. Provider adapters are read-only and do not fall back to browser cookies.
- **Creator-owned budgets:** pages, depth, bytes, requests, concurrency, and deadline are shown as ceilings, not performance statistics.
- **Normalized records:** source identity, type, title, URL, text, content hash, adapter version, warnings, metadata, and retrieval provenance stay attached to workflow output.

## Rebuild and verify

From the repository root:

```powershell
node media/launch-assets/build-launch-assets.mjs
node media/launch-assets/validate-launch-assets.mjs
```

The builder uses Playwright already present in the repository's development dependencies. It emits one standalone SVG and one exact-size PNG for every manifest entry. `manifest.json` is generated from the same source-of-truth metadata. The validator reads each PNG's IHDR header directly, verifies its dimensions and companion SVG, and rejects missing or unexpected files.

## Publishing notes

- Keep all text inside the provided safe area; do not crop into the headline, proof panel, or bottom source line.
- Preserve the warning language on the serverless slide. Do not replace it with “SSRF-proof,” “private-network safe,” or a universal-safety claim.
- Use the three Product Hunt proof slides in order: boundary choice, source readiness, then budgets.
- The YouTube image is a thumbnail, not evidence that the providers were contacted. The demo and captions are maintained separately under `media/remotion/`.
- When updating a capability, edit `build-launch-assets.mjs`, rebuild both formats, inspect the affected PNG, and rerun validation.
