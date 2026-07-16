# Release checklist

Use this checklist from a clean, reviewed commit. Never publish from a worktree containing unreviewed changes or credentials.

1. Confirm `git status --short` contains only the intended release changes.
2. Confirm package and lockfile versions match and the target version does not already exist: `npm view cockroach-crawler@0.2.0 version` should return `E404` before the first publish.
3. Install exactly from the lockfile: `npm ci --ignore-scripts`.
4. Run `npm test`, `npm run test:types`, `npm run bench`, `npm run audit:licenses`, and `npm audit --omit=dev --audit-level=high`.
5. Install the pinned Chromium build with `npx playwright install chromium`, then run `npm run test:browser`.
6. Inspect `npm pack --dry-run --json --ignore-scripts`; only the intended runtime, declaration, license, security, changelog, provenance/release, README, and logo files should appear.
7. Push the reviewed commit and require the Node 20.18.1/22/24 and Chromium CI jobs to pass.
8. Create an annotated `v0.2.0` tag at the exact green commit and push the tag.
9. Prefer npm trusted publishing with provenance from GitHub Actions. If a token is unavoidable, use a newly issued, short-lived granular token from the environment; never paste it into chat/logs or use a checked-in `.npmrc`. Treat any disclosed token as compromised and revoke it before continuing.
10. Publish with public access, verify npm `gitHead`, integrity, author, exports, declarations, CLI bins, and a fresh registry-only runtime/TypeScript install.
11. Create release notes from `CHANGELOG.md`. Deprecate an older release only when a concrete migration or security reason exists.

Do not call a release perfect. Record untested integrations and browser/network limitations explicitly.
