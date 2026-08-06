import type { CrawlOptions } from "./index.js";
import type { IdentityProfileName } from "./identity.js";
import type { Selector } from "./parser.js";

export interface ShellState {
  url: string | null;
  html: string | null;
  document: Selector | null;
  lastRecords: Array<Record<string, unknown>>;
  crawlDefaults: Partial<CrawlOptions>;
  identity: IdentityProfileName | null;
}

export interface ShellCommand {
  summary: string;
  raw?: boolean;
  run: (args: string[], rest: string) => string | Promise<string>;
}

export interface ShellSession {
  state: ShellState;
  commands: Map<string, ShellCommand>;
  execute(line: string): Promise<string>;
}

export interface ShellOptions {
  crawlDefaults?: Partial<CrawlOptions>;
  identity?: IdentityProfileName;
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
  terminal?: boolean;
}

export function createShellSession(options?: ShellOptions): ShellSession;

export function runShell(options?: ShellOptions): Promise<ShellSession>;
