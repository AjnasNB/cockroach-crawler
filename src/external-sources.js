import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { PACKAGE_VERSION } from "./version.js";
import { SourceAccessError } from "./sources.js";

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const MAX_QUERY_LENGTH = 512;
const MAX_TARGET_LENGTH = 4_096;
const MAX_RESULTS = 50;
const PROVIDER_STATES = new Set(["ready", "partial", "unavailable"]);
const CHANNELS = Object.freeze(["x", "reddit", "facebook", "instagram", "xiaohongshu", "youtube", "linkedin"]);
const SESSION_CHANNELS = new Set(["x", "reddit", "facebook", "instagram", "xiaohongshu", "linkedin"]);
const OPERATION_KEYS = new Set(["query", "target", "maxResults", "kind", "subreddit", "signal"]);
const FACTORY_KEYS = new Set([
  "runner", "opencliCommand", "ytDlpCommand", "timeoutMs", "maxOutputBytes", "environment",
  "opencliAvailability", "ytDlpAvailability"
]);
const PLAN_KEYS = new Set(["channels", "apply", "runner", "timeoutMs", "maxOutputBytes", "environment", "platform", "pythonCommand"]);
const EXEC_RUNNER_KEYS = new Set(["timeoutMs", "maxOutputBytes", "environment"]);
const RUN_KEYS = new Set(["timeoutMs", "maxOutputBytes", "signal", "environment"]);
const SAFE_ENVIRONMENT_KEYS = Object.freeze([
  "PATH", "Path", "PATHEXT", "SystemRoot", "ComSpec", "TEMP", "TMP", "TMPDIR",
  "HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "XDG_CONFIG_HOME", "LANG", "LC_ALL", "NO_COLOR"
]);
const OPENCLI_EXTENSION_URL = "https://chromewebstore.google.com/detail/ildkmabpimmkaediidaifkhjpohdnifk";
const LINKEDIN_MCP_URL = "https://github.com/stickerdaniel/linkedin-mcp-server";
const AUDITED_OPENCLI_VERSION = "1.8.6";
const AUDITED_YT_DLP_VERSION = "2025.5.22";

const OPENCLI_PROVIDERS = Object.freeze({
  "x-session": Object.freeze({
    channel: "x",
    site: "twitter",
    search: Object.freeze(["search"]),
    read: Object.freeze(["thread"]),
    type: "social_post"
  }),
  "reddit-session": Object.freeze({
    channel: "reddit",
    site: "reddit",
    search: Object.freeze(["search"]),
    read: Object.freeze(["read", "--depth", "2"]),
    type: "discussion"
  }),
  "facebook-session": Object.freeze({
    channel: "facebook",
    site: "facebook",
    search: Object.freeze(["search"]),
    read: Object.freeze(["profile"]),
    type: "social_profile"
  }),
  "instagram-session": Object.freeze({
    channel: "instagram",
    site: "instagram",
    search: Object.freeze(["search"]),
    read: Object.freeze(["profile"]),
    type: "social_profile"
  }),
  "xiaohongshu-session": Object.freeze({
    channel: "xiaohongshu",
    site: "xiaohongshu",
    search: Object.freeze(["search"]),
    read: Object.freeze(["note"]),
    type: "note"
  }),
  "linkedin-session": Object.freeze({
    channel: "linkedin",
    site: "linkedin",
    search: Object.freeze(["search"]),
    read: Object.freeze(["profile-read"]),
    readOption: "--profile-url",
    type: "social_profile"
  })
});

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}

function snapshot(value, label, allowedKeys) {
  if (value === undefined) return Object.create(null);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be a plain object.`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${label} must be a plain object.`);
  const result = Object.create(null);
  for (const key of Reflect.ownKeys(Object.getOwnPropertyDescriptors(value))) {
    const printable = typeof key === "symbol" ? key.toString() : key;
    if (typeof key !== "string" || !allowedKeys.has(key)) throw new TypeError(`Unknown ${label} option '${printable}'.`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`${label} option '${key}' must be an own enumerable data property.`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function boundedInteger(value, label, fallback, minimum, maximum) {
  const candidate = value === undefined ? fallback : value;
  if (!Number.isSafeInteger(candidate) || candidate < minimum || candidate > maximum) {
    throw new TypeError(`${label} must be an integer from ${minimum} to ${maximum}.`);
  }
  return candidate;
}

function commandName(value, label, fallback) {
  const candidate = value === undefined ? fallback : value;
  if (typeof candidate !== "string" || !candidate || candidate.length > 260 || /[\0\r\n]/.test(candidate)) {
    throw new TypeError(`${label} must be a primitive executable name or path.`);
  }
  return candidate;
}

function positional(value, label, maximum) {
  if (typeof value !== "string" || !value.trim() || value.length > maximum || /[\0\r\n]/.test(value)) {
    throw new TypeError(`${label} must be a non-empty primitive string up to ${maximum} characters.`);
  }
  return value.trim();
}

function linkedInProfileUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError("LinkedIn target must be an https://www.linkedin.com/in/<handle>/ profile URL.");
  }
  if (
    url.protocol !== "https:"
    || (url.hostname !== "www.linkedin.com" && url.hostname !== "linkedin.com")
    || !/^\/in\/[^/]+\/?$/.test(url.pathname)
    || url.username
    || url.password
  ) {
    throw new TypeError("LinkedIn target must be an https://www.linkedin.com/in/<handle>/ profile URL.");
  }
  url.search = "";
  url.hash = "";
  return url.toString();
}

function optionalSignal(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || typeof value.aborted !== "boolean" || typeof value.addEventListener !== "function") {
    throw new TypeError("signal must be an AbortSignal.");
  }
  return value;
}

function operationInput(value, operation) {
  const input = snapshot(value, `${operation} input`, OPERATION_KEYS);
  return {
    value: positional(input[operation === "search" ? "query" : "target"], operation === "search" ? "query" : "target", operation === "search" ? MAX_QUERY_LENGTH : MAX_TARGET_LENGTH),
    maxResults: boundedInteger(input.maxResults, "maxResults", 10, 1, MAX_RESULTS),
    signal: optionalSignal(input.signal)
  };
}

function safeEnvironment(value = process.env) {
  if (!value || typeof value !== "object") throw new TypeError("environment must be an object.");
  const result = Object.create(null);
  for (const key of SAFE_ENVIRONMENT_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && Object.hasOwn(descriptor, "value") && typeof descriptor.value === "string") result[key] = descriptor.value;
  }
  return result;
}

function runnerFunction(value) {
  if (typeof value !== "function") throw new TypeError("runner must be an execFile-style function.");
  return value;
}

function availability(value, label) {
  const candidate = value === undefined ? "partial" : value;
  if (!PROVIDER_STATES.has(candidate)) throw new TypeError(`${label} must be 'ready', 'partial', or 'unavailable'.`);
  return candidate;
}

function opencliInvocation(config, environment) {
  if (config.opencliCommand !== undefined || config.runner !== undefined || process.platform !== "win32" || !environment.APPDATA) {
    return { file: commandName(config.opencliCommand, "opencliCommand", "opencli"), prefix: [] };
  }
  const script = join(environment.APPDATA, "npm", "node_modules", "@jackwener", "opencli", "dist", "src", "main.js");
  if (!existsSync(script)) return { file: "opencli", prefix: [] };
  return {
    file: process.execPath,
    prefix: [script]
  };
}

function byteLength(value) {
  return Buffer.byteLength(typeof value === "string" ? value : String(value ?? ""), "utf8");
}

function publicStatus(id, state, authentication, message) {
  return deepFreeze({
    id,
    status: state,
    capabilities: { search: state !== "unavailable", read: state !== "unavailable" },
    authentication,
    message
  });
}

function commandFailure(error, provider) {
  if (error instanceof SourceAccessError) return error;
  if (error?.code === "EXEC_ABORTED" || error?.name === "AbortError") {
    return new SourceAccessError("SOURCE_ABORTED", `${provider} command was aborted.`, { provider });
  }
  if (error?.code === "EXEC_TIMEOUT") {
    return new SourceAccessError("SOURCE_TIMEOUT", `${provider} command timed out.`, { provider });
  }
  if (error?.code === "EXEC_OUTPUT_LIMIT") {
    return new SourceAccessError("SOURCE_RESPONSE_TOO_LARGE", `${provider} command exceeded its output budget.`, { provider });
  }
  if (error?.code === "ENOENT") {
    return new SourceAccessError("SOURCE_NOT_CONFIGURED", `${provider} command is not installed.`, { provider });
  }
  return new SourceAccessError("SOURCE_REQUEST_FAILED", `${provider} command failed.`, { provider });
}

async function runBounded(context, provider, file, args, signal) {
  if (signal?.aborted) throw new SourceAccessError("SOURCE_ABORTED", `${provider} command was aborted.`, { provider });
  let result;
  try {
    result = await context.runner(file, Object.freeze([...args]), {
      timeoutMs: context.timeoutMs,
      maxOutputBytes: context.maxOutputBytes,
      signal,
      environment: context.environment
    });
  } catch (error) {
    throw commandFailure(error, provider);
  }
  if (!result || typeof result !== "object") {
    throw new SourceAccessError("SOURCE_INVALID_RESPONSE", `${provider} runner returned an invalid result.`, { provider });
  }
  const stdout = typeof result.stdout === "string" ? result.stdout : String(result.stdout ?? "");
  const stderr = typeof result.stderr === "string" ? result.stderr : String(result.stderr ?? "");
  if (byteLength(stdout) + byteLength(stderr) > context.maxOutputBytes) {
    throw new SourceAccessError("SOURCE_RESPONSE_TOO_LARGE", `${provider} command exceeded its output budget.`, { provider });
  }
  if (!Number.isSafeInteger(result.exitCode)) {
    throw new SourceAccessError("SOURCE_INVALID_RESPONSE", `${provider} runner returned an invalid exit code.`, { provider });
  }
  const exitCode = result.exitCode;
  if (exitCode !== 0) {
    const code = /(?:log[ -]?in|auth(?:entication|orization)?|session|cookie)/i.test(stderr)
      ? "SOURCE_AUTH_FAILED"
      : "SOURCE_REQUEST_FAILED";
    throw new SourceAccessError(code, `${provider} command exited unsuccessfully.`, { provider, exitCode });
  }
  return stdout;
}

function parseJson(stdout, provider) {
  try {
    return JSON.parse(stdout);
  } catch {
    throw new SourceAccessError("SOURCE_INVALID_RESPONSE", `${provider} command returned invalid JSON.`, { provider });
  }
}

function objectItems(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const key of ["items", "results", "entries", "posts", "tweets", "notes", "users", "videos", "comments"]) {
    if (Array.isArray(value[key])) return value[key];
  }
  if (Array.isArray(value.data)) return value.data;
  if (value.data && typeof value.data === "object") {
    if (Array.isArray(value.data.children)) return value.data.children.map((item) => item?.data ?? item);
    const nested = objectItems(value.data);
    if (nested.length) return nested;
  }
  return [value];
}

function firstString(item, keys) {
  for (const key of keys) {
    const value = item?.[key];
    if (typeof value === "string" && value) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function authorString(item) {
  const direct = firstString(item, ["author", "author_name", "username", "user_name", "channel", "channel_name", "owner"]);
  if (direct) return direct;
  const author = item?.author ?? item?.user ?? item?.owner;
  if (author && typeof author === "object") return firstString(author, ["name", "username", "screen_name", "nickname", "id"]) || null;
  return null;
}

function publishedDate(item) {
  const value = firstString(item, ["publishedAt", "published_at", "createdAt", "created_at", "timestamp", "upload_date", "date"]);
  if (!value) return null;
  if (/^\d{8}$/.test(value)) return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00.000Z`;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function conciseJson(value) {
  const json = JSON.stringify(value);
  return json.length <= 32_768 ? json : `${json.slice(0, 32_768)}...`;
}

function sourceRecord(provider, input) {
  const id = String(input.id || input.url || input.title || "result");
  const url = String(input.url || "");
  const text = String(input.text || "");
  const contentHash = `sha256:${createHash("sha256").update(`${provider}\0${id}\0${url}\0${text}`).digest("hex")}`;
  return deepFreeze({
    source: provider,
    id,
    type: String(input.type || "document"),
    title: String(input.title || ""),
    url,
    text,
    author: input.author || null,
    publishedAt: input.publishedAt || null,
    contentHash,
    adapterVersion: PACKAGE_VERSION,
    warnings: [],
    metadata: { ...input.metadata },
    provenance: {
      retrievedAt: new Date().toISOString(),
      method: String(input.method),
      authenticated: input.authenticated === true,
      credentialed: input.credentialed === true
    }
  });
}

function opencliRecords(provider, definition, data, fallbackTarget, maximum) {
  return objectItems(data).slice(0, maximum).map((item, index) => {
    const value = item && typeof item === "object" ? item : { text: String(item ?? "") };
    const id = firstString(value, ["id", "tweet_id", "post_id", "note_id", "shortcode", "username", "user_id"]);
    const url = firstString(value, ["url", "link", "permalink", "canonical_url", "webpage_url"]) || fallbackTarget;
    const title = firstString(value, ["title", "name", "username", "screen_name"]);
    const text = firstString(value, ["text", "body", "content", "description", "caption", "full_text", "selftext"]) || conciseJson(value);
    return sourceRecord(provider, {
      id: id || url || `${definition.channel}-${index + 1}`,
      type: definition.type,
      title,
      url,
      text,
      author: authorString(value),
      publishedAt: publishedDate(value),
      method: "opencli-browser-session",
      authenticated: false,
      credentialed: true,
      metadata: {
        channel: definition.channel,
        sessionBacked: true,
        authenticationUnverified: true,
        upstream: "opencli"
      }
    });
  });
}

function createOpenCliProvider(id, definition, context, state) {
  return deepFreeze({
    id,
    status() {
      const message = state === "ready"
        ? `${definition.channel} browser-session reads are ready through OpenCLI.`
        : state === "unavailable"
          ? "OpenCLI is not installed or was explicitly marked unavailable."
          : `${definition.channel} browser-session reads are configured; command availability is verified on first use.`;
      return publicStatus(id, state, "browser_session", message);
    },
    async search(rawInput) {
      const input = operationInput(rawInput, "search");
      const args = [definition.site, ...definition.search, "--limit", String(input.maxResults), "-f", "json", "--", input.value];
      const stdout = await runBounded(context, id, context.opencliFile, [...context.opencliPrefix, ...args], input.signal);
      return opencliRecords(id, definition, parseJson(stdout, id), "", input.maxResults);
    },
    async read(rawInput) {
      const input = operationInput(rawInput, "read");
      const target = definition.channel === "linkedin" ? linkedInProfileUrl(input.value) : input.value;
      const args = definition.readOption
        ? [definition.site, ...definition.read, "-f", "json", `${definition.readOption}=${target}`]
        : [definition.site, ...definition.read, "-f", "json", "--", target];
      const stdout = await runBounded(context, id, context.opencliFile, [...context.opencliPrefix, ...args], input.signal);
      return opencliRecords(id, definition, parseJson(stdout, id), target, input.maxResults);
    }
  });
}

function youtubeEntries(data) {
  if (Array.isArray(data?.entries)) return data.entries.filter(Boolean);
  return data && typeof data === "object" ? [data] : [];
}

function youtubeRecord(item) {
  const id = firstString(item, ["id", "display_id"]);
  const webpageUrl = firstString(item, ["webpage_url", "original_url", "url"]);
  const url = /^https?:\/\//i.test(webpageUrl) ? webpageUrl : id ? `https://www.youtube.com/watch?v=${encodeURIComponent(id)}` : "";
  return sourceRecord("youtube-no-key", {
    id: id || url,
    type: "video",
    title: firstString(item, ["title", "fulltitle"]),
    url,
    text: firstString(item, ["description"]),
    author: firstString(item, ["channel", "uploader", "channel_id"]) || null,
    publishedAt: publishedDate(item),
    method: "yt-dlp",
    authenticated: false,
    credentialed: false,
    metadata: {
      duration: Number.isFinite(item.duration) ? item.duration : null,
      channelId: firstString(item, ["channel_id", "uploader_id"]) || null,
      viewCount: Number.isFinite(item.view_count) ? item.view_count : null,
      thumbnail: firstString(item, ["thumbnail"]) || null,
      noApiKey: true
    }
  });
}

function ytDlpBaseArgs() {
  return [
    "--ignore-config",
    "--no-config-locations",
    "--no-plugin-dirs",
    "--no-remote-components",
    "--no-cookies",
    "--no-cookies-from-browser",
    "--no-cache-dir",
    "--no-mark-watched",
    "--no-warnings",
    "--no-progress",
    "--color",
    "no_color",
    "--quiet",
    "--skip-download",
    "--dump-single-json",
    "--js-runtimes",
    "node"
  ];
}

export const externalSourceChannels = CHANNELS;
export const externalSourceProviderIds = Object.freeze([...Object.keys(OPENCLI_PROVIDERS), "youtube-no-key"]);

export function createExecFileRunner(options = {}) {
  const config = snapshot(options, "exec runner", EXEC_RUNNER_KEYS);
  const defaultTimeoutMs = boundedInteger(config.timeoutMs, "timeoutMs", DEFAULT_TIMEOUT_MS, 100, 120_000);
  const defaultMaximum = boundedInteger(config.maxOutputBytes, "maxOutputBytes", DEFAULT_MAX_OUTPUT_BYTES, 1_024, 20 * 1024 * 1024);
  const defaultEnvironment = safeEnvironment(config.environment);
  return async function runExecFile(file, args, options = {}) {
    const runConfig = snapshot(options, "exec run", RUN_KEYS);
    const command = commandName(file, "file");
    if (!Array.isArray(args) || args.some((item) => typeof item !== "string" || /[\0]/.test(item))) {
      throw new TypeError("args must be an array of primitive strings without NUL bytes.");
    }
    const timeoutMs = boundedInteger(runConfig.timeoutMs, "timeoutMs", defaultTimeoutMs, 100, 120_000);
    const maxOutputBytes = boundedInteger(runConfig.maxOutputBytes, "maxOutputBytes", defaultMaximum, 1_024, 20 * 1024 * 1024);
    const signal = optionalSignal(runConfig.signal);
    const environment = runConfig.environment === undefined ? defaultEnvironment : safeEnvironment(runConfig.environment);
    return await new Promise((resolve, reject) => {
      execFile(command, [...args], {
        timeout: timeoutMs,
        maxBuffer: maxOutputBytes,
        signal,
        env: environment,
        windowsHide: true,
        shell: false,
        encoding: "utf8"
      }, (error, stdout, stderr) => {
        if (!error) return resolve({ exitCode: 0, stdout, stderr });
        if (error.name === "AbortError" || signal?.aborted) {
          const failure = new Error("Command was aborted.");
          failure.code = "EXEC_ABORTED";
          return reject(failure);
        }
        if (error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
          const failure = new Error("Command output exceeded its budget.");
          failure.code = "EXEC_OUTPUT_LIMIT";
          return reject(failure);
        }
        if (error.killed && error.signal) {
          const failure = new Error("Command timed out.");
          failure.code = "EXEC_TIMEOUT";
          return reject(failure);
        }
        if (typeof error.code === "number") return resolve({ exitCode: error.code, stdout, stderr });
        reject(error);
      });
    });
  };
}

export function createOpenCliSourceProviders(options = {}) {
  const config = snapshot(options, "external source factory", FACTORY_KEYS);
  const environment = safeEnvironment(config.environment);
  const invocation = opencliInvocation(config, environment);
  const context = {
    runner: runnerFunction(config.runner || createExecFileRunner({ timeoutMs: config.timeoutMs, maxOutputBytes: config.maxOutputBytes, environment: config.environment })),
    opencliFile: invocation.file,
    opencliPrefix: invocation.prefix,
    timeoutMs: boundedInteger(config.timeoutMs, "timeoutMs", DEFAULT_TIMEOUT_MS, 100, 120_000),
    maxOutputBytes: boundedInteger(config.maxOutputBytes, "maxOutputBytes", DEFAULT_MAX_OUTPUT_BYTES, 1_024, 20 * 1024 * 1024),
    environment
  };
  const state = availability(config.opencliAvailability, "opencliAvailability");
  return deepFreeze(Object.entries(OPENCLI_PROVIDERS).map(([id, definition]) => createOpenCliProvider(id, definition, context, state)));
}

export function createYtDlpSourceProvider(options = {}) {
  const config = snapshot(options, "external source factory", FACTORY_KEYS);
  const context = {
    runner: runnerFunction(config.runner || createExecFileRunner({ timeoutMs: config.timeoutMs, maxOutputBytes: config.maxOutputBytes, environment: config.environment })),
    ytDlpCommand: commandName(config.ytDlpCommand, "ytDlpCommand", "yt-dlp"),
    timeoutMs: boundedInteger(config.timeoutMs, "timeoutMs", DEFAULT_TIMEOUT_MS, 100, 120_000),
    maxOutputBytes: boundedInteger(config.maxOutputBytes, "maxOutputBytes", DEFAULT_MAX_OUTPUT_BYTES, 1_024, 20 * 1024 * 1024),
    environment: safeEnvironment(config.environment)
  };
  const state = availability(config.ytDlpAvailability, "ytDlpAvailability");
  return deepFreeze({
    id: "youtube-no-key",
    status() {
      const message = state === "ready"
        ? "No-key YouTube search and metadata reads are ready through yt-dlp."
        : state === "unavailable"
          ? "yt-dlp is not installed or was explicitly marked unavailable."
          : "No-key YouTube access is configured; yt-dlp availability is verified on first use.";
      return publicStatus("youtube-no-key", state, "none", message);
    },
    async search(rawInput) {
      const input = operationInput(rawInput, "search");
      const target = `ytsearch${input.maxResults}:${input.value}`;
      const args = [
        ...ytDlpBaseArgs(),
        "--flat-playlist",
        "--playlist-end",
        String(input.maxResults),
        "--",
        target
      ];
      const stdout = await runBounded(context, "youtube-no-key", context.ytDlpCommand, args, input.signal);
      return youtubeEntries(parseJson(stdout, "youtube-no-key")).slice(0, input.maxResults).map(youtubeRecord);
    },
    async read(rawInput) {
      const input = operationInput(rawInput, "read");
      const args = [...ytDlpBaseArgs(), "--no-playlist", "--", input.value];
      const stdout = await runBounded(context, "youtube-no-key", context.ytDlpCommand, args, input.signal);
      const entries = youtubeEntries(parseJson(stdout, "youtube-no-key"));
      if (!entries.length) throw new SourceAccessError("SOURCE_NOT_FOUND", "YouTube video was not found.", { provider: "youtube-no-key" });
      return entries.slice(0, 1).map(youtubeRecord);
    }
  });
}

export function createLinkedInManualSourceProvider() {
  return deepFreeze({
    id: "linkedin-mcp-manual",
    status() {
      return publicStatus(
        "linkedin-mcp-manual",
        "unavailable",
        "manual_mcp",
        "The optional LinkedIn MCP alternative is manual. LinkedIn session reads are available separately through the fixed OpenCLI read provider."
      );
    }
  });
}

export function createExternalSourceProviders(options = {}) {
  return deepFreeze([
    ...createOpenCliSourceProviders(options),
    createYtDlpSourceProvider(options)
  ]);
}

function channelList(value) {
  if (value === undefined) return [...CHANNELS];
  if (!Array.isArray(value) || value.length === 0 || value.length > CHANNELS.length) {
    throw new TypeError(`channels must contain from 1 to ${CHANNELS.length} supported channels.`);
  }
  const result = [];
  const seen = new Set();
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`channels entry ${index} must be an own enumerable data property.`);
    }
    const channel = descriptor.value;
    if (typeof channel !== "string" || !CHANNELS.includes(channel)) throw new TypeError(`Unsupported external source channel '${String(channel)}'.`);
    if (seen.has(channel)) throw new TypeError(`Duplicate external source channel '${channel}'.`);
    seen.add(channel);
    result.push(channel);
  }
  for (const key of Reflect.ownKeys(Object.getOwnPropertyDescriptors(value))) {
    if (key === "length") continue;
    if (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length) {
      throw new TypeError(`channels has unsupported property '${String(key)}'.`);
    }
  }
  return result;
}

function executableStep(id, channels, file, args, description) {
  return deepFreeze({ id, kind: "command", channels, file, args, description, requiresExplicitApply: true });
}

function manualStep(id, channels, url, description) {
  return deepFreeze({ id, kind: "manual", channels, url, description, requiresExplicitApply: true });
}

function maintenancePlan(action, config) {
  const channels = channelList(config.channels);
  const selectedSessions = channels.filter((channel) => SESSION_CHANNELS.has(channel));
  const npmCommand = config.platform === "win32" ? process.execPath : "npm";
  const npmArguments = config.platform === "win32"
    ? [join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js")]
    : [];
  const pythonCommand = commandName(config.pythonCommand, "pythonCommand", config.platform === "win32" ? "python.exe" : "python3");
  const steps = [];
  if (selectedSessions.length) {
    steps.push(executableStep("opencli-package", selectedSessions, npmCommand,
      [...npmArguments, "install", "--global", `@jackwener/opencli@${AUDITED_OPENCLI_VERSION}`],
      action === "setup"
        ? `Install the audited OpenCLI ${AUDITED_OPENCLI_VERSION} command package.`
        : `Reconcile OpenCLI to the audited ${AUDITED_OPENCLI_VERSION} command package.`));
    if (action === "setup") {
      steps.push(manualStep("opencli-extension", selectedSessions, OPENCLI_EXTENSION_URL,
        "Install and approve the OpenCLI browser extension manually. Cockroach Crawler never reads browser profile or cookie files."));
    }
  }
  if (channels.includes("youtube")) {
    steps.push(executableStep("yt-dlp-package", ["youtube"], pythonCommand,
      ["-m", "pip", "install", "--user", `yt-dlp==${AUDITED_YT_DLP_VERSION}`],
      action === "setup"
        ? `Install audited yt-dlp ${AUDITED_YT_DLP_VERSION} for no-key YouTube reads.`
        : `Reconcile yt-dlp to the audited ${AUDITED_YT_DLP_VERSION} release.`));
  }
  if (channels.includes("linkedin")) {
    steps.push(manualStep("linkedin-mcp-review", ["linkedin"], LINKEDIN_MCP_URL,
      "Optional alternative: review, install, authenticate, and register the LinkedIn MCP server manually. The OpenCLI LinkedIn read provider does not require this step."));
  }
  return deepFreeze({ action, channels, steps });
}

async function maintain(action, options) {
  const config = snapshot(options, `external source ${action}`, PLAN_KEYS);
  if (config.apply !== undefined && typeof config.apply !== "boolean") throw new TypeError("apply must be a boolean.");
  const platform = config.platform === undefined ? process.platform : config.platform;
  if (platform !== "win32" && platform !== "linux" && platform !== "darwin") throw new TypeError("platform must be 'win32', 'linux', or 'darwin'.");
  const plan = maintenancePlan(action, { ...config, platform });
  if (config.apply !== true) return deepFreeze({ mode: "dry-run", plan, results: [] });
  const timeoutMs = boundedInteger(config.timeoutMs, "timeoutMs", 120_000, 100, 600_000);
  const maxOutputBytes = boundedInteger(config.maxOutputBytes, "maxOutputBytes", DEFAULT_MAX_OUTPUT_BYTES, 1_024, 20 * 1024 * 1024);
  const environment = safeEnvironment(config.environment);
  const runner = runnerFunction(config.runner || createExecFileRunner({ timeoutMs, maxOutputBytes, environment }));
  const results = [];
  for (const step of plan.steps) {
    if (step.kind === "manual") {
      results.push(deepFreeze({ id: step.id, state: "manual_action_required" }));
      continue;
    }
    await runBounded({ runner, timeoutMs, maxOutputBytes, environment }, step.id, step.file, step.args);
    results.push(deepFreeze({ id: step.id, state: "applied" }));
  }
  return deepFreeze({ mode: "applied", plan, results });
}

export function setupExternalSources(options = {}) {
  return maintain("setup", options);
}

export function updateExternalSources(options = {}) {
  return maintain("update", options);
}
