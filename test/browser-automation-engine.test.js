import assert from "node:assert/strict";
import test from "node:test";
import {
  BROWSER_AUTOMATION_ACTIONS,
  BROWSER_AUTOMATION_SAFE_ACTIONS,
  createGovernedBrowserAutomation,
  createGovernedPlaywrightBackend,
  GOVERNED_ENGINE_HANDLER_ACTIONS,
  GOVERNED_ENGINE_REQUIRED_SERVICES,
  GOVERNED_ENGINE_UNSUPPORTED_ACTIONS
} from "../src/browser-automation.js";
import { safeUrl, toBuffer } from "../src/browser-automation/engine-helpers.js";

const ORIGIN = "https://example.com";

function fixture({ redirect = false, fillDelay = 0, clickError = false, syncCloseError = false, navigationMethod = null } = {}) {
  const calls = {
    routes: [], clicks: 0, uploads: [], artifacts: [], closes: 0, fills: [], cancelled: 0,
    deleted: 0, offline: [], networkAborts: 0, authorizations: []
  };
  let currentUrl = "about:blank";
  const listeners = new Map();
  const locator = {
    async click() {
      calls.clicks += 1;
      if (clickError) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        throw new Error("click failed");
      }
    },
    async setInputFiles(files) { calls.uploads.push(files); },
    async fill(value) {
      await new Promise((resolve) => setTimeout(resolve, fillDelay));
      calls.fills.push(value);
    },
    async screenshot() { return Buffer.from("locator-image"); }
  };
  const page = {
    keyboard: { async press() {}, async down() {}, async up() {}, async insertText() {} },
    mouse: { async move() {}, async down() {}, async up() {}, async click() {} },
    touchscreen: { async tap() {} },
    on(name, handler) { listeners.set(name, handler); },
    context() { return context; },
    url() { return currentUrl; },
    async goto(url) {
      if (navigationMethod) {
        let aborted = false;
        await calls.routes[0].handler({
          request() {
            return {
              url: () => url,
              method: () => navigationMethod,
              resourceType: () => "fetch"
            };
          },
          async abort() { aborted = true; calls.networkAborts += 1; },
          async continue() {},
          async fallback() {}
        });
        if (aborted) throw new Error("governed request was aborted");
      }
      currentUrl = redirect ? "https://escape.example/redirected" : url;
      return { url: () => currentUrl, status: () => 200, ok: () => true };
    },
    locator() { return locator; },
    async waitForEvent(name) {
      if (name !== "download") throw new Error(`Unexpected event ${name}`);
      const download = {
        async createReadStream() {
          return (async function* stream() { yield Buffer.from("download-body"); }());
        },
        suggestedFilename() { return "server-name.bin"; },
        async cancel() { calls.cancelled += 1; },
        async delete() { calls.deleted += 1; }
      };
      listeners.get("download")?.(download);
      return download;
    },
    async screenshot() { return Buffer.from("page-image"); },
    async pdf() { return Buffer.from("pdf-bytes"); },
    async content() { return "<main>safe</main>"; },
    async title() { return "Example"; },
    async close() {},
    async bringToFront() {}
  };
  const context = {
    async route(pattern, handler) { calls.routes.push({ pattern, handler }); },
    async routeWebSocket() {},
    async addInitScript() {},
    async unroute() {},
    async setOffline(value) { calls.offline.push(value); },
    pages() { return [page]; },
    async newPage() { return page; },
    close() {
      calls.closes += 1;
      if (syncCloseError) throw new Error("synchronous close failure token=private");
      return Promise.resolve();
    }
  };
  const services = {
    async createSession() {
      return {
        context, page, ownedContext: true,
        networkIsolation: { serviceWorkers: "block", webSockets: "block", nonRoutedEgress: "host-blocked" }
      };
    },
    async authorizeRequest(input) { calls.authorizations.push(input); return { allowed: true }; },
    async resolveFileRefs({ fileRefs }) {
      return fileRefs.map((ref, index) => ({
        ref,
        name: `upload-${index}.txt`,
        mimeType: "text/plain",
        buffer: Buffer.from(`file-${index}`)
      }));
    },
    async saveArtifact(value) { calls.artifacts.push(value); },
    async resolveExpression() { return () => null; },
    async resolveScript() { return ""; },
    async resolveStyle() { return ""; },
    async resolveRouteBody() { return ""; },
    async saveState() {},
    async listStates() { return []; },
    async deleteState() {}
  };
  return { page, context, services, calls, locator, listeners };
}

function authority(actions, effects, maximum = 20) {
  return {
    principalId: "engine-test",
    allowedOrigins: [ORIGIN],
    allowedActions: actions,
    allowedEffects: effects,
    maxActions: maximum,
    maxActionMs: 5_000,
    maxSessionMs: 60_000,
    maxArtifactBytes: 8_192,
    maxUploadBytes: 8_192,
    maxTotalArtifactBytes: 65_536,
    maxTotalUploadBytes: 65_536,
    maxNetworkRequestBytes: 8_192,
    maxNetworkResponseBytes: 8_192,
    maxTotalNetworkRequestBytes: 65_536,
    maxTotalNetworkResponseBytes: 65_536
  };
}

async function adapterFixture(config, actions, effects, maximum = 20) {
  const runtimeActions = [...new Set(["navigate", ...actions])];
  const runtimeEffects = [...new Set(["read", ...effects])];
  const backend = createGovernedPlaywrightBackend(config.services);
  const adapter = createGovernedBrowserAutomation({
    backend,
    policy: { allowedActions: runtimeActions, allowedEffects: runtimeEffects, maxActionsPerSession: maximum + 1 }
  });
  const rawAuthority = authority(runtimeActions, runtimeEffects, maximum + 1);
  const opened = await adapter.openSession({
    allowedOrigins: [ORIGIN],
    purpose: "concrete engine test"
  }, rawAuthority);
  const bound = { ...rawAuthority, authorityId: opened.authorityId };
  await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "navigate", origin: ORIGIN, url: `${ORIGIN}/start` }
  }, bound);
  return { backend, adapter, opened, bound };
}

test("concrete backend advertises only mapped handlers and names unsupported families", () => {
  const config = fixture();
  const backend = createGovernedPlaywrightBackend(config.services);
  assert.equal(backend.supportedActions.length, 71);
  assert.equal(GOVERNED_ENGINE_HANDLER_ACTIONS.length, 93);
  assert.equal(GOVERNED_ENGINE_UNSUPPORTED_ACTIONS.length, 31);
  assert.ok(BROWSER_AUTOMATION_SAFE_ACTIONS.every((kind) => backend.supportedActions.includes(kind)));
  for (const kind of BROWSER_AUTOMATION_ACTIONS) {
    const hasMappedHandler = GOVERNED_ENGINE_HANDLER_ACTIONS.includes(kind);
    const isExplicitlyUnsupported = GOVERNED_ENGINE_UNSUPPORTED_ACTIONS.includes(kind);
    const servicesAvailable = (GOVERNED_ENGINE_REQUIRED_SERVICES[kind] ?? [])
      .every((name) => typeof config.services[name] === "function");
    assert.equal(
      backend.supportedActions.includes(kind),
      hasMappedHandler && !isExplicitlyUnsupported && servicesAvailable,
      kind
    );
  }
  for (const kind of ["upload", "navigate", "fill", "cookies.write"]) {
    assert.ok(backend.supportedActions.includes(kind), kind);
  }
  for (const kind of [
    "browser.connect", "context.create", "recording.start", "heap.snapshot", "coverage.start",
    "selector.register", "trace.start", "download", "network.offline", "network.route.add",
    "network.route.remove", "network.headers"
  ]) {
    assert.equal(backend.supportedActions.includes(kind), false, kind);
    assert.ok(GOVERNED_ENGINE_UNSUPPORTED_ACTIONS.includes(kind), kind);
  }
});

test("concrete backend performs bounded ordered multi-file upload", async () => {
  const config = fixture();
  const actions = ["upload"];
  const harness = await adapterFixture(config, actions, ["upload"]);
  const upload = await harness.adapter.act({
    sessionId: harness.opened.sessionId,
    action: {
      kind: "upload",
      origin: ORIGIN,
      selector: "input[type=file]",
      fileRefs: ["file:one", "file:two"],
      maxFileBytes: 32,
      maxBytes: 64
    }
  }, harness.bound);
  assert.equal(upload.attestation.fileRefsAccepted, 2);
  assert.equal(config.calls.uploads[0].length, 2);
  assert.deepEqual(config.calls.uploads[0].map((entry) => entry.name), ["upload-0.txt", "upload-1.txt"]);

  assert.equal(config.calls.artifacts.length, 0);
});

test("resolver identity and aggregate upload limits fail before engine file assignment", async () => {
  const config = fixture();
  config.services.resolveFileRefs = async ({ fileRefs }) => fileRefs.map((ref, index) => ({
    ref: index === 0 ? "file:swapped" : ref,
    name: `${index}.txt`,
    mimeType: "text/plain",
    buffer: Buffer.alloc(40)
  }));
  const harness = await adapterFixture(config, ["upload"], ["upload"]);
  await assert.rejects(
    () => harness.adapter.act({
      sessionId: harness.opened.sessionId,
      action: { kind: "upload", origin: ORIGIN, selector: "input", fileRefs: ["file:one"], maxFileBytes: 32, maxBytes: 32 }
    }, harness.bound),
    (error) => ["BROWSER_AUTOMATION_UPLOAD_LIMIT", "BROWSER_AUTOMATION_UPLOAD_REF_MISMATCH"].includes(error.code)
  );
  assert.equal(config.calls.uploads.length, 0);
});

test("streaming artifact ceiling aborts before fully buffering", async () => {
  let destroyed = false;
  const source = {
    async *[Symbol.asyncIterator]() {
      yield Buffer.alloc(8);
      yield Buffer.alloc(8);
      yield Buffer.alloc(1_000_000);
    },
    destroy() { destroyed = true; }
  };
  await assert.rejects(() => toBuffer(source, "download", 10), (error) => error.code === "BROWSER_AUTOMATION_ARTIFACT_LIMIT");
  assert.equal(destroyed, true);
});

test("ambiguous click-triggered downloads remain explicitly unsupported", () => {
  const backend = createGovernedPlaywrightBackend(fixture().services);
  assert.equal(backend.supportedActions.includes("download"), false);
  assert.ok(GOVERNED_ENGINE_UNSUPPORTED_ACTIONS.includes("download"));
});

test("unsolicited downloads are cancelled, deleted, and quarantine the session", async () => {
  const config = fixture();
  await adapterFixture(config, ["page.url"], ["read"]);
  const unsolicited = {
    async cancel() { config.calls.cancelled += 1; },
    async delete() { config.calls.deleted += 1; }
  };
  config.listeners.get("download")(unsolicited);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(config.calls.cancelled, 1);
  assert.equal(config.calls.deleted, 1);
  assert.equal(config.calls.closes, 1);
});

test("a download emitted during a click can never receive a success attestation", async () => {
  const config = fixture();
  const harness = await adapterFixture(config, ["click"], ["write"]);
  config.locator.click = async () => {
    config.listeners.get("download")({
      async cancel() { config.calls.cancelled += 1; },
      async delete() { config.calls.deleted += 1; }
    });
  };
  await assert.rejects(
    () => harness.adapter.act({
      sessionId: harness.opened.sessionId,
      action: { kind: "click", origin: ORIGIN, selector: "#download" }
    }, harness.bound),
    (error) => error.code === "BROWSER_AUTOMATION_SESSION_QUARANTINED"
  );
  assert.equal(config.calls.closes, 1);
});

test("failed unsolicited-download cleanup quarantines the live session", async () => {
  const config = fixture();
  const harness = await adapterFixture(config, ["page.url"], ["read"]);
  config.listeners.get("download")({
    async cancel() { throw new Error("cancel failed"); },
    async delete() { throw new Error("delete failed"); }
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(config.calls.closes, 1);
  await assert.rejects(
    () => harness.adapter.act({
      sessionId: harness.opened.sessionId,
      action: { kind: "page.url", origin: ORIGIN }
    }, harness.bound),
    (error) => error.code === "BROWSER_AUTOMATION_SESSION_QUARANTINED"
  );
});

test("failed popup and quarantine cleanup cannot produce an unhandled rejection", async () => {
  const config = fixture({ syncCloseError: true });
  await adapterFixture(config, [], []);
  let unhandled;
  const onUnhandled = (error) => { unhandled = error; };
  process.once("unhandledRejection", onUnhandled);
  const popupListeners = new Map();
  const popup = {
    context: () => config.context,
    url: () => `${ORIGIN}/disallowed-popup`,
    on(name, handler) { popupListeners.set(name, handler); },
    async close() { throw new Error("popup close failed"); }
  };
  config.listeners.get("popup")(popup);
  await new Promise((resolve) => setTimeout(resolve, 20));
  process.removeListener("unhandledRejection", onUnhandled);
  assert.equal(config.calls.closes, 1);
  assert.equal(unhandled, undefined);
});

test("a disallowed popup emitted during a click fails the triggering action", async () => {
  const config = fixture();
  const harness = await adapterFixture(config, ["click"], ["write"]);
  config.locator.click = async () => {
    const popupListeners = new Map();
    config.listeners.get("popup")({
      context: () => config.context,
      url: () => `${ORIGIN}/unexpected-popup`,
      on(name, handler) { popupListeners.set(name, handler); },
      async close() {}
    });
  };
  await assert.rejects(
    () => harness.adapter.act({
      sessionId: harness.opened.sessionId,
      action: { kind: "click", origin: ORIGIN, selector: "#popup" }
    }, harness.bound),
    (error) => error.code === "BROWSER_AUTOMATION_SESSION_QUARANTINED"
  );
  assert.equal(config.calls.closes, 1);
});

test("actual target redirect is detected, quarantined, and never attested", async () => {
  const config = fixture({ redirect: true });
  const backend = createGovernedPlaywrightBackend(config.services);
  const adapter = createGovernedBrowserAutomation({
    backend,
    policy: { allowedActions: ["navigate"], allowedEffects: ["read"] }
  });
  const rawAuthority = authority(["navigate"], ["read"]);
  const opened = await adapter.openSession({ allowedOrigins: [ORIGIN], purpose: "redirect test" }, rawAuthority);
  await assert.rejects(
    () => adapter.act({
      sessionId: opened.sessionId,
      action: { kind: "navigate", origin: ORIGIN, url: `${ORIGIN}/redirect` }
    }, { ...rawAuthority, authorityId: opened.authorityId }),
    (error) => error.code === "BROWSER_AUTOMATION_ORIGIN_VIOLATION"
  );
  assert.equal(config.calls.closes, 1);
});

test("an asynchronous navigation-origin quarantine maps to the stable public error", async () => {
  const config = fixture();
  const harness = await adapterFixture(config, [], []);
  let currentUrl = `${ORIGIN}/start`;
  const mainFrame = {};
  config.page.url = () => currentUrl;
  config.page.mainFrame = () => mainFrame;
  config.page.goto = async () => {
    currentUrl = "https://escape.example/outside";
    config.listeners.get("framenavigated")(mainFrame);
    throw new Error("page.goto closed after asynchronous origin violation");
  };
  await assert.rejects(
    () => harness.adapter.act({
      sessionId: harness.opened.sessionId,
      action: { kind: "navigate", origin: ORIGIN, url: `${ORIGIN}/redirect` }
    }, harness.bound),
    (error) => error.code === "BROWSER_AUTOMATION_ORIGIN_VIOLATION"
      && !error.message.includes("page.goto")
  );
  assert.equal(config.calls.closes, 1);
});

test("read actions cannot smuggle same-origin mutating requests through page side effects", async () => {
  const config = fixture({ navigationMethod: "POST" });
  await assert.rejects(
    () => adapterFixture(config, [], []),
    (error) => error.code === "BROWSER_AUTOMATION_EFFECT_DENIED"
  );
  assert.equal(config.calls.networkAborts, 1);
  assert.equal(config.calls.authorizations.length, 0);
  assert.equal(config.calls.closes, 1);
});

test("browser requests outside an active governed action window are aborted", async () => {
  const config = fixture();
  const backend = createGovernedPlaywrightBackend(config.services);
  const adapter = createGovernedBrowserAutomation({
    backend,
    policy: { allowedActions: ["page.url"], allowedEffects: ["read"] }
  });
  const rawAuthority = authority(["page.url"], ["read"]);
  const opened = await adapter.openSession({ allowedOrigins: [ORIGIN], purpose: "background request guard" }, rawAuthority);
  const bound = { ...rawAuthority, authorityId: opened.authorityId };
  await config.calls.routes[0].handler({
    request() {
      return { url: () => `${ORIGIN}/background`, method: () => "GET", resourceType: () => "fetch" };
    },
    async abort() { config.calls.networkAborts += 1; },
    async continue() { throw new Error("background request must not continue"); },
    async fallback() { throw new Error("background request must not continue"); }
  });
  assert.equal(config.calls.networkAborts, 1);
  assert.equal(config.calls.authorizations.length, 0);
  await adapter.closeSession({ sessionId: opened.sessionId }, bound);
});

test("a delayed request authorization cannot outlive its bound action lease", async () => {
  const config = fixture();
  let delayAuthorization = false;
  let releaseAuthorization;
  let markAuthorizationStarted;
  const authorizationStarted = new Promise((resolve) => { markAuthorizationStarted = resolve; });
  const authorizationGate = new Promise((resolve) => { releaseAuthorization = resolve; });
  config.services.authorizeRequest = async (input) => {
    config.calls.authorizations.push(input);
    if (delayAuthorization) {
      markAuthorizationStarted();
      await authorizationGate;
    }
    return { allowed: true };
  };
  const harness = await adapterFixture(config, ["fill"], ["write"]);
  delayAuthorization = true;
  let pendingRequest;
  let continued = 0;
  config.locator.fill = async () => {
    pendingRequest = config.calls.routes[0].handler({
      request() {
        return { url: () => `${ORIGIN}/late`, method: () => "GET", resourceType: () => "fetch" };
      },
      async abort() { config.calls.networkAborts += 1; },
      async continue() { continued += 1; },
      async fallback() { continued += 1; }
    });
    await authorizationStarted;
  };
  const action = harness.adapter.act({
    sessionId: harness.opened.sessionId,
    action: { kind: "fill", origin: ORIGIN, selector: "input", text: "done" }
  }, harness.bound);
  await authorizationStarted;
  await new Promise((resolve) => setImmediate(resolve));
  releaseAuthorization();
  await assert.rejects(
    action,
    (error) => error.code === "BROWSER_AUTOMATION_ORIGIN_VIOLATION"
  );
  await pendingRequest;
  assert.equal(continued, 0);
  assert.equal(config.calls.networkAborts, 1);
  await assert.rejects(
    () => harness.adapter.closeSession({ sessionId: harness.opened.sessionId }, harness.bound),
    (error) => error.code === "BROWSER_AUTOMATION_SESSION_NOT_FOUND"
  );
});

test("ambiguous popup selection remains explicitly unsupported", () => {
  const backend = createGovernedPlaywrightBackend(fixture().services);
  assert.equal(backend.supportedActions.includes("popup.wait"), false);
  assert.ok(GOVERNED_ENGINE_UNSUPPORTED_ACTIONS.includes("popup.wait"));
});

test("failed quarantine cleanup stays fail-closed and retains the adapter slot", async () => {
  const config = fixture({ redirect: true, syncCloseError: true });
  config.services.createSession = async () => ({
    context: config.context,
    page: config.page,
    browserOwned: false,
    ownedContext: true,
    networkIsolation: { serviceWorkers: "block", webSockets: "block", nonRoutedEgress: "host-blocked" }
  });
  const backend = createGovernedPlaywrightBackend(config.services);
  const adapter = createGovernedBrowserAutomation({
    backend,
    policy: { allowedActions: ["navigate"], allowedEffects: ["read"], maxSessions: 1 }
  });
  const rawAuthority = authority(["navigate"], ["read"]);
  const opened = await adapter.openSession(
    { allowedOrigins: [ORIGIN], purpose: "synchronous cleanup" },
    rawAuthority
  );
  await assert.rejects(
    () => adapter.act({
      sessionId: opened.sessionId,
      action: { kind: "navigate", origin: ORIGIN, url: `${ORIGIN}/redirect` }
    }, { ...rawAuthority, authorityId: opened.authorityId }),
    (error) => error.code === "BROWSER_AUTOMATION_BACKEND_FAILURE"
      && error.cause === undefined
      && !error.message.includes("private")
  );
  assert.equal(config.calls.closes, 1);
  await assert.rejects(
    () => adapter.openSession({ allowedOrigins: [ORIGIN], purpose: "slot remains held" }, rawAuthority),
    (error) => error.code === "BROWSER_AUTOMATION_BUDGET_EXCEEDED"
  );
});

test("normal close attempts owned-browser cleanup even when context close rejects", async () => {
  const config = fixture({ syncCloseError: true });
  let browserCloses = 0;
  config.services.createSession = async () => ({
    context: config.context,
    page: config.page,
    browser: { async close() { browserCloses += 1; } },
    browserOwned: true,
    ownedContext: true,
    networkIsolation: { serviceWorkers: "block", webSockets: "block", nonRoutedEgress: "host-blocked" }
  });
  const backend = createGovernedPlaywrightBackend(config.services);
  const adapter = createGovernedBrowserAutomation({
    backend,
    policy: { allowedActions: ["page.url"], allowedEffects: ["read"], maxSessions: 1 }
  });
  const rawAuthority = authority(["page.url"], ["read"]);
  const opened = await adapter.openSession({ allowedOrigins: [ORIGIN], purpose: "owned cleanup" }, rawAuthority);
  await assert.rejects(
    () => adapter.closeSession(
      { sessionId: opened.sessionId },
      { ...rawAuthority, authorityId: opened.authorityId }
    ),
    (error) => error.code === "BROWSER_AUTOMATION_BACKEND_FAILURE"
  );
  assert.equal(config.calls.closes, 1);
  assert.equal(browserCloses, 1);
});

test("an invalid factory isolation attestation closes the returned owned context", async () => {
  const config = fixture();
  config.services.createSession = async () => ({
    context: config.context,
    page: config.page,
    ownedContext: true,
    networkIsolation: { serviceWorkers: "allow", webSockets: "block", nonRoutedEgress: "host-blocked" }
  });
  const backend = createGovernedPlaywrightBackend(config.services);
  const adapter = createGovernedBrowserAutomation({
    backend,
    policy: { allowedActions: ["page.url"], allowedEffects: ["read"] }
  });
  await assert.rejects(
    () => adapter.openSession(
      { allowedOrigins: [ORIGIN], purpose: "invalid isolation attestation" },
      authority(["page.url"], ["read"])
    ),
    (error) => error.code === "BROWSER_AUTOMATION_BACKEND_FAILURE"
  );
  assert.equal(config.calls.closes, 1);
});

test("an uncloseable factory result permanently reserves its adapter capacity", async () => {
  const missingClose = fixture();
  delete missingClose.context.close;
  let missingCloseOpens = 0;
  const originalMissingCreate = missingClose.services.createSession;
  missingClose.services.createSession = async (...args) => {
    missingCloseOpens += 1;
    return originalMissingCreate(...args);
  };
  const missingBackend = createGovernedPlaywrightBackend(missingClose.services);
  const missingAdapter = createGovernedBrowserAutomation({
    backend: missingBackend,
    policy: { allowedActions: ["page.url"], allowedEffects: ["read"], maxSessions: 1 }
  });
  const limited = authority(["page.url"], ["read"]);
  await assert.rejects(
    () => missingAdapter.openSession({ allowedOrigins: [ORIGIN], purpose: "missing cleanup" }, limited),
    (error) => error.code === "BROWSER_AUTOMATION_CLEANUP_UNCONFIRMED"
  );
  await assert.rejects(
    () => missingAdapter.openSession({ allowedOrigins: [ORIGIN], purpose: "capacity must remain held" }, limited),
    (error) => error.code === "BROWSER_AUTOMATION_BUDGET_EXCEEDED"
  );
  assert.equal(missingCloseOpens, 1);

  const invalid = fixture({ syncCloseError: true });
  let invalidOpens = 0;
  invalid.services.createSession = async () => {
    invalidOpens += 1;
    return {
      context: invalid.context,
      page: invalid.page,
      ownedContext: true,
      networkIsolation: { serviceWorkers: "allow", webSockets: "block", nonRoutedEgress: "host-blocked" }
    };
  };
  const invalidAdapter = createGovernedBrowserAutomation({
    backend: createGovernedPlaywrightBackend(invalid.services),
    policy: { allowedActions: ["page.url"], allowedEffects: ["read"], maxSessions: 1 }
  });
  await assert.rejects(
    () => invalidAdapter.openSession({ allowedOrigins: [ORIGIN], purpose: "invalid and uncloseable" }, limited),
    (error) => error.code === "BROWSER_AUTOMATION_CLEANUP_UNCONFIRMED"
  );
  await assert.rejects(
    () => invalidAdapter.openSession({ allowedOrigins: [ORIGIN], purpose: "invalid capacity held" }, limited),
    (error) => error.code === "BROWSER_AUTOMATION_BUDGET_EXCEEDED"
  );
  assert.equal(invalidOpens, 1);
  assert.equal(invalid.calls.closes, 1);
});

test("factory pages must be fresh members of the newly owned context", async () => {
  const foreign = fixture();
  foreign.services.createSession = async () => ({
    context: foreign.context,
    page: { url: () => "about:blank", context: () => ({}) },
    ownedContext: true,
    networkIsolation: { serviceWorkers: "block", webSockets: "block", nonRoutedEgress: "host-blocked" }
  });
  const foreignAdapter = createGovernedBrowserAutomation({
    backend: createGovernedPlaywrightBackend(foreign.services),
    policy: { allowedActions: ["page.url"], allowedEffects: ["read"] }
  });
  await assert.rejects(
    () => foreignAdapter.openSession(
      { allowedOrigins: [ORIGIN], purpose: "foreign page rejection" },
      authority(["page.url"], ["read"])
    ),
    (error) => error.code === "BROWSER_AUTOMATION_BACKEND_FAILURE"
  );
  assert.equal(foreign.calls.closes, 1);

  const preloaded = fixture();
  await preloaded.page.goto(`${ORIGIN}/already-loaded`);
  const preloadedAdapter = createGovernedBrowserAutomation({
    backend: createGovernedPlaywrightBackend(preloaded.services),
    policy: { allowedActions: ["page.url"], allowedEffects: ["read"] }
  });
  await assert.rejects(
    () => preloadedAdapter.openSession(
      { allowedOrigins: [ORIGIN], purpose: "preloaded page rejection" },
      authority(["page.url"], ["read"])
    ),
    (error) => error.code === "BROWSER_AUTOMATION_BACKEND_FAILURE"
  );
  assert.equal(preloaded.calls.closes, 1);
});

test("persistent request mutation handlers stay disabled until they compose with the action network lease", () => {
  const backend = createGovernedPlaywrightBackend(fixture().services);
  for (const kind of ["network.route.add", "network.route.remove", "network.headers", "network.offline"]) {
    assert.equal(backend.supportedActions.includes(kind), false, kind);
    assert.ok(GOVERNED_ENGINE_UNSUPPORTED_ACTIONS.includes(kind), kind);
  }
});

test("page, frame, and worker bursts cross hard ceilings and quarantine the context", async () => {
  const pages = fixture();
  await adapterFixture(pages, ["page.url"], ["read"]);
  let excessPageCloses = 0;
  for (let index = 0; index < 16; index += 1) {
    const popupListeners = new Map();
    const popup = {
      context: () => pages.context,
      url: () => `${ORIGIN}/popup-${index}`,
      on(name, handler) { popupListeners.set(name, handler); },
      close() { excessPageCloses += 1; return Promise.resolve(); }
    };
    pages.listeners.get("popup")(popup);
  }
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(pages.calls.closes, 1);
  assert.equal(excessPageCloses, 16);

  const frames = fixture();
  await adapterFixture(frames, ["frame.list"], ["read"]);
  for (let index = 0; index < 257; index += 1) frames.listeners.get("frameattached")({ index });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(frames.calls.closes, 1);

  const workers = fixture();
  await adapterFixture(workers, ["worker.list"], ["read"]);
  for (let index = 0; index < 65; index += 1) workers.listeners.get("worker")({ index });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(workers.calls.closes, 1);
});

test("a resource burst during dispatch can never receive a within-budget attestation", async () => {
  const config = fixture();
  const harness = await adapterFixture(config, [], []);
  config.page.goto = async (url) => {
    for (let index = 0; index < 257; index += 1) config.listeners.get("frameattached")({ index });
    return { url: () => url, status: () => 200, ok: () => true };
  };
  await assert.rejects(
    () => harness.adapter.act({
      sessionId: harness.opened.sessionId,
      action: { kind: "navigate", origin: ORIGIN, url: `${ORIGIN}/burst` }
    }, harness.bound),
    (error) => error.code === "BROWSER_AUTOMATION_SESSION_QUARANTINED"
  );
  assert.equal(config.calls.closes, 1);
});

test("adapter serializes concrete target mutations and captures stable action numbers", async () => {
  const config = fixture({ fillDelay: 10 });
  const harness = await adapterFixture(config, ["fill"], ["write"], 2);
  const first = harness.adapter.act({
    sessionId: harness.opened.sessionId,
    action: { kind: "fill", origin: ORIGIN, selector: "input", text: "first" }
  }, harness.bound);
  const second = harness.adapter.act({
    sessionId: harness.opened.sessionId,
    action: { kind: "fill", origin: ORIGIN, selector: "input", text: "second" }
  }, harness.bound);
  const [one, two] = await Promise.all([first, second]);
  assert.deepEqual(config.calls.fills, ["first", "second"]);
  assert.deepEqual([one.actionNumber, two.actionNumber], [2, 3]);
});

test("public URLs redact credentials, fragments, and query values", () => {
  const visible = safeUrl("https://name:secret@example.com/path?token=abc&next=/home#private");
  assert.equal(visible.includes("secret"), false);
  assert.equal(visible.includes("abc"), false);
  assert.equal(visible.includes("private"), false);
  assert.equal(visible, "https://example.com/path?token=%5Bredacted%5D&next=%5Bredacted%5D");
});
