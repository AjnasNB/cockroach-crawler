import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

import {
  BROWSER_AUTOMATION_ACTIONS,
  BROWSER_AUTOMATION_ACTION_EFFECTS,
  BROWSER_AUTOMATION_SAFE_ACTIONS,
  BrowserAutomationAdapterError,
  browserAutomationCapabilityReport,
  createBrowserAutomationAdapter
} from "../src/browser-automation.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function backendFixture() {
  const calls = [];
  let counter = 0;
  return {
    calls,
    async createSession(input) {
      calls.push(["createSession", structuredClone(input)]);
      counter += 1;
      return { id: `session-${counter}` };
    },
    async act(sessionId, action) {
      calls.push(["act", sessionId, structuredClone(action)]);
      return { ok: true, kind: action.kind };
    },
    async closeSession(sessionId) {
      calls.push(["closeSession", sessionId]);
    }
  };
}

test("capability report pins the truthful non-parity boundary", () => {
  const report = browserAutomationCapabilityReport();
  assert.equal(report.schemaVersion, "cockroach.browser-automation-adapter.v1");
  assert.equal(report.puppeteerBaseline, "25.5.0");
  assert.equal(report.puppeteerApiCompatible, false);
  assert.deepEqual(report.enabledActions, BROWSER_AUTOMATION_SAFE_ACTIONS);
  assert.equal(BROWSER_AUTOMATION_ACTIONS.includes("cookies.write"), true);
  assert.equal(BROWSER_AUTOMATION_ACTION_EFFECTS["cookies.write"], "write");
  assert.equal(Object.isFrozen(report), true);
});

test("capability report satisfies the packed JSON Schema", async () => {
  const schema = JSON.parse(await readFile(
    path.join(ROOT, "schemas", "browser-automation-capabilities.schema.json"),
    "utf8"
  ));
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  const report = browserAutomationCapabilityReport({
    allowedActions: ["snapshot", "click"],
    allowedEffects: ["read", "execute"]
  });
  assert.equal(validate(report), true, JSON.stringify(validate.errors));
});

test("adapter opens an origin-bounded session and injects creator policy", async () => {
  const backend = backendFixture();
  const adapter = createBrowserAutomationAdapter({
    backend,
    allowedActions: ["navigate", "snapshot"],
    allowedEffects: ["read"],
    policy: { allowPrivateNetwork: false, budget: { maxActions: 12 } }
  });
  const session = await adapter.open({
    purpose: "Inspect the public release page",
    actor: "test-runner",
    allowedOrigins: ["https://example.com"],
    startUrl: "https://example.com/release",
    viewport: { width: 1280, height: 720 }
  });
  assert.deepEqual(session, { id: "session-1", purpose: "Inspect the public release page" });
  const input = backend.calls[0][1];
  assert.deepEqual(input.policy.allowedOrigins, ["https://example.com"]);
  assert.deepEqual(input.policy.allowedActions, ["navigate", "snapshot"]);
  assert.deepEqual(input.policy.allowedEffects, ["read"]);
  assert.equal(input.policy.allowPrivateNetwork, false);
  assert.equal(input.startUrl, "https://example.com/release");
});

test("adapter denies unknown, unowned, and creator-disabled actions", async () => {
  const backend = backendFixture();
  const adapter = createBrowserAutomationAdapter({ backend, allowedActions: ["snapshot"] });
  const session = await adapter.open({
    purpose: "Read a page",
    allowedOrigins: ["https://example.com"]
  });
  await assert.rejects(
    adapter.execute(session.id, { kind: "click", selector: "button" }),
    (error) => error instanceof BrowserAutomationAdapterError
      && error.code === "BROWSER_AUTOMATION_ACTION_DENIED"
  );
  await assert.rejects(
    adapter.execute(session.id, { kind: "not-real" }),
    (error) => error.code === "BROWSER_AUTOMATION_ACTION_UNKNOWN"
  );
  await assert.rejects(
    adapter.execute("ambient-session", { kind: "snapshot" }),
    (error) => error.code === "BROWSER_AUTOMATION_SESSION_UNKNOWN"
  );
});

test("adapter enforces action effects independently from action names", async () => {
  const backend = backendFixture();
  const adapter = createBrowserAutomationAdapter({
    backend,
    allowedActions: ["snapshot", "click"],
    allowedEffects: ["read"]
  });
  const session = await adapter.open({
    purpose: "Observe without interaction",
    allowedOrigins: ["https://example.com"]
  });
  await assert.rejects(
    adapter.execute(session.id, { kind: "click", selector: "button" }),
    (error) => error.code === "BROWSER_AUTOMATION_EFFECT_DENIED"
  );
  assert.deepEqual(await adapter.execute(session.id, { kind: "snapshot" }), {
    ok: true,
    kind: "snapshot"
  });
});

test("adapter rejects accessors, inherited input, reserved fields, and credential URLs", async () => {
  const backend = backendFixture();
  const adapter = createBrowserAutomationAdapter({ backend });
  await assert.rejects(
    adapter.open(Object.create({ purpose: "inherited" })),
    (error) => error.code === "BROWSER_AUTOMATION_INPUT_INVALID"
  );
  const accessor = { allowedOrigins: ["https://example.com"] };
  Object.defineProperty(accessor, "purpose", { enumerable: true, get: () => "getter" });
  await assert.rejects(
    adapter.open(accessor),
    (error) => error.code === "BROWSER_AUTOMATION_INPUT_INVALID"
  );
  await assert.rejects(
    adapter.open({
      purpose: "Bad origin",
      allowedOrigins: ["https://user:pass@example.com"]
    }),
    (error) => error.code === "BROWSER_AUTOMATION_ORIGIN_INVALID"
  );
  const symbolInput = {
    purpose: "No symbols",
    allowedOrigins: ["https://example.com"],
    [Symbol("hidden")]: true
  };
  await assert.rejects(
    adapter.open(symbolInput),
    (error) => error.code === "BROWSER_AUTOMATION_INPUT_INVALID"
  );
});

test("adapter keeps the session purpose fixed and closes only owned sessions", async () => {
  const backend = backendFixture();
  const adapter = createBrowserAutomationAdapter({
    backend,
    allowedActions: ["navigate", "snapshot"]
  });
  const session = await adapter.open({
    purpose: "Fixed reviewed purpose",
    allowedOrigins: ["https://example.com"]
  });
  const result = await adapter.execute(session.id, {
    kind: "navigate",
    url: "https://example.com/docs"
  });
  assert.deepEqual(result, { ok: true, kind: "navigate" });
  assert.equal(backend.calls[1][2].purpose, "Fixed reviewed purpose");
  await assert.rejects(
    adapter.execute(session.id, {
      kind: "navigate",
      url: "https://outside.example/docs"
    }),
    (error) => error.code === "BROWSER_AUTOMATION_ORIGIN_DENIED"
  );
  await adapter.closeSession(session.id);
  assert.deepEqual(backend.calls.at(-1), ["closeSession", "session-1"]);
  await assert.rejects(
    adapter.execute(session.id, { kind: "snapshot" }),
    (error) => error.code === "BROWSER_AUTOMATION_SESSION_UNKNOWN"
  );
});
