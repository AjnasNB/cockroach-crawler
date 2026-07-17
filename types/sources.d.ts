import type { CrawlOptions } from "./index.js";

export type BuiltinSourceId = "web" | "github" | "youtube" | "x" | "reddit";
export type SourceStatusValue = "ready" | "partial" | "missing_credentials" | "unavailable";

export interface SourceCapabilities {
  readonly search?: boolean;
  readonly read?: boolean;
  readonly crawl?: boolean;
  readonly transcript?: boolean;
  readonly [capability: string]: boolean | undefined;
}

export interface SourceStatus {
  readonly id: string;
  readonly status: SourceStatusValue;
  readonly capabilities: SourceCapabilities;
  readonly authentication: string;
  readonly message: string;
}

export interface SourceProvenance {
  readonly retrievedAt: string;
  readonly method: string;
  /** True only when the provider authenticated a principal, not merely a quota project. */
  readonly authenticated: boolean;
  /** True when the request used a credential, including a non-principal API key. */
  readonly credentialed: boolean;
}

export interface SourceRecord {
  readonly source: string;
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly url: string;
  readonly text: string;
  readonly author: string | null;
  readonly publishedAt: string | null;
  readonly contentHash: `sha256:${string}`;
  readonly adapterVersion: string;
  readonly warnings: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly provenance: SourceProvenance;
}

export interface SourceSearchInput {
  query: string;
  maxResults?: number;
  kind?: "repositories" | "issues" | string;
  subreddit?: string;
  signal?: AbortSignal;
}

export interface SourceReadInput {
  target: string;
  maxResults?: number;
  signal?: AbortSignal;
}

export interface SourceProvider {
  readonly id: string;
  status(): SourceStatus;
  search?(input: Required<Pick<SourceSearchInput, "query" | "maxResults">> & SourceSearchInput): Promise<SourceRecord[]>;
  read?(input: Required<Pick<SourceReadInput, "target" | "maxResults">> & SourceReadInput): Promise<SourceRecord[]>;
}

export interface GitHubSourceConfig {
  token?: string;
}

export interface YouTubeSourceConfig {
  apiKey?: string;
}

export interface XSourceConfig {
  bearerToken?: string;
}

export interface RedditSourceConfig {
  clientId?: string;
  clientSecret?: string;
  userAgent?: string;
}

export interface WebSourceConfig {
  crawlOptions?: Omit<CrawlOptions, "seeds" | "urls" | "signal">;
}

export interface SourceRegistryOptions {
  fetch?: typeof fetch;
  timeoutMs?: number;
  maxResponseBytes?: number;
  github?: GitHubSourceConfig;
  youtube?: YouTubeSourceConfig;
  x?: XSourceConfig;
  reddit?: RedditSourceConfig;
  web?: WebSourceConfig;
  providers?: SourceProvider[];
}

export interface SourceRegistry {
  list(): string[];
  doctor(): readonly SourceStatus[];
  search(provider: string, input: SourceSearchInput): Promise<readonly SourceRecord[]>;
  read(provider: string, input: string | SourceReadInput): Promise<readonly SourceRecord[]>;
}

export class SourceAccessError extends Error {
  readonly code: string;
  readonly details: Readonly<Record<string, unknown>>;
  constructor(code: string, message: string, details?: Record<string, unknown>);
}

export function createSourceRegistry(options?: SourceRegistryOptions): SourceRegistry;
export function createSourceRegistryFromEnv(
  env?: Record<string, string | undefined>,
  options?: Omit<SourceRegistryOptions, "github" | "youtube" | "x" | "reddit">
): SourceRegistry;
export const builtinSourceIds: readonly BuiltinSourceId[];
