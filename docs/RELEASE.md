# Release checklist

Use this checklist from a clean, reviewed commit. Never publish from a worktree containing unreviewed changes or credentials. Do not publish a stable `0.3.0` until the prerelease has received provider/security feedback.

## Candidate gate

1. Confirm `git status --short` contains only intended release changes and no `.env`, `.npmrc`, browser state, generated Wrangler output, tokens, or downloaded third-party source.
2. Confirm `package.json`, `package-lock.json`, and `src/version.js` use the same version. `test/sources.test.js` enforces the runtime/package pair.
3. Confirm the target is unused with `npm view cockroach-crawler@<version> version`. A new version must return `E404` before publish.
4. Install exactly from the lockfile: `npm ci --ignore-scripts`.
5. Run `npm run release:check`. This includes core/provider/serverless tests, packed external TypeScript consumption, the local regression benchmark, direct-license audit, real Chromium integration, Wrangler dry-run bundle, production vulnerability audit, and package dry-run.
6. Inspect `npm pack --dry-run --json --ignore-scripts`. It must not contain tests, `.env` files, `.npmrc`, browser auth state, generated Worker output/types, launch drafts, or website source.
7. Review `cockroach-sources doctor --json`. Missing social credentials are valid capability states, not release failures. Do not use maintainer credentials merely to make a release claim.
8. Review the Worker bundle output. The serverless entry must not import Node DNS/net/Playwright, must retain the origin allowlist, bearer secret, Cloudflare rate limiter, robots checks, redirect checks, and hard budgets.
9. Require Node 20.18.1, 22, 24, Chromium, CodeQL, package, and Worker checks on the exact commit. Require an independent review for security-sensitive releases.

## Prerelease publication

1. Publish `0.3.0-alpha.1` through an npm trusted-publishing GitHub environment with provenance and `--tag next`; keep `latest` on stable `0.2.0`.
2. The workflow must verify the approved package name, version, commit, tarball SHA-256, and integrity before its approval boundary. It must use `id-token: write`, no npm token secret, and an npm trusted-publisher mapping restricted to this repository/workflow/environment.
3. After publication, verify registry version, dist-tag, exact integrity, attestations, CLI bins, all exports/declarations, and a fresh registry-only install. The workflow publishes the reviewed tarball directly, so verification relies on its digest and Sigstore/SLSA provenance rather than npm's directory-publish-only `gitHead` field.
4. Create an annotated `v0.3.0-alpha.1` tag only at the exact green published commit. Attach only release-owned assets and generate `SHA256SUMS.txt` from exactly those attachments.
5. Mark the GitHub release as prerelease and list every unimplemented capability: no transcript adapter, no unofficial/session scraping, no hosted arbitrary-origin API, no distributed jobs, and no competitor-parity claim.

## Stable promotion

Promote to stable only after alpha feedback, an independent security review, clean provider contract tests, a fresh browser run, a Worker dry-run, and a successful trusted-publishing rehearsal. Publish a new stable artifact; never retag an alpha tarball as stable.

## Credentials

Prefer npm trusted publishing with provenance. Never use or store a token pasted into chat. Treat every disclosed token as compromised and revoke it. Cloudflare secrets must be entered interactively with Wrangler or the dashboard and must never enter repository variables, configs, logs, or generated launch assets.

Keep release claims tied to the committed tests, benchmark method, provider capability table, and documented browser/network boundaries.
