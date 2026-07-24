# Cockroach Crawler benchmarks

Cockroach Crawler keeps performance, extraction quality, and standards
conformance in separate evidence tracks. They answer different questions and
must not be combined into one headline score.

## Local regression benchmark

The local benchmark is a reproducible, synthetic loopback test for the
non-browser Node.js engine. It measures project-local regressions; it is not an
industry benchmark, competitor ranking, public-internet test, production
capacity result, or service-level objective.

### What it checks

Each warmup and measured run starts from the same local fixture and asserts:

- the exact expected URL set and page count;
- no duplicates or crawl failures;
- exact fixture request counts;
- title, heading, text, Markdown, and content-hash extraction;
- one `robots.txt` request and one sitemap request;
- no request to the fixture's sensitive path.

After the timed samples, untimed policy probes verify that a robots-disallowed
page is not fetched and that a sensitive seed fails closed before a request.
Any failed assertion exits with a non-zero status instead of reporting a timing.

### Method

The default profile uses two checked warmups followed by seven checked measured
samples of 120 pages at concurrency eight. The report includes every raw sample,
median and nearest-rank p95, minimum, maximum, and spread for elapsed time and
throughput. It also records Node, V8, operating system, architecture, CPU,
memory, the Git commit and dirty paths, plus a SHA-256 fingerprint of the
runtime and benchmark inputs.

```sh
npm run bench
```

Write raw JSON to a development baseline:

```powershell
$env:BENCH_OUTPUT = "bench/results/local-regression.json"
npm run bench
Remove-Item Env:BENCH_OUTPUT
```

Accepted ranges are 1-1,000 pages, concurrency 1-64, 0-20 warmups, and 3-50
measured samples. Results from different profiles or machines should not be
compared as if they were equivalent.

For release evidence, use the `benchmark-evidence` artifact produced by CI after
checking out the exact release commit. CI writes the JSON after checkout and
uploads it without recommitting it, so its recorded commit and clean state refer
to the source that actually ran.

## Public extraction-quality result

Cockroach Crawler `0.5.0` was evaluated against the full 511-page held-out split
of [WCEB v1.0](https://webcontentextraction.org/), pinned to commit
`62ff86d12ea72c80c31fb810ff1a724fad687bea`. The evaluator rejects modified or
differently versioned dataset checkouts. It passes each cached HTML document to
`extractPage(...).text` and uses macro averages of page-level Unicode word
precision, recall, and F1. Required and unwanted snippet rates use
case-insensitive literal inclusion.

| Metric | Held-out result |
| --- | ---: |
| Pages | 511 |
| Macro word precision | 0.7330 |
| Macro word recall | 0.9041 |
| Macro word F1 | 0.7653 |
| Required-snippet recall | 87.13% |
| Unwanted-snippet inclusion | 38.85% |

| Page type | Pages | Precision | Recall | F1 |
| --- | ---: | ---: | ---: | ---: |
| Article | 257 | 0.7993 | 0.9391 | 0.8367 |
| Service | 59 | 0.6878 | 0.8668 | 0.7086 |
| Product | 28 | 0.5423 | 0.8244 | 0.5765 |
| Collection | 34 | 0.5539 | 0.8949 | 0.6353 |
| Forum | 51 | 0.6683 | 0.7505 | 0.6045 |
| Listing | 40 | 0.6246 | 0.9480 | 0.7131 |
| Documentation | 42 | 0.8450 | 0.9482 | 0.8839 |

The machine-readable result contains all 511 page rows and the SHA-256
fingerprint of the evaluator, extractor, source manifest, package manifest, and
lock file. WCEB is CC-BY-4.0 and remains outside this repository and npm
package.

Reproduce it from a clean WCEB v1.0 checkout:

```sh
npm run bench:public:wceb -- \
  --dataset ../web-content-extraction-benchmark \
  --split test \
  --output bench/results/wceb-test-0.5.0.json
```

## Public-source conformance result

The second public profile runs policy and URL behavior separately from
extraction quality:

- **25/25** adapted public Google `robotstxt` vectors passed through the real
  `crawlDetailed` robots dispatch path. The cases cover allow/disallow
  precedence, wildcards, anchors, groups, case handling, comments, and empty
  directives.
- **101/101** applicable credential-free HTTP(S) cases selected from the pinned
  Web Platform Tests `urltestdata.json` corpus passed through `extractPage`
  canonical URL normalization.

The source manifest records exact Google and WPT revisions, paths, licenses, and
SHA-256 values. This profile does not claim complete RFC 9309, WHATWG,
browser-engine, or network certification.

```sh
npm run bench:public:conformance -- \
  --output bench/results/public-conformance-0.5.0.json
npm run bench:public:verify
```

## Evidence files

- `bench/results/wceb-test-0.5.0.json`: aggregate metrics and all 511 page rows.
- `bench/results/public-conformance-0.5.0.json`: every robots and WPT case.
- `bench/results/ci-validated.json`: clean exact-commit loopback CI artifact.
- `bench/public/sources.json`: upstream revisions, hashes, and licenses.
- `bench/public/README.md`: reproduction workflow and held-out split policy.

## Claim boundary

The WCEB result measures cached-HTML main-content extraction. The conformance
result measures only the named public vectors. The loopback benchmark measures
local regression throughput. None establishes public-internet capacity, hosted
service throughput, browser-rendering quality, OCR quality, universal
extraction quality, or a competitor ranking without an identical independently
reviewed protocol.
