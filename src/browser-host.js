import { createHash, randomBytes } from "node:crypto";

const HOST_SCHEMA_VERSION = "cockroach.browser-host.v1";
const CAPABILITY_SCHEMA_VERSION = "cockroach.browser-host-capabilities.v1";
const MAQAM_PLAN_SCHEMA_VERSION = "maqam.browser-plan.v1";
const MAQAM_EXECUTION_SCHEMA_VERSION = "maqam.browser-driver-execution.v1";

const EFFECT_KEYS = Object.freeze([
  "externalProtocol",
  "download",
  "filesystemRead",
  "filesystemWrite",
  "filePicker",
  "clipboardRead",
  "clipboardWrite",
  "permissionPrompt",
  "printDialog",
  "modalDialog"
]);
const PROHIBITED_EFFECTS = Object.freeze([
  "external-protocol",
  "download",
  "filesystem-read",
  "filesystem-write",
  "file-picker",
  "clipboard-read",
  "clipboard-write",
  "permission-prompt",
  "print-dialog",
  "modal-dialog"
]);
const FALSE_EFFECTS = Object.freeze(Object.fromEntries(EFFECT_KEYS.map((key) => [key, false])));

const APPLY_ROLES = Object.freeze({
  setValueRef: new Set(["combobox", "searchbox", "spinbutton", "textbox"]),
  selectOption: new Set(["combobox", "listbox"]),
  setChecked: new Set(["checkbox", "radio", "switch"])
});
const SUBMIT_ROLES = Object.freeze({
  activate: new Set([
    "button", "link", "menuitem", "menuitemcheckbox", "menuitemradio", "tab"
  ]),
  submitForm: new Set(["button", "form"])
});
const OBSERVABLE_ROLES = new Set([
  ...Object.values(APPLY_ROLES).flatMap((roles) => [...roles]),
  ...Object.values(SUBMIT_ROLES).flatMap((roles) => [...roles]),
  "option"
]);

const DEFAULT_LIMITS = Object.freeze({
  maxSessions: 8,
  maxPagesPerSession: 32,
  maxElements: 500,
  maxTextChars: 100_000,
  maxValueChars: 65_536
});
const LIMIT_CEILINGS = Object.freeze({
  maxSessions: 64,
  maxPagesPerSession: 128,
  maxElements: 2_000,
  maxTextChars: 500_000,
  maxValueChars: 1_000_000
});

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;
const SAFE_VALUE_REF = /^ref:[A-Za-z0-9][A-Za-z0-9._:/-]*$/;
const SAFE_ROLE = /^[a-z][a-z0-9_-]*$/;
const STATE_KEYS = new Set([
  "disabled", "checked", "selected", "expanded", "required", "valuePresent"
]);

class BrowserHostError extends Error {
  constructor(message, { code = "BROWSER_HOST_ERROR", cause } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "BrowserHostError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new BrowserHostError(message, { code, cause });
}

function ownRecord(value, allowedKeys, label, { optionalKeys = new Set() } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("BROWSER_HOST_INPUT_INVALID", `${label} must be an object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail("BROWSER_HOST_INPUT_INVALID", `${label} must be a plain object.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== "string" || !allowedKeys.has(key)) {
      fail("BROWSER_HOST_INPUT_INVALID", `${label} contains an unsupported field.`);
    }
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      fail("BROWSER_HOST_INPUT_INVALID", `${label}.${key} must be an enumerable data property.`);
    }
  }
  for (const key of allowedKeys) {
    if (!optionalKeys.has(key) && !Object.hasOwn(descriptors, key)) {
      fail("BROWSER_HOST_INPUT_INVALID", `${label}.${key} is required.`);
    }
  }
  return Object.fromEntries(
    Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value])
  );
}

function ownArray(value, label, maximumLength) {
  if (!Array.isArray(value) || value.length > maximumLength) {
    fail("BROWSER_HOST_INPUT_INVALID", `${label} must be a bounded array.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[index];
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      fail("BROWSER_HOST_INPUT_INVALID", `${label} must not be sparse or accessor-backed.`);
    }
  }
  for (const key of Reflect.ownKeys(descriptors)) {
    if (key === "length") continue;
    if (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key)
      || Number(key) >= value.length) {
      fail("BROWSER_HOST_INPUT_INVALID", `${label} contains an unsupported property.`);
    }
  }
  return Array.from({ length: value.length }, (_, index) => descriptors[index].value);
}

function boundedString(value, label, maximumLength, { allowEmpty = false, pattern } = {}) {
  if (typeof value !== "string" || value.length > maximumLength || value.includes("\u0000")
    || (!allowEmpty && (value === "" || value.trim() !== value))
    || (pattern && !pattern.test(value))) {
    fail("BROWSER_HOST_INPUT_INVALID", `${label} is invalid.`);
  }
  return value;
}

function identifier(value, label) {
  return boundedString(value, label, 256, { pattern: SAFE_ID });
}

function exactOrigin(value, label) {
  boundedString(value, label, 8_192);
  let url;
  try {
    url = new URL(value);
  } catch (error) {
    fail("BROWSER_HOST_INPUT_INVALID", `${label} must be an exact HTTP(S) origin.`, error);
  }
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:")
    || url.username || url.password || url.origin !== value) {
    fail("BROWSER_HOST_INPUT_INVALID", `${label} must be an exact HTTP(S) origin.`);
  }
  return url.origin;
}

function absoluteUrl(value, label) {
  boundedString(value, label, 8_192);
  let url;
  try {
    url = new URL(value);
  } catch (error) {
    fail("BROWSER_HOST_INPUT_INVALID", `${label} must be an absolute HTTP(S) URL.`, error);
  }
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:")
    || url.username || url.password) {
    fail("BROWSER_HOST_INPUT_INVALID", `${label} must be an absolute HTTP(S) URL.`);
  }
  return url.toString();
}

function publicUrl(value, label) {
  const url = new URL(absoluteUrl(value, label));
  for (const key of [...url.searchParams.keys()]) url.searchParams.set(key, "[REDACTED]");
  if (url.hash) url.hash = "#[REDACTED]";
  return url.toString();
}

function normalizeLimits(value = {}) {
  const supplied = ownRecord(
    value,
    new Set(Object.keys(DEFAULT_LIMITS)),
    "Browser host limits",
    { optionalKeys: new Set(Object.keys(DEFAULT_LIMITS)) }
  );
  const normalized = { ...DEFAULT_LIMITS };
  for (const [key, valueForKey] of Object.entries(supplied)) {
    if (!Number.isSafeInteger(valueForKey) || valueForKey <= 0
      || valueForKey > LIMIT_CEILINGS[key]) {
      fail("BROWSER_HOST_CONFIG_INVALID", `Browser host limits.${key} is out of range.`);
    }
    normalized[key] = valueForKey;
  }
  return Object.freeze(normalized);
}

function exactOwnMethod(value, key, label) {
  if (!value || (typeof value !== "object" && typeof value !== "function")) {
    fail("BROWSER_HOST_RUNTIME_INVALID", `${label} must be an object.`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")
    || typeof descriptor.value !== "function") {
    fail(
      "BROWSER_HOST_RUNTIME_INVALID",
      `${label}.${key} must be an own enumerable data function.`
    );
  }
  return descriptor.value.bind(value);
}

function requireSignal(value, label) {
  if (value === undefined || value === null) return null;
  if (typeof AbortSignal === "undefined" || !(value instanceof AbortSignal)) {
    fail("BROWSER_HOST_INPUT_INVALID", `${label} must be an AbortSignal or null.`);
  }
  return value;
}

function requireNotAborted(signal) {
  if (signal?.aborted) fail("BROWSER_HOST_ABORTED", "Browser host execution was aborted.");
}

function frozenPlain(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(frozenPlain));
  if (!value || typeof value !== "object") return value;
  return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, frozenPlain(item)])
  ));
}

function canonicalData(value, label, depth = 0) {
  if (depth > 16) fail("BROWSER_HOST_INPUT_INVALID", `${label} is too deeply nested.`);
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    return ownArray(value, label, 1_000).map((item, index) => (
      canonicalData(item, `${label}[${index}]`, depth + 1)
    ));
  }
  if (!value || typeof value !== "object") {
    fail("BROWSER_HOST_INPUT_INVALID", `${label} is not JSON-compatible.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail("BROWSER_HOST_INPUT_INVALID", `${label} must contain only plain data.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const result = {};
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key !== "string")) {
    fail("BROWSER_HOST_INPUT_INVALID", `${label} must not contain symbol properties.`);
  }
  for (const key of keys.sort()) {
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      fail("BROWSER_HOST_INPUT_INVALID", `${label}.${key} must be an enumerable data property.`);
    }
    result[key] = canonicalData(descriptor.value, `${label}.${key}`, depth + 1);
  }
  return result;
}

function targetFor(pageEntry) {
  return frozenPlain({
    sessionId: pageEntry.session.id,
    pageId: pageEntry.id,
    origin: pageEntry.origin,
    revision: `revision-${pageEntry.revision}`
  });
}

function normalizeTarget(value, label = "Browser target") {
  const target = ownRecord(value, new Set(["sessionId", "pageId", "origin", "revision"]), label);
  return frozenPlain({
    sessionId: identifier(target.sessionId, `${label}.sessionId`),
    pageId: identifier(target.pageId, `${label}.pageId`),
    origin: exactOrigin(target.origin, `${label}.origin`),
    revision: identifier(target.revision, `${label}.revision`)
  });
}

function sameTarget(left, right) {
  return left.sessionId === right.sessionId
    && left.pageId === right.pageId
    && left.origin === right.origin
    && left.revision === right.revision;
}

function normalizeStates(value, label) {
  const states = ownRecord(value ?? {}, STATE_KEYS, label, { optionalKeys: STATE_KEYS });
  const normalized = {};
  for (const [key, state] of Object.entries(states)) {
    if (typeof state !== "boolean") {
      fail("BROWSER_HOST_RUNTIME_INVALID", `${label}.${key} must be a boolean.`);
    }
    normalized[key] = state;
  }
  return frozenPlain(normalized);
}

function safeRuntimeResult(value, keys, label, optionalKeys = new Set()) {
  try {
    return ownRecord(value, keys, label, { optionalKeys });
  } catch (error) {
    if (error instanceof BrowserHostError) {
      throw new BrowserHostError(`${label} is invalid.`, {
        code: "BROWSER_HOST_RUNTIME_INVALID",
        cause: error
      });
    }
    throw error;
  }
}

function normalizeSnapshot(value, limits) {
  const snapshot = safeRuntimeResult(
    value,
    new Set(["documentRevision", "url", "title", "elements"]),
    "Browser runtime snapshot"
  );
  const documentRevision = boundedString(
    snapshot.documentRevision,
    "Browser runtime snapshot.documentRevision",
    512,
    { allowEmpty: false }
  );
  const url = absoluteUrl(snapshot.url, "Browser runtime snapshot.url");
  const title = boundedString(snapshot.title, "Browser runtime snapshot.title", 4_096, {
    allowEmpty: true
  });
  const rawElements = ownArray(
    snapshot.elements,
    "Browser runtime snapshot.elements",
    limits.maxElements
  );
  const elements = rawElements.map((rawElement, index) => {
    const element = safeRuntimeResult(
      rawElement,
      new Set(["handle", "role", "name", "states"]),
      `Browser runtime snapshot.elements[${index}]`
    );
    if ((typeof element.handle !== "object" && typeof element.handle !== "function")
      || element.handle === null) {
      fail("BROWSER_HOST_RUNTIME_INVALID", "Browser runtime element handles must be opaque objects.");
    }
    const role = boundedString(
      element.role,
      `Browser runtime snapshot.elements[${index}].role`,
      64,
      { pattern: SAFE_ROLE }
    );
    if (!OBSERVABLE_ROLES.has(role)) {
      fail("BROWSER_HOST_RUNTIME_INVALID", `Browser runtime role '${role}' is not supported.`);
    }
    return {
      handle: element.handle,
      role,
      name: boundedString(
        element.name,
        `Browser runtime snapshot.elements[${index}].name`,
        4_096,
        { allowEmpty: true }
      ),
      states: normalizeStates(
        element.states,
        `Browser runtime snapshot.elements[${index}].states`
      )
    };
  });
  const handles = new Set();
  for (const element of elements) {
    if (handles.has(element.handle)) {
      fail("BROWSER_HOST_RUNTIME_INVALID", "Browser runtime element handles must be unique.");
    }
    handles.add(element.handle);
  }
  const textChars = url.length + title.length
    + elements.reduce((sum, element) => sum + element.role.length + element.name.length, 0);
  if (textChars > limits.maxTextChars) {
    fail("BROWSER_HOST_RUNTIME_INVALID", "Browser runtime snapshot exceeds the text limit.");
  }
  return { documentRevision, url, title, elements };
}

function normalizeExecution(value, method, origins) {
  const execution = ownRecord(
    value,
    new Set([
      "schemaVersion", "runId", "toolName", "inputHash", "approvalIds", "approvalActions",
      "authorizedOrigins", "prohibitedEffects", "signal"
    ]),
    "Maqam browser execution"
  );
  if (execution.schemaVersion !== MAQAM_EXECUTION_SCHEMA_VERSION) {
    fail("BROWSER_HOST_INPUT_INVALID", "Maqam browser execution schema is unsupported.");
  }
  identifier(execution.runId, "Maqam browser execution.runId");
  boundedString(execution.toolName, "Maqam browser execution.toolName", 256);
  if (execution.toolName.split(".").at(-1) !== method) {
    fail("BROWSER_HOST_INPUT_INVALID", "Maqam browser execution tool does not match dispatch.");
  }
  boundedString(execution.inputHash, "Maqam browser execution.inputHash", 256);
  const approvalIds = ownArray(execution.approvalIds, "Maqam browser execution.approvalIds", 64);
  const approvalActions = ownArray(
    execution.approvalActions,
    "Maqam browser execution.approvalActions",
    64
  );
  if (approvalIds.length !== approvalActions.length
    || approvalIds.some((id, index) => {
      try {
        identifier(id, `Maqam browser execution.approvalIds[${index}]`);
        boundedString(
          approvalActions[index],
          `Maqam browser execution.approvalActions[${index}]`,
          256
        );
        return false;
      } catch {
        return true;
      }
    })) {
    fail("BROWSER_HOST_INPUT_INVALID", "Maqam browser execution approvals are invalid.");
  }
  const authorizedOrigins = ownArray(
    execution.authorizedOrigins,
    "Maqam browser execution.authorizedOrigins",
    256
  ).map((origin, index) => exactOrigin(origin, `authorizedOrigins[${index}]`));
  for (const origin of origins) {
    if (!authorizedOrigins.includes(origin)) {
      fail("BROWSER_HOST_ORIGIN_DENIED", `Browser origin '${origin}' is not authorized.`);
    }
  }
  const prohibited = ownArray(
    execution.prohibitedEffects,
    "Maqam browser execution.prohibitedEffects",
    PROHIBITED_EFFECTS.length
  );
  if (prohibited.length !== PROHIBITED_EFFECTS.length
    || PROHIBITED_EFFECTS.some((effect) => !prohibited.includes(effect))
    || new Set(prohibited).size !== prohibited.length) {
    fail("BROWSER_HOST_EFFECT_BOUNDARY_MISSING", "Maqam prohibited effects are incomplete.");
  }
  if (method === "apply" || method === "submit") {
    const requiredAction = `effect:browser:${method}`;
    const index = approvalActions.indexOf(requiredAction);
    if (index < 0 || !approvalIds[index]) {
      fail("BROWSER_HOST_APPROVAL_REQUIRED", `Browser ${method} requires consumed exact approval.`);
    }
  }
  const signal = requireSignal(execution.signal, "Maqam browser execution.signal");
  requireNotAborted(signal);
  return { signal, authorizedOrigins: Object.freeze(authorizedOrigins) };
}

function normalizeEffects(value) {
  const effects = safeRuntimeResult(value, new Set(EFFECT_KEYS), "Browser runtime effects");
  for (const key of EFFECT_KEYS) {
    if (effects[key] !== false) {
      fail(
        "BROWSER_HOST_EFFECT_VIOLATION",
        `Browser runtime did not attest that '${key}' stayed blocked.`
      );
    }
  }
  return FALSE_EFFECTS;
}

function normalizeApplyOperations(value, pageEntry) {
  const operations = ownArray(value, "Browser apply operations", 100);
  if (operations.length === 0) {
    fail("BROWSER_HOST_INPUT_INVALID", "Browser apply requires at least one operation.");
  }
  return operations.map((raw, index) => {
    const discriminator = ownRecord(
      raw,
      new Set(["kind", "elementId", "valueRef", "optionId", "checked"]),
      `Browser apply operations[${index}]`,
      { optionalKeys: new Set(["elementId", "valueRef", "optionId", "checked"]) }
    );
    const keySets = {
      setValueRef: new Set(["kind", "elementId", "valueRef"]),
      selectOption: new Set(["kind", "elementId", "optionId"]),
      setChecked: new Set(["kind", "elementId", "checked"])
    };
    const keys = keySets[discriminator.kind];
    if (!keys || Object.keys(discriminator).some((key) => !keys.has(key))
      || [...keys].some((key) => !Object.hasOwn(discriminator, key))) {
      fail("BROWSER_HOST_INPUT_INVALID", "Browser apply operation shape is invalid.");
    }
    const elementId = identifier(
      discriminator.elementId,
      `Browser apply operations[${index}].elementId`
    );
    const element = pageEntry.elements.get(elementId);
    if (!element || !APPLY_ROLES[discriminator.kind].has(element.role)) {
      fail(
        "BROWSER_HOST_OPERATION_ROLE_DENIED",
        `Browser ${discriminator.kind} is not allowed for the referenced element role.`
      );
    }
    if (element.states.disabled) {
      fail("BROWSER_HOST_OPERATION_ROLE_DENIED", "Browser operation targets a disabled element.");
    }
    if (discriminator.kind === "setValueRef") {
      return frozenPlain({
        kind: discriminator.kind,
        elementId,
        valueRef: boundedString(
          discriminator.valueRef,
          `Browser apply operations[${index}].valueRef`,
          256,
          { pattern: SAFE_VALUE_REF }
        )
      });
    }
    if (discriminator.kind === "selectOption") {
      return frozenPlain({
        kind: discriminator.kind,
        elementId,
        optionId: identifier(
          discriminator.optionId,
          `Browser apply operations[${index}].optionId`
        )
      });
    }
    if (typeof discriminator.checked !== "boolean"
      || (element.role === "radio" && discriminator.checked !== true)) {
      fail("BROWSER_HOST_INPUT_INVALID", "Browser checked state is invalid for this element.");
    }
    return frozenPlain({ kind: discriminator.kind, elementId, checked: discriminator.checked });
  });
}

function normalizeSubmitOperations(value, pageEntry, allowedOrigins) {
  const rawOperations = ownArray(value, "Browser submit operations", 1);
  if (rawOperations.length !== 1) {
    fail("BROWSER_HOST_INPUT_INVALID", "Browser submit requires exactly one operation.");
  }
  const raw = rawOperations[0];
  const discriminator = ownRecord(
    raw,
    new Set(["kind", "elementId", "url", "expectedOrigin", "opensNewPage"]),
    "Browser submit operation",
    { optionalKeys: new Set(["elementId", "url", "expectedOrigin", "opensNewPage"]) }
  );
  const keySets = {
    activate: new Set(["kind", "elementId", "expectedOrigin", "opensNewPage"]),
    submitForm: new Set(["kind", "elementId", "expectedOrigin", "opensNewPage"]),
    navigate: new Set(["kind", "url", "expectedOrigin", "opensNewPage"])
  };
  const keys = keySets[discriminator.kind];
  if (!keys || Object.keys(discriminator).some((key) => !keys.has(key))
    || [...keys].some((key) => !Object.hasOwn(discriminator, key))) {
    fail("BROWSER_HOST_INPUT_INVALID", "Browser submit operation shape is invalid.");
  }
  const expectedOrigin = exactOrigin(
    discriminator.expectedOrigin,
    "Browser submit operation.expectedOrigin"
  );
  if (!allowedOrigins.includes(expectedOrigin)) {
    fail("BROWSER_HOST_ORIGIN_DENIED", `Browser origin '${expectedOrigin}' is not session-scoped.`);
  }
  if (typeof discriminator.opensNewPage !== "boolean") {
    fail("BROWSER_HOST_INPUT_INVALID", "Browser submit opensNewPage must be a boolean.");
  }
  if (discriminator.kind === "navigate") {
    const url = absoluteUrl(discriminator.url, "Browser submit operation.url");
    if (new URL(url).origin !== expectedOrigin) {
      fail("BROWSER_HOST_INPUT_INVALID", "Browser navigation URL and expected origin differ.");
    }
    return Object.freeze([frozenPlain({
      kind: "navigate",
      url,
      expectedOrigin,
      opensNewPage: discriminator.opensNewPage
    })]);
  }
  const elementId = identifier(discriminator.elementId, "Browser submit operation.elementId");
  const element = pageEntry.elements.get(elementId);
  if (!element || !SUBMIT_ROLES[discriminator.kind].has(element.role) || element.states.disabled) {
    fail(
      "BROWSER_HOST_OPERATION_ROLE_DENIED",
      `Browser ${discriminator.kind} is not allowed for the referenced element role.`
    );
  }
  return Object.freeze([frozenPlain({
    kind: discriminator.kind,
    elementId,
    expectedOrigin,
    opensNewPage: discriminator.opensNewPage
  })]);
}

function normalizePlan(value, pageEntry, expectedPhase) {
  const plan = ownRecord(
    value,
    new Set([
      "schemaVersion", "target", "phase", "operations", "planHash", "planToken"
    ]),
    `Browser ${expectedPhase} plan`
  );
  if (plan.schemaVersion !== MAQAM_PLAN_SCHEMA_VERSION || plan.phase !== expectedPhase
    || typeof plan.planHash !== "string" || !/^[a-f0-9]{64}$/.test(plan.planHash)
    || typeof plan.planToken !== "string" || plan.planToken.length > 256) {
    fail("BROWSER_HOST_INPUT_INVALID", `Browser ${expectedPhase} plan is invalid.`);
  }
  const target = normalizeTarget(plan.target, `Browser ${expectedPhase} plan.target`);
  if (!sameTarget(target, targetFor(pageEntry))) {
    fail("BROWSER_HOST_TARGET_STALE", "Browser plan target is stale.");
  }
  const operations = expectedPhase === "apply"
    ? normalizeApplyOperations(plan.operations, pageEntry)
    : normalizeSubmitOperations(plan.operations, pageEntry, pageEntry.session.allowedOrigins);
  return frozenPlain({
    schemaVersion: MAQAM_PLAN_SCHEMA_VERSION,
    target,
    phase: expectedPhase,
    operations,
    planHash: plan.planHash,
    planToken: plan.planToken
  });
}

function operationFingerprint(phase, operationId, plan) {
  return createHash("sha256").update(JSON.stringify(canonicalData({
    phase,
    operationId,
    plan
  }, "Browser operation"))).digest("hex");
}

function createBrowserHost(options) {
  const config = ownRecord(
    options,
    new Set(["runtime", "resolveValueRef", "limits"]),
    "Browser host options",
    { optionalKeys: new Set(["limits"]) }
  );
  const runtimeOpenSession = exactOwnMethod(config.runtime, "openSession", "Browser runtime");
  if (typeof config.resolveValueRef !== "function") {
    fail("BROWSER_HOST_CONFIG_INVALID", "Browser host resolveValueRef must be a function.");
  }
  const limits = normalizeLimits(config.limits ?? {});
  const sessions = new Map();
  const operations = new Map();
  let closed = false;

  function requireOpen() {
    if (closed) fail("BROWSER_HOST_CLOSED", "Browser host is closed.");
  }

  function randomId(prefix) {
    return `${prefix}-${randomBytes(18).toString("base64url")}`;
  }

  function sessionFor(sessionId) {
    const id = identifier(sessionId, "Browser sessionId");
    const session = sessions.get(id);
    if (!session) fail("BROWSER_HOST_SESSION_NOT_FOUND", "Browser session was not found.");
    return session;
  }

  function pageFor(target) {
    const normalized = normalizeTarget(target);
    const session = sessionFor(normalized.sessionId);
    const page = session.pages.get(normalized.pageId);
    if (!page) fail("BROWSER_HOST_PAGE_NOT_FOUND", "Browser page was not found.");
    return { normalized, session, page };
  }

  function registerPage(session, runtimePage) {
    if (!runtimePage || (typeof runtimePage !== "object" && typeof runtimePage !== "function")) {
      fail("BROWSER_HOST_RUNTIME_INVALID", "Browser runtime page must be an object.");
    }
    const existing = session.pageIdsByRuntime.get(runtimePage);
    if (existing) return session.pages.get(existing);
    if (session.pages.size >= limits.maxPagesPerSession) {
      fail("BROWSER_HOST_LIMIT_EXCEEDED", "Browser session page limit was exceeded.");
    }
    const page = {
      id: randomId("page"),
      session,
      runtimePage,
      snapshot: exactOwnMethod(runtimePage, "snapshot", "Browser runtime page"),
      apply: exactOwnMethod(runtimePage, "apply", "Browser runtime page"),
      submit: exactOwnMethod(runtimePage, "submit", "Browser runtime page"),
      close: exactOwnMethod(runtimePage, "close", "Browser runtime page"),
      revision: 0,
      documentRevision: null,
      origin: null,
      observation: null,
      elements: new Map()
    };
    session.pageIdsByRuntime.set(runtimePage, page.id);
    session.pages.set(page.id, page);
    return page;
  }

  async function runtimePages(session) {
    let pages;
    try {
      pages = await session.listPages();
    } catch (error) {
      fail("BROWSER_HOST_RUNTIME_FAILURE", "Browser runtime could not list pages.", error);
    }
    const rawPages = ownArray(pages, "Browser runtime pages", limits.maxPagesPerSession);
    const unique = new Set(rawPages);
    if (unique.size !== rawPages.length) {
      fail("BROWSER_HOST_RUNTIME_INVALID", "Browser runtime returned duplicate pages.");
    }
    return rawPages.filter((page) => !session.retiredPages.has(page));
  }

  async function synchronizePages(session) {
    const rawPages = await runtimePages(session);
    const active = new Set(rawPages);
    for (const page of [...session.pages.values()]) {
      if (!active.has(page.runtimePage)) {
        session.retiredPages.add(page.runtimePage);
        session.pages.delete(page.id);
      }
    }
    return rawPages.map((runtimePage) => registerPage(session, runtimePage));
  }

  async function refreshPage(page, { forceRevision = false, signal = null } = {}) {
    requireNotAborted(signal);
    let raw;
    try {
      raw = await page.snapshot({ maxElements: limits.maxElements, signal });
    } catch (error) {
      fail("BROWSER_HOST_RUNTIME_FAILURE", "Browser runtime snapshot failed.", error);
    }
    const snapshot = normalizeSnapshot(raw, limits);
    const origin = new URL(snapshot.url).origin;
    if (!page.session.allowedOrigins.includes(origin)) {
      fail("BROWSER_HOST_ORIGIN_DENIED", `Browser page origin '${origin}' is not session-scoped.`);
    }
    if (!forceRevision && page.documentRevision === snapshot.documentRevision) {
      return page.observation;
    }
    page.revision += 1;
    page.documentRevision = snapshot.documentRevision;
    page.origin = origin;
    page.elements = new Map();
    const publicElements = snapshot.elements.map((element) => {
      const elementId = randomId("element");
      page.elements.set(elementId, element);
      return frozenPlain({
        elementId,
        role: element.role,
        name: element.name,
        states: element.states
      });
    });
    page.observation = frozenPlain({
      target: targetFor(page),
      url: publicUrl(snapshot.url, "Browser runtime snapshot.url"),
      title: snapshot.title,
      elements: publicElements
    });
    return page.observation;
  }

  async function currentPage(target, signal) {
    const { normalized, page } = pageFor(target);
    await refreshPage(page, { signal });
    if (!sameTarget(normalized, targetFor(page))) {
      fail("BROWSER_HOST_TARGET_STALE", "Browser target is stale.");
    }
    return page;
  }

  async function runDeduplicated(operationId, fingerprint, task) {
    const existing = operations.get(operationId);
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        fail("BROWSER_HOST_OPERATION_CONFLICT", "Browser operationId was reused for different input.");
      }
      return existing.promise;
    }
    const state = { dispatched: false };
    const markDispatched = () => {
      state.dispatched = true;
    };
    const promise = Promise.resolve().then(() => task(markDispatched));
    operations.set(operationId, { fingerprint, promise, state });
    try {
      return await promise;
    } catch (error) {
      if (!state.dispatched) operations.delete(operationId);
      throw error;
    }
  }

  function existingOperation(operationId, fingerprint) {
    const existing = operations.get(operationId);
    if (!existing) return null;
    if (existing.fingerprint !== fingerprint) {
      fail("BROWSER_HOST_OPERATION_CONFLICT", "Browser operationId was reused for different input.");
    }
    return existing.promise;
  }

  async function openSession(request) {
    requireOpen();
    const input = ownRecord(
      request,
      new Set(["allowedOrigins", "initialUrl", "signal"]),
      "Browser openSession input",
      { optionalKeys: new Set(["initialUrl", "signal"]) }
    );
    if (sessions.size >= limits.maxSessions) {
      fail("BROWSER_HOST_LIMIT_EXCEEDED", "Browser host session limit was exceeded.");
    }
    const allowedOrigins = ownArray(input.allowedOrigins, "Browser allowedOrigins", 256)
      .map((origin, index) => exactOrigin(origin, `Browser allowedOrigins[${index}]`));
    if (allowedOrigins.length === 0 || new Set(allowedOrigins).size !== allowedOrigins.length) {
      fail("BROWSER_HOST_INPUT_INVALID", "Browser allowedOrigins must be a unique non-empty array.");
    }
    const initialUrl = input.initialUrl === undefined
      ? undefined
      : absoluteUrl(input.initialUrl, "Browser initialUrl");
    if (initialUrl && !allowedOrigins.includes(new URL(initialUrl).origin)) {
      fail("BROWSER_HOST_ORIGIN_DENIED", "Browser initialUrl is not session-scoped.");
    }
    const signal = requireSignal(input.signal, "Browser openSession signal");
    requireNotAborted(signal);
    let runtimeSession;
    try {
      runtimeSession = await runtimeOpenSession(Object.freeze({
        allowedOrigins: Object.freeze([...allowedOrigins]),
        ...(initialUrl ? { initialUrl } : {}),
        signal
      }));
    } catch (error) {
      fail("BROWSER_HOST_RUNTIME_FAILURE", "Browser runtime could not open a session.", error);
    }
    let listRuntimePages;
    let closeRuntimeSession;
    try {
      closeRuntimeSession = exactOwnMethod(runtimeSession, "close", "Browser runtime session");
      listRuntimePages = exactOwnMethod(runtimeSession, "listPages", "Browser runtime session");
    } catch (error) {
      if (closeRuntimeSession) {
        try {
          await closeRuntimeSession();
        } catch {
          // Preserve the invalid runtime-contract error.
        }
      }
      throw error;
    }
    const session = {
      id: randomId("session"),
      runtimeSession,
      allowedOrigins: Object.freeze([...allowedOrigins]),
      listPages: listRuntimePages,
      close: closeRuntimeSession,
      pages: new Map(),
      pageIdsByRuntime: new WeakMap(),
      retiredPages: new WeakSet()
    };
    sessions.set(session.id, session);
    try {
      const pages = await synchronizePages(session);
      const publicPages = [];
      for (const page of pages) {
        const observation = await refreshPage(page, { signal });
        publicPages.push(frozenPlain({
          target: observation.target,
          url: observation.url,
          title: observation.title
        }));
      }
      return frozenPlain({
        schemaVersion: HOST_SCHEMA_VERSION,
        sessionId: session.id,
        allowedOrigins: session.allowedOrigins,
        pages: publicPages
      });
    } catch (error) {
      sessions.delete(session.id);
      try {
        await session.close();
      } catch {
        // Preserve the validation failure that made the session unusable.
      }
      throw error;
    }
  }

  async function listPages(request) {
    requireOpen();
    const input = ownRecord(
      request,
      new Set(["sessionId", "signal"]),
      "Browser listPages input",
      { optionalKeys: new Set(["signal"]) }
    );
    const signal = requireSignal(input.signal, "Browser listPages signal");
    const session = sessionFor(input.sessionId);
    const pages = await synchronizePages(session);
    const result = [];
    for (const page of pages) {
      const observation = await refreshPage(page, { signal });
      result.push(frozenPlain({
        target: observation.target,
        url: observation.url,
        title: observation.title
      }));
    }
    return Object.freeze(result);
  }

  async function closePage(request) {
    requireOpen();
    const input = ownRecord(
      request,
      new Set(["sessionId", "pageId"]),
      "Browser closePage input"
    );
    const session = sessionFor(input.sessionId);
    const pageId = identifier(input.pageId, "Browser closePage pageId");
    const page = session.pages.get(pageId);
    if (!page) fail("BROWSER_HOST_PAGE_NOT_FOUND", "Browser page was not found.");
    try {
      await page.close();
    } catch (error) {
      fail("BROWSER_HOST_RUNTIME_FAILURE", "Browser runtime could not close the page.", error);
    }
    session.retiredPages.add(page.runtimePage);
    session.pages.delete(page.id);
  }

  async function closeSession(request) {
    requireOpen();
    const input = ownRecord(request, new Set(["sessionId"]), "Browser closeSession input");
    const session = sessionFor(input.sessionId);
    try {
      await session.close();
    } catch (error) {
      fail("BROWSER_HOST_RUNTIME_FAILURE", "Browser runtime could not close the session.", error);
    }
    sessions.delete(session.id);
  }

  async function close() {
    if (closed) return;
    closed = true;
    const failures = [];
    for (const session of sessions.values()) {
      try {
        await session.close();
      } catch (error) {
        failures.push(error);
      }
    }
    sessions.clear();
    operations.clear();
    if (failures.length > 0) {
      throw new BrowserHostError("One or more browser sessions could not close.", {
        code: "BROWSER_HOST_RUNTIME_FAILURE",
        cause: new AggregateError(failures)
      });
    }
  }

  async function observe(request, execution) {
    requireOpen();
    const input = ownRecord(
      request,
      new Set(["target", "maxElements"]),
      "Browser observe input"
    );
    if (!Number.isSafeInteger(input.maxElements) || input.maxElements <= 0
      || input.maxElements > limits.maxElements) {
      fail("BROWSER_HOST_INPUT_INVALID", "Browser observe maxElements is out of range.");
    }
    const target = normalizeTarget(input.target, "Browser observe target");
    const checkedExecution = normalizeExecution(execution, "observe", [target.origin]);
    const page = await currentPage(target, checkedExecution.signal);
    return frozenPlain({
      ...page.observation,
      elements: page.observation.elements.slice(0, input.maxElements)
    });
  }

  async function preview(request, execution) {
    requireOpen();
    const input = ownRecord(
      request,
      new Set(["target", "phase", "operations"]),
      "Browser preview input"
    );
    if (input.phase !== "apply" && input.phase !== "submit") {
      fail("BROWSER_HOST_INPUT_INVALID", "Browser preview phase is invalid.");
    }
    const target = normalizeTarget(input.target, "Browser preview target");
    const roughOrigins = [target.origin];
    if (input.phase === "submit") {
      const raw = ownArray(input.operations, "Browser submit operations", 1);
      if (raw.length === 1 && raw[0] && typeof raw[0] === "object") {
        const descriptor = Object.getOwnPropertyDescriptor(raw[0], "expectedOrigin");
        if (descriptor?.enumerable && Object.hasOwn(descriptor, "value")) {
          roughOrigins.push(exactOrigin(descriptor.value, "Browser submit expectedOrigin"));
        }
      }
    }
    const checkedExecution = normalizeExecution(execution, "preview", [...new Set(roughOrigins)]);
    const page = await currentPage(target, checkedExecution.signal);
    const operationsForPlan = input.phase === "apply"
      ? normalizeApplyOperations(input.operations, page)
      : normalizeSubmitOperations(input.operations, page, page.session.allowedOrigins);
    return frozenPlain({
      schemaVersion: MAQAM_PLAN_SCHEMA_VERSION,
      target: targetFor(page),
      phase: input.phase,
      operations: operationsForPlan
    });
  }

  async function apply(request, execution) {
    requireOpen();
    const input = ownRecord(
      request,
      new Set(["plan", "operationId"]),
      "Browser apply input"
    );
    const operationId = identifier(input.operationId, "Browser apply operationId");
    const suppliedTarget = input.plan && typeof input.plan === "object"
      ? Object.getOwnPropertyDescriptor(input.plan, "target")?.value
      : null;
    const rawTarget = normalizeTarget(suppliedTarget, "Browser apply plan.target");
    const checkedExecution = normalizeExecution(execution, "apply", [rawTarget.origin]);
    sessionFor(rawTarget.sessionId);
    const fingerprint = operationFingerprint("apply", operationId, input.plan);
    const cached = existingOperation(operationId, fingerprint);
    if (cached) return cached;
    const page = await currentPage(rawTarget, checkedExecution.signal);
    const plan = normalizePlan(input.plan, page, "apply");
    return runDeduplicated(operationId, fingerprint, async (markDispatched) => {
      const runtimeOperations = [];
      for (const operation of plan.operations) {
        const element = page.elements.get(operation.elementId);
        if (!element) fail("BROWSER_HOST_TARGET_STALE", "Browser element is stale.");
        if (operation.kind === "setValueRef") {
          requireNotAborted(checkedExecution.signal);
          let value;
          try {
            value = await config.resolveValueRef(operation.valueRef, Object.freeze({
              sessionId: page.session.id,
              pageId: page.id,
              elementId: operation.elementId,
              operationId,
              signal: checkedExecution.signal
            }));
          } catch (error) {
            fail("BROWSER_HOST_VALUE_RESOLUTION_FAILED", "Browser value reference resolution failed.", error);
          }
          if (typeof value !== "string" || value.length > limits.maxValueChars
            || value.includes("\u0000")) {
            fail("BROWSER_HOST_VALUE_RESOLUTION_FAILED", "Browser value reference was not a bounded string.");
          }
          runtimeOperations.push(Object.freeze({ kind: "setValue", handle: element.handle, value }));
        } else if (operation.kind === "selectOption") {
          runtimeOperations.push(Object.freeze({
            kind: operation.kind,
            handle: element.handle,
            optionId: operation.optionId
          }));
        } else {
          runtimeOperations.push(Object.freeze({
            kind: operation.kind,
            handle: element.handle,
            checked: operation.checked
          }));
        }
      }
      requireNotAborted(checkedExecution.signal);
      let rawResult;
      try {
        markDispatched();
        rawResult = await page.apply(Object.freeze(runtimeOperations), Object.freeze({
          operationId,
          authorizedOrigins: checkedExecution.authorizedOrigins,
          prohibitedEffects: PROHIBITED_EFFECTS,
          signal: checkedExecution.signal
        }));
      } catch (error) {
        fail("BROWSER_HOST_RUNTIME_FAILURE", "Browser runtime apply failed.", error);
      }
      const result = safeRuntimeResult(rawResult, new Set(["effects"]), "Browser runtime apply result");
      normalizeEffects(result.effects);
      const observation = await refreshPage(page, {
        forceRevision: true,
        signal: checkedExecution.signal
      });
      if (observation.target.origin !== plan.target.origin) {
        fail("BROWSER_HOST_ORIGIN_DENIED", "Browser apply changed the page origin.");
      }
      return frozenPlain({ operationId, target: observation.target, effects: FALSE_EFFECTS });
    });
  }

  async function submit(request, execution) {
    requireOpen();
    const input = ownRecord(
      request,
      new Set(["plan", "operationId"]),
      "Browser submit input"
    );
    const operationId = identifier(input.operationId, "Browser submit operationId");
    const suppliedTarget = input.plan && typeof input.plan === "object"
      ? Object.getOwnPropertyDescriptor(input.plan, "target")?.value
      : null;
    const rawTarget = normalizeTarget(suppliedTarget, "Browser submit plan.target");
    const suppliedOperations = input.plan && typeof input.plan === "object"
      ? Object.getOwnPropertyDescriptor(input.plan, "operations")?.value
      : null;
    const roughOperation = Array.isArray(suppliedOperations)
      ? Object.getOwnPropertyDescriptor(suppliedOperations, "0")?.value
      : null;
    const roughExpected = roughOperation && typeof roughOperation === "object"
      ? Object.getOwnPropertyDescriptor(roughOperation, "expectedOrigin")?.value
      : null;
    const roughExpectedOrigin = exactOrigin(roughExpected, "Browser submit expectedOrigin");
    const checkedExecution = normalizeExecution(
      execution,
      "submit",
      [...new Set([rawTarget.origin, roughExpectedOrigin])]
    );
    sessionFor(rawTarget.sessionId);
    const fingerprint = operationFingerprint("submit", operationId, input.plan);
    const cached = existingOperation(operationId, fingerprint);
    if (cached) return cached;
    const page = await currentPage(rawTarget, checkedExecution.signal);
    const plan = normalizePlan(input.plan, page, "submit");
    const operation = plan.operations[0];
    return runDeduplicated(operationId, fingerprint, async (markDispatched) => {
      let runtimeOperation;
      if (operation.kind === "navigate") {
        runtimeOperation = operation;
      } else {
        const element = page.elements.get(operation.elementId);
        if (!element) fail("BROWSER_HOST_TARGET_STALE", "Browser element is stale.");
        runtimeOperation = Object.freeze({
          kind: operation.kind,
          handle: element.handle,
          expectedOrigin: operation.expectedOrigin,
          opensNewPage: operation.opensNewPage
        });
      }
      let rawResult;
      try {
        markDispatched();
        rawResult = await page.submit(runtimeOperation, Object.freeze({
          operationId,
          authorizedOrigins: checkedExecution.authorizedOrigins,
          prohibitedEffects: PROHIBITED_EFFECTS,
          signal: checkedExecution.signal
        }));
      } catch (error) {
        fail("BROWSER_HOST_RUNTIME_FAILURE", "Browser runtime submit failed.", error);
      }
      const result = safeRuntimeResult(
        rawResult,
        new Set(["effects", "page"]),
        "Browser runtime submit result"
      );
      normalizeEffects(result.effects);
      const activePages = await synchronizePages(page.session);
      let destination;
      if (operation.opensNewPage) {
        if (result.page === page.runtimePage || !activePages.some((item) => item.runtimePage === result.page)) {
          fail("BROWSER_HOST_RUNTIME_INVALID", "Browser runtime did not return the declared new page.");
        }
        destination = registerPage(page.session, result.page);
      } else {
        if (result.page !== page.runtimePage) {
          fail("BROWSER_HOST_RUNTIME_INVALID", "Browser runtime changed pages unexpectedly.");
        }
        destination = page;
      }
      const observation = await refreshPage(destination, {
        forceRevision: destination === page,
        signal: checkedExecution.signal
      });
      if (observation.target.origin !== operation.expectedOrigin) {
        fail("BROWSER_HOST_ORIGIN_DENIED", "Browser submit reached an unexpected origin.");
      }
      return frozenPlain({ operationId, target: observation.target, effects: FALSE_EFFECTS });
    });
  }

  function capabilityReport() {
    return frozenPlain({
      schemaVersion: CAPABILITY_SCHEMA_VERSION,
      maqamDriverCompatible: true,
      governance: "external-required",
      execution: "injected-runtime",
      operations: {
        observe: true,
        preview: true,
        apply: ["setValueRef", "selectOption", "setChecked"],
        submit: ["activate", "submitForm", "navigate"]
      },
      guarantees: {
        opaqueElementIds: true,
        monotonicRevisions: true,
        staleTargetRejection: true,
        operationIdDedupe: true,
        valueRefsResolvedAfterApproval: true,
        allFalseEffectAttestationRequired: true
      },
      playwright: {
        bundled: false,
        pinnedInteractiveNetworking: false
      },
      limitations: [
        "No browser engine or profile is bundled.",
        "A trusted injected runtime must enforce DNS pinning, redirects, origin scope, and effect blocking.",
        "A production Playwright runtime with pinned interactive networking is not yet provided."
      ]
    });
  }

  return {
    observe,
    preview,
    apply,
    submit,
    openSession,
    listPages,
    closePage,
    closeSession,
    close,
    capabilityReport
  };
}

export {
  BrowserHostError,
  CAPABILITY_SCHEMA_VERSION,
  FALSE_EFFECTS,
  HOST_SCHEMA_VERSION,
  PROHIBITED_EFFECTS,
  createBrowserHost
};
