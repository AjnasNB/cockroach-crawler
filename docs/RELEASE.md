# Release checklist

Use this checklist from a clean, reviewed commit. Never publish from a worktree
containing unreviewed changes or credentials. Release `0.7.0` requires
quality-backend, benchmark-integrity, provider/security, packed-consumer, and
exact-artifact approval on the reviewed release commit.

> **Current hold (8 August 2026):** npm `latest` is 0.6.1, no `v0.7.0` tag or
> package exists, and frozen raw-DOM attempt 003 was rejected after five gate
> violations. Do not execute the publication section until a later immutable
> candidate passes every declared benchmark gate.

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

### Why this file has two triggers

Because the alternative is a second file, which cannot publish. `publish-npm.yml`
accepts:

- `workflow_dispatch` - strict. Version, commit, size, sha256, and integrity are
  stated up front and everything is compared against them. Use this for releases
  that need an explicit approval record.
- `push` to `main` touching `package.json` - automatic when the version changes.
  The verify job measures the artifact, the publish job re-measures and compares
  against it, so the artifact is still pinned between the two jobs.

Both paths run the full release gate, both require the `npm-publish` environment
approval, and both verify the published result against the registry afterwards.

### Other things that cost time here

- **`{ tls: undefined }` is still an own key.** The URL security layer rejects
  unknown options by enumerating own keys, so passing an optional field as
  `undefined` fails exactly like passing a bad one.
- **Do not reproduce the CI tarball locally to fill in dispatch inputs.** Line
  endings and npm version both change the digest. Read the values from the
  verify job summary instead.
- **`dismiss_stale_reviews` is on.** Any push after an approval discards it.
  Freeze a branch once it has been approved.

## Artifact gate

1. Confirm `git status --short` contains only intended release changes and no `.env`, `.npmrc`, browser state, generated Wrangler output, tokens, or downloaded third-party source.
2. Confirm `package.json`, `package-lock.json`, and `src/version.js` use the same version. `test/sources.test.js` enforces the runtime/package pair.
3. Confirm the target is unused with `npm view cockroach-crawler@<version> version`. A new version must return `E404` before publish.
4. Install exactly from the lockfile: `npm ci --ignore-scripts`.
5. Run `npm run release:check`. This includes core/provider/serverless tests, packed external TypeScript consumption, the local regression benchmark, direct-license audit, real Chromium integration, Wrangler dry-run bundle, production vulnerability audit, and package dry-run.
6. Inspect `npm pack --dry-run --json --ignore-scripts`. It must not contain tests, `.env` files, `.npmrc`, browser auth state, generated Worker output/types, launch drafts, or website source.
7. Review `cockroach-sources doctor --json`. Missing social credentials are valid capability states, not release failures. Do not use maintainer credentials merely to make a release claim.
8. Review the Worker bundle output. The serverless entry must not import Node DNS/net/Playwright, must retain the origin allowlist, bearer secret, Cloudflare rate limiter, robots checks, redirect checks, and hard budgets.
9. Require Node 22, 24, 26, Chromium, CodeQL, package, and Worker checks on the exact commit. Require an independent review for security-sensitive releases.
10. Exercise every `0.7.0` subpath from a packed consumer, including
    `cockroach-crawler/quality`, strategies, cache, documents, extractors,
    browser helpers, providers, serverless, server, and MCP. Confirm core and
    serverless import without loading the native quality backend.
11. Build the Docker image, start it with a disposable token and fixed local
    origin, verify health/playground/authenticated crawl, then remove the
    disposable container and token.
12. Confirm browser integration covers screenshot/PDF artifacts, PDF parsing,
    virtual scroll, hooks, Shadow DOM, iframe flattening, and persistent
    profiles without weakening route enforcement.
13. On at least one supported host, verify the exact `trafilatura@0.2.0`
    backend, deterministic quality output, shell/challenge abstention, invalid
    input rejection, and no silent core fallback. Record that published native
    binaries cover Windows x64/ARM64, macOS x64/ARM64, and glibc Linux
    x64/ARM64; Alpine/musl, 32-bit, and other operating systems are unsupported.
14. Run `npm run bench:public:verify` and require all six 0.7.0 public evidence
    files. Confirm the 511-page artifacts say observed development evidence,
    the 1,497-page artifact says development evidence, and every artifact names
    its engine/profile/fail-closed configuration.

## Target 0.7.0 publication after every gate passes

1. Publish a fresh `0.7.0` artifact through the npm trusted-publishing GitHub environment with provenance and `--tag latest`; never move an older tarball onto the stable tag.
2. Download `package-artifact-<full-commit>` from the successful packed-consumer CI job for the exact reviewed `main` commit. Copy the full lowercase 40-character commit, byte size, SHA-256, and npm integrity from that job's summary, then independently verify the downloaded tarball before dispatching `publish-npm.yml`.
3. The publish dispatch must receive those four exact values as `expected_git_commit`, `expected_size_bytes`, `expected_sha256`, and `expected_integrity`. The workflow fails unless the reviewed commit equals the immutable workflow commit and the freshly packed artifact matches every approved value both before and after the `npm-publish` environment approval.
4. The workflow must verify the approved package name and version, use `id-token: write`, use no npm token secret, and have an npm trusted-publisher mapping restricted to `AjnasNB/cockroach-crawler`, `.github/workflows/publish-npm.yml`, and the `npm-publish` environment. The packed-consumer CI job retains the exact Ubuntu-built tarball for 90 days and records its byte size, SHA-256, npm integrity, commit, and npm CLI version for independent review.
5. After publication, verify registry version, dist-tag, exact integrity, attestations, CLI bins, all exports/declarations, and a fresh registry-only install. The workflow publishes the reviewed tarball directly, so verification relies on its digest and Sigstore/SLSA provenance rather than npm's directory-publish-only `gitHead` field.
6. Create an annotated `v0.7.0` tag only at the exact green published commit. Attach only release-owned assets and generate `SHA256SUMS.txt` from exactly those attachments.
7. Mark the GitHub release as stable and list every continuing boundary: no hidden cookie extraction, CAPTCHA or access-control bypass, hosted arbitrary-origin proxy fleet, distributed jobs, operating-system sandbox, or universal provider claim.

## Stable promotion

Promotion evidence must include alpha feedback, an independent security review, clean provider contract tests, a fresh browser run, a Worker dry-run, and a successful trusted-publishing rehearsal. Publish a new stable artifact; never retag an alpha tarball as stable.

## Credentials

Prefer npm trusted publishing with provenance. Never use or store a token pasted into chat. Treat every disclosed token as compromised and revoke it. Cloudflare secrets must be entered interactively with Wrangler or the dashboard and must never enter repository variables, configs, logs, or generated launch assets.

Keep release claims tied to the committed tests, benchmark method, provider capability table, and documented browser/network boundaries.

The npm trusted-publisher mapping and `npm-publish` environment approval are external operator gates. Do not fall back to a long-lived npm token if that mapping is absent or incorrect; correct the npm package mapping and rerun the reviewed workflow.
