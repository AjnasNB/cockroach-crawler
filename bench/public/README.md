# Public benchmark suite

This directory contains source-pinned evaluators, attribution, and conformance
vectors. It does not bundle upstream datasets in the repository or npm package.

## WCEB main-content extraction

Clone the CC-BY-4.0 WCEB v1.0 dataset at the exact reviewed revision:

```sh
git clone https://github.com/Murrough-Foley/web-content-extraction-benchmark.git ../wceb
git -C ../wceb checkout 62ff86d12ea72c80c31fb810ff1a724fad687bea
```

The upstream repository calls its 511-page partition `test`. Cockroach Crawler
previously inspected those pages and iterated against their failures, so this
project classifies every result on that partition as **observed development
evidence**, not untouched held-out evidence. The 1,497-page `dev` partition is
reported as WCEB development evidence.

Run each release profile explicitly:

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

The evaluator rejects another dataset revision or a modified checkout. It
records the exact engine, core boilerplate profile, quality profile, fail-closed
state, source fingerprint, macro page-level word precision/recall/F1, snippet
rates, page-type breakdown, and one machine-readable row per page.

The quality engine requires the exact Node-native `trafilatura@0.2.0` backend.
It never silently falls back to core. Upstream prebuilt binaries cover Windows
x64/ARM64, macOS x64/ARM64, and glibc Linux x64/ARM64; Alpine/musl, 32-bit, and
other operating systems are unsupported by that backend.

## Extractor comparison

Create baseline output with the locked Python environment, then score every
tool's plain-text output through the same JavaScript metric implementation:

```sh
python -m venv .venv
.venv/bin/pip install -r bench/public/baselines/requirements.lock.txt
.venv/bin/python bench/public/baselines/extract_baselines.py \
  --dataset ../wceb --out ../wceb-baselines

npm run bench:public:comparison -- \
  --dataset ../wceb --split test --boilerplate structural \
  --baselines ../wceb-baselines \
  --output bench/results/extraction-comparison-0.7.0.json
```

On Windows, use `.venv\Scripts\python.exe` and
`.venv\Scripts\pip.exe`. Baseline manifests and output digests are checked;
the scorer never invokes a competing extractor itself.

## Public-source conformance

Run the adapted Google robots dispatch vectors and the pinned WPT HTTP(S) URL
normalization subset:

```sh
npm run bench:public:conformance -- \
  --output bench/results/public-conformance-0.7.0.json
```

The WPT corpus is downloaded from its exact commit and rejected when its
SHA-256 does not match `sources.json`. Robots cases execute through a loopback
HTTP server and the actual `crawlDetailed` robots path.

## Verify committed evidence

```sh
npm run bench:public:verify
```

Verification covers schemas, corpus identities, row counts, metric ranges,
configuration/profile identity, baseline output digests, and engine-specific
source fingerprints. Extractor logic mutations or profile mismatches invalidate
the evidence. Local throughput remains a separate benchmark because pages per
second and extraction F1 answer different questions.
