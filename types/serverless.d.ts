export interface ServerlessCrawlerConfig {
  allowedOrigins: string[];
  fetch?: typeof fetch;
  accessToken?: string;
  userAgent?: string;
  maxPages?: number;
  maxDepth?: number;
  maxRequests?: number;
  maxBytes?: number;
  maxTotalBytes?: number;
  timeoutMs?: number;
  maxDurationMs?: number;
  maxRedirects?: number;
  delayMs?: number;
}

export interface ServerlessCrawlInput {
  url: string;
  maxPages?: number;
  maxDepth?: number;
}

export interface ServerlessPage {
  readonly url: string;
  readonly title: string;
  readonly description: string;
  readonly h1: string;
  readonly text: string;
  readonly markdown: string;
  readonly links: readonly string[];
  readonly depth: number;
  readonly discoveredFrom: string | null;
  readonly fetchedAt: string;
  readonly contentHash: `sha256:${string}`;
}

export interface ServerlessCrawlResult {
  readonly pages: readonly ServerlessPage[];
  readonly failures: readonly { readonly url: string; readonly code: string; readonly error: string }[];
  readonly stats: Readonly<Record<string, number>>;
  readonly runtime: Readonly<{
    tier: "serverless";
    version: string;
    browser: false;
    authenticatedProviders: false;
    dnsValidation: false;
    resolvedAddressClassification: false;
    dnsPinning: false;
    allowlistScope: "operator-owned-or-trusted-origins";
    allowlistedOrigins: readonly string[];
  }>;
}

export interface ServerlessCrawler {
  crawl(input: ServerlessCrawlInput): Promise<ServerlessCrawlResult>;
  fetch(request: Request): Promise<Response>;
}

export class ServerlessCrawlerError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status?: number);
}

export function createServerlessCrawler(config: ServerlessCrawlerConfig): ServerlessCrawler;
