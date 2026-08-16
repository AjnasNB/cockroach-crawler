import { browserAutomationEffectForAction } from "./catalog.js";
import { browserAutomationFail } from "./errors.js";
import { boundedJson, exactRecord } from "./validation.js";
import { browserAutomationSecretKey, redactBrowserAutomationText } from "./redaction.js";

const SHA256 = /^[a-f0-9]{64}$/;
const ARTIFACT_ACTIONS = new Set([
  "download", "network.export", "trace.stop", "recording.stop", "coverage.stop",
  "heap.snapshot", "capture.paired", "screenshot", "pdf"
]);

function fail(message, code = "BROWSER_AUTOMATION_BACKEND_INVALID") {
  browserAutomationFail(code, message);
}

function exactBoolean(value, label) {
  if (value !== true) fail(`${label} must be true.`);
  return true;
}

function artifact(value, action, label) {
  const raw = exactRecord(value, new Set(["name", "bytes", "sha256"]), new Set(["name", "bytes", "sha256"]), label);
  if (raw.name !== action.artifactName) fail(`${label}.name does not match the authorized artifact name.`);
  if (!Number.isSafeInteger(raw.bytes) || raw.bytes < 0 || raw.bytes > action.maxBytes) fail(`${label}.bytes exceeds the authorized download limit.`);
  if (typeof raw.sha256 !== "string" || !SHA256.test(raw.sha256)) fail(`${label}.sha256 must be a lowercase SHA-256 digest.`);
  return Object.freeze({ name: raw.name, bytes: raw.bytes, sha256: raw.sha256 });
}

function redact(value, key = "") {
  if (browserAutomationSecretKey(key)) return "[redacted]";
  if (typeof value === "string") {
    return redactBrowserAutomationText(value);
  }
  if (Array.isArray(value)) return Object.freeze(value.map((entry) => redact(entry)));
  if (value && typeof value === "object") {
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([entryKey, entry]) => [entryKey, redact(entry, entryKey)])));
  }
  return value;
}

export function normalizeBackendResult(value, action, maximumOutputBytes, networkBudget) {
  const raw = exactRecord(value, new Set(["data", "attestation"]), new Set(["data", "attestation"]), "Browser backend result");
  const attestationRaw = exactRecord(
    raw.attestation,
    new Set(["action", "effect", "origin", "sessionBound", "withinBudget", "fileRefsAccepted", "artifact", "network"]),
    new Set(["action", "effect", "origin", "sessionBound", "withinBudget", "network"]),
    "Browser backend attestation"
  );
  const effect = browserAutomationEffectForAction(action.kind);
  if (attestationRaw.action !== action.kind || attestationRaw.effect !== effect || attestationRaw.origin !== action.origin) {
    fail("Browser backend attestation does not match the authorized action.");
  }
  exactBoolean(attestationRaw.sessionBound, "Browser backend attestation.sessionBound");
  exactBoolean(attestationRaw.withinBudget, "Browser backend attestation.withinBudget");
  const attestation = {
    action: action.kind,
    effect,
    origin: action.origin,
    sessionBound: true,
    withinBudget: true
  };
  const networkRaw = exactRecord(
    attestationRaw.network,
    new Set(["requests", "requestBytes", "responseBytes"]),
    new Set(["requests", "requestBytes", "responseBytes"]),
    "Browser backend attestation.network"
  );
  for (const [field, maximum] of [
    ["requests", 4_096],
    ["requestBytes", networkBudget.maxRequestBytes],
    ["responseBytes", networkBudget.maxResponseBytes]
  ]) {
    if (!Number.isSafeInteger(networkRaw[field]) || networkRaw[field] < 0 || networkRaw[field] > maximum) {
      fail(`Browser backend attestation.network.${field} exceeds its authorized limit.`);
    }
  }
  attestation.network = Object.freeze({
    requests: networkRaw.requests,
    requestBytes: networkRaw.requestBytes,
    responseBytes: networkRaw.responseBytes
  });
  if (effect === "upload") {
    if (!Number.isSafeInteger(attestationRaw.fileRefsAccepted)
      || attestationRaw.fileRefsAccepted !== action.fileRefs.length) {
      fail("Browser backend did not attest every authorized upload reference.");
    }
    attestation.fileRefsAccepted = attestationRaw.fileRefsAccepted;
  } else if (attestationRaw.fileRefsAccepted !== undefined) {
    fail("Browser backend returned upload attestation for a non-upload action.");
  }
  if (ARTIFACT_ACTIONS.has(action.kind)) {
    attestation.artifact = artifact(attestationRaw.artifact, action, "Browser backend attestation.artifact");
  } else if (attestationRaw.artifact !== undefined) {
    fail("Browser backend returned artifact attestation for a non-download action.");
  }
  const normalizedData = boundedJson(raw.data, "Browser backend result.data", {
    maxDepth: 8,
    maxNodes: 2_048,
    maxString: maximumOutputBytes,
    maxBytes: maximumOutputBytes
  });
  const data = effect === "credential" ? normalizedData : redact(normalizedData);
  const serializedBytes = Buffer.byteLength(JSON.stringify(data));
  if (serializedBytes > maximumOutputBytes) fail("Browser backend result exceeded the configured output budget.");
  return Object.freeze({ data, attestation: Object.freeze(attestation) });
}
