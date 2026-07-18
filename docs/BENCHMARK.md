# Local regression benchmark

The benchmark is a reproducible, synthetic loopback test for Cockroach Crawler's
non-browser Node.js engine. It measures project-local regressions; it is not an
industry benchmark, competitor ranking, public-internet test, production
capacity result, or service-level objective.

## What it checks

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

## Method

The default profile uses two checked warmups followed by seven checked measured
samples of 120 pages at concurrency eight. The report includes every raw sample,
median and nearest-rank p95, minimum, maximum, and spread for elapsed time and
throughput. It also records Node, V8, operating system, architecture, CPU, memory,
the Git commit and dirty paths, plus a SHA-256 fingerprint of the runtime and
benchmark inputs.

Run the default profile and print JSON to standard output:

```sh
npm run bench
```

Write the same raw JSON to the development-baseline file:

```powershell
$env:BENCH_OUTPUT = "bench/results/local-regression.json"
npm run bench
Remove-Item Env:BENCH_OUTPUT
```

The parameters can be changed without editing the script:

```powershell
$env:PAGES = "240"
$env:CONCURRENCY = "12"
$env:WARMUP_RUNS = "3"
$env:SAMPLES = "9"
$env:BENCH_OUTPUT = "bench/results/local-regression.json"
npm run bench
```

Accepted ranges are 1-1,000 pages, concurrency 1-64, 0-20 warmups, and 3-50
measured samples. Results from different profiles or machines should not be
compared as if they were equivalent.

## Publishing evidence

Local output is intentionally a development baseline. It cannot prove its own
containing commit hash: adding a newly generated result would create a new
commit. A result whose `source.dirty` field is `true` remains useful for
development regression tracking, but it is not clean-release evidence.

The npm tarball includes `bench/results/ci-validated.json`, the clean exact-CI
artifact named on the public benchmark page. Local runs still write
`bench/results/local-regression.json` by default, so development measurements
cannot silently replace the packaged evidence.

For release evidence, use the `benchmark-evidence` artifact produced by CI after
checking out the exact release commit. CI writes the JSON after checkout and
uploads it without recommitting it, so its recorded commit and clean state refer
to the source that actually ran. Keep the complete configuration, environment,
source state, samples, and correctness section with any quoted number. Attach
that unedited artifact to the GitHub release if a benchmark result is cited.

## External extraction quality roadmap

There is no single globally accepted crawler benchmark. The local fixture above
measures Cockroach Crawler's regression behavior and policy checks; it does not
measure main-content extraction accuracy against human annotations.

A future, separate quality profile may use the open [Web Content Extraction
Benchmark (WCXB)](https://webcontentextraction.org/). As reviewed on 18 July
2026, WCXB contains 2,008 annotated pages across seven page types, a 1,497-page
development split, a 511-page held-out split, and word-level F1 evaluation. Its
dataset is CC-BY-4.0 and has a DOI. WCXB's own site describes its leaderboard as
a hobby-maintained project, so Cockroach Crawler would publish the exact dataset
revision, page-type breakdown, configuration, and raw results rather than call
the leaderboard an industry certification.

WCXB would complement—not replace—the versioned policy/conformance fixtures for
robots, redirects, URL safety, budgets, normalized records, and serverless
capability disclosure.
