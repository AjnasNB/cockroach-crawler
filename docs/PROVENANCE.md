# Source provenance

Review date: 2026-07-18

Cockroach Crawler is an original MIT-licensed implementation. The maintainer attests that the projects below were consulted as public product/design references only and that no source code, tests, documentation text, or bundled assets from them were copied into this repository. This record documents the review scope; it is not independent proof or legal advice.

## Agent Reach

- Repository: https://github.com/Panniantong/agent-reach
- Revision reviewed: `1494c2ab239e7355a77e7cceaf3271453a1f34b5`
- Revision permalink: https://github.com/Panniantong/agent-reach/tree/1494c2ab239e7355a77e7cceaf3271453a1f34b5
- Concepts considered: explicit provider registry, visible capability diagnostics, actionable setup guidance, and optional external-tool orchestration.
- Code incorporated: none.
- Assets incorporated: none.
- License note: the reviewed repository is MIT-licensed. Cockroach Crawler does not copy Agent Reach's Python implementation, automatic browser-cookie extraction, installer, documentation text, assets, or "entire internet" claims.

## Crawl4AI

- Repository: https://github.com/unclecode/crawl4ai
- Revision reviewed: `7e801521428ee12509994d39151006f64055ebe3`
- Revision permalink: https://github.com/unclecode/crawl4ai/tree/7e801521428ee12509994d39151006f64055ebe3
- Concepts considered: crawler product scope, extraction ergonomics, and public documentation organization.
- Code incorporated: none.
- License note: the reviewed `LICENSE` contains the Apache License 2.0 text followed by a project-specific mandatory-attribution section. It should not be described as an unmodified Apache-2.0-only license without that qualification.

## Firecrawl

- Repository: https://github.com/firecrawl/firecrawl
- Revision reviewed: `cf5045315ded40bf644bb7296c6d4c7cfedafe5a`
- Revision permalink: https://github.com/firecrawl/firecrawl/tree/cf5045315ded40bf644bb7296c6d4c7cfedafe5a
- Concepts considered: hosted crawler product scope, API ergonomics, and comparison categories.
- Code incorporated: none.
- License note: the reviewed core license grants use under GNU Affero General Public License version 3 or, at the recipient's option, any later version (`AGPL-3.0-or-later`).

Because no upstream material was incorporated, none of these upstream project licenses governs Cockroach Crawler's original source. Calling a documented remote API is an interoperability boundary, not code incorporation. Re-run and update this review if future development copies, adapts, or vendors upstream material.
