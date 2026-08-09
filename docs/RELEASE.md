# Release checklist

Use this checklist from a clean, reviewed commit. Never publish from a worktree containing unreviewed changes or credentials. Stable `0.6.2` is a documentation-only maintenance release over the immutable `v0.6.1` runtime and requires provider/security, packed-consumer, historical-evidence, maintenance-tree, and exact-artifact approval on the reviewed release commit.

The historical release anchor is exact: annotated tag object
`ff7000579240658bfd99f3def6df4e59e6911b28` peels to commit
`e71ee10f6fd3931b9fd6c09f8a69bf7808d4a316`, whose tree is
`b9008158d90b1b050cad6ab566b44fd794f9c1dd`. The `0.6.2` branch may change only
the paths accepted by `scripts/verify-maintenance-release.mjs`; frozen
benchmark result files are not regenerated or renamed.

## npm trusted publishing: the one thing that will bite you

npm authorises **one workflow filename per package**. The registration lives
in the npm account, not in this repository:

> npmjs.com -> cockroach-crawler -> Settings -> Trusted Publisher
> Organization `AjnasNB`, Repository `cockroach-crawler`,
> Workflow filename `publish-npm.yml`, Environment `npm-publish`

**Every publishing path must therefore live in `publish-npm.yml`.** Adding a
second workflow that runs `npm publish` does not work, and it fails in a way
that sends you looking in the wrong place:

```
npm error code E404
npm error 404 Not Found - PUT https://registry.npmjs.org/cockroach-crawler
npm error 404  The requested resource 'cockroach-crawler@x.y.z' could not be
npm error 404  found or you do not have permission to access it.
```

That is npm rejecting an OIDC token from an unregistered workflow. It is not a
missing package, not a permissions problem on the account, and not a network
fault. The package exists and you own it.

This cost three failed publish attempts during 0.6.0. Two plausible-sounding
diagnoses were investigated and both were wrong:

- **"The workflow filename is untrusted."** Correct, but abandoned too early
  when a second difference appeared.
- **"The npm version is too old for OIDC."** The registered workflow does pin
  `npm@12.0.1`, and the new one did not, which looked like the answer. Pinning
  it changed nothing, because the filename was still unregistered.

The fastest way to settle it is to open the Trusted Publisher page and read
the workflow filename field. If it does not exactly match the workflow that is
failing, that is the whole problem.

### Why this file has one maintenance trigger

The registered `publish-npm.yml` accepts only strict `workflow_dispatch` from
the protected `release/0.6.x` branch for exactly `0.6.2` with `--tag latest`.
There is no package-version push trigger. Before verification and again before
publication, the workflow requires npm `latest` to remain `0.6.1`, binds the
reviewed commit and tarball digests, resolves the annotated `v0.6.1` tag and
tree from a full checkout, and runs the maintenance allowlist gate. The
`npm-publish` environment still requires an independent approving reviewer.

### Other things that cost time here

- **`{ tls: undefined }` is still an own key.** The URL security layer rejects
  unknown options by enumerating own keys, so passing an optional field as
  `undefined` fails exactly like passing a bad one.
- **Do not reproduce the CI tarball locally to fill in dispatch inputs.** Line
  endings and npm version both change the digest. Read the values from the
  verify job summary instead.
- **`dismiss_stale_reviews` is on.** Any push after an approval discards it.
  Freeze a branch once it has been approved.

## Candidate gate

1. Confirm `git status --short` contains only intended release changes and no `.env`, `.npmrc`, browser state, generated Wrangler output, tokens, or downloaded third-party source.
2. Confirm `package.json`, both root lockfile versions, both `server.json` versions, and `src/version.js` all use `0.6.2`. Release tests enforce every identity.
3. Confirm `npm view cockroach-crawler@latest version` is exactly `0.6.1` and `npm view cockroach-crawler@0.6.2 version` returns `E404` before publish.
4. Install exactly from the lockfile: `npm ci --ignore-scripts`.
5. Run `node scripts/verify-maintenance-release.mjs`, `npm run bench:public:verify`, and `npm run release:check`. The historical verifier normalizes only the four exact version-bearing metadata files back to `0.6.1`; because npm omits the root lockfile, the packed verifier falls back only to `bench/public/package-lock-0.6.1.json`, whose bytes must equal the immutable `v0.6.1` lockfile. The full Git gate separately proves the tag object, commit, tree, ancestry, snapshot bytes, and changed-path allowlist.
6. Inspect `npm pack --dry-run --json --ignore-scripts`. It must not contain tests, `.env` files, `.npmrc`, browser auth state, generated Worker output/types, launch drafts, or website source.
7. Review `cockroach-sources doctor --json`. Missing social credentials are valid capability states, not release failures. Do not use maintainer credentials merely to make a release claim.
8. Review the Worker bundle output. The serverless entry must not import Node DNS/net/Playwright, must retain the origin allowlist, bearer secret, Cloudflare rate limiter, robots checks, redirect checks, and hard budgets.
9. Require Node 22, 24, 26, Chromium, CodeQL, package, and Worker checks on the exact protected `release/0.6.x` commit. Require an independent reviewer; self-review is disabled for the publishing environment.
10. Exercise every `0.6.2` subpath from a packed consumer: strategies, cache,
    documents, extractors, browser helpers, providers, server, and MCP.
11. Build the Docker image, start it with a disposable token and fixed local
    origin, verify health/playground/authenticated crawl, then remove the
    disposable container and token.
12. Confirm browser integration covers screenshot/PDF artifacts, PDF parsing,
    virtual scroll, hooks, Shadow DOM, iframe flattening, and persistent
    profiles without weakening route enforcement.

## Stable 0.6.2 maintenance publication

1. Merge only the reviewed allowlisted patch into protected `release/0.6.x`; do not version current `main` and do not modify any frozen benchmark result.
2. Download `package-artifact-<full-commit>` from the successful packed-consumer CI job for the exact reviewed maintenance commit. Copy the full lowercase 40-character commit, byte size, SHA-256, and npm integrity from that job's summary, then independently verify the downloaded tarball before dispatching `publish-npm.yml` from `release/0.6.x`.
3. The publish dispatch must receive those four exact values as `expected_git_commit`, `expected_size_bytes`, `expected_sha256`, and `expected_integrity`. The workflow fails unless the reviewed commit equals the immutable workflow commit and the freshly packed artifact matches every approved value both before and after the `npm-publish` environment approval.
4. The workflow must verify the approved package name and version, use `id-token: write`, use no npm token secret, and have an npm trusted-publisher mapping restricted to `AjnasNB/cockroach-crawler`, `.github/workflows/publish-npm.yml`, and the `npm-publish` environment. The packed-consumer CI job retains the exact Ubuntu-built tarball for 90 days and records its byte size, SHA-256, npm integrity, commit, and npm CLI version for independent review.
5. After publication, verify registry version, dist-tag, exact integrity, attestations, CLI bins, all exports/declarations, and a fresh registry-only install. The workflow publishes the reviewed tarball directly, so verification relies on its digest and Sigstore/SLSA provenance rather than npm's directory-publish-only `gitHead` field.
6. Create an annotated `v0.6.2` tag only at the exact green published commit. Attach only release-owned assets and generate `SHA256SUMS.txt` from exactly those attachments.
7. Mark the GitHub release as stable and list every continuing boundary: no hidden cookie extraction, CAPTCHA or access-control bypass, hosted arbitrary-origin proxy fleet, distributed jobs, operating-system sandbox, or universal provider claim.

## Stable promotion

Promotion evidence must include alpha feedback, an independent security review, clean provider contract tests, a fresh browser run, a Worker dry-run, and a successful trusted-publishing rehearsal. Publish a new stable artifact; never retag an alpha tarball as stable.

## Credentials

Prefer npm trusted publishing with provenance. Never use or store a token pasted into chat. Treat every disclosed token as compromised and revoke it. Cloudflare secrets must be entered interactively with Wrangler or the dashboard and must never enter repository variables, configs, logs, or generated launch assets.

Keep release claims tied to the committed tests, benchmark method, provider capability table, and documented browser/network boundaries.

The npm trusted-publisher mapping and `npm-publish` environment approval are external operator gates. Do not fall back to a long-lived npm token if that mapping is absent or incorrect; correct the npm package mapping and rerun the reviewed workflow.
