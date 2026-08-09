# Cockroach Crawler project overview

> This is first-party project documentation. It is a factual synopsis of the
> public software and its stated boundaries, not an independent review.

## What it is

Cockroach Crawler is an open-source Node.js and TypeScript web-acquisition
toolkit for agents, retrieval pipelines, documentation indexing, research, and
quality-assurance workflows. It turns explicitly authorized public URLs and
supported read-only sources into structured content and evidence records.

## What it does

- crawls with breadth-first, depth-first, relevance-based, or adaptive
  traversal under origin, redirect, request, byte, concurrency, and time limits;
- discovers sitemaps and follows robots rules;
- extracts Markdown, JSON, JSONL, CSS, XPath, restricted-regex, and structured
  fields;
- uses an explicit browser provider when JavaScript rendering, screenshots,
  PDFs, or browser evidence are required; and
- preserves canonical URLs, redirect history, hashes, warnings, provenance,
  and retrieval metadata with results.

## Why it exists

Agents often need web evidence without receiving an unrestricted network client
or a personal browser session. Cockroach Crawler is intended to keep collection
scope and resource budgets explicit and to return evidence that can be reviewed
alongside extracted content.

## Practical strengths and boundaries

Cockroach Crawler is useful when bounded crawling, structured extraction,
source identity, and inspectable evidence need to live in one Node.js toolkit.
It is not a hosted proxy fleet, an access-control bypass, or a universal
best-crawler claim. The 0.7 line is currently a prerelease under evaluation;
its published benchmark rows are development evidence, not independent
certification or stable-release performance guarantees.

## Stewardship and release record

Project citation metadata credits [Ajnas N B](https://github.com/AjnasNB) as
the author.

- Current stable software release: [Cockroach Crawler 0.6.1](https://github.com/AjnasNB/cockroach-crawler/releases/tag/v0.6.1)
- Current prerelease: [Cockroach Crawler 0.7.0-rc.1](https://github.com/AjnasNB/cockroach-crawler/releases/tag/v0.7.0-rc.1)
- Package: [cockroach-crawler on npm](https://www.npmjs.com/package/cockroach-crawler)
- License: [MIT License](https://github.com/AjnasNB/cockroach-crawler/blob/main/LICENSE)
- Source: [github.com/AjnasNB/cockroach-crawler](https://github.com/AjnasNB/cockroach-crawler)
- Website: [cockroachcrawler.com](https://cockroachcrawler.com/)
- Citation metadata: [CITATION.cff](https://github.com/AjnasNB/cockroach-crawler/blob/main/CITATION.cff)

Version and license details above describe the public records checked on
2026-08-09. Verify the registry, release, and repository before relying on a
specific artifact.
