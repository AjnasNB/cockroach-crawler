export type IdentityProfileName =
  | "chrome-windows"
  | "chrome-macos"
  | "edge-windows"
  | "firefox-windows"
  | "safari-macos"
  | "chrome-android"
  | "safari-ios";

export interface IdentityViewport {
  width: number;
  height: number;
  deviceScaleFactor: number;
}

export interface IdentityProfile {
  schema: "cockroach.identity-profile.v1";
  name: string;
  engine: "chromium" | "firefox" | "webkit";
  brand: string;
  majorVersion: number;
  userAgent: string;
  platform: string;
  platformVersion: string;
  architecture: string;
  bitness: string;
  mobile: boolean;
  viewport: IdentityViewport;
  acceptLanguage: string;
  accept: string;
  locale: string;
  timezone: string;
  tlsProfile: string;
}

export interface IdentityOverrides {
  userAgent?: string;
  acceptLanguage?: string;
  accept?: string;
  viewport?: { width?: number; height?: number };
  platform?: string;
  platformVersion?: string;
  mobile?: boolean;
  timezone?: string;
  locale?: string;
}

export interface IdentityBrowserContext {
  userAgent: string;
  locale: string;
  timezoneId: string;
  isMobile: boolean;
  hasTouch: boolean;
  deviceScaleFactor: number;
  viewport: { width: number; height: number };
  extraHTTPHeaders: Readonly<Record<string, string>>;
}

export type ChallengeVendor =
  | "cloudflare"
  | "datadome"
  | "perimeterx"
  | "akamai"
  | "recaptcha"
  | "hcaptcha"
  | "unknown";

export type ChallengeKind = "interstitial" | "captcha" | "block" | "rate-limit";

export interface ChallengeReport {
  schema: "cockroach.challenge-report.v1";
  challenged: boolean;
  vendor: ChallengeVendor | null;
  kind: ChallengeKind | null;
  status: number;
  evidence: readonly string[];
  url: string | null;
}

export interface ChallengeDetectionInput {
  body?: string;
  status?: number;
  headers?: Record<string, string>;
  url?: string;
}

export type ChallengeMode = "deny" | "report" | "operator";

export interface ChallengeHandlerContext {
  report: ChallengeReport;
  url: string;
  origin: string;
  authorization: string;
  attempt: number;
}

export interface ChallengeHandlerResult {
  resolved?: boolean;
  cookies?: unknown[];
  headers?: Record<string, string>;
}

export interface ChallengePolicyInput {
  mode?: ChallengeMode;
  handler?: (context: ChallengeHandlerContext) => Promise<ChallengeHandlerResult | null> | ChallengeHandlerResult | null;
  authorization?: string;
  allowOrigins?: string[];
  maxAttempts?: number;
}

export interface ChallengePolicy {
  mode: ChallengeMode;
  handler: ((context: ChallengeHandlerContext) => Promise<ChallengeHandlerResult | null>) | null;
  authorization: string | null;
  allowOrigins: readonly string[];
  maxAttempts: number;
}

export interface ChallengeOutcome {
  resolved: boolean;
  action: "none" | "reported" | "handler" | "handler-declined";
  report: ChallengeReport;
  cookies?: readonly unknown[];
  headers?: Readonly<Record<string, string>>;
}

export declare class ChallengeError extends Error {
  constructor(report: ChallengeReport, message?: string);
  readonly name: "ChallengeError";
  readonly code: "CHALLENGE_ENCOUNTERED";
  readonly report: ChallengeReport;
}

export const identityProfileNames: readonly IdentityProfileName[];

export function resolveIdentity(
  value?: IdentityProfileName | (IdentityOverrides & { profile?: IdentityProfileName }),
  overrides?: IdentityOverrides
): IdentityProfile;

export function identityHeaders(
  identity: IdentityProfile | IdentityProfileName,
  options?: { secure?: boolean; fullClientHints?: boolean }
): Readonly<Record<string, string>>;

export function identityBrowserContext(
  identity: IdentityProfile | IdentityProfileName
): IdentityBrowserContext;

export function detectChallenge(input?: ChallengeDetectionInput): ChallengeReport;

export function normalizeChallengePolicy(value?: ChallengePolicyInput | false | null): ChallengePolicy;

export function applyChallengePolicy(
  report: ChallengeReport,
  policy: ChallengePolicy | ChallengePolicyInput,
  context?: { url?: string; attempt?: number }
): Promise<ChallengeOutcome>;

export const identityDefaults: {
  readonly profileSchema: "cockroach.identity-profile.v1";
  readonly challengeSchema: "cockroach.challenge-report.v1";
  readonly challengeModes: readonly ChallengeMode[];
  readonly profiles: readonly IdentityProfileName[];
};
