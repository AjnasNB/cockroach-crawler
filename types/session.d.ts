export interface CookieRecord {
  name: string;
  value: string;
  domain: string;
  hostOnly: boolean;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string | null;
  expiresAtMs: number | null;
  createdAtMs: number;
}

export interface CookieJarOptions {
  maxCookies?: number;
  maxPerDomain?: number;
  maxValueLength?: number;
}

export interface CookieJarState {
  schema: "cockroach.cookie-jar.v1";
  cookies: CookieRecord[];
}

export declare class CookieJar {
  constructor(options?: CookieJarOptions);
  readonly maxCookies: number;
  readonly maxPerDomain: number;
  readonly maxValueLength: number;
  readonly size: number;
  setFromResponse(url: string | URL, headers: Headers | string[] | string): number;
  store(url: string | URL, rawSetCookie: string): boolean;
  matching(url: string | URL): CookieRecord[];
  headerFor(url: string | URL): string;
  clear(): void;
  prune(): void;
  toJSON(): CookieJarState;
  static fromJSON(value: CookieJarState | string, options?: CookieJarOptions): CookieJar;
}

export type ProxyStrategy = "cycle" | "random" | "sticky";

export interface ProxyRotatorOptions {
  proxies: Array<string | URL>;
  strategy?: ProxyStrategy;
  maxFailures?: number;
  cooldownMs?: number;
}

export interface ProxyStat {
  url: string;
  uses: number;
  failures: number;
  disabled: boolean;
}

export declare class ProxyRotator {
  constructor(options: ProxyRotatorOptions);
  readonly strategy: ProxyStrategy;
  readonly maxFailures: number;
  readonly cooldownMs: number;
  readonly healthy: number;
  next(key?: string | null): string;
  report(proxyUrl: string | URL, succeeded: boolean): boolean;
  stats(): readonly ProxyStat[];
}

export interface CrawlSessionOptions extends Record<string, unknown> {
  cookies?: CookieJar;
  proxy?: ProxyRotator;
}

export declare class CrawlSession {
  constructor(options?: CrawlSessionOptions);
  readonly cookies: CookieJar;
  readonly proxy: ProxyRotator | null;
  readonly defaults: Readonly<Record<string, unknown>>;
  readonly requests: number;
  headersFor(url: string | URL): Readonly<{ cookie?: string }>;
  absorb(url: string | URL, headers: Headers | string[] | string): number;
  optionsFor(input?: Record<string, unknown>): Record<string, unknown>;
  toJSON(): { requests: number; cookies: CookieJarState; proxies: readonly ProxyStat[] | null };
}

export const sessionDefaults: {
  readonly jarSchema: "cockroach.cookie-jar.v1";
  readonly rotatorStrategies: readonly ProxyStrategy[];
};
