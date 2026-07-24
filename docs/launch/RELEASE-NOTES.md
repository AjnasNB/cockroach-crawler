# Cockroach Crawler 0.5.0 release reference

The immutable stable release record is maintained in [../RELEASE.md](../RELEASE.md) and the matching [`v0.5.0` GitHub release](https://github.com/AjnasNB/cockroach-crawler/releases/tag/v0.5.0).

Do not maintain a second, drifting release narrative in the launch kit. Before using version-specific copy, verify:

```sh
npm view cockroach-crawler@0.5.0 version gitHead dist.integrity
npm view cockroach-crawler dist-tags
```

Use `0.5.0` from npm `latest` only after the reviewed candidate is published.
Older alpha notes and screenshots are prerelease history, not current launch
truth.

The `0.5.0` line adds searched fetch-validated maps, restricted regex
extraction, bounded process-local asynchronous jobs, a fixed self-hosted proxy
gateway adapter, matching official MCP Registry metadata, and a 50-capability
documentation portal. Do not publish or deploy this copy until the exact
candidate commit has passed review, release checks, npm trusted publication,
tagging, and registry verification.
