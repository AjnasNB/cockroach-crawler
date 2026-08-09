import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const [, , snapshotArg, outputArg] = process.argv;
if (!snapshotArg || !outputArg) {
  throw new Error("Usage: node scripts/build-puppeteer-gap-matrix.mjs <api-snapshot.json> <gap-matrix.json>");
}

const snapshot = JSON.parse(await readFile(path.resolve(snapshotArg), "utf8"));
if (snapshot?.upstream?.name !== "puppeteer-core" || snapshot?.upstream?.version !== "25.5.0") {
  throw new Error("The gap matrix is intentionally pinned to puppeteer-core 25.5.0.");
}

const evidence = Object.freeze({
  "upstream-api": "https://pptr.dev/api",
  "upstream-guides": "https://pptr.dev/category/guides",
  "upstream-source": "https://github.com/puppeteer/puppeteer/tree/puppeteer-v25.5.0/packages/puppeteer-core/src",
  "crawler-browser-runtime": "../../src/index.js",
  "crawler-browser-helpers": "../../src/browser.js",
  "crawler-browser-host": "../../src/browser-host.js",
  "crawler-capabilities": "../CAPABILITIES.md",
  "crawler-automation-adapter": "../../src/browser-automation.js",
  "crawler-automation-types": "../../types/browser-automation.d.ts",
  "browser-capability-registry": "https://github.com/AjnasNB/cockroach-browser/blob/1c43fd753df57f2c210b7e90b8324a520c3ce009/src/capabilities.ts",
  "browser-runtime": "https://github.com/AjnasNB/cockroach-browser/blob/1c43fd753df57f2c210b7e90b8324a520c3ce009/src/runtime.ts"
});

function surface(status, mode, evidenceIds, note) {
  return Object.freeze({ status, mode, evidence: evidenceIds, note });
}

const C = {
  missing: (note) => surface("missing", "none", ["crawler-capabilities"], note),
  partial: (note, refs = ["crawler-browser-runtime", "crawler-browser-helpers"]) =>
    surface("partial", "native", refs, note),
  supported: (note, refs = ["crawler-browser-runtime"]) =>
    surface("supported", "native", refs, note),
  na: (note) => surface("not-applicable", "not-applicable", ["crawler-capabilities"], note)
};
const B = {
  missing: (note) => surface("missing", "none", ["browser-capability-registry"], note),
  partial: (note) => surface("partial", "native", ["browser-capability-registry", "browser-runtime"], note),
  supported: (note) => surface("supported", "native", ["browser-capability-registry", "browser-runtime"], note),
  na: (note) => surface("not-applicable", "not-applicable", ["browser-capability-registry"], note)
};
const A = {
  missing: (note) => surface("missing", "none", ["crawler-automation-adapter"], note),
  partial: (note) => surface("partial", "adapter", ["crawler-automation-adapter", "crawler-automation-types"], note),
  supported: (note) => surface("supported", "adapter", ["crawler-automation-adapter", "crawler-automation-types"], note),
  na: (note) => surface("not-applicable", "not-applicable", ["crawler-automation-adapter"], note)
};

const categories = Object.freeze({
  "infrastructure.events-errors": {
    title: "Events, disposal, and error primitives",
    guide: "https://pptr.dev/api/puppeteer.eventemitter",
    crawler: C.na("Library-specific event and error object shapes are not browser capabilities."),
    browser: B.na("Cockroach Browser has its own typed errors, receipts, and lifecycle events."),
    adapter: A.na("The adapter preserves its own error contract instead of impersonating Puppeteer classes.")
  },
  "browser.launch-connect": {
    title: "Browser launch, attach, disconnect, and process metadata",
    guide: "https://pptr.dev/guides/browser-management",
    crawler: C.partial("Optional Chromium launch and CDP attachment exist inside governed crawl mode; there is no public Puppeteer-compatible browser lifecycle object."),
    browser: B.partial("Headless/headed Chromium launch and explicit CDP attachment are available; Firefox, WebDriver BiDi, and Puppeteer API identity are not."),
    adapter: A.partial("The adapter opens and closes injected backend sessions; executable, CDP, browser download, and process control remain backend-owned.")
  },
  "browser.contexts-tabs-targets": {
    title: "Contexts, pages, tabs, popups, and targets",
    guide: "https://pptr.dev/guides/browser-management",
    crawler: C.partial("Crawler browser mode creates an isolated context per crawl, but does not expose contexts, target discovery, or general tab lifecycle."),
    browser: B.partial("Bounded tabs, popups, locks, and isolated sessions are available; Puppeteer Target and BrowserContext objects are not API-compatible."),
    adapter: A.partial("The foundation exposes bounded tab actions through an injected backend, not Puppeteer Target or BrowserContext instances.")
  },
  "browser.extensions": {
    title: "Chrome extensions and extension realms",
    guide: "https://pptr.dev/guides/chrome-extensions",
    crawler: C.missing("Crawler does not install, enumerate, or automate browser extensions."),
    browser: B.missing("The current Cockroach Browser capability registry does not claim extension lifecycle or extension realm automation."),
    adapter: A.missing("No extension actions exist in the adapter backend contract.")
  },
  "browser.pwa": {
    title: "Progressive Web App lifecycle",
    guide: "https://pptr.dev/api/puppeteer.browser",
    crawler: C.missing("Crawler does not install, launch, inspect, or uninstall PWAs."),
    browser: B.missing("Cockroach Browser does not currently expose PWA lifecycle actions."),
    adapter: A.missing("No PWA lifecycle action is defined by the adapter.")
  },
  "browser.window-screen": {
    title: "Window and virtual screen management",
    guide: "https://pptr.dev/guides/window-management",
    crawler: C.partial("A bounded viewport is configurable, but window bounds, screen creation, and window state are unavailable."),
    browser: B.partial("Viewport and headed sessions are supported; direct window bounds and virtual screen management are not claimed."),
    adapter: A.partial("Viewport is accepted at session creation; window and virtual-screen commands are not exposed.")
  },
  "browser.permissions": {
    title: "Permissions and geolocation grants",
    guide: "https://pptr.dev/guides/browser-management#permissions",
    crawler: C.missing("Crawler does not grant page permissions."),
    browser: B.missing("The current capability registry intentionally exposes effect policy, not arbitrary browser permission grants."),
    adapter: A.missing("Permission mutation is outside the adapter contract.")
  },
  "page.navigation": {
    title: "Navigation, history, reload, and lifecycle waits",
    guide: "https://pptr.dev/api/puppeteer.page",
    crawler: C.partial("Governed navigation, redirects, wait conditions, and bounded selector clicks are available in crawl mode; Page/Frame API parity is absent."),
    browser: B.supported("Navigate, reload, back, forward, bounded waits, tabs, and history inspection are runtime capabilities."),
    adapter: A.supported("The adapter's safe slice includes navigate, back, forward, reload, wait, and history inspection on owned sessions.")
  },
  "page.locators-selection": {
    title: "Selectors, locators, element handles, and waits",
    guide: "https://pptr.dev/guides/page-interactions",
    crawler: C.partial("CSS, XPath, adaptive relocation, open shadow flattening, and bounded waits exist, but Puppeteer Locator/ElementHandle semantics do not."),
    browser: B.partial("Semantic refs, CSS, XPath, open shadow roots, and same-origin frame targets exist; Locator filters, mappers, and handle APIs remain gaps."),
    adapter: A.partial("Actions can use backend semantic refs, CSS, or XPath; the adapter does not emulate Puppeteer Locator or ElementHandle objects.")
  },
  "page.interaction": {
    title: "Element interaction and forms",
    guide: "https://pptr.dev/guides/page-interactions",
    crawler: C.partial("Crawler browser options support bounded selector clicks and trusted hooks, not a complete interactive form API."),
    browser: B.supported("Click, double-click, fill, type, press, select, check, uncheck, hover, focus, drag, and bounded scroll are implemented."),
    adapter: A.partial("All existing Cockroach Browser action names are catalogued, but mutating actions are disabled by default and require creator-owned action/effect policy plus backend approval enforcement.")
  },
  "page.input-keyboard": {
    title: "Keyboard input",
    guide: "https://pptr.dev/api/puppeteer.keyboard",
    crawler: C.missing("Crawler does not expose raw keyboard control."),
    browser: B.partial("Bounded key down/up/insertText and higher-level press/type exist; Puppeteer's full keyboard layout semantics are not claimed."),
    adapter: A.partial("Keyboard actions can be delegated only after explicit creator opt-in; no Puppeteer Keyboard object is provided.")
  },
  "page.input-pointer-touch": {
    title: "Mouse, drag, wheel, and touch input",
    guide: "https://pptr.dev/api/puppeteer.mouse",
    crawler: C.missing("Crawler does not expose low-level pointer or touch devices."),
    browser: B.partial("Bounded in-viewport mouse, wheel, drag, hover, and click exist; a public touch device surface is missing."),
    adapter: A.partial("Mouse and drag actions are catalogued for opt-in delegation; touch actions are missing.")
  },
  "page.evaluation-realms": {
    title: "JavaScript evaluation, realms, handles, and exposed functions",
    guide: "https://pptr.dev/guides/javascript-execution",
    crawler: C.partial("Trusted host hooks can evaluate bounded functions; agent/MCP input cannot submit JavaScript and JSHandle/Realm APIs are absent."),
    browser: B.partial("Policy-gated expression evaluation exists; handles, realms, exposed functions, and new-document script lifecycle are not API-compatible."),
    adapter: A.partial("Evaluate can be delegated only when creator policy enables execute authority; no handles or realms cross the adapter boundary.")
  },
  "page.files-dialogs": {
    title: "File chooser, upload, download, and dialogs",
    guide: "https://pptr.dev/api/puppeteer.filechooser",
    crawler: C.missing("Crawler does not expose interactive choosers, uploads, downloads, or dialog acceptance."),
    browser: B.supported("Controlled uploads/downloads and explicit dialog handling are implemented with roots, budgets, policy, and approvals."),
    adapter: A.partial("Upload/download actions can be explicitly enabled, but the adapter supplies no Puppeteer FileChooser/Dialog object and leaves approval/evidence enforcement to the backend.")
  },
  "page.frames-workers": {
    title: "Frames, workers, and execution contexts",
    guide: "https://pptr.dev/api/puppeteer.frame",
    crawler: C.partial("Readable same-origin iframe flattening is bounded; cross-origin frames and workers are unavailable."),
    browser: B.partial("Readable same-origin frames are observable and targetable; worker lifecycle and evaluation are missing."),
    adapter: A.partial("Backend frame targets can be passed through actions; workers are not represented.")
  },
  "page.accessibility": {
    title: "Accessibility tree and semantic inspection",
    guide: "https://pptr.dev/api/puppeteer.accessibility",
    crawler: C.missing("Crawler does not expose a browser accessibility tree API."),
    browser: B.partial("Semantic snapshots and accessibility audits exist, but they are not Puppeteer's Accessibility.snapshot contract."),
    adapter: A.partial("Semantic snapshots can be delegated; no dedicated accessibility-tree method is exposed.")
  },
  "page.emulation": {
    title: "Device, viewport, media, locale, timezone, CPU, and network emulation",
    guide: "https://pptr.dev/guides/emulation",
    crawler: C.partial("Coherent named identity, viewport, locale, timezone, and user-agent settings exist; device, media, CPU, offline, and network emulation are incomplete."),
    browser: B.partial("Viewport, locale, timezone, color scheme, user agent, headers, and proxy configuration exist; CPU/network/device/vision emulation is incomplete."),
    adapter: A.partial("Viewport, locale, timezone, and color scheme are accepted at session creation; the remaining emulation surface is missing.")
  },
  "network.http-interception": {
    title: "HTTP requests, responses, authentication, routing, and network waits",
    guide: "https://pptr.dev/guides/network-interception",
    crawler: C.partial("Governed GET/HEAD proxying, DNS pinning, redirects, blocking, XHR capture, and response metadata exist; arbitrary request continuation/response objects do not."),
    browser: B.partial("Redacted network records and policy-bounded abort/static fulfill routes exist; Puppeteer HTTPRequest/HTTPResponse and arbitrary interception controls do not."),
    adapter: A.partial("Network inspect/export and bounded routes can be delegated; raw request/response object access is deliberately absent.")
  },
  "state.cookies": {
    title: "Cookies and browser storage state",
    guide: "https://pptr.dev/api/puppeteer.browsercontext",
    crawler: C.partial("Host-only browser cookies and explicit storage-state files are supported under crawler policy; general cookie APIs and partitions are restricted."),
    browser: B.supported("Explicit cookie and same-origin storage read/write plus encrypted checkpoints exist behind credential effects and policy."),
    adapter: A.partial("Cookie/storage actions are catalogued but disabled by default and remain backend-governed credential effects.")
  },
  "evidence.screenshot-pdf": {
    title: "Screenshots and PDF generation",
    guide: "https://pptr.dev/guides/screenshots",
    crawler: C.supported("PNG/JPEG screenshots and PDF artifacts ship with explicit directory, byte ceiling, media type, and SHA-256 evidence.", ["crawler-browser-helpers"]),
    browser: B.supported("PNG/JPEG screenshots, paired visual-semantic captures, and PDFs are evidence-backed runtime capabilities."),
    adapter: A.supported("Screenshot, PDF, and paired capture are included in the safe adapter action slice.")
  },
  "evidence.tracing": {
    title: "Tracing",
    guide: "https://pptr.dev/api/puppeteer.tracing",
    crawler: C.missing("Crawler does not expose browser tracing."),
    browser: B.partial("Playwright trace archives are implemented; this is not Puppeteer's tracing API or trace format contract."),
    adapter: A.partial("Trace start/stop are catalogued for explicit opt-in delegation.")
  },
  "evidence.coverage": {
    title: "JavaScript and CSS coverage",
    guide: "https://pptr.dev/api/puppeteer.coverage",
    crawler: C.missing("Crawler does not collect JavaScript or CSS coverage."),
    browser: B.missing("The current capability registry does not claim code coverage."),
    adapter: A.missing("Coverage actions are not defined.")
  },
  "evidence.heap-metrics-console": {
    title: "Heap snapshots, runtime metrics, console, and security metadata",
    guide: "https://pptr.dev/api/puppeteer.page",
    crawler: C.partial("Bounded rendered output and response evidence exist; heap snapshots, browser metrics, and console object APIs are missing."),
    browser: B.partial("Bounded console records, performance observations, security observations, and asset audits exist; heap snapshots and exact Puppeteer metrics are missing."),
    adapter: A.missing("The foundation does not yet expose audit, console, metrics, or heap operations through its three-method backend contract.")
  },
  "evidence.screencast": {
    title: "Screen recording and screencasts",
    guide: "https://pptr.dev/api/puppeteer.page.screencast",
    crawler: C.missing("Crawler does not record browser video."),
    browser: B.partial("Session video recording exists; Puppeteer Page.screencast and ScreenRecorder controls are not API-compatible."),
    adapter: A.partial("Session creation can request backend video recording, but no streaming recorder object is exposed.")
  },
  "protocol.cdp": {
    title: "Raw Chrome DevTools Protocol sessions",
    guide: "https://pptr.dev/api/puppeteer.cdpsession",
    crawler: C.missing("A CDP endpoint can be selected for internal browser acquisition, but raw protocol sessions are not public."),
    browser: B.missing("Explicit CDP attachment launches a governed session; arbitrary CDP send/event authority is not exposed."),
    adapter: A.missing("Raw protocol access is intentionally outside the adapter contract.")
  },
  "devices.bluetooth": {
    title: "Bluetooth and device prompts",
    guide: "https://pptr.dev/api/puppeteer.bluetoothemulation",
    crawler: C.missing("Crawler does not emulate Bluetooth or answer device prompts."),
    browser: B.missing("Cockroach Browser does not currently claim Bluetooth emulation."),
    adapter: A.missing("No Bluetooth action is defined.")
  },
  "selectors.custom": {
    title: "Custom query handlers",
    guide: "https://pptr.dev/guides/page-interactions#custom-selectors",
    crawler: C.missing("Crawler supports its own bounded CSS/XPath/adaptive selectors, not runtime registration of arbitrary query handlers."),
    browser: B.missing("Cockroach Browser supports fixed semantic/CSS/XPath targeting, not custom handler registration."),
    adapter: A.missing("The adapter does not register code-bearing selector handlers.")
  },
  "webmcp.page-tools": {
    title: "Page-declared WebMCP tools",
    guide: "https://pptr.dev/api/puppeteer.webmcp",
    crawler: C.missing("Cockroach Crawler's MCP server is a package control surface, not Puppeteer's page WebMCP tool discovery API."),
    browser: B.missing("Cockroach Browser's MCP server is observation-first and does not claim page WebMCP parity."),
    adapter: A.missing("Page WebMCP discovery and execution are outside the adapter contract.")
  }
});

const sets = Object.freeze({
  browserExtensions: new Set(["extensions", "installExtension", "uninstallExtension"]),
  browserPwa: new Set(["getPWAState", "installPWA", "launchPWA", "uninstallPWA"]),
  browserWindow: new Set(["addScreen", "getWindowBounds", "removeScreen", "screens", "setWindowBounds"]),
  browserPermissions: new Set(["setPermission"]),
  browserCookies: new Set(["cookies", "deleteCookie", "deleteMatchingCookies", "setCookie"]),
  frameSelection: new Set(["$", "$$", "$eval", "$$eval", "locator", "waitForSelector"]),
  frameEvaluation: new Set(["addScriptTag", "addStyleTag", "evaluate", "evaluateHandle", "waitForFunction"]),
  frameInteraction: new Set(["click", "focus", "hover", "select", "tap", "type"]),
  frameNavigation: new Set(["content", "goto", "setContent", "title", "url", "waitForNavigation"]),
  frameTopology: new Set(["childFrames", "detached", "frameElement", "isDetached", "name", "page", "parentFrame"]),
  elementInteraction: new Set([
    "autofill", "click", "drag", "dragAndDrop", "dragEnter", "dragOver", "drop", "focus",
    "hover", "press", "scrollIntoView", "select", "tap", "touchEnd", "touchMove",
    "touchStart", "type"
  ]),
  elementFiles: new Set(["uploadFile"]),
  elementEvidence: new Set(["screenshot"]),
  pageAccessibility: new Set(["accessibility"]),
  pageBluetooth: new Set(["bluetooth", "waitForDevicePrompt"]),
  pageCoverage: new Set(["coverage"]),
  pageTracing: new Set(["tracing"]),
  pageEvidence: new Set(["createPDFStream", "pdf", "screenshot"]),
  pageScreencast: new Set(["screencast"]),
  pageMetrics: new Set(["captureHeapSnapshot", "metrics"]),
  pageProtocol: new Set(["createCDPSession", "hasDevTools", "openDevTools"]),
  pageWindow: new Set(["resize", "windowId"]),
  pageFiles: new Set(["waitForFileChooser"]),
  pageInput: new Set(["isDragInterceptionEnabled", "keyboard", "mouse", "setDragInterception", "touchscreen"]),
  pageFrames: new Set(["frames", "mainFrame", "waitForFrame", "workers"]),
  pageContexts: new Set(["bringToFront", "browser", "browserContext", "close", "isClosed", "target"]),
  pageSelection: new Set(["$", "$$", "$eval", "$$eval", "locator", "waitForSelector"]),
  pageInteraction: new Set(["click", "focus", "hover", "select", "tap", "type"]),
  pageNavigation: new Set([
    "content", "goBack", "goForward", "goto", "reload", "setContent", "title", "url",
    "waitForNavigation"
  ]),
  pageEvaluation: new Set([
    "addScriptTag", "addStyleTag", "evaluate", "evaluateHandle", "evaluateOnNewDocument",
    "exposeFunction", "queryObjects", "removeExposedFunction", "removeScriptToEvaluateOnNewDocument",
    "waitForFunction"
  ]),
  pageNetwork: new Set([
    "authenticate", "cookies", "deleteCookie", "emulateNetworkConditions", "setCacheEnabled",
    "setCookie", "setExtraHTTPHeaders", "setOfflineMode", "setRequestInterception",
    "waitForNetworkIdle", "waitForRequest", "waitForResponse"
  ]),
  pageEmulation: new Set([
    "emulate", "emulateCPUThrottling", "emulateFocusedPage", "emulateIdleState", "emulateLocale",
    "emulateMediaFeatures", "emulateMediaType", "emulateTimezone", "emulateVisionDeficiency",
    "getDefaultNavigationTimeout", "getDefaultTimeout", "isJavaScriptEnabled", "isServiceWorkerBypassed",
    "setBypassCSP", "setBypassServiceWorker", "setDefaultNavigationTimeout", "setDefaultTimeout",
    "setGeolocation", "setJavaScriptEnabled", "setUserAgent", "setViewport", "viewport"
  ])
});

function classify(className, rawMember) {
  const member = rawMember.replace(/^static /u, "").replace(/#(?:getter|method|property|setter)$/u, "");
  if ([
    "ConnectionClosedError", "EventEmitter", "ProtocolError", "PuppeteerError", "TimeoutError",
    "TouchError", "UnsupportedOperation"
  ].includes(className)) return "infrastructure.events-errors";
  if (className === "Accessibility") return "page.accessibility";
  if (["Coverage", "CSSCoverage", "JSCoverage"].includes(className)) return "evidence.coverage";
  if (["CDPSession", "Connection"].includes(className)) return "protocol.cdp";
  if (className === "ConsoleMessage") return "evidence.heap-metrics-console";
  if (className === "DeviceRequestPrompt") return "devices.bluetooth";
  if (className === "Dialog" || className === "FileChooser") return "page.files-dialogs";
  if (className === "Extension" || className === "ExtensionTransport") return "browser.extensions";
  if (["HTTPRequest", "HTTPResponse", "SecurityDetails"].includes(className)) return "network.http-interception";
  if (["JSHandle", "Realm"].includes(className)) return "page.evaluation-realms";
  if (className === "Keyboard") return "page.input-keyboard";
  if (className === "Locator") return "page.locators-selection";
  if (className === "Mouse" || className === "Touchscreen") return "page.input-pointer-touch";
  if (className === "ScreenRecorder") return "evidence.screencast";
  if (className === "Tracing") return "evidence.tracing";
  if (className === "Target") return "browser.contexts-tabs-targets";
  if (className === "WebWorker") return "page.frames-workers";
  if (["WebMCP", "WebMCPTool", "WebMCPToolCall"].includes(className)) return "webmcp.page-tools";
  if (className === "BrowserLauncher") return "browser.launch-connect";
  if (className === "PuppeteerNode") return "browser.launch-connect";
  if (className === "Puppeteer") {
    return member === "connect" ? "browser.launch-connect" : "selectors.custom";
  }
  if (className === "Browser") {
    if (sets.browserExtensions.has(member)) return "browser.extensions";
    if (sets.browserPwa.has(member)) return "browser.pwa";
    if (sets.browserWindow.has(member)) return "browser.window-screen";
    if (sets.browserPermissions.has(member)) return "browser.permissions";
    if (sets.browserCookies.has(member)) return "state.cookies";
    if (["browserContexts", "createBrowserContext", "defaultBrowserContext", "newPage", "pages", "target", "targets", "waitForTarget"].includes(member)) {
      return "browser.contexts-tabs-targets";
    }
    return member.startsWith("[") ? "infrastructure.events-errors" : "browser.launch-connect";
  }
  if (className === "BrowserContext") {
    if (["clearPermissionOverrides", "overridePermissions", "setPermission"].includes(member)) return "browser.permissions";
    if (sets.browserCookies.has(member)) return "state.cookies";
    return member.startsWith("[") ? "infrastructure.events-errors" : "browser.contexts-tabs-targets";
  }
  if (className === "ElementHandle") {
    if (sets.elementInteraction.has(member)) return "page.interaction";
    if (sets.elementFiles.has(member)) return "page.files-dialogs";
    if (sets.elementEvidence.has(member)) return "evidence.screenshot-pdf";
    if (["contentFrame", "frame"].includes(member)) return "page.frames-workers";
    return "page.locators-selection";
  }
  if (className === "Frame") {
    if (sets.frameSelection.has(member)) return "page.locators-selection";
    if (sets.frameEvaluation.has(member)) return "page.evaluation-realms";
    if (sets.frameInteraction.has(member)) return "page.interaction";
    if (sets.frameNavigation.has(member)) return "page.navigation";
    if (sets.frameTopology.has(member)) return "page.frames-workers";
    if (member === "extensionRealms") return "browser.extensions";
    return "page.evaluation-realms";
  }
  if (className === "Page") {
    if (sets.pageAccessibility.has(member)) return "page.accessibility";
    if (sets.pageBluetooth.has(member)) return "devices.bluetooth";
    if (sets.pageCoverage.has(member)) return "evidence.coverage";
    if (sets.pageTracing.has(member)) return "evidence.tracing";
    if (sets.pageEvidence.has(member)) return "evidence.screenshot-pdf";
    if (sets.pageScreencast.has(member)) return "evidence.screencast";
    if (sets.pageMetrics.has(member)) return "evidence.heap-metrics-console";
    if (sets.pageProtocol.has(member)) return "protocol.cdp";
    if (sets.pageWindow.has(member)) return "browser.window-screen";
    if (sets.pageFiles.has(member)) return "page.files-dialogs";
    if (sets.pageInput.has(member)) return member === "keyboard" ? "page.input-keyboard" : "page.input-pointer-touch";
    if (sets.pageFrames.has(member)) return "page.frames-workers";
    if (sets.pageContexts.has(member)) return "browser.contexts-tabs-targets";
    if (sets.pageSelection.has(member)) return "page.locators-selection";
    if (sets.pageInteraction.has(member)) return "page.interaction";
    if (sets.pageNavigation.has(member)) return "page.navigation";
    if (sets.pageEvaluation.has(member)) return "page.evaluation-realms";
    if (sets.pageNetwork.has(member)) return member.includes("Cookie") || member === "cookies" ? "state.cookies" : "network.http-interception";
    if (sets.pageEmulation.has(member)) return "page.emulation";
    if (member === "triggerExtensionAction" || member === "extensionRealms") return "browser.extensions";
    if (member === "webmcp") return "webmcp.page-tools";
    if (member.startsWith("[") ) return "infrastructure.events-errors";
    return "page.navigation";
  }
  throw new Error(`No category rule for ${className}.${member}.`);
}

const classDeclarations = snapshot.declarations.filter((entry) => entry.kind === "class");
const items = classDeclarations.flatMap((declaration) => declaration.members.map((member) => {
  const category = classify(declaration.name, member.id);
  const definition = categories[category];
  return {
    id: `${declaration.name}.${member.id}`,
    class: declaration.name,
    member: member.id,
    memberKind: member.kind,
    deprecated: member.deprecated,
    category,
    upstreamDocs: `https://pptr.dev/api/puppeteer.${declaration.name.toLowerCase()}`,
    status: {
      crawler: definition.crawler.status,
      cockroachBrowser: definition.browser.status,
      crawlerAdapter: definition.adapter.status
    }
  };
}));

function statusCounts(key) {
  return Object.fromEntries(["supported", "partial", "missing", "not-applicable"].map((status) => [
    status,
    items.filter((item) => item.status[key] === status).length
  ]));
}

const categoryRows = Object.entries(categories).map(([id, definition]) => ({
  id,
  title: definition.title,
  upstreamGuide: definition.guide,
  memberCount: items.filter((item) => item.category === id).length,
  crawler: definition.crawler,
  cockroachBrowser: definition.browser,
  crawlerAdapter: definition.adapter
}));

const matrix = {
  schemaVersion: "cockroach.puppeteer-gap-matrix.v1",
  baseline: snapshot.upstream,
  semantics: {
    supported: "Equivalent capability is implemented and tested; this does not imply API-shape compatibility unless explicitly stated.",
    partial: "A bounded subset or adapter-backed equivalent exists, with the stated gaps.",
    missing: "No shipped equivalent capability was found.",
    "not-applicable": "The member is library infrastructure rather than a product capability."
  },
  claim: {
    fullParity: false,
    apiCompatible: false,
    note: "Cockroach Crawler and Cockroach Browser do not claim Puppeteer 25.5.0 parity. This matrix is the exact implementation backlog."
  },
  inventory: {
    declarations: snapshot.counts.declarations,
    classes: snapshot.counts.classes,
    classMembers: snapshot.counts.classMembers,
    classMethods: items.filter((item) => item.memberKind === "method").length,
    nonDeprecatedClassMethods: items.filter((item) => item.memberKind === "method" && !item.deprecated).length,
    matrixItems: items.length,
    categories: categoryRows.length
  },
  summary: {
    crawler: statusCounts("crawler"),
    cockroachBrowser: statusCounts("cockroachBrowser"),
    crawlerAdapter: statusCounts("crawlerAdapter")
  },
  evidence,
  categories: categoryRows,
  items
};

await writeFile(path.resolve(outputArg), `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ inventory: matrix.inventory, summary: matrix.summary }));
