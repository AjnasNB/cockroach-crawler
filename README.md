<p align="center">
  <img src="https://raw.githubusercontent.com/AjnasNB/cockroach-crawler/main/assets/logo.png" alt="Cockroach Crawler" width="620">
</p>

# Cockroach Crawler

Cockroach Crawler is an open-source public-web crawler for agent workflows. It turns crawlable public pages into clean JSON or JSONL with titles, metadata, readable text, markdown, links, status codes, content types, and timestamps.

It is designed for documentation indexing, RAG ingestion, QA crawling, content inventory, public research, and agent toolchains that need a local crawler with a simple CLI and JavaScript API.

## What it does

- Crawls public HTTP/HTTPS pages from one or more seed URLs.
- Respects `robots.txt` by default.
- Discovers sitemaps from `robots.txt` and `/sitemap.xml`.
- Extracts readable text and markdown.
- Outputs JSON or JSONL for agent pipelines.
- Supports concurrency, per-origin delay, max pages, max depth, include/exclude filters, URL files, and same-origin controls.
- Uses a clear user agent and supports contact details.
- Avoids likely private account/admin/cart/login URLs by default.
- Ships zero hosted dependencies: no account, API key, browser session, or LLM call is required.

## What it does not do

Cockroach Crawler is not a stealth scraper. It does not include bypass tooling for login walls, paywalls, CAPTCHA, anti-bot systems, authorization boundaries, or robots.txt. If a site owner requires permission, get permission and crawl within their terms.

## When to use it

Use Cockroach Crawler when an agent or data pipeline needs a repeatable public-web fetcher that returns compact, structured page records. It is intentionally smaller than full crawler frameworks and intentionally simpler than browser agents.

| Use case | Cockroach Crawler fit |
| --- | --- |
| Crawl public docs, blogs, help centers, or marketing pages | Strong |
| Export crawl results as JSONL or markdown for RAG | Strong |
| Respect robots.txt and crawl-delay style politeness controls | Strong |
| Crawl JavaScript-only apps that require clicks, login, or a live browser | Use Browser Use, Playwright, Puppeteer, Crawlee, or another browser stack |
| Bypass paywalls, CAPTCHA, anti-bot, auth, or owner restrictions | Not supported |

## Comparison

Cockroach Crawler is not a universal replacement for Browser Use, Crawlee, Scrapy, Firecrawl, Crawl4AI, or hosted browser tools. It is better for one narrow job: low-friction public HTML crawling into agent-friendly JSON/JSONL/Markdown from Node.js.

| Tool | Best at | Tradeoff compared with Cockroach Crawler |
| --- | --- | --- |
| Browser Use | LLM-driven browser control and interactive workflows | Heavier stack; better for clicking/forms, not a lightweight batch crawler |
| Crawlee | Production-grade crawling with browser and queue primitives | More powerful, larger API surface, more setup |
| Scrapy | Mature Python crawling framework | Excellent framework, but Python-first and less direct for Node agent pipelines |
| Firecrawl | Hosted/API-first page extraction and crawling | Great API product; self-hosting/licensing/deployment is heavier |
| Crawl4AI | LLM-oriented Python crawling and markdown extraction | Strong AI extraction focus; Python-first |
| Cockroach Crawler | Local public-web crawl to JSONL/Markdown for agents | Smaller scope; no JS browser rendering, no stealth, no hosted extraction |

The goal is not to beat every crawler at every job. The goal is to be the simplest useful crawler an agent can call locally when it needs public pages converted into clean records.

## Install

```bash
npm install -g cockroach-crawler
```

Or run without global install:

```bash
npx cockroach-crawler https://example.com --max-pages 20 --jsonl
```

## CLI examples

Crawl one public site:

```bash
cockroach-crawl https://example.com --max-pages 50 --jsonl --output crawl.jsonl
```

Use sitemaps and include only docs URLs:

```bash
cockroach-crawl https://example.com --sitemaps --include "/docs/" --max-pages 200 --output docs.json
```

Read many seed URLs from a file:

```bash
cockroach-crawl --url-file urls.txt --max-pages 100 --jsonl
```

Add a contact-aware user agent:

```bash
cockroach-crawl https://example.com --contact "mailto:you@example.com"
```

## CLI options

- `--url-file <file>`: read seed URLs from a text file, one URL per line.
- `--max-pages <n>`: maximum pages to return. Default: `50`.
- `--max-depth <n>`: maximum link depth from seeds. Default: `2`.
- `--concurrency <n>`: concurrent workers. Default: `4`.
- `--delay <ms>`: minimum delay per origin. Default: `250`.
- `--timeout <ms>`: request timeout. Default: `15000`.
- `--sitemaps`: discover URLs from robots.txt sitemaps and `/sitemap.xml`.
- `--all-origins`: allow crawling across discovered origins.
- `--include <regex>`: only crawl URLs matching regex. Can be repeated.
- `--exclude <regex>`: skip URLs matching regex. Can be repeated.
- `--allow-non-public`: allow likely login/account/admin/cart URLs.
- `--jsonl`: output JSON Lines instead of a JSON array.
- `--output <file>`: write output to a file.
- `--user-agent <ua>`: custom user agent.
- `--contact <email/url>`: add contact detail to the default user agent.
- `--version`: show package version.

## Library API

```js
import { crawl } from "cockroach-crawler";

const pages = await crawl({
  seeds: ["https://example.com"],
  maxPages: 25,
  maxDepth: 2,
  concurrency: 4,
  includeSitemaps: true,
  include: ["/docs/"],
  exclude: ["/login", "/account"],
  onPage(page) {
    console.log(page.url, page.title);
  }
});

console.log(pages[0].markdown);
```

## Output shape

```json
{
  "url": "https://example.com/",
  "canonical": "https://example.com/",
  "title": "Example",
  "description": "Example description",
  "h1": "Example",
  "text": "Readable text...",
  "markdown": "# Example\n\nReadable markdown...",
  "links": ["https://example.com/about"],
  "fetchedAt": "2026-06-27T00:00:00.000Z",
  "status": 200,
  "contentType": "text/html; charset=utf-8"
}
```

## Development

```bash
npm install
npm test
npm run check
npm run bench
```

## License

MIT
