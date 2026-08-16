import {
  activePage,
  activeTarget,
  engineActionResult,
  frameId,
  locator,
  optionalMethod,
  pageId,
  plainResponse,
  requiredMethod,
  safeUrl
} from "./engine-helpers.js";
import { browserAutomationFail } from "./errors.js";

function waitOptions(action) {
  return Object.freeze({
    ...(action.waitUntil === undefined ? {} : { waitUntil: action.waitUntil }),
    ...(action.timeoutMs === undefined ? {} : { timeout: action.timeoutMs })
  });
}

export const navigationHandlers = Object.freeze({
  "session.inspect": async (session) => engineActionResult({
    activePageId: session.activePage ? pageId(session, session.activePage) : null,
    pageCount: session.pages.size,
    frameCount: session.frames.size,
    workerCount: session.workers.size
  }),
  "page.list": async (session) => {
    const pages = optionalMethod(session.context, "pages")?.() ?? [...session.pages.values()];
    for (const page of pages) session.assertPageOrigin(page);
    return engineActionResult(await Promise.all(pages.map(async (page) => ({
      pageId: pageId(session, page),
      url: safeUrl(optionalMethod(page, "url")?.() ?? ""),
      title: optionalMethod(page, "title") ? await page.title() : ""
    }))));
  },
  "tab.open": async (session, action) => {
    const page = await requiredMethod(session.context, "newPage", action.kind)();
    session.attachPage(page);
    session.activePage = page;
    session.activeFrame = null;
    const id = pageId(session, page);
    return engineActionResult({ pageId: id, url: "about:blank" });
  },
  "tab.close": async (session, action) => {
    const page = session.pages.get(action.tabId);
    if (!page) return engineActionResult({ closed: false, reason: "unknown-tab" });
    session.assertPageOrigin(page);
    await requiredMethod(page, "close", action.kind)();
    session.pages.delete(action.tabId);
    if (session.activePage === page) {
      session.activePage = [...session.pages.values()][0] ?? null;
      session.activeFrame = null;
    }
    return engineActionResult({ closed: true });
  },
  "tab.switch": async (session, action) => {
    const page = session.pages.get(action.tabId);
    if (!page) return engineActionResult({ switched: false, reason: "unknown-tab" });
    session.assertPageOrigin(page);
    session.activePage = page;
    session.activeFrame = null;
    await optionalMethod(page, "bringToFront")?.();
    return engineActionResult({ switched: true, pageId: action.tabId });
  },
  "tab.lock": async (session, action) => {
    session.lockedTabs.add(action.tabId);
    return engineActionResult({ locked: true });
  },
  "tab.unlock": async (session, action) => {
    session.lockedTabs.delete(action.tabId);
    return engineActionResult({ locked: false });
  },
  "tab.lock.status": async (session, action) => engineActionResult({ locked: session.lockedTabs.has(action.tabId) }),
  "popup.wait": async (session, action) => {
    const popup = activePage(session, action.kind);
    return engineActionResult({ pageId: pageId(session, popup), url: safeUrl(optionalMethod(popup, "url")?.() ?? "") });
  },
  "frame.list": async (session, action) => {
    const frames = requiredMethod(activePage(session, action.kind), "frames", action.kind)();
    if (frames.length > 256) {
      await session.quarantine?.("frame resource limit exceeded");
      browserAutomationFail("BROWSER_AUTOMATION_RESOURCE_LIMIT", "The governed browser session exceeded its frame limit.");
    }
    return engineActionResult(frames.map((entry) => ({
      frameId: session.registerFrame ? session.registerFrame(entry) : frameId(session, entry),
      url: safeUrl(optionalMethod(entry, "url")?.() ?? ""),
      name: optionalMethod(entry, "name")?.() ?? ""
    })));
  },
  "frame.select": async (session, action) => {
    const selected = session.frames.get(action.frameId);
    if (!selected) return engineActionResult({ selected: false, reason: "unknown-frame" });
    session.activeFrame = selected;
    return engineActionResult({ selected: true, frameId: action.frameId });
  },
  navigate: async (session, action) => {
    session.activeFrame = null;
    const response = await requiredMethod(activePage(session, action.kind), "goto", action.kind)(action.url, waitOptions(action));
    return engineActionResult({ ...plainResponse(response), url: safeUrl(action.url) });
  },
  back: async (session, action) => {
    session.activeFrame = null;
    const response = await requiredMethod(activePage(session, action.kind), "goBack", action.kind)(waitOptions(action));
    return engineActionResult(plainResponse(response));
  },
  forward: async (session, action) => {
    session.activeFrame = null;
    const response = await requiredMethod(activePage(session, action.kind), "goForward", action.kind)(waitOptions(action));
    return engineActionResult(plainResponse(response));
  },
  reload: async (session, action) => {
    session.activeFrame = null;
    const response = await requiredMethod(activePage(session, action.kind), "reload", action.kind)(waitOptions(action));
    return engineActionResult(plainResponse(response));
  },
  wait: async (session, action) => {
    await requiredMethod(activePage(session, action.kind), "waitForTimeout", action.kind)(action.durationMs);
    return engineActionResult({ waitedMs: action.durationMs });
  },
  "wait.selector": async (session, action) => {
    await requiredMethod(activeTarget(session, action.kind), "waitForSelector", action.kind)(action.selector, {
      state: action.state,
      timeout: action.timeoutMs
    });
    return engineActionResult({ matched: true });
  },
  "wait.url": async (session, action) => {
    await requiredMethod(activePage(session, action.kind), "waitForURL", action.kind)(action.url, { timeout: action.timeoutMs });
    return engineActionResult({ matched: true, url: safeUrl(action.url) });
  },
  "history.inspect": async (session, action) => engineActionResult(await requiredMethod(activePage(session, action.kind), "evaluate", action.kind)(
    () => ({ length: history.length, state: history.state })
  )),
  "locator.inspect": async (session, action) => {
    const target = locator(session, action.selector, action.kind);
    const count = Math.min(await requiredMethod(target, "count", action.kind)(), action.limit ?? 100);
    const entries = [];
    let textCharacters = 0;
    for (let index = 0; index < count; index += 1) {
      const item = requiredMethod(target, "nth", action.kind)(index);
      const text = optionalMethod(item, "evaluate")
        ? await item.evaluate((element) => String(element.textContent ?? "").slice(0, 4_096))
        : null;
      textCharacters += text?.length ?? 0;
      if (textCharacters > 1_000_000) break;
      entries.push({
        index,
        text,
        visible: optionalMethod(item, "isVisible") ? await item.isVisible() : null
      });
    }
    return engineActionResult(entries);
  }
});
