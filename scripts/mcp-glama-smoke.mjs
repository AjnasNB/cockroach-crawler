import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const child = spawn(process.execPath, [path.join(root, "bin", "cockroach-mcp.js")], {
  cwd: root,
  env: {
    ...process.env,
    COCKROACH_ALLOWED_ORIGINS: "https://example.com"
  },
  shell: false,
  stdio: ["pipe", "pipe", "pipe"]
});

child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");

let sequence = 0;
let stdout = "";
let stderr = "";
const pending = new Map();

const timeoutMs = 30_000;

function withTimeout(promise, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
    timer.unref?.();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function send(message) {
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

function request(method, params = undefined) {
  const id = ++sequence;
  const response = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  send({ jsonrpc: "2.0", id, method, ...(params === undefined ? {} : { params }) });
  return withTimeout(response, method);
}

function receive(message) {
  if (!Object.hasOwn(message, "id")) return;
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(message.error.message || "MCP request failed."));
  else waiter.resolve(message.result);
}

child.stderr.on("data", (chunk) => { stderr += chunk; });
child.stdout.on("data", (chunk) => {
  stdout += chunk;
  while (true) {
    const newline = stdout.indexOf("\n");
    if (newline === -1) break;
    const frame = stdout.slice(0, newline).trimEnd();
    stdout = stdout.slice(newline + 1);
    if (frame) receive(JSON.parse(frame));
  }
});
child.on("error", (error) => {
  for (const waiter of pending.values()) waiter.reject(error);
  pending.clear();
});

try {
  const initialized = await request("initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "cockroach-glama-smoke", version: packageJson.version }
  });
  assert.equal(initialized.protocolVersion, "2025-11-25");
  assert.deepEqual(initialized.serverInfo, {
    name: "cockroach-crawler",
    version: packageJson.version
  });
  assert.deepEqual(initialized.capabilities, {
    tools: { listChanged: false },
    resources: { subscribe: false, listChanged: false }
  });
  send({ jsonrpc: "2.0", method: "notifications/initialized" });

  const tools = await request("tools/list", {});
  assert.deepEqual(tools.tools.map(({ name }) => name), [
    "crawl",
    "map_site",
    "select",
    "find_similar",
    "relocate_element",
    "crawl_spider",
    "export_records",
    "extract_structured"
  ]);
  for (const tool of tools.tools) {
    assert.equal(tool.annotations.readOnlyHint, true, tool.name);
    assert.equal(tool.annotations.destructiveHint, false, tool.name);
    assert.equal(tool.annotations.idempotentHint, true, tool.name);
    assert.equal(tool.inputSchema.type, "object", tool.name);
    assert.equal(tool.inputSchema.additionalProperties, false, tool.name);
  }

  const resources = await request("resources/list", {});
  assert.deepEqual(resources.resources.map(({ uri }) => uri), ["cockroach://capabilities"]);
  const boundary = await request("resources/read", { uri: "cockroach://capabilities" });
  assert.equal(boundary.contents[0].uri, "cockroach://capabilities");
} finally {
  child.stdin.end();
}

const exit = await withTimeout(
  new Promise((resolve) => child.once("close", (code, signal) => resolve({ code, signal }))),
  "stdio shutdown"
);
assert.deepEqual(exit, { code: 0, signal: null }, stderr);
assert.equal(stderr, "");

process.stdout.write(`${JSON.stringify({
  ok: true,
  server: "cockroach-crawler",
  version: packageJson.version,
  tools: 8,
  resources: 1
}, null, 2)}\n`);
