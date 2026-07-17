# Governance

Cockroach Crawler is maintained by AjnasNB. The project accepts community issues, forks, and pull requests; it is not a shared-write repository by default.

## Decision rights

- Anyone may propose an issue or pull request.
- Only explicitly authorized repository maintainers can merge, tag, publish, change deployment configuration, or modify repository security settings.
- Required checks and review protect the default branch. A green check does not merge or publish code automatically.
- Security boundaries, release automation, package ownership, credentials, and Cloudflare configuration require maintainer review.

## Releases

Stable releases use the `latest` npm dist-tag. Prereleases use an explicit prerelease version and the `next` dist-tag. The committed trusted-publishing workflow verifies the reviewed commit, tarball size and hashes, typed maintainer confirmation, Git tag, registry integrity, provenance, exports, and an external consumer. No npm token belongs in GitHub Actions.

## Compatibility and claims

New provider or framework compatibility begins as an offline deterministic fixture. Documentation must distinguish provider-package-tested wiring from native confirmation, authentication, discovery, approval synchronization, certification, or partnership. Benchmarks require a dated reproducible method and may not be presented as universal rankings.

## Changes to governance

Governance changes are proposed by pull request and take effect only after maintainer approval. The repository history is the public record of those changes.
