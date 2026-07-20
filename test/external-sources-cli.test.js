import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const runFile = promisify(execFile);
const executable = fileURLToPath(new URL("../bin/cockroach-reach.js", import.meta.url));

async function run(args) {
  return runFile(process.execPath, [executable, ...args], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    windowsHide: true,
    timeout: 10_000,
    encoding: "utf8"
  });
}

test("cockroach-reach help documents safe commands and supported channels", async () => {
  const { stdout, stderr } = await run(["--help"]);
  assert.equal(stderr, "");
  assert.match(stdout, /cockroach-reach doctor/);
  assert.match(stdout, /dry-run plans by default/);
  assert.match(stdout, /linkedin/);
  assert.doesNotMatch(stdout, /bilibili/i);
});

test("cockroach-reach doctor emits immutable-boundary provider statuses as JSON", async () => {
  const { stdout, stderr } = await run(["doctor", "--json"]);
  assert.equal(stderr, "");
  const statuses = JSON.parse(stdout);
  assert.deepEqual(statuses.map(({ id }) => id), [
    "x-session",
    "reddit-session",
    "facebook-session",
    "instagram-session",
    "xiaohongshu-session",
    "linkedin-session",
    "youtube-no-key"
  ]);
  assert.equal(statuses.some(({ id }) => /bilibili/i.test(id)), false);
  assert.equal(statuses.find(({ id }) => id === "linkedin-session").status, "partial");
});

test("cockroach-reach setup is dry-run and uses only reviewed pinned dependencies", async () => {
  const { stdout, stderr } = await run(["setup", "--channels", "reddit,youtube", "--json"]);
  assert.equal(stderr, "");
  const result = JSON.parse(stdout);
  assert.equal(result.mode, "dry-run");
  assert.deepEqual(result.results, []);
  const serialized = JSON.stringify(result.plan);
  assert.match(serialized, /@jackwener\/opencli@1\.8\.6/);
  assert.match(serialized, /yt-dlp==2025\.5\.22/);
  assert.equal(serialized.includes("@latest"), false);
});

test("cockroach-reach update defaults to a pinned check plan", async () => {
  const { stdout, stderr } = await run(["update", "--channels", "linkedin", "--json"]);
  assert.equal(stderr, "");
  const result = JSON.parse(stdout);
  assert.equal(result.mode, "dry-run");
  assert.deepEqual(result.plan.channels, ["linkedin"]);
  assert.equal(JSON.stringify(result).includes("@latest"), false);
  assert.deepEqual(result.plan.steps.map(({ id }) => id), [
    "opencli-package",
    "linkedin-mcp-review"
  ]);
});

test("cockroach-reach rejects Bilibili, unknown flags, duplicates, and doctor mutation flags", async (t) => {
  const cases = [
    [["setup", "--channels", "bilibili"], /Unsupported external source channel 'bilibili'/],
    [["setup", "--execute"], /Unknown option or positional argument '--execute'/],
    [["update", "--json", "--json"], /--json may be provided only once/],
    [["doctor", "--apply"], /doctor does not accept --apply/],
    [["doctor", "unexpected"], /Unknown option or positional argument 'unexpected'/]
  ];
  for (const [args, pattern] of cases) {
    await t.test(args.join(" "), async () => {
      await assert.rejects(run(args), (error) => {
        assert.notEqual(error.code, 0);
        assert.match(error.stderr, pattern);
        return true;
      });
    });
  }
});
