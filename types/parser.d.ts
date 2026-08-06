import type {
  ElementFingerprint,
  FindSimilarOptions,
  RelocateOptions,
  RelocateResult,
  SimilarityWeights
} from "./adaptive.js";

export interface ParseOptions {
  url?: string;
  maxInputCharacters?: number;
  maxTextLength?: number;
}

export interface FindByTextOptions {
  tag?: string;
  exact?: boolean;
  ignoreCase?: boolean;
  limit?: number;
}

export type AttributeFilter = string | boolean | RegExp;

export interface SelectorRecord {
  tag: string;
  text: string;
  attributes: Record<string, string>;
  selector: string | null;
}

export declare class SelectorList extends Array<Selector> {
  readonly first: Selector | null;
  readonly last: Selector | null;
  get(index?: number): string | null;
  getall(): Array<string | null>;
  readonly text: string;
  attr(name: string): string[];
  toJSON(): SelectorRecord[];
}

export declare class Selector {
  static parse(html: string, options?: ParseOptions): Selector;

  readonly tag: string;
  readonly exists: boolean;
  readonly url: string | null;
  readonly text: string;
  readonly fullText: string;
  readonly html: string;
  readonly innerHtml: string;
  readonly attributes: Readonly<Record<string, string>>;

  readonly parent: Selector | null;
  readonly parents: SelectorList;
  readonly children: SelectorList;
  readonly siblings: SelectorList;
  readonly next: Selector | null;
  readonly previous: Selector | null;

  css(selector: string, options?: { limit?: number }): SelectorList;
  xpath(expression: string, options?: { limit?: number }): SelectorList;
  findAll(tag?: string | null, attributes?: Record<string, AttributeFilter>, options?: { limit?: number }): SelectorList;
  findByText(text: string | RegExp, options?: FindByTextOptions): SelectorList;
  findSimilar(options?: FindSimilarOptions): SelectorList;

  attr(name: string): string | null;
  get(mode?: "auto" | "text" | "html"): string | null;

  fingerprint(): ElementFingerprint;
  cssPath(): string;
  xpathPath(): string;
  relocate(html: string, options?: RelocateOptions): RelocateResult;
  similarityTo(other: Selector, options?: { weights?: SimilarityWeights }): number;
  toJSON(): SelectorRecord;
}

export function parseDocument(html: string, options?: ParseOptions): Selector;
