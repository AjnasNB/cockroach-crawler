# Public benchmark suite

This directory contains source-pinned evaluators, attribution, and conformance
vectors. It does not bundle upstream datasets in the npm package or repository.

## Main-content extraction

Clone the CC-BY-4.0 WCEB v1.0 dataset at the exact reviewed revision:

```sh
git clone https://github.com/Murrough-Foley/web-content-extraction-benchmark.git ../wceb
git -C ../wceb checkout 62ff86d12ea72c80c31fb810ff1a724fad687bea
```

Run the held-out 511-page profile:

```sh
npm run bench:public:wceb -- --dataset ../wceb --split test --output bench/results/wceb-test-0.5.0.json
```

The evaluator rejects another dataset revision or a modified checkout. It
reports the official-style macro page-level word precision, recall, and F1,
required-snippet recall, unwanted-snippet inclusion, a seven-page-type
breakdown, and one machine-readable row per page.

Do not use the held-out split for tuning. Use `--split dev` while developing,
freeze the extractor, and run the held-out split once for publication.

## Public-source conformance

Run the adapted Google robots dispatch vectors and the pinned WPT HTTP(S) URL
normalization subset:

```sh
npm run bench:public:conformance -- --output bench/results/public-conformance-0.5.0.json
```

The WPT corpus is downloaded from its exact commit and rejected when its SHA-256
does not match `sources.json`. The robots cases execute through a loopback HTTP
server and Cockroach Crawler's actual `crawlDetailed` robots path.

## Verify committed evidence

```sh
npm run bench:public:verify
```

This validates schemas, corpus identities, row counts, ranges, and the WCEB
extractor/evaluator source fingerprint. Local throughput remains a separate
benchmark because pages per second and extraction F1 answer different
questions.
