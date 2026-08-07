# Cockroach Browser handoff

Cockroach Crawler and Cockroach Browser have separate jobs and separate
authority.

| Boundary | Cockroach Crawler | Cockroach Browser |
| --- | --- | --- |
| Primary job | Discover public pages and retain static, fetch-validated evidence | Perform authorized rendering, interaction, snapshots, and browser evidence |
| Input authority | Explicit seeds, origins, crawl policy, and finite crawl budgets | One explicit target URL, explicit allowed origins, browser action/effect policy, and finite browser budgets |
| State | Public response data, links, hashes, failures, and crawl provenance | Browser sessions, profiles, cookies, authenticated page state, interactive references, and browser receipts |
| Must never receive | Browser profile paths, cookies, storage state, daemon tokens, site credentials, or authenticated browser state | An unreviewed bulk crawl result presented as interaction authority |

The handoff is a small value object, not shared browser state:

```json
{
  "targetUrl": "https://example.com/",
  "allowedOrigins": ["https://example.com"],
  "budget": {
    "maxActions": 10,
    "maxDownloadBytes": 1024,
    "maxDurationMs": 120000,
    "maxEvidenceBytes": 8388608,
    "maxSnapshotChars": 50000,
    "maxTabs": 1,
    "maxUploadBytes": 1024
  }
}
```

The host chooses the exact target from Cockroach Crawler's fetch-validated map.
Of the crawler-owned data, only the selected URL, its explicit origin, and the
finite browser budget cross into browser orchestration. The host independently
adds the browser purpose and action/effect policy. Static crawl evidence stays
with the crawler; browser snapshots and receipts stay with the browser.

## Separate packages and licenses

`cockroach-crawler` remains an MIT package. The public
[`cockroach-browser@0.1.0`](https://www.npmjs.com/package/cockroach-browser/v/0.1.0)
runtime is a separate `AGPL-3.0-or-later` package and process. It is not a
runtime, peer, optional, or development dependency of Cockroach Crawler, and no
Cockroach Browser source is copied or bundled here.

Installing or operating Cockroach Browser is an independent deployment choice.
Review its license and [security documentation](https://cockroachbrowser.com/docs/security/)
before use. The example below talks to its authenticated loopback daemon over
the documented HTTP API, so the crawler package does not acquire browser
lifecycle, profile, credential, or interaction authority.

## Runnable explicit handoff

The source-checkout example performs four visible steps:

1. Cockroach Crawler builds a bounded static map with browser mode absent.
2. The host requires an exact `--target` that appears in that fetched map.
3. The host creates the minimal URL/origin/budget handoff shown above.
4. Only then does the host read the browser daemon token and create a separate
   browser session. The token is used only in the daemon request header.

Start Cockroach Browser separately. These commands do not add it to the
Cockroach Crawler dependency graph:

```bash
npx -y cockroach-browser@0.1.0 setup
npx -y cockroach-browser@0.1.0 serve \
  --host 127.0.0.1 \
  --port 43110 \
  --root .cockroach-browser \
  --token-file .cockroach-browser/auth-token
```

In another terminal, first inspect a dry run from a Cockroach Crawler source
checkout:

```bash
node examples/cockroach-browser-handoff.mjs \
  --seed https://example.com/ \
  --target https://example.com/ \
  --origin https://example.com \
  --purpose "Capture authorized interactive evidence" \
  --dry-run
```

Remove `--dry-run` and provide the daemon token file only after reviewing the
printed target, origins, and budgets:

```bash
node examples/cockroach-browser-handoff.mjs \
  --seed https://example.com/ \
  --target https://example.com/ \
  --origin https://example.com \
  --purpose "Capture authorized interactive evidence" \
  --token-file .cockroach-browser/auth-token
```

The example creates a read-only browser evidence session and requests one
semantic snapshot. It does not select a profile, read or write cookies, import
storage state, enable uploads or downloads, or enable the daemon's raw action
route. Broader interactive actions belong in the browser host after an
independent policy and approval review; they must not be smuggled into crawler
options.

## Authority rules

- Discovery does not authorize interaction. The host must select one exact URL
  that Cockroach Crawler actually fetched.
- A crawler origin allowlist does not silently become browser authority. The
  handoff repeats the exact browser origins for review.
- Browser daemon authentication is not website authentication. Neither the
  daemon token nor website credentials enter `mapSite`, crawler callbacks,
  crawler evidence, logs, or failures.
- Browser profiles, cookies, storage state, secret references, and authenticated
  page state never flow through Cockroach Crawler in either direction.
- Cockroach Crawler's DNS-pinned transport does not govern a separate Cockroach
  Browser session. Each runtime enforces and reports its own network boundary,
  budgets, failures, and evidence.
- Maqam governance applies only when the real browser operation is routed
  through the installed Maqam adapter and verified authority callbacks. This
  direct loopback example does not claim Maqam governance.

The regression tests keep the handoff schema exact, reject unknown
authority-bearing fields, verify that browser secrets never enter crawler
options, assert that `cockroach-browser` remains outside every dependency
section and lockfile package, and pin the public version/license statements
above.
