# Direct dependency licenses

This is the reviewed direct-dependency snapshot for the `0.3.0-alpha.3` lockfile. From a source checkout, run `npm run audit:licenses` after `npm ci` to verify that installed package versions and SPDX license identifiers still match the lockfile and the project's permissive-license allowlist.

| Package | Resolved version | Relationship | SPDX license |
| --- | ---: | --- | --- |
| [cheerio](https://github.com/cheeriojs/cheerio) | 1.2.0 | Runtime | MIT |
| [ipaddr.js](https://github.com/whitequark/ipaddr.js) | 2.4.0 | Runtime | MIT |
| [robots-parser](https://github.com/samclarke/robots-parser) | 3.0.1 | Runtime | MIT |
| [turndown](https://github.com/mixmark-io/turndown) | 7.2.4 | Runtime | MIT |
| [undici](https://github.com/nodejs/undici) | 7.28.0 | Runtime | MIT |
| [playwright](https://github.com/microsoft/playwright) | 1.61.1 | Optional peer and development | Apache-2.0 |
| [typescript](https://github.com/microsoft/TypeScript) | 5.9.3 | Development | Apache-2.0 |
| [wrangler](https://github.com/cloudflare/workers-sdk) | 4.112.0 | Development / Worker dry-run | MIT OR Apache-2.0 |

This audit covers direct runtime, peer, and development packages only. Transitive dependencies remain governed by their own licenses. Compatible dependency ranges can resolve newer versions for downstream consumers, so license and provenance review must be repeated when the lockfile changes. This inventory is informational and is not legal advice.

## Optional external tools

These tools are not npm dependencies, are not bundled in the package tarball, and run only after an operator selects the external-source tier. `cockroach-reach` pins the reviewed version in its generated setup plan.

| Tool | Reviewed version | Relationship | License |
| --- | ---: | --- | --- |
| [OpenCLI](https://github.com/jackwener/opencli) | 1.8.6 | Optional browser-session read connector | Apache-2.0 |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | 2025.5.22 | Optional no-key YouTube metadata/search executable | Unlicense for core; distributed artifacts may carry additional notices |

The optional LinkedIn MCP alternative is manual and is not installed, imported, or dispatched by Cockroach Crawler. Bilibili integrations are intentionally excluded.
