const SCHEMA_VERSION = "cockroach.browser-automation-adapter.v1";

const ACTION_KINDS = Object.freeze([
  "navigate", "back", "forward", "reload", "click", "doubleClick", "fill", "type",
  "press", "hover", "focus", "check", "uncheck", "select", "scroll", "drag",
  "mouse.move", "mouse.down", "mouse.up", "mouse.click", "keyboard.down", "keyboard.up",
  "keyboard.insertText", "upload", "download", "evaluate", "wait", "history.inspect",
  "capture.paired", "annotate.show", "annotate.clear", "clipboard.read", "clipboard.write",
  "network.inspect", "network.export", "network.route.add", "network.route.remove",
  "network.routes.list", "state.save", "state.load", "state.list", "state.delete",
  "screenshot", "pdf", "snapshot", "extract", "cookies.read", "cookies.write",
  "storage.read", "storage.write", "tab.open", "tab.close", "tab.switch", "tab.lock",
  "tab.unlock", "tab.lock.status", "trace.start", "trace.stop"
]);

const SAFE_ACTIONS = Object.freeze([
  "navigate", "back", "forward", "reload", "hover", "focus", "scroll", "wait",
  "history.inspect", "capture.paired", "network.inspect", "network.export",
  "network.routes.list", "screenshot", "pdf", "snapshot", "extract", "tab.open",
  "tab.close", "tab.switch", "tab.lock.status"
]);

const EFFECTS = Object.freeze(["read", "write", "execute", "upload", "download", "credential"]);
const ACTION_EFFECTS = Object.freeze(Object.fromEntries(ACTION_KINDS.map((kind) => [kind,
  kind === "upload" ? "upload"
    : kind === "download" ? "download"
      : ["cookies.read", "clipboard.read", "state.load"].includes(kind) ? "credential"
        : [
            "fill", "type", "press", "click", "doubleClick", "check", "uncheck", "select",
            "drag", "mouse.move", "mouse.down", "mouse.up", "mouse.click", "keyboard.down",
            "keyboard.up", "keyboard.insertText", "evaluate", "network.route.add",
            "network.route.remove"
          ].includes(kind) ? "execute"
          : [
              "annotate.show", "annotate.clear", "clipboard.write", "cookies.write",
              "storage.write", "state.save", "state.delete", "tab.lock", "tab.unlock"
            ].includes(kind) ? "write"
            : "read"
])));

const ACTION_FIELDS = new Set([
  "kind", "tabId", "ref", "selector", "xpath", "frame", "dialog", "url", "value",
  "valueRef", "dataRef", "values", "key", "text", "expression", "path", "paths",
  "timeoutMs", "fullPage", "format", "quality", "x", "y", "deltaX", "deltaY",
  "button", "clickCount", "steps", "targetRef", "route", "routeId", "lockOwner",
  "lockTokenRef", "lockTtlMs", "stateName", "passphraseRef", "outputFormat",
  "requireStable", "includeBounds", "method", "status", "resourceType", "limit",
  "waitUntil", "approvalId"
]);
const OPEN_FIELDS = new Set([
  "purpose", "actor", "allowedOrigins", "startUrl", "mode", "locale", "timezoneId",
  "colorScheme", "viewport", "recordHar", "recordVideo"
]);
const POLICY_FIELDS = new Set([
  "deniedOrigins", "allowedProfiles", "allowJavaScript", "allowCookieRead",
  "allowCookieWrite", "allowDownloads", "allowUploads", "allowClipboard",
  "allowStateExport", "allowAnnotations", "allowDialogAccept",
  "allowNetworkInterception", "allowPrivateNetwork", "allowRemote", "requireApprovalFor",
  "budget"
]);
const RESERVED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export class BrowserAutomationAdapterError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "BrowserAutomationAdapterError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new BrowserAutomationAdapterError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function ownRecord(value, allowed, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("BROWSER_AUTOMATION_INPUT_INVALID", `${label} must be a plain object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail("BROWSER_AUTOMATION_INPUT_INVALID", `${label} must be a plain object.`);
  }
  const result = Object.create(null);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) {
    const descriptor = descriptors[key];
    if (typeof key !== "string" || !allowed.has(key) || RESERVED_KEYS.has(key) || !descriptor.enumerable
      || !Object.hasOwn(descriptor, "value")) {
      fail("BROWSER_AUTOMATION_INPUT_INVALID", `${label} contains an unsupported property.`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function boundedString(value, label, maximum, { optional = false } = {}) {
  if (optional && value === undefined) return undefined;
  if (typeof value !== "string" || value.length === 0 || value.length > maximum
    || value.trim() !== value || value.includes("\u0000")) {
    fail("BROWSER_AUTOMATION_INPUT_INVALID", `${label} must be a bounded non-empty string.`);
  }
  return value;
}

function exactOrigin(value, label) {
  boundedString(value, label, 8_192);
  let parsed;
  try {
    parsed = new URL(value);
  } catch (error) {
    fail("BROWSER_AUTOMATION_ORIGIN_INVALID", `${label} must be an exact HTTP(S) origin.`, error);
  }
  if (!parsed || !["http:", "https:"].includes(parsed.protocol) || parsed.username
    || parsed.password || parsed.origin !== value) {
    fail("BROWSER_AUTOMATION_ORIGIN_INVALID", `${label} must be an exact credential-free HTTP(S) origin.`);
  }
  return parsed.origin;
}

function absoluteUrl(value, label, origins) {
  boundedString(value, label, 8_192);
  let parsed;
  try {
    parsed = new URL(value);
  } catch (error) {
    fail("BROWSER_AUTOMATION_URL_INVALID", `${label} must be an absolute HTTP(S) URL.`, error);
  }
  if (!parsed || !["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
    fail("BROWSER_AUTOMATION_URL_INVALID", `${label} must be a credential-free HTTP(S) URL.`);
  }
  if (origins && !origins.includes(parsed.origin)) {
    fail("BROWSER_AUTOMATION_ORIGIN_DENIED", `${label} is outside the session origin allowlist.`);
  }
  return parsed.toString();
}

function stringList(value, label, allowed, maximum = 128) {
  if (!Array.isArray(value) || value.length > maximum) {
    fail("BROWSER_AUTOMATION_INPUT_INVALID", `${label} must be a bounded array.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const result = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[index];
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      fail("BROWSER_AUTOMATION_INPUT_INVALID", `${label} must not be sparse or accessor-backed.`);
    }
    const item = boundedString(descriptor.value, `${label}[${index}]`, 128);
    if (allowed && !allowed.has(item)) {
      fail("BROWSER_AUTOMATION_ACTION_UNKNOWN", `${label}[${index}] is not a recognized action.`);
    }
    if (!result.includes(item)) result.push(item);
  }
  return Object.freeze(result);
}

function finiteInteger(value, label, minimum, maximum) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    fail("BROWSER_AUTOMATION_INPUT_INVALID", `${label} must be an integer from ${minimum} to ${maximum}.`);
  }
  return value;
}

function cloneData(value, label, state = { nodes: 0, characters: 0 }, depth = 0) {
  state.nodes += 1;
  if (state.nodes > 2_000 || depth > 12) {
    fail("BROWSER_AUTOMATION_INPUT_INVALID", `${label} exceeds the structural input ceiling.`);
  }
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("BROWSER_AUTOMATION_INPUT_INVALID", `${label} contains a non-finite number.`);
    return value;
  }
  if (typeof value === "string") {
    state.characters += value.length;
    if (state.characters > 131_072 || value.includes("\u0000")) {
      fail("BROWSER_AUTOMATION_INPUT_INVALID", `${label} exceeds the text input ceiling.`);
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 256) fail("BROWSER_AUTOMATION_INPUT_INVALID", `${label} exceeds the array ceiling.`);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    return Array.from({ length: value.length }, (_, index) => {
      const descriptor = descriptors[index];
      if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
        fail("BROWSER_AUTOMATION_INPUT_INVALID", `${label} must not be sparse or accessor-backed.`);
      }
      return cloneData(descriptor.value, `${label}[${index}]`, state, depth + 1);
    });
  }
  if (!value || typeof value !== "object") {
    fail("BROWSER_AUTOMATION_INPUT_INVALID", `${label} must contain JSON-compatible data.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail("BROWSER_AUTOMATION_INPUT_INVALID", `${label} must contain plain data objects.`);
  }
  const result = Object.create(null);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length > 128) {
    fail("BROWSER_AUTOMATION_INPUT_INVALID", `${label} exceeds the object-key ceiling.`);
  }
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== "string" || RESERVED_KEYS.has(key)) {
      fail("BROWSER_AUTOMATION_INPUT_INVALID", `${label} contains a reserved property.`);
    }
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      fail("BROWSER_AUTOMATION_INPUT_INVALID", `${label}.${key} must be an enumerable data property.`);
    }
    result[key] = cloneData(descriptor.value, `${label}.${key}`, state, depth + 1);
  }
  return result;
}

function normalizeBackend(backend) {
  if (!backend || (typeof backend !== "object" && typeof backend !== "function")) {
    fail("BROWSER_AUTOMATION_BACKEND_INVALID", "backend must be a trusted browser runtime object.");
  }
  const required = ["createSession", "act", "closeSession"];
  const methods = Object.create(null);
  for (const name of required) {
    if (typeof backend[name] !== "function") {
      fail("BROWSER_AUTOMATION_BACKEND_INVALID", `backend.${name} must be a function.`);
    }
    methods[name] = backend[name].bind(backend);
  }
  return Object.freeze(methods);
}

function normalizeCreatorPolicy(value = {}) {
  const input = ownRecord(value, POLICY_FIELDS, "policy");
  return cloneData(input, "policy");
}

function normalizeOpenInput(value) {
  const input = ownRecord(value, OPEN_FIELDS, "session");
  const purpose = boundedString(input.purpose, "session.purpose", 1_024);
  if (!Array.isArray(input.allowedOrigins) || input.allowedOrigins.length < 1
    || input.allowedOrigins.length > 32) {
    fail("BROWSER_AUTOMATION_ORIGIN_INVALID", "session.allowedOrigins must contain 1 to 32 exact origins.");
  }
  const origins = Object.freeze([...new Set(input.allowedOrigins.map((origin, index) =>
    exactOrigin(origin, `session.allowedOrigins[${index}]`)
  ))]);
  const result = {
    purpose,
    allowedOrigins: origins,
    mode: input.mode ?? "headless"
  };
  if (!["headless", "headed"].includes(result.mode)) {
    fail("BROWSER_AUTOMATION_INPUT_INVALID", "session.mode must be headless or headed.");
  }
  if (input.startUrl !== undefined) result.startUrl = absoluteUrl(input.startUrl, "session.startUrl", origins);
  if (input.actor !== undefined) result.actor = boundedString(input.actor, "session.actor", 256);
  if (input.locale !== undefined) result.locale = boundedString(input.locale, "session.locale", 64);
  if (input.timezoneId !== undefined) result.timezoneId = boundedString(input.timezoneId, "session.timezoneId", 128);
  if (input.colorScheme !== undefined) {
    if (!["light", "dark", "no-preference"].includes(input.colorScheme)) {
      fail("BROWSER_AUTOMATION_INPUT_INVALID", "session.colorScheme is invalid.");
    }
    result.colorScheme = input.colorScheme;
  }
  if (input.viewport !== undefined) {
    const viewport = ownRecord(input.viewport, new Set(["width", "height"]), "session.viewport");
    result.viewport = {
      width: finiteInteger(viewport.width, "session.viewport.width", 1, 10_000),
      height: finiteInteger(viewport.height, "session.viewport.height", 1, 10_000)
    };
  }
  if (input.recordHar !== undefined) result.recordHar = input.recordHar === true;
  if (input.recordVideo !== undefined) result.recordVideo = input.recordVideo === true;
  return Object.freeze(result);
}

function frozenReport(allowedActions, allowedEffects) {
  return Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    status: "adapter",
    puppeteerBaseline: "25.5.0",
    puppeteerApiCompatible: false,
    backendContract: Object.freeze(["createSession", "act", "closeSession"]),
    actions: Object.freeze([...ACTION_KINDS]),
    defaultSafeActions: Object.freeze([...SAFE_ACTIONS]),
    enabledActions: Object.freeze([...allowedActions]),
    enabledEffects: Object.freeze([...allowedEffects]),
    actionEffects: ACTION_EFFECTS,
    matrix: "docs/compatibility/puppeteer-25.5.0-gap-matrix.json"
  });
}

export const BROWSER_AUTOMATION_SCHEMA_VERSION = SCHEMA_VERSION;
export const BROWSER_AUTOMATION_ACTIONS = ACTION_KINDS;
export const BROWSER_AUTOMATION_SAFE_ACTIONS = SAFE_ACTIONS;
export const BROWSER_AUTOMATION_ACTION_EFFECTS = ACTION_EFFECTS;

export function browserAutomationCapabilityReport(options = {}) {
  const input = ownRecord(
    options,
    new Set(["allowedActions", "allowedEffects"]),
    "options"
  );
  const allowed = new Set(ACTION_KINDS);
  const actions = input.allowedActions === undefined
    ? SAFE_ACTIONS
    : stringList(input.allowedActions, "allowedActions", allowed, ACTION_KINDS.length);
  const effects = input.allowedEffects === undefined
    ? Object.freeze(["read"])
    : stringList(
      input.allowedEffects,
      "allowedEffects",
      new Set(EFFECTS),
      EFFECTS.length
    );
  return frozenReport(actions, effects);
}

/**
 * Creates a narrow bridge to an injected Cockroach Browser-compatible backend.
 * It is intentionally not a Puppeteer API shim. Session origin, action, effect,
 * and budget authority remain creator-owned, while the backend remains the
 * enforcement and evidence boundary.
 */
export function createBrowserAutomationAdapter(options) {
  const top = ownRecord(
    options,
    new Set(["backend", "allowedActions", "allowedEffects", "policy"]),
    "options"
  );
  const backend = normalizeBackend(top.backend);
  const actionSet = new Set(ACTION_KINDS);
  const allowedActions = top.allowedActions === undefined
    ? SAFE_ACTIONS
    : stringList(top.allowedActions, "options.allowedActions", actionSet, ACTION_KINDS.length);
  if (allowedActions.length === 0) {
    fail("BROWSER_AUTOMATION_POLICY_INVALID", "options.allowedActions must not be empty.");
  }
  const allowedEffects = top.allowedEffects === undefined
    ? Object.freeze(["read"])
    : stringList(
      top.allowedEffects,
      "options.allowedEffects",
      new Set(EFFECTS),
      EFFECTS.length
    );
  if (allowedEffects.length === 0) {
    fail("BROWSER_AUTOMATION_POLICY_INVALID", "options.allowedEffects must not be empty.");
  }
  const creatorPolicy = normalizeCreatorPolicy(top.policy);
  const enabled = new Set(allowedActions);
  const enabledEffects = new Set(allowedEffects);
  const sessions = new Map();

  function requireSession(sessionId) {
    boundedString(sessionId, "sessionId", 256);
    const state = sessions.get(sessionId);
    if (!state) fail("BROWSER_AUTOMATION_SESSION_UNKNOWN", "The adapter does not own this browser session.");
    return state;
  }

  return Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    capabilityReport() {
      return frozenReport(allowedActions, allowedEffects);
    },
    async open(input) {
      const session = normalizeOpenInput(input);
      const backendInput = cloneData({
        ...session,
        policy: {
          ...creatorPolicy,
          allowedOrigins: [...session.allowedOrigins],
          allowedActions: [...allowedActions],
          allowedEffects: [...allowedEffects]
        }
      }, "backend session");
      const created = await backend.createSession(backendInput);
      const sessionId = boundedString(created?.id, "backend session id", 256);
      if (sessions.has(sessionId)) {
        await backend.closeSession(sessionId).catch(() => undefined);
        fail("BROWSER_AUTOMATION_SESSION_COLLISION", "The backend returned a duplicate session id.");
      }
      sessions.set(sessionId, Object.freeze({
        purpose: session.purpose,
        allowedOrigins: session.allowedOrigins
      }));
      return Object.freeze({ id: sessionId, purpose: session.purpose });
    },
    async execute(sessionId, action) {
      const state = requireSession(sessionId);
      const input = ownRecord(action, ACTION_FIELDS, "action");
      const kind = boundedString(input.kind, "action.kind", 64);
      if (!actionSet.has(kind)) {
        fail("BROWSER_AUTOMATION_ACTION_UNKNOWN", `Unknown browser action: ${kind}.`);
      }
      if (!enabled.has(kind)) {
        fail("BROWSER_AUTOMATION_ACTION_DENIED", `Browser action '${kind}' is outside the adapter allowlist.`);
      }
      const requiredEffect = ACTION_EFFECTS[kind];
      if (!enabledEffects.has(requiredEffect)) {
        fail(
          "BROWSER_AUTOMATION_EFFECT_DENIED",
          `Browser action '${kind}' requires the creator-enabled '${requiredEffect}' effect.`
        );
      }
      if (input.url !== undefined) input.url = absoluteUrl(input.url, "action.url", state.allowedOrigins);
      const normalized = cloneData({ ...input, kind, purpose: state.purpose }, "action");
      return backend.act(sessionId, normalized);
    },
    async closeSession(sessionId) {
      requireSession(sessionId);
      sessions.delete(sessionId);
      await backend.closeSession(sessionId);
    },
    async close() {
      const ids = [...sessions.keys()];
      sessions.clear();
      const outcomes = await Promise.allSettled(ids.map((id) => backend.closeSession(id)));
      const failures = outcomes.filter((outcome) => outcome.status === "rejected");
      if (failures.length) {
        throw new AggregateError(failures.map((failure) => failure.reason), "One or more browser sessions failed to close.");
      }
    }
  });
}
