import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const origin = "http://127.0.0.1:4173";
const output = "D:/temp/cockroach-site-audit";
const server = spawn(process.execPath, ["serve.mjs"], { cwd: fileURLToPath(new URL(".", import.meta.url)), stdio: "ignore", windowsHide: true });

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Site server did not start");
}

await mkdir(output, { recursive: true });
await waitForServer();
const captionResponse = await fetch(`${origin}/media/captions-cockroach-crawler-main-60s-en.vtt`, { method: "HEAD" });
const rangeResponse = await fetch(`${origin}/media/cockroach-crawler-main-60s.mp4`, { headers: { Range: "bytes=0-31" } });
const rangeBody = await rangeResponse.arrayBuffer();
const mediaServer = {
  captions: captionResponse.status === 200 && captionResponse.headers.get("content-type")?.startsWith("text/vtt"),
  range: rangeResponse.status === 206 && rangeResponse.headers.get("content-type") === "video/mp4" && rangeResponse.headers.get("content-range")?.startsWith("bytes 0-31/") && rangeBody.byteLength === 32
};
const browser = await chromium.launch({ headless: true });
const routes = [
  "/",
  "/docs/",
  "/docs/cli/",
  "/docs/javascript/",
  "/docs/map-and-extract/",
  "/docs/agents/",
  "/docs/providers/",
  "/docs/serverless/",
  "/security/",
  "/providers/",
  "/compare/",
  "/stack/",
  "/benchmark/",
  "/media/",
  "/launch/",
  "/roadmap/",
  "/community/",
  "/release/"
];
try {
  const results = [];
  for (const route of routes) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
    page.on("requestfailed", (request) => {
      if (request.url().endsWith(".mp4") && request.failure()?.errorText === "net::ERR_ABORTED") return;
      errors.push(`request: ${request.url()} ${request.failure()?.errorText}`);
    });
    const response = await page.goto(`${origin}${route}`, { waitUntil: "load" });
    const metrics = await page.evaluate(() => ({
      h1: document.querySelectorAll("h1").length,
      title: document.title,
      horizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      images: [...document.images].map((image) => ({ src: image.getAttribute("src"), ok: image.complete && image.naturalWidth > 0, alt: image.hasAttribute("alt") })),
      main: document.querySelector("main")?.getAttribute("tabindex"),
      accessibleTables: [...document.querySelectorAll(".table-wrap")].every((region) => region.tabIndex === 0 && region.getAttribute("role") === "region" && region.hasAttribute("aria-label")),
      accessibleCode: [...document.querySelectorAll("pre")].every((region) => region.tabIndex === 0 && region.hasAttribute("aria-label")),
      videos: [...document.querySelectorAll("video")].map((video) => ({ controls: video.controls, autoplay: video.autoplay, poster: Boolean(video.poster), captions: Boolean(video.querySelector('track[kind="captions"]')), captionsDefault: Boolean(video.querySelector('track[kind="captions"][default]')) })),
      docsDirectory: (() => {
        const directory = document.querySelector(".doc-route-grid");
        if (!directory) return null;
        return {
          display: getComputedStyle(directory).display,
          columns: getComputedStyle(directory).gridTemplateColumns,
          cards: directory.querySelectorAll(":scope > a").length
        };
      })()
    }));
    if (route === "/docs/") await page.screenshot({ path: `${output}/docs-desktop.png`, fullPage: true });
    if (route === "/providers/") await page.screenshot({ path: `${output}/providers-desktop.png`, fullPage: true });
    if (route === "/compare/") await page.screenshot({ path: `${output}/compare-desktop.png`, fullPage: true });
    if (route === "/stack/") await page.screenshot({ path: `${output}/stack-desktop.png`, fullPage: true });
    if (route === "/release/") await page.screenshot({ path: `${output}/release-desktop.png`, fullPage: true });
    results.push({ route, status: response?.status(), ...metrics, badImages: metrics.images.filter((image) => !image.ok || !image.alt), errors });
    await page.close();
  }

  const homeContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ["clipboard-read", "clipboard-write"] });
  const home = await homeContext.newPage();
  await home.goto(`${origin}/`, { waitUntil: "load" });
  await home.screenshot({ path: `${output}/home-desktop.png`, fullPage: true });
  await home.keyboard.press("Tab");
  const firstFocus = await home.evaluate(() => ({ className: document.activeElement?.className, text: document.activeElement?.textContent?.trim() }));
  await home.keyboard.press("Enter");
  const afterSkip = await home.evaluate(() => ({ id: document.activeElement?.id, hash: location.hash }));
  await home.locator(".copy-button").first().click();
  await home.waitForFunction(() => document.querySelector(".copy-button")?.textContent === "Copied");
  const copyLabel = await home.locator(".copy-button").first().textContent();
  await homeContext.close();

  const mobileResults = [];
  for (const width of [320, 390]) {
    const mobile = await browser.newPage({ viewport: { width, height: 844 }, deviceScaleFactor: 1 });
    for (const route of routes) {
      const errors = [];
      mobile.removeAllListeners("console");
      mobile.removeAllListeners("requestfailed");
      mobile.on("console", (message) => {
        if (message.type() === "error") errors.push(`console: ${message.text()}`);
      });
      mobile.on("requestfailed", (request) => {
        if (request.url().endsWith(".mp4") && request.failure()?.errorText === "net::ERR_ABORTED") return;
        errors.push(`request: ${request.url()} ${request.failure()?.errorText}`);
      });
      const response = await mobile.goto(`${origin}${route}`, { waitUntil: "load" });
      const metrics = await mobile.evaluate(() => {
        const nav = document.querySelector(".mobile-nav");
        const current = nav?.querySelector('[aria-current="page"]');
        const navRect = nav?.getBoundingClientRect();
        const currentRect = current?.getBoundingClientRect();
        const viewportWidth = document.documentElement.clientWidth;
        const isInsideHorizontalScroller = (element) => {
          for (let currentElement = element.parentElement; currentElement; currentElement = currentElement.parentElement) {
            const overflowX = getComputedStyle(currentElement).overflowX;
            if (overflowX === "auto" || overflowX === "scroll") return true;
          }
          return false;
        };
        const overflowElements = [...document.body.querySelectorAll("*")]
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return !isInsideHorizontalScroller(element) && (rect.left < -1 || rect.right > viewportWidth + 1);
          })
          .slice(0, 8)
          .map((element) => ({
            tag: element.tagName.toLowerCase(),
            className: typeof element.className === "string" ? element.className : "",
            text: element.textContent?.trim().slice(0, 80) || ""
          }));
        return {
          horizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          overflowElements,
          navVisible: nav ? getComputedStyle(nav).display : "missing",
          currentNavVisible: !navRect || !currentRect ? false : currentRect.left >= navRect.left - 1 && currentRect.right <= navRect.right + 1,
          mobileToc: routeNeedsToc() ? Boolean(document.querySelector(".mobile-toc")) && getComputedStyle(document.querySelector(".mobile-toc")).display !== "none" : true
        };

        function routeNeedsToc() {
          return window.location.pathname === "/docs/";
        }
      });
      mobileResults.push({ width, route, status: response?.status(), ...metrics, errors });
      if (route === "/" || route === "/docs/" || route === "/media/") {
        const name = route === "/" ? "home" : route.slice(1, -1);
        await mobile.screenshot({ path: `${output}/${name}-${width}.png`, fullPage: true });
      }
    }
    await mobile.close();
  }

  const failed = results.filter((result) => result.status !== 200 || result.h1 !== 1 || result.horizontal || result.badImages.length || result.errors.length || result.main !== "-1" || !result.accessibleTables || !result.accessibleCode || result.videos.some((video) => !video.controls || video.autoplay || !video.poster || !video.captions || video.captionsDefault) || (result.route === "/docs/" && (result.docsDirectory?.display !== "grid" || result.docsDirectory.cards !== 8)));
  const mobileFailed = mobileResults.filter((result) => result.status !== 200 || result.horizontal || result.navVisible === "none" || !result.currentNavVisible || !result.mobileToc || result.errors.length);
  console.log(JSON.stringify({ routes: results, keyboard: { firstFocus, afterSkip, copyLabel }, mediaServer, mobile: mobileResults }, null, 2));
  if (failed.length || mobileFailed.length || !mediaServer.captions || !mediaServer.range || firstFocus.className !== "skip-link" || afterSkip.id !== "main" || copyLabel !== "Copied") {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
  server.kill();
}
