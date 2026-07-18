import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import siteWorker from "./site-worker.js";

const dist = fileURLToPath(new URL("./dist/", import.meta.url));
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
let videoCount = 0;
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const label = file.slice(dist.length).replaceAll("\\", "/");
  const h1Count = (html.match(/<h1\b/g) ?? []).length;
  if (h1Count !== 1) errors.push(`${label}: expected one h1, found ${h1Count}`);
  if (!/<meta name="description"/.test(html) && !label.endsWith("404.html")) errors.push(`${label}: missing description`);
  if (!/<link rel="canonical"/.test(html) && !label.endsWith("404.html")) errors.push(`${label}: missing canonical`);
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

const releaseTruthFiles = files.filter((file) =>
  file.endsWith(".html") || file.endsWith("llms.txt") || file.endsWith("provider-map.svg")
);
for (const file of releaseTruthFiles) {
  const copy = await readFile(file, "utf8");
  const label = file.slice(dist.length).replaceAll("\\", "/");
  if (/source candidate|not presented as published|until registry verification passes/i.test(copy)) {
    errors.push(`${label}: contains pre-publication release wording`);
  }
}

const homepage = await readFile(join(dist, "index.html"), "utf8");
if (!homepage.includes("npm latest: stable 0.2.0") || !homepage.includes("Published prerelease · npm next")) {
  errors.push("index.html: must distinguish stable 0.2.0 under latest from published 0.3.0-alpha.1 under next");
}
const providerMap = await readFile(join(dist, "assets", "provider-map.svg"), "utf8");
if (!providerMap.includes("0.2.0 latest · 0.3.0-alpha.1 published under next")) {
  errors.push("assets/provider-map.svg: missing exact latest/next release status");
}

const required = ["robots.txt", "sitemap.xml", "llms.txt", "site.webmanifest", "_headers", "_redirects", "assets/social-card.png"];
for (const path of required) if (!await exists(join(dist, path))) errors.push(`missing ${path}`);
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

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Checked ${htmlFiles.length} HTML pages, ${files.length} built files, and all internal routes/assets.`);
}
