# Extraction comparison

This comparison scores Cockroach Crawler's core and opt-in quality surfaces
beside two established Python extractors on the same cached HTML, annotations,
and metric implementation.

## Evidence status

The corpus is WCEB v1.0 at revision
`62ff86d12ea72c80c31fb810ff1a724fad687bea`. The upstream partition is named
`test` and contains 511 pages. Because this project previously inspected those
pages and iterated in response, the result is **observed development evidence**,
not an untouched held-out comparison.

## Observed 511-page result

| Tool or surface | Precision | Recall | F1 | Required-snippet recall | Unwanted inclusion |
| --- | ---: | ---: | ---: | ---: | ---: |
| Cockroach Crawler core `structural` | 0.793763 | 0.873844 | 0.791500 | 0.835584 | 0.178735 |
| Cockroach Crawler quality `balanced` | **0.894101** | **0.926022** | **0.890524** | **0.864090** | 0.111383 |
| Python trafilatura 2.2.0 | 0.890108 | 0.868258 | 0.860042 | 0.796641 | 0.082355 |
| readability-lxml | 0.869408 | 0.626326 | 0.656537 | 0.550359 | **0.051696** |

Read this precisely:

- The quality `balanced` surface has the highest observed precision, recall,
  F1, and required-snippet recall in this run. It does not have the lowest
  unwanted inclusion.
- The core structural surface keeps strong recall but trails Python
  trafilatura by 0.068542 macro F1 and includes more unwanted text.
- The quality surface delegates main-content extraction to the exact native
  npm dependency `trafilatura@0.2.0`. It is a separately exported, validated
  Cockroach Crawler product surface, not a claim that this project invented
  the underlying extraction algorithm.
- Python `trafilatura==2.2.0` and npm `trafilatura@0.2.0` are different package
  distributions with similar names. The table reports their observed composed
  outputs under one scorer; it does not claim algorithmic equivalence.
- No row supports a universal 0.90 claim. The 1,497-page WCEB development run
  is lower: quality `balanced` records 0.852784 precision, 0.896259 recall, and
  0.847064 F1.

## Core stage history

The core extractor improved by removing semantic landmarks, scoring content
blocks, and filtering link-heavy punctuation-free blocks. These are successive
development measurements on the same observed pages.

| Stage | Precision | Recall | F1 | Unwanted inclusion |
| --- | ---: | ---: | ---: | ---: |
| Whole-body baseline | 0.733006 | 0.904131 | 0.765255 | 0.388454 |
| Landmark removal | 0.753037 | 0.903825 | 0.779079 | 0.287019 |
| Content-block scoring | 0.774856 | 0.892777 | 0.789532 | 0.220320 |
| Sentence-aware structural filtering | 0.793763 | 0.873844 | 0.791500 | 0.178735 |

The exact final recall is 0.873844, not the stale rounded value 0.8778 that
appeared in earlier copy. The block-scoring recall is 0.892777, not 0.8986.
Unverified historical `balanced` and `aggressive` core rows are not release
evidence and are intentionally omitted.

## What is and is not measured

Measured:

- cached-HTML main-content text extraction on one pinned public corpus;
- macro page-level word precision, recall, and F1;
- required-content retention and unwanted-snippet inclusion;
- baseline text generated in a separate Python process and scored by the same evaluator.

Not measured or claimed:

- quality on an untouched confirmatory corpus or arbitrary live websites;
- speed, memory, throughput, browser rendering, OCR, crawling, provider access,
  or network policy;
- that any tool was tuned optimally;
- that a fail-closed profile has the same coverage as a profile that always
  returns text.

The baseline script uses documented defaults. A different tool configuration
can produce different output. Exact configuration and output digests are part
of the machine-readable result so that a mismatch is visible.

## Reproduce it

```bash
git clone https://github.com/Murrough-Foley/web-content-extraction-benchmark.git wceb
git -C wceb checkout 62ff86d12ea72c80c31fb810ff1a724fad687bea

python -m venv .venv
.venv/bin/pip install -r bench/public/baselines/requirements.lock.txt
.venv/bin/python bench/public/baselines/extract_baselines.py \
  --dataset ./wceb --out ./baselines

npm run bench:public:comparison -- \
  --dataset ./wceb --split test --boilerplate structural \
  --baselines ./baselines \
  --output bench/results/extraction-comparison-0.7.0.json
```

On Windows, use `.venv\Scripts\python.exe` and
`.venv\Scripts\pip.exe`. Extraction and scoring remain separate processes.
The comparison verifier rejects changed source fingerprints, profile metadata,
baseline manifests, or baseline output digests.

Run `npm run bench:public:verify` to validate the committed evidence set.
