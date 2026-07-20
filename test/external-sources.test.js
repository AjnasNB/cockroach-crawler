import assert from "node:assert/strict";
import test from "node:test";
import { createSourceRegistry, SourceAccessError } from "../src/sources.js";
import {
  createExecFileRunner,
  createExternalSourceProviders,
  createLinkedInManualSourceProvider,
  createOpenCliSourceProviders,
  createYtDlpSourceProvider,
  externalSourceChannels,
  externalSourceProviderIds,
  setupExternalSources,
  updateExternalSources
} from "../src/external-sources.js";

const WRITE_COMMANDS = new Set([
  "post", "reply", "delete", "like", "unlike", "retweet", "unretweet", "quote", "follow", "unfollow",
  "bookmark", "unbookmark", "block", "unblock", "comment", "save", "subscribe", "publish", "delete-note",
  "collection-create", "collection-delete", "connect", "safe-send", "salesnav-message"
]);

function fakeRunner(handler) {
  const calls = [];
  const runner = async (file, args, options) => {
    calls.push({ file, args: [...args], options });
    return handler(file, args, options, calls.length - 1);
  };
  return { runner, calls };
}

function success(data) {
  return { exitCode: 0, stdout: JSON.stringify(data), stderr: "" };
}

function assertReadOnlyCommand(call, userValue) {
  assert.equal(call.args.some((arg) => WRITE_COMMANDS.has(arg)), false);
  assert.equal(call.args.includes("--cookies-from-browser"), false);
  assert.equal(call.args.includes("--cookies"), false);
  const separator = call.args.lastIndexOf("--");
  assert.notEqual(separator, -1);
  assert.equal(call.args[separator + 1], userValue);
  assert.equal(separator + 2, call.args.length, "user input remains one positional argument after --");
}

test("external provider catalog excludes Bilibili and has immutable doctor statuses", () => {
  assert.deepEqual(externalSourceChannels, ["x", "reddit", "facebook", "instagram", "xiaohongshu", "youtube", "linkedin"]);
  assert.equal(externalSourceChannels.includes("bilibili"), false);
  assert.equal(externalSourceProviderIds.some((id) => id.includes("bilibili")), false);
  const providers = createExternalSourceProviders({
    runner: async () => success([]),
    opencliAvailability: "ready",
    ytDlpAvailability: "unavailable"
  });
  assert.deepEqual(providers.map(({ id }) => id), externalSourceProviderIds);
  for (const provider of providers) {
    const status = provider.status();
    assert(Object.isFrozen(status));
    assert(Object.isFrozen(status.capabilities));
    const expectedCapability = status.status !== "unavailable";
    assert.equal(status.capabilities.search, expectedCapability);
    assert.equal(status.capabilities.read, expectedCapability);
  }
});

test("the optional LinkedIn MCP alternative is an explicit manual boundary", () => {
  const provider = createLinkedInManualSourceProvider();
  assert.equal(provider.id, "linkedin-mcp-manual");
  assert.equal(provider.search, undefined);
  assert.equal(provider.read, undefined);
  assert.deepEqual(provider.status(), {
    id: "linkedin-mcp-manual",
    status: "unavailable",
    capabilities: { search: false, read: false },
    authentication: "manual_mcp",
    message: "The optional LinkedIn MCP alternative is manual. LinkedIn session reads are available separately through the fixed OpenCLI read provider."
  });
});

test("OpenCLI providers expose only strict read-only search and read command maps", async () => {
  const fixtures = {
    "x-session": { title: "X result", id: "x1", text: "tweet", url: "https://x.com/a/status/1" },
    "reddit-session": { title: "Reddit result", id: "r1", selftext: "post", permalink: "https://reddit.com/r/test/1" },
    "facebook-session": { name: "Facebook result", id: "f1", description: "profile" },
    "instagram-session": { username: "instagram-result", id: "i1", biography: "profile" },
    "xiaohongshu-session": { title: "XHS result", note_id: "n1", description: "note" },
    "linkedin-session": { name: "LinkedIn result", profile_url: "https://www.linkedin.com/in/fixture/", headline: "Builder" }
  };
  const { runner, calls } = fakeRunner((_file, args) => {
    const id = args[0] === "twitter" ? "x-session" : `${args[0]}-session`;
    return success([fixtures[id]]);
  });
  const providers = createOpenCliSourceProviders({ runner, opencliAvailability: "ready" });
  const query = "--delete everything; $(still-one-argument)";
  const target = "https://example.com/item?value=one&next=two";
  for (const provider of providers) {
    const searchRecords = await provider.search({ query, maxResults: 3 });
    assert.equal(searchRecords.length, 1);
    assert.equal(searchRecords[0].source, provider.id);
    assert.equal(searchRecords[0].provenance.method, "opencli-browser-session");
    assert.equal(searchRecords[0].provenance.authenticated, false);
    assert.equal(searchRecords[0].metadata.authenticationUnverified, true);
    assert(Object.isFrozen(searchRecords[0]));
    assert(Object.isFrozen(searchRecords[0].metadata));
    assertReadOnlyCommand(calls.at(-1), query);

    const readTarget = provider.id === "linkedin-session"
      ? "https://www.linkedin.com/in/fixture/?tracking=removed#about"
      : target;
    const readRecords = await provider.read({ target: readTarget, maxResults: 2 });
    assert.equal(readRecords.length, 1);
    assert.equal(readRecords[0].source, provider.id);
    if (provider.id === "linkedin-session") {
      const call = calls.at(-1);
      assert.equal(call.args.some((arg) => WRITE_COMMANDS.has(arg)), false);
      assert.deepEqual(call.args, [
        "linkedin", "profile-read", "-f", "json", "--profile-url=https://www.linkedin.com/in/fixture/"
      ]);
    } else {
      assertReadOnlyCommand(calls.at(-1), target);
    }
  }
  assert.deepEqual(calls.map((call) => call.args.slice(0, 2)), [
    ["twitter", "search"], ["twitter", "thread"],
    ["reddit", "search"], ["reddit", "read"],
    ["facebook", "search"], ["facebook", "profile"],
    ["instagram", "search"], ["instagram", "profile"],
    ["xiaohongshu", "search"], ["xiaohongshu", "note"],
    ["linkedin", "search"], ["linkedin", "profile-read"]
  ]);
});

test("LinkedIn session reads accept only exact profile URLs", async () => {
  let calls = 0;
  const provider = createOpenCliSourceProviders({
    runner: async () => { calls += 1; return success([]); },
    opencliAvailability: "ready"
  }).find(({ id }) => id === "linkedin-session");
  for (const target of [
    "javascript:alert(1)",
    "https://evil.example/in/person/",
    "https://www.linkedin.com/jobs/view/123",
    "https://user:pass@www.linkedin.com/in/person/"
  ]) {
    await assert.rejects(provider.read({ target }), /LinkedIn target must be/);
  }
  assert.equal(calls, 0);
});

test("OpenCLI providers integrate with the source registry without exposing browser cookies", async () => {
  const secretEnvironment = {
    PATH: "fixture-path",
    REDDIT_CLIENT_SECRET: "must-not-pass",
    X_BEARER_TOKEN: "must-not-pass-either"
  };
  const { runner, calls } = fakeRunner(() => success({ results: [{ id: "one", text: "result" }] }));
  const registry = createSourceRegistry({
    providers: createOpenCliSourceProviders({ runner, environment: secretEnvironment, opencliAvailability: "ready" })
  });
  const [record] = await registry.search("reddit-session", { query: "crawler", maxResults: 1 });
  assert.equal(record.id, "one");
  assert.equal(record.provenance.credentialed, true);
  assert.deepEqual({ ...calls[0].options.environment }, { PATH: "fixture-path" });
  assert.equal(JSON.stringify(calls).includes("must-not-pass"), false);
});

test("yt-dlp provides no-key YouTube search and reads without cookies or API credentials", async () => {
  const { runner, calls } = fakeRunner((_file, args) => {
    if (args.includes("--flat-playlist")) {
      return success({ entries: [{ id: "abcdefghijk", title: "Fixture search", channel: "Fixture channel" }] });
    }
    return success({
      id: "abcdefghijk",
      title: "Fixture video",
      description: "Description",
      channel: "Fixture channel",
      upload_date: "20260720",
      duration: 42,
      webpage_url: "https://www.youtube.com/watch?v=abcdefghijk"
    });
  });
  const provider = createYtDlpSourceProvider({ runner, ytDlpAvailability: "ready" });
  const query = "--config-location evil";
  const [searchRecord] = await provider.search({ query, maxResults: 4 });
  assert.equal(searchRecord.title, "Fixture search");
  assert.equal(searchRecord.metadata.noApiKey, true);
  assert.equal(searchRecord.provenance.authenticated, false);
  assert.deepEqual(calls[0].args.slice(-5), [
    "--flat-playlist", "--playlist-end", "4", "--", "ytsearch4:--config-location evil"
  ]);
  const [readRecord] = await provider.read({ target: "https://www.youtube.com/watch?v=abcdefghijk" });
  assert.equal(readRecord.id, "abcdefghijk");
  assert.equal(readRecord.publishedAt, "2026-07-20T00:00:00.000Z");
  for (const call of calls) {
    assert.equal(call.args.includes("--cookies"), false);
    assert.equal(call.args.includes("--cookies-from-browser"), false);
    assert.equal(call.args.includes("--no-cookies"), true);
    assert.equal(call.args.includes("--no-cookies-from-browser"), true);
    assert.equal(call.args.includes("--ignore-config"), true);
    assert.equal(call.args.includes("--no-plugin-dirs"), true);
    assert.equal(call.args.includes("--no-remote-components"), true);
    assert.equal(call.args.some((arg) => /api[-_]?key/i.test(arg)), false);
  }
});

test("external command failures map to bounded source errors without leaking stderr", async (t) => {
  await t.test("missing executable", async () => {
    const failure = new Error("secret system path");
    failure.code = "ENOENT";
    const provider = createYtDlpSourceProvider({ runner: async () => { throw failure; } });
    await assert.rejects(provider.search({ query: "test" }), (error) => {
      assert(error instanceof SourceAccessError);
      assert.equal(error.code, "SOURCE_NOT_CONFIGURED");
      assert.equal(error.message.includes("secret system path"), false);
      return true;
    });
  });
  await t.test("session authentication", async () => {
    const provider = createOpenCliSourceProviders({
      runner: async () => ({ exitCode: 1, stdout: "", stderr: "cookie=session-secret login required" })
    })[0];
    await assert.rejects(provider.search({ query: "test" }), (error) => {
      assert.equal(error.code, "SOURCE_AUTH_FAILED");
      assert.equal(JSON.stringify(error).includes("session-secret"), false);
      return true;
    });
  });
  await t.test("invalid JSON", async () => {
    const provider = createYtDlpSourceProvider({ runner: async () => ({ exitCode: 0, stdout: "not-json", stderr: "" }) });
    await assert.rejects(provider.search({ query: "test" }), { code: "SOURCE_INVALID_RESPONSE" });
  });
  await t.test("defense-in-depth output bound", async () => {
    const provider = createYtDlpSourceProvider({
      maxOutputBytes: 1_024,
      runner: async () => ({ exitCode: 0, stdout: "x".repeat(1_025), stderr: "" })
    });
    await assert.rejects(provider.search({ query: "test" }), { code: "SOURCE_RESPONSE_TOO_LARGE" });
  });
  await t.test("pre-aborted signal never dispatches", async () => {
    let calls = 0;
    const controller = new AbortController();
    controller.abort();
    const provider = createYtDlpSourceProvider({ runner: async () => { calls += 1; return success({}); } });
    await assert.rejects(provider.search({ query: "test", signal: controller.signal }), { code: "SOURCE_ABORTED" });
    assert.equal(calls, 0);
  });
});

test("setup and update plans are dry-run by default and reject unsupported channels", async () => {
  let calls = 0;
  const runner = async () => { calls += 1; return { exitCode: 0, stdout: "ok", stderr: "" }; };
  const setup = await setupExternalSources({ channels: ["reddit", "youtube"], runner, platform: "linux" });
  assert.equal(setup.mode, "dry-run");
  assert.equal(calls, 0);
  assert.deepEqual(setup.plan.steps.map(({ id }) => id), ["opencli-package", "opencli-extension", "yt-dlp-package"]);
  assert(Object.isFrozen(setup.plan));
  assert(Object.isFrozen(setup.plan.steps));
  assert.equal(setup.plan.steps.every(({ requiresExplicitApply }) => requiresExplicitApply), true);

  const update = await updateExternalSources({ channels: ["x", "facebook"], runner, platform: "win32" });
  assert.equal(update.mode, "dry-run");
  assert.equal(update.plan.steps[0].file, process.execPath);
  assert.match(update.plan.steps[0].args[0], /node_modules[\\/]npm[\\/]bin[\\/]npm-cli\.js$/);
  assert.deepEqual(update.plan.steps[0].args.slice(1), ["install", "--global", "@jackwener/opencli@1.8.6"]);
  assert.equal(calls, 0);
  await assert.rejects(setupExternalSources({ channels: ["bilibili"] }), /Unsupported external source channel/);
  await assert.rejects(setupExternalSources({ channels: ["reddit", "reddit"] }), /Duplicate external source channel/);
});

test("explicit apply executes only generated allowlisted setup commands", async () => {
  const { runner, calls } = fakeRunner(() => ({ exitCode: 0, stdout: "installed", stderr: "" }));
  const result = await setupExternalSources({
    channels: ["reddit", "instagram", "youtube"],
    apply: true,
    runner,
    platform: "linux",
    pythonCommand: "python3"
  });
  assert.equal(result.mode, "applied");
  assert.deepEqual(calls.map(({ file, args }) => [file, args]), [
    ["npm", ["install", "--global", "@jackwener/opencli@1.8.6"]],
    ["python3", ["-m", "pip", "install", "--user", "yt-dlp==2025.5.22"]]
  ]);
  assert.deepEqual(result.results.map(({ state }) => state), ["applied", "manual_action_required", "applied"]);
  assert.equal(calls.some(({ args }) => args.some((arg) => WRITE_COMMANDS.has(arg))), false);
});

test("LinkedIn setup uses audited OpenCLI and never invents an MCP installation command", async () => {
  let calls = 0;
  const result = await setupExternalSources({
    channels: ["linkedin"],
    apply: true,
    runner: async () => { calls += 1; return { exitCode: 0, stdout: "", stderr: "" }; }
  });
  assert.equal(calls, 1);
  assert.deepEqual(result.plan.steps.map(({ id, kind }) => ({ id, kind })), [
    { id: "opencli-package", kind: "command" },
    { id: "opencli-extension", kind: "manual" },
    { id: "linkedin-mcp-review", kind: "manual" }
  ]);
  assert.deepEqual(result.results, [
    { id: "opencli-package", state: "applied" },
    { id: "opencli-extension", state: "manual_action_required" },
    { id: "linkedin-mcp-review", state: "manual_action_required" }
  ]);
});

test("the default runner passes shell syntax literally and enforces time and output budgets", async (t) => {
  const runner = createExecFileRunner({ timeoutMs: 1_000, maxOutputBytes: 4_096, environment: process.env });
  const literal = "$(not-a-command); & still-literal";
  const result = await runner(process.execPath, ["-e", "process.stdout.write(process.argv[1])", literal]);
  assert.equal(result.stdout, literal);

  await t.test("timeout", async () => {
    await assert.rejects(
      runner(process.execPath, ["-e", "setTimeout(() => {}, 1000)"], { timeoutMs: 100 }),
      { code: "EXEC_TIMEOUT" }
    );
  });
  await t.test("output limit", async () => {
    await assert.rejects(
      runner(process.execPath, ["-e", "process.stdout.write('x'.repeat(2048))"], { maxOutputBytes: 1_024 }),
      { code: "EXEC_OUTPUT_LIMIT" }
    );
  });
});
