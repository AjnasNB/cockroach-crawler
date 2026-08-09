# Release checklist

Use this checklist from a clean, reviewed commit. Never publish from a worktree
containing unreviewed changes or credentials. Release `0.7.0` requires
quality-backend, benchmark-integrity, provider/security, packed-consumer, and
exact-artifact approval on the reviewed release commit.

> **Stable decision (9 August 2026):** the maintainer selected `0.7.0` for
> stable API and package availability. The decision does not convert any
> benchmark into a promotion gate or leadership claim. Frozen raw-DOM attempt
> 003 remains rejected and is not part of the shipped runtime. Publication is
> still blocked until the exact reviewed commit, tarball, CI, environment
> approval, provenance, registry, tag, and post-publication checks below pass.

The stable artifact must preserve the reviewed `0.7.0-rc.1` runtime,
dependency graph, and frozen evidence byte-for-byte, apart from approved
version and release metadata. The historical RC paper remains a CC BY 4.0
report about that RC evidence boundary. It neither authorizes nor certifies the
stable software release.

## Frozen 0.7.0 release benchmark

`cockroach-crawler@0.7.0` carries forward the exact source-pinned
observed-development artifact first published in `0.7.0-rc.1`:

| Path | Pages | Precision | Recall | Macro F1 |
| --- | ---: | ---: | ---: | ---: |
| Quality `balanced` | 511 | **0.894101** | **0.926022** | **0.890524** |

The receipt is
`bench/results/wceb-quality-observed-0.7.0.json`, generated at evidence commit
`90825063d447f07345388d040b1428a311109c2b` with embedded package version
`0.7.0`, then packaged byte-for-byte at prerelease commit
`62f270636a019c9bcc617a13fe254640bcd06925`, SHA-256
`a71c884e9521d1cd1c6326dc07c1d1a5c36344244c45d4900a078ae92a8de535`.
The package commit has a valid GitHub signature. `v0.7.0-rc.1` is an annotated
tag without a cryptographic tag signature.
It pins WCEB v1.0 revision `62ff86d12ea72c80c31fb810ff1a724fad687bea`
and uses the exact `trafilatura@0.2.0` quality backend. The 511 pages influenced
development, so this is not untouched held-out confirmation. Publishing this
exact scoped result does not require a 0.90 threshold. Stable promotion is a
maintainer decision about the reviewed API and package availability; evidence
publication still requires retaining the measured values, provenance, and
limitations without rounding or ranking.

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
2. This `0.7.0` promotion uses the workflow's automatic exact-`main` path: merging the reviewed `package.json` version change triggers `publish-npm.yml`. Its verify job runs the full release gate, packs the exact merge commit, records byte size, SHA-256, and npm integrity, and passes those measured values to the publish job. After the protected `npm-publish` environment approval, the publish job checks out that same commit, repacks it, and refuses publication unless all three artifact measurements agree.
3. The strict `workflow_dispatch` path remains available for a deliberate manual publication. Before dispatch, download `package-artifact-<full-commit>` from successful packed-consumer CI, independently verify it, and supply its exact lowercase commit, byte size, SHA-256, and npm integrity as `expected_git_commit`, `expected_size_bytes`, `expected_sha256`, and `expected_integrity`. Strict mode compares those preapproved values both before and after environment approval.
4. Both paths must verify the approved package name and version, use `id-token: write`, use no npm token secret, and have an npm trusted-publisher mapping restricted to `AjnasNB/cockroach-crawler`, `.github/workflows/publish-npm.yml`, and the `npm-publish` environment. The packed-consumer CI job retains the exact Ubuntu-built tarball for 90 days and records its byte size, SHA-256, npm integrity, commit, and npm CLI version for independent review.
5. After publication, verify registry version, dist-tag, exact integrity, attestations, CLI bins, all exports/declarations, and a fresh registry-only install. The workflow publishes the reviewed tarball directly, so verification relies on its digest and Sigstore/SLSA provenance rather than npm's directory-publish-only `gitHead` field.
   npm can expose the package and provenance metadata before the attestations
   endpoint is readable. The workflow therefore retries the final signature
   audit for a bounded propagation window and still fails closed if signatures
   and attestations do not verify.
6. Create an annotated `v0.7.0` tag only at the exact green published commit. Attach only release-owned assets and generate `SHA256SUMS.txt` from exactly those attachments.
7. Mark the GitHub release as stable and list every continuing boundary: no hidden cookie extraction, CAPTCHA or access-control bypass, hosted arbitrary-origin proxy fleet, distributed jobs, operating-system sandbox, or universal provider claim.

## Stable promotion decision record

Promotion evidence includes independent review, clean provider contract tests,
a fresh browser run, a Worker dry-run, the stable-runtime invariant, historical
benchmark verification, and a successful trusted-publishing rehearsal. The
stable package is a newly packed `0.7.0` artifact from the exact reviewed
commit; an RC tarball is never retagged. The decision records API/package
readiness only and makes no universal quality or market-leadership claim.

## Credentials

Prefer npm trusted publishing with provenance. Never use or store a token pasted into chat. Treat every disclosed token as compromised and revoke it. Cloudflare secrets must be entered interactively with Wrangler or the dashboard and must never enter repository variables, configs, logs, or generated launch assets.

Keep release claims tied to the committed tests, benchmark method, provider capability table, and documented browser/network boundaries.

The npm trusted-publisher mapping and `npm-publish` environment approval are external operator gates. Do not fall back to a long-lived npm token if that mapping is absent or incorrect; correct the npm package mapping and rerun the reviewed workflow.
