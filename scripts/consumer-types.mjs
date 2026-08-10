import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageManifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
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
  const packOutput = JSON.parse(stdout);
  const packed = Array.isArray(packOutput)
    ? packOutput[0]
    : packOutput[packageManifest.name] ?? Object.values(packOutput)[0];
  if (!packed?.filename || typeof packed.filename !== "string") {
    throw new Error("npm pack did not return a tarball filename.");
  }
  const tarball = path.join(temp, packed.filename);

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
  extractStructured,
  mapSite,
  classifyIpAddress,
  resolveUrlTarget,
  type CrawlOptions,
  type CrawlPage
} from "cockroach-crawler";
import {
  createCockroachCrawlerTool,
  type CockroachCrawlerToolInput
} from "cockroach-crawler/agent";
import {
  createSourceRegistry,
  type SourceRecord,
  type SourceStatus
} from "cockroach-crawler/sources";
import {
  createSourceRouter,
  type SourceRouteResult,
  type SourceRouteStatus
} from "cockroach-crawler/source-router";
import {
  createExternalSourceProviders,
  setupExternalSources,
  type ExternalSourceProviderId
} from "cockroach-crawler/external-sources";
import {
  createBrowserHost,
  type BrowserHost,
  type BrowserHostCapabilities
} from "cockroach-crawler/browser-host";
import {
  createGovernedBrowserAutomation,
  type BrowserAutomationAction,
  type BrowserAutomationAuthority,
  type BrowserAutomationBackend
} from "cockroach-crawler/browser-automation";
import {
  runSourceProviderConformance,
  type SourceProviderConformanceReport
} from "cockroach-crawler/source-conformance";
import {
  createServerlessCrawler,
  type ServerlessCrawlResult
} from "cockroach-crawler/serverless";
import {
  createTraversalQueue,
  type TraversalOptions
} from "cockroach-crawler/strategies";
import {
  FileCrawlCache,
  createCachedCrawler
} from "cockroach-crawler/cache";
import { parsePdf } from "cockroach-crawler/documents";
import {
  extractWithLlm,
  extractWithRegex,
  extractWithXPath
} from "cockroach-crawler/extractors";
import {
  normalizeScrollOptions,
  type BrowserArtifactOptions
} from "cockroach-crawler/browser";
import {
  createEscalationRouter,
  createProxyGatewayProvider
} from "cockroach-crawler/providers";
import {
  buildMcpCrawlOptions,
  createCockroachMcpServer
} from "cockroach-crawler/mcp";
import { createCrawlerApiServer } from "cockroach-crawler/server";
import { createBoundedJobQueue } from "cockroach-crawler/jobs";
import {
  extractPageQuality,
  type QualityExtractionOptions,
  type QualityExtractionResult
} from "cockroach-crawler/quality";

const options: CrawlOptions = {
  seeds: ["https://example.com"],
  maxPages: 2,
  allowedOrigins: ["https://example.com"],
  browser: {
    waitUntil: "domcontentloaded",
    click: ["button.more"],
    scroll: true,
    flattenShadowDom: true,
    screenshot: true
  },
  traversal: { mode: "adaptive", query: "crawler" }
};
const pages = await crawl(options);
const page: CrawlPage | undefined = pages[0];
pages.stats.requests satisfies number;
pages.failures satisfies readonly unknown[];
const detailed = await crawlDetailed(options);
detailed.stats.bytes satisfies number;
const mapped = await mapSite({ ...options, search: "crawler", maxResults: 1 });
mapped.entries[0]?.linkCount satisfies number | undefined;
const extracted = extractStructured("<h1>Hello</h1>", "https://example.com", {
  fields: { heading: "h1" }
});
extracted.data.heading satisfies string | string[] | null;
classifyIpAddress("8.8.8.8").isPublic satisfies boolean;
await resolveUrlTarget("https://example.com");

const tool = createCockroachCrawlerTool({ maxPages: 2 });
const input: CockroachCrawlerToolInput = { urls: ["https://example.com"], maxPages: 1 };
const result = await tool.execute(input);
result.pages satisfies CrawlPage[];

const sources = createSourceRegistry({ github: {} });
sources.doctor() satisfies readonly SourceStatus[];
const sourceResults = await sources.search("github", { query: "crawler", maxResults: 1 });
sourceResults satisfies readonly SourceRecord[];
const sourceRouter = createSourceRouter({
  registry: sources,
  routes: {
    publicArticle: {
      operation: "read",
      providers: [{ id: "web" }]
    }
  }
});
sourceRouter.doctor() satisfies readonly SourceRouteStatus[];
const routedSource = await sourceRouter.route("publicArticle", "https://example.com");
routedSource satisfies SourceRouteResult;
const externalSources = createExternalSourceProviders({ opencliAvailability: "unavailable" });
externalSources[0]?.id satisfies string | undefined;
const externalProviderId: ExternalSourceProviderId = "youtube-no-key";
const setupPlan = await setupExternalSources({ channels: ["youtube"] });
setupPlan.mode satisfies "dry-run" | "applied";
void externalProviderId;
void createBrowserHost;
type _BrowserHostContract = BrowserHost;
type _BrowserCapabilityContract = BrowserHostCapabilities;
const automationBackend: BrowserAutomationBackend = {
  supportedActions: ["page.url"],
  async openSession() { return {}; },
  async runAction(_handle, action) {
    return {
      data: null,
      attestation: {
        action: action.kind,
        effect: "read",
        origin: action.origin,
        sessionBound: true,
        withinBudget: true,
        network: { requests: 0, requestBytes: 0, responseBytes: 0 }
      }
    };
  },
  async closeSession() {}
};
const governedAutomation = createGovernedBrowserAutomation({ backend: automationBackend });
void governedAutomation;
const validUpload: BrowserAutomationAction = {
  kind: "upload",
  origin: "https://example.com",
  selector: "input[type=file]",
  fileRefs: ["file:one"],
  maxFileBytes: 1024,
  maxBytes: 1024
};
void validUpload;
// @ts-expect-error upload requires trusted file references and both byte ceilings
const invalidUpload: BrowserAutomationAction = { kind: "upload", origin: "https://example.com", selector: "input" };
// @ts-expect-error exact action contracts reject unknown fields
const invalidPageUrl: BrowserAutomationAction = { kind: "page.url", origin: "https://example.com", surprise: true };
// @ts-expect-error fill does not accept typing delay
const invalidFill: BrowserAutomationAction = { kind: "fill", origin: "https://example.com", selector: "input", text: "x", delayMs: 1 };
// @ts-expect-error a new tab is blank-only and rejects implicit navigation fields
const invalidTabOpen: BrowserAutomationAction = { kind: "tab.open", origin: "https://example.com", url: "https://example.com", timeoutMs: 1 };
// @ts-expect-error screenshots support only runtime-verified png and jpeg formats
const invalidScreenshot: BrowserAutomationAction = { kind: "screenshot", origin: "https://example.com", artifactName: "x.webp", maxBytes: 1, format: "webp" };
// @ts-expect-error fulfilled routes require an explicit body byte ceiling
const invalidRoute: BrowserAutomationAction = { kind: "network.route.add", origin: "https://example.com", route: { id: "one", origin: "https://example.com", pathPattern: "/*", response: { mode: "fulfill" } } };
void invalidUpload;
void invalidPageUrl;
void invalidFill;
void invalidTabOpen;
void invalidScreenshot;
void invalidRoute;
const validAuthority: BrowserAutomationAuthority = {
  principalId: "agent:test",
  allowedOrigins: ["https://example.com"],
  allowedActions: ["page.url"],
  allowedEffects: ["read"],
  maxActions: 10,
  maxActionMs: 1000,
  maxSessionMs: 5000,
  maxArtifactBytes: 1024,
  maxUploadBytes: 1024,
  maxTotalArtifactBytes: 4096,
  maxTotalUploadBytes: 4096,
  maxNetworkRequestBytes: 1024,
  maxNetworkResponseBytes: 4096,
  maxTotalNetworkRequestBytes: 4096,
  maxTotalNetworkResponseBytes: 16_384
};
void validAuthority;
// @ts-expect-error session upload authority is mandatory and separate from artifact authority
const invalidAuthority: BrowserAutomationAuthority = {
  principalId: "agent:test",
  allowedOrigins: ["https://example.com"],
  allowedActions: ["page.url"],
  allowedEffects: ["read"],
  maxActions: 10,
  maxActionMs: 1000,
  maxSessionMs: 5000,
  maxArtifactBytes: 1024,
  maxUploadBytes: 1024,
  maxTotalArtifactBytes: 4096
};
void invalidAuthority;
const conformance = await runSourceProviderConformance({
  registry: sources,
  providerId: "github"
}).catch(() => null);
conformance satisfies SourceProviderConformanceReport | null;

const serverless = createServerlessCrawler({ allowedOrigins: ["https://example.com"] });
const serverlessResult = await serverless.crawl({ url: "https://example.com", maxPages: 1 });
serverlessResult satisfies ServerlessCrawlResult;

const traversal: TraversalOptions = { mode: "dfs" };
const queue = createTraversalQueue(traversal);
queue.push({ url: "https://example.com" });
queue.shift()?.url satisfies string | undefined;
const cache = new FileCrawlCache({ directory: ".cache/cockroach" });
const cached = createCachedCrawler(cache, crawlDetailed);
void cached;
void parsePdf;
extractWithXPath("<h1>Hello</h1>", "https://example.com", {
  fields: { heading: "//*[local-name()='h1']" }
}).data.heading satisfies string | string[] | null;
void extractWithLlm;
extractWithRegex("Invoice 42", {
  fields: { invoice: { pattern: "(\\d+)", group: 1 } }
}).data.invoice satisfies string | string[] | null;
const artifacts: BrowserArtifactOptions = { screenshot: true, pdf: true };
void artifacts;
normalizeScrollOptions(true).maxSteps satisfies number;
const escalation = createEscalationRouter({
  providers: [{ id: "direct", execute: async () => ({ status: 200 }) }]
});
void escalation;
const proxy = createProxyGatewayProvider({
  id: "fixed",
  endpoint: "https://proxy.example.com/v1/fetch"
});
void proxy;
const jobs = createBoundedJobQueue({
  execute: async (input: { value: number }) => ({ value: input.value })
});
jobs.submit({ value: 1 }).status satisfies string;
buildMcpCrawlOptions(
  { maxPages: 2, allowedOrigins: ["https://example.com"] },
  { urls: ["https://example.com"], maxPages: 1 }
).maxPages satisfies number | undefined;
const mcp = createCockroachMcpServer({
  crawlDefaults: { maxPages: 2, allowedOrigins: ["https://example.com"] }
});
void mcp;
const api = createCrawlerApiServer({
  host: "127.0.0.1",
  allowUnauthenticatedLoopback: true,
  crawlDefaults: { maxPages: 2, allowedOrigins: ["https://example.com"] }
});
api.host satisfies string;
const qualityOptions: QualityExtractionOptions = {
  profile: "balanced",
  url: "https://example.com/article",
  failClosed: true,
  diagnostics: true
};
const qualityResult: QualityExtractionResult = extractPageQuality(
  "<html><body><article><h1>Evidence</h1><p>Bounded extraction content.</p></article></body></html>",
  qualityOptions
);
qualityResult.status satisfies "accepted" | "abstained";
qualityResult.backend.version satisfies "0.2.0";
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
    "const root = await import('cockroach-crawler'); const agent = await import('cockroach-crawler/agent'); const sources = await import('cockroach-crawler/sources'); const router = await import('cockroach-crawler/source-router'); const external = await import('cockroach-crawler/external-sources'); const browserHost = await import('cockroach-crawler/browser-host'); const automation = await import('cockroach-crawler/browser-automation'); const conformance = await import('cockroach-crawler/source-conformance'); const serverless = await import('cockroach-crawler/serverless'); const strategies = await import('cockroach-crawler/strategies'); const cache = await import('cockroach-crawler/cache'); const documents = await import('cockroach-crawler/documents'); const extractors = await import('cockroach-crawler/extractors'); const browser = await import('cockroach-crawler/browser'); const providers = await import('cockroach-crawler/providers'); const mcp = await import('cockroach-crawler/mcp'); const server = await import('cockroach-crawler/server'); const jobs = await import('cockroach-crawler/jobs'); const quality = await import('cockroach-crawler/quality'); if (typeof root.crawl !== 'function' || typeof root.mapSite !== 'function' || typeof root.extractStructured !== 'function' || typeof root.resolveUrlTarget !== 'function' || typeof agent.createCockroachCrawlerTool !== 'function' || typeof sources.createSourceRegistry !== 'function' || typeof router.createSourceRouter !== 'function' || typeof external.createExternalSourceProviders !== 'function' || typeof browserHost.createBrowserHost !== 'function' || typeof automation.createGovernedBrowserAutomation !== 'function' || typeof automation.createGovernedPlaywrightBackend !== 'function' || typeof conformance.runSourceProviderConformance !== 'function' || typeof serverless.createServerlessCrawler !== 'function' || typeof strategies.createTraversalQueue !== 'function' || typeof cache.FileCrawlCache !== 'function' || typeof documents.parsePdf !== 'function' || typeof extractors.extractWithXPath !== 'function' || typeof extractors.extractWithRegex !== 'function' || typeof browser.capturePageArtifacts !== 'function' || typeof providers.createEscalationRouter !== 'function' || typeof providers.createProxyGatewayProvider !== 'function' || typeof mcp.createCockroachMcpServer !== 'function' || typeof server.createCrawlerApiServer !== 'function' || typeof jobs.createBoundedJobQueue !== 'function' || typeof quality.extractPageQuality !== 'function') process.exit(1);"
  ], { cwd: temp, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
  const installedCli = path.join(temp, "node_modules", "cockroach-crawler", "bin", "cockroach-crawl.js");
  const { stdout: versionOutput } = await exec(process.execPath, [installedCli, "--version"], {
    cwd: temp,
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024
  });
  if (versionOutput.trim() !== packageManifest.version) {
    throw new Error(`Packed CLI returned '${versionOutput.trim()}', expected '${packageManifest.version}'.`);
  }

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
