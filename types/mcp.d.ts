import type { CrawlOptions, StructuredExtractionOptions } from "./index.js";

export interface CockroachMcpOptions {
  name?: string;
  crawlDefaults?: CrawlOptions;
  extractDefaults?: Omit<StructuredExtractionOptions, "fields">;
}

export interface CockroachMcpTransport {
  onmessage?: (message: any) => void | Promise<void>;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  start(): Promise<void>;
  send(message: unknown): Promise<void>;
  close(): Promise<void>;
}

export interface CockroachMcpServer {
  connect(transport: CockroachMcpTransport): Promise<void>;
  close(): Promise<void>;
}

export function buildMcpCrawlOptions(
  defaults: CrawlOptions,
  request: {
    urls: string[];
    maxPages?: number;
    maxDepth?: number;
    query?: string;
    search?: string;
    maxResults?: number;
  }
): CrawlOptions;

export function createCockroachMcpServer(
  options?: CockroachMcpOptions
): CockroachMcpServer;

export function connectCockroachStdio(
  options?: CockroachMcpOptions
): Promise<CockroachMcpServer>;
