import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import siteWorker from "./site-worker.js";

const dist = fileURLToPath(new URL("./dist/", import.meta.url));
const wranglerConfigPath = fileURLToPath(new URL("./wrangler.jsonc", import.meta.url));
const errors = [];

async function walk(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

const files = await walk(dist);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const wranglerConfig = JSON.parse(await readFile(wranglerConfigPath, "utf8"));
if (wranglerConfig.main !== "./site-worker.js" || wranglerConfig.assets?.directory !== "./dist" || wranglerConfig.assets?.binding !== "ASSETS") {
  errors.push("website Wrangler config must bind the reviewed site Worker to the built static assets");
}
if (wranglerConfig.assets?.run_worker_first !== true || wranglerConfig.assets?.not_found_handling !== "404-page") {
  errors.push("website Wrangler config must run cache/security middleware first and serve the custom 404 page");
}
let videoCount = 0;
const publicTitles = new Map();
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const label = file.slice(dist.length).replaceAll("\\", "/");
  if (/\u2014|&mdash;|&#8212;|&#x2014;/i.test(html)) errors.push(`${label}: public pages must use a normal hyphen instead of an em dash`);
  const h1Count = (html.match(/<h1\b/g) ?? []).length;
  if (h1Count !== 1) errors.push(`${label}: expected one h1, found ${h1Count}`);
  if (!/<meta name="description"/.test(html) && !label.endsWith("404.html")) errors.push(`${label}: missing description`);
  if (!/<link rel="canonical"/.test(html) && !label.endsWith("404.html")) errors.push(`${label}: missing canonical`);
  if (!label.endsWith("404.html")) {
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1]?.trim();
    if (!title) errors.push(`${label}: missing title`);
    else publicTitles.set(title, [...(publicTitles.get(title) ?? []), label]);
    for (const [pattern, name] of [
      [/<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">/, "indexing policy"],
      [/<meta property="og:title" content="[^"]+">/, "Open Graph title"],
      [/<meta property="og:description" content="[^"]+">/, "Open Graph description"],
      [/<meta property="og:url" content="https:\/\/cockroachcrawler\.com\/[^"]*">/, "Open Graph URL"],
      [/<meta property="og:image" content="https:\/\/cockroachcrawler\.com\/assets\/social-card\.png">/, "Open Graph image"],
      [/<meta name="twitter:card" content="summary_large_image">/, "Twitter card"],
      [/<meta name="twitter:title" content="[^"]+">/, "Twitter title"],
      [/<meta name="twitter:description" content="[^"]+">/, "Twitter description"],
      [/<meta name="twitter:image" content="https:\/\/cockroachcrawler\.com\/assets\/social-card\.png">/, "Twitter image"],
      [/<link rel="alternate" hreflang="en" href="https:\/\/cockroachcrawler\.com\/[^\"]*">/, "English hreflang"],
      [/<link rel="alternate" hreflang="x-default" href="https:\/\/cockroachcrawler\.com\/[^\"]*">/, "x-default hreflang"]
    ]) {
      if (!pattern.test(html)) errors.push(`${label}: missing ${name}`);
    }
    const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    if (!jsonLd.length) errors.push(`${label}: missing JSON-LD`);
    for (const [, source] of jsonLd) {
      try { JSON.parse(source); } catch { errors.push(`${label}: invalid JSON-LD`); }
    }
  }
  if (!/<link rel="stylesheet" href="\/assets\/styles\.css\?v=[a-f0-9]{12}"/.test(html)) errors.push(`${label}: stylesheet URL is not content-versioned`);
  if (!label.endsWith("404.html") && !/<script src="\/assets\/app\.js\?v=[a-f0-9]{12}" defer><\/script>/.test(html)) errors.push(`${label}: application script URL is not content-versioned`);
  if (label === "/media/index.html" && (html.match(/"@type":"VideoObject"/g) ?? []).length !== 4) errors.push(`${label}: expected four VideoObject records`);
  for (const image of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\balt="[^"]*"/.test(image[0])) errors.push(`${label}: image without alt`);
    if (!/\bwidth="\d+"/.test(image[0]) || !/\bheight="\d+"/.test(image[0])) errors.push(`${label}: image missing dimensions`);
  }
  for (const video of html.matchAll(/<video\b[^>]*>[\s\S]*?<\/video>/g)) {
    videoCount += 1;
    const openingTag = video[0].match(/^<video\b[^>]*>/)?.[0] ?? "";
    if (!/\bcontrols\b/.test(openingTag)) errors.push(`${label}: video without controls`);
    if (/\bautoplay\b/.test(openingTag)) errors.push(`${label}: autoplay video is not allowed`);
    if (!/\bposter="[^"]+"/.test(openingTag)) errors.push(`${label}: video without poster`);
    if (!/<track\b[^>]*kind="captions"[^>]*>/.test(video[0])) errors.push(`${label}: video without captions track`);
  }
  for (const tableWrap of html.matchAll(/<div class="table-wrap"[^>]*>/g)) {
    if (!/\btabindex="0"/.test(tableWrap[0]) || !/\brole="region"/.test(tableWrap[0]) || !/\baria-label="[^"]+"/.test(tableWrap[0])) {
      errors.push(`${label}: scrollable table region is not keyboard accessible`);
    }
  }
  for (const pre of html.matchAll(/<pre\b[^>]*>/g)) {
    if (!/\btabindex="0"/.test(pre[0]) || !/\baria-label="[^"]+"/.test(pre[0])) errors.push(`${label}: scrollable code region is not keyboard accessible`);
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length) errors.push(`${label}: duplicate ids ${[...new Set(duplicateIds)].join(", ")}`);
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const value = match[1];
    if (!value.startsWith("/") || value.startsWith("//")) continue;
    const [path] = value.split(/[?#]/);
    let target = join(dist, normalize(path));
    if (path.endsWith("/")) target = join(target, "index.html");
    if (!await exists(target)) errors.push(`${label}: broken internal asset or route ${value}`);
  }
}

for (const [title, pagesWithTitle] of publicTitles) {
  if (pagesWithTitle.length > 1) errors.push(`duplicate title "${title}" on ${pagesWithTitle.join(", ")}`);
}

const required = ["robots.txt", "sitemap.xml", "search.json", "llms.txt", "llms-full.txt", "site.webmanifest", "_headers", "_redirects", "assets/social-card.png", "paper/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.pdf"];
for (const path of required) if (!await exists(join(dist, path))) errors.push(`missing ${path}`);
const sitemap = await readFile(join(dist, "sitemap.xml"), "utf8");
if (!sitemap.includes("<loc>https://cockroachcrawler.com/compare/</loc>")) errors.push("sitemap must include the AI crawler comparison");
if (!sitemap.includes("<loc>https://cockroachcrawler.com/ecosystem/</loc><lastmod>2026-08-09</lastmod>")) errors.push("sitemap must include the dated governed-agent ecosystem article");
if (!sitemap.includes("<loc>https://cockroachcrawler.com/paper/</loc>")) errors.push("sitemap must include the technical white paper");
const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (sitemapLocations.length !== htmlFiles.length - 1) errors.push(`sitemap must include every public HTML page; expected ${htmlFiles.length - 1}, found ${sitemapLocations.length}`);
if (sitemapLocations.filter((location) => /\/docs\/capabilities\/[^/]+\/[^/]+\/$/.test(location)).length !== 50) {
  errors.push("sitemap must include all 50 capability detail pages");
}
const searchIndex = JSON.parse(await readFile(join(dist, "search.json"), "utf8"));
if (!Array.isArray(searchIndex) || searchIndex.length !== sitemapLocations.length) errors.push("search.json must index every public route");
const ecosystemSearch = searchIndex.find((entry) => entry.url === "https://cockroachcrawler.com/ecosystem/");
if (!ecosystemSearch || ecosystemSearch.updated !== "2026-08-09" || !ecosystemSearch.description.includes("Qarinah")) {
  errors.push("search.json must index the dated source-linked ecosystem article");
}
for (const route of ["crawling", "browser", "extraction", "mcp", "docker", "reference"]) {
  if (!sitemap.includes(`<loc>https://cockroachcrawler.com/docs/${route}/</loc>`)) {
    errors.push(`sitemap must include the ${route} documentation`);
  }
}
const mapHtml = await readFile(join(dist, "docs", "map-and-extract", "index.html"), "utf8");
if (!mapHtml.includes("--map-search")) errors.push("map guide must show searched site maps");
const extractionHtml = await readFile(join(dist, "docs", "extraction", "index.html"), "utf8");
if (!extractionHtml.includes("Restricted regex extraction")) errors.push("extraction guide must document the restricted regex surface");
const mcpHtml = await readFile(join(dist, "docs", "mcp", "index.html"), "utf8");
if (!mcpHtml.includes("io.github.AjnasNB/cockroach-crawler")) errors.push("MCP guide must document the official Registry name");
const dockerHtml = await readFile(join(dist, "docs", "docker", "index.html"), "utf8");
if (!dockerHtml.includes("/v1/jobs")) errors.push("Docker guide must document bounded asynchronous jobs");
const llms = await readFile(join(dist, "llms.txt"), "utf8");
if (!llms.includes("AI crawler comparison: https://cockroachcrawler.com/compare/")) errors.push("llms.txt must link the factual crawler comparison");
if (!llms.includes("Open-source governed-agent ecosystem: https://cockroachcrawler.com/ecosystem/")) errors.push("llms.txt must link the governed-agent ecosystem article");
if (!llms.includes("Complete JavaScript and CLI reference: https://cockroachcrawler.com/docs/reference/")) errors.push("llms.txt must link the complete reference");
for (const phrase of ["searchable fetch-validated site maps", "restricted regex extraction", "bounded process-local asynchronous jobs", "official Registry metadata"]) {
  if (!llms.includes(phrase)) errors.push(`llms.txt must document ${phrase}`);
}
for (const phrase of ["npm latest is 0.6.1", "0.7.0-rc.1 prerelease", "raw-DOM attempt 003 was rejected", "precision 0.860252", "five gates", "no integration, release, ranking, or best-crawler statement"]) {
  if (!llms.includes(phrase)) errors.push(`llms.txt must preserve publication status: ${phrase}`);
}
for (const phrase of ["Cockroach Browser uses playwright-core", "Cockroach Crawler's opt-in quality option is Trafilatura-backed", "This is a category map, not a ranking"]) {
  if (!llms.includes(phrase)) errors.push(`llms.txt must preserve the ecosystem boundary: ${phrase}`);
}
const llmsFull = await readFile(join(dist, "llms-full.txt"), "utf8");
if (!llmsFull.includes("## Complete public route index")) errors.push("llms-full.txt must include the complete public route index");
for (const route of ["/docs/", "/compare/", "/ecosystem/", "/benchmark/", "/paper/", "/release/"]) {
  if (!llmsFull.includes(`https://cockroachcrawler.com${route}`)) errors.push(`llms-full.txt must include ${route}`);
}
if (!llmsFull.includes("no integration, release, ranking, or best-crawler statement")) {
  errors.push("llms-full.txt must preserve the rejected-attempt claim boundary");
}
const packageReadme = await readFile(join(dist, "..", "..", "README.md"), "utf8");
if (/assets\/readme-proof-still/i.test(packageReadme)) errors.push("npm README must not restore the oversized proof banner");
if (!packageReadme.includes("Give your AI agents the web. Keep the keys.")) errors.push("npm README must lead with the creator-owned AI web crawler promise");
if (!packageReadme.includes("Look up every package subpath, crawl option, page field, statistic, and executable")) {
  errors.push("npm README must retain the complete-reference documentation row");
}
const docsHtml = await readFile(join(dist, "docs", "index.html"), "utf8");
if (!docsHtml.includes("Cockroach Crawler 0.7.0-rc.1 prerelease documentation")) errors.push("docs must identify the published 0.7.0-rc.1 prerelease documentation set");
if (docsHtml.includes("Install it. Crawl one path. Inspect the result.")) errors.push("docs must not regress to the sparse task-directory hero");
if (!docsHtml.includes('href="/docs/capabilities/"')) errors.push("docs overview must link the dedicated capability library");
if (!docsHtml.includes("docs-sidebar-nav")) errors.push("docs overview must use the persistent grouped documentation navigation");
if (docsHtml.includes("docs-sidebar-group")) errors.push("docs navigation must not hide primary routes in collapsed accordion groups");
if ((docsHtml.match(/data-docs-nav-expanded="true"/g) ?? []).length < 2) errors.push("desktop and mobile documentation navigation must expose every main group");
for (const group of ["Start", "Crawl and extract", "Agents and sources", "Deploy and reference", "Capability library"]) {
  if (!docsHtml.includes(`>${group}</h2>`)) errors.push(`docs navigation must expose the ${group} group heading`);
}
if (docsHtml.includes("data-feature-entry")) errors.push("docs overview must not restore the giant inline capability wall");
const capabilityIndexHtml = await readFile(join(dist, "docs", "capabilities", "index.html"), "utf8");
if ((capabilityIndexHtml.match(/data-feature-entry/g) ?? []).length !== 50) errors.push("capability library must expose all 50 indexed capabilities");
if (!capabilityIndexHtml.includes("data-feature-search")) errors.push("capability library must retain the searchable feature index");
const capabilityIndexLinks = [...capabilityIndexHtml.matchAll(/href="(\/docs\/capabilities\/[^"]+\/)"/g)]
  .map((match) => match[1])
  .filter((route) => route.split("/").filter(Boolean).length === 4);
if (new Set(capabilityIndexLinks).size !== 50) errors.push(`capability library must link 50 unique detail pages, found ${new Set(capabilityIndexLinks).size}`);
const capabilityDetailFiles = htmlFiles.filter((file) => {
  const label = file.slice(dist.length).replaceAll("\\", "/");
  return /^\/?docs\/capabilities\/[^/]+\/[^/]+\/index\.html$/.test(label);
});
if (capabilityDetailFiles.length !== 50) errors.push(`expected 50 generated capability pages, found ${capabilityDetailFiles.length}`);
for (const file of capabilityDetailFiles) {
  const html = await readFile(file, "utf8");
  const label = file.slice(dist.length).replaceAll("\\", "/");
  if (!html.includes("docs-sidebar-nav")) errors.push(`${label}: capability page must include grouped documentation navigation`);
  if (html.includes("docs-sidebar-group")) errors.push(`${label}: capability navigation must stay expanded`);
  if (!html.includes("of 50")) errors.push(`${label}: capability page must identify its place in the complete catalog`);
  if (!html.includes('aria-current="page"')) errors.push(`${label}: capability page must mark its current sidebar route`);
  for (const proof of ["Purpose and fit", "How to start", "Result contract", "Boundary and failures", "Related pages"]) {
    if (!html.includes(proof)) errors.push(`${label}: missing ${proof} section`);
  }
}
for (const [route, proof] of [
  ["crawling", "Reuse only a policy-identical crawl."],
  ["browser", "Render the page and keep the evidence."],
  ["extraction", "Turn page bytes into model-ready records."],
  ["mcp", "cockroach://capabilities"],
  ["docker", "COCKROACH_API_TOKEN"],
  ["reference", "Every stable top-level crawl option."]
]) {
  const html = await readFile(join(dist, "docs", route, "index.html"), "utf8");
  if (!html.includes("docs-sidebar-nav")) errors.push(`${route} docs must include grouped documentation navigation`);
  if (html.includes("docs-sidebar-group")) errors.push(`${route} docs must not hide main documentation groups`);
  if (!html.includes("docs-breadcrumbs")) errors.push(`${route} docs must expose a semantic breadcrumb`);
  if (!html.includes(proof)) errors.push(`${route} docs are missing their reference proof`);
}
const releaseHtml = await readFile(join(dist, "release", "index.html"), "utf8");
if (!releaseHtml.includes("npm install cockroach-crawler@next")) errors.push("release page must install the reviewed npm-next prerelease");
if (!releaseHtml.includes("Published prerelease") || !releaseHtml.includes("Install reviewed npm next 0.7.0-rc.1")) errors.push("release page must separate stable and prerelease status");
if (!releaseHtml.includes("five gate violations") || !releaseHtml.includes("10.5281/zenodo.21851008") || !releaseHtml.includes("published")) errors.push("release page must preserve the failed gate and published DOI status");
if (!releaseHtml.includes("trafilatura@0.2.0") || !releaseHtml.includes("Alpine/musl")) errors.push("release page must document the exact native dependency and unsupported platform boundary");
if (releaseHtml.includes("Release · 0.3.0")) errors.push("release page must not advertise 0.3.0 as current");
const benchmarkHtml = await readFile(join(dist, "benchmark", "index.html"), "utf8");
for (const proof of [
  "observed development evidence",
  "0.894101",
  "0.926022",
  "0.890524",
  "0.852784",
  "0.896259",
  "0.847064",
  "0.847901",
  "0.875080",
  "0.844935",
  "0.812035",
  "0.104207",
  "43",
  "wceb-quality-observed-0.7.0.json",
  "trafilatura@0.2.0"
]) {
  if (!benchmarkHtml.includes(proof)) errors.push(`benchmark page is missing scoped development evidence: ${proof}`);
}
if (benchmarkHtml.includes("511 held-out pages") || benchmarkHtml.includes("complete held-out")) errors.push("benchmark page must not present the observed 511-page corpus as untouched evidence");
const compareHtml = await readFile(join(dist, "compare", "index.html"), "utf8");
for (const proof of [
  "Five categories - not one interchangeable market.",
  "Firecrawl",
  "Crawl4AI",
  "Crawlee",
  "Scrapy",
  "Trafilatura",
  "Playwright",
  "Apify",
  "ScrapingBee",
  "Trafilatura-backed Node profile",
  "0.894101",
  "0.860252",
  "Rejected after five gate violations",
  "different 750-document segment corpus and scorer",
  "not an independent extractor beating Trafilatura"
]) {
  if (!compareHtml.includes(proof)) errors.push(`comparison page is missing category or evidence boundary: ${proof}`);
}
if (compareHtml.includes("best crawler") && !compareHtml.includes("There is no universal best")) {
  errors.push("comparison page must not emit an unqualified best-crawler claim");
}
const ecosystemHtml = await readFile(join(dist, "ecosystem", "index.html"), "utf8");
for (const proof of [
  "Open-source toolkit for governed AI agents",
  "By Ajnas N B",
  "Qarinah",
  "Maqam",
  "Cockroach Browser",
  "Cockroach Crawler",
  "Playwright",
  "Trafilatura",
  "Firecrawl",
  "Browser Use",
  "Stagehand",
  "LangGraph",
  "OpenAI Agents SDK",
  "Docling",
  "It uses <code>playwright-core</code>",
  "quality option is Trafilatura-backed",
  "This page maps product centers and composition boundaries",
  '"@type":"Article"',
  '"@type":"ItemList"',
  '"@type":"BreadcrumbList"',
  '"@type":"FAQPage"',
  'rel="canonical" href="https://cockroachcrawler.com/ecosystem/"'
]) {
  if (!ecosystemHtml.includes(proof)) errors.push(`ecosystem page is missing source, boundary, or discovery proof: ${proof}`);
}
if (/[\u2013\u2014]/.test(ecosystemHtml)) errors.push("ecosystem page must use ASCII hyphens instead of en or em dashes");
const benchmarkBlogHtml = await readFile(join(dist, "blog", "we-benchmarked-ourselves-and-lost", "index.html"), "utf8");
if (!benchmarkBlogHtml.includes("From a noisy core extractor to an explicit quality path")) errors.push("benchmark blog must carry the 0.7.0 evidence update");
if (!benchmarkBlogHtml.includes("0.892777") || !benchmarkBlogHtml.includes("0.873844")) errors.push("benchmark blog must retain corrected exact stage values");
const paperHtml = await readFile(join(dist, "paper", "index.html"), "utf8");
for (const proof of [
  '"@type":"ScholarlyArticle"',
  '"@type":"FAQPage"',
  'name="citation_title"',
  'name="citation_pdf_url"',
  'rel="alternate" type="application/pdf"',
  "The raw-DOM candidate was rejected.",
  "0.860252",
  "five declared gates",
  "10.5281/zenodo.21851008",
  "npm <code>latest</code> remains 0.6.1"
]) {
  if (!paperHtml.includes(proof)) errors.push(`paper page is missing research-publication proof: ${proof}`);
}
const homeHtml = await readFile(join(dist, "index.html"), "utf8");
for (const proof of ["Reach the web.", "npm latest 0.6.1", "npm next 0.7.0-rc.1", "62f2706", '"softwareVersion":"0.6.1"', '"identifier":"62f270636a019c9bcc617a13fe254640bcd06925"']) {
  if (!homeHtml.includes(proof)) errors.push(`home page is missing centered publication proof: ${proof}`);
}
for (const recognition of [
  'aria-label="Launch directories"',
  'href="https://fazier.com/launches/cockroachcrawler.com"',
  'src="https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=launched&amp;theme=light"',
  'width="120" height="51" alt="Fazier badge"'
]) {
  if (!homeHtml.includes(recognition)) errors.push(`home page is missing Fazier recognition: ${recognition}`);
}
if (videoCount < 5) errors.push(`expected at least 5 embedded captioned videos, found ${videoCount}`);
const headerPolicy = await readFile(join(dist, "_headers"), "utf8");
if (/\bimmutable\b/.test(headerPolicy)) errors.push("unversioned site assets must remain revalidatable");

const mockEnvironment = {
  ASSETS: {
    fetch: async () => new Response("ok", { headers: { "content-type": "text/html; charset=utf-8" } }),
  },
};
const redirect = await siteWorker.fetch(new Request("http://cockroachcrawler.com/docs/?source=check"), mockEnvironment);
if (redirect.status !== 308 || redirect.headers.get("location") !== "https://cockroachcrawler.com/docs/?source=check") {
  errors.push("site worker must redirect HTTP to the same HTTPS URL with status 308");
}
const canonicalRedirect = await siteWorker.fetch(new Request("https://www.cockroachcrawler.com/media/?source=check"), mockEnvironment);
if (canonicalRedirect.status !== 308 || canonicalRedirect.headers.get("location") !== "https://cockroachcrawler.com/media/?source=check") {
  errors.push("site worker must redirect www HTTPS requests to the canonical apex host");
}
const secure = await siteWorker.fetch(new Request("https://cockroachcrawler.com/"), mockEnvironment);
if (secure.headers.get("strict-transport-security") !== "max-age=31536000; includeSubDomains") {
  errors.push("site worker must add the reviewed HSTS policy on HTTPS responses");
}
if (!secure.headers.get("cache-control")?.includes("no-transform")) {
  errors.push("site worker must prevent automatic HTML transformation and blocked analytics injection");
}
if (!secure.headers.get("cache-control")?.includes("max-age=0") || !secure.headers.get("cache-control")?.includes("must-revalidate")) {
  errors.push("site worker must require browsers to revalidate HTML so new documentation routes are visible immediately");
}

const missingEnvironment = {
  ASSETS: {
    fetch: async (request) => {
      if (new URL(request.url).pathname === "/404") {
        return new Response("missing", { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
      }
      throw new Error("asset not found");
    },
  },
};
const missing = await siteWorker.fetch(new Request("https://cockroachcrawler.com/docs/new-route/"), missingEnvironment);
if (missing.status !== 404 || missing.headers.get("cache-control") !== "no-store, no-transform") {
  errors.push("site worker must never cache missing documentation routes");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Checked ${htmlFiles.length} HTML pages, ${files.length} built files, and all internal routes/assets.`);
}
