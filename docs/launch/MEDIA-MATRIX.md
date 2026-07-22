# Media size, hook, and content matrix

## Visual rule

Every asset must explain a real Cockroach Crawler concept. Use an industrial 3D “inspection rover” or “network gate” visual language only when its parts map to product behavior. Avoid generic humanoid robots, random cockroaches, neon brains, floating dashboards, fake command output, provider logos inside generated art, or decorative 3D objects with no explanatory role.

Provider marks, terminal text, version numbers, and factual labels should be added as vector/HTML/Remotion overlays after image generation so they remain accurate and readable.

## Asset matrix

| Surface | Canvas | Safe area / duration | Hook | Required content |
| --- | --- | --- | --- | --- |
| Website hero | 1600×1000 | Keep subject in central 80% | “One read boundary. Two honest runtimes.” | Mechanical gate with local pinned path and serverless allowlisted path |
| Open Graph | 1200×630 | 80 px edge safe area | “Bounded web reads for agent tools” | Product name, two-tier diagram, no tiny terminal text |
| GitHub social preview | 1280×640 | 64 px edge safe area | “Local crawler • source doctor • serverless tier” | Three exact product pillars |
| Product Hunt gallery | 1270×760 | 70 px edge safe area | One proof per slide | Three-slide sequence from PRODUCT-HUNT.md |
| Product Hunt thumbnail | 240×240 | Legible at 60 px | Mechanical “C” gate mark | No text beyond the mark |
| X landscape | 1600×900 | Central 1400×760 | “Ask the environment before the source” | Real doctor status matrix |
| X square | 1080×1080 | 90 px edge safe area | “Model input can narrow, never widen” | Creator limit ring around request |
| LinkedIn landscape | 1200×627 | 70 px edge safe area | “Web access is four permissions” | Destination, budget, browser, credentials |
| Reddit image | 1200×900 | 60 px edge safe area | “What the stable release actually supports” | Exact provider capability matrix |
| Dev.to cover | 1000×420 | Title inside central 760×300 | “Two network boundaries, not one” | Local vs serverless split |
| Hashnode cover | 1600×840 | 100 px edge safe area | Same as canonical article | Local vs serverless split |
| Medium cover | 1400×788 | 100 px edge safe area | “Your agent's web tool is a boundary” | One controlled request entering a gate |
| HackerNoon lead | 1200×630 | 80 px edge safe area | “SSRF boundary, not just a prompt” | DNS/redirect path illustration |
| YouTube thumbnail | 1280×720 | Right 40% clear of timestamp | “2 CRAWLER BOUNDARIES” | Left: title; right: split mechanical path |
| YouTube overview | 1920×1080 · 60s | 90 px title safe; 120 px caption safe | “Bounded crawling. Verifiable output.” | Local boundary, source doctor, serverless limits, test evidence, install status |
| Workflow proof | 1920×1080 · 45s | 90 px title safe; 120 px caption safe | Actual command to actual record | Offline loopback CLI allow/deny flow plus normalized record |
| Provider/serverless cut | 1920×1080 · 30s | 90 px title safe; 120 px caption safe | “No hidden credential fallback.” | Exact provider states and restricted Worker boundary |
| YouTube Short / Reels | 1080×1920 · 30s | Keep captions above bottom UI | “Two deliberate surfaces.” | Vertical local/serverless/provider story using the same captured evidence |
| README still | 1600×900 | Must work at 720 px width | “Capability report before request” | Actual deterministic `doctor` output |

Platform specifications can change. Recheck each upload surface before final export.

## Product-specific 3D concepts

### Hero: dual-path inspection gate

A dark graphite inspection machine receives one luminous document token. The left path passes through three visible rings—DNS, origin, and budget—before reaching a green output tray. The right path passes through a smaller transparent HTTPS allowlist gate and terminates before the DNS ring. Every mechanical element has a product meaning. No text is baked into the render.

**Overlay labels:** Hardened local / Allowlist serverless / Validated destination / Exact budget / Normalized record.

**Alt text:** A mechanical crawler gate splits one document request into a DNS-pinned local path and a smaller allowlisted serverless path.

### Source doctor: five physical ports

Five read-only input ports feed a common record cartridge. Web and GitHub show green mechanical indicators, YouTube amber, X and Reddit closed gray. Credentials are represented as external keys owned by the operator, not embedded in the machine.

**Overlay labels:** Web ready / GitHub ready / YouTube partial / X credentials / Reddit credentials.

**Alt text:** Five source ports show the current no-credential capability state before records enter one normalized output.

### Creator policy: nested limit rings

An untrusted request token sits inside fixed concentric steel rings labeled in the overlay: origin, pages, requests, bytes, depth, time. A smaller request can pass; a larger request cannot expand the rings.

**Alt text:** Fixed creator-owned rings limit an agent request by origin, pages, requests, bytes, depth, and time.

### Provenance cartridge

A retrieved page becomes a transparent record cartridge with five physical facets: source URL, retrieved time, adapter version, content hash, and authenticated flag. Do not imply cryptographic authenticity of the source content; the hash is for content identity, not truth.

## Delivered video suite

### 60-second overview

`media/remotion/renders/cockroach-crawler-main-60s.mp4`

| Time | Scene |
| --- | --- |
| 00:00 | Bounded public-web evidence path |
| 00:10 | Hardened local destination, DNS, redirect, robots, and budget checks |
| 00:20 | Captured credential-free source-doctor states |
| 00:30 | Restricted serverless allowlist, secret, rate limit, and no-DNS-pinning boundary |
| 00:40 | Complete local Node suite plus project-local 120-page regression disclaimer |
| 00:50 | Stable install and optional-provider review call to action |

This is a product overview built from captured repository evidence. It is not the end-to-end command proof and does not claim live authenticated provider calls.

### 45-second end-to-end proof

`media/remotion/renders/cockroach-crawler-workflow-proof-45s.mp4`

The proof starts an offline loopback fixture, runs the real CLI with exact budgets and explicit loopback authority, returns two structured pages, reruns without private-network authority to show a zero-page denial, reports the credential-free doctor state, and converts the same crawl into a normalized source record. No provider account, external network request, model call, or fabricated terminal output is used.

### 30-second horizontal and vertical cuts

- `media/remotion/renders/cockroach-crawler-providers-serverless-30s.mp4`
- `media/remotion/renders/cockroach-crawler-vertical-short-30s.mp4`

Both use the same truthful provider/serverless narration. The vertical render is a separate 1080×1920 composition, not a crop of the horizontal file.

## Caption and audio requirements

- Burn readable captions into social cuts; include a separate WebVTT track for YouTube and the website player.
- Use sentence case, at most two caption lines, and approximately 32–42 characters per line.
- Narration must match the capability manifest and the exact evidence shown on screen.
- Record terminal output from deterministic local fixtures. Do not expose environment variables, home paths, access tokens, cookies, or browser storage state.
- Keep music at least 18 dB below speech and license every audio asset for commercial reuse.
- Provide a silent-readable version: every claim must remain understandable from titles, diagrams, and captions.

## Export names

```text
cockroach-crawler-0.3.0-hero-1600x1000.webp
cockroach-crawler-0.3.0-og-1200x630.png
cockroach-crawler-0.3.0-github-1280x640.png
cockroach-crawler-0.3.0-product-hunt-01-1270x760.png
cockroach-crawler-main-60s.mp4
captions-cockroach-crawler-main-60s-en.vtt
cockroach-crawler-workflow-proof-45s.mp4
captions-cockroach-crawler-workflow-proof-45s-en.vtt
cockroach-crawler-providers-serverless-30s.mp4
cockroach-crawler-vertical-short-30s.mp4
```
