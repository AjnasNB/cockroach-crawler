import { SourceAccessError } from "./sources.js";

const ROUTER_OPTION_KEYS = new Set(["registry", "routes"]);
const ROUTE_DEFINITION_KEYS = new Set(["operation", "providers"]);
const ROUTE_PROVIDER_KEYS = new Set(["id", "fallbackOn"]);
const ROUTE_OPERATIONS = new Set(["read", "search"]);
const PROVIDER_STATUS_VALUES = new Set(["ready", "partial", "missing_credentials", "unavailable"]);
const NEVER_FALLBACK_CODES = new Set([
  "SOURCE_ABORTED",
  "SOURCE_AUTH_FAILED",
  "SOURCE_INVALID_RESPONSE",
  "SOURCE_RESPONSE_TOO_LARGE",
  "SOURCE_TIMEOUT"
]);
const MAX_ROUTE_ID_LENGTH = 128;
const MAX_PROVIDER_ID_LENGTH = 128;
const MAX_FALLBACK_CODES = 32;

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}

function plainSnapshot(value, label, allowedKeys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  const snapshot = Object.create(null);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) {
    const printable = typeof key === "symbol" ? key.toString() : key;
    if (typeof key !== "string" || !allowedKeys.has(key)) {
      throw new TypeError(`Unknown ${label} option '${printable}'.`);
    }
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`${label} option '${key}' must be an own enumerable data property.`);
    }
    snapshot[key] = descriptor.value;
  }
  return snapshot;
}

function identifier(value, label, maximum) {
  if (
    typeof value !== "string"
    || !value
    || value.length > maximum
    || !/^[a-z0-9][a-z0-9._:-]*$/i.test(value)
  ) {
    throw new TypeError(`${label} must contain only letters, numbers, '.', '_', ':', or '-'.`);
  }
  return value;
}

function snapshotArray(value, label, maximum) {
  if (!Array.isArray(value) || value.length === 0 || value.length > maximum) {
    throw new TypeError(`${label} must contain from 1 to ${maximum} entries.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const result = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`${label} entry ${index} must be an own enumerable data property.`);
    }
    result.push(descriptor.value);
  }
  for (const key of Reflect.ownKeys(descriptors)) {
    if (key === "length") continue;
    if (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length) {
      const printable = typeof key === "symbol" ? key.toString() : key;
      throw new TypeError(`${label} has unsupported property '${printable}'.`);
    }
  }
  return result;
}

function fallbackCodes(value, label) {
  if (value === undefined) return Object.freeze([]);
  const values = snapshotArray(value, label, MAX_FALLBACK_CODES);
  const result = [];
  const seen = new Set();
  for (const item of values) {
    const code = identifier(item, `${label} entry`, 128);
    if (NEVER_FALLBACK_CODES.has(code)) {
      throw new TypeError(`${label} cannot include non-fallbackable code '${code}'.`);
    }
    if (seen.has(code)) throw new TypeError(`${label} contains duplicate code '${code}'.`);
    seen.add(code);
    result.push(code);
  }
  return Object.freeze(result);
}

function snapshotRoutes(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("routes must be a plain object.");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("routes must be a plain object.");
  }
  const routes = new Map();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const rawRouteId of Reflect.ownKeys(descriptors)) {
    if (typeof rawRouteId !== "string") throw new TypeError(`routes has unsupported key '${rawRouteId.toString()}'.`);
    const descriptor = descriptors[rawRouteId];
    const routeId = identifier(rawRouteId, "route id", MAX_ROUTE_ID_LENGTH);
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`route '${routeId}' must be an own enumerable data property.`);
    }
    const definition = plainSnapshot(descriptor.value, `route '${routeId}'`, ROUTE_DEFINITION_KEYS);
    if (!ROUTE_OPERATIONS.has(definition.operation)) {
      throw new TypeError(`route '${routeId}' operation must be 'read' or 'search'.`);
    }
    const providerValues = snapshotArray(definition.providers, `route '${routeId}' providers`, 32);
    const seenProviders = new Set();
    const providers = providerValues.map((value, index) => {
      const step = plainSnapshot(value, `route '${routeId}' provider ${index}`, ROUTE_PROVIDER_KEYS);
      const id = identifier(step.id, `route '${routeId}' provider id`, MAX_PROVIDER_ID_LENGTH);
      if (seenProviders.has(id)) throw new TypeError(`route '${routeId}' contains duplicate provider '${id}'.`);
      seenProviders.add(id);
      return deepFreeze({ id, fallbackOn: fallbackCodes(step.fallbackOn, `route '${routeId}' fallbackOn`) });
    });
    routes.set(routeId, deepFreeze({ id: routeId, operation: definition.operation, providers }));
  }
  if (routes.size === 0) throw new TypeError("routes must define at least one route.");
  return routes;
}

function validateRegistry(value) {
  if (!value || typeof value !== "object") throw new TypeError("registry must be a source registry.");
  for (const method of ["list", "doctor", "read", "search"]) {
    const descriptor = Object.getOwnPropertyDescriptor(value, method);
    if (!descriptor || !Object.hasOwn(descriptor, "value") || typeof descriptor.value !== "function") {
      throw new TypeError(`registry must expose ${method}() as an own data property.`);
    }
  }
  return value;
}

function statusMap(registry) {
  const statuses = registry.doctor();
  if (!Array.isArray(statuses)) throw new TypeError("registry.doctor() must return an array.");
  const result = new Map();
  for (const status of statuses) {
    if (!status || typeof status !== "object" || typeof status.id !== "string") {
      throw new TypeError("registry.doctor() returned an invalid provider status.");
    }
    if (!PROVIDER_STATUS_VALUES.has(status.status) || !status.capabilities || typeof status.capabilities !== "object") {
      throw new TypeError(`registry.doctor() returned an invalid status for '${status.id}'.`);
    }
    if (result.has(status.id)) throw new TypeError(`registry.doctor() returned duplicate provider '${status.id}'.`);
    result.set(status.id, status);
  }
  return result;
}

function stepAvailability(step, operation, statuses) {
  const status = statuses.get(step.id);
  if (!status) return { available: false, reason: "unknown_provider", status: null };
  if (status.status === "missing_credentials" || status.status === "unavailable") {
    return { available: false, reason: status.status, status };
  }
  if (status.capabilities[operation] !== true) {
    return { available: false, reason: "missing_capability", status };
  }
  return { available: true, reason: null, status };
}

function publicAttempt(step, state, errorCode = null) {
  return deepFreeze({ provider: step.id, state, errorCode });
}

function routeStatus(definition, statuses) {
  const providers = definition.providers.map((step) => {
    const availability = stepAvailability(step, definition.operation, statuses);
    return deepFreeze({
      id: step.id,
      status: availability.status?.status || "unavailable",
      available: availability.available,
      reason: availability.reason,
      authentication: availability.status?.authentication || "unknown",
      message: availability.status?.message || "Provider is not registered."
    });
  });
  const selected = providers.find((provider) => provider.available)?.id || null;
  return deepFreeze({
    id: definition.id,
    operation: definition.operation,
    status: selected ? "ready" : "unavailable",
    selectedProvider: selected,
    providers
  });
}

export function createSourceRouter(options) {
  const config = plainSnapshot(options, "source router", ROUTER_OPTION_KEYS);
  const registry = validateRegistry(config.registry);
  const routes = snapshotRoutes(config.routes);

  function getRoute(value) {
    const id = identifier(value, "route", MAX_ROUTE_ID_LENGTH);
    const route = routes.get(id);
    if (!route) throw new SourceAccessError("SOURCE_UNKNOWN_ROUTE", `Unknown source route '${id}'.`, { route: id });
    return route;
  }

  return deepFreeze({
    list() {
      return Object.freeze([...routes.keys()]);
    },
    doctor() {
      const statuses = statusMap(registry);
      return deepFreeze([...routes.values()].map((route) => routeStatus(route, statuses)));
    },
    async route(routeId, input) {
      const definition = getRoute(routeId);
      const statuses = statusMap(registry);
      const attempts = [];
      for (const step of definition.providers) {
        const availability = stepAvailability(step, definition.operation, statuses);
        if (!availability.available) {
          attempts.push(publicAttempt(step, availability.reason));
          continue;
        }
        try {
          const records = await registry[definition.operation](step.id, input);
          attempts.push(publicAttempt(step, "succeeded"));
          return deepFreeze({
            route: definition.id,
            operation: definition.operation,
            provider: step.id,
            records: [...records],
            attempts
          });
        } catch (error) {
          const code = error instanceof SourceAccessError ? error.code : null;
          if (!code || !step.fallbackOn.includes(code)) throw error;
          attempts.push(publicAttempt(step, "fallback", code));
        }
      }
      throw new SourceAccessError(
        "SOURCE_ROUTE_UNAVAILABLE",
        `No provider is available for source route '${definition.id}'.`,
        { route: definition.id, operation: definition.operation, attempts }
      );
    }
  });
}
