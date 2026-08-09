# Cockroach Crawler 0.7.0 release reference

The stable 0.7.0 process is maintained in [../RELEASE.md](../RELEASE.md).
Frozen raw-DOM attempt 003 remains rejected and is not part of the shipped
runtime. Stable promotion is a maintainer decision about API and package
availability, not benchmark leadership.

Do not maintain a second, drifting release narrative in the launch kit. Before using version-specific copy, verify:

```sh
npm view cockroach-crawler@0.7.0 version dist.integrity
npm view cockroach-crawler dist-tags
```

Only use this file after `0.7.0` resolves from npm `latest` and its integrity,
tag, provenance, frozen evidence, website, and paper match one reviewed commit.
Until then, 0.7 material must be described as release preparation and must not
be presented as already available from npm.

The stable `0.7.0` package carries the complete crawler, extraction, job,
proxy-gateway, provider, browser, MCP, Worker, and curated 50-item top-level
capability documentation
surface. It adds the opt-in Node-only quality export backed by exact
`trafilatura@0.2.0`, explicit fail-closed abstention, and source-fingerprinted
WCEB development evidence. The deployment workflow must refuse a 0.7 public
build until the exact package version is visible on npm.
