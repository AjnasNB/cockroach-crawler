export interface ElementPathStep {
  tag: string;
  index: number;
}

export interface ElementFingerprint {
  schema: "cockroach.element-fingerprint.v1";
  tag: string;
  identity: Record<string, string>;
  classes: string[];
  text: string;
  textTokens: string[];
  path: ElementPathStep[];
  depth: number;
  siblingIndex: number;
  siblingCount: number;
  childTags: string[];
  parentTag: string;
  digest: string;
}

export interface SimilarityWeights {
  tag?: number;
  id?: number;
  classes?: number;
  attributes?: number;
  text?: number;
  path?: number;
  structure?: number;
}

export interface SimilarityScore {
  score: number;
  components: Record<string, number | null>;
}

export interface RelocateOptions {
  threshold?: number;
  maxNodes?: number;
  maxCandidates?: number;
  maxTextLength?: number;
  weights?: SimilarityWeights;
  tagLock?: boolean;
}

export interface RelocatedElement {
  tag: string;
  selector: string;
  xpath: string;
  text: string;
  html: string;
  fingerprint: ElementFingerprint;
}

export interface RelocateResult {
  found: boolean;
  score: number;
  threshold: number;
  inspected: number;
  exact?: boolean;
  components?: Record<string, number | null>;
  element: RelocatedElement | null;
}

export interface SimilarElement {
  score: number;
  tag: string;
  selector: string;
  xpath: string;
  text: string;
  html: string;
}

export interface FindSimilarOptions {
  threshold?: number;
  limit?: number;
  maxNodes?: number;
  maxTextLength?: number;
  ignoreText?: boolean;
  weights?: SimilarityWeights;
}

export interface StoredFingerprint {
  key: string;
  savedAtMs: number;
  metadata: Record<string, unknown>;
  fingerprint: ElementFingerprint;
}

export interface ElementFingerprintStoreOptions {
  directory: string;
  namespace?: string;
  maxEntries?: number;
}

export interface AdaptiveLocateInput {
  selector: string;
  threshold?: number;
  weights?: SimilarityWeights;
  maxNodes?: number;
  save?: boolean;
}

export interface AdaptiveLocateResult {
  found: boolean;
  locatedBy: "selector" | "relocated" | "none";
  score: number;
  selector: string;
  previousSelector?: string;
  xpath?: string;
  text?: string;
  html?: string;
  reason?: "no-stored-fingerprint" | "below-threshold";
  fingerprint?: ElementFingerprint;
}

export function fingerprintElement(
  $: unknown,
  node: unknown,
  options?: { maxTextLength?: number }
): ElementFingerprint;

export function scoreFingerprints(
  reference: ElementFingerprint,
  candidate: ElementFingerprint,
  options?: { weights?: SimilarityWeights }
): SimilarityScore;

export function relocateElement(
  html: string,
  reference: ElementFingerprint,
  options?: RelocateOptions
): RelocateResult;

export function findSimilarElements(
  html: string,
  reference: ElementFingerprint,
  options?: FindSimilarOptions
): readonly SimilarElement[];

export function generateCssSelector($: unknown, node: unknown, options?: { maxDepth?: number }): string;

export function generateXPath($: unknown, node: unknown, options?: { maxDepth?: number }): string;

export class ElementFingerprintStore {
  constructor(options: ElementFingerprintStoreOptions);
  readonly directory: string;
  readonly namespace: string;
  readonly maxEntries: number;
  filename(key: string): string;
  save(key: string, fingerprint: ElementFingerprint, metadata?: Record<string, unknown>): Promise<string>;
  load(key: string): Promise<StoredFingerprint | null>;
  delete(key: string): Promise<void>;
  prune(): Promise<{ removed: number; entries: number }>;
}

export function createAdaptiveLocator(
  store: Pick<ElementFingerprintStore, "save" | "load">,
  options?: { threshold?: number; weights?: SimilarityWeights; maxNodes?: number }
): (key: string, html: string, input: AdaptiveLocateInput) => Promise<AdaptiveLocateResult>;

export const adaptiveDefaults: {
  readonly weights: Required<SimilarityWeights>;
  readonly identityAttributes: readonly string[];
  readonly fingerprintSchema: "cockroach.element-fingerprint.v1";
  readonly storeSchema: "cockroach.element-store.v1";
};
