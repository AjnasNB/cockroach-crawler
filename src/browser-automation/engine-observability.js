import {
  activePage,
  engineActionResult,
  locator,
  persistArtifact,
  requiredMethod,
  safeUrl,
  serviceInput,
  toBuffer
} from "./engine-helpers.js";
import { redactBrowserAutomationText } from "./redaction.js";

export const observabilityHandlers = Object.freeze({
  snapshot: async (session, action) => engineActionResult({
    content: await requiredMethod(activePage(session, action.kind), "evaluate", action.kind)(
      (maximum) => document.documentElement.outerHTML.slice(0, maximum), action.maxChars ?? 100_000
    )
  }),
  extract: async (session, action) => engineActionResult({
    text: await requiredMethod(locator(session, action.selector, action.kind), "evaluate", action.kind)(
      (element, maximum) => String(element.innerText ?? element.textContent ?? "").slice(0, maximum), action.maxChars ?? 100_000
    )
  }),
  "accessibility.snapshot": async (session, action) => {
    const page = activePage(session, action.kind);
    const tree = page.accessibility
      ? await requiredMethod(page.accessibility, "snapshot", action.kind)()
      : await requiredMethod(page, "ariaSnapshot", action.kind)();
    return engineActionResult(tree);
  },
  "annotate.show": async (session, action) => {
    await requiredMethod(activePage(session, action.kind), "evaluate", action.kind)(
      (selector) => {
        const style = document.createElement("style");
        style.id = "cockroach-governed-annotation";
        style.textContent = `${selector || "a,button,input,select,textarea"}{outline:2px solid #00d993!important}`;
        document.head.append(style);
      },
      action.selector
    );
    return engineActionResult({ visible: true });
  },
  "annotate.clear": async (session, action) => {
    await requiredMethod(activePage(session, action.kind), "evaluate", action.kind)(
      () => document.getElementById("cockroach-governed-annotation")?.remove()
    );
    return engineActionResult({ visible: false });
  },
  "trace.start": async (session, action) => {
    await requiredMethod(session.context.tracing, "start", action.kind)({
      screenshots: true,
      snapshots: true,
      sources: false,
      categories: action.categories
    });
    return engineActionResult({ started: true });
  },
  "metrics.read": async (session, action) => engineActionResult(await requiredMethod(activePage(session, action.kind), "evaluate", action.kind)(
    () => ({
      navigation: performance.getEntriesByType("navigation").map((entry) => ({ duration: entry.duration, transferSize: entry.transferSize })),
      resources: performance.getEntriesByType("resource").length,
      now: performance.now()
    })
  )),
  "coverage.start": async (session, action) => {
    const coverage = activePage(session, action.kind).coverage;
    await requiredMethod(coverage, "startJSCoverage", action.kind)({ resetOnNavigation: action.resetOnNavigation });
    await requiredMethod(coverage, "startCSSCoverage", action.kind)({ resetOnNavigation: action.resetOnNavigation });
    return engineActionResult({ started: true });
  },
  "coverage.stop": async (session, action) => {
    const coverage = activePage(session, action.kind).coverage;
    const [javascript, css] = await Promise.all([
      requiredMethod(coverage, "stopJSCoverage", action.kind)(),
      requiredMethod(coverage, "stopCSSCoverage", action.kind)()
    ]);
    const bytes = Buffer.from(JSON.stringify({ javascript, css }, (key, value) => key === "text" ? undefined : value));
    const artifact = await persistArtifact(session, action, bytes);
    return engineActionResult({ javascriptEntries: javascript.length, cssEntries: css.length }, artifact);
  },
  "console.read": async (session) => engineActionResult([...session.consoleEntries]),
  "selector.register": async (session, action) => {
    const source = await session.services.resolveScript(serviceInput(session, {
      sessionId: session.publicSessionId,
      scriptRef: action.scriptRef
    }));
    await requiredMethod(session.selectors, "register", action.kind)(action.name, source);
    session.selectorNames.add(action.name);
    return engineActionResult({ registered: true, name: action.name });
  },
  "selector.unregister": async (session, action) => {
    await requiredMethod(session.selectors, "unregister", action.kind)(action.name);
    session.selectorNames.delete(action.name);
    return engineActionResult({ unregistered: true, name: action.name });
  },
  "selector.list": async (session) => engineActionResult([...session.selectorNames]),
  "page.content": async (session, action) => engineActionResult({
    content: await requiredMethod(activePage(session, action.kind), "evaluate", action.kind)(
      (maximum) => document.documentElement.outerHTML.slice(0, maximum), action.maxChars ?? 100_000
    )
  }),
  "page.title": async (session, action) => engineActionResult({
    title: await requiredMethod(activePage(session, action.kind), "evaluate", action.kind)(() => document.title.slice(0, 4_096))
  }),
  "page.url": async (session, action) => engineActionResult({ url: safeUrl(requiredMethod(activePage(session, action.kind), "url", action.kind)()) })
});

export function attachConsoleTracking(session, page) {
  const on = page?.on;
  if (typeof on !== "function") return;
  on.call(page, "console", (message) => {
    const text = typeof message?.text === "function" ? message.text() : "";
    const redacted = redactBrowserAutomationText(text, 4_096);
    session.consoleEntries.push(Object.freeze({
      type: typeof message?.type === "function" ? message.type() : "log",
      text: redacted
    }));
    if (session.consoleEntries.length > 1_000) session.consoleEntries.shift();
  });
}
