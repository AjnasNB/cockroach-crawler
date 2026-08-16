import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import {
  BROWSER_AUTOMATION_ACTION_CATALOG,
  BROWSER_AUTOMATION_ACTIONS,
  BROWSER_AUTOMATION_CATEGORIES,
  BROWSER_AUTOMATION_EFFECTS,
  BROWSER_AUTOMATION_SAFE_ACTIONS,
  BrowserAutomationError,
  createGovernedBrowserAutomation
} from "../src/browser-automation.js";
import { BROWSER_AUTOMATION_ACTION_RULES, boundedJson, normalizeAction } from "../src/browser-automation/validation.js";

const ORIGIN = "https://example.com";
const OTHER_ORIGIN = "https://other.example";
const HASH = "a".repeat(64);

function valueFor(type, field) {
  if (type === "selector" || type === "optionalSelector") return "main button";
  if (type === "text" || type === "shortText") return "value";
  if (type === "id") return "trusted-ref";
  if (type === "boolean") return true;
  if (type === "timeout") return 1_000;
  if (type === "duration") return 10;
  if (type === "maxBytes") return 1_024;
  if (type === "maxChars") return 1_024;
  if (type === "limit") return field === "quality" ? 90 : 10;
  if (type === "count") return 1;
  if (type === "coordinate") return 10;
  if (type === "latitude") return 12;
  if (type === "longitude") return 34;
  if (type === "accuracy") return 5;
  if (type === "ratio") return 1;
  if (type === "key") return "Enter";
  if (type === "artifact") return "evidence.bin";
  if (type === "stringArray") return ["value"];
  if (type === "fileRefs") return ["file:approved-one", "file:approved-two"];
  if (type === "json") return { enabled: true };
  if (type === "waitUntil") return "load";
  if (type === "selectorState") return "visible";
  if (type === "button") return "left";
  if (type === "area") return "local";
  if (type === "format") return "png";
  if (type === "headers") return { "x-test": "one" };
  if (type === "stringRecord") return { key: "value" };
  if (type === "cookies") return [{ name: "test", value: "value", url: `${ORIGIN}/` }];
  if (type === "url") return `${ORIGIN}/next`;
  if (type === "route") return {
    id: "route-one",
    origin: ORIGIN,
    pathPattern: "/api/*",
    methods: ["GET"],
    response: { mode: "abort" }
  };
  throw new Error(`Missing sample for validator ${type}`);
}

function sampleAction(kind) {
  const rule = BROWSER_AUTOMATION_ACTION_RULES.get(kind);
  const result = { kind, origin: ORIGIN };
  for (const [field, type] of Object.entries(rule.required)) result[field] = valueFor(type, field);
  return result;
}

function authority(overrides = {}) {
  return {
    principalId: "test-principal",
    allowedOrigins: [ORIGIN],
    allowedActions: BROWSER_AUTOMATION_ACTIONS,
    allowedEffects: BROWSER_AUTOMATION_EFFECTS,
    maxActions: 20,
    maxActionMs: 5_000,
    maxSessionMs: 60_000,
    maxArtifactBytes: 8_192,
    maxUploadBytes: 8_192,
    maxTotalArtifactBytes: 65_536,
    maxTotalUploadBytes: 65_536,
    maxNetworkRequestBytes: 8_192,
    maxNetworkResponseBytes: 8_192,
    maxTotalNetworkRequestBytes: 65_536,
    maxTotalNetworkResponseBytes: 65_536,
    ...overrides
  };
}

function makeBackend({ failCloseOnce = false, resultHook, supportedActions = BROWSER_AUTOMATION_ACTIONS } = {}) {
  const calls = { open: [], actions: [], close: [] };
  let closeFailures = failCloseOnce ? 1 : 0;
  const backend = {
    supportedActions,
    async openSession(input) {
      calls.open.push(input);
      return { backendSession: calls.open.length };
    },
    async runAction(handle, action, context) {
      calls.actions.push({ handle, action, context });
      if (resultHook) return resultHook(handle, action, context);
      const effect = BROWSER_AUTOMATION_ACTION_CATALOG.find((entry) => entry.kind === action.kind).effect;
      return {
        data: { ok: true, action: action.kind },
        attestation: {
          action: action.kind,
          effect,
          origin: action.origin,
          sessionBound: true,
          withinBudget: true,
          network: { requests: 0, requestBytes: 0, responseBytes: 0 },
          ...(effect === "upload" ? { fileRefsAccepted: action.fileRefs.length } : {}),
          ...(effect === "download" ? {
            artifact: { name: action.artifactName, bytes: 64, sha256: HASH }
          } : {})
        }
      };
    },
    async closeSession(handle, context) {
      calls.close.push({ handle, context });
      if (closeFailures > 0) {
        closeFailures -= 1;
        throw new Error("temporary close failure");
      }
    }
  };
  return { backend, calls };
}

function makeAdapter(backend, overrides = {}) {
  return createGovernedBrowserAutomation({
    backend,
    policy: {
      allowedActions: BROWSER_AUTOMATION_ACTIONS,
      allowedEffects: BROWSER_AUTOMATION_EFFECTS,
      maxSessions: 4,
      maxActionsPerSession: 50,
      maxOutputBytes: 16_384,
      ...overrides
    }
  });
}

async function open(adapter, authorityInput = authority()) {
  const opened = await adapter.openSession({
    allowedOrigins: authorityInput.allowedOrigins,
    purpose: "bounded integration test"
  }, authorityInput);
  return {
    opened,
    bound: { ...authorityInput, authorityId: opened.authorityId }
  };
}

test("catalog has a validator and dispatch category for every action", () => {
  assert.equal(BROWSER_AUTOMATION_ACTIONS.length, 102);
  assert.equal(BROWSER_AUTOMATION_ACTION_RULES.size, BROWSER_AUTOMATION_ACTIONS.length);
  assert.equal(new Set(BROWSER_AUTOMATION_ACTIONS).size, BROWSER_AUTOMATION_ACTIONS.length);
  for (const category of BROWSER_AUTOMATION_CATEGORIES) {
    assert.ok(BROWSER_AUTOMATION_ACTION_CATALOG.some((entry) => entry.category === category), category);
  }
  for (const entry of BROWSER_AUTOMATION_ACTION_CATALOG) {
    const normalized = normalizeAction(sampleAction(entry.kind), [ORIGIN]);
    assert.equal(normalized.kind, entry.kind);
    assert.equal(normalized.origin, ORIGIN);
  }
  for (const kind of ["tab.open", "tab.close", "tab.switch"]) {
    const entry = BROWSER_AUTOMATION_ACTION_CATALOG.find((item) => item.kind === kind);
    assert.equal(entry.effect, "write");
    assert.equal(BROWSER_AUTOMATION_SAFE_ACTIONS.includes(kind), false);
  }
});

test("generated capability matrix separates catalog, handlers, services, and real-engine verification", () => {
  const matrix = JSON.parse(readFileSync(new URL("../docs/browser-automation-capability-matrix.json", import.meta.url), "utf8"));
  const schema = JSON.parse(readFileSync(new URL("../schemas/browser-automation-capabilities.schema.json", import.meta.url), "utf8"));
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  assert.equal(validate(matrix), true, JSON.stringify(validate.errors));
  assert.equal(matrix.summary.catalogedActions, BROWSER_AUTOMATION_ACTIONS.length);
  assert.equal(matrix.summary.catalogedCategories, BROWSER_AUTOMATION_CATEGORIES.length);
  assert.equal(matrix.summary.builtInHandlerActions, 60);
  assert.equal(matrix.summary.trustedServiceRequiredActions, 11);
  assert.equal(matrix.summary.explicitlyUnsupportedActions, 31);
  assert.equal(matrix.summary.realEngineIntegrationVerifiedActions, 28);
  assert.equal(matrix.actions.length, BROWSER_AUTOMATION_ACTIONS.length);
  assert.deepEqual(matrix.actions.map((entry) => entry.kind), BROWSER_AUTOMATION_ACTIONS);
  assert.ok(matrix.categories.some((entry) => entry.id === "lifecycle-connect" && entry.status === "unsupported"));
  assert.ok(matrix.actions.every((entry) => entry.contract === "cataloged"));
});

test("adapter opens only exact-origin, policy-bounded owned sessions", async () => {
  const fixture = makeBackend();
  const adapter = makeAdapter(fixture.backend);
  const { opened } = await open(adapter);
  assert.match(opened.sessionId, /^session:/);
  assert.match(opened.authorityId, /^authority:/);
  assert.deepEqual(opened.allowedOrigins, [ORIGIN]);
  assert.equal(opened.actionBudget.used, 0);
  assert.equal(fixture.calls.open[0].allowedOrigins[0], ORIGIN);
  assert.equal(Object.hasOwn(fixture.calls.open[0], "endpoint"), false);
  await assert.rejects(
    () => adapter.openSession({ allowedOrigins: [ORIGIN], purpose: "x", initialUrl: `${OTHER_ORIGIN}/` }, authority()),
    (error) => error.code === "BROWSER_AUTOMATION_INPUT_INVALID"
  );
  await assert.rejects(
    () => adapter.openSession({ allowedOrigins: ["https://name:secret@example.com"], purpose: "x" }, authority()),
    (error) => error.code === "BROWSER_AUTOMATION_INPUT_INVALID"
  );
});

test("multi-file upload is reference-only, effect-gated, and fully attested", async () => {
  const fixture = makeBackend();
  const adapter = makeAdapter(fixture.backend);
  const { opened, bound } = await open(adapter);
  const result = await adapter.act({
    sessionId: opened.sessionId,
    action: {
      kind: "upload",
      origin: ORIGIN,
      selector: "input[type=file]",
      fileRefs: ["file:approved-one", "file:approved-two"],
      maxFileBytes: 512,
      maxBytes: 1_024,
      timeoutMs: 5_000
    }
  }, bound);
  assert.equal(result.attestation.fileRefsAccepted, 2);
  assert.deepEqual(fixture.calls.actions[0].action.fileRefs, ["file:approved-one", "file:approved-two"]);
  await assert.rejects(
    () => adapter.act({
      sessionId: opened.sessionId,
      action: { kind: "upload", origin: ORIGIN, selector: "input", fileRefs: ["C:\\secret.txt"], maxFileBytes: 512, maxBytes: 1_024 }
    }, bound),
    (error) => error.code === "BROWSER_AUTOMATION_INPUT_INVALID"
  );
});

test("download authorizes wait/save name, byte ceiling, and SHA-256 evidence", async () => {
  const fixture = makeBackend();
  const adapter = makeAdapter(fixture.backend);
  const { opened, bound } = await open(adapter);
  const result = await adapter.act({
    sessionId: opened.sessionId,
    action: {
      kind: "download",
      origin: ORIGIN,
      selector: "a.export",
      artifactName: "report.zip",
      maxBytes: 1_024,
      timeoutMs: 10_000
    }
  }, bound);
  assert.deepEqual(result.attestation.artifact, { name: "report.zip", bytes: 64, sha256: HASH });

  const badFixture = makeBackend({ resultHook(handle, action) {
    return {
      data: null,
      attestation: {
        action: action.kind,
        effect: "download",
        origin: action.origin,
        sessionBound: true,
        withinBudget: true,
        network: { requests: 0, requestBytes: 0, responseBytes: 0 },
        artifact: { name: action.artifactName, bytes: action.maxBytes + 1, sha256: HASH }
      }
    };
  } });
  const badAdapter = makeAdapter(badFixture.backend);
  const bad = await open(badAdapter);
  await assert.rejects(
    () => badAdapter.act({
      sessionId: bad.opened.sessionId,
      action: { kind: "download", origin: ORIGIN, selector: "a", artifactName: "x.bin", maxBytes: 32 }
    }, bad.bound),
    (error) => error.code === "BROWSER_AUTOMATION_BACKEND_INVALID"
  );
  assert.equal(badFixture.calls.close.length, 1);
  await assert.rejects(
    () => badAdapter.act({
      sessionId: bad.opened.sessionId,
      action: { kind: "page.url", origin: ORIGIN }
    }, bad.bound),
    (error) => error.code === "BROWSER_AUTOMATION_SESSION_NOT_FOUND"
  );
});

test("generic contract validates bounded actions before backend dispatch", async () => {
  const fixture = makeBackend();
  const adapter = makeAdapter(fixture.backend);
  const { opened, bound } = await open(adapter);
  const actions = [
    { kind: "dialog.accept", origin: ORIGIN, promptText: "yes" },
    { kind: "frame.select", origin: ORIGIN, frameId: "frame-one" },
    { kind: "worker.evaluate", origin: ORIGIN, workerId: "worker-one", expressionRef: "expr-one", args: [1] },
    { kind: "permissions.set", origin: ORIGIN, permissions: ["geolocation"] },
    { kind: "geolocation.set", origin: ORIGIN, latitude: 1, longitude: 2, accuracy: 5 },
    { kind: "emulation.set", origin: ORIGIN, settings: { colorScheme: "dark" } },
    { kind: "coverage.start", origin: ORIGIN, resetOnNavigation: true },
    { kind: "console.read", origin: ORIGIN },
    { kind: "selector.register", origin: ORIGIN, name: "data-test", scriptRef: "selector-script" }
  ];
  for (const action of actions) await adapter.act({ sessionId: opened.sessionId, action }, bound);
  assert.deepEqual(fixture.calls.actions.map((entry) => entry.action.kind), actions.map((entry) => entry.kind));
});

test("authority action, effect, origin, and exact session binding fail closed", async () => {
  const fixture = makeBackend();
  const adapter = makeAdapter(fixture.backend);
  const limited = authority({ allowedActions: ["evaluate"], allowedEffects: ["read"], maxActions: 2 });
  const { opened, bound } = await open(adapter, limited);
  await assert.rejects(
    () => adapter.act({
      sessionId: opened.sessionId,
      action: { kind: "evaluate", origin: ORIGIN, expressionRef: "approved-expression" }
    }, bound),
    (error) => error.code === "BROWSER_AUTOMATION_EFFECT_DENIED"
  );
  await assert.rejects(
    () => adapter.act({ sessionId: "session:not-owned", action: { kind: "evaluate", origin: ORIGIN, expressionRef: "x" } }, bound),
    (error) => error.code === "BROWSER_AUTOMATION_SESSION_NOT_FOUND"
  );
  await assert.rejects(
    () => adapter.act({ sessionId: opened.sessionId, action: { kind: "evaluate", origin: OTHER_ORIGIN, expressionRef: "x" } }, bound),
    (error) => error.code === "BROWSER_AUTOMATION_ORIGIN_DENIED"
  );
  await assert.rejects(
    () => adapter.act({ sessionId: opened.sessionId, action: { kind: "evaluate", origin: ORIGIN, expressionRef: "x" } }, { ...bound, principalId: "other" }),
    (error) => error.code === "BROWSER_AUTOMATION_AUTHORITY_DENIED"
  );
});

test("an indeterminate backend failure disposes the metered session after one dispatch", async () => {
  let calls = 0;
  const fixture = makeBackend({ resultHook() {
    calls += 1;
    throw new Error("backend failed");
  } });
  const adapter = makeAdapter(fixture.backend);
  const limited = authority({ allowedActions: ["page.url"], allowedEffects: ["read"], maxActions: 1 });
  const { opened, bound } = await open(adapter, limited);
  await assert.rejects(
    () => adapter.act({ sessionId: opened.sessionId, action: { kind: "page.url", origin: ORIGIN } }, bound),
    (error) => error.code === "BROWSER_AUTOMATION_BACKEND_FAILURE"
  );
  await assert.rejects(
    () => adapter.act({ sessionId: opened.sessionId, action: { kind: "page.url", origin: ORIGIN } }, bound),
    (error) => error.code === "BROWSER_AUTOMATION_SESSION_NOT_FOUND"
  );
  assert.equal(calls, 1);
  assert.equal(fixture.calls.close.length, 1);
});

test("unknown, accessor-backed, sparse, and cross-origin action input never dispatches", async () => {
  const fixture = makeBackend();
  const adapter = makeAdapter(fixture.backend);
  const { opened, bound } = await open(adapter);
  await assert.rejects(
    () => adapter.act({ sessionId: opened.sessionId, action: { kind: "page.url", origin: ORIGIN, surprise: true } }, bound),
    (error) => error.code === "BROWSER_AUTOMATION_INPUT_INVALID"
  );
  let getterCalls = 0;
  const action = { kind: "fill", origin: ORIGIN, selector: "input" };
  Object.defineProperty(action, "text", { enumerable: true, get() { getterCalls += 1; return "secret"; } });
  await assert.rejects(
    () => adapter.act({ sessionId: opened.sessionId, action }, bound),
    (error) => error.code === "BROWSER_AUTOMATION_INPUT_INVALID"
  );
  assert.equal(getterCalls, 0);
  const sparse = [];
  sparse.length = 1;
  await assert.rejects(
    () => adapter.act({ sessionId: opened.sessionId, action: { kind: "select", origin: ORIGIN, selector: "select", values: sparse } }, bound),
    (error) => error.code === "BROWSER_AUTOMATION_INPUT_INVALID"
  );
  assert.equal(fixture.calls.actions.length, 0);
});

test("network routes are exact-origin and response-bounded", async () => {
  const fixture = makeBackend();
  const adapter = makeAdapter(fixture.backend);
  const { opened, bound } = await open(adapter);
  await adapter.act({
    sessionId: opened.sessionId,
    action: {
      kind: "network.route.add",
      origin: ORIGIN,
      route: {
        id: "route-one",
        origin: ORIGIN,
        pathPattern: "/api/*",
        methods: ["GET"],
        response: {
          mode: "fulfill",
          status: 204,
          headers: { "x-source": "fixture" },
          bodyRef: "body-one",
          maxBodyBytes: 1_024
        }
      }
    }
  }, bound);
  await assert.rejects(
    () => adapter.act({
      sessionId: opened.sessionId,
      action: {
        kind: "network.route.add",
        origin: ORIGIN,
        route: { id: "route-two", origin: OTHER_ORIGIN, pathPattern: "/*", response: { mode: "abort" } }
      }
    }, bound),
    (error) => error.code === "BROWSER_AUTOMATION_ORIGIN_DENIED"
  );
});

test("backend output is plain bounded data and cannot smuggle accessors", async () => {
  let getterCalls = 0;
  const fixture = makeBackend({ resultHook(handle, action) {
    const data = {};
    Object.defineProperty(data, "secret", { enumerable: true, get() { getterCalls += 1; return "hidden"; } });
    return {
      data,
      attestation: {
        action: action.kind,
        effect: "read",
        origin: action.origin,
        sessionBound: true,
        withinBudget: true,
        network: { requests: 0, requestBytes: 0, responseBytes: 0 }
      }
    };
  } });
  const adapter = makeAdapter(fixture.backend);
  const limited = authority({ allowedActions: ["page.url"], allowedEffects: ["read"] });
  const { opened, bound } = await open(adapter, limited);
  await assert.rejects(
    () => adapter.act({ sessionId: opened.sessionId, action: { kind: "page.url", origin: ORIGIN } }, bound),
    (error) => error.code === "BROWSER_AUTOMATION_BACKEND_INVALID"
  );
  assert.equal(getterCalls, 0);
});

test("structured output enforces a cumulative UTF-8 byte ceiling during traversal", () => {
  assert.throws(
    () => boundedJson(
      { first: "a".repeat(80), second: "b".repeat(80) },
      "bounded result",
      { maxDepth: 4, maxNodes: 16, maxString: 100, maxBytes: 120 }
    ),
    (error) => error.code === "BROWSER_AUTOMATION_INPUT_INVALID"
      && error.message.includes("byte boundary")
  );
});

test("failed close is sanitized and disposal remains one-shot", async () => {
  const fixture = makeBackend({ failCloseOnce: true });
  const adapter = makeAdapter(fixture.backend);
  const { opened, bound } = await open(adapter);
  await assert.rejects(
    () => adapter.closeSession({ sessionId: opened.sessionId }, bound),
    (error) => error.code === "BROWSER_AUTOMATION_BACKEND_FAILURE"
      && error.cause === undefined
      && !error.message.includes("temporary close failure")
  );
  assert.equal(fixture.calls.close.length, 1);
  await assert.rejects(
    () => adapter.closeSession({ sessionId: opened.sessionId }, bound),
    (error) => error.code === "BROWSER_AUTOMATION_SESSION_CLOSING"
  );
});

test("capability report distinguishes runtime support from policy enablement", () => {
  const fixture = makeBackend({ supportedActions: ["page.url", "upload"] });
  const adapter = createGovernedBrowserAutomation({
    backend: fixture.backend,
    policy: { allowedActions: ["page.url"], allowedEffects: ["read"] }
  });
  const report = adapter.capabilityReport();
  assert.equal(report.totalActions, BROWSER_AUTOMATION_ACTIONS.length);
  assert.equal(report.availableHandlers, 2);
  assert.equal(report.actions.find((entry) => entry.kind === "page.url").sessionEligible, true);
  assert.equal(report.actions.find((entry) => entry.kind === "upload").policy, "disabled");
  assert.equal(report.actions.find((entry) => entry.kind === "evaluate").backendHandler, "unavailable");
  assert.ok(report.categories.some((entry) => entry.status === "partial"));
  assert.equal(report.rawProtocolAccess, false);
  assert.equal(report.ambientProfiles, "factory-must-not-import");
  assert.equal(report.ambientCredentials, "factory-must-not-import");
});

test("action deadlines quarantine a hung backend without blocking the session queue", async () => {
  let closed = 0;
  let dispatched = 0;
  const backend = {
    supportedActions: ["page.url"],
    async openSession() { return {}; },
    async runAction() { dispatched += 1; return new Promise(() => {}); },
    async closeSession() { closed += 1; }
  };
  const adapter = createGovernedBrowserAutomation({
    backend,
    policy: { allowedActions: ["page.url"], allowedEffects: ["read"], maxActionMs: 100 }
  });
  const limited = authority({
    allowedActions: ["page.url"], allowedEffects: ["read"], maxActions: 2, maxActionMs: 100
  });
  const { opened, bound } = await open(adapter, limited);
  const first = adapter.act({ sessionId: opened.sessionId, action: { kind: "page.url", origin: ORIGIN } }, bound);
  const queued = adapter.act({ sessionId: opened.sessionId, action: { kind: "page.url", origin: ORIGIN } }, bound);
  await assert.rejects(
    () => first,
    (error) => error.code === "BROWSER_AUTOMATION_DEADLINE_EXCEEDED"
  );
  await assert.rejects(
    () => queued,
    (error) => error.code === "BROWSER_AUTOMATION_SESSION_NOT_FOUND"
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(closed, 1);
  assert.equal(dispatched, 1);
  await assert.rejects(
    () => adapter.act({ sessionId: opened.sessionId, action: { kind: "page.url", origin: ORIGIN } }, bound),
    (error) => error.code === "BROWSER_AUTOMATION_SESSION_NOT_FOUND"
  );
});

test("per-action and session-total artifact ceilings are committed before dispatch", async () => {
  const fixture = makeBackend();
  const adapter = makeAdapter(fixture.backend);
  const limited = authority({
    allowedActions: ["download"],
    allowedEffects: ["download"],
    maxArtifactBytes: 80,
    maxTotalArtifactBytes: 80
  });
  const { opened, bound } = await open(adapter, limited);
  const action = { kind: "download", origin: ORIGIN, selector: "a", artifactName: "one.bin", maxBytes: 80 };
  const first = await adapter.act({ sessionId: opened.sessionId, action }, bound);
  assert.equal(first.artifactBudget.committedBytes, 80);
  await assert.rejects(
    () => adapter.act({ sessionId: opened.sessionId, action: { ...action, artifactName: "two.bin" } }, bound),
    (error) => error.code === "BROWSER_AUTOMATION_BUDGET_EXCEEDED"
  );
  assert.equal(fixture.calls.actions.length, 1);
});

test("session-total upload ceiling is committed before dispatch", async () => {
  const fixture = makeBackend();
  const adapter = makeAdapter(fixture.backend);
  const limited = authority({
    allowedActions: ["upload"],
    allowedEffects: ["upload"],
    maxUploadBytes: 80,
    maxTotalUploadBytes: 100
  });
  const { opened, bound } = await open(adapter, limited);
  const action = {
    kind: "upload",
    origin: ORIGIN,
    selector: "input[type=file]",
    fileRefs: ["file:one"],
    maxFileBytes: 60,
    maxBytes: 60
  };
  const first = await adapter.act({ sessionId: opened.sessionId, action }, bound);
  assert.equal(first.uploadBudget.committedBytes, 60);
  await assert.rejects(
    () => adapter.act({ sessionId: opened.sessionId, action: { ...action, fileRefs: ["file:two"] } }, bound),
    (error) => error.code === "BROWSER_AUTOMATION_BUDGET_EXCEEDED"
  );
  assert.equal(fixture.calls.actions.length, 1);
});

test("session slots are reserved atomically and late timed-out handles are disposed", async () => {
  let releaseFirst;
  let closes = 0;
  const backend = {
    supportedActions: ["page.url"],
    openSession() { return new Promise((resolve) => { releaseFirst = resolve; }); },
    async runAction() { throw new Error("not used"); },
    async closeSession() { closes += 1; }
  };
  const adapter = createGovernedBrowserAutomation({
    backend,
    policy: { allowedActions: ["page.url"], allowedEffects: ["read"], maxSessions: 1, maxActionMs: 100 }
  });
  const limited = authority({ allowedActions: ["page.url"], allowedEffects: ["read"], maxActionMs: 100 });
  const first = adapter.openSession({ allowedOrigins: [ORIGIN], purpose: "first" }, limited);
  await assert.rejects(
    () => adapter.openSession({ allowedOrigins: [ORIGIN], purpose: "second" }, limited),
    (error) => error.code === "BROWSER_AUTOMATION_BUDGET_EXCEEDED"
  );
  releaseFirst({});
  const opened = await first;
  assert.match(opened.sessionId, /^session:/);

  const lateBackend = {
    supportedActions: ["page.url"],
    async openSession() {
      await new Promise((resolve) => setTimeout(resolve, 125));
      return {};
    },
    async runAction() {},
    async closeSession() { closes += 1; }
  };
  const lateAdapter = createGovernedBrowserAutomation({
    backend: lateBackend,
    policy: { allowedActions: ["page.url"], allowedEffects: ["read"], maxActionMs: 100 }
  });
  await assert.rejects(
    () => lateAdapter.openSession({ allowedOrigins: [ORIGIN], purpose: "late" }, limited),
    (error) => error.code === "BROWSER_AUTOMATION_DEADLINE_EXCEEDED"
  );
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(closes, 1);

  let unresolvedOpens = 0;
  const unresolvedAdapter = createGovernedBrowserAutomation({
    backend: {
      supportedActions: ["page.url"],
      async openSession() { unresolvedOpens += 1; return new Promise(() => {}); },
      async runAction() {},
      async closeSession() {}
    },
    policy: { allowedActions: ["page.url"], allowedEffects: ["read"], maxSessions: 1, maxActionMs: 100 }
  });
  await assert.rejects(
    () => unresolvedAdapter.openSession({ allowedOrigins: [ORIGIN], purpose: "unresolved" }, limited),
    (error) => error.code === "BROWSER_AUTOMATION_DEADLINE_EXCEEDED"
  );
  await assert.rejects(
    () => unresolvedAdapter.openSession({ allowedOrigins: [ORIGIN], purpose: "must remain reserved" }, limited),
    (error) => error.code === "BROWSER_AUTOMATION_BUDGET_EXCEEDED"
  );
  assert.equal(unresolvedOpens, 1);

  let directDeadlineOpens = 0;
  const directDeadlineAdapter = createGovernedBrowserAutomation({
    backend: {
      supportedActions: ["page.url"],
      async openSession() {
        directDeadlineOpens += 1;
        throw new BrowserAutomationError("BROWSER_AUTOMATION_DEADLINE_EXCEEDED", "backend refused immediately");
      },
      async runAction() {},
      async closeSession() {}
    },
    policy: { allowedActions: ["page.url"], allowedEffects: ["read"], maxSessions: 1, maxActionMs: 100 }
  });
  for (const purpose of ["direct-one", "direct-two"]) {
    await assert.rejects(
      () => directDeadlineAdapter.openSession({ allowedOrigins: [ORIGIN], purpose }, limited),
      (error) => error.code === "BROWSER_AUTOMATION_DEADLINE_EXCEEDED"
    );
  }
  assert.equal(directDeadlineOpens, 2);
});

test("a queued action cannot dispatch after a fatal action starts session disposal", async () => {
  let runs = 0;
  let releaseClose;
  const closeGate = new Promise((resolve) => { releaseClose = resolve; });
  const backend = {
    supportedActions: ["page.url"],
    async openSession() { return {}; },
    async runAction(_handle, action) {
      runs += 1;
      if (runs === 1) throw new Error("fatal backend failure");
      return {
        data: null,
        attestation: {
          action: action.kind,
          effect: "read",
          origin: action.origin,
          sessionBound: true,
          withinBudget: true,
          network: { requests: 0, requestBytes: 0, responseBytes: 0 }
        }
      };
    },
    async closeSession() { await closeGate; }
  };
  const adapter = createGovernedBrowserAutomation({
    backend,
    policy: { allowedActions: ["page.url"], allowedEffects: ["read"], maxActionMs: 5_000 }
  });
  const limited = authority({ allowedActions: ["page.url"], allowedEffects: ["read"], maxActionMs: 5_000 });
  const { opened, bound } = await open(adapter, limited);
  const first = adapter.act({ sessionId: opened.sessionId, action: { kind: "page.url", origin: ORIGIN } }, bound);
  const queued = adapter.act({ sessionId: opened.sessionId, action: { kind: "page.url", origin: ORIGIN } }, bound);
  await assert.rejects(
    () => first,
    (error) => error.code === "BROWSER_AUTOMATION_BACKEND_FAILURE"
  );
  await assert.rejects(
    () => queued,
    (error) => error.code === "BROWSER_AUTOMATION_SESSION_CLOSING"
  );
  assert.equal(runs, 1);
  releaseClose();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

test("a closing backend keeps its concurrent session slot until cleanup is confirmed", async () => {
  let releaseClose;
  let markCloseStarted;
  const closeStarted = new Promise((resolve) => { markCloseStarted = resolve; });
  const closeGate = new Promise((resolve) => { releaseClose = resolve; });
  const backend = {
    supportedActions: ["page.url"],
    async openSession() { return {}; },
    async runAction() { throw new Error("not used"); },
    async closeSession() { markCloseStarted(); await closeGate; }
  };
  const adapter = createGovernedBrowserAutomation({
    backend,
    policy: { allowedActions: ["page.url"], allowedEffects: ["read"], maxSessions: 1, maxActionMs: 5_000 }
  });
  const limited = authority({ allowedActions: ["page.url"], allowedEffects: ["read"], maxActionMs: 5_000 });
  const first = await open(adapter, limited);
  const closing = adapter.closeSession({ sessionId: first.opened.sessionId }, first.bound);
  await closeStarted;
  await assert.rejects(
    () => adapter.openSession({ allowedOrigins: [ORIGIN], purpose: "must wait for cleanup" }, limited),
    (error) => error.code === "BROWSER_AUTOMATION_BUDGET_EXCEEDED"
  );
  releaseClose();
  await closing;
  const second = await open(adapter, limited);
  const secondClose = adapter.closeSession({ sessionId: second.opened.sessionId }, second.bound);
  await secondClose;
});

test("public failures drop raw backend causes and redact common secret strings", async () => {
  const rawSecret = "cookie=sessionid=abc Authorization: Basic Zm9vOmJhcg== passcode=123 session=xyz";
  const fixture = makeBackend({ resultHook(handle, action) {
    return {
      data: rawSecret,
      attestation: {
        action: action.kind,
        effect: "read",
        origin: action.origin,
        sessionBound: true,
        withinBudget: true,
        network: { requests: 0, requestBytes: 0, responseBytes: 0 }
      }
    };
  } });
  const adapter = makeAdapter(fixture.backend);
  const limited = authority({ allowedActions: ["page.url"], allowedEffects: ["read"] });
  const { opened, bound } = await open(adapter, limited);
  const result = await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "page.url", origin: ORIGIN }
  }, bound);
  assert.equal(result.data.includes("sessionid=abc"), false);
  assert.equal(result.data.includes("Zm9vOmJhcg"), false);
  assert.equal(result.data.includes("passcode=123"), false);
  assert.equal(result.data.includes("session=xyz"), false);
  assert.match(result.data, /\[redacted\]/);

  const failing = makeBackend({ resultHook() {
    throw new Error("https://example.com/?token=private C:\\secret.txt");
  } });
  const failingAdapter = makeAdapter(failing.backend);
  const failingSession = await open(failingAdapter, limited);
  await assert.rejects(
    () => failingAdapter.act({
      sessionId: failingSession.opened.sessionId,
      action: { kind: "page.url", origin: ORIGIN }
    }, failingSession.bound),
    (error) => error.code === "BROWSER_AUTOMATION_BACKEND_FAILURE"
      && error.cause === undefined
      && !error.message.includes("private")
      && !error.message.includes("secret.txt")
  );

  const coded = makeBackend({ resultHook() {
    throw new BrowserAutomationError(
      "BROWSER_AUTOMATION_ORIGIN_VIOLATION",
      "token=private https://example.com/secret",
      { cause: new Error("cookie=sessionid=abc") }
    );
  } });
  const codedAdapter = makeAdapter(coded.backend);
  const codedSession = await open(codedAdapter, limited);
  await assert.rejects(
    () => codedAdapter.act({
      sessionId: codedSession.opened.sessionId,
      action: { kind: "page.url", origin: ORIGIN }
    }, codedSession.bound),
    (error) => error.code === "BROWSER_AUTOMATION_ORIGIN_VIOLATION"
      && error.cause === undefined
      && error.message === "Browser automation was stopped at its exact-origin boundary."
  );
});

test("session lifetime expires automatically and synchronous close failure cannot escape timer", async () => {
  let closes = 0;
  const backend = {
    supportedActions: ["page.url"],
    async openSession() { return {}; },
    async runAction() { throw new Error("not used"); },
    closeSession() {
      closes += 1;
      throw new Error("timer close failed with token=private");
    }
  };
  const adapter = createGovernedBrowserAutomation({
    backend,
    policy: {
      allowedActions: ["page.url"],
      allowedEffects: ["read"],
      maxSessionMs: 1_000
    }
  });
  const limited = authority({
    allowedActions: ["page.url"],
    allowedEffects: ["read"],
    maxSessionMs: 1_000
  });
  const { opened, bound } = await open(adapter, limited);
  await new Promise((resolve) => setTimeout(resolve, 1_050));
  assert.equal(closes, 1);
  await assert.rejects(
    () => adapter.act({ sessionId: opened.sessionId, action: { kind: "page.url", origin: ORIGIN } }, bound),
    (error) => error.code === "BROWSER_AUTOMATION_SESSION_CLOSING"
  );
});
