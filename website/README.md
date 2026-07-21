# Cockroach Crawler website

The documentation and launch site at `cockroachcrawler.com` is generated from
the files in this directory. The public repository contains the portable site
source and verification contracts, not production hosting configuration. The
site does not require a database, analytics SDK, or runtime secret.

## Local verification

```sh
npm ci --ignore-scripts
npm --prefix website run build
npm --prefix website run check
npm --prefix website run check:browser
```

The browser check starts a local server and verifies every public route, image,
single-H1 structure, keyboard skip link, copy feedback, and desktop/mobile
overflow.

The public launch page is generated at `/launch/`. Its channel drafts, claim
checklist, campaign assets, and editable video sources live under
`docs/launch/`, `media/launch-assets/`, and `media/remotion/` in the same
repository so launch copy stays reviewable with the product.

Production hosting, account identifiers, routes, credentials, and environment
configuration are intentionally maintained outside the public repository.

## Content rules

- Published npm capability and source-candidate capability must remain visibly
  separate until registry verification passes.
- Local Node DNS pinning must never be attributed to the serverless profile.
- Benchmark pages must name the workload, environment, sample distribution,
  exclusions, and dirty-source status.
- Provider pages must use official APIs and name credential, quota, transcript,
  and authorization limits.
- Visuals must explain a real crawler boundary or data path; decorative stock
  robots, insects, and unrelated generated imagery do not belong here.
