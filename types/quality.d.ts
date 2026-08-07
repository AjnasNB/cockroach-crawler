export type QualityExtractionProfile = "balanced" | "precision" | "recall";

export type QualityPageType =
  | "article"
  | "forum"
  | "product"
  | "collection"
  | "listing"
  | "documentation"
  | "service";

export type QualityRiskSignal =
  | "CHALLENGE_PAGE"
  | "APPLICATION_SHELL"
  | "EMPTY_OUTPUT"
  | "OUTPUT_TOO_SHORT"
  | "LOW_EXTRACTION_QUALITY"
  | "OUTPUT_LIMIT_EXCEEDED"
  | "IMAGE_LIMIT_EXCEEDED";

export interface QualityExtractionOptions {
  profile?: QualityExtractionProfile;
  url?: string;
  failClosed?: boolean;
  diagnostics?: boolean;
  minQuality?: number;
  minOutputCharacters?: number;
  minOutputWords?: number;
  maxInputCharacters?: number;
  maxOutputCharacters?: number;
  maxImages?: number;
  includeComments?: boolean;
  includeTables?: boolean;
  includeImages?: boolean;
  includeLinks?: boolean;
  targetLanguage?: string;
  pageType?: QualityPageType;
}

export interface QualityBackendIdentity {
  readonly name: "trafilatura";
  readonly version: "0.2.0";
  readonly runtime: "node-native";
}

export interface QualityMetadata {
  readonly title: string | null;
  readonly author: string | null;
  readonly url: string | null;
  readonly hostname: string | null;
  readonly description: string | null;
  readonly siteName: string | null;
  readonly date: string | null;
  readonly categories: readonly string[];
  readonly tags: readonly string[];
  readonly id: string | null;
  readonly fingerprint: string | null;
  readonly license: string | null;
  readonly language: string | null;
  readonly image: string | null;
  readonly pageType: string | null;
}

export interface QualityImage {
  readonly src: string;
  readonly filename: string;
  readonly alt: string | null;
  readonly caption: string | null;
  readonly isHero: boolean;
}

export interface QualityDiagnostics {
  readonly inputCharacters: number;
  readonly outputCharacters: number;
  readonly textCharacters: number;
  readonly outputWords: number;
  readonly htmlCharacters: number;
  readonly markdownCharacters: number;
  readonly commentCharacters: number;
  readonly challengeDetected: boolean;
  readonly shellDetected: boolean;
  readonly nativeFallbackUsed: boolean;
  readonly metadataTruncated: boolean;
  readonly riskSignals: readonly QualityRiskSignal[];
}

export interface QualityAbstention {
  readonly reasons: readonly QualityRiskSignal[];
}

export interface QualityExtractionResult {
  readonly status: "accepted" | "abstained";
  readonly accepted: boolean;
  readonly backend: QualityBackendIdentity;
  readonly profile: QualityExtractionProfile;
  readonly text: string | null;
  readonly html: string | null;
  readonly markdown: string | null;
  readonly commentsText: string | null;
  readonly commentsHtml: string | null;
  readonly metadata: QualityMetadata;
  readonly images: readonly QualityImage[];
  readonly extractionQuality: number;
  readonly classificationConfidence: number | null;
  readonly warnings: readonly string[];
  readonly abstention: QualityAbstention | null;
  readonly diagnostics?: QualityDiagnostics;
}

export declare class QualityExtractionError extends Error {
  readonly code: string;
  constructor(code: string, message: string, options?: { cause?: unknown });
}

export declare const qualityBackend: QualityBackendIdentity;

export declare function extractPageQuality(
  html: string,
  options?: QualityExtractionOptions
): QualityExtractionResult;
