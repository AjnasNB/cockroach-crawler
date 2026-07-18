# Cockroach Crawler release media

This folder contains the editable Remotion project and locally rendered release assets for the published `0.3.0-alpha.1` prerelease. npm keeps stable `0.2.0` on `latest` and exposes this alpha through `next`.

## Videos

- `renders/cockroach-crawler-main-60s.mp4` — 60-second product overview, 1920×1080, 30 fps. This is an overview, not the end-to-end workflow proof.
- `renders/cockroach-crawler-providers-serverless-30s.mp4` — 30-second provider and serverless boundary cut, 1920×1080, 30 fps.
- `renders/cockroach-crawler-workflow-proof-45s.mp4` — 45-second deterministic end-to-end proof, 1920×1080, 30 fps. It runs the real CLI against an offline loopback fixture, captures an allow case and a fail-closed denial, runs the source registry, and shows the resulting normalized record.
- `renders/cockroach-crawler-vertical-short-30s.mp4` — 30-second YouTube Shorts/Reels cut, 1080×1920, 30 fps. It reuses the verified provider/serverless narration and evidence with vertical safe-zone layouts and burned captions.
- Matching PNG posters, JSON caption timing, SRT, and WebVTT files live beside the renders.

Every terminal line shown in the overview and provider/serverless cut is captured by `remotion/scripts/capture-evidence.mjs` from the current repository. The capture includes `cockroach-sources doctor`, CLI help, the Node test run, the package version, the Git revision state, and the checked-in local benchmark result. The renderer does not invent provider states, test counts, or benchmark scope.

The workflow proof is captured by `remotion/scripts/capture-workflow.mjs`. The script starts a deterministic HTTP fixture on `127.0.0.1`, runs the actual `cockroach-crawl` binary with explicit private-network authority and finite budgets, verifies two SHA-256-tagged results, reruns without that authority to prove a fail-closed denial, and passes the same fixture through `createSourceRegistry`. The capture uses no external network, provider credential, account, model, or fabricated command output.

The benchmark is a synthetic 120-page loopback regression fixture. It is not an industry or global benchmark, competitor ranking, production-capacity result, or SLA.

## Narration

Narration is generated locally with Windows `System.Speech` and the installed `Microsoft David Desktop` voice. No cloud TTS service or Sora asset is used. Each scene is a separate WAV file so the narration can be replaced without changing the visual timing. Burned-in captions and external SRT/VTT files use the same scene scripts.

## Rebuild

From `media/remotion`:

```powershell
npm ci --ignore-scripts
npm run capture
npm run narrate
npm run captions
npm run render:all
npm run validate
```

The main package uses an explicit npm `files` allowlist, so `media/**`, Remotion dependencies, narration, and rendered assets are excluded from the published crawler tarball.
