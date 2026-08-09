export const BROWSER_AUTOMATION_SCHEMA_VERSION: "cockroach.browser-automation-adapter.v1";

export const BROWSER_AUTOMATION_ACTIONS: readonly BrowserAutomationActionKind[];
export const BROWSER_AUTOMATION_SAFE_ACTIONS: readonly BrowserAutomationActionKind[];
export const BROWSER_AUTOMATION_ACTION_EFFECTS: Readonly<
  Record<BrowserAutomationActionKind, BrowserAutomationEffect>
>;

export type BrowserAutomationActionKind =
  | "navigate" | "back" | "forward" | "reload" | "click" | "doubleClick" | "fill"
  | "type" | "press" | "hover" | "focus" | "check" | "uncheck" | "select" | "scroll"
  | "drag" | "mouse.move" | "mouse.down" | "mouse.up" | "mouse.click" | "keyboard.down"
  | "keyboard.up" | "keyboard.insertText" | "upload" | "download" | "evaluate" | "wait"
  | "history.inspect" | "capture.paired" | "annotate.show" | "annotate.clear"
  | "clipboard.read" | "clipboard.write" | "network.inspect" | "network.export"
  | "network.route.add" | "network.route.remove" | "network.routes.list" | "state.save"
  | "state.load" | "state.list" | "state.delete" | "screenshot" | "pdf" | "snapshot"
  | "extract" | "cookies.read" | "cookies.write" | "storage.read" | "storage.write"
  | "tab.open" | "tab.close" | "tab.switch" | "tab.lock" | "tab.unlock"
  | "tab.lock.status" | "trace.start" | "trace.stop";

export type BrowserAutomationEffect =
  | "read" | "write" | "execute" | "upload" | "download" | "credential";

export interface BrowserAutomationBackend {
  createSession(input: Readonly<Record<string, unknown>>): Promise<{ id: string } & Record<string, unknown>>;
  act(sessionId: string, action: Readonly<Record<string, unknown>>): Promise<unknown>;
  closeSession(sessionId: string): Promise<void>;
}

export interface BrowserAutomationPolicy {
  deniedOrigins?: string[];
  allowedProfiles?: string[];
  allowJavaScript?: boolean;
  allowCookieRead?: boolean;
  allowCookieWrite?: boolean;
  allowDownloads?: boolean;
  allowUploads?: boolean;
  allowClipboard?: boolean;
  allowStateExport?: boolean;
  allowAnnotations?: boolean;
  allowDialogAccept?: boolean;
  allowNetworkInterception?: boolean;
  allowPrivateNetwork?: boolean;
  allowRemote?: boolean;
  requireApprovalFor?: BrowserAutomationActionKind[];
  budget?: Record<string, number>;
}

export interface BrowserAutomationSessionInput {
  purpose: string;
  actor?: string;
  allowedOrigins: string[];
  startUrl?: string;
  mode?: "headless" | "headed";
  locale?: string;
  timezoneId?: string;
  colorScheme?: "light" | "dark" | "no-preference";
  viewport?: { width: number; height: number };
  recordHar?: boolean;
  recordVideo?: boolean;
}

export interface BrowserAutomationAction {
  kind: BrowserAutomationActionKind;
  [key: string]: unknown;
}

export interface BrowserAutomationCapabilityReport {
  readonly schemaVersion: "cockroach.browser-automation-adapter.v1";
  readonly status: "adapter";
  readonly puppeteerBaseline: "25.5.0";
  readonly puppeteerApiCompatible: false;
  readonly backendContract: readonly ["createSession", "act", "closeSession"];
  readonly actions: readonly BrowserAutomationActionKind[];
  readonly defaultSafeActions: readonly BrowserAutomationActionKind[];
  readonly enabledActions: readonly BrowserAutomationActionKind[];
  readonly enabledEffects: readonly BrowserAutomationEffect[];
  readonly actionEffects: Readonly<Record<BrowserAutomationActionKind, BrowserAutomationEffect>>;
  readonly matrix: "docs/compatibility/puppeteer-25.5.0-gap-matrix.json";
}

export interface BrowserAutomationAdapter {
  readonly schemaVersion: "cockroach.browser-automation-adapter.v1";
  capabilityReport(): BrowserAutomationCapabilityReport;
  open(input: BrowserAutomationSessionInput): Promise<Readonly<{ id: string; purpose: string }>>;
  execute(sessionId: string, action: BrowserAutomationAction): Promise<unknown>;
  closeSession(sessionId: string): Promise<void>;
  close(): Promise<void>;
}

export class BrowserAutomationAdapterError extends Error {
  readonly code: string;
}

export function browserAutomationCapabilityReport(options?: {
  allowedActions?: BrowserAutomationActionKind[];
  allowedEffects?: BrowserAutomationEffect[];
}): BrowserAutomationCapabilityReport;

export function createBrowserAutomationAdapter(options: {
  backend: BrowserAutomationBackend;
  allowedActions?: BrowserAutomationActionKind[];
  allowedEffects?: BrowserAutomationEffect[];
  policy?: BrowserAutomationPolicy;
}): BrowserAutomationAdapter;
