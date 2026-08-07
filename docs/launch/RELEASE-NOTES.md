# Cockroach Crawler 0.7.0 release reference

The immutable stable release record is maintained in [../RELEASE.md](../RELEASE.md) and the matching [`v0.7.0` GitHub release](https://github.com/AjnasNB/cockroach-crawler/releases/tag/v0.7.0).

Do not maintain a second, drifting release narrative in the launch kit. Before using version-specific copy, verify:

```sh
npm view cockroach-crawler@0.7.0 version dist.integrity
npm view cockroach-crawler dist-tags
```

Use stable `0.7.0` from npm `latest` and match its integrity and provenance to
the reviewed release commit. Older alpha notes and screenshots are prerelease
history, not current launch truth.

The `0.7.0` release carries the complete crawler, extraction, job,
proxy-gateway, provider, browser, MCP, Worker, and 50-capability documentation
surface. It adds the opt-in Node-only quality export backed by exact
`trafilatura@0.2.0`, explicit fail-closed abstention, and source-fingerprinted
WCEB evidence. The deployment workflow refuses to build the public site until
the exact package version is visible on npm.
