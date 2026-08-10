import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BROWSER_AUTOMATION_ACTION_CATALOG,
  BROWSER_AUTOMATION_CATEGORIES,
  GOVERNED_ENGINE_REQUIRED_SERVICES,
  GOVERNED_ENGINE_UNSUPPORTED_ACTIONS
} from "../src/browser-automation.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const unsupported = new Set(GOVERNED_ENGINE_UNSUPPORTED_ACTIONS);
const realEngineVerified = new Set(JSON.parse(await readFile(
  path.join(root, "docs", "browser-automation-real-engine-verified-actions.json"),
  "utf8"
)));

const actions = BROWSER_AUTOMATION_ACTION_CATALOG.map((entry) => {
  const requiredServices = GOVERNED_ENGINE_REQUIRED_SERVICES[entry.kind] ?? [];
  const governedAdapter = unsupported.has(entry.kind)
    ? "unsupported"
    : requiredServices.length > 0
      ? "trusted-service-required"
      : "built-in-handler";
  return {
    ...entry,
    contract: "cataloged",
    crawlerCore: "not-directly-exposed",
    cockroachBrowser: "separate-product-contract",
    governedAdapter,
    requiredServices,
    realEngineIntegrationVerified: realEngineVerified.has(entry.kind)
  };
});

const categories = BROWSER_AUTOMATION_CATEGORIES.map((id) => {
  const entries = actions.filter((entry) => entry.category === id);
  const available = entries.filter((entry) => entry.governedAdapter !== "unsupported").length;
  return {
    id,
    status: available === 0 ? "unsupported" : available === entries.length ? "maximum-backend-covered" : "partial",
    catalogedActions: entries.length,
    maximumBackendActions: available,
    realEngineIntegrationVerifiedActions: entries.filter((entry) => entry.realEngineIntegrationVerified).length
  };
});

const output = {
  schemaVersion: "cockroach.browser-automation-capability-matrix.v1",
  packageVersion: manifest.version,
  scope: "product-owned-governed-browser-automation",
  summary: {
    catalogedActions: actions.length,
    catalogedCategories: categories.length,
    builtInHandlerActions: actions.filter((entry) => entry.governedAdapter === "built-in-handler").length,
    trustedServiceRequiredActions: actions.filter((entry) => entry.governedAdapter === "trusted-service-required").length,
    explicitlyUnsupportedActions: actions.filter((entry) => entry.governedAdapter === "unsupported").length,
    realEngineIntegrationVerifiedActions: actions.filter((entry) => entry.realEngineIntegrationVerified).length
  },
  interpretation: {
    cataloged: "The normalized contract and validator exist; this alone is not runtime support.",
    builtInHandler: "The shipped engine adapter has a handler, subject to runtime method probes and authority checks.",
    trustedServiceRequired: "The handler is available only when the host injects every named trusted service.",
    realEngineIntegrationVerified: "The repository's installed-engine smoke test executes this action kind.",
    separateProductContract: "Cockroach Browser is a separate product; this repository does not self-attest its feature coverage."
  },
  categories,
  actions
};

await writeFile(
  path.join(root, "docs", "browser-automation-capability-matrix.json"),
  `${JSON.stringify(output, null, 2)}\n`
);
console.log(JSON.stringify(output.summary));
