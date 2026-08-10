# Cockroach Crawler 0.8.0-rc.1

This prerelease publishes the opt-in governed browser-automation boundary for
evaluation through npm `next`. Stable npm `latest` remains `0.7.0`.

## Exact capability accounting

- 102 cataloged action contracts across 16 categories.
- 60 built-in handlers.
- 11 handlers that require named trusted host services.
- 71 maximum configured handlers in total.
- 31 actions explicitly unsupported by the shipped backend.
- The same 28 action kinds executed by the integration suite in installed
  Chromium and installed Firefox.

Catalog presence is not runtime support, a handler may still be unavailable
when its exact engine method or trusted service is absent, and the 28-action
integration set is not proof of comprehensive browser coverage.

## Included boundary

The prerelease adds exact-origin isolated sessions, action and effect
allowlists, serial action numbering, deadlines, session expiry, bounded routed
HTTP(S), plain-data output validation, artifact and upload ceilings, popup and
download guards, and ordered upload of 1 to 32 opaque file references with
per-file, per-action, and per-session byte limits.

The installed-engine tests cover both Chromium and Firefox for the same named
action set. They are tests of those installed builds on the CI host, not a
claim about every browser build, operating system, protocol, or deployment.
The exact release lockfile tests Playwright `1.62.1`. Playwright remains an
optional consumer-owned peer with declared range `>=1.48.0 <2`; runtime method
probes may reduce handlers on older compatible builds.

## Explicit unsupported boundary

The release does not claim process launch or remote connection lifecycle, raw
protocol sessions, full handle APIs, tab locks, click-triggered download
persistence, dialog lifecycle, worker evaluation, persistent request mutation,
state loading, general emulation, accessibility trees, tracing, recording,
coverage, heap snapshots, custom selector registration, full HAR or WebSocket
lifecycle, video or screencast, or complete event and target APIs.

Ambiguous or unavailable operations remain visible in the matrix and fail
closed. This is a governed automation prerelease, not a drop-in API replacement
or a superiority claim.

## Install and verify

```bash
npm install cockroach-crawler@0.8.0-rc.1 playwright
npx playwright install chromium firefox
npm run browser-automation:matrix
```

The release keeps the immutable `v0.7.0` commit and tree, historical paper,
and observed-development benchmark bytes unchanged. The carried benchmark is
511 observed-development pages with 0.894101 precision, 0.926022 recall, and
0.890524 macro F1; it is not held-out confirmation or a universal ranking.
