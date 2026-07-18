import { createSourceRegistry } from "./sources.js";

const REQUIRED_RECORD_FIELDS = Object.freeze([
  "source", "id", "type", "title", "url", "text", "author", "publishedAt",
  "contentHash", "adapterVersion", "warnings", "metadata", "provenance"
]);
const STATUS_VALUES = new Set(["ready", "partial", "missing_credentials", "unavailable"]);

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  return value;
}

function assertSecretFree(value, secrets, label) {
  const serialized = JSON.stringify(value);
  for (const secret of secrets) {
    if (serialized.includes(secret)) throw new Error(`${label} serialized a configured secret marker.`);
  }
}

function validateRecord(value, providerId, secrets) {
  const record = requireObject(value, "Source record");
  for (const field of REQUIRED_RECORD_FIELDS) {
    if (!Object.hasOwn(record, field)) throw new Error(`Source record is missing '${field}'.`);
  }
  if (record.source !== providerId) throw new Error(`Source record '${record.id}' used source '${record.source}', expected '${providerId}'.`);
  if (!Object.isFrozen(record) || !Object.isFrozen(record.metadata) || !Object.isFrozen(record.provenance)) {
    throw new Error(`Source record '${record.id}' is not deeply immutable at its public boundaries.`);
  }
  assertSecretFree(record, secrets, `Source record '${record.id}'`);
}

export async function runSourceProviderConformance(options) {
  const config = requireObject(options, "Conformance options");
  const secrets = Array.isArray(config.secretMarkers)
    ? config.secretMarkers.filter((value) => typeof value === "string" && value.length > 0)
    : [];
  const providerId = String(config.providerId || config.provider?.id || "");
  if (!providerId) throw new TypeError("providerId or provider.id is required.");
  const registry = config.registry || createSourceRegistry({ providers: [config.provider] });
  const status = registry.doctor().find((item) => item.id === providerId);
  if (!status) throw new Error(`Provider '${providerId}' is missing from doctor output.`);
  if (!STATUS_VALUES.has(status.status)) throw new Error(`Provider '${providerId}' reported unsupported status '${status.status}'.`);
  if (!status.capabilities || typeof status.capabilities !== "object") throw new Error(`Provider '${providerId}' did not report capabilities.`);
  if (typeof status.message !== "string" || !status.message) throw new Error(`Provider '${providerId}' did not report a limitation message.`);
  if (typeof status.authentication !== "string" || !status.authentication) throw new Error(`Provider '${providerId}' did not report authentication state.`);
  if (!Object.isFrozen(status) || !Object.isFrozen(status.capabilities)) throw new Error(`Provider '${providerId}' status is mutable.`);
  for (const [name, enabled] of Object.entries(status.capabilities)) {
    if (typeof enabled !== "boolean") throw new Error(`Capability '${name}' must be boolean.`);
  }
  assertSecretFree(status, secrets, `Provider '${providerId}' status`);

  const checks = ["status", "capabilities", "status-immutability", "status-secret-redaction"];
  for (const [operation, scenario] of [["search", config.searchCase], ["read", config.readCase]]) {
    if (!scenario) continue;
    const input = requireObject(scenario, `${operation}Case`).input;
    const records = await registry[operation](providerId, input);
    if (!Array.isArray(records) || records.length === 0) throw new Error(`${operation}Case returned no records.`);
    for (const record of records) validateRecord(record, providerId, secrets);
    checks.push(`${operation}-allow`, `${operation}-records`, `${operation}-immutability`, `${operation}-secret-redaction`);
  }

  for (const scenario of config.errorCases || []) {
    requireObject(scenario, "errorCases entry");
    if (typeof scenario.run !== "function" || typeof scenario.code !== "string" || !scenario.code) {
      throw new TypeError("Every error case requires run(registry) and code.");
    }
    let observed;
    try {
      await scenario.run(registry);
    } catch (error) {
      observed = error;
    }
    if (!observed) throw new Error(`Error case '${scenario.name || scenario.code}' resolved successfully.`);
    if (observed.code !== scenario.code) {
      throw new Error(`Error case '${scenario.name || scenario.code}' returned '${observed.code}', expected '${scenario.code}'.`);
    }
    assertSecretFree({ message: observed.message, code: observed.code, details: observed.details }, secrets, `Error case '${scenario.name || scenario.code}'`);
    checks.push(`error:${scenario.name || scenario.code}`);
  }

  return Object.freeze({
    providerId,
    status: status.status,
    checks: Object.freeze(checks),
    passed: true,
    certification: false
  });
}
