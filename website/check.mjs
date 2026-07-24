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
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const label = file.slice(dist.length).replaceAll("\\", "/");
  const h1Count = (html.match(/<h1\b/g) ?? []).length;
  if (h1Count !== 1) errors.push(`${label}: expected one h1, found ${h1Count}`);
  if (!/<meta name="description"/.test(html) && !label.endsWith("404.html")) errors.push(`${label}: missing description`);
  if (!/<link rel="canonical"/.test(html) && !label.endsWith("404.html")) errors.push(`${label}: missing canonical`);
  if (!label.endsWith("404.html")) {
    for (const [pattern, name] of [
      [/<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">/, "indexing policy"],
      [/<meta property="og:title" content="[^"]+">/, "Open Graph title"],
      [/<meta property="og:description" content="[^"]+">/, "Open Graph description"],
      [/<meta property="og:url" content="https:\/\/cockroachcrawler\.com\/[^"]*">/, "Open Graph URL"],
      [/<meta property="og:image" content="https:\/\/cockroachcrawler\.com\/assets\/social-card\.png">/, "Open Graph image"],
      [/<meta name="twitter:card" content="summary_large_image">/, "Twitter card"],
      [/<meta name="twitter:title" content="[^"]+">/, "Twitter title"],
      [/<meta name="twitter:description" content="[^"]+">/, "Twitter description"],
      [/<meta name="twitter:image" content="https:\/\/cockroachcrawler\.com\/assets\/social-card\.png">/, "Twitter image"]
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

const required = ["robots.txt", "sitemap.xml", "llms.txt", "site.webmanifest", "_headers", "_redirects", "assets/social-card.png"];
for (const path of required) if (!await exists(join(dist, path))) errors.push(`missing ${path}`);
const sitemap = await readFile(join(dist, "sitemap.xml"), "utf8");
if (!sitemap.includes("<loc>https://cockroachcrawler.com/compare/</loc>")) errors.push("sitemap must include the AI crawler comparison");
for (const route of ["crawling", "browser", "extraction", "mcp", "docker", "reference"]) {
  if (!sitemap.includes(`<loc>https://cockroachcrawler.com/docs/${route}/</loc>`)) {
    errors.push(`sitemap must include the ${route} documentation`);
  }
}
const llms = await readFile(join(dist, "llms.txt"), "utf8");
if (!llms.includes("AI crawler comparison: https://cockroachcrawler.com/compare/")) errors.push("llms.txt must link the factual crawler comparison");
if (!llms.includes("Complete JavaScript and CLI reference: https://cockroachcrawler.com/docs/reference/")) errors.push("llms.txt must link the complete reference");
const packageReadme = await readFile(join(dist, "..", "..", "README.md"), "utf8");
if (/assets\/readme-proof-still/i.test(packageReadme)) errors.push("npm README must not restore the oversized proof banner");
if (!packageReadme.includes("Give your AI agents web superpowers")) errors.push("npm README must lead with the AI web crawler benefit");
if (!packageReadme.includes("Look up every package subpath, crawl option, page field, statistic, and executable")) {
  errors.push("npm README must retain the complete-reference documentation row");
}
const docsHtml = await readFile(join(dist, "docs", "index.html"), "utf8");
if (!docsHtml.includes("Cockroach Crawler 0.4.2 documentation")) errors.push("docs must identify stable 0.4.2");
if (docsHtml.includes("Install it. Crawl one path. Inspect the result.")) errors.push("docs must not regress to the sparse task-directory hero");
if ((docsHtml.match(/data-feature-entry/g) ?? []).length !== 46) errors.push("docs must expose all 46 indexed capabilities");
if (!docsHtml.includes("data-feature-search")) errors.push("docs must retain the searchable feature index");
for (const [route, proof] of [
  ["crawling", "Reuse only a policy-identical crawl."],
  ["browser", "Render the page. Keep the evidence."],
  ["extraction", "From page bytes to model-ready records."],
  ["mcp", "cockroach://capabilities"],
  ["docker", "COCKROACH_API_TOKEN"],
  ["reference", "Every stable top-level crawl option."]
]) {
  const html = await readFile(join(dist, "docs", route, "index.html"), "utf8");
  if (!html.includes("docs-sidebar-nav")) errors.push(`${route} docs must include grouped documentation navigation`);
  if (!html.includes(proof)) errors.push(`${route} docs are missing their reference proof`);
}
const releaseHtml = await readFile(join(dist, "release", "index.html"), "utf8");
if (!releaseHtml.includes("npm install cockroach-crawler@0.4.2")) errors.push("release page must install stable 0.4.2");
if (releaseHtml.includes("Release · 0.3.0")) errors.push("release page must not advertise 0.3.0 as current");
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
    fetch: async () => new Response("missing", { status: 404, headers: { "content-type": "text/html; charset=utf-8" } }),
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
