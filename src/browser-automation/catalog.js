export const BROWSER_AUTOMATION_EFFECTS = Object.freeze([
  "read",
  "write",
  "execute",
  "upload",
  "download",
  "credential"
]);

const rows = [
  ["browser.connect", "lifecycle-connect", "write"],
  ["browser.disconnect", "lifecycle-connect", "write"],
  ["context.create", "lifecycle-connect", "write"],
  ["context.close", "lifecycle-connect", "write"],
  ["session.inspect", "sessions-pages-tabs", "read", true],
  ["page.list", "sessions-pages-tabs", "read", true],
  ["tab.open", "sessions-pages-tabs", "write"],
  ["tab.close", "sessions-pages-tabs", "write"],
  ["tab.switch", "sessions-pages-tabs", "write"],
  ["tab.lock", "sessions-pages-tabs", "write"],
  ["tab.unlock", "sessions-pages-tabs", "write"],
  ["tab.lock.status", "sessions-pages-tabs", "read"],
  ["popup.wait", "sessions-pages-tabs", "read", false],
  ["frame.list", "sessions-pages-tabs", "read", true],
  ["frame.select", "sessions-pages-tabs", "write"],
  ["navigate", "navigation-waits", "read", true],
  ["back", "navigation-waits", "read", true],
  ["forward", "navigation-waits", "read", true],
  ["reload", "navigation-waits", "read", true],
  ["wait", "navigation-waits", "read", true],
  ["wait.selector", "navigation-waits", "read", true],
  ["wait.url", "navigation-waits", "read", true],
  ["history.inspect", "navigation-waits", "read", true],
  ["locator.inspect", "locators-elements-forms", "read", true],
  ["click", "locators-elements-forms", "write"],
  ["doubleClick", "locators-elements-forms", "write"],
  ["fill", "locators-elements-forms", "write"],
  ["type", "locators-elements-forms", "write"],
  ["hover", "locators-elements-forms", "read", true],
  ["focus", "locators-elements-forms", "read", true],
  ["check", "locators-elements-forms", "write"],
  ["uncheck", "locators-elements-forms", "write"],
  ["select", "locators-elements-forms", "write"],
  ["form.submit", "locators-elements-forms", "write"],
  ["press", "keyboard-input", "write"],
  ["keyboard.down", "keyboard-input", "write"],
  ["keyboard.up", "keyboard-input", "write"],
  ["keyboard.insertText", "keyboard-input", "write"],
  ["scroll", "pointer-touch-drag", "read", true],
  ["drag", "pointer-touch-drag", "write"],
  ["touch.tap", "pointer-touch-drag", "write"],
  ["mouse.move", "pointer-touch-drag", "write"],
  ["mouse.down", "pointer-touch-drag", "write"],
  ["mouse.up", "pointer-touch-drag", "write"],
  ["mouse.click", "pointer-touch-drag", "write"],
  ["upload", "files-dialogs", "upload"],
  ["download", "files-dialogs", "download"],
  ["dialog.wait", "files-dialogs", "read"],
  ["dialog.accept", "files-dialogs", "write"],
  ["dialog.dismiss", "files-dialogs", "write"],
  ["capture.paired", "screenshots-pdf", "download"],
  ["screenshot", "screenshots-pdf", "download"],
  ["pdf", "screenshots-pdf", "download"],
  ["evaluate", "evaluation-scripts-workers", "execute"],
  ["script.add", "evaluation-scripts-workers", "execute"],
  ["style.add", "evaluation-scripts-workers", "write"],
  ["worker.list", "evaluation-scripts-workers", "read", true],
  ["worker.evaluate", "evaluation-scripts-workers", "execute"],
  ["network.inspect", "network", "read", true],
  ["network.export", "network", "download"],
  ["network.requests", "network", "read", true],
  ["network.responses", "network", "read", true],
  ["network.route.add", "network", "write"],
  ["network.route.remove", "network", "write"],
  ["network.routes.list", "network", "read", true],
  ["network.offline", "network", "write"],
  ["network.cache", "network", "write"],
  ["network.headers", "network", "credential"],
  ["clipboard.read", "cookies-storage", "credential"],
  ["clipboard.write", "cookies-storage", "credential"],
  ["cookies.read", "cookies-storage", "credential"],
  ["cookies.write", "cookies-storage", "credential"],
  ["storage.read", "cookies-storage", "credential"],
  ["storage.write", "cookies-storage", "credential"],
  ["storage.clear", "cookies-storage", "credential"],
  ["state.save", "cookies-storage", "credential"],
  ["state.load", "cookies-storage", "credential"],
  ["state.list", "cookies-storage", "credential"],
  ["state.delete", "cookies-storage", "credential"],
  ["permissions.set", "permissions-geolocation-emulation", "credential"],
  ["geolocation.set", "permissions-geolocation-emulation", "credential"],
  ["emulation.set", "permissions-geolocation-emulation", "write"],
  ["snapshot", "accessibility-page-tools", "read", true],
  ["extract", "accessibility-page-tools", "read", true],
  ["accessibility.snapshot", "accessibility-page-tools", "read"],
  ["annotate.show", "accessibility-page-tools", "write"],
  ["annotate.clear", "accessibility-page-tools", "write"],
  ["trace.start", "tracing-metrics-recording", "write"],
  ["trace.stop", "tracing-metrics-recording", "download"],
  ["metrics.read", "tracing-metrics-recording", "read", true],
  ["recording.start", "tracing-metrics-recording", "write"],
  ["recording.stop", "tracing-metrics-recording", "download"],
  ["coverage.start", "coverage-console-heap", "write"],
  ["coverage.stop", "coverage-console-heap", "download"],
  ["console.read", "coverage-console-heap", "read", true],
  ["heap.snapshot", "coverage-console-heap", "download"],
  ["selector.register", "selectors-page-tools", "execute"],
  ["selector.unregister", "selectors-page-tools", "write"],
  ["selector.list", "selectors-page-tools", "read"],
  ["page.content", "selectors-page-tools", "read", true],
  ["page.title", "selectors-page-tools", "read", true],
  ["page.url", "selectors-page-tools", "read", true]
];

export const BROWSER_AUTOMATION_ACTION_CATALOG = Object.freeze(rows.map(
  ([kind, category, effect, defaultEnabled = false]) => Object.freeze({
    kind,
    category,
    effect,
    defaultEnabled
  })
));

export const BROWSER_AUTOMATION_ACTIONS = Object.freeze(
  BROWSER_AUTOMATION_ACTION_CATALOG.map((entry) => entry.kind)
);

export const BROWSER_AUTOMATION_SAFE_ACTIONS = Object.freeze(
  BROWSER_AUTOMATION_ACTION_CATALOG.filter((entry) => entry.defaultEnabled).map((entry) => entry.kind)
);

export const BROWSER_AUTOMATION_ACTION_EFFECTS = Object.freeze(Object.fromEntries(
  BROWSER_AUTOMATION_ACTION_CATALOG.map((entry) => [entry.kind, entry.effect])
));

const categoryNames = [...new Set(rows.map((entry) => entry[1]))];

export const BROWSER_AUTOMATION_CATEGORIES = Object.freeze(categoryNames);

export const BROWSER_AUTOMATION_CATEGORY_CATALOG = Object.freeze(categoryNames.map((id) => {
  const actions = BROWSER_AUTOMATION_ACTION_CATALOG
    .filter((entry) => entry.category === id)
    .map((entry) => entry.kind);
  return Object.freeze({ id, status: "cataloged", actions: Object.freeze(actions) });
}));

export function browserAutomationEffectForAction(kind) {
  return BROWSER_AUTOMATION_ACTION_EFFECTS[kind];
}
