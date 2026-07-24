# Cockroach Crawler 0.5.1 release reference

The immutable stable release record is maintained in [../RELEASE.md](../RELEASE.md) and the matching [`v0.5.1` GitHub release](https://github.com/AjnasNB/cockroach-crawler/releases/tag/v0.5.1).

Do not maintain a second, drifting release narrative in the launch kit. Before using version-specific copy, verify:

```sh
npm view cockroach-crawler@0.5.1 version gitHead dist.integrity
npm view cockroach-crawler dist-tags
```

Use `0.5.1` from npm `latest` only after the reviewed candidate is published.
Older alpha notes and screenshots are prerelease history, not current launch
truth.

The `0.5.1` patch carries the complete `0.5.0` crawler, extraction, job,
proxy-gateway, and 50-capability documentation surface unchanged. It corrects
the case-sensitive GitHub MCP Registry namespace and removes the affected
transitive Windows static-server dependency from a fresh production install.
Do not publish or deploy this copy until the exact candidate commit has passed
review, release checks, npm trusted publication, tagging, and registry
verification.
