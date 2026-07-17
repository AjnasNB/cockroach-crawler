import { chromium } from "playwright";
import { fileURLToPath } from "node:url";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto(new URL("./assets/social-card.svg", import.meta.url).href);
  await page.screenshot({ path: fileURLToPath(new URL("./assets/social-card.png", import.meta.url)) });
} finally {
  await browser.close();
}
