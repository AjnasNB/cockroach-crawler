# Cockroach Crawler 0.7.0 release reference

No stable 0.7.0 record exists. The target release process is maintained in
[../RELEASE.md](../RELEASE.md); npm `latest` remains 0.6.1 and frozen raw-DOM
attempt 003 was rejected. The `v0.7.0` link below is a future verification
target, not an existing release.

Do not maintain a second, drifting release narrative in the launch kit. Before using version-specific copy, verify:

```sh
npm view cockroach-crawler@0.7.0 version dist.integrity
npm view cockroach-crawler dist-tags
```

Only use this file after `0.7.0` resolves from npm `latest` and its integrity,
tag, provenance, frozen evidence, website, and paper match one reviewed commit.
Until then, 0.7 material is prerelease history and must not be published as
current launch truth.

The `0.7.0` source candidate carries the complete crawler, extraction, job,
proxy-gateway, provider, browser, MCP, Worker, and 50-capability documentation
surface. It adds the opt-in Node-only quality export backed by exact
`trafilatura@0.2.0`, explicit fail-closed abstention, and source-fingerprinted
WCEB development evidence. Promotion remains blocked after the failed frozen
attempt; the deployment workflow must refuse a 0.7 public build until the exact
package version is visible on npm.
