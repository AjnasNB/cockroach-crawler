import { activePage, engineActionResult, locator, requiredMethod } from "./engine-helpers.js";

function selectorHandler(method) {
  return async (session, action) => {
    const target = locator(session, action.selector, action.kind);
    await requiredMethod(target, method, action.kind)();
    return engineActionResult({ completed: true });
  };
}

export const inputHandlers = Object.freeze({
  click: async (session, action) => {
    await requiredMethod(locator(session, action.selector, action.kind), "click", action.kind)({
      button: action.button,
      clickCount: action.count
    });
    return engineActionResult({ completed: true });
  },
  doubleClick: async (session, action) => {
    await requiredMethod(locator(session, action.selector, action.kind), "dblclick", action.kind)({ button: action.button });
    return engineActionResult({ completed: true });
  },
  fill: async (session, action) => {
    await requiredMethod(locator(session, action.selector, action.kind), "fill", action.kind)(action.text);
    return engineActionResult({ completed: true });
  },
  type: async (session, action) => {
    await requiredMethod(locator(session, action.selector, action.kind), "pressSequentially", action.kind)(action.text, { delay: action.delayMs });
    return engineActionResult({ completed: true });
  },
  hover: selectorHandler("hover"),
  focus: selectorHandler("focus"),
  check: selectorHandler("check"),
  uncheck: selectorHandler("uncheck"),
  select: async (session, action) => {
    const values = await requiredMethod(locator(session, action.selector, action.kind), "selectOption", action.kind)(action.values);
    return engineActionResult({ values });
  },
  "form.submit": async (session, action) => {
    await requiredMethod(locator(session, action.selector, action.kind), "evaluate", action.kind)(
      (element) => element.requestSubmit ? element.requestSubmit() : element.submit()
    );
    return engineActionResult({ submitted: true });
  },
  press: async (session, action) => {
    const target = action.selector ? locator(session, action.selector, action.kind) : activePage(session, action.kind).keyboard;
    await requiredMethod(target, "press", action.kind)(action.key);
    return engineActionResult({ completed: true });
  },
  "keyboard.down": async (session, action) => {
    await requiredMethod(activePage(session, action.kind).keyboard, "down", action.kind)(action.key);
    return engineActionResult({ completed: true });
  },
  "keyboard.up": async (session, action) => {
    await requiredMethod(activePage(session, action.kind).keyboard, "up", action.kind)(action.key);
    return engineActionResult({ completed: true });
  },
  "keyboard.insertText": async (session, action) => {
    await requiredMethod(activePage(session, action.kind).keyboard, "insertText", action.kind)(action.text);
    return engineActionResult({ completed: true });
  },
  scroll: async (session, action) => {
    if (action.selector) {
      await requiredMethod(locator(session, action.selector, action.kind), "scrollIntoViewIfNeeded", action.kind)();
    } else {
      await requiredMethod(activePage(session, action.kind), "evaluate", action.kind)(
        ({ x, y }) => window.scrollBy(x, y),
        { x: action.deltaX ?? 0, y: action.deltaY ?? 0 }
      );
    }
    return engineActionResult({ completed: true });
  },
  drag: async (session, action) => {
    await requiredMethod(locator(session, action.fromSelector, action.kind), "dragTo", action.kind)(
      locator(session, action.toSelector, action.kind)
    );
    return engineActionResult({ completed: true });
  },
  "touch.tap": async (session, action) => {
    await requiredMethod(activePage(session, action.kind).touchscreen, "tap", action.kind)(action.x, action.y);
    return engineActionResult({ completed: true });
  },
  "mouse.move": async (session, action) => {
    await requiredMethod(activePage(session, action.kind).mouse, "move", action.kind)(action.x, action.y, { steps: action.steps });
    return engineActionResult({ completed: true });
  },
  "mouse.down": async (session, action) => {
    await requiredMethod(activePage(session, action.kind).mouse, "down", action.kind)({ button: action.button });
    return engineActionResult({ completed: true });
  },
  "mouse.up": async (session, action) => {
    await requiredMethod(activePage(session, action.kind).mouse, "up", action.kind)({ button: action.button });
    return engineActionResult({ completed: true });
  },
  "mouse.click": async (session, action) => {
    await requiredMethod(activePage(session, action.kind).mouse, "click", action.kind)(action.x, action.y, {
      button: action.button,
      clickCount: action.count
    });
    return engineActionResult({ completed: true });
  }
});
