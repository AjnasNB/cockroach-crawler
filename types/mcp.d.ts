import type { CrawlOptions, StructuredExtractionOptions } from "./index.js";

export interface CockroachMcpOptions {
  name?: string;
  crawlDefaults?: CrawlOptions;
  extractDefaults?: Omit<StructuredExtractionOptions, "fields">;
}

export function buildMcpCrawlOptions(
  defaults: CrawlOptions,
  request: { urls: string[]; maxPages?: number; maxDepth?: number; query?: string }
): CrawlOptions;

export function createCockroachMcpServer(
  options?: CockroachMcpOptions
): import("@modelcontextprotocol/sdk/server/mcp.js").McpServer;

export function connectCockroachStdio(
  options?: CockroachMcpOptions
): Promise<import("@modelcontextprotocol/sdk/server/mcp.js").McpServer>;
