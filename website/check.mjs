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
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const label = file.slice(dist.length).replaceAll("\\", "/");
  const h1Count = (html.match(/<h1\b/g) ?? []).length;
  if (h1Count !== 1) errors.push(`${label}: expected one h1, found ${h1Count}`);
  if (!/<meta name="description"/.test(html) && !label.endsWith("404.html")) errors.push(`${label}: missing description`);
  if (!/<link rel="canonical"/.test(html) && !label.endsWith("404.html")) errors.push(`${label}: missing canonical`);
  for (const image of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\balt="[^"]*"/.test(image[0])) errors.push(`${label}: image without alt`);
    if (!/\bwidth="\d+"/.test(image[0]) || !/\bheight="\d+"/.test(image[0])) errors.push(`${label}: image missing dimensions`);
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

const mockEnvironment = {
  ASSETS: {
    fetch: async () => new Response("ok", { headers: { "content-type": "text/plain" } }),
  },
};
const redirect = await siteWorker.fetch(new Request("http://cockroachcrawler.com/docs/?source=check"), mockEnvironment);
if (redirect.status !== 308 || redirect.headers.get("location") !== "https://cockroachcrawler.com/docs/?source=check") {
  errors.push("site worker must redirect HTTP to the same HTTPS URL with status 308");
}
const secure = await siteWorker.fetch(new Request("https://cockroachcrawler.com/"), mockEnvironment);
if (secure.headers.get("strict-transport-security") !== "max-age=31536000; includeSubDomains") {
  errors.push("site worker must add the reviewed HSTS policy on HTTPS responses");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Checked ${htmlFiles.length} HTML pages, ${files.length} built files, and all internal routes/assets.`);
}
