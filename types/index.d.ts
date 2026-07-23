export type UrlPattern = string | RegExp;

export interface DnsLookupAddress {
  address: string;
  family: 4 | 6;
}

export type DnsLookup = (
  hostname: string,
  options: { all: true; verbatim: true }
) => DnsLookupAddress | DnsLookupAddress[] | Promise<DnsLookupAddress | DnsLookupAddress[]>;

export interface BrowserOptions {
  headless?: boolean;
  headed?: boolean;
  channel?: string;
  executablePath?: string;
  storageState?: string;
  saveStorageState?: string;
  waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
  waitFor?: string | number;
  click?: string | string[];
}

export interface CrawlFailure {
  url: string;
  phase: "page" | "sitemap" | string;
  code: string;
  error: string;
}

export interface RedirectHop {
  from: string;
  to: string;
  status: number;
}

export interface CrawlPage {
  url: string;
  canonical: string | null;
  title: string;
  description: string;
  h1: string;
  language: string | null;
  text: string;
  markdown: string;
  links: string[];
  fetchedAt: string;
  status?: number;
  contentType?: string;
  bytes?: number;
  contentHash?: `sha256:${string}`;
  depth?: number;
  discoveredFrom?: string | null;
  redirectChain?: RedirectHop[];
  etag?: string | null;
  lastModified?: string | null;
  robotsAllowed?: boolean;
  structured?: Record<string, string | string[] | null>;
  extractionWarnings?: string[];
}

export type StructuredExtractionSource = "text" | "html" | "attribute";

export interface StructuredExtractionField {
  selector: string;
  source?: StructuredExtractionSource;
  attribute?: string;
  multiple?: boolean;
  limit?: number;
  resolveUrl?: boolean;
}

export interface StructuredExtractionOptions {
  fields: Record<string, string | StructuredExtractionField>;
  maxFields?: number;
  maxItemsPerField?: number;
  maxInputCharacters?: number;
  maxValueLength?: number;
  maxTotalValues?: number;
  maxTotalCharacters?: number;
}

export interface StructuredExtractionResult {
  data: Record<string, string | string[] | null>;
  warnings: string[];
}

export interface CrawlStats {
  fetched: number;
  requests: number;
  bytes: number;
  retries: number;
  skippedRobots: number;
  skippedFiltered: number;
  skippedNonPublic: number;
  skippedOrigin: number;
  queueDropped: number;
  errors: number;
  pages: number;
  failures: number;
  queued: number;
  seen: number;
  durationMs: number;
  startedAt: string;
  finishedAt: string;
}

export interface CrawlPages extends Array<CrawlPage> {
  readonly stats: CrawlStats;
  readonly failures: CrawlFailure[];
}

export interface CrawlOptions {
  seeds?: string | string[];
  urls?: string | string[];
  maxPages?: number;
  maxSeeds?: number;
  maxRequests?: number;
  maxQueue?: number;
  maxLinksPerPage?: number;
  maxUrlLength?: number;
  maxDepth?: number;
  concurrency?: number;
  sameOrigin?: boolean;
  allowedOrigins?: string[];
  include?: UrlPattern | UrlPattern[];
  exclude?: UrlPattern | UrlPattern[];
  skipSensitivePaths?: boolean;
  /** @deprecated Use skipSensitivePaths. This does not control network reachability. */
  publicOnly?: boolean;
  includeSitemaps?: boolean;
  maxSitemaps?: number;
  maxUrlsPerSitemap?: number;
  obeyRobots?: boolean;
  allowPrivateNetworks?: boolean;
  userAgent?: string;
  delayMs?: number;
  timeoutMs?: number;
  maxDurationMs?: number;
  maxBytes?: number;
  maxTotalBytes?: number;
  maxRedirects?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  browser?: true | BrowserOptions;
  rendered?: true | BrowserOptions;
  extract?: StructuredExtractionOptions;
  signal?: AbortSignal;
  dnsLookup?: DnsLookup;
  onPage?: (page: CrawlPage) => void | Promise<void>;
  onError?: (failure: CrawlFailure) => void | Promise<void>;
}

export interface CrawlDetailedResult {
  pages: CrawlPage[];
  failures: CrawlFailure[];
  stats: CrawlStats;
}

export interface SiteMapEntry {
  url: string;
  canonical: string | null;
  title: string;
  description: string;
  status?: number;
  contentType?: string;
  depth?: number;
  discoveredFrom?: string | null;
  contentHash?: `sha256:${string}`;
  linkCount: number;
  fetchedAt: string;
}

export interface SiteMapResult {
  entries: SiteMapEntry[];
  failures: CrawlFailure[];
  stats: CrawlStats;
}

export interface IpClassification {
  address: string;
  family: 0 | 4 | 6;
  range: string;
  isPublic: boolean;
}

export interface ResolvedUrlTarget {
  url: URL;
  hostname: string;
  address: string;
  family: 4 | 6;
  addresses: Array<DnsLookupAddress & IpClassification>;
}

export interface UrlSecurityOptions {
  allowPrivateNetworks?: boolean;
  lookup?: DnsLookup;
  signal?: AbortSignal;
}

export function crawl(options?: CrawlOptions): Promise<CrawlPages>;
export function crawlDetailed(options?: CrawlOptions): Promise<CrawlDetailedResult>;
export function mapSite(options?: CrawlOptions): Promise<SiteMapResult>;
export function discoverSitemapUrls(sitemapUrl: string, options?: CrawlOptions): Promise<string[]>;
export function extractStructured(
  html: string,
  url: string,
  options: StructuredExtractionOptions
): StructuredExtractionResult;
export function extractPage(
  html: string,
  url: string,
  options?: Pick<CrawlOptions, "maxLinksPerPage" | "maxUrlLength" | "extract">
): CrawlPage;
export function normalizeUrl(value: string | URL, maxLength?: number): string;
export function classifyIpAddress(value: string): IpClassification;
export function isPublicIpAddress(value: string): boolean;
export function resolveUrlTarget(value: string | URL, options?: UrlSecurityOptions): Promise<ResolvedUrlTarget>;
