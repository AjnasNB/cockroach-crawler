import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { spawn } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "bin", "cockroach-crawl.js");

let server;
let baseUrl;
let tempDir;

function runCli(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd: root,
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

before(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "cockroach-crawler-test-"));
  server = createServer((req, res) => {
    if (req.url === "/robots.txt") {
      res.setHeader("content-type", "text/plain");
      res.end("User-agent: *\nDisallow: /private\n");
      return;
    }
    if (req.url === "/") {
      res.setHeader("content-type", "text/html");
      res.end("<html><head><title>CLI Home</title></head><body><main><h1>CLI Home</h1><a href=\"/about\">About</a><a href=\"/login\">Login</a></main></body></html>");
      return;
    }
    if (req.url === "/about") {
      res.setHeader("content-type", "text/html");
      res.end("<html><body><main><h1>About CLI</h1><p>Agent-friendly output.</p></main></body></html>");
      return;
    }
    res.statusCode = 404;
    res.end("missing");
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(tempDir, { recursive: true, force: true });
});

test("CLI help and version execute successfully", async () => {
  const help = await runCli(["--help"]);
  assert.equal(help.code, 0);
  assert.match(help.stdout, /Cockroach Crawler/);

  const version = await runCli(["--version"]);
  assert.equal(version.code, 0);
  assert.match(version.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test("CLI rejects invalid option values with a friendly error", async () => {
  const result = await runCli(["--max-pages", "nope", baseUrl]);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /--max-pages must be an integer >= 1/);
});

test("CLI writes crawl output to nested JSON file", async () => {
  const output = path.join(tempDir, "nested", "crawl.json");
  const result = await runCli([baseUrl, "--allow-private-networks", "--max-pages", "3", "--delay", "0", "--output", output]);
  assert.equal(result.code, 0, result.stderr);

  const parsed = JSON.parse(await readFile(output, "utf8"));
  assert.equal(parsed.pages.some((page) => page.url.endsWith("/login")), false);
  assert.equal(parsed.pages.some((page) => page.title === "CLI Home"), true);
  assert.equal(parsed.stats.skippedNonPublic, 1);
});

test("CLI writes JSONL when requested", async () => {
  const result = await runCli([baseUrl, "--allow-private-networks", "--max-pages", "1", "--delay", "0", "--jsonl"]);
  assert.equal(result.code, 0, result.stderr);

  const lines = result.stdout.trim().split(/\r?\n/);
  assert.equal(lines.length, 1);
  const page = JSON.parse(lines[0]);
  assert.equal(page.title, "CLI Home");
});

test("CLI validates browser options before launching Playwright", async () => {
  const result = await runCli([baseUrl, "--browser", "--wait-until", "idle-ish", "--allow-private-networks"]);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /browser\.waitUntil must be one of/);
});
