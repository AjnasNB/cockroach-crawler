export type BrowserAutomationEffect = "read" | "write" | "execute" | "upload" | "download" | "credential";

export type BrowserAutomationActionKind =
  | "browser.connect" | "browser.disconnect" | "context.create" | "context.close"
  | "session.inspect" | "page.list" | "tab.open" | "tab.close" | "tab.switch" | "tab.lock" | "tab.unlock" | "tab.lock.status"
  | "popup.wait" | "frame.list" | "frame.select" | "navigate" | "back" | "forward" | "reload" | "wait" | "wait.selector" | "wait.url" | "history.inspect"
  | "locator.inspect" | "click" | "doubleClick" | "fill" | "type" | "hover" | "focus" | "check" | "uncheck" | "select" | "form.submit"
  | "press" | "keyboard.down" | "keyboard.up" | "keyboard.insertText" | "scroll" | "drag" | "touch.tap" | "mouse.move" | "mouse.down" | "mouse.up" | "mouse.click"
  | "upload" | "download" | "dialog.wait" | "dialog.accept" | "dialog.dismiss" | "capture.paired" | "screenshot" | "pdf"
  | "evaluate" | "script.add" | "style.add" | "worker.list" | "worker.evaluate"
  | "network.inspect" | "network.export" | "network.requests" | "network.responses" | "network.route.add" | "network.route.remove" | "network.routes.list" | "network.offline" | "network.cache" | "network.headers"
  | "clipboard.read" | "clipboard.write" | "cookies.read" | "cookies.write" | "storage.read" | "storage.write" | "storage.clear" | "state.save" | "state.load" | "state.list" | "state.delete"
  | "permissions.set" | "geolocation.set" | "emulation.set" | "snapshot" | "extract" | "accessibility.snapshot" | "annotate.show" | "annotate.clear"
  | "trace.start" | "trace.stop" | "metrics.read" | "recording.start" | "recording.stop" | "coverage.start" | "coverage.stop" | "console.read" | "heap.snapshot"
  | "selector.register" | "selector.unregister" | "selector.list" | "page.content" | "page.title" | "page.url";

type Action<K extends BrowserAutomationActionKind, F extends object = object> = Readonly<{ kind: K; origin: string } & F>;
type EmptyActionKind =
  | "browser.disconnect" | "context.close" | "session.inspect" | "page.list" | "tab.open" | "history.inspect" | "frame.list"
  | "worker.list" | "network.inspect" | "network.routes.list" | "cookies.read" | "state.list" | "metrics.read"
  | "console.read" | "selector.list" | "page.title" | "page.url" | "dialog.dismiss" | "annotate.clear";
type SelectorActionKind = "hover" | "focus" | "check" | "uncheck" | "form.submit";
type TabActionKind = "tab.close" | "tab.switch" | "tab.lock" | "tab.unlock" | "tab.lock.status";
type KeyActionKind = "keyboard.down" | "keyboard.up";
type ArtifactActionKind = "network.export" | "trace.stop" | "recording.stop" | "coverage.stop" | "heap.snapshot";

export type BrowserAutomationAction =
  | Action<EmptyActionKind>
  | Action<"browser.connect", { endpointRef: string }>
  | Action<"context.create", { settings?: Readonly<Record<string, unknown>> }>
  | Action<TabActionKind, { tabId: string }>
  | Action<"navigate", { url: string; waitUntil?: "commit" | "domcontentloaded" | "load" | "networkidle"; timeoutMs?: number }>
  | Action<"popup.wait", { timeoutMs?: number }>
  | Action<"frame.select", { frameId: string }>
  | Action<"back" | "forward" | "reload", { waitUntil?: "commit" | "domcontentloaded" | "load" | "networkidle"; timeoutMs?: number }>
  | Action<"wait", { durationMs: number }>
  | Action<"wait.selector", { selector: string; state?: "attached" | "detached" | "visible" | "hidden"; timeoutMs?: number }>
  | Action<"wait.url", { url: string; timeoutMs?: number }>
  | Action<"locator.inspect", { selector: string; limit?: number }>
  | Action<"click", { selector: string; button?: "left" | "middle" | "right"; count?: number }>
  | Action<"doubleClick", { selector: string; button?: "left" | "middle" | "right" }>
  | Action<"fill", { selector: string; text: string }>
  | Action<"type", { selector: string; text: string; delayMs?: number }>
  | Action<SelectorActionKind, { selector: string }>
  | Action<"select", { selector: string; values: readonly string[] }>
  | Action<"press", { key: string; selector?: string }>
  | Action<KeyActionKind, { key: string }>
  | Action<"keyboard.insertText", { text: string }>
  | Action<"scroll", { selector?: string; deltaX?: number; deltaY?: number }>
  | Action<"drag", { fromSelector: string; toSelector: string }>
  | Action<"touch.tap", { x: number; y: number }>
  | Action<"mouse.move", { x: number; y: number; steps?: number }>
  | Action<"mouse.click", { x: number; y: number; button?: "left" | "middle" | "right"; count?: number }>
  | Action<"mouse.down" | "mouse.up", { button?: "left" | "middle" | "right" }>
  | Action<"upload", { selector: string; fileRefs: readonly string[]; maxFileBytes: number; maxBytes: number; timeoutMs?: number }>
  | Action<"download", { selector: string; artifactName: string; maxBytes: number; timeoutMs?: number }>
  | Action<"dialog.wait", { timeoutMs?: number }>
  | Action<"dialog.accept", { promptText?: string }>
  | Action<"capture.paired", { artifactName: string; maxBytes: number }>
  | Action<"screenshot", { artifactName: string; maxBytes: number; selector?: string; fullPage?: boolean; format?: "png" | "jpeg"; quality?: number }>
  | Action<"pdf", { artifactName: string; maxBytes: number; format?: string; landscape?: boolean }>
  | Action<"evaluate", { expressionRef: string; args?: unknown }>
  | Action<"script.add", { scriptRef: string }>
  | Action<"style.add", { styleRef: string }>
  | Action<"worker.evaluate", { workerId: string; expressionRef: string; args?: unknown }>
  | Action<ArtifactActionKind, { artifactName: string; maxBytes: number }>
  | Action<"network.requests" | "network.responses", { limit?: number }>
  | Action<"network.route.add", { route: Readonly<{
    id: string;
    origin: string;
    pathPattern: string;
    methods?: readonly string[];
    resourceTypes?: readonly string[];
    response: Readonly<{ mode: "abort" } | {
      mode: "fulfill";
      maxBodyBytes: number;
      status?: number;
      headers?: Readonly<Record<string, string>>;
      bodyRef?: string;
    }>;
  }> }>
  | Action<"network.route.remove", { routeId: string }>
  | Action<"network.offline" | "network.cache", { enabled: boolean }>
  | Action<"network.headers", { headers: Readonly<Record<string, string>> }>
  | Action<"clipboard.read">
  | Action<"clipboard.write", { text: string }>
  | Action<"cookies.write", { cookies: readonly Readonly<{ name: string; value: string; url: string; path?: string; expires?: number; httpOnly?: boolean; secure?: boolean; sameSite?: "Strict" | "Lax" | "None" }>[] }>
  | Action<"storage.read", { area: "local" | "session"; key?: string }>
  | Action<"storage.write", { area: "local" | "session"; entries: Readonly<Record<string, string>> }>
  | Action<"storage.clear", { area: "local" | "session" }>
  | Action<"state.save" | "state.load" | "state.delete", { stateRef: string }>
  | Action<"permissions.set", { permissions: readonly string[] }>
  | Action<"geolocation.set", { latitude: number; longitude: number; accuracy?: number }>
  | Action<"emulation.set", { settings: Readonly<Record<string, unknown>> }>
  | Action<"snapshot" | "accessibility.snapshot" | "page.content", { maxChars?: number }>
  | Action<"extract", { selector: string; maxChars?: number }>
  | Action<"annotate.show", { selector?: string }>
  | Action<"trace.start", { categories?: readonly string[] }>
  | Action<"recording.start", { artifactName: string; maxBytes: number; settings?: Readonly<Record<string, unknown>> }>
  | Action<"coverage.start", { resetOnNavigation?: boolean }>
  | Action<"selector.register", { name: string; scriptRef: string }>
  | Action<"selector.unregister", { name: string }>;

export interface BrowserAutomationAuthority {
  readonly authorityId?: string;
  readonly principalId: string;
  readonly allowedOrigins: readonly string[];
  readonly allowedActions: readonly BrowserAutomationActionKind[];
  readonly allowedEffects: readonly BrowserAutomationEffect[];
  readonly maxActions: number;
  readonly maxActionMs: number;
  readonly maxSessionMs: number;
  readonly maxArtifactBytes: number;
  readonly maxUploadBytes: number;
  readonly maxTotalArtifactBytes: number;
  readonly maxTotalUploadBytes: number;
  readonly maxNetworkRequestBytes: number;
  readonly maxNetworkResponseBytes: number;
  readonly maxTotalNetworkRequestBytes: number;
  readonly maxTotalNetworkResponseBytes: number;
}

export interface BrowserAutomationPolicy {
  readonly allowedActions?: readonly BrowserAutomationActionKind[];
  readonly allowedEffects?: readonly BrowserAutomationEffect[];
  readonly maxSessions?: number;
  readonly maxActionsPerSession?: number;
  readonly maxOutputBytes?: number;
  readonly maxActionMs?: number;
  readonly maxSessionMs?: number;
  readonly maxArtifactBytes?: number;
  readonly maxUploadBytes?: number;
  readonly maxTotalArtifactBytes?: number;
  readonly maxTotalUploadBytes?: number;
  readonly maxNetworkRequestBytes?: number;
  readonly maxNetworkResponseBytes?: number;
  readonly maxTotalNetworkRequestBytes?: number;
  readonly maxTotalNetworkResponseBytes?: number;
}

export interface BrowserAutomationArtifactAttestation {
  readonly name: string;
  readonly bytes: number;
  readonly sha256: string;
}

export interface BrowserAutomationBackendResult {
  readonly data: unknown;
  readonly attestation: Readonly<{
    action: BrowserAutomationActionKind;
    effect: BrowserAutomationEffect;
    origin: string;
    sessionBound: true;
    withinBudget: true;
    fileRefsAccepted?: number;
    artifact?: BrowserAutomationArtifactAttestation;
    network: Readonly<{ requests: number; requestBytes: number; responseBytes: number }>;
  }>;
}

export interface BrowserAutomationBackendOpenInput {
  readonly sessionId: string;
  readonly allowedOrigins: readonly string[];
  readonly allowedActions: readonly BrowserAutomationActionKind[];
  readonly allowedEffects: readonly BrowserAutomationEffect[];
  readonly actionBudget: number;
  readonly networkBudget: Readonly<{
    maxRequestBytesPerAction: number;
    maxResponseBytesPerAction: number;
    maxTotalRequestBytes: number;
    maxTotalResponseBytes: number;
  }>;
  readonly deadline: string;
  readonly signal: AbortSignal;
  readonly purpose: string;
}

export interface BrowserAutomationBackendExecution {
  readonly sessionId: string;
  readonly authorityId: string;
  readonly principalId: string;
  readonly actionNumber: number;
  readonly actionBudget: number;
  readonly effect: BrowserAutomationEffect;
  readonly allowedOrigins: readonly string[];
  readonly networkBudget: Readonly<{ maxRequestBytes: number; maxResponseBytes: number }>;
  readonly deadline: string;
  readonly signal: AbortSignal;
}

export interface BrowserAutomationBackend {
  readonly supportedActions: readonly BrowserAutomationActionKind[];
  openSession(input: BrowserAutomationBackendOpenInput): object | Promise<object>;
  runAction(handle: object, action: BrowserAutomationAction, context: BrowserAutomationBackendExecution): BrowserAutomationBackendResult | Promise<BrowserAutomationBackendResult>;
  closeSession(handle: object, context: Readonly<{ sessionId: string; allowedOrigins: readonly string[]; reason?: string }>): void | Promise<void>;
}

export interface GovernedBrowserAutomation {
  openSession(
    input: Readonly<{ allowedOrigins: readonly string[]; purpose: string }>,
    authority: BrowserAutomationAuthority
  ): Promise<Readonly<{
    schemaVersion: "cockroach.governed-browser-session.v1";
    sessionId: string;
    authorityId: string;
    purpose: string;
    allowedOrigins: readonly string[];
    allowedActions: readonly BrowserAutomationActionKind[];
    allowedEffects: readonly BrowserAutomationEffect[];
    actionBudget: Readonly<{ used: number; maximum: number }>;
    artifactBudget: Readonly<{ committedBytes: number; maximumBytes: number }>;
    uploadBudget: Readonly<{ committedBytes: number; maximumBytes: number }>;
    networkBudget: Readonly<{
      committedRequestBytes: number; maximumRequestBytes: number;
      committedResponseBytes: number; maximumResponseBytes: number;
    }>;
    expiresAt: string;
  }>>;
  act(
    input: Readonly<{ sessionId: string; action: BrowserAutomationAction }>,
    authority: BrowserAutomationAuthority & Readonly<{ authorityId: string }>
  ): Promise<Readonly<{
    schemaVersion: "cockroach.governed-browser-action-result.v1";
    sessionId: string;
    actionNumber: number;
    actionBudget: Readonly<{ used: number; maximum: number }>;
    artifactBudget: Readonly<{ committedBytes: number; maximumBytes: number }>;
    uploadBudget: Readonly<{ committedBytes: number; maximumBytes: number }>;
    networkBudget: Readonly<{
      committedRequestBytes: number; maximumRequestBytes: number;
      committedResponseBytes: number; maximumResponseBytes: number;
    }>;
    data: unknown;
    attestation: BrowserAutomationBackendResult["attestation"];
  }>>;
  closeSession(
    input: Readonly<{ sessionId: string }>,
    authority: BrowserAutomationAuthority & Readonly<{ authorityId: string }>
  ): Promise<Readonly<{ schemaVersion: "cockroach.governed-browser-session-close.v1"; sessionId: string; closed: true; actionsUsed: number }>>;
  capabilityReport(): Readonly<Record<string, unknown>>;
}

export interface GovernedEngineSessionFactoryResult {
  readonly context: object;
  readonly ownedContext: true;
  readonly page?: object;
  readonly browser?: object;
  readonly browserOwned?: boolean;
  readonly selectors?: object;
  readonly networkIsolation: Readonly<{
    serviceWorkers: "block";
    webSockets: "block";
    nonRoutedEgress: "host-blocked";
  }>;
}

export interface GovernedEngineServices {
  createSession(input: BrowserAutomationBackendOpenInput): GovernedEngineSessionFactoryResult | Promise<GovernedEngineSessionFactoryResult>;
  authorizeRequest(input: Readonly<{
    sessionId: string; url: string; origin: string; method: string; resourceType: string;
    action: BrowserAutomationActionKind; effect: BrowserAutomationEffect; principalId: string; actionNumber: number;
    remainingRequestBytes: number; remainingResponseBytes: number;
    signal?: AbortSignal | null; deadline?: string | null;
  }>): Readonly<{ allowed: boolean }> | Promise<Readonly<{ allowed: boolean }>>;
  resolveFileRefs?(input: Readonly<{ sessionId: string; fileRefs: readonly string[]; signal?: AbortSignal | null; deadline?: string | null }>): readonly Readonly<{ ref: string; name: string; mimeType: string; buffer: Uint8Array }>[] | Promise<readonly Readonly<{ ref: string; name: string; mimeType: string; buffer: Uint8Array }>[] >;
  saveArtifact?(input: Readonly<{ sessionId: string; name: string; bytes: Uint8Array; sha256: string; kind: string; signal?: AbortSignal | null; deadline?: string | null }>): void | Promise<void>;
  resolveExpression?(input: Readonly<{ sessionId: string; expressionRef: string; kind: string; signal?: AbortSignal | null; deadline?: string | null }>): string | ((...args: never[]) => unknown) | Promise<string | ((...args: never[]) => unknown)>;
  resolveScript?(input: Readonly<{ sessionId: string; scriptRef: string; signal?: AbortSignal | null; deadline?: string | null }>): string | Promise<string>;
  resolveStyle?(input: Readonly<{ sessionId: string; styleRef: string; signal?: AbortSignal | null; deadline?: string | null }>): string | Promise<string>;
  resolveRouteBody?(input: Readonly<{ sessionId: string; bodyRef: string; routeId: string; signal?: AbortSignal | null; deadline?: string | null }>): string | Uint8Array | Promise<string | Uint8Array>;
  saveState?(input: Readonly<{ sessionId: string; stateRef: string; state: unknown; signal?: AbortSignal | null; deadline?: string | null }>): void | Promise<void>;
  listStates?(input: Readonly<{ sessionId: string; signal?: AbortSignal | null; deadline?: string | null }>): readonly string[] | Promise<readonly string[]>;
  deleteState?(input: Readonly<{ sessionId: string; stateRef: string; signal?: AbortSignal | null; deadline?: string | null }>): void | Promise<void>;
}

export declare class BrowserAutomationError extends Error {
  readonly code: string;
  constructor(code: string, message: string, options?: Readonly<{ cause?: unknown }>);
}
export declare function createGovernedBrowserAutomation(options: Readonly<{ backend: BrowserAutomationBackend; policy?: BrowserAutomationPolicy }>): GovernedBrowserAutomation;
export declare function createGovernedPlaywrightBackend(options: GovernedEngineServices): BrowserAutomationBackend;

export declare const BROWSER_AUTOMATION_ACTIONS: readonly BrowserAutomationActionKind[];
export declare const BROWSER_AUTOMATION_SAFE_ACTIONS: readonly BrowserAutomationActionKind[];
export declare const BROWSER_AUTOMATION_EFFECTS: readonly BrowserAutomationEffect[];
export declare const BROWSER_AUTOMATION_CATEGORIES: readonly string[];
export declare const BROWSER_AUTOMATION_ACTION_EFFECTS: Readonly<Record<BrowserAutomationActionKind, BrowserAutomationEffect>>;
export declare const BROWSER_AUTOMATION_ACTION_CATALOG: readonly Readonly<{ kind: BrowserAutomationActionKind; category: string; effect: BrowserAutomationEffect; defaultEnabled: boolean }>[];
export declare const BROWSER_AUTOMATION_CATEGORY_CATALOG: readonly Readonly<{ id: string; status: "cataloged"; actions: readonly BrowserAutomationActionKind[] }>[];
export declare const GOVERNED_ENGINE_HANDLER_ACTIONS: readonly BrowserAutomationActionKind[];
export declare const GOVERNED_ENGINE_REQUIRED_SERVICES: Readonly<Partial<Record<BrowserAutomationActionKind, readonly string[]>>>;
export declare const GOVERNED_ENGINE_UNSUPPORTED_ACTIONS: readonly BrowserAutomationActionKind[];
export declare function browserAutomationEffectForAction(kind: BrowserAutomationActionKind): BrowserAutomationEffect;
