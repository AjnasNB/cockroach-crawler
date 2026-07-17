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
const browser = await chromium.launch({ headless: true });
try {
  const routes = ["/", "/docs/", "/security/", "/providers/", "/benchmark/", "/roadmap/", "/community/", "/release/"];
  const results = [];
  for (const route of routes) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
    page.on("requestfailed", (request) => errors.push(`request: ${request.url()} ${request.failure()?.errorText}`));
    const response = await page.goto(`${origin}${route}`, { waitUntil: "networkidle" });
    const metrics = await page.evaluate(() => ({
      h1: document.querySelectorAll("h1").length,
      title: document.title,
      horizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      images: [...document.images].map((image) => ({ src: image.getAttribute("src"), ok: image.complete && image.naturalWidth > 0, alt: image.hasAttribute("alt") })),
      main: document.querySelector("main")?.getAttribute("tabindex")
    }));
    if (route === "/providers/") await page.screenshot({ path: `${output}/providers-desktop.png`, fullPage: true });
    if (route === "/release/") await page.screenshot({ path: `${output}/release-desktop.png`, fullPage: true });
    results.push({ route, status: response?.status(), ...metrics, badImages: metrics.images.filter((image) => !image.ok || !image.alt), errors });
    await page.close();
  }

  const homeContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ["clipboard-read", "clipboard-write"] });
  const home = await homeContext.newPage();
  await home.goto(`${origin}/`, { waitUntil: "networkidle" });
  await home.screenshot({ path: `${output}/home-desktop.png`, fullPage: true });
  await home.keyboard.press("Tab");
  const firstFocus = await home.evaluate(() => ({ className: document.activeElement?.className, text: document.activeElement?.textContent?.trim() }));
  await home.keyboard.press("Enter");
  const afterSkip = await home.evaluate(() => ({ id: document.activeElement?.id, hash: location.hash }));
  await home.locator(".copy-button").first().click();
  await home.waitForFunction(() => document.querySelector(".copy-button")?.textContent === "Copied");
  const copyLabel = await home.locator(".copy-button").first().textContent();
  await homeContext.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await mobile.goto(`${origin}/`, { waitUntil: "networkidle" });
  const mobileMetrics = await mobile.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    navVisible: getComputedStyle(document.querySelector(".mobile-nav")).display
  }));
  await mobile.screenshot({ path: `${output}/home-mobile.png`, fullPage: true });
  await mobile.goto(`${origin}/docs/`, { waitUntil: "networkidle" });
  await mobile.screenshot({ path: `${output}/docs-mobile.png`, fullPage: true });
  await mobile.close();

  const failed = results.filter((result) => result.status !== 200 || result.h1 !== 1 || result.horizontal || result.badImages.length || result.errors.length || result.main !== "-1");
  console.log(JSON.stringify({ routes: results, keyboard: { firstFocus, afterSkip, copyLabel }, mobile: mobileMetrics }, null, 2));
  if (failed.length || firstFocus.className !== "skip-link" || afterSkip.id !== "main" || copyLabel !== "Copied" || mobileMetrics.horizontal || mobileMetrics.navVisible === "none") {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
  server.kill();
}
