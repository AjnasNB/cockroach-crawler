import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("npm_execpath is required; run this check through npm run test:types.");
const temp = await mkdtemp(path.join(os.tmpdir(), "cockroach-crawler-types-"));

try {
  const { stdout } = await exec(process.execPath, [npmCli,
    "pack",
    "--json",
    "--ignore-scripts",
    "--pack-destination",
    temp
  ], { cwd: root, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
  const packed = JSON.parse(stdout);
  const tarball = path.join(temp, packed[0].filename);

  await writeFile(path.join(temp, "package.json"), JSON.stringify({
    private: true,
    type: "module"
  }, null, 2));
  await writeFile(path.join(temp, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      noEmit: true,
      skipLibCheck: false,
      types: [],
      lib: ["ES2022", "DOM"]
    },
    include: ["consumer.ts"]
  }, null, 2));
  await writeFile(path.join(temp, "consumer.ts"), `
import {
  crawl,
  crawlDetailed,
  classifyIpAddress,
  resolveUrlTarget,
  type CrawlOptions,
  type CrawlPage
} from "cockroach-crawler";
import {
  createCockroachCrawlerTool,
  type CockroachCrawlerToolInput
} from "cockroach-crawler/agent";

const options: CrawlOptions = {
  seeds: ["https://example.com"],
  maxPages: 2,
  allowedOrigins: ["https://example.com"],
  browser: { waitUntil: "domcontentloaded", click: ["button.more"] }
};
const pages = await crawl(options);
const page: CrawlPage | undefined = pages[0];
pages.stats.requests satisfies number;
pages.failures satisfies readonly unknown[];
const detailed = await crawlDetailed(options);
detailed.stats.bytes satisfies number;
classifyIpAddress("8.8.8.8").isPublic satisfies boolean;
await resolveUrlTarget("https://example.com");

const tool = createCockroachCrawlerTool({ maxPages: 2 });
const input: CockroachCrawlerToolInput = { urls: ["https://example.com"], maxPages: 1 };
const result = await tool.execute(input);
result.pages satisfies CrawlPage[];
void page;
`);

  await exec(process.execPath, [npmCli,
    "install",
    tarball,
    "--ignore-scripts",
    "--no-package-lock",
    "--no-audit",
    "--fund=false"
  ], { cwd: temp, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });

  await exec(process.execPath, [
    "--input-type=module",
    "--eval",
    "const root = await import('cockroach-crawler'); const agent = await import('cockroach-crawler/agent'); if (typeof root.crawl !== 'function' || typeof root.resolveUrlTarget !== 'function' || typeof agent.createCockroachCrawlerTool !== 'function') process.exit(1);"
  ], { cwd: temp, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
  const installedCli = path.join(temp, "node_modules", "cockroach-crawler", "bin", "cockroach-crawl.js");
  const { stdout: versionOutput } = await exec(process.execPath, [installedCli, "--version"], {
    cwd: temp,
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024
  });
  if (versionOutput.trim() !== "0.2.0") throw new Error(`Packed CLI returned '${versionOutput.trim()}'.`);

  const tsc = path.join(root, "node_modules", "typescript", "bin", "tsc");
  await readFile(tsc);
  await exec(process.execPath, [tsc, "-p", path.join(temp, "tsconfig.json")], {
    cwd: temp,
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024
  });
  process.stdout.write("packed runtime, CLI, and strict external TypeScript consumer checks passed\n");
} finally {
  await rm(temp, { recursive: true, force: true });
}
