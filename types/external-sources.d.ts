import type { SourceProvider, SourceStatus } from "./sources.js";

export type ExternalSourceChannel = "x" | "reddit" | "facebook" | "instagram" | "xiaohongshu" | "youtube" | "linkedin";
export type ExternalSourceProviderId =
  | "x-session"
  | "reddit-session"
  | "facebook-session"
  | "instagram-session"
  | "xiaohongshu-session"
  | "linkedin-session"
  | "youtube-no-key";
export type ExternalSourceAvailability = "ready" | "partial" | "unavailable";

export interface ExecFileRunOptions {
  readonly timeoutMs?: number;
  readonly maxOutputBytes?: number;
  readonly signal?: AbortSignal;
  readonly environment?: Readonly<Record<string, string | undefined>>;
}

export interface ExecFileResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export type ExecFileRunner = (
  file: string,
  args: readonly string[],
  options?: ExecFileRunOptions
) => Promise<ExecFileResult>;

export interface ExecFileRunnerOptions {
  readonly timeoutMs?: number;
  readonly maxOutputBytes?: number;
  readonly environment?: Readonly<Record<string, string | undefined>>;
}

export interface ExternalSourceProviderOptions extends ExecFileRunnerOptions {
  readonly runner?: ExecFileRunner;
  readonly opencliCommand?: string;
  readonly ytDlpCommand?: string;
  readonly opencliAvailability?: ExternalSourceAvailability;
  readonly ytDlpAvailability?: ExternalSourceAvailability;
}

export interface ExternalSourceMaintenanceOptions extends ExecFileRunnerOptions {
  readonly channels?: readonly ExternalSourceChannel[];
  /** Commands are never executed unless this is exactly true. */
  readonly apply?: boolean;
  readonly runner?: ExecFileRunner;
  readonly platform?: "win32" | "linux" | "darwin";
  readonly pythonCommand?: string;
}

export interface ExternalSourceCommandStep {
  readonly id: string;
  readonly kind: "command";
  readonly channels: readonly ExternalSourceChannel[];
  readonly file: string;
  readonly args: readonly string[];
  readonly description: string;
  readonly requiresExplicitApply: true;
}

export interface ExternalSourceManualStep {
  readonly id: string;
  readonly kind: "manual";
  readonly channels: readonly ExternalSourceChannel[];
  readonly url: string;
  readonly description: string;
  readonly requiresExplicitApply: true;
}

export interface ExternalSourceMaintenancePlan {
  readonly action: "setup" | "update";
  readonly channels: readonly ExternalSourceChannel[];
  readonly steps: readonly (ExternalSourceCommandStep | ExternalSourceManualStep)[];
}

export interface ExternalSourceMaintenanceResult {
  readonly mode: "dry-run" | "applied";
  readonly plan: ExternalSourceMaintenancePlan;
  readonly results: readonly {
    readonly id: string;
    readonly state: "applied" | "manual_action_required";
  }[];
}

export const externalSourceChannels: readonly ExternalSourceChannel[];
export const externalSourceProviderIds: readonly ExternalSourceProviderId[];

export function createExecFileRunner(options?: ExecFileRunnerOptions): ExecFileRunner;
export function createOpenCliSourceProviders(options?: ExternalSourceProviderOptions): readonly SourceProvider[];
export function createYtDlpSourceProvider(options?: ExternalSourceProviderOptions): SourceProvider;
/** An unavailable status-only provider until the operator manually reviews and registers a LinkedIn MCP server. */
export function createLinkedInManualSourceProvider(): SourceProvider;
export function createExternalSourceProviders(options?: ExternalSourceProviderOptions): readonly SourceProvider[];
export function setupExternalSources(options?: ExternalSourceMaintenanceOptions): Promise<ExternalSourceMaintenanceResult>;
export function updateExternalSources(options?: ExternalSourceMaintenanceOptions): Promise<ExternalSourceMaintenanceResult>;

/** SourceProvider.status() returns the standard immutable source doctor status. */
export type ExternalSourceStatus = SourceStatus;
