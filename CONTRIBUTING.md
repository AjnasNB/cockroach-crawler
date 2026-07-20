# Contributing to Cockroach Crawler

Thank you for helping improve the project. The most useful contributions make one behavior easier to verify without widening authority silently.

## Before you start

- Use a public issue for bugs, focused features, documentation, and deterministic integration fixtures.
- Use a [private security advisory](https://github.com/AjnasNB/cockroach-crawler/security/advisories/new) for vulnerabilities. Never paste tokens, cookies, private content, or metadata responses into a public issue.
- Keep provider work read-only and based on documented public APIs. Do not add browser-cookie extraction, login bypasses, or unofficial session fallbacks.
- Before incorporating third-party material, record its exact source commit, license, modifications, and required notices in `docs/PROVENANCE.md`. Do not incorporate material whose terms are incompatible with this MIT project.

## Contribution flow

1. Fork the repository and create a focused branch.
2. Install with a maintained Node.js 22, 24, or 26 release: `npm ci --ignore-scripts`.
3. Add a failing test or deterministic fixture before changing security-sensitive behavior.
4. Implement the smallest coherent change, including public types and documentation.
5. Run `npm run release:check` for transport, packaging, browser, provider, or public API changes.
6. Open a pull request with the behavior, evidence, limitations, and provenance clearly stated.

External contributors cannot merge directly to the protected default branch. A maintainer reviews and merges approved pull requests after required checks pass. Passing CI is necessary, not automatic approval.

## Review standards

- Unknown or authority-bearing input fails closed.
- Redirects, robots policy, origins, credentials, resource limits, and timeouts retain explicit tests.
- New adapters report accurate `doctor` capability and credential state.
- Secrets come from environment or deployment secret stores, never CLI flags, URLs, fixtures, screenshots, or logs.
- Public claims remain narrower than the evidence. Local benchmarks are not global standards or competitor rankings.
- Copy-paste examples must run from a packed consumer, not only from a repository checkout.

## Useful first contributions

Good first issues are expected to be narrow: one offline provider fixture, one error-path test, one documentation example, or one reproducible benchmark improvement. Broad requests such as “support every site” should be split into provider-specific contracts.
