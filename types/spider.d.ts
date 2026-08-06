import type { CrawlFailure, CrawlOptions, CrawlPage } from "./index.js";

export type UrlPattern = string | RegExp;

export interface SpiderRuleContext {
  depth: number;
  rule: SpiderRule;
  spider: Spider;
}

export interface SpiderRule {
  name: string;
  allow: readonly UrlPattern[];
  deny: readonly UrlPattern[];
  callback: ((page: CrawlPage, context: SpiderRuleContext) => unknown) | null;
  follow: boolean;
}

export interface SpiderRuleInput {
  name?: string;
  allow?: UrlPattern | UrlPattern[];
  deny?: UrlPattern | UrlPattern[];
  callback?: (page: CrawlPage, context: SpiderRuleContext) => unknown;
  follow?: boolean;
}

export interface AutoThrottleOptions {
  targetLatencyMs?: number;
  minDelayMs?: number;
  maxDelayMs?: number;
  startDelayMs?: number;
  smoothing?: number;
}

export declare class AutoThrottle {
  constructor(options?: AutoThrottleOptions);
  readonly targetLatencyMs: number;
  readonly minDelayMs: number;
  readonly maxDelayMs: number;
  readonly smoothing: number;
  delayMs: number;
  readonly samples: number;
  observe(latencyMs: number, throttled?: boolean): number;
}

export interface SpiderCheckpointOptions {
  directory: string;
  name?: string;
  maxUrls?: number;
}

export interface SpiderCheckpointState {
  savedAtMs: number;
  visited: string[];
  frontier: string[];
  itemCount: number;
}

export declare class SpiderCheckpoint {
  constructor(options: SpiderCheckpointOptions);
  readonly directory: string;
  readonly name: string;
  readonly maxUrls: number;
  readonly filename: string;
  save(state: { visited?: Iterable<string>; frontier?: Iterable<string>; itemCount?: number }): Promise<string>;
  load(): Promise<SpiderCheckpointState | null>;
}

export interface SpiderStats {
  pages: number;
  items: number;
  visited: number;
  remaining: number;
  failures: number;
}

export interface SpiderResult<Item = unknown> {
  items: Item[];
  stats: SpiderStats;
  failures: readonly CrawlFailure[];
}

export interface SpiderOptions extends Omit<CrawlOptions, "seeds" | "urls" | "maxPages" | "maxDepth"> {
  startUrls: string | string[];
  rules?: SpiderRuleInput[];
  parse?: (page: CrawlPage, context: SpiderRuleContext) => unknown;
  maxPages?: number;
  maxDepth?: number;
  batchSize?: number;
  autoThrottle?: boolean | AutoThrottle | AutoThrottleOptions;
  checkpoint?: SpiderCheckpoint;
  checkpointEvery?: number;
}

export declare class Spider<Item = unknown> {
  constructor(options: SpiderOptions);
  readonly startUrls: string[];
  readonly rules: readonly SpiderRule[];
  readonly maxPages: number;
  readonly maxDepth: number;
  readonly batchSize: number;
  readonly throttle: AutoThrottle | null;
  readonly checkpoint: SpiderCheckpoint | null;
  readonly visited: Set<string>;
  readonly failures: CrawlFailure[];
  matchRule(url: string): SpiderRule | null;
  parse(page: CrawlPage, context: SpiderRuleContext): Promise<unknown> | unknown;
  resume(): Promise<boolean>;
  persist(): Promise<string | null>;
  stream(): AsyncGenerator<Item, void, void>;
  run(): Promise<SpiderResult<Item>>;
}

export declare class CrawlSpider<Item = unknown> extends Spider<Item> {}

export declare class SitemapSpider<Item = unknown> extends Spider<Item> {}

export const spiderDefaults: {
  readonly checkpointSchema: "cockroach.spider-checkpoint.v1";
};
