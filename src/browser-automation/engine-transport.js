import { browserAutomationFail } from "./errors.js";
import { optionalMethod, requiredMethod, safeUrl, serviceInput } from "./engine-helpers.js";

const DROPPED_REQUEST_HEADERS = new Set([
  "connection", "content-length", "host", "keep-alive", "proxy-authenticate",
  "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"
]);
const DROPPED_RESPONSE_HEADERS = new Set([
  "connection", "content-encoding", "content-length", "keep-alive", "transfer-encoding", "upgrade"
]);

function deny(session, code, url) {
  session.network.blocked += 1;
  session.network.lastDeniedCode = code;
  session.network.lastDeniedUrl = safeUrl(url);
}

function requestHeaders(request) {
  const source = requiredMethod(request, "headers", "network-boundary")();
  const result = Object.create(null);
  for (const [rawName, rawValue] of Object.entries(source ?? {})) {
    const name = rawName.toLowerCase();
    if (!DROPPED_REQUEST_HEADERS.has(name)) result[name] = String(rawValue);
  }
  result["accept-encoding"] = "identity";
  return result;
}

function responseHeaders(response) {
  const result = Object.create(null);
  for (const [rawName, rawValue] of response.headers.entries()) {
    const name = rawName.toLowerCase();
    if (!DROPPED_RESPONSE_HEADERS.has(name)) result[name] = rawValue;
  }
  result["x-dns-prefetch-control"] = "off";
  return result;
}

function accountBytes(session, lease, direction, bytes, url) {
  const leaseField = direction === "request" ? "requestBytes" : "responseBytes";
  const sessionField = direction === "request" ? "totalRequestBytes" : "totalResponseBytes";
  const actionMaximum = direction === "request" ? lease.maxRequestBytes : lease.maxResponseBytes;
  const sessionMaximum = direction === "request"
    ? session.network.maxTotalRequestBytes
    : session.network.maxTotalResponseBytes;
  lease[leaseField] += bytes;
  session.network[sessionField] += bytes;
  if (lease[leaseField] > actionMaximum || session.network[sessionField] > sessionMaximum) {
    deny(session, "BROWSER_AUTOMATION_RESOURCE_LIMIT", url);
    browserAutomationFail(
      "BROWSER_AUTOMATION_RESOURCE_LIMIT",
      `Governed browser ${direction} bytes exceeded the authorized network budget.`
    );
  }
}

async function boundedResponseBody(session, lease, response, controller, url) {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > 0) {
    const remainingAction = lease.maxResponseBytes - lease.responseBytes;
    const remainingSession = session.network.maxTotalResponseBytes - session.network.totalResponseBytes;
    if (declared > remainingAction || declared > remainingSession) {
      controller.abort();
      deny(session, "BROWSER_AUTOMATION_RESOURCE_LIMIT", url);
      browserAutomationFail(
        "BROWSER_AUTOMATION_RESOURCE_LIMIT",
        "Governed browser response declared more bytes than the remaining network budget."
      );
    }
  }
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      accountBytes(session, lease, "response", chunk.length, url);
      chunks.push(chunk);
      total += chunk.length;
    }
  } catch (error) {
    controller.abort();
    try { await reader.cancel(); } catch {}
    throw error;
  }
  return Buffer.concat(chunks, total);
}

function currentLease(session, expected) {
  return session.network.activeLease === expected
    && expected?.active === true
    && expected.accepting === true
    && !expected.signal?.aborted
    && (!expected.deadline || Date.now() < Date.parse(expected.deadline));
}

async function fulfillGovernedRequest(session, lease, route) {
  const request = requiredMethod(route, "request", "network-boundary")();
  const rawUrl = requiredMethod(request, "url", "network-boundary")();
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    deny(session, "BROWSER_AUTOMATION_ORIGIN_VIOLATION", rawUrl);
    await requiredMethod(route, "abort", "network-boundary")("blockedbyclient");
    return;
  }
  if (!currentLease(session, lease) || !session.allowedOrigins.includes(parsed.origin)) {
    deny(session, "BROWSER_AUTOMATION_ORIGIN_VIOLATION", rawUrl);
    await requiredMethod(route, "abort", "network-boundary")("blockedbyclient");
    return;
  }
  const method = requiredMethod(request, "method", "network-boundary")().toUpperCase();
  lease.requests += 1;
  session.network.totalAuthorizedRequests += 1;
  if (lease.requests > session.network.maxRequestsPerAction
    || session.network.totalAuthorizedRequests > session.network.maxRequestsPerSession) {
    deny(session, "BROWSER_AUTOMATION_RESOURCE_LIMIT", rawUrl);
    await requiredMethod(route, "abort", "network-boundary")("blockedbyclient");
    return;
  }
  if (!session.network.readOnlyMethods.has(method) && lease.effect !== "write") {
    deny(session, "BROWSER_AUTOMATION_EFFECT_DENIED", rawUrl);
    await requiredMethod(route, "abort", "network-boundary")("blockedbyclient");
    return;
  }
  let authorization;
  try {
    authorization = await session.services.authorizeRequest(serviceInput(session, {
      sessionId: session.publicSessionId,
      url: parsed.toString(),
      origin: parsed.origin,
      method,
      resourceType: requiredMethod(request, "resourceType", "network-boundary")(),
      action: lease.action,
      effect: lease.effect,
      principalId: lease.principalId,
      actionNumber: lease.actionNumber,
      remainingRequestBytes: Math.max(0, lease.maxRequestBytes - lease.requestBytes),
      remainingResponseBytes: Math.max(0, lease.maxResponseBytes - lease.responseBytes)
    }));
  } catch {
    deny(session, "BROWSER_AUTOMATION_BACKEND_FAILURE", rawUrl);
    await requiredMethod(route, "abort", "network-boundary")("failed");
    return;
  }
  if (!currentLease(session, lease) || authorization?.allowed !== true) {
    deny(session, "BROWSER_AUTOMATION_ORIGIN_VIOLATION", rawUrl);
    await requiredMethod(route, "abort", "network-boundary")("blockedbyclient");
    return;
  }
  const bodyValue = optionalMethod(request, "postDataBuffer")?.() ?? null;
  const body = bodyValue ? Buffer.from(bodyValue) : undefined;
  if (body) accountBytes(session, lease, "request", body.length, rawUrl);

  const controller = new AbortController();
  const abort = () => controller.abort(lease.signal?.reason);
  lease.controllers.add(controller);
  lease.signal?.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetch(parsed, {
      method,
      headers: requestHeaders(request),
      body: ["GET", "HEAD"].includes(method) ? undefined : body,
      redirect: "manual",
      signal: controller.signal
    });
    const responseBody = await boundedResponseBody(session, lease, response, controller, rawUrl);
    await requiredMethod(route, "fulfill", "network-boundary")({
      status: response.status,
      headers: responseHeaders(response),
      body: responseBody
    });
  } catch {
    try { await requiredMethod(route, "abort", "network-boundary")("failed"); } catch {}
    if (!session.network.lastDeniedCode) deny(session, "BROWSER_AUTOMATION_BACKEND_FAILURE", rawUrl);
  } finally {
    lease.signal?.removeEventListener("abort", abort);
    lease.controllers.delete(controller);
  }
}

export function installBrowserEgressGuards(context) {
  return requiredMethod(context, "addInitScript", "session-open")(() => {
    const deny = class GovernedNetworkChannelDisabled {
      constructor() { throw new DOMException("This browser network channel is disabled.", "SecurityError"); }
    };
    for (const name of ["RTCPeerConnection", "webkitRTCPeerConnection", "WebTransport"]) {
      try {
        Object.defineProperty(globalThis, name, { configurable: false, enumerable: false, writable: false, value: deny });
      } catch {}
    }
  });
}

export function installBoundedHttpTransport(session) {
  return requiredMethod(session.context, "route", "session-open")("**/*", (route) => {
    const lease = session.network.activeLease;
    const task = fulfillGovernedRequest(session, lease, route);
    if (lease?.inflight) {
      lease.inflight.add(task);
      task.finally(() => lease.inflight.delete(task)).catch(() => {});
    }
    return task;
  });
}
