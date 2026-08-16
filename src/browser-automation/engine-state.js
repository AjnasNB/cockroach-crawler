import { activePage, engineActionResult, requiredMethod, serviceInput } from "./engine-helpers.js";
import { boundedJson } from "./validation.js";

export const stateHandlers = Object.freeze({
  "clipboard.read": async (session, action) => engineActionResult({
    text: await requiredMethod(activePage(session, action.kind), "evaluate", action.kind)(() => navigator.clipboard.readText())
  }),
  "clipboard.write": async (session, action) => {
    await requiredMethod(activePage(session, action.kind), "evaluate", action.kind)(
      (text) => navigator.clipboard.writeText(text), action.text
    );
    return engineActionResult({ written: true });
  },
  "cookies.read": async (session, action) => engineActionResult(await requiredMethod(session.context, "cookies", "cookies.read")(`${action.origin}/`)),
  "cookies.write": async (session, action) => {
    await requiredMethod(session.context, "addCookies", action.kind)(action.cookies);
    return engineActionResult({ written: Array.isArray(action.cookies) ? action.cookies.length : 0 });
  },
  "storage.read": async (session, action) => engineActionResult(await requiredMethod(activePage(session, action.kind), "evaluate", action.kind)(
    ({ area, key }) => {
      const storage = area === "local" ? localStorage : sessionStorage;
      if (key) return { [key]: storage.getItem(key) };
      return Object.fromEntries(Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(Boolean).map((name) => [name, storage.getItem(name)]));
    },
    { area: action.area, key: action.key }
  )),
  "storage.write": async (session, action) => {
    await requiredMethod(activePage(session, action.kind), "evaluate", action.kind)(
      ({ area, entries }) => {
        const storage = area === "local" ? localStorage : sessionStorage;
        for (const [key, value] of Object.entries(entries)) storage.setItem(key, String(value));
      },
      { area: action.area, entries: action.entries }
    );
    return engineActionResult({ writtenKeys: Object.keys(action.entries) });
  },
  "storage.clear": async (session, action) => {
    await requiredMethod(activePage(session, action.kind), "evaluate", action.kind)(
      (area) => (area === "local" ? localStorage : sessionStorage).clear(), action.area
    );
    return engineActionResult({ cleared: true, area: action.area });
  },
  "state.save": async (session, action) => {
    const state = boundedJson(
      await requiredMethod(session.context, "storageState", action.kind)(),
      "Browser storage state",
      { maxDepth: 8, maxNodes: 2_048, maxString: 1_000_000 }
    );
    await session.services.saveState(serviceInput(session, {
      sessionId: session.publicSessionId,
      stateRef: action.stateRef,
      state
    }));
    return engineActionResult({ stateRef: action.stateRef, saved: true });
  },
  "state.load": async (session, action) => {
    const state = boundedJson(await session.services.loadState(serviceInput(session, {
      sessionId: session.publicSessionId,
      stateRef: action.stateRef
    })), "Trusted loaded browser state", { maxDepth: 8, maxNodes: 2_048, maxString: 1_000_000 });
    await session.services.applyState(serviceInput(session, { session, stateRef: action.stateRef, state }));
    return engineActionResult({ stateRef: action.stateRef, loaded: true });
  },
  "state.list": async (session) => engineActionResult(boundedJson(
    await session.services.listStates(serviceInput(session, { sessionId: session.publicSessionId })),
    "Trusted browser state list", { maxDepth: 2, maxNodes: 1_024, maxString: 256 }
  )),
  "state.delete": async (session, action) => {
    await session.services.deleteState(serviceInput(session, { sessionId: session.publicSessionId, stateRef: action.stateRef }));
    return engineActionResult({ stateRef: action.stateRef, deleted: true });
  },
  "permissions.set": async (session, action) => {
    await requiredMethod(session.context, "grantPermissions", action.kind)(action.permissions, { origin: action.origin });
    return engineActionResult({ permissions: action.permissions });
  },
  "geolocation.set": async (session, action) => {
    await requiredMethod(session.context, "setGeolocation", action.kind)({
      latitude: action.latitude,
      longitude: action.longitude,
      accuracy: action.accuracy
    });
    return engineActionResult({ set: true });
  },
  "emulation.set": async (session, action) => {
    await session.services.applyEmulation(serviceInput(session, { session, settings: action.settings }));
    return engineActionResult({ applied: true, settingNames: Object.keys(action.settings) });
  }
});
