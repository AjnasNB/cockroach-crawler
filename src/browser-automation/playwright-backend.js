import { BROWSER_AUTOMATION_ACTIONS, browserAutomationEffectForAction } from "./catalog.js";
import { BrowserAutomationError, browserAutomationFail } from "./errors.js";
import {
  activePage,
  frameId,
  optionalMethod,
  pageId,
  requiredMethod,
  safeUrl,
  workerId
} from "./engine-helpers.js";
import { navigationHandlers } from "./engine-navigation.js";
import { inputHandlers } from "./engine-input.js";
import { fileHandlers } from "./engine-files.js";
import { evaluationHandlers, attachWorkerTracking } from "./engine-evaluation.js";
import { networkHandlers, attachNetworkTracking, installNetworkBoundary } from "./engine-network.js";
import { stateHandlers } from "./engine-state.js";
import { observabilityHandlers, attachConsoleTracking } from "./engine-observability.js";

const BASE_HANDLERS = Object.freeze({
  ...navigationHandlers,
  ...inputHandlers,
  ...fileHandlers,
  ...evaluationHandlers,
  ...networkHandlers,
  ...stateHandlers,
  ...observabilityHandlers
});

const MAX_PAGES_PER_SESSION = 16;
const MAX_FRAMES_PER_SESSION = 256;
const MAX_WORKERS_PER_SESSION = 64;
const MAX_REQUESTS_PER_ACTION = 128;
const MAX_REQUESTS_PER_SESSION = 4_096;

const INTENTIONALLY_UNSUPPORTED = new Set([
  "browser.connect", "browser.disconnect", "context.create", "context.close",
  "tab.lock", "tab.unlock", "tab.lock.status",
  "recording.start", "recording.stop", "heap.snapshot", "trace.start", "trace.stop",
  "coverage.start", "coverage.stop", "network.cache", "accessibility.snapshot",
  "selector.register", "selector.unregister", "selector.list",
  "dialog.wait", "dialog.accept", "dialog.dismiss", "state.load", "emulation.set",
  "worker.evaluate", "download", "network.offline", "network.route.add", "network.route.remove",
  "network.headers"
]);

export const GOVERNED_ENGINE_REQUIRED_SERVICES = Object.freeze({
  upload: ["resolveFileRefs"],
  screenshot: ["saveArtifact"],
  pdf: ["saveArtifact"],
  "capture.paired": ["saveArtifact"],
  "network.export": ["saveArtifact"],
  "coverage.stop": ["saveArtifact"],
  evaluate: ["resolveExpression"],
  "worker.evaluate": ["resolveExpression"],
  "script.add": ["resolveScript"],
  "style.add": ["resolveStyle"],
  "network.route.add": ["resolveRouteBody"],
  "state.save": ["saveState"],
  "state.list": ["listStates"],
  "state.delete": ["deleteState"],
  "selector.register": ["resolveScript"]
});

function ownMethod(value, key, required = false) {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor) {
    if (!required) return undefined;
    browserAutomationFail("BROWSER_AUTOMATION_BACKEND_INVALID", `Engine service '${key}' is required.`);
  }
  if (!descriptor.enumerable || !("value" in descriptor) || typeof descriptor.value !== "function") {
    browserAutomationFail("BROWSER_AUTOMATION_BACKEND_INVALID", `Engine service '${key}' must be an enumerable own data method.`);
  }
  return descriptor.value.bind(value);
}

function servicesFrom(options) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    browserAutomationFail("BROWSER_AUTOMATION_BACKEND_INVALID", "Engine backend options must be an object.");
  }
  const allowed = new Set([
    "createSession", "authorizeRequest", "resolveFileRefs", "saveArtifact", "resolveExpression",
    "resolveScript", "resolveStyle", "resolveRouteBody", "saveState",
    "listStates", "deleteState"
  ]);
  for (const key of Object.keys(options)) {
    if (!allowed.has(key)) browserAutomationFail("BROWSER_AUTOMATION_BACKEND_INVALID", `Unknown engine backend option '${key}'.`);
  }
  const services = {
    createSession: ownMethod(options, "createSession", true),
    authorizeRequest: ownMethod(options, "authorizeRequest", true)
  };
  for (const key of [...allowed].slice(2)) services[key] = ownMethod(options, key);
  return Object.freeze(services);
}

function handlerRegistry(services) {
  const handlers = Object.create(null);
  for (const [kind, handler] of Object.entries(BASE_HANDLERS)) {
    if (INTENTIONALLY_UNSUPPORTED.has(kind)) continue;
    const required = GOVERNED_ENGINE_REQUIRED_SERVICES[kind] ?? [];
    if (required.every((name) => typeof services[name] === "function")) handlers[kind] = handler;
  }
  return Object.freeze(handlers);
}

function originOf(target) {
  if (!target) return null;
  const raw = optionalMethod(target, "url")?.() ?? "";
  if (!raw || raw === "about:blank") return null;
  try {
    const parsed = new URL(raw);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.origin : "denied:";
  } catch {
    return "denied:";
  }
}

function actualOrigin(session) {
  return originOf(session.activePage);
}

async function quarantine(session, reason) {
  if (session.quarantinePromise) {
    await session.quarantinePromise;
    return;
  }
  session.quarantined = true;
  session.quarantineReason = reason;
  const pendingError = new BrowserAutomationError(
    "BROWSER_AUTOMATION_SESSION_QUARANTINED",
    "The governed browser session was quarantined."
  );
  for (const waiter of session.popupWaiters.splice(0)) waiter.reject(pendingError);
  session.quarantinePromise = Promise.all([
    Promise.resolve().then(() => requiredMethod(session.context, "close", "session-quarantine")({ reason })),
    Promise.resolve().then(() => session.browserOwned
      ? requiredMethod(session.browser, "close", "session-quarantine")()
      : undefined)
  ]).then(() => undefined);
  session.quarantinePromise.catch(() => {});
  await session.quarantinePromise;
}

async function discardDownload(download) {
  let failed = false;
  try {
    await requiredMethod(download, "cancel", "download-guard")();
  } catch {
    failed = true;
  }
  try {
    await requiredMethod(download, "delete", "download-guard")();
  } catch {
    failed = true;
  }
  if (failed) {
    browserAutomationFail(
      "BROWSER_AUTOMATION_CLEANUP_UNCONFIRMED",
      "An unsolicited browser download could not be safely canceled and deleted."
    );
  }
}

async function assertTargetOrigin(session, action, phase) {
  const observed = actualOrigin(session);
  const frameOrigin = originOf(session.activeFrame);
  if ((!observed || (session.activeFrame && !frameOrigin)) && phase === "pre-dispatch" && !["navigate", "tab.open"].includes(action.kind)) {
    await quarantine(session, `${phase} unbound target`);
    browserAutomationFail(
      "BROWSER_AUTOMATION_ORIGIN_VIOLATION",
      "Browser target has no bound HTTP(S) origin for this action."
    );
  }
  if ((!observed || (session.activeFrame && !frameOrigin)) && phase === "post-dispatch" && !["tab.close", "tab.open"].includes(action.kind)) {
    await quarantine(session, `${phase} unbound target`);
    browserAutomationFail(
      "BROWSER_AUTOMATION_ORIGIN_VIOLATION",
      "Browser action completed without an exact HTTP(S) target origin."
    );
  }
  if ((observed && observed !== action.origin) || (frameOrigin && frameOrigin !== action.origin)) {
    await quarantine(session, `${phase} origin violation`);
    browserAutomationFail(
      "BROWSER_AUTOMATION_ORIGIN_VIOLATION",
      `Browser target escaped its exact origin authority during ${phase}.`
    );
  }
}

function forgetPage(session, page) {
  for (const [id, candidate] of session.pages) {
    if (candidate === page) session.pages.delete(id);
  }
  if (session.activePage === page) {
    session.activePage = [...session.pages.values()][0] ?? null;
    session.activeFrame = null;
  }
  for (let index = session.popupQueue.length - 1; index >= 0; index -= 1) {
    if (session.popupQueue[index] === page) session.popupQueue.splice(index, 1);
  }
}

function attachPage(session, page) {
  if (session.attachedPages.has(page)) return;
  const pageContext = optionalMethod(page, "context")?.();
  if (pageContext && pageContext !== session.context) {
    browserAutomationFail("BROWSER_AUTOMATION_ORIGIN_VIOLATION", "A page outside the owned browser context was rejected.");
  }
  if (!session.pageIds.has(page) && session.pages.size >= MAX_PAGES_PER_SESSION) {
    void Promise.resolve().then(() => optionalMethod(page, "close")?.()).catch(() => {});
    void quarantine(session, "page resource limit exceeded").catch(() => {});
    browserAutomationFail("BROWSER_AUTOMATION_RESOURCE_LIMIT", "The governed browser session exceeded its page limit.");
  }
  session.attachedPages.add(page);
  pageId(session, page);
  attachWorkerTracking(session, page);
  attachNetworkTracking(session, page);
  attachConsoleTracking(session, page);
  if (typeof page?.on === "function") {
    page.on("popup", (popup) => {
      try {
        attachPage(session, popup);
        if (!session.allowedActions.includes("popup.wait")) {
          void Promise.resolve()
            .then(() => requiredMethod(popup, "close", "popup-guard")())
            .then(() => forgetPage(session, popup))
            .catch(() => {});
          void quarantine(session, "disallowed popup was created").catch(() => {});
          return;
        }
        const waiter = session.popupWaiters.shift();
        if (waiter) waiter.resolve(popup);
        else session.popupQueue.push(popup);
      } catch {
        void quarantine(session, "popup resource limit exceeded").catch(() => {});
      }
    });
    page.on("download", (download) => {
      void discardDownload(download).catch(() => {});
      void quarantine(session, "browser download event is unsupported").catch(() => {});
    });
    page.on("close", () => forgetPage(session, page));
    page.on("frameattached", (value) => session.registerFrame(value));
    page.on("framenavigated", (frame) => {
      const mainFrame = optionalMethod(page, "mainFrame")?.();
      if (mainFrame && frame !== mainFrame) return;
      try {
        session.assertPageOrigin(page);
      } catch {
        session.violationCode = "BROWSER_AUTOMATION_ORIGIN_VIOLATION";
        quarantine(session, "asynchronous page origin violation").catch(() => {});
      }
    });
  }
}

function assertSingleOrigin(input) {
  if (!Array.isArray(input.allowedOrigins) || input.allowedOrigins.length !== 1) {
    browserAutomationFail(
      "BROWSER_AUTOMATION_ENGINE_UNSUPPORTED",
      "The shipped engine backend requires exactly one allowed origin per isolated session."
    );
  }
}

export function createGovernedPlaywrightBackend(options) {
  const services = servicesFrom(options);
  const handlers = handlerRegistry(services);
  const supportedActions = Object.freeze(BROWSER_AUTOMATION_ACTIONS.filter((kind) => Object.hasOwn(handlers, kind)));

  async function openSession(input) {
    assertSingleOrigin(input);
    const opened = await services.createSession(input);
    if (!opened || typeof opened !== "object" || !opened.context || opened.ownedContext !== true
      || opened.networkIsolation?.serviceWorkers !== "block" || opened.networkIsolation?.webSockets !== "block") {
      const cleanup = [];
      if (opened?.context) {
        cleanup.push(Promise.resolve().then(() => requiredMethod(opened.context, "close", "session-open")({
          reason: "Invalid governed session factory result."
        })));
      }
      if (opened?.browserOwned === true) {
        cleanup.push(Promise.resolve().then(() => requiredMethod(opened.browser, "close", "session-open")()));
      }
      const outcomes = await Promise.allSettled(cleanup);
      if (outcomes.some((outcome) => outcome.status === "rejected")) {
        browserAutomationFail(
          "BROWSER_AUTOMATION_CLEANUP_UNCONFIRMED",
          "The invalid browser factory result could not be safely disposed."
        );
      }
      browserAutomationFail("BROWSER_AUTOMATION_BACKEND_INVALID", "Session factory must return a newly owned isolated context with ownedContext=true.");
    }
    const session = {
      publicSessionId: input.sessionId,
      browser: opened.browser ?? null,
      browserOwned: opened.browserOwned === true,
      context: opened.context,
      selectors: opened.selectors ?? null,
      allowedOrigins: Object.freeze([...input.allowedOrigins]),
      allowedActions: Object.freeze([...input.allowedActions]),
      activePage: opened.page ?? null,
      activeFrame: null,
      pages: new Map(),
      pageIds: new WeakMap(),
      attachedPages: new WeakSet(),
      nextPageId: 1,
      frames: new Map(),
      frameIds: new WeakMap(),
      nextFrameId: 1,
      workers: new Map(),
      workerIds: new WeakMap(),
      nextWorkerId: 1,
      routes: new Map(),
      lockedTabs: new Set(),
      selectorNames: new Set(),
      popupQueue: [],
      popupWaiters: [],
      dialogQueue: [],
      pendingDialog: null,
      consoleEntries: [],
      network: {
        requests: [], responses: [], blocked: 0, lastDeniedUrl: null, lastDeniedCode: null,
        offline: true, cacheEnabled: true, activeLease: null, totalAuthorizedRequests: 0,
        maxRequestsPerAction: MAX_REQUESTS_PER_ACTION, maxRequestsPerSession: MAX_REQUESTS_PER_SESSION
      },
      services,
      quarantined: false,
      quarantineReason: null,
      quarantinePromise: null,
      violationCode: null
    };
    session.actionSignal = input.signal ?? null;
    session.actionDeadline = input.deadline ?? null;
    session.attachPage = (page) => attachPage(session, page);
    session.quarantine = (reason) => quarantine(session, reason);
    session.registerWorker = (value) => {
      if (session.workerIds.has(value)) return workerId(session, value);
      if (session.workers.size >= MAX_WORKERS_PER_SESSION) {
        void quarantine(session, "worker resource limit exceeded").catch(() => {});
        return null;
      }
      return workerId(session, value);
    };
    session.registerFrame = (value) => {
      if (session.frameIds.has(value)) return frameId(session, value);
      if (session.frames.size >= MAX_FRAMES_PER_SESSION) {
        void quarantine(session, "frame resource limit exceeded").catch(() => {});
        return null;
      }
      return frameId(session, value);
    };
    session.waitForPopup = (timeoutMs = 5_000) => {
      const queued = session.popupQueue.shift();
      if (queued) return Promise.resolve(queued);
      return new Promise((resolve, reject) => {
        const waiter = {
          resolve: (popup) => { clearTimeout(timer); resolve(popup); },
          reject: (error) => { clearTimeout(timer); reject(error); }
        };
        const timer = setTimeout(() => {
          const index = session.popupWaiters.indexOf(waiter);
          if (index >= 0) session.popupWaiters.splice(index, 1);
          reject(new BrowserAutomationError("BROWSER_AUTOMATION_EVENT_NOT_READY", "No governed popup event arrived before the bounded wait expired."));
        }, Math.min(timeoutMs, 30_000));
        session.popupWaiters.push(waiter);
      });
    };
    session.assertPageOrigin = (page) => {
      const rawUrl = optionalMethod(page, "url")?.() ?? "";
      if (!rawUrl || rawUrl === "about:blank") return;
      let origin;
      try { origin = new URL(rawUrl).origin; } catch { origin = "denied:"; }
      if (!session.allowedOrigins.includes(origin)) {
        browserAutomationFail("BROWSER_AUTOMATION_ORIGIN_VIOLATION", "A page outside the isolated session origin was rejected.");
      }
    };
    const abortOpen = () => quarantine(session, "session-open deadline exceeded").catch(() => {});
    input.signal?.addEventListener("abort", abortOpen, { once: true });
    try {
      if (input.signal?.aborted) {
        await quarantine(session, "session-open deadline exceeded");
        browserAutomationFail("BROWSER_AUTOMATION_DEADLINE_EXCEEDED", "Browser session open exceeded its engine deadline.");
      }
      requiredMethod(session.context, "close", "session-open");
      if (session.browserOwned) requiredMethod(session.browser, "close", "session-open");
      const initialPages = optionalMethod(session.context, "pages")?.() ?? [];
      if (opened.page && !initialPages.includes(opened.page)) {
        browserAutomationFail("BROWSER_AUTOMATION_BACKEND_INVALID", "Session factory page must belong to the newly owned context.");
      }
      if (opened.page && optionalMethod(opened.page, "context") && opened.page.context() !== session.context) {
        browserAutomationFail("BROWSER_AUTOMATION_BACKEND_INVALID", "Session factory page belongs to a different context.");
      }
      if (initialPages.some((page) => {
        const url = optionalMethod(page, "url")?.() ?? "";
        return url && url !== "about:blank";
      })) {
        browserAutomationFail("BROWSER_AUTOMATION_BACKEND_INVALID", "Session factory must provide only fresh about:blank pages.");
      }
      await installNetworkBoundary(session);
      const existingPages = optionalMethod(session.context, "pages")?.() ?? [];
      for (const page of existingPages) {
        session.assertPageOrigin(page);
        attachPage(session, page);
      }
      if (typeof session.context?.on === "function") {
        session.context.on("page", (page) => {
          try {
            session.assertPageOrigin(page);
            attachPage(session, page);
          } catch {
            session.violationCode = "BROWSER_AUTOMATION_ORIGIN_VIOLATION";
            quarantine(session, "new page origin violation").catch(() => {});
          }
        });
      }
      if (!session.activePage) session.activePage = existingPages[0] ?? await requiredMethod(session.context, "newPage", "session-open")();
      session.assertPageOrigin(session.activePage);
      attachPage(session, session.activePage);
      await requiredMethod(session.context, "setOffline", "session-open")(true);
    } catch (error) {
      try {
        await quarantine(session, "session-open validation failure");
      } catch {
        browserAutomationFail(
          "BROWSER_AUTOMATION_CLEANUP_UNCONFIRMED",
          "The browser factory returned a session whose cleanup could not be confirmed."
        );
      }
      throw error;
    } finally {
      input.signal?.removeEventListener("abort", abortOpen);
    }
    return session;
  }

  async function runAction(session, action, execution) {
    if (execution?.signal?.aborted) {
      browserAutomationFail("BROWSER_AUTOMATION_DEADLINE_EXCEEDED", "Browser action was aborted before engine dispatch.");
    }
    session.actionSignal = execution?.signal ?? null;
    session.actionDeadline = execution?.deadline ?? null;
    session.network.lastDeniedUrl = null;
    session.network.lastDeniedCode = null;
    session.violationCode = null;
    if (session.quarantined) {
      browserAutomationFail("BROWSER_AUTOMATION_SESSION_QUARANTINED", `Browser session is quarantined: ${session.quarantineReason}`);
    }
    const handler = handlers[action.kind];
    if (!handler) browserAutomationFail("BROWSER_AUTOMATION_ENGINE_UNSUPPORTED", `No safe engine handler is available for '${action.kind}'.`);
    await assertTargetOrigin(session, action, "pre-dispatch");
    const networkLease = {
      action: action.kind,
      effect: execution?.effect,
      principalId: execution?.principalId,
      actionNumber: execution?.actionNumber,
      deadline: execution?.deadline,
      signal: execution?.signal ?? null,
      requests: 0,
      active: true
    };
    session.network.activeLease = networkLease;
    try {
      await requiredMethod(session.context, "setOffline", action.kind)(false);
      session.network.offline = false;
    } catch (error) {
      networkLease.active = false;
      if (session.network.activeLease === networkLease) session.network.activeLease = null;
      throw error;
    }
    let result;
    try {
      if (action.kind === "popup.wait") {
        const popup = await session.waitForPopup(action.timeoutMs);
        if (optionalMethod(popup, "isClosed")?.() === true) {
          browserAutomationFail("BROWSER_AUTOMATION_EVENT_NOT_READY", "The governed popup closed before it could be selected.");
        }
        session.activePage = popup;
        session.activeFrame = null;
      }
      if (action.kind === "dialog.wait") {
        const dialog = session.dialogQueue.shift();
        if (!dialog) browserAutomationFail("BROWSER_AUTOMATION_EVENT_NOT_READY", "No governed dialog event is queued.");
        session.pendingDialog = dialog;
      }
      result = await handler(session, action);
    } catch (error) {
      if (session.violationCode) {
        await session.quarantinePromise;
        browserAutomationFail(session.violationCode, "Browser target escaped its exact origin authority during action dispatch.");
      }
      if (session.network.lastDeniedCode) {
        await quarantine(session, "network authority violation");
        browserAutomationFail(session.network.lastDeniedCode, "Browser network activity exceeded its action-bound authority.");
      }
      throw error;
    } finally {
      networkLease.active = false;
      if (session.network.activeLease === networkLease) session.network.activeLease = null;
      try {
        await requiredMethod(session.context, "setOffline", action.kind)(true);
        session.network.offline = true;
      } catch {
        await quarantine(session, "network action window could not be closed");
      }
    }
    if (session.violationCode) {
      await session.quarantinePromise;
      browserAutomationFail(session.violationCode, "Browser target escaped its exact origin authority during action dispatch.");
    }
    await assertTargetOrigin(session, action, "post-dispatch");
    if (session.network.lastDeniedCode) {
      await quarantine(session, "network authority violation");
      browserAutomationFail(session.network.lastDeniedCode, "Browser network activity exceeded its action-bound authority.");
    }
    if (execution?.signal?.aborted) {
      await quarantine(session, "action deadline exceeded");
      browserAutomationFail("BROWSER_AUTOMATION_DEADLINE_EXCEEDED", "Browser action exceeded its engine deadline.");
    }
    if (session.quarantined) {
      await session.quarantinePromise;
      browserAutomationFail("BROWSER_AUTOMATION_SESSION_QUARANTINED", "The governed browser session was quarantined during action dispatch.");
    }
    const effect = browserAutomationEffectForAction(action.kind);
    return Object.freeze({
      data: result.data,
      attestation: Object.freeze({
        action: action.kind,
        effect,
        origin: action.origin,
        sessionBound: true,
        withinBudget: true,
        ...(effect === "upload" ? { fileRefsAccepted: action.fileRefs.length } : {}),
        ...(result.artifact ? { artifact: result.artifact } : {})
      })
    });
  }

  async function closeSession(session) {
    if (session.quarantinePromise) {
      await session.quarantinePromise;
      return;
    }
    const closeError = new BrowserAutomationError(
      "BROWSER_AUTOMATION_SESSION_CLOSING",
      "The governed browser session is closing."
    );
    for (const waiter of session.popupWaiters.splice(0)) waiter.reject(closeError);
    const cleanup = [
      Promise.resolve().then(() => requiredMethod(session.context, "close", "session-close")({ reason: "Governed session closed." }))
    ];
    if (session.browserOwned) {
      cleanup.push(Promise.resolve().then(() => requiredMethod(session.browser, "close", "session-close")()));
    }
    const outcomes = await Promise.allSettled(cleanup);
    const failed = outcomes.find((outcome) => outcome.status === "rejected");
    if (failed) throw failed.reason;
  }

  return Object.freeze({ supportedActions, openSession, runAction, closeSession });
}

export const GOVERNED_ENGINE_HANDLER_ACTIONS = Object.freeze(Object.keys(BASE_HANDLERS));
export const GOVERNED_ENGINE_UNSUPPORTED_ACTIONS = Object.freeze(
  BROWSER_AUTOMATION_ACTIONS.filter((kind) => !Object.hasOwn(BASE_HANDLERS, kind) || INTENTIONALLY_UNSUPPORTED.has(kind))
);
