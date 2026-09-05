# Dependency-lock security refresh

The September 5 source candidate refreshes the installation lock without changing
the published 0.7.0 package's source, exports, dependency ranges, or historical
benchmark artifacts. This is not a new npm publication. npm packages do not ship
`package-lock.json`; fresh consumers already resolve within the declared ranges.

Production resolutions change from `@xmldom/xmldom` 0.9.10 to 0.9.12 and `fast-uri`
3.1.5 to 3.1.7. These address the [xmldom advisory](https://github.com/advisories/GHSA-6gmq-8vp8-gcm6)
and [fast-uri advisories](https://github.com/advisories/GHSA-f65p-4m7j-42xc) reported
by the CI audit. Development resolutions also update qs, Wrangler, Miniflare,
workerd platform packages, and their required transitive packages. No forced
major-version upgrade or advisory suppression is used.

The stable-runtime check still compares runtime files, package declarations, and
the published paper/evidence against commit
`62f270636a019c9bcc617a13fe254640bcd06925`. Only the dependency-lock comparison has
a new exact candidate fingerprint. After normalizing the root version to the
historical RC version, SHA-256 of `JSON.stringify(lock)` must equal
`844c5e432f4ec20d47d1cdaca64b1f7c5ceffb177589304cbb2703bcfd0ee302`.
Unexpected dependency changes still fail this check, and npm audit remains a
separate required gate. Review this lock change in the PR before merging it.

The retained benchmarks describe their original pinned environment, not the
updated dependency graph. This refresh does not rerun them, change their hashes,
or establish new performance measurements. Current behavior is checked with the
functional suite and type checks; a subsequent benchmark must retain a new run.
