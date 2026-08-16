import assert from "node:assert/strict";
import http from "node:http";
import { readFileSync } from "node:fs";
import test from "node:test";
import { chromium, firefox } from "playwright";
import {
  createGovernedBrowserAutomation,
  createGovernedPlaywrightBackend
} from "../src/browser-automation.js";

function listen(handler) {
  const server = http.createServer(handler);
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

function authority(origin, actions, effects) {
  return {
    principalId: "real-engine-smoke",
    allowedOrigins: [origin],
    allowedActions: actions,
    allowedEffects: effects,
    maxActions: 60,
    maxActionMs: 10_000,
    maxSessionMs: 60_000,
    maxArtifactBytes: 1_000_000,
    maxUploadBytes: 1_000_000,
    maxTotalArtifactBytes: 2_000_000,
    maxTotalUploadBytes: 2_000_000,
    maxNetworkRequestBytes: 1_000_000,
    maxNetworkResponseBytes: 2_000_000,
    maxTotalNetworkRequestBytes: 4_000_000,
    maxTotalNetworkResponseBytes: 8_000_000
  };
}

for (const [engineName, browserType] of [["Chromium", chromium], ["Firefox", firefox]]) {
test(`installed ${engineName} executes the matrix-marked governed action subset and origin denial`, { timeout: 60_000 }, async (t) => {
  const escape = await listen((_request, response) => {
    response.writeHead(200, { "content-type": "text/html" });
    response.end("<title>escape</title>");
  });
  const app = await listen((request, response) => {
    if (request.url === "/file") {
      response.writeHead(200, {
        "content-type": "application/octet-stream",
        "content-disposition": "attachment; filename=report.bin"
      });
      response.end("downloaded-evidence");
      return;
    }
    if (request.url === "/redirect") {
      response.writeHead(302, { location: `${escape.origin}/outside` });
      response.end();
      return;
    }
    if (request.url === "/frame") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end("<!doctype html><title>frame</title><div id=inside>frame evidence</div>");
      return;
    }
    response.writeHead(200, { "content-type": "text/html" });
    response.end(`<!doctype html><title>governed</title>
      <input id="name"><input id="typed"><input id="agree" type="checkbox">
      <select id="choice"><option value="one">one</option><option value="two">two</option></select>
      <input id="files" type="file" multiple><iframe src="/frame"></iframe>
      <a id="download" href="/file" download>download</a>
      <button id="popup" onclick="window.open('/popup')">popup</button>`);
  });
  t.after(() => new Promise((resolve) => app.server.close(resolve)));
  t.after(() => new Promise((resolve) => escape.server.close(resolve)));

  const browser = await browserType.launch({ headless: true });
  t.after(() => browser.close());
  const artifacts = [];
  let context;
  const services = {
    async createSession() {
      context = await browser.newContext({ acceptDownloads: true, serviceWorkers: "block" });
      const page = await context.newPage();
      return {
        context, page, browser, ownedContext: true, browserOwned: false,
        networkIsolation: { serviceWorkers: "block", webSockets: "block", nonRoutedEgress: "host-blocked" }
      };
    },
    async authorizeRequest({ origin }) { return { allowed: origin === app.origin }; },
    async resolveFileRefs({ fileRefs }) {
      return fileRefs.map((ref, index) => ({
        ref,
        name: `evidence-${index}.txt`,
        mimeType: "text/plain",
        buffer: Buffer.from(`upload-${index}`)
      }));
    },
    async saveArtifact(value) { artifacts.push(value); }
  };
  const concreteBackend = createGovernedPlaywrightBackend(services);
  const observedActions = new Set();
  const backend = {
    supportedActions: concreteBackend.supportedActions,
    openSession: (...args) => concreteBackend.openSession(...args),
    runAction: (...args) => {
      observedActions.add(args[1].kind);
      return concreteBackend.runAction(...args);
    },
    closeSession: (...args) => concreteBackend.closeSession(...args)
  };
  const actions = [
    "fill", "type", "focus", "keyboard.insertText", "check", "select", "scroll", "mouse.move",
    "wait.selector", "locator.inspect", "page.title", "page.url", "page.content", "history.inspect",
    "frame.list", "frame.select", "tab.open", "tab.close", "cookies.write", "cookies.read",
    "storage.write", "storage.read", "network.inspect", "network.requests", "screenshot",
    "upload", "click", "navigate"
  ];
  const effects = ["read", "write", "upload", "download", "credential"];
  const adapter = createGovernedBrowserAutomation({
    backend,
    policy: { allowedActions: actions, allowedEffects: effects, maxActionMs: 10_000 }
  });
  const rawAuthority = authority(app.origin, actions, effects);
  const opened = await adapter.openSession({
    allowedOrigins: [app.origin],
    purpose: "installed engine smoke"
  }, rawAuthority);
  const bound = { ...rawAuthority, authorityId: opened.authorityId };

  await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "navigate", origin: app.origin, url: `${app.origin}/`, waitUntil: "load", timeoutMs: 5_000 }
  }, bound);

  await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "fill", origin: app.origin, selector: "#name", text: "governed" }
  }, bound);
  await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "click", origin: app.origin, selector: "#name" }
  }, bound);
  assert.equal(await context.pages()[0].locator("#name").inputValue(), "governed");

  await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "type", origin: app.origin, selector: "#typed", text: "typed", delayMs: 1 }
  }, bound);
  await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "focus", origin: app.origin, selector: "#name" }
  }, bound);
  await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "keyboard.insertText", origin: app.origin, text: " value" }
  }, bound);
  await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "check", origin: app.origin, selector: "#agree" }
  }, bound);
  await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "select", origin: app.origin, selector: "#choice", values: ["two"] }
  }, bound);
  assert.equal(await context.pages()[0].locator("#name").inputValue(), "governed value");
  assert.equal(await context.pages()[0].locator("#typed").inputValue(), "typed");
  assert.equal(await context.pages()[0].locator("#agree").isChecked(), true);
  assert.equal(await context.pages()[0].locator("#choice").inputValue(), "two");

  await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "wait.selector", origin: app.origin, selector: "#download", state: "visible", timeoutMs: 2_000 }
  }, bound);
  const inspected = await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "locator.inspect", origin: app.origin, selector: "button", limit: 5 }
  }, bound);
  assert.equal(inspected.data.length, 1);
  const title = await adapter.act({ sessionId: opened.sessionId, action: { kind: "page.title", origin: app.origin } }, bound);
  const url = await adapter.act({ sessionId: opened.sessionId, action: { kind: "page.url", origin: app.origin } }, bound);
  const content = await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "page.content", origin: app.origin, maxChars: 10_000 }
  }, bound);
  const history = await adapter.act({ sessionId: opened.sessionId, action: { kind: "history.inspect", origin: app.origin } }, bound);
  assert.equal(title.data.title, "governed");
  assert.equal(url.data.url, `${app.origin}/`);
  assert.match(content.data.content, /id="download"/);
  assert.ok(history.data.length >= 1);

  const frames = await adapter.act({ sessionId: opened.sessionId, action: { kind: "frame.list", origin: app.origin } }, bound);
  const childFrame = frames.data.find((entry) => entry.url.endsWith("/frame"));
  const mainFrame = frames.data.find((entry) => entry.url === `${app.origin}/`);
  assert.ok(childFrame?.frameId);
  assert.ok(mainFrame?.frameId);
  await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "frame.select", origin: app.origin, frameId: childFrame.frameId }
  }, bound);
  await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "wait.selector", origin: app.origin, selector: "#inside", state: "visible", timeoutMs: 2_000 }
  }, bound);
  const frameEvidence = await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "locator.inspect", origin: app.origin, selector: "#inside", limit: 1 }
  }, bound);
  assert.equal(frameEvidence.data[0].text, "frame evidence");
  await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "navigate", origin: app.origin, url: `${app.origin}/`, waitUntil: "load", timeoutMs: 5_000 }
  }, bound);
  const titleAfterFrameNavigation = await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "page.title", origin: app.origin }
  }, bound);
  assert.equal(titleAfterFrameNavigation.data.title, "governed");

  await adapter.act({ sessionId: opened.sessionId, action: { kind: "scroll", origin: app.origin, deltaY: 10 } }, bound);
  await adapter.act({ sessionId: opened.sessionId, action: { kind: "mouse.move", origin: app.origin, x: 5, y: 5 } }, bound);

  await adapter.act({
    sessionId: opened.sessionId,
    action: {
      kind: "cookies.write",
      origin: app.origin,
      cookies: [{ name: "evidence", value: "one", url: `${app.origin}/` }]
    }
  }, bound);
  const cookies = await adapter.act({ sessionId: opened.sessionId, action: { kind: "cookies.read", origin: app.origin } }, bound);
  assert.ok(cookies.data.some((cookie) => cookie.name === "evidence"));
  await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "storage.write", origin: app.origin, area: "local", entries: { evidence: "stored" } }
  }, bound);
  const storage = await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "storage.read", origin: app.origin, area: "local", key: "evidence" }
  }, bound);
  assert.equal(storage.data.evidence, "stored");

  const network = await adapter.act({ sessionId: opened.sessionId, action: { kind: "network.inspect", origin: app.origin } }, bound);
  const requests = await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "network.requests", origin: app.origin, limit: 10 }
  }, bound);
  assert.ok(network.data.requests >= 1);
  assert.ok(requests.data.length >= 1);

  const screenshot = await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "screenshot", origin: app.origin, artifactName: "page.png", maxBytes: 500_000, format: "png" }
  }, bound);
  assert.equal(screenshot.attestation.artifact.name, "page.png");

  await adapter.act({
    sessionId: opened.sessionId,
    action: {
      kind: "upload", origin: app.origin, selector: "#files", fileRefs: ["file:one", "file:two"],
      maxFileBytes: 100, maxBytes: 200
    }
  }, bound);
  assert.deepEqual(await context.pages()[0].locator("#files").evaluate((input) => [...input.files].map((file) => file.name)), [
    "evidence-0.txt", "evidence-1.txt"
  ]);

  assert.deepEqual(artifacts.map((entry) => entry.name), ["page.png"]);

  const openedTab = await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "tab.open", origin: app.origin }
  }, bound);
  assert.ok(openedTab.data.pageId);
  await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "navigate", origin: app.origin, url: `${app.origin}/tab`, waitUntil: "load", timeoutMs: 5_000 }
  }, bound);
  await adapter.act({
    sessionId: opened.sessionId,
    action: { kind: "tab.close", origin: app.origin, tabId: openedTab.data.pageId }
  }, bound);

  await assert.rejects(
    () => adapter.act({
      sessionId: opened.sessionId,
      action: { kind: "navigate", origin: app.origin, url: `${app.origin}/redirect`, waitUntil: "load", timeoutMs: 5_000 }
    }, bound),
    (error) => error.code === "BROWSER_AUTOMATION_ORIGIN_VIOLATION"
  );
  assert.equal(context.pages().every((page) => page.isClosed()), true);
  const matrix = JSON.parse(readFileSync(
    new URL("../docs/browser-automation-capability-matrix.json", import.meta.url),
    "utf8"
  ));
  const expectedActions = matrix.actions
    .filter((entry) => entry.realEngineIntegrationVerified)
    .map((entry) => entry.kind);
  assert.deepEqual([...observedActions].sort(), [...expectedActions].sort());
});
}
