import type {
  BrowserOptions,
  CrawlFailure,
  CrawlOptions,
  CrawlPage,
  CrawlStats
} from "./index.js";

export interface AgentBrowserInput {
  waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
  waitFor?: string;
  click?: string[];
}

export interface CockroachCrawlerToolInput {
  urls: string[];
  maxPages?: number;
  maxDepth?: number;
  sameOrigin?: boolean;
  includeSitemaps?: boolean;
  skipSensitivePaths?: boolean;
  /** Literal URL fragments, not regular expressions. */
  include?: string[];
  /** Literal URL fragments, not regular expressions. */
  exclude?: string[];
  browser?: AgentBrowserInput;
}

export interface CockroachCrawlerToolResult {
  pages: CrawlPage[];
  stats: CrawlStats | null;
  failures: CrawlFailure[];
}

export interface CockroachCrawlerToolDefaults extends Omit<
  CrawlOptions,
  "seeds" | "urls" | "browser" | "rendered" | "obeyRobots"
> {
  allowBrowser?: boolean;
  browser?: true | BrowserOptions;
}

export interface CockroachCrawlerTool {
  readonly name: "cockroach_crawl";
  readonly description: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly input_schema: Readonly<Record<string, unknown>>;
  execute(input: CockroachCrawlerToolInput): Promise<CockroachCrawlerToolResult>;
}

export const cockroachCrawlerToolSchema: Readonly<Record<string, unknown>>;
export function createCockroachCrawlerTool(defaults?: CockroachCrawlerToolDefaults): CockroachCrawlerTool;
export function runCockroachCrawlerTool(
  input: CockroachCrawlerToolInput,
  defaults?: CockroachCrawlerToolDefaults
): Promise<CockroachCrawlerToolResult>;
