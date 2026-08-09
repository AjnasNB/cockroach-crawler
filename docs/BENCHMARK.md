# Cockroach Crawler benchmarks

## Published 0.7.0-rc.1 result

The reviewed npm `next` prerelease publishes the following exact
observed-development result for its opt-in Node quality `balanced` path:

| Version | Corpus | Pages | Precision | Recall | Macro F1 |
| --- | --- | ---: | ---: | ---: | ---: |
| `0.7.0-rc.1` | WCEB v1.0, observed partition | 511 | **0.894101** | **0.926022** | **0.890524** |

This is a positive, reproducible prerelease benchmark within its declared
scope. It is not untouched held-out confirmation. Publication reports the
measured values directly; it does not round precision to 0.90 or turn the row
into a universal crawler ranking.

- npm package: `cockroach-crawler@0.7.0-rc.1` on `next`
- source commit: `62f270636a019c9bcc617a13fe254640bcd06925`
- result: `bench/results/wceb-quality-observed-0.7.0.json`
- result SHA-256: `a71c884e9521d1cd1c6326dc07c1d1a5c36344244c45d4900a078ae92a8de535`
- WCEB revision: `62ff86d12ea72c80c31fb810ff1a724fad687bea`
- scorer: macro average of page-level Unicode-word precision, recall, and F1
- quality backend: exact native `trafilatura@0.2.0`, with Cockroach Crawler's
  validation, profiles, diagnostics, and evidence contract around it

Cockroach Crawler keeps extraction quality, fail-closed admission, standards
conformance, and local performance in separate evidence tracks. They answer
different questions and must not be combined into one headline score.

## Evidence status

WCEB calls its 511-page partition `test`. This project previously inspected
that partition, analyzed its failures, and changed extraction behavior in
response. Every 511-page result is therefore labeled **observed development
evidence after project iteration**, not untouched held-out or confirmatory
evidence. The 1,497-page partition is the upstream WCEB development split and
is also development evidence.

The results support exact statements about these pinned workloads. They do not
support a universal 0.90 precision claim, a claim of optimal thresholds, or a
claim that the same values will transfer to a new corpus.

## Extraction-quality profiles

All rows use WCEB v1.0 at commit
`62ff86d12ea72c80c31fb810ff1a724fad687bea`. The evaluator rejects a modified
or differently versioned checkout. It reports macro averages of page-level
Unicode word precision, recall, and F1. Required and unwanted snippet rates use
case-insensitive literal inclusion.

| Surface and corpus | Pages | Precision | Recall | F1 | Required-snippet recall | Unwanted inclusion | Abstentions |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Core `structural`, observed partition | 511 | 0.793763 | 0.873844 | 0.791500 | 0.835584 | 0.178735 | - |
| Quality `balanced`, observed partition | 511 | **0.894101** | **0.926022** | **0.890524** | **0.864090** | 0.111383 | - |
| Quality `balanced`, WCEB development split | 1,497 | 0.852784 | 0.896259 | 0.847064 | 0.755867 | **0.096181** | - |
| Quality `balanced`, fail-closed, observed partition | 511 | 0.847901 | 0.875080 | 0.844935 | 0.812035 | 0.104207 | 43 |

The core row measures the dependency-light `extractPage(...).text` path. The
quality rows measure the opt-in Node-only `extractPageQuality(...)` path, which
delegates main-content extraction to the exact native `trafilatura@0.2.0`
dependency. That composition is a product surface, not a claim that Cockroach
Crawler invented a new extraction algorithm.

Fail-closed is a separate safety result, not a drop-in quality comparison. Its
43 abstentions deliberately return no extracted body when a page is classified
as an application shell or challenge, output is empty or undersized, backend
quality is low, or a configured output limit would be violated. Report its
coverage together with precision, recall, and F1.

### Existing precision-profile check

The pre-existing `precision` profile was also run without tuning on both pinned
splits. It did not reach 0.90 precision and does not replace `balanced` as the
default or headline profile.

| Corpus | Pages | Precision | Recall | F1 | Required-snippet recall | Unwanted inclusion |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| WCEB development split | 1,497 | 0.848048 | 0.888365 | 0.841267 | 0.747495 | 0.093203 |
| Observed development partition | 511 | 0.891745 | 0.911998 | 0.883127 | 0.848598 | 0.110894 |

These are supplementary development measurements from the same source-pinned
harness, not separately tuned or confirmatory results. They show why a profile
name cannot substitute for measured precision and why the broader development
split, rather than the previously inspected 511 pages, must constrain product
claims.

## Core extraction stages

The committed stage evidence records the evolution of the core extractor on
the same observed 511-page partition. It is development history, not four
independent tests.

| Core stage | Precision | Recall | F1 | Required-snippet recall | Unwanted inclusion |
| --- | ---: | ---: | ---: | ---: | ---: |
| Whole-body baseline | 0.733006 | 0.904131 | 0.765255 | 0.871265 | 0.388454 |
| Landmark removal | 0.753037 | 0.903825 | 0.779079 | 0.871265 | 0.287019 |
| Content-block scoring | 0.774856 | 0.892777 | 0.789532 | 0.857893 | 0.220320 |
| Sentence-aware structural filtering | 0.793763 | 0.873844 | 0.791500 | 0.835584 | 0.178735 |

These exact values replace older rounded documentation that incorrectly listed
0.9100 recall for the baseline, 0.8778 recall for structural filtering, and
unverified `balanced` or `aggressive` core-profile results.

## Reproduce extraction evidence

Clone the separately licensed CC-BY-4.0 corpus and pin its reviewed revision:

```sh
git clone https://github.com/Murrough-Foley/web-content-extraction-benchmark.git ../wceb
git -C ../wceb checkout 62ff86d12ea72c80c31fb810ff1a724fad687bea
```

Run each named profile explicitly:

```sh
npm run bench:public:wceb -- \
  --dataset ../wceb --split test --engine core --boilerplate structural \
  --output bench/results/wceb-core-observed-0.7.0.json

npm run bench:public:wceb -- \
  --dataset ../wceb --split test --engine quality --quality-profile balanced \
  --output bench/results/wceb-quality-observed-0.7.0.json

npm run bench:public:wceb -- \
  --dataset ../wceb --split dev --engine quality --quality-profile balanced \
  --output bench/results/wceb-quality-development-0.7.0.json

npm run bench:public:wceb -- \
  --dataset ../wceb --split test --engine quality --quality-profile balanced \
  --fail-closed \
  --output bench/results/wceb-quality-fail-closed-observed-0.7.0.json
```

The machine-readable results retain every page row, exact engine/profile flags,
dataset identity, evaluation status, and a SHA-256 source fingerprint. Quality
artifacts fingerprint the native wrapper and package manifests; core artifacts
fingerprint core extraction and boilerplate logic. A profile mismatch or source
mutation invalidates committed evidence.

## Public extractor comparison

The Python baseline outputs are generated in a separate process and evaluated
by the same published scorer; that comparison remains a separate track.
On the observed 511-page partition, the core structural path scored 0.793763
precision, 0.873844 recall, and 0.791500 F1; Python trafilatura 2.2.0 scored
0.890108, 0.868258, and 0.860042; readability-lxml scored 0.869408, 0.626326,
and 0.656537. The Node quality backend is reported separately with its exact
package identity. See [EXTRACTION-COMPARISON.md](./EXTRACTION-COMPARISON.md) for
the complete boundary and reproduction steps.

## Public-source conformance result

Policy and URL behavior are evaluated independently from extraction:

- **25/25** adapted Google `robotstxt` vectors passed through the real
  `crawlDetailed` robots dispatch path.
- **101/101** applicable credential-free HTTP(S) cases selected from the pinned
  Web Platform Tests `urltestdata.json` corpus passed through `extractPage`
  canonical URL normalization.

This does not claim complete RFC 9309, WHATWG, browser-engine, or network
certification.

```sh
npm run bench:public:conformance -- \
  --output bench/results/public-conformance-0.7.0.json
# Strict current-checkout validation:
npm run bench:public:verify
# Archived evidence reconstruction from its immutable source commit:
npm run bench:public:verify -- --historical-source
```

Current-source validation remains fail-closed when any covered input drifts.
Historical mode requires a full Git history and verifies the unchanged evidence
blobs plus their source fingerprints at commit
`90825063d447f07345388d040b1428a311109c2b` and tree
`167311df2a0b4ad20005c441d60d1e435e64a781`; it does not assert that the current
checkout produced those results.

## Local regression benchmark

The local benchmark is a reproducible synthetic loopback test for the
non-browser Node.js engine. It measures project-local regressions; it is not an
industry benchmark, competitor ranking, public-internet test, production
capacity result, or service-level objective.

Each run asserts the exact URL set, request counts, extraction fields, hashes,
robots behavior, and sensitive-path denial. The default profile uses two
checked warmups followed by seven checked measured samples of 120 pages at
concurrency eight, then reports the full distribution and environment.

```sh
npm run bench
```

For release evidence, use the `benchmark-evidence` artifact produced by CI on
the exact release commit. Results from different profiles or machines must not
be compared as equivalent.

## Evidence files

- `bench/results/wceb-core-observed-0.7.0.json`: core structural metrics and all 511 rows.
- `bench/results/wceb-quality-development-0.7.0.json`: quality balanced metrics and all 1,497 development rows.
- `bench/results/wceb-quality-observed-0.7.0.json`: quality balanced metrics and all 511 observed rows.
- `bench/results/wceb-quality-fail-closed-observed-0.7.0.json`: fail-closed metrics, reasons, and observed rows.
- `bench/results/extraction-comparison-0.7.0.json`: core, quality, and separately generated baseline outputs evaluated by the same scorer.
- `bench/results/public-conformance-0.7.0.json`: every robots and WPT case.
- `bench/results/ci-validated.json`: exact-commit loopback CI artifact.
- `bench/public/sources.json`: upstream revisions, hashes, and licenses.

Historical `0.6.1` artifacts remain immutable development history. The 0.7.0
files are the release evidence and are verified against their named source and
profile fingerprints.

## Claim boundary

WCEB measures cached-HTML main-content extraction. Conformance measures only
the named public vectors. The loopback benchmark measures local regression
throughput. None establishes public-internet capacity, hosted service
throughput, browser-rendering quality, OCR quality, universal extraction
quality, or performance on an untouched confirmatory corpus.
