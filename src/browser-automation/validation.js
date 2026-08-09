import {
  BROWSER_AUTOMATION_ACTIONS,
  BROWSER_AUTOMATION_EFFECTS,
  browserAutomationEffectForAction
} from "./catalog.js";
import { browserAutomationFail } from "./errors.js";

const ACTION_SET = new Set(BROWSER_AUTOMATION_ACTIONS);
const EFFECT_SET = new Set(BROWSER_AUTOMATION_EFFECTS);
const IDENTIFIER = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const ARTIFACT_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

function fail(message, code = "BROWSER_AUTOMATION_INPUT_INVALID") {
  browserAutomationFail(code, message);
}

function ownDataEntries(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be a plain object.`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(`${label} must be a plain object.`);
  if (Object.getOwnPropertySymbols(value).length > 0) fail(`${label} must not contain symbol keys.`);
  const entries = [];
  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) fail(`${label}.${key} must be an enumerable data property.`);
    entries.push([key, descriptor.value]);
  }
  return entries;
}

export function exactRecord(value, allowed, required, label) {
  const entries = ownDataEntries(value, label);
  const result = Object.create(null);
  for (const [key, entry] of entries) {
    if (!allowed.has(key)) fail(`${label} contains unknown field '${key}'.`);
    result[key] = entry;
  }
  for (const key of required) {
    if (!Object.hasOwn(result, key)) fail(`${label}.${key} is required.`);
  }
  return result;
}

function ownArray(value, label, maximum) {
  if (!Array.isArray(value) || value.length > maximum) fail(`${label} must be an array with at most ${maximum} entries.`);
  const symbols = Object.getOwnPropertySymbols(value);
  if (symbols.length > 0) fail(`${label} must not contain symbol properties.`);
  const result = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) fail(`${label} must not be sparse or accessor-backed.`);
    result.push(descriptor.value);
  }
  for (const key of Object.keys(value)) {
    if (key !== "length" && !/^(0|[1-9]\d*)$/.test(key)) fail(`${label} contains an unexpected property.`);
  }
  return result;
}

function boundedString(value, label, maximum, { empty = false } = {}) {
  if (typeof value !== "string" || value.length > maximum || value.includes("\u0000") || (!empty && value.length === 0)) {
    fail(`${label} must be a bounded primitive string.`);
  }
  return value;
}

function identifier(value, label) {
  const result = boundedString(value, label, 128);
  if (!IDENTIFIER.test(result)) fail(`${label} must be an identifier.`);
  return result;
}

function integer(value, label, minimum, maximum) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) fail(`${label} must be an integer from ${minimum} through ${maximum}.`);
  return value;
}

function finite(value, label, minimum, maximum) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) fail(`${label} must be a finite number from ${minimum} through ${maximum}.`);
  return value;
}

function boolean(value, label) {
  if (typeof value !== "boolean") fail(`${label} must be boolean.`);
  return value;
}

function oneOf(value, label, values) {
  if (!values.includes(value)) fail(`${label} must be one of: ${values.join(", ")}.`);
  return value;
}

export function exactOrigin(value, label = "origin") {
  const raw = boundedString(value, label, 2048);
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    fail(`${label} must be an absolute HTTP(S) origin.`);
  }
  if (!parsed || !["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password
    || parsed.pathname !== "/" || parsed.search || parsed.hash || raw !== parsed.origin) {
    fail(`${label} must be an exact credential-free HTTP(S) origin.`);
  }
  return parsed.origin;
}

function absoluteSessionUrl(value, label, origins, expectedOrigin) {
  const raw = boundedString(value, label, 8192);
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    fail(`${label} must be an absolute HTTP(S) URL.`);
  }
  if (!parsed || !["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
    fail(`${label} must be a credential-free HTTP(S) URL.`);
  }
  if (!origins.includes(parsed.origin)) fail(`${label} is outside the session origin allowlist.`, "BROWSER_AUTOMATION_ORIGIN_DENIED");
  if (expectedOrigin && parsed.origin !== expectedOrigin) fail(`${label} does not match action.origin.`, "BROWSER_AUTOMATION_ORIGIN_DENIED");
  return parsed.toString();
}

function stringArray(value, label, maximum = 32, itemMaximum = 512) {
  const entries = ownArray(value, label, maximum).map((entry, index) => boundedString(entry, `${label}[${index}]`, itemMaximum));
  if (new Set(entries).size !== entries.length) fail(`${label} must not contain duplicates.`);
  return Object.freeze(entries);
}

export function boundedJson(value, label, limits = {}, state = { depth: 0, counter: { nodes: 0, bytes: 0 } }) {
  const maxDepth = limits.maxDepth ?? 8;
  const maxNodes = limits.maxNodes ?? 512;
  const maxString = limits.maxString ?? 65_536;
  const maxBytes = limits.maxBytes ?? Number.POSITIVE_INFINITY;
  const account = (bytes) => {
    state.counter.bytes += bytes;
    if (state.counter.bytes > maxBytes) fail(`${label} exceeds the structured-data byte boundary.`);
  };
  state.counter.nodes += 1;
  if (state.counter.nodes > maxNodes || state.depth > maxDepth) fail(`${label} exceeds the structured-data boundary.`);
  if (value === null) {
    account(4);
    return value;
  }
  if (typeof value === "boolean") {
    account(value ? 4 : 5);
    return value;
  }
  if (typeof value === "string") {
    account(Buffer.byteLength(value) + 2);
    return boundedString(value, label, maxString, { empty: true });
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail(`${label} numbers must be finite.`);
    account(Buffer.byteLength(String(value)));
    return value;
  }
  if (Array.isArray(value)) {
    const entries = ownArray(value, label, 256);
    account(2 + Math.max(0, entries.length - 1));
    return Object.freeze(entries.map((entry, index) => boundedJson(entry, `${label}[${index}]`, limits, { depth: state.depth + 1, counter: state.counter })));
  }
  const entries = ownDataEntries(value, label);
  if (entries.length > 128) fail(`${label} has too many properties.`);
  account(2 + Math.max(0, entries.length - 1));
  const result = Object.create(null);
  for (const [key, entry] of entries) {
    boundedString(key, `${label} key`, 128);
    account(Buffer.byteLength(key) + 3);
    result[key] = boundedJson(entry, `${label}.${key}`, limits, { depth: state.depth + 1, counter: state.counter });
  }
  return Object.freeze(result);
}

const validators = Object.freeze({
  selector: (value, label) => boundedString(value, label, 2048),
  optionalSelector: (value, label) => value === undefined ? undefined : boundedString(value, label, 2048),
  text: (value, label) => boundedString(value, label, 65_536, { empty: true }),
  shortText: (value, label) => boundedString(value, label, 2048, { empty: true }),
  id: identifier,
  boolean,
  timeout: (value, label) => integer(value, label, 0, 120_000),
  duration: (value, label) => integer(value, label, 0, 60_000),
  maxBytes: (value, label) => integer(value, label, 1, 256 * 1024 * 1024),
  maxChars: (value, label) => integer(value, label, 1, 4_000_000),
  limit: (value, label) => integer(value, label, 1, 10_000),
  count: (value, label) => integer(value, label, 1, 10),
  coordinate: (value, label) => finite(value, label, -1_000_000, 1_000_000),
  latitude: (value, label) => finite(value, label, -90, 90),
  longitude: (value, label) => finite(value, label, -180, 180),
  accuracy: (value, label) => finite(value, label, 0, 100_000),
  ratio: (value, label) => finite(value, label, 0.1, 10),
  key: (value, label) => boundedString(value, label, 128),
  artifact: (value, label) => {
    const result = boundedString(value, label, 128);
    if (!ARTIFACT_NAME.test(result) || result.includes("..")) fail(`${label} must be a safe artifact name, not a path.`);
    return result;
  },
  stringArray: (value, label) => stringArray(value, label),
  fileRefs: (value, label) => {
    const refs = stringArray(value, label, 32, 256);
    if (refs.length === 0) fail(`${label} must contain at least one trusted file reference.`);
    if (refs.some((ref) => !/^file:[a-zA-Z0-9][a-zA-Z0-9._:-]{0,249}$/.test(ref))) {
      fail(`${label} accepts opaque 'file:' references only, never filesystem paths.`);
    }
    return refs;
  },
  json: (value, label) => boundedJson(value, label),
  waitUntil: (value, label) => oneOf(value, label, ["commit", "domcontentloaded", "load", "networkidle"]),
  selectorState: (value, label) => oneOf(value, label, ["attached", "detached", "visible", "hidden"]),
  button: (value, label) => oneOf(value, label, ["left", "middle", "right"]),
  area: (value, label) => oneOf(value, label, ["local", "session"]),
  format: (value, label) => oneOf(value, label, ["png", "jpeg"]),
  headers: (value, label) => {
    const record = exactRecord(value, new Set(Object.keys(value ?? {})), new Set(), label);
    if (Object.keys(record).length > 64) fail(`${label} accepts at most 64 headers.`);
    const result = Object.create(null);
    for (const [key, entry] of Object.entries(record)) {
      if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,128}$/.test(key)) fail(`${label} contains an invalid header name.`);
      const folded = key.toLowerCase();
      if (Object.hasOwn(result, folded)) fail(`${label} contains duplicate case-folded header names.`);
      result[folded] = boundedString(entry, `${label}.${key}`, 8192, { empty: true });
    }
    return Object.freeze(result);
  },
  stringRecord: (value, label) => {
    const record = exactRecord(value, new Set(Object.keys(value ?? {})), new Set(), label);
    if (Object.keys(record).length > 128) fail(`${label} has too many entries.`);
    return Object.freeze(Object.fromEntries(Object.entries(record).map(([key, entry]) => [
      boundedString(key, `${label} key`, 256),
      boundedString(entry, `${label}.${key}`, 65_536, { empty: true })
    ])));
  },
  cookies: (value, label) => Object.freeze(ownArray(value, label, 128).map((entry, index) => {
    const itemLabel = `${label}[${index}]`;
    const raw = exactRecord(entry,
      new Set(["name", "value", "url", "path", "expires", "httpOnly", "secure", "sameSite"]),
      new Set(["name", "value", "url"]), itemLabel);
    return Object.freeze({
      name: boundedString(raw.name, `${itemLabel}.name`, 256),
      value: boundedString(raw.value, `${itemLabel}.value`, 16_384, { empty: true }),
      url: boundedString(raw.url, `${itemLabel}.url`, 8_192),
      ...(raw.path === undefined ? {} : { path: boundedString(raw.path, `${itemLabel}.path`, 2_048) }),
      ...(raw.expires === undefined ? {} : { expires: finite(raw.expires, `${itemLabel}.expires`, -1, 10_000_000_000) }),
      ...(raw.httpOnly === undefined ? {} : { httpOnly: boolean(raw.httpOnly, `${itemLabel}.httpOnly`) }),
      ...(raw.secure === undefined ? {} : { secure: boolean(raw.secure, `${itemLabel}.secure`) }),
      ...(raw.sameSite === undefined ? {} : { sameSite: oneOf(raw.sameSite, `${itemLabel}.sameSite`, ["Strict", "Lax", "None"]) })
    });
  }))
});

const rules = new Map();
function add(kinds, required = {}, optional = {}) {
  for (const kind of kinds) {
    if (rules.has(kind)) throw new Error(`Duplicate browser automation action rule: ${kind}`);
    rules.set(kind, Object.freeze({ required: Object.freeze({ ...required }), optional: Object.freeze({ ...optional }) }));
  }
}

add(["browser.connect"], { endpointRef: "id" });
add(["browser.disconnect", "context.close", "session.inspect", "page.list", "history.inspect",
  "frame.list", "worker.list", "network.inspect", "network.routes.list", "cookies.read",
  "state.list", "metrics.read", "console.read", "selector.list", "page.title", "page.url"]);
add(["context.create"], {}, { settings: "json" });
add(["tab.open"]);
add(["tab.close", "tab.switch", "tab.lock", "tab.unlock", "tab.lock.status"], { tabId: "id" });
add(["popup.wait"], {}, { timeoutMs: "timeout" });
add(["frame.select"], { frameId: "id" });
add(["navigate"], { url: "url" }, { waitUntil: "waitUntil", timeoutMs: "timeout" });
add(["back", "forward", "reload"], {}, { waitUntil: "waitUntil", timeoutMs: "timeout" });
add(["wait"], { durationMs: "duration" });
add(["wait.selector"], { selector: "selector" }, { state: "selectorState", timeoutMs: "timeout" });
add(["wait.url"], { url: "url" }, { timeoutMs: "timeout" });
add(["locator.inspect"], { selector: "selector" }, { limit: "limit" });
add(["click"], { selector: "selector" }, { button: "button", count: "count" });
add(["doubleClick"], { selector: "selector" }, { button: "button" });
add(["fill"], { selector: "selector", text: "text" });
add(["type"], { selector: "selector", text: "text" }, { delayMs: "duration" });
add(["hover", "focus", "check", "uncheck", "form.submit"], { selector: "selector" });
add(["select"], { selector: "selector", values: "stringArray" });
add(["press"], { key: "key" }, { selector: "optionalSelector" });
add(["keyboard.down", "keyboard.up"], { key: "key" });
add(["keyboard.insertText"], { text: "text" });
add(["scroll"], {}, { selector: "optionalSelector", deltaX: "coordinate", deltaY: "coordinate" });
add(["drag"], { fromSelector: "selector", toSelector: "selector" });
add(["touch.tap"], { x: "coordinate", y: "coordinate" });
add(["mouse.move"], { x: "coordinate", y: "coordinate" }, { steps: "limit" });
add(["mouse.down", "mouse.up"], {}, { button: "button" });
add(["mouse.click"], { x: "coordinate", y: "coordinate" }, { button: "button", count: "count" });
add(["upload"], { selector: "selector", fileRefs: "fileRefs", maxFileBytes: "maxBytes", maxBytes: "maxBytes" }, { timeoutMs: "timeout" });
add(["download"], { selector: "selector", artifactName: "artifact", maxBytes: "maxBytes" }, { timeoutMs: "timeout" });
add(["dialog.wait"], {}, { timeoutMs: "timeout" });
add(["dialog.accept"], {}, { promptText: "shortText" });
add(["dialog.dismiss"]);
add(["capture.paired"], { artifactName: "artifact", maxBytes: "maxBytes" });
add(["screenshot"], { artifactName: "artifact", maxBytes: "maxBytes" }, { selector: "optionalSelector", fullPage: "boolean", format: "format", quality: "limit" });
add(["pdf"], { artifactName: "artifact", maxBytes: "maxBytes" }, { format: "shortText", landscape: "boolean" });
add(["evaluate"], { expressionRef: "id" }, { args: "json" });
add(["script.add"], { scriptRef: "id" });
add(["style.add"], { styleRef: "id" });
add(["worker.evaluate"], { workerId: "id", expressionRef: "id" }, { args: "json" });
add(["network.export", "trace.stop", "recording.stop", "coverage.stop", "heap.snapshot"], { artifactName: "artifact", maxBytes: "maxBytes" });
add(["network.requests", "network.responses"], {}, { limit: "limit" });
add(["network.route.add"], { route: "route" });
add(["network.route.remove"], { routeId: "id" });
add(["network.offline", "network.cache"], { enabled: "boolean" });
add(["network.headers"], { headers: "headers" });
add(["clipboard.read"]);
add(["clipboard.write"], { text: "text" });
add(["cookies.write"], { cookies: "cookies" });
add(["storage.read"], { area: "area" }, { key: "key" });
add(["storage.write"], { area: "area", entries: "stringRecord" });
add(["storage.clear"], { area: "area" });
add(["state.save", "state.load", "state.delete"], { stateRef: "id" });
add(["permissions.set"], { permissions: "stringArray" });
add(["geolocation.set"], { latitude: "latitude", longitude: "longitude" }, { accuracy: "accuracy" });
add(["emulation.set"], { settings: "json" });
add(["snapshot", "accessibility.snapshot"], {}, { maxChars: "maxChars" });
add(["extract"], { selector: "selector" }, { maxChars: "maxChars" });
add(["annotate.show"], {}, { selector: "optionalSelector" });
add(["annotate.clear"]);
add(["trace.start"], {}, { categories: "stringArray" });
add(["recording.start"], { artifactName: "artifact", maxBytes: "maxBytes" }, { settings: "json" });
add(["coverage.start"], {}, { resetOnNavigation: "boolean" });
add(["selector.register"], { name: "id", scriptRef: "id" });
add(["selector.unregister"], { name: "id" });
add(["page.content"], {}, { maxChars: "maxChars" });

function normalizeRoute(value, label, origins, actionOrigin) {
  const raw = exactRecord(value,
    new Set(["id", "origin", "pathPattern", "methods", "resourceTypes", "response"]),
    new Set(["id", "origin", "pathPattern", "response"]), label);
  const origin = exactOrigin(raw.origin, `${label}.origin`);
  if (!origins.includes(origin) || origin !== actionOrigin) fail(`${label}.origin is outside this action authority.`, "BROWSER_AUTOMATION_ORIGIN_DENIED");
  const response = exactRecord(raw.response, new Set(["mode", "status", "headers", "bodyRef", "maxBodyBytes"]), new Set(["mode"]), `${label}.response`);
  const mode = oneOf(response.mode, `${label}.response.mode`, ["abort", "fulfill"]);
  if (mode === "abort" && Object.keys(response).length !== 1) fail(`${label}.response abort mode accepts no response body fields.`);
  const normalizedResponse = Object.create(null);
  normalizedResponse.mode = mode;
  if (mode === "fulfill") {
    if (response.maxBodyBytes === undefined) fail(`${label}.response.maxBodyBytes is required for fulfill mode.`);
    normalizedResponse.status = response.status === undefined ? 200 : integer(response.status, `${label}.response.status`, 100, 599);
    normalizedResponse.maxBodyBytes = integer(response.maxBodyBytes, `${label}.response.maxBodyBytes`, 1, 16 * 1024 * 1024);
    if (response.headers !== undefined) normalizedResponse.headers = validators.headers(response.headers, `${label}.response.headers`);
    if (response.bodyRef !== undefined) normalizedResponse.bodyRef = identifier(response.bodyRef, `${label}.response.bodyRef`);
  }
  return Object.freeze({
    id: identifier(raw.id, `${label}.id`),
    origin,
    pathPattern: boundedString(raw.pathPattern, `${label}.pathPattern`, 2048),
    ...(raw.methods === undefined ? {} : { methods: stringArray(raw.methods, `${label}.methods`, 16, 16) }),
    ...(raw.resourceTypes === undefined ? {} : { resourceTypes: stringArray(raw.resourceTypes, `${label}.resourceTypes`, 32, 64) }),
    response: Object.freeze(normalizedResponse)
  });
}

export const BROWSER_AUTOMATION_ACTION_RULES = rules;

export function normalizeAction(value, origins) {
  const preflight = exactRecord(value, new Set(["kind", "origin", ...Object.keys(value ?? {})]), new Set(["kind", "origin"]), "Browser action");
  const kind = boundedString(preflight.kind, "Browser action.kind", 128);
  if (!ACTION_SET.has(kind)) fail(`Browser action kind '${kind}' is unsupported.`, "BROWSER_AUTOMATION_ACTION_UNSUPPORTED");
  const rule = rules.get(kind);
  if (!rule) fail(`Browser action kind '${kind}' has no validation rule.`, "BROWSER_AUTOMATION_ACTION_UNSUPPORTED");
  const allowed = new Set(["kind", "origin", ...Object.keys(rule.required), ...Object.keys(rule.optional)]);
  const raw = exactRecord(value, allowed, new Set(["kind", "origin", ...Object.keys(rule.required)]), "Browser action");
  const origin = exactOrigin(raw.origin, "Browser action.origin");
  if (!origins.includes(origin)) fail("Browser action.origin is outside the session allowlist.", "BROWSER_AUTOMATION_ORIGIN_DENIED");
  const normalized = Object.create(null);
  normalized.kind = kind;
  normalized.origin = origin;
  for (const [field, validatorName] of Object.entries({ ...rule.required, ...rule.optional })) {
    if (!Object.hasOwn(raw, field)) continue;
    if (validatorName === "url") normalized[field] = absoluteSessionUrl(raw[field], `Browser action.${field}`, origins, origin);
    else if (validatorName === "route") normalized[field] = normalizeRoute(raw[field], `Browser action.${field}`, origins, origin);
    else normalized[field] = validators[validatorName](raw[field], `Browser action.${field}`);
  }
  if (kind === "screenshot" && normalized.quality !== undefined) {
    if (normalized.format !== "jpeg" || normalized.quality > 100) {
      fail("Browser screenshot quality is 1-100 and requires format='jpeg'.");
    }
  }
  if (kind === "upload" && normalized.maxFileBytes > normalized.maxBytes) {
    fail("Browser upload maxFileBytes cannot exceed maxBytes.");
  }
  if (kind === "cookies.write") {
    normalized.cookies = Object.freeze(normalized.cookies.map((cookie, index) => Object.freeze({
      ...cookie,
      url: absoluteSessionUrl(cookie.url, `Browser action.cookies[${index}].url`, origins, origin)
    })));
  }
  return Object.freeze(normalized);
}

export function normalizeOrigins(value, label = "allowedOrigins") {
  const origins = ownArray(value, label, 32).map((entry, index) => exactOrigin(entry, `${label}[${index}]`));
  if (origins.length === 0 || new Set(origins).size !== origins.length) fail(`${label} must be a unique non-empty array.`);
  return Object.freeze(origins);
}

export function normalizeActionList(value, label, maximum = BROWSER_AUTOMATION_ACTIONS.length) {
  const actions = stringArray(value, label, maximum, 128);
  if (actions.length === 0 || actions.some((action) => !ACTION_SET.has(action))) fail(`${label} contains an unsupported action.`);
  return actions;
}

export function normalizeEffectList(value, label) {
  const effects = stringArray(value, label, BROWSER_AUTOMATION_EFFECTS.length, 32);
  if (effects.length === 0 || effects.some((effect) => !EFFECT_SET.has(effect))) fail(`${label} contains an unsupported effect.`);
  return effects;
}

export function normalizeAuthority(value, { requireAuthorityId = false } = {}) {
  const allowed = new Set([
    "authorityId", "principalId", "allowedOrigins", "allowedActions", "allowedEffects", "maxActions",
    "maxActionMs", "maxSessionMs", "maxArtifactBytes", "maxUploadBytes", "maxTotalArtifactBytes",
    "maxTotalUploadBytes"
  ]);
  const required = new Set([
    "principalId", "allowedOrigins", "allowedActions", "allowedEffects", "maxActions",
    "maxActionMs", "maxSessionMs", "maxArtifactBytes", "maxUploadBytes", "maxTotalArtifactBytes",
    "maxTotalUploadBytes"
  ]);
  if (requireAuthorityId) required.add("authorityId");
  const raw = exactRecord(value, allowed, required, "Browser authority");
  return Object.freeze({
    ...(raw.authorityId === undefined ? {} : { authorityId: identifier(raw.authorityId, "Browser authority.authorityId") }),
    principalId: identifier(raw.principalId, "Browser authority.principalId"),
    allowedOrigins: normalizeOrigins(raw.allowedOrigins, "Browser authority.allowedOrigins"),
    allowedActions: normalizeActionList(raw.allowedActions, "Browser authority.allowedActions"),
    allowedEffects: normalizeEffectList(raw.allowedEffects, "Browser authority.allowedEffects"),
    maxActions: integer(raw.maxActions, "Browser authority.maxActions", 1, 100_000),
    maxActionMs: integer(raw.maxActionMs, "Browser authority.maxActionMs", 100, 120_000),
    maxSessionMs: integer(raw.maxSessionMs, "Browser authority.maxSessionMs", 1_000, 86_400_000),
    maxArtifactBytes: integer(raw.maxArtifactBytes, "Browser authority.maxArtifactBytes", 1, 256 * 1024 * 1024),
    maxUploadBytes: integer(raw.maxUploadBytes, "Browser authority.maxUploadBytes", 1, 256 * 1024 * 1024),
    maxTotalArtifactBytes: integer(raw.maxTotalArtifactBytes, "Browser authority.maxTotalArtifactBytes", 1, 1024 * 1024 * 1024),
    maxTotalUploadBytes: integer(raw.maxTotalUploadBytes, "Browser authority.maxTotalUploadBytes", 1, 1024 * 1024 * 1024)
  });
}

export function assertActionAuthority(action, authority) {
  const effect = browserAutomationEffectForAction(action.kind);
  if (!authority.allowedActions.includes(action.kind)) fail(`Authority does not allow action '${action.kind}'.`, "BROWSER_AUTOMATION_ACTION_DENIED");
  if (!authority.allowedEffects.includes(effect)) fail(`Authority does not allow effect '${effect}'.`, "BROWSER_AUTOMATION_EFFECT_DENIED");
  if (!authority.allowedOrigins.includes(action.origin)) fail("Authority does not allow action.origin.", "BROWSER_AUTOMATION_ORIGIN_DENIED");
  return effect;
}

export function sameStringSet(left, right) {
  return left.length === right.length && left.every((entry) => right.includes(entry));
}

export function normalizePositiveInteger(value, label, maximum) {
  return integer(value, label, 1, maximum);
}

export function normalizeIdentifier(value, label) {
  return identifier(value, label);
}

export function normalizePurpose(value) {
  return boundedString(value, "Browser session purpose", 512);
}

export function normalizeInitialUrl(value, origins) {
  return value === undefined ? undefined : absoluteSessionUrl(value, "Browser initialUrl", origins);
}
