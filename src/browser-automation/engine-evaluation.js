import {
  activePage,
  activeTarget,
  engineActionResult,
  requiredMethod,
  serializeValue,
  serviceInput,
  worker,
  workerId
} from "./engine-helpers.js";

async function trustedExpression(session, ref, kind) {
  const expression = await session.services.resolveExpression(serviceInput(session, {
    sessionId: session.publicSessionId,
    expressionRef: ref,
    kind
  }));
  if (typeof expression !== "function" && typeof expression !== "string") {
    throw new TypeError("Trusted expression resolver must return a function or source string.");
  }
  if (typeof expression === "string" && expression.length > 1_000_000) {
    throw new TypeError("Trusted expression source exceeds its one-million-character ceiling.");
  }
  return expression;
}

export const evaluationHandlers = Object.freeze({
  evaluate: async (session, action) => {
    const expression = await trustedExpression(session, action.expressionRef, action.kind);
    const value = await requiredMethod(activeTarget(session, action.kind), "evaluate", action.kind)(expression, action.args);
    return engineActionResult(serializeValue(value));
  },
  "script.add": async (session, action) => {
    const source = await session.services.resolveScript(serviceInput(session, {
      sessionId: session.publicSessionId,
      scriptRef: action.scriptRef
    }));
    if (typeof source !== "string" || source.length > 1_000_000) throw new TypeError("Trusted script source is invalid or too large.");
    await requiredMethod(activePage(session, action.kind), "addScriptTag", action.kind)({ content: source });
    return engineActionResult({ installed: true, scriptRef: action.scriptRef });
  },
  "style.add": async (session, action) => {
    const source = await session.services.resolveStyle(serviceInput(session, {
      sessionId: session.publicSessionId,
      styleRef: action.styleRef
    }));
    if (typeof source !== "string" || source.length > 256_000) throw new TypeError("Trusted style source is invalid or too large.");
    await requiredMethod(activePage(session, action.kind), "addStyleTag", action.kind)({ content: source });
    return engineActionResult({ installed: true, styleRef: action.styleRef });
  },
  "worker.list": async (session) => engineActionResult([...session.workers.entries()].map(([id]) => ({ workerId: id }))),
  "worker.evaluate": async (session, action) => {
    const expression = await trustedExpression(session, action.expressionRef, action.kind);
    const value = await requiredMethod(worker(session, action.workerId, action.kind), "evaluate", action.kind)(expression, action.args);
    return engineActionResult(serializeValue(value));
  }
});

export function attachWorkerTracking(session, page) {
  const on = page?.on;
  if (typeof on !== "function") return;
  on.call(page, "worker", (value) => session.registerWorker ? session.registerWorker(value) : workerId(session, value));
  on.call(page, "close", () => {
    for (const [id, candidate] of session.pages) {
      if (candidate === page) session.pages.delete(id);
    }
  });
}
