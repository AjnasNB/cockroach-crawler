# Cockroach Crawler website

The documentation and launch site at `cockroachcrawler.com` is generated from
the files in this directory and deployed as Cloudflare Worker static assets.
The site does not require a database, analytics SDK, or runtime secret.

## Local verification

```sh
npm ci --ignore-scripts
npm --prefix website run build
npm --prefix website run check
npm --prefix website run check:browser
npx wrangler deploy --dry-run --config website/wrangler.jsonc
```

The browser check starts a local server and verifies every public route, image,
single-H1 structure, keyboard skip link, copy feedback, and desktop/mobile
overflow.

The public launch page is generated at `/launch/`. Its channel drafts, claim
checklist, campaign assets, and editable video sources live under
`docs/launch/`, `media/launch-assets/`, and `media/remotion/` in the same
repository so launch copy stays reviewable with the product.

## Production deployment

`.github/workflows/deploy-site.yml` rebuilds and verifies the site after a
website change reaches `main`, then deploys the exact repository content. The
`website-production` GitHub environment must define:

- repository variable `CLOUDFLARE_ACCOUNT_ID`;
- environment secret `CLOUDFLARE_API_TOKEN`, limited to the Cockroach Crawler
  Worker and the `cockroachcrawler.com` zone.

Do not copy a Wrangler OAuth credential or a broad account token into the
repository. Keep required reviewers enabled on the production environment.

The production routes are declared in `website/wrangler.jsonc`. The apex and
`www` DNS records must remain proxied through Cloudflare so the Worker routes can
intercept requests. This route-based cutover leaves the existing origin records
in place for an immediate rollback.

`site-worker.js` redirects plain HTTP to HTTPS with status 308 and adds HSTS on
HTTPS responses. Keep the custom-domain certificates healthy before increasing
the HSTS lifetime or adding the preload directive.

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
