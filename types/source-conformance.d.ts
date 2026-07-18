import type { SourceProvider, SourceReadInput, SourceRegistry, SourceSearchInput } from "./sources.js";

export interface SourceConformanceErrorCase {
  name?: string;
  code: string;
  run(registry: SourceRegistry): Promise<unknown>;
}

export interface SourceProviderConformanceOptions {
  providerId?: string;
  provider?: SourceProvider;
  registry?: SourceRegistry;
  secretMarkers?: readonly string[];
  searchCase?: { input: SourceSearchInput };
  readCase?: { input: string | SourceReadInput };
  errorCases?: readonly SourceConformanceErrorCase[];
}

export interface SourceProviderConformanceReport {
  readonly providerId: string;
  readonly status: string;
  readonly checks: readonly string[];
  readonly passed: true;
  /** Always false: this local harness is contract evidence, not provider certification. */
  readonly certification: false;
}

export function runSourceProviderConformance(
  options: SourceProviderConformanceOptions
): Promise<SourceProviderConformanceReport>;
