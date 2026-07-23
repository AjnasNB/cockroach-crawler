export interface ScrollOptions {
  maxSteps?: number;
  stepPixels?: number;
  delayMs?: number;
  stableIterations?: number;
}

export interface FlattenOptions {
  shadowDom?: boolean;
  iframes?: boolean;
  maxRoots?: number;
  maxFrames?: number;
  maxClonedNodes?: number;
}

export interface ScreenshotOptions {
  format?: "png" | "jpeg";
  quality?: number;
  fullPage?: boolean;
}

export interface PdfCaptureOptions {
  format?: string;
  landscape?: boolean;
  printBackground?: boolean;
  preferCSSPageSize?: boolean;
}

export interface BrowserArtifactOptions {
  directory?: string;
  maxArtifactBytes?: number;
  screenshot?: boolean | ScreenshotOptions;
  pdf?: boolean | PdfCaptureOptions;
}

export interface BrowserArtifact {
  path: string;
  bytes: number;
  contentHash: `sha256:${string}`;
  mediaType: string;
}

export function normalizeScrollOptions(options?: true | ScrollOptions): Readonly<Required<ScrollOptions>>;
export function scrollPage(page: any, options?: true | ScrollOptions): Promise<{
  steps: number;
  stableIterations: number;
  finalHeight: number;
}>;
export function flattenPageDom(page: any, options?: FlattenOptions): Promise<{
  shadowRoots: number;
  frames: number;
  clonedNodes: number;
  warnings: string[];
}>;
export function runPageHooks(
  page: any,
  hooks: Array<(context: { index: number }) => unknown>,
  options?: { maxHooks?: number; timeoutMs?: number; maxResultCharacters?: number }
): Promise<unknown[]>;
export function capturePageArtifacts(
  page: any,
  url: string,
  options?: BrowserArtifactOptions
): Promise<{ screenshot?: BrowserArtifact; pdf?: BrowserArtifact }>;
