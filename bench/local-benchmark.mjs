#!/usr/bin/env node

import http from "node:http";
import { performance } from "node:perf_hooks";
import { crawl } from "../src/index.js";

const pageCount = Number.parseInt(process.env.PAGES || "120", 10);
const concurrency = Number.parseInt(process.env.CONCURRENCY || "8", 10);

function pageHtml(index, origin) {
  const next = index + 1 < pageCount ? `<a href="${origin}/page-${index + 1}">Next</a>` : "";
  const skipPrivate = `<a href="${origin}/login">Login</a>`;

  return `<!doctype html>
<html>
  <head>
    <title>Benchmark Page ${index}</title>
    <meta name="description" content="Synthetic crawl benchmark page ${index}">
  </head>
  <body>
    <main>
      <h1>Benchmark Page ${index}</h1>
      <p>This is public benchmark content for page ${index}. It validates text and markdown extraction.</p>
      ${next}
      ${skipPrivate}
    </main>
  </body>
</html>`;
}

const server = http.createServer((request, response) => {
  if (request.url === "/robots.txt") {
    response.writeHead(200, { "content-type": "text/plain" });
    response.end("User-agent: *\nDisallow: /blocked\nSitemap: /sitemap.xml\n");
    return;
  }

  if (request.url === "/sitemap.xml") {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const urls = Array.from({ length: pageCount }, (_, index) => `<url><loc>${origin}/page-${index}</loc></url>`).join("");
    response.writeHead(200, { "content-type": "application/xml" });
    response.end(`<?xml version="1.0" encoding="UTF-8"?><urlset>${urls}</urlset>`);
    return;
  }

  const match = request.url.match(/^\/(?:page-)?(\d+)$/);
  if (request.url === "/" || match) {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const index = request.url === "/" ? 0 : Number.parseInt(match[1], 10);
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(pageHtml(index, origin));
    return;
  }

  response.writeHead(404, { "content-type": "text/plain" });
  response.end("Not found");
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

try {
  const origin = `http://127.0.0.1:${server.address().port}`;
  const startedAt = performance.now();
  const pages = await crawl({
    seeds: [`${origin}/`],
    maxPages: pageCount,
    maxDepth: Math.min(pageCount, 100),
    concurrency,
    delayMs: 0,
    allowPrivateNetworks: true,
    includeSitemaps: true
  });
  const elapsedMs = performance.now() - startedAt;
  const pagesPerSecond = pages.length / (elapsedMs / 1000);

  console.log(JSON.stringify({
    pages: pages.length,
    elapsedMs: Number(elapsedMs.toFixed(2)),
    pagesPerSecond: Number(pagesPerSecond.toFixed(2)),
    firstTitle: pages[0]?.title,
    hasMarkdown: Boolean(pages[0]?.markdown),
    skippedLikelyPrivateUrl: !pages.some((page) => page.url.endsWith("/login"))
  }, null, 2));
} finally {
  await new Promise((resolve) => server.close(resolve));
}
