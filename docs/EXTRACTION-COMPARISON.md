# Extraction comparison

Main-content extraction quality for Cockroach Crawler measured against two
established open-source extractors on the same corpus, scored by one metric
implementation.

**Cockroach Crawler does not win this benchmark overall.** Trafilatura scores
higher on macro F1. Publishing that is the point: a comparison that only gets
published when it flatters the author is not evidence.

## Result

WCEB v1.0, `test` split, all 511 pages, revision `62ff86d1`.

| Tool | Precision | Recall | F1 | Required-snippet recall | Unwanted inclusion |
| --- | --- | --- | --- | --- | --- |
| trafilatura 2.2.0 | 0.8901 | 0.8683 | **0.8600** | 0.7966 | 0.0824 |
| cockroach-crawler 0.6.0 | 0.7938 | **0.8738** | 0.7915 | **0.8356** | 0.1787 |
| readability-lxml | 0.8694 | 0.6263 | 0.6565 | 0.5504 | **0.0517** |

Read that honestly:

- **Cockroach Crawler has the highest recall and the highest required-snippet
  recall.** It keeps more of what the annotators marked as content than either
  baseline. If your failure mode is "the extractor silently dropped the table I
  needed", it is the strongest of the three.
- **It also has the lowest precision and by far the worst unwanted inclusion.**
  At 0.3885, roughly two in five snippets explicitly marked as boilerplate
  survive extraction, against 0.08 for trafilatura. It keeps too much.
- **Trafilatura is better balanced** and wins F1 by 0.095. That is not a rounding
  difference and should not be described as one.

The shape of the gap is consistent: high recall, low precision, everywhere. This
is one weakness, not a general quality deficit, and it points at boilerplate
removal rather than at content detection.

## By page type

Macro F1 per class:

| Page type | Pages | cockroach-crawler | readability | trafilatura |
| --- | --- | --- | --- | --- |
| article | 257 | 0.8367 | 0.8635 | 0.9527 |
| documentation | 42 | 0.8839 | 0.7062 | 0.9313 |
| listing | 40 | 0.7131 | 0.3387 | 0.7275 |
| service | 59 | 0.7086 | 0.3812 | 0.8168 |
| collection | 34 | **0.6353** | 0.3998 | 0.6275 |
| forum | 51 | 0.6045 | 0.4531 | 0.7174 |
| product | 28 | 0.5765 | 0.3995 | 0.7252 |

Two things worth noting:

**Cockroach Crawler leads on collection pages**, narrowly, and is within 0.015 of
trafilatura on listings. Both are page classes where readability collapses
(0.34–0.40). Recall-oriented extraction suits pages whose content is many small
repeated blocks rather than one prose body.

**The largest deficits are product (0.149), article (0.116), and forum (0.113).**
Article is the most-represented class in the corpus at 257 of 511 pages, so it
dominates the macro average. Product and forum pages carry dense navigation,
related-item rails, and reply chrome, which is exactly the boilerplate the
precision number says is surviving.

## What this measures, and what it does not

Measured: main-content text extraction on one pinned public corpus, macro
averaged over pages, with one scorer applied to every tool.

Not measured, and not claimed:

- extraction quality on any other corpus
- speed, memory, or throughput
- any capability other than main-content text: crawling, rendering, structured
  extraction, provider access, and network policy are not in scope here
- that the baselines were configured optimally

That last point matters. Baselines run at their documented defaults through
[`bench/public/baselines/extract_baselines.py`](../bench/public/baselines/extract_baselines.py).
Trafilatura in particular has tuning options, including a recall-favouring mode,
that were not used. If a different configuration changes the result, the script
is published so that can be demonstrated rather than argued.

## Reproduce it

```bash
git clone https://github.com/Murrough-Foley/web-content-extraction-benchmark.git wceb
git -C wceb checkout 62ff86d12ea72c80c31fb810ff1a724fad687bea

pip install trafilatura readability-lxml
python bench/public/baselines/extract_baselines.py --dataset ./wceb --out ./baselines

npm run bench:public:comparison -- --dataset ./wceb --baselines ./baselines
```

Extraction and scoring are separate processes on purpose. This script never
invokes another extractor; it only scores plain-text files it is handed. A
comparison where the author also controls how the opposing tool is invoked is
not worth much, so the two halves stay independently runnable and independently
checkable.

Running with no `--baselines` scores Cockroach Crawler alone.

## What this changes

The precision gap is now a measured number with a page-class breakdown rather
than a suspicion, which makes it something that can be worked on and re-measured.
Improving boilerplate removal on product, article, and forum pages without
giving back the recall lead is the concrete objective.

Nothing here is a reason to pick a crawler on its own. Trafilatura is a content
extractor and does that one job well. The comparison is useful precisely because
it is narrow: on this axis, on this corpus, these are the numbers.
