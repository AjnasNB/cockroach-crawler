import {
  activePage,
  engineActionResult,
  persistArtifact,
  requiredMethod,
  safeUrl,
  serviceInput
} from "./engine-helpers.js";
import { browserAutomationSecretKey } from "./redaction.js";
import { browserAutomationFail } from "./errors.js";
import { installBoundedHttpTransport, installBrowserEgressGuards } from "./engine-transport.js";

function safeHeaders(value) {
  if (!value || typeof value !== "object") return Object.freeze({ headers: Object.freeze({}), truncated: false });
  const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
  const selected = entries.slice(0, 64);
  return Object.freeze({ headers: Object.freeze(Object.fromEntries(selected.map(([key, entry]) => [
    key.toLowerCase(),
    browserAutomationSecretKey(key) ? "[redacted]" : String(entry).slice(0, 2_048)
  ]))), truncated: entries.length > selected.length });
}

function requestData(request) {
  const headerData = safeHeaders(requiredMethod(request, "headers", "network.inspect")());
  return Object.freeze({
    url: safeUrl(requiredMethod(request, "url", "network.inspect")()),
    method: requiredMethod(request, "method", "network.inspect")(),
    resourceType: requiredMethod(request, "resourceType", "network.inspect")(),
    headers: headerData.headers,
    headersTruncated: headerData.truncated
  });
}

function boundedNetworkBytes(network, maximumBytes) {
  const chunks = [];
  let total = 0;
  const append = (value) => {
    const bytes = Buffer.from(value);
    if (total + bytes.length > maximumBytes) {
      browserAutomationFail("BROWSER_AUTOMATION_ARTIFACT_LIMIT", "Network export exceeded its authorized byte limit.");
    }
    chunks.push(bytes);
    total += bytes.length;
  };
  append('{"requests":[');
  network.requests.forEach((entry, index) => {
    if (index > 0) append(",");
    append(JSON.stringify(entry));
  });
  append('],"responses":[');
  network.responses.forEach((entry, index) => {
    if (index > 0) append(",");
    append(JSON.stringify(entry));
  });
  append("]}");
  return Buffer.concat(chunks, total);
}

function responseData(response) {
  const request = requiredMethod(response, "request", "network.inspect")();
  return Object.freeze({
    url: safeUrl(requiredMethod(response, "url", "network.inspect")()),
    status: requiredMethod(response, "status", "network.inspect")(),
    ok: requiredMethod(response, "ok", "network.inspect")(),
    requestMethod: requiredMethod(request, "method", "network.inspect")()
  });
}

function pathMatches(pattern, pathname) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*");
  return new RegExp(`^${escaped}$`).test(pathname);
}

export const networkHandlers = Object.freeze({
  "network.inspect": async (session) => engineActionResult({
    requests: session.network.requests.length,
    responses: session.network.responses.length,
    routes: session.routes.size,
    offline: session.network.offline,
    cacheEnabled: session.network.cacheEnabled
  }),
  "network.requests": async (session, action) => engineActionResult(session.network.requests.slice(-(action.limit ?? 100))),
  "network.responses": async (session, action) => engineActionResult(session.network.responses.slice(-(action.limit ?? 100))),
  "network.export": async (session, action) => {
    const bytes = boundedNetworkBytes(session.network, action.maxBytes);
    const artifact = await persistArtifact(session, action, bytes);
    return engineActionResult({ requestCount: session.network.requests.length, responseCount: session.network.responses.length }, artifact);
  },
  "network.route.add": async (session, action) => {
    const routeRule = action.route;
    if (session.routes.has(routeRule.id)) {
      browserAutomationFail("BROWSER_AUTOMATION_RESOURCE_LIMIT", "A governed network route with this id already exists.");
    }
    if (session.routes.size >= 64) {
      browserAutomationFail("BROWSER_AUTOMATION_RESOURCE_LIMIT", "The governed network route limit was exceeded.");
    }
    const body = routeRule.response.mode === "fulfill" && routeRule.response.bodyRef
      ? await session.services.resolveRouteBody(serviceInput(session, {
        sessionId: session.publicSessionId,
        bodyRef: routeRule.response.bodyRef,
        routeId: routeRule.id
      }))
      : undefined;
    if (body !== undefined && typeof body !== "string" && !(body instanceof Uint8Array)) {
      throw new TypeError("Trusted route body must be a string or byte array.");
    }
    if (body !== undefined && Buffer.byteLength(body) > routeRule.response.maxBodyBytes) {
      throw new TypeError("Trusted route body exceeds its authorized byte ceiling.");
    }
    const handler = async (route) => {
      const request = requiredMethod(route, "request", action.kind)();
      const parsed = new URL(requiredMethod(request, "url", action.kind)());
      const method = requiredMethod(request, "method", action.kind)();
      const resourceType = requiredMethod(request, "resourceType", action.kind)();
      if (parsed.origin !== routeRule.origin || !pathMatches(routeRule.pathPattern, parsed.pathname)
        || (routeRule.methods && !routeRule.methods.includes(method))
        || (routeRule.resourceTypes && !routeRule.resourceTypes.includes(resourceType))) {
        const fallback = route.fallback ?? route.continue;
        await fallback.call(route);
        return;
      }
      if (routeRule.response.mode === "abort") await requiredMethod(route, "abort", action.kind)("blockedbyclient");
      else {
        await requiredMethod(route, "fulfill", action.kind)({
          status: routeRule.response.status,
          headers: routeRule.response.headers,
          body
        });
      }
    };
    await requiredMethod(session.context, "route", action.kind)("**/*", handler);
    session.routes.set(routeRule.id, { handler, rule: routeRule });
    return engineActionResult({ routeId: routeRule.id, installed: true });
  },
  "network.route.remove": async (session, action) => {
    const installed = session.routes.get(action.routeId);
    if (!installed) return engineActionResult({ routeId: action.routeId, removed: false });
    await requiredMethod(session.context, "unroute", action.kind)("**/*", installed.handler);
    session.routes.delete(action.routeId);
    return engineActionResult({ routeId: action.routeId, removed: true });
  },
  "network.routes.list": async (session) => engineActionResult([...session.routes.values()].map(({ rule }) => ({
    id: rule.id,
    origin: rule.origin,
    pathPattern: rule.pathPattern,
    methods: rule.methods ?? [],
    resourceTypes: rule.resourceTypes ?? [],
    responseMode: rule.response.mode
  }))),
  "network.offline": async (session, action) => {
    await requiredMethod(session.context, "setOffline", action.kind)(action.enabled);
    session.network.offline = action.enabled;
    return engineActionResult({ offline: action.enabled });
  },
  "network.cache": async (session, action) => {
    const page = activePage(session, action.kind);
    await requiredMethod(page, "setCacheEnabled", action.kind)(action.enabled);
    session.network.cacheEnabled = action.enabled;
    return engineActionResult({ cacheEnabled: action.enabled });
  },
  "network.headers": async (session, action) => {
    const handler = async (route) => {
      const request = requiredMethod(route, "request", action.kind)();
      const parsed = new URL(requiredMethod(request, "url", action.kind)());
      const fallback = route.fallback ?? route.continue;
      if (parsed.origin !== action.origin) {
        await fallback.call(route);
        return;
      }
      await fallback.call(route, {
        headers: { ...requiredMethod(request, "headers", action.kind)(), ...action.headers }
      });
    };
    session.headerRoute && await requiredMethod(session.context, "unroute", action.kind)("**/*", session.headerRoute);
    await requiredMethod(session.context, "route", action.kind)("**/*", handler);
    session.headerRoute = handler;
    return engineActionResult({ installedHeaderNames: Object.keys(action.headers) });
  }
});

export async function installNetworkBoundary(session) {
  const context = session.context;
  await installBrowserEgressGuards(context);
  await requiredMethod(context, "routeWebSocket", "session-open")("**/*", async (webSocket) => {
    session.network.blocked += 1;
    await requiredMethod(webSocket, "close", "session-open")({ code: 1008, reason: "WebSocket egress is disabled." });
  });
  await installBoundedHttpTransport(session);
}

export function attachNetworkTracking(session, page) {
  const on = page?.on;
  if (typeof on !== "function") return;
  on.call(page, "request", (request) => {
    session.network.requests.push(requestData(request));
    if (session.network.requests.length > 1_000) session.network.requests.shift();
  });
  on.call(page, "response", (response) => {
    session.network.responses.push(responseData(response));
    if (session.network.responses.length > 1_000) session.network.responses.shift();
  });
}
