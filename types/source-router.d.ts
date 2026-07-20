import type { SourceReadInput, SourceRecord, SourceRegistry, SourceSearchInput } from "./sources.js";

export type SourceRouteOperation = "read" | "search";

export interface SourceRouteProviderDefinition {
  readonly id: string;
  /** Runtime failures that may explicitly continue to the next provider. Empty by default. */
  readonly fallbackOn?: readonly string[];
}

export interface SourceRouteDefinition {
  readonly operation: SourceRouteOperation;
  readonly providers: readonly SourceRouteProviderDefinition[];
}

export interface SourceRouterOptions {
  readonly registry: SourceRegistry;
  readonly routes: Readonly<Record<string, SourceRouteDefinition>>;
}

export interface SourceRouteProviderStatus {
  readonly id: string;
  readonly status: "ready" | "partial" | "missing_credentials" | "unavailable";
  readonly available: boolean;
  readonly reason: string | null;
  readonly authentication: string;
  readonly message: string;
}

export interface SourceRouteStatus {
  readonly id: string;
  readonly operation: SourceRouteOperation;
  readonly status: "ready" | "unavailable";
  readonly selectedProvider: string | null;
  readonly providers: readonly SourceRouteProviderStatus[];
}

export interface SourceRouteAttempt {
  readonly provider: string;
  readonly state: string;
  readonly errorCode: string | null;
}

export interface SourceRouteResult {
  readonly route: string;
  readonly operation: SourceRouteOperation;
  readonly provider: string;
  readonly records: readonly SourceRecord[];
  readonly attempts: readonly SourceRouteAttempt[];
}

export interface SourceRouter {
  list(): readonly string[];
  doctor(): readonly SourceRouteStatus[];
  route(route: string, input: string | SourceReadInput | SourceSearchInput): Promise<SourceRouteResult>;
}

export function createSourceRouter(options: SourceRouterOptions): SourceRouter;
