export const HOST_SCHEMA_VERSION: "cockroach.browser-host.v1";
export const CAPABILITY_SCHEMA_VERSION: "cockroach.browser-host-capabilities.v1";

export type BrowserProhibitedEffect =
  | "external-protocol"
  | "download"
  | "filesystem-read"
  | "filesystem-write"
  | "file-picker"
  | "clipboard-read"
  | "clipboard-write"
  | "permission-prompt"
  | "print-dialog"
  | "modal-dialog";

export const PROHIBITED_EFFECTS: readonly BrowserProhibitedEffect[];

export interface BrowserEffectsAttestation {
  readonly externalProtocol: false;
  readonly download: false;
  readonly filesystemRead: false;
  readonly filesystemWrite: false;
  readonly filePicker: false;
  readonly clipboardRead: false;
  readonly clipboardWrite: false;
  readonly permissionPrompt: false;
  readonly printDialog: false;
  readonly modalDialog: false;
}

export const FALSE_EFFECTS: Readonly<BrowserEffectsAttestation>;

export class BrowserHostError extends Error {
  readonly code: string;
  constructor(message: string, options?: { code?: string; cause?: unknown });
}

export interface BrowserTarget {
  readonly sessionId: string;
  readonly pageId: string;
  readonly origin: string;
  readonly revision: string;
}

export interface BrowserElementStates {
  readonly disabled?: boolean;
  readonly checked?: boolean;
  readonly selected?: boolean;
  readonly expanded?: boolean;
  readonly required?: boolean;
  readonly valuePresent?: boolean;
}

export type BrowserInteractiveRole =
  | "button"
  | "checkbox"
  | "combobox"
  | "form"
  | "link"
  | "listbox"
  | "menuitem"
  | "menuitemcheckbox"
  | "menuitemradio"
  | "option"
  | "radio"
  | "searchbox"
  | "spinbutton"
  | "switch"
  | "tab"
  | "textbox";

export interface BrowserObservedElement {
  readonly elementId: string;
  readonly role: BrowserInteractiveRole;
  readonly name: string;
  readonly states: Readonly<BrowserElementStates>;
}

export interface BrowserObservation {
  readonly target: Readonly<BrowserTarget>;
  readonly url: string;
  readonly title: string;
  readonly elements: readonly BrowserObservedElement[];
}

export type BrowserApplyOperation =
  | { readonly kind: "setValueRef"; readonly elementId: string; readonly valueRef: string }
  | { readonly kind: "selectOption"; readonly elementId: string; readonly optionId: string }
  | { readonly kind: "setChecked"; readonly elementId: string; readonly checked: boolean };

export type BrowserSubmitOperation =
  | {
      readonly kind: "activate" | "submitForm";
      readonly elementId: string;
      readonly expectedOrigin: string;
      readonly opensNewPage: boolean;
    }
  | {
      readonly kind: "navigate";
      readonly url: string;
      readonly expectedOrigin: string;
      readonly opensNewPage: boolean;
    };

export type BrowserPreviewInput =
  | {
      readonly target: BrowserTarget;
      readonly phase: "apply";
      readonly operations: readonly BrowserApplyOperation[];
    }
  | {
      readonly target: BrowserTarget;
      readonly phase: "submit";
      readonly operations: readonly [BrowserSubmitOperation];
    };

export type BrowserPlanCore =
  | {
      readonly schemaVersion: "maqam.browser-plan.v1";
      readonly target: BrowserTarget;
      readonly phase: "apply";
      readonly operations: readonly BrowserApplyOperation[];
    }
  | {
      readonly schemaVersion: "maqam.browser-plan.v1";
      readonly target: BrowserTarget;
      readonly phase: "submit";
      readonly operations: readonly [BrowserSubmitOperation];
    };

export type BrowserApprovedPlan = BrowserPlanCore & {
  readonly planHash: string;
  readonly planToken: string;
};

export interface MaqamBrowserExecution {
  readonly schemaVersion: "maqam.browser-driver-execution.v1";
  readonly runId: string;
  readonly toolName: string;
  readonly inputHash: string;
  readonly approvalIds: readonly string[];
  readonly approvalActions: readonly string[];
  readonly authorizedOrigins: readonly string[];
  readonly prohibitedEffects: readonly BrowserProhibitedEffect[];
  readonly signal: AbortSignal | null;
}

export interface BrowserMutationResult {
  readonly operationId: string;
  readonly target: BrowserTarget;
  readonly effects: Readonly<BrowserEffectsAttestation>;
}

/**
 * Opaque runtime-owned element identity. It is never returned by the host and
 * must remain stable for a runtime document revision.
 */
export type BrowserRuntimeElementHandle = object | ((...args: never[]) => unknown);

export interface BrowserRuntimeElement {
  readonly handle: BrowserRuntimeElementHandle;
  readonly role: BrowserInteractiveRole;
  readonly name: string;
  readonly states: Readonly<BrowserElementStates>;
}

export interface BrowserRuntimeSnapshot {
  /** Opaque runtime revision that changes for every relevant DOM/navigation change. */
  readonly documentRevision: string;
  readonly url: string;
  readonly title: string;
  readonly elements: readonly BrowserRuntimeElement[];
}

export type BrowserRuntimeApplyOperation =
  | { readonly kind: "setValue"; readonly handle: BrowserRuntimeElementHandle; readonly value: string }
  | {
      readonly kind: "selectOption";
      readonly handle: BrowserRuntimeElementHandle;
      readonly optionId: string;
    }
  | {
      readonly kind: "setChecked";
      readonly handle: BrowserRuntimeElementHandle;
      readonly checked: boolean;
    };

export type BrowserRuntimeSubmitOperation =
  | {
      readonly kind: "activate" | "submitForm";
      readonly handle: BrowserRuntimeElementHandle;
      readonly expectedOrigin: string;
      readonly opensNewPage: boolean;
    }
  | {
      readonly kind: "navigate";
      readonly url: string;
      readonly expectedOrigin: string;
      readonly opensNewPage: boolean;
    };

export interface BrowserRuntimeMutationContext {
  readonly operationId: string;
  readonly authorizedOrigins: readonly string[];
  readonly prohibitedEffects: readonly BrowserProhibitedEffect[];
  readonly signal: AbortSignal | null;
}

export interface BrowserRuntimePage {
  snapshot(input: {
    readonly maxElements: number;
    readonly signal: AbortSignal | null;
  }): BrowserRuntimeSnapshot | Promise<BrowserRuntimeSnapshot>;
  apply(
    operations: readonly BrowserRuntimeApplyOperation[],
    context: BrowserRuntimeMutationContext
  ): { readonly effects: BrowserEffectsAttestation }
    | Promise<{ readonly effects: BrowserEffectsAttestation }>;
  submit(
    operation: BrowserRuntimeSubmitOperation,
    context: BrowserRuntimeMutationContext
  ): { readonly effects: BrowserEffectsAttestation; readonly page: BrowserRuntimePage }
    | Promise<{ readonly effects: BrowserEffectsAttestation; readonly page: BrowserRuntimePage }>;
  close(): void | Promise<void>;
}

export interface BrowserRuntimeSession {
  listPages(): readonly BrowserRuntimePage[] | Promise<readonly BrowserRuntimePage[]>;
  close(): void | Promise<void>;
}

export interface BrowserRuntime {
  openSession(input: {
    readonly allowedOrigins: readonly string[];
    readonly initialUrl?: string;
    readonly signal: AbortSignal | null;
  }): BrowserRuntimeSession | Promise<BrowserRuntimeSession>;
}

export interface BrowserHostLimits {
  maxSessions?: number;
  maxPagesPerSession?: number;
  maxElements?: number;
  maxTextChars?: number;
  maxValueChars?: number;
}

export interface BrowserPageDescriptor {
  readonly target: BrowserTarget;
  readonly url: string;
  readonly title: string;
}

export interface BrowserSessionDescriptor {
  readonly schemaVersion: "cockroach.browser-host.v1";
  readonly sessionId: string;
  readonly allowedOrigins: readonly string[];
  readonly pages: readonly BrowserPageDescriptor[];
}

export interface BrowserHostCapabilities {
  readonly schemaVersion: "cockroach.browser-host-capabilities.v1";
  readonly maqamDriverCompatible: true;
  readonly governance: "external-required";
  readonly execution: "injected-runtime";
  readonly operations: Readonly<{
    observe: true;
    preview: true;
    apply: readonly ["setValueRef", "selectOption", "setChecked"];
    submit: readonly ["activate", "submitForm", "navigate"];
  }>;
  readonly guarantees: Readonly<{
    opaqueElementIds: true;
    monotonicRevisions: true;
    staleTargetRejection: true;
    operationIdDedupe: true;
    valueRefsResolvedAfterApproval: true;
    allFalseEffectAttestationRequired: true;
  }>;
  readonly playwright: Readonly<{
    bundled: false;
    pinnedInteractiveNetworking: false;
  }>;
  readonly limitations: readonly string[];
}

export interface BrowserHost {
  /** These four functions are own enumerable data methods for Maqam registration. */
  observe(
    request: { readonly target: BrowserTarget; readonly maxElements: number },
    execution: MaqamBrowserExecution
  ): Promise<BrowserObservation>;
  preview(request: BrowserPreviewInput, execution: MaqamBrowserExecution): Promise<BrowserPlanCore>;
  apply(
    request: { readonly plan: BrowserApprovedPlan; readonly operationId: string },
    execution: MaqamBrowserExecution
  ): Promise<BrowserMutationResult>;
  submit(
    request: { readonly plan: BrowserApprovedPlan; readonly operationId: string },
    execution: MaqamBrowserExecution
  ): Promise<BrowserMutationResult>;

  /** Trusted lifecycle methods are not agent tool operations. */
  openSession(input: {
    readonly allowedOrigins: readonly string[];
    readonly initialUrl?: string;
    readonly signal?: AbortSignal | null;
  }): Promise<BrowserSessionDescriptor>;
  listPages(input: {
    readonly sessionId: string;
    readonly signal?: AbortSignal | null;
  }): Promise<readonly BrowserPageDescriptor[]>;
  closePage(input: { readonly sessionId: string; readonly pageId: string }): Promise<void>;
  closeSession(input: { readonly sessionId: string }): Promise<void>;
  close(): Promise<void>;
  capabilityReport(): BrowserHostCapabilities;
}

export interface BrowserHostOptions {
  runtime: BrowserRuntime;
  resolveValueRef(
    valueRef: string,
    context: Readonly<{
      sessionId: string;
      pageId: string;
      elementId: string;
      operationId: string;
      signal: AbortSignal | null;
    }>
  ): string | Promise<string>;
  limits?: BrowserHostLimits;
}

/**
 * Creates a Maqam-compatible driver plus trusted lifecycle surface. The host
 * does not bundle Playwright, import profiles, or claim network pinning; the
 * injected runtime owns those duties and must attest every blocked effect.
 */
export function createBrowserHost(options: BrowserHostOptions): BrowserHost;
