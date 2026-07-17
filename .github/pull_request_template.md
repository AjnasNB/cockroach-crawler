## What changed

<!-- Describe the user-visible behavior and the smallest boundary this pull request changes. -->

## Why

<!-- Link the issue and explain the concrete workflow this enables or fixes. -->

Closes #

## Verification

<!-- List exact commands and results. Add deterministic fixtures for changed behavior. -->

- [ ] `npm test`
- [ ] `npm run test:types`
- [ ] `npm run audit:licenses`
- [ ] `npm run worker:check` when the serverless surface changes
- [ ] `npm run test:browser` when browser behavior changes
- [ ] Packed-consumer behavior was checked when exports, files, bins, or types changed

## Security and provider boundaries

- [ ] Deny/error paths fail closed and do not dispatch an adapter or external side effect.
- [ ] New network destinations, redirects, credentials, scopes, quotas, and data retention are documented.
- [ ] Tests and logs contain no tokens, cookies, private URLs, personal data, or real customer content.
- [ ] Provider integrations use documented public APIs and do not imply partnership or certification.
- [ ] Third-party code/assets and their license or provenance are recorded before incorporation.

## Release impact

- [ ] No release note is needed.
- [ ] A changelog or documentation update is included.
- [ ] This changes the npm package surface and requires packed-artifact review.

<!-- Keep only the applicable release-impact item(s). Maintainers publish through the trusted OIDC workflow; pull requests must never add an npm token. -->
