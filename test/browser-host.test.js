import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PROHIBITED_EFFECTS,
  createBrowserHost
} from "../src/browser-host.js";

const APP_ORIGIN = "https://app.example";
const NEXT_ORIGIN = "https://next.example";

function effects(overrides = {}) {
  return {
    externalProtocol: false,
    download: false,
    filesystemRead: false,
    filesystemWrite: false,
    filePicker: false,
    clipboardRead: false,
    clipboardWrite: false,
    permissionPrompt: false,
    printDialog: false,
    modalDialog: false,
    ...overrides
  };
}

function execution(method, origins, { approved = false, signal = null } = {}) {
  return {
    schemaVersion: "maqam.browser-driver-execution.v1",
    runId: `run-${method}`,
    toolName: `browser.${method}`,
    inputHash: `input-${method}`,
    approvalIds: approved ? [`approval-${method}`] : [],
    approvalActions: approved ? [`effect:browser:${method}`] : [],
    authorizedOrigins: origins,
    prohibitedEffects: [...PROHIBITED_EFFECTS],
    signal
  };
}

function approvedPlan(core) {
  return {
    ...core,
    planHash: "a".repeat(64),
    planToken: "v1.test.signed"
  };
}

function createFixture({ badEffects = null, submitFailure = null } = {}) {
  const calls = {
    openSession: [],
    snapshot: [],
    apply: [],
    submit: [],
    pageClose: [],
    sessionClose: 0,
    resolved: []
  };
  const handles = {
    name: { runtime: "name" },
    agree: { runtime: "agree" },
    country: { runtime: "country" },
    save: { runtime: "save" },
    link: { runtime: "link" }
  };
  let session;

  function makePage(url = `${APP_ORIGIN}/form?private=yes#account`) {
    const state = {
      url,
      title: "Account form",
      documentRevision: "document-1",
      elements: [
        { handle: handles.name, role: "textbox", name: "Name", states: { required: true } },
        { handle: handles.agree, role: "checkbox", name: "Agree", states: { checked: false } },
        { handle: handles.country, role: "combobox", name: "Country", states: {} },
        { handle: handles.save, role: "button", name: "Save", states: {} },
        { handle: handles.link, role: "link", name: "Continue", states: {} }
      ]
    };
    const page = {
      async snapshot(input) {
        calls.snapshot.push({ page, input });
        return {
          documentRevision: state.documentRevision,
          url: state.url,
          title: state.title,
          elements: state.elements
        };
      },
      async apply(operations, context) {
        calls.apply.push({ page, operations, context });
        state.documentRevision = `document-${Number(state.documentRevision.split("-")[1]) + 1}`;
        return { effects: badEffects ?? effects() };
      },
      async submit(operation, context) {
        calls.submit.push({ page, operation, context });
        if (submitFailure) throw submitFailure;
        let destination = page;
        const nextUrl = operation.kind === "navigate"
          ? operation.url
          : `${operation.expectedOrigin}/complete`;
        if (operation.opensNewPage) {
          destination = makePage(nextUrl);
          session.pages.push(destination);
        } else {
          state.url = nextUrl;
          state.documentRevision = `document-${Number(state.documentRevision.split("-")[1]) + 1}`;
        }
        return { effects: badEffects ?? effects(), page: destination };
      },
      async close() {
        calls.pageClose.push(page);
        session.pages = session.pages.filter((item) => item !== page);
      }
    };
    Object.defineProperty(page, "state", { value: state });
    return page;
  }

  const runtime = {
    async openSession(input) {
      calls.openSession.push(input);
      const initialPage = makePage(input.initialUrl ?? `${APP_ORIGIN}/form`);
      session = {
        pages: [initialPage],
        async listPages() {
          return [...session.pages];
        },
        async close() {
          calls.sessionClose += 1;
          session.pages = [];
        }
      };
      return session;
    }
  };

  const host = createBrowserHost({
    runtime,
    async resolveValueRef(valueRef, context) {
      calls.resolved.push({ valueRef, context });
      return "Ada Lovelace";
    },
    limits: { maxElements: 20 }
  });
  return { host, calls, handles, get session() { return session; } };
}

async function open(fixture, origins = [APP_ORIGIN, NEXT_ORIGIN]) {
  return fixture.host.openSession({
    allowedOrigins: origins,
    initialUrl: `${APP_ORIGIN}/form?private=yes#account`
  });
}

async function observe(fixture, target, maxElements = 20) {
  return fixture.host.observe(
    { target, maxElements },
    execution("observe", [target.origin])
  );
}

test("host exposes own Maqam methods, trusted lifecycle, opaque IDs, and honest capabilities", async () => {
  const fixture = createFixture();
  for (const method of [
    "observe", "preview", "apply", "submit", "openSession", "listPages", "closePage",
    "closeSession", "close", "capabilityReport"
  ]) {
    const descriptor = Object.getOwnPropertyDescriptor(fixture.host, method);
    assert.equal(descriptor.enumerable, true);
    assert.equal(typeof descriptor.value, "function");
  }

  const capability = fixture.host.capabilityReport();
  assert.equal(capability.maqamDriverCompatible, true);
  assert.equal(capability.playwright.bundled, false);
  assert.equal(capability.playwright.pinnedInteractiveNetworking, false);
  assert.match(capability.limitations[2], /not yet provided/);
  assert.equal(Object.isFrozen(capability), true);

  const opened = await open(fixture);
  assert.equal(opened.schemaVersion, "cockroach.browser-host.v1");
  assert.equal(opened.pages.length, 1);
  assert.equal(opened.pages[0].target.revision, "revision-1");
  assert.equal(opened.pages[0].url, `${APP_ORIGIN}/form?private=%5BREDACTED%5D#[REDACTED]`);
  assert.equal(fixture.calls.openSession[0].signal, null);

  const observed = await observe(fixture, opened.pages[0].target);
  assert.equal(observed.elements.length, 5);
  assert.equal(observed.elements.every((item) => item.elementId.startsWith("element-")), true);
  assert.equal(observed.elements.some((item) => item.elementId.includes("name")), false);
  assert.equal(Object.hasOwn(observed.elements[0], "handle"), false);
  assert.equal(Object.isFrozen(observed.elements), true);
  assert.deepEqual(await fixture.host.listPages({ sessionId: opened.sessionId }), opened.pages);
});

test("preview enforces element role compatibility and stale document revisions", async () => {
  const fixture = createFixture();
  const opened = await open(fixture);
  const observed = await observe(fixture, opened.pages[0].target);
  const textbox = observed.elements.find((item) => item.role === "textbox");
  const button = observed.elements.find((item) => item.role === "button");

  const core = await fixture.host.preview({
    target: observed.target,
    phase: "apply",
    operations: [{ kind: "setValueRef", elementId: textbox.elementId, valueRef: "ref:user.name" }]
  }, execution("preview", [APP_ORIGIN]));
  assert.equal(core.schemaVersion, "maqam.browser-plan.v1");
  assert.equal(core.operations[0].valueRef, "ref:user.name");

  await assert.rejects(
    () => fixture.host.preview({
      target: observed.target,
      phase: "apply",
      operations: [{ kind: "setChecked", elementId: button.elementId, checked: true }]
    }, execution("preview", [APP_ORIGIN])),
    (error) => error.code === "BROWSER_HOST_OPERATION_ROLE_DENIED"
  );

  fixture.session.pages[0].state.documentRevision = "document-external-change";
  await assert.rejects(
    () => fixture.host.preview({
      target: observed.target,
      phase: "apply",
      operations: [{ kind: "setValueRef", elementId: textbox.elementId, valueRef: "ref:user.name" }]
    }, execution("preview", [APP_ORIGIN])),
    (error) => error.code === "BROWSER_HOST_TARGET_STALE"
  );
  const pages = await fixture.host.listPages({ sessionId: opened.sessionId });
  assert.equal(pages[0].target.revision, "revision-2");
});

test("apply resolves refs only after exact approval, preserves runtime handle, and deduplicates", async () => {
  const fixture = createFixture();
  const opened = await open(fixture);
  const observed = await observe(fixture, opened.pages[0].target);
  const textbox = observed.elements.find((item) => item.role === "textbox");
  const core = await fixture.host.preview({
    target: observed.target,
    phase: "apply",
    operations: [{ kind: "setValueRef", elementId: textbox.elementId, valueRef: "ref:user.name" }]
  }, execution("preview", [APP_ORIGIN]));
  const plan = approvedPlan(core);

  await assert.rejects(
    () => fixture.host.apply(
      { plan, operationId: "apply-once" },
      execution("apply", [APP_ORIGIN])
    ),
    (error) => error.code === "BROWSER_HOST_APPROVAL_REQUIRED"
  );
  assert.equal(fixture.calls.resolved.length, 0);
  assert.equal(fixture.calls.apply.length, 0);

  const first = await fixture.host.apply(
    { plan, operationId: "apply-once" },
    execution("apply", [APP_ORIGIN], { approved: true })
  );
  assert.equal(first.target.revision, "revision-2");
  assert.deepEqual(first.effects, effects());
  assert.equal(fixture.calls.resolved.length, 1);
  assert.equal(fixture.calls.apply.length, 1);
  assert.equal(fixture.calls.apply[0].operations[0].handle, fixture.handles.name);
  assert.equal(fixture.calls.apply[0].operations[0].value, "Ada Lovelace");
  assert.deepEqual(fixture.calls.apply[0].context.prohibitedEffects, PROHIBITED_EFFECTS);

  const duplicate = await fixture.host.apply(
    { plan, operationId: "apply-once" },
    execution("apply", [APP_ORIGIN], { approved: true })
  );
  assert.deepEqual(duplicate, first);
  assert.equal(fixture.calls.resolved.length, 1);
  assert.equal(fixture.calls.apply.length, 1);

  await assert.rejects(
    () => fixture.host.apply(
      { plan: { ...plan, planHash: "b".repeat(64) }, operationId: "apply-once" },
      execution("apply", [APP_ORIGIN], { approved: true })
    ),
    (error) => error.code === "BROWSER_HOST_OPERATION_CONFLICT"
  );
});

test("apply fails closed on effect attestation and never returns raw values", async () => {
  const fixture = createFixture({ badEffects: effects({ download: true }) });
  const opened = await open(fixture);
  const observed = await observe(fixture, opened.pages[0].target);
  const checkbox = observed.elements.find((item) => item.role === "checkbox");
  const core = await fixture.host.preview({
    target: observed.target,
    phase: "apply",
    operations: [{ kind: "setChecked", elementId: checkbox.elementId, checked: true }]
  }, execution("preview", [APP_ORIGIN]));
  await assert.rejects(
    () => fixture.host.apply(
      { plan: approvedPlan(core), operationId: "unsafe-effect" },
      execution("apply", [APP_ORIGIN], { approved: true })
    ),
    (error) => error.code === "BROWSER_HOST_EFFECT_VIOLATION"
  );
});

test("submit binds origin and page identity for same-page and new-page commits", async () => {
  const fixture = createFixture();
  const opened = await open(fixture);
  let target = opened.pages[0].target;
  const sameCore = await fixture.host.preview({
    target,
    phase: "submit",
    operations: [{
      kind: "navigate",
      url: `${NEXT_ORIGIN}/done`,
      expectedOrigin: NEXT_ORIGIN,
      opensNewPage: false
    }]
  }, execution("preview", [APP_ORIGIN, NEXT_ORIGIN]));
  assert.equal(sameCore.operations[0].expectedOrigin, NEXT_ORIGIN);
  assert.equal(Object.getOwnPropertyDescriptor(sameCore.operations, "0").value.expectedOrigin, NEXT_ORIGIN);
  const sameResult = await fixture.host.submit(
    { plan: approvedPlan(sameCore), operationId: "submit-same" },
    execution("submit", [APP_ORIGIN, NEXT_ORIGIN], { approved: true })
  );
  assert.equal(sameResult.target.pageId, target.pageId);
  assert.equal(sameResult.target.origin, NEXT_ORIGIN);
  assert.equal(sameResult.target.revision, "revision-2");

  target = sameResult.target;
  const newCore = await fixture.host.preview({
    target,
    phase: "submit",
    operations: [{
      kind: "navigate",
      url: `${APP_ORIGIN}/new`,
      expectedOrigin: APP_ORIGIN,
      opensNewPage: true
    }]
  }, execution("preview", [NEXT_ORIGIN, APP_ORIGIN]));
  const newResult = await fixture.host.submit(
    { plan: approvedPlan(newCore), operationId: "submit-new" },
    execution("submit", [NEXT_ORIGIN, APP_ORIGIN], { approved: true })
  );
  assert.notEqual(newResult.target.pageId, target.pageId);
  assert.equal(newResult.target.origin, APP_ORIGIN);
  assert.equal(newResult.target.revision, "revision-1");
  assert.equal((await fixture.host.listPages({ sessionId: opened.sessionId })).length, 2);
});

test("configuration, accessors, runtime roles, origins, and lifecycle fail closed", async () => {
  let getterCalls = 0;
  const accessorRuntime = {};
  Object.defineProperty(accessorRuntime, "openSession", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return async () => null;
    }
  });
  assert.throws(
    () => createBrowserHost({ runtime: accessorRuntime, resolveValueRef: () => "x" }),
    (error) => error.code === "BROWSER_HOST_RUNTIME_INVALID"
  );
  assert.equal(getterCalls, 0);

  const fixture = createFixture();
  await assert.rejects(
    () => fixture.host.openSession({
      allowedOrigins: [APP_ORIGIN],
      initialUrl: `${NEXT_ORIGIN}/outside`
    }),
    (error) => error.code === "BROWSER_HOST_ORIGIN_DENIED"
  );

  const opened = await open(fixture);
  const pageId = opened.pages[0].target.pageId;
  await fixture.host.closePage({ sessionId: opened.sessionId, pageId });
  assert.equal(fixture.calls.pageClose.length, 1);
  assert.deepEqual(await fixture.host.listPages({ sessionId: opened.sessionId }), []);
  await fixture.host.closeSession({ sessionId: opened.sessionId });
  assert.equal(fixture.calls.sessionClose, 1);
  await fixture.host.close();
  await fixture.host.close();
  await assert.rejects(
    () => fixture.host.openSession({ allowedOrigins: [APP_ORIGIN] }),
    (error) => error.code === "BROWSER_HOST_CLOSED"
  );
});

test("malformed plans, incomplete effect boundaries, and cancellation stop before dispatch", async () => {
  const fixture = createFixture();
  const opened = await open(fixture);
  const observed = await observe(fixture, opened.pages[0].target);
  const checkbox = observed.elements.find((item) => item.role === "checkbox");
  const core = await fixture.host.preview({
    target: observed.target,
    phase: "apply",
    operations: [{ kind: "setChecked", elementId: checkbox.elementId, checked: true }]
  }, execution("preview", [APP_ORIGIN]));
  const plan = approvedPlan(core);

  let getterCalls = 0;
  const accessorPlan = { ...plan };
  Object.defineProperty(accessorPlan, "planHash", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "a".repeat(64);
    }
  });
  await assert.rejects(
    () => fixture.host.apply(
      { plan: accessorPlan, operationId: "accessor-plan" },
      execution("apply", [APP_ORIGIN], { approved: true })
    ),
    (error) => error.code === "BROWSER_HOST_INPUT_INVALID"
  );
  assert.equal(getterCalls, 0);

  const incomplete = execution("apply", [APP_ORIGIN], { approved: true });
  incomplete.prohibitedEffects = incomplete.prohibitedEffects.slice(1);
  await assert.rejects(
    () => fixture.host.apply({ plan, operationId: "missing-boundary" }, incomplete),
    (error) => error.code === "BROWSER_HOST_EFFECT_BOUNDARY_MISSING"
  );

  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    () => fixture.host.apply(
      { plan, operationId: "aborted" },
      execution("apply", [APP_ORIGIN], { approved: true, signal: controller.signal })
    ),
    (error) => error.code === "BROWSER_HOST_ABORTED"
  );
  assert.equal(fixture.calls.apply.length, 0);
});

test("an indeterminate submit failure is cached and never dispatched twice", async () => {
  const runtimeError = new Error("connection closed after click");
  const fixture = createFixture({ submitFailure: runtimeError });
  const opened = await open(fixture);
  const core = await fixture.host.preview({
    target: opened.pages[0].target,
    phase: "submit",
    operations: [{
      kind: "navigate",
      url: `${NEXT_ORIGIN}/commit`,
      expectedOrigin: NEXT_ORIGIN,
      opensNewPage: false
    }]
  }, execution("preview", [APP_ORIGIN, NEXT_ORIGIN]));
  const input = { plan: approvedPlan(core), operationId: "indeterminate-submit" };
  const approved = execution("submit", [APP_ORIGIN, NEXT_ORIGIN], { approved: true });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await assert.rejects(
      () => fixture.host.submit(input, approved),
      (error) => error.code === "BROWSER_HOST_RUNTIME_FAILURE"
        && error.cause === runtimeError
    );
  }
  assert.equal(fixture.calls.submit.length, 1);
});
