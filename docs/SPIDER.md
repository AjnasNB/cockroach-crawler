# Spiders

`cockroach-crawler/spider` drives a crawl you control page by page: rules decide
what gets followed and parsed, items stream out as they are found, throttling
adapts to the server, and a checkpoint lets a long run stop and resume.

It sits on top of `crawlDetailed`, so every transport, robots, redirect, origin,
and budget control still applies.

## A minimal spider

```js
import { Spider } from "cockroach-crawler/spider";

const spider = new Spider({
  startUrls: ["https://shop.example/"],
  maxPages: 100,
  maxDepth: 2
});

const { items, stats, failures } = await spider.run();
```

Without a `parse` function each page yields a default record of url, title,
description, markdown, and depth.

## Shaping items

```js
const spider = new Spider({
  startUrls: ["https://shop.example/"],
  maxDepth: 2,
  parse: (page, { depth }) => (page.url.includes("/product/")
    ? { sku: page.url.split("/").pop(), title: page.title, depth }
    : null)
});
```

Returning `null` skips the page as an item while still following its links. That
is how you crawl through index pages without emitting them.

## Rules

`CrawlSpider` matches each URL against an ordered rule list. The first rule
whose `deny` patterns miss and whose `allow` patterns hit wins. A URL matching
no rule is neither fetched nor followed.

```js
import { CrawlSpider } from "cockroach-crawler/spider";

const spider = new CrawlSpider({
  startUrls: ["https://shop.example/"],
  maxDepth: 3,
  rules: [
    {
      name: "products",
      allow: "/product/",
      callback: (page) => ({ title: page.title, url: page.url })
    },
    {
      name: "listings",
      allow: /\/category\/[a-z-]+$/u,
      follow: true,
      callback: () => null
    }
  ]
});
```

Patterns are plain substrings or regular expressions. `deny` always beats
`allow`. `follow: false` parses a page without queueing its links.

## Streaming

```js
for await (const item of spider.stream()) {
  await save(item);
}
```

`stream()` yields items as pages complete, so a long crawl does not hold every
result in memory and you can stop early by breaking out of the loop.

## Adaptive throttling

```js
const spider = new Spider({
  startUrls: ["https://shop.example/"],
  autoThrottle: { targetLatencyMs: 800, minDelayMs: 50, maxDelayMs: 10_000 }
});
```

The throttle measures per-page latency and moves the inter-batch delay toward a
target, smoothed so one slow response does not swing it. A challenge or a 429
doubles the delay immediately rather than easing into it, because a server that
is refusing you should be backed away from quickly.

Pass `autoThrottle: true` for defaults, or an `AutoThrottle` instance to share
one budget across spiders.

## Checkpoint and resume

```js
import { Spider, SpiderCheckpoint } from "cockroach-crawler/spider";

const checkpoint = new SpiderCheckpoint({ directory: ".cockroach/spiders", name: "shop" });
const spider = new Spider({ startUrls: ["https://shop.example/"], maxPages: 500, checkpoint });

await spider.run();
```

The checkpoint records the visited set, the remaining frontier, and the item
count, written atomically. Constructing a spider with the same checkpoint name
resumes from where the previous run stopped rather than refetching. Use
`checkpointEvery` to trade write frequency against how much a crash costs.

Checkpoints are namespaced: two spiders with different `name` values in the same
directory never see each other's state.

## Sitemaps

```js
import { SitemapSpider } from "cockroach-crawler/spider";

const spider = new SitemapSpider({ startUrls: ["https://docs.example/"], maxPages: 2_000 });
```

`SitemapSpider` enables robots-declared and conventional sitemap discovery, which
is usually a faster and politer way to enumerate a documentation site than
following links.

## Failures

A page that fails does not abort the run. Failures collect on the result with
the same structured shape the crawler uses elsewhere:

```js
const { failures } = await spider.run();
// [{ url, phase: "page", code: "CHALLENGE_ENCOUNTERED", error: "..." }]
```

Check `failures` before treating a run as complete. A spider that returns 40
items and 60 failures crawled a very different site than one that returns 40
items and none.
