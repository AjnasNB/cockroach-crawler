import type { CrawlOptions, StructuredExtractionOptions } from "./index.js";

export interface CrawlerApiOptions {
  host?: string;
  port?: number;
  token?: string;
  allowUnauthenticatedLoopback?: boolean;
  maxBodyBytes?: number;
  maxResponseBytes?: number;
  crawlDefaults?: CrawlOptions;
  extractDefaults?: Omit<StructuredExtractionOptions, "fields">;
  queue?: false | {
    concurrency?: number;
    maxPending?: number;
    maxRetained?: number;
    maxResultBytes?: number;
  };
}

export interface CrawlerHttpServer {
  readonly listening: boolean;
  listen(...args: any[]): this;
  close(callback?: (error?: Error) => void): this;
  closeIdleConnections?(): void;
  closeAllConnections?(): void;
  address(): unknown;
}

export function createCrawlerApiServer(options?: CrawlerApiOptions): {
  server: CrawlerHttpServer;
  host: string;
  jobs: ReturnType<typeof import("./jobs.js").createBoundedJobQueue> | null;
};

export function startCrawlerApi(options?: CrawlerApiOptions): Promise<{
  server: CrawlerHttpServer;
  host: string;
  port: number;
  url: string;
  close(): Promise<void>;
}>;
