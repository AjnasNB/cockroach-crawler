# Release checklist

Use this checklist from a clean, reviewed commit. Never publish from a worktree containing unreviewed changes or credentials. Stable `0.3.0` requires the provider/security feedback and exact-artifact approval tracked by the release issue.

## Candidate gate

1. Confirm `git status --short` contains only intended release changes and no `.env`, `.npmrc`, browser state, generated Wrangler output, tokens, or downloaded third-party source.
2. Confirm `package.json`, `package-lock.json`, and `src/version.js` use the same version. `test/sources.test.js` enforces the runtime/package pair.
3. Confirm the target is unused with `npm view cockroach-crawler@<version> version`. A new version must return `E404` before publish.
4. Install exactly from the lockfile: `npm ci --ignore-scripts`.
5. Run `npm run release:check`. This includes core/provider/serverless tests, packed external TypeScript consumption, the local regression benchmark, direct-license audit, real Chromium integration, Wrangler dry-run bundle, production vulnerability audit, and package dry-run.
6. Inspect `npm pack --dry-run --json --ignore-scripts`. It must not contain tests, `.env` files, `.npmrc`, browser auth state, generated Worker output/types, launch drafts, or website source.
7. Review `cockroach-sources doctor --json`. Missing social credentials are valid capability states, not release failures. Do not use maintainer credentials merely to make a release claim.
8. Review the Worker bundle output. The serverless entry must not import Node DNS/net/Playwright, must retain the origin allowlist, bearer secret, Cloudflare rate limiter, robots checks, redirect checks, and hard budgets.
9. Require Node 22, 24, 26, Chromium, CodeQL, package, and Worker checks on the exact commit. Require an independent review for security-sensitive releases.

## Stable 0.3.0 publication

1. Publish a fresh `0.3.0` artifact through the npm trusted-publishing GitHub environment with provenance and `--tag latest`; never move an alpha tarball onto the stable tag.
2. Download `package-artifact-<full-commit>` from the successful packed-consumer CI job for the exact reviewed `main` commit. Copy the full lowercase 40-character commit, byte size, SHA-256, and npm integrity from that job's summary, then independently verify the downloaded tarball before dispatching `publish-npm.yml`.
3. The publish dispatch must receive those four exact values as `expected_git_commit`, `expected_size_bytes`, `expected_sha256`, and `expected_integrity`. The workflow fails unless the reviewed commit equals the immutable workflow commit and the freshly packed artifact matches every approved value both before and after the `npm-publish` environment approval.
4. The workflow must verify the approved package name and version, use `id-token: write`, use no npm token secret, and have an npm trusted-publisher mapping restricted to `AjnasNB/cockroach-crawler`, `.github/workflows/publish-npm.yml`, and the `npm-publish` environment. The packed-consumer CI job retains the exact Ubuntu-built tarball for 90 days and records its byte size, SHA-256, npm integrity, commit, and npm CLI version for independent review.
5. After publication, verify registry version, dist-tag, exact integrity, attestations, CLI bins, all exports/declarations, and a fresh registry-only install. The workflow publishes the reviewed tarball directly, so verification relies on its digest and Sigstore/SLSA provenance rather than npm's directory-publish-only `gitHead` field.
6. Create an annotated `v0.3.0` tag only at the exact green published commit. Attach only release-owned assets and generate `SHA256SUMS.txt` from exactly those attachments.
7. Mark the GitHub release as stable and list every continuing boundary: no hidden cookie extraction, CAPTCHA or access-control bypass, hosted arbitrary-origin API, distributed jobs, operating-system sandbox, or universal provider claim.

## Stable promotion

Promotion evidence must include alpha feedback, an independent security review, clean provider contract tests, a fresh browser run, a Worker dry-run, and a successful trusted-publishing rehearsal. Publish a new stable artifact; never retag an alpha tarball as stable.

## Credentials

Prefer npm trusted publishing with provenance. Never use or store a token pasted into chat. Treat every disclosed token as compromised and revoke it. Cloudflare secrets must be entered interactively with Wrangler or the dashboard and must never enter repository variables, configs, logs, or generated launch assets.

Keep release claims tied to the committed tests, benchmark method, provider capability table, and documented browser/network boundaries.

The npm trusted-publisher mapping and `npm-publish` environment approval are external operator gates. Do not fall back to a long-lived npm token if that mapping is absent or incorrect; correct the npm package mapping and rerun the reviewed workflow.
