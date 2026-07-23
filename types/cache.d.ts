export interface FileCrawlCacheOptions {
  directory: string;
  namespace?: string;
  ttlMs?: number;
  maxEntries?: number;
  maxBytes?: number;
}

export interface CrawlCache {
  key?(input: unknown): string;
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown, options?: { ttlMs?: number }): Promise<void>;
  delete?(key: string): Promise<void>;
}

export class FileCrawlCache implements CrawlCache {
  constructor(options: FileCrawlCacheOptions);
  readonly directory: string;
  readonly namespace: string;
  readonly ttlMs: number;
  readonly maxEntries: number;
  readonly maxBytes: number;
  key(input: unknown): string;
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown, options?: { ttlMs?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  prune(): Promise<{ removed: number; entries: number; bytes: number }>;
}

export interface CachedCrawlResult<T> {
  cache: { hit: boolean; key: string };
  pages?: unknown[];
  failures?: unknown[];
  stats?: unknown;
  value?: T;
}

export function createCrawlCacheKey(input: unknown, namespace?: string): string;
export function createCachedCrawler<TInput, TResult extends object>(
  cache: CrawlCache,
  crawler: (input: TInput) => Promise<TResult>
): (
  input: TInput,
  options?: { key?: string; namespace?: string; ttlMs?: number; refresh?: boolean }
) => Promise<TResult & { cache: { hit: boolean; key: string } }>;
