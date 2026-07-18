import { createHash } from "node:crypto";
import { PACKAGE_VERSION } from "./version.js";

const SOURCE_IDS = Object.freeze(["web", "github", "youtube", "x", "reddit"]);
const STATUS_VALUES = new Set(["ready", "partial", "missing_credentials", "unavailable"]);
const MAX_QUERY_LENGTH = 512;
const MAX_TARGET_LENGTH = 4_096;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const WEB_CRAWL_OPTION_KEYS = new Set([
  "maxPages",
  "maxSeeds",
  "maxRequests",
  "maxQueue",
  "maxLinksPerPage",
  "maxUrlLength",
  "maxDepth",
  "concurrency",
  "sameOrigin",
  "allowedOrigins",
  "include",
  "exclude",
  "skipSensitivePaths",
  "publicOnly",
  "includeSitemaps",
  "maxSitemaps",
  "maxUrlsPerSitemap",
  "obeyRobots",
  "allowPrivateNetworks",
  "userAgent",
  "delayMs",
  "timeoutMs",
  "maxDurationMs",
  "maxBytes",
  "maxTotalBytes",
  "maxRedirects",
  "maxRetries",
  "retryDelayMs",
  "browser",
  "rendered",
  "onPage",
  "onError",
  "dnsLookup"
]);
const ENVIRONMENT_KEYS = Object.freeze([
  "GITHUB_TOKEN",
  "GH_TOKEN",
  "YOUTUBE_API_KEY",
  "X_BEARER_TOKEN",
  "REDDIT_CLIENT_ID",
  "REDDIT_CLIENT_SECRET",
  "COCKROACH_REDDIT_USER_AGENT"
]);

export class SourceAccessError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "SourceAccessError";
    this.code = code;
    this.details = deepFreeze({ ...details });
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}

function snapshotRecord(value, label, allowedKeys) {
  if (value === undefined) return Object.create(null);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const snapshot = Object.create(null);
  for (const key of Reflect.ownKeys(descriptors)) {
    const printable = typeof key === "symbol" ? key.toString() : key;
    if (typeof key !== "string" || !allowedKeys.has(key)) {
      throw new TypeError(`Unknown ${label} option '${printable}'.`);
    }
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`${label} option '${key}' must be an own enumerable data property.`);
    }
    snapshot[key] = descriptor.value;
  }
  return snapshot;
}

function snapshotSelectedProperties(value, label, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  const snapshot = Object.create(null);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor) {
      if (key in value) {
        throw new TypeError(`${label} property '${key}' must not be inherited.`);
      }
      continue;
    }
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`${label} property '${key}' must be an own enumerable data property.`);
    }
    snapshot[key] = descriptor.value;
  }
  return snapshot;
}

function primitiveString(value, label, maximum, { optional = false } = {}) {
  if (optional && (value === undefined || value === null || value === "")) return undefined;
  if (typeof value !== "string" || !value.trim() || value.length > maximum || /[\0\r\n]/.test(value)) {
    throw new TypeError(`${label} must be a non-empty primitive string up to ${maximum} characters.`);
  }
  return value.trim();
}

function boundedInteger(value, label, fallback, minimum, maximum) {
  const candidate = value === undefined ? fallback : value;
  if (!Number.isSafeInteger(candidate) || candidate < minimum || candidate > maximum) {
    throw new TypeError(`${label} must be a safe integer from ${minimum} to ${maximum}.`);
  }
  return candidate;
}

function optionalSignal(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || typeof value.aborted !== "boolean" || typeof value.addEventListener !== "function") {
    throw new TypeError("signal must be an AbortSignal.");
  }
  return value;
}

function combineAbortSignal(signal, timeoutMs) {
  const controller = new AbortController();
  const abort = () => controller.abort(new SourceAccessError("SOURCE_ABORTED", "Source request was aborted."));
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => {
    controller.abort(new SourceAccessError("SOURCE_TIMEOUT", `Source request exceeded ${timeoutMs}ms.`));
  }, timeoutMs);
  return {
    signal: controller.signal,
    close() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  };
}

function responseError(provider, response) {
  const details = { provider, status: response.status };
  if (response.status === 401) {
    return new SourceAccessError("SOURCE_AUTH_FAILED", `${provider} rejected the configured credentials.`, details);
  }
  if (response.status === 403 || response.status === 429) {
    return new SourceAccessError("SOURCE_QUOTA_EXCEEDED", `${provider} rejected the request because access or quota is unavailable.`, details);
  }
  if (response.status === 404 || response.status === 410) {
    return new SourceAccessError("SOURCE_NOT_FOUND", `${provider} did not find the requested resource.`, details);
  }
  return new SourceAccessError("SOURCE_HTTP_ERROR", `${provider} returned HTTP ${response.status}.`, details);
}

async function readBoundedBody(response, maximum) {
  const declared = Number(response.headers?.get?.("content-length") || 0);
  if (Number.isFinite(declared) && declared > maximum) {
    await response.body?.cancel?.();
    throw new SourceAccessError("SOURCE_RESPONSE_TOO_LARGE", `Source response exceeds ${maximum} bytes.`);
  }
  const reader = response.body?.getReader?.();
  if (!reader) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maximum) {
      throw new SourceAccessError("SOURCE_RESPONSE_TOO_LARGE", `Source response exceeds ${maximum} bytes.`);
    }
    return text;
  }
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maximum) {
      await reader.cancel();
      throw new SourceAccessError("SOURCE_RESPONSE_TOO_LARGE", `Source response exceeds ${maximum} bytes.`);
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

async function fetchText(context, provider, url, init = {}) {
  const combined = combineAbortSignal(init.signal, context.timeoutMs);
  try {
    const response = await context.fetch(url, { ...init, signal: combined.signal });
    const text = await readBoundedBody(response, context.maxResponseBytes);
    if (!response.ok) {
      throw responseError(provider, response);
    }
    return { response, text };
  } catch (error) {
    if (error instanceof SourceAccessError) throw error;
    if (combined.signal.aborted) {
      const reason = combined.signal.reason;
      if (reason instanceof Error) throw reason;
    }
    throw new SourceAccessError("SOURCE_REQUEST_FAILED", `${provider} request failed.`, { provider });
  } finally {
    combined.close();
  }
}

async function fetchJson(context, provider, url, init = {}) {
  const { response, text } = await fetchText(context, provider, url, init);
  try {
    return { response, data: JSON.parse(text) };
  } catch {
    throw new SourceAccessError("SOURCE_INVALID_RESPONSE", `${provider} returned invalid JSON.`, { provider });
  }
}

function safeDate(value) {
  if (typeof value !== "string" || !value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function record(provider, input) {
  const text = String(input.text || "");
  const url = String(input.url || "");
  const id = String(input.id || input.url || "");
  const contentHash = `sha256:${createHash("sha256").update(`${provider}\0${id}\0${url}\0${text}`).digest("hex")}`;
  return deepFreeze({
    source: provider,
    id,
    type: String(input.type || "document"),
    title: String(input.title || ""),
    url,
    text,
    author: input.author ? String(input.author) : null,
    publishedAt: safeDate(input.publishedAt),
    contentHash,
    adapterVersion: PACKAGE_VERSION,
    warnings: Array.isArray(input.warnings) ? input.warnings.map(String) : [],
    metadata: input.metadata && typeof input.metadata === "object" ? { ...input.metadata } : {},
    provenance: {
      retrievedAt: new Date().toISOString(),
      method: String(input.method || "api"),
      authenticated: input.authenticated === true,
      credentialed: input.credentialed === true || input.authenticated === true
    }
  });
}

function providerStatus(id, status, capabilities, message, authentication) {
  if (!SOURCE_IDS.includes(id) || !STATUS_VALUES.has(status)) throw new TypeError("Invalid provider status.");
  return deepFreeze({ id, status, capabilities: { ...capabilities }, authentication, message });
}

function githubTarget(target) {
  const value = primitiveString(target, "target", MAX_TARGET_LENGTH);
  const shorthand = value.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (shorthand) return { owner: shorthand[1], repo: shorthand[2] };
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError("GitHub target must be owner/repository or a github.com repository URL.");
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (url.hostname !== "github.com" || parts.length < 2) {
    throw new TypeError("GitHub target must be owner/repository or a github.com repository URL.");
  }
  return { owner: parts[0], repo: parts[1].replace(/\.git$/i, "") };
}

function createGitHubProvider(config, context) {
  const token = primitiveString(config.token, "github.token", 4_096, { optional: true });
  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": `CockroachCrawler/${PACKAGE_VERSION}`,
    "x-github-api-version": "2022-11-28",
    ...(token ? { authorization: `Bearer ${token}` } : {})
  };
  return deepFreeze({
    id: "github",
    status() {
      return providerStatus("github", "ready", { search: true, read: true }, token
        ? "GitHub REST is configured with a token."
        : "Public GitHub REST is ready at the unauthenticated rate limit.", token ? "token" : "optional");
    },
    async search(input) {
      const kind = input.kind || "repositories";
      if (kind !== "repositories" && kind !== "issues") {
        throw new TypeError("GitHub kind must be 'repositories' or 'issues'.");
      }
      const endpoint = kind === "issues" ? "issues" : "repositories";
      const url = new URL(`https://api.github.com/search/${endpoint}`);
      url.searchParams.set("q", input.query);
      url.searchParams.set("per_page", String(input.maxResults));
      const { data } = await fetchJson(context, "github", url, { headers, signal: input.signal });
      const items = Array.isArray(data?.items) ? data.items.slice(0, input.maxResults) : [];
      return items.map((item) => record("github", kind === "issues" ? {
        id: item.id,
        type: item.pull_request ? "pull_request" : "issue",
        title: item.title,
        url: item.html_url,
        text: item.body || "",
        author: item.user?.login,
        publishedAt: item.created_at,
        authenticated: Boolean(token),
        metadata: { state: item.state, comments: item.comments, repositoryUrl: item.repository_url }
      } : {
        id: item.id,
        type: "repository",
        title: item.full_name,
        url: item.html_url,
        text: item.description || "",
        author: item.owner?.login,
        publishedAt: item.created_at,
        authenticated: Boolean(token),
        metadata: {
          stars: item.stargazers_count,
          forks: item.forks_count,
          language: item.language,
          license: item.license?.spdx_id || null,
          defaultBranch: item.default_branch
        }
      }));
    },
    async read(input) {
      const { owner, repo } = githubTarget(input.target);
      const encodedOwner = encodeURIComponent(owner);
      const encodedRepo = encodeURIComponent(repo);
      const [{ data }, readme] = await Promise.all([
        fetchJson(context, "github", `https://api.github.com/repos/${encodedOwner}/${encodedRepo}`, {
          headers,
          signal: input.signal
        }),
        fetchText(context, "github", `https://api.github.com/repos/${encodedOwner}/${encodedRepo}/readme`, {
          headers: { ...headers, accept: "application/vnd.github.raw+json" },
          signal: input.signal
        }).then(({ text }) => text).catch((error) => {
          if (error?.code === "SOURCE_NOT_FOUND" && error?.details?.status === 404) return "";
          throw error;
        })
      ]);
      return [record("github", {
        id: data.id,
        type: "repository",
        title: data.full_name,
        url: data.html_url,
        text: readme || data.description || "",
        author: data.owner?.login,
        publishedAt: data.created_at,
        authenticated: Boolean(token),
        metadata: {
          description: data.description,
          stars: data.stargazers_count,
          forks: data.forks_count,
          openIssues: data.open_issues_count,
          language: data.language,
          license: data.license?.spdx_id || null,
          defaultBranch: data.default_branch,
          updatedAt: safeDate(data.updated_at)
        }
      })];
    }
  });
}

function youtubeVideoId(target) {
  const value = primitiveString(target, "target", MAX_TARGET_LENGTH);
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError("YouTube target must be a video ID or YouTube URL.");
  }
  if (url.hostname === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || "";
  if (url.hostname === "www.youtube.com" || url.hostname === "youtube.com" || url.hostname === "m.youtube.com") {
    if (url.pathname === "/watch") return url.searchParams.get("v") || "";
    const match = url.pathname.match(/^\/(?:shorts|embed)\/([A-Za-z0-9_-]{11})/);
    if (match) return match[1];
  }
  throw new TypeError("YouTube target must be a video ID or YouTube URL.");
}

function createYouTubeProvider(config, context) {
  const apiKey = primitiveString(config.apiKey, "youtube.apiKey", 4_096, { optional: true });
  const apiHeaders = apiKey ? { "x-goog-api-key": apiKey } : {};
  return deepFreeze({
    id: "youtube",
    status() {
      return providerStatus("youtube", apiKey ? "ready" : "partial", {
        search: Boolean(apiKey),
        read: true,
        transcript: false
      }, apiKey
        ? "YouTube search and metadata reads are configured."
        : "Public oEmbed metadata reads are ready; search requires YOUTUBE_API_KEY.", apiKey ? "api_key" : "optional");
    },
    async search(input) {
      if (!apiKey) {
        throw new SourceAccessError("SOURCE_NOT_CONFIGURED", "YouTube search requires YOUTUBE_API_KEY.", {
          provider: "youtube"
        });
      }
      const url = new URL("https://www.googleapis.com/youtube/v3/search");
      url.searchParams.set("part", "snippet");
      url.searchParams.set("type", "video");
      url.searchParams.set("q", input.query);
      url.searchParams.set("maxResults", String(Math.min(input.maxResults, 50)));
      const { data } = await fetchJson(context, "youtube", url, { headers: apiHeaders, signal: input.signal });
      const items = Array.isArray(data?.items) ? data.items.slice(0, input.maxResults) : [];
      return items.map((item) => record("youtube", {
        id: item.id?.videoId,
        type: "video",
        title: item.snippet?.title,
        url: `https://www.youtube.com/watch?v=${encodeURIComponent(item.id?.videoId || "")}`,
        text: item.snippet?.description || "",
        author: item.snippet?.channelTitle,
        publishedAt: item.snippet?.publishedAt,
        authenticated: false,
        credentialed: true,
        metadata: { channelId: item.snippet?.channelId, thumbnail: item.snippet?.thumbnails?.high?.url || null }
      }));
    },
    async read(input) {
      const id = youtubeVideoId(input.target);
      if (!/^[A-Za-z0-9_-]{11}$/.test(id)) throw new TypeError("Invalid YouTube video ID.");
      if (apiKey) {
        const url = new URL("https://www.googleapis.com/youtube/v3/videos");
        url.searchParams.set("part", "snippet,contentDetails,statistics");
        url.searchParams.set("id", id);
        const { data } = await fetchJson(context, "youtube", url, { headers: apiHeaders, signal: input.signal });
        const item = Array.isArray(data?.items) ? data.items[0] : null;
        if (!item) throw new SourceAccessError("SOURCE_NOT_FOUND", "YouTube video was not found.", { provider: "youtube" });
        return [record("youtube", {
          id,
          type: "video",
          title: item.snippet?.title,
          url: `https://www.youtube.com/watch?v=${id}`,
          text: item.snippet?.description || "",
          author: item.snippet?.channelTitle,
          publishedAt: item.snippet?.publishedAt,
          authenticated: false,
          credentialed: true,
          metadata: {
            channelId: item.snippet?.channelId,
            duration: item.contentDetails?.duration,
            views: item.statistics?.viewCount,
            likes: item.statistics?.likeCount,
            comments: item.statistics?.commentCount,
            transcriptAvailable: false
          }
        })];
      }
      const watchUrl = `https://www.youtube.com/watch?v=${id}`;
      const url = new URL("https://www.youtube.com/oembed");
      url.searchParams.set("url", watchUrl);
      url.searchParams.set("format", "json");
      const { data } = await fetchJson(context, "youtube", url, { signal: input.signal });
      return [record("youtube", {
        id,
        type: "video",
        title: data.title,
        url: watchUrl,
        text: "",
        author: data.author_name,
        authenticated: false,
        metadata: {
          authorUrl: data.author_url,
          thumbnail: data.thumbnail_url,
          transcriptAvailable: false,
          metadataOnly: true
        }
      })];
    }
  });
}

function xTweetId(target) {
  const value = primitiveString(target, "target", MAX_TARGET_LENGTH);
  if (/^\d{1,32}$/.test(value)) return value;
  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/status\/(\d{1,32})/);
    if ((url.hostname === "x.com" || url.hostname === "twitter.com" || url.hostname === "www.x.com" || url.hostname === "www.twitter.com") && match) {
      return match[1];
    }
  } catch {
    // Fall through to the typed error below.
  }
  throw new TypeError("X target must be a post ID or x.com status URL.");
}

function createXProvider(config, context) {
  const bearerToken = primitiveString(config.bearerToken, "x.bearerToken", 8_192, { optional: true });
  const headers = bearerToken ? { authorization: `Bearer ${bearerToken}` } : {};
  const mapTweet = (item, users = new Map()) => {
    const author = users.get(item.author_id);
    return record("x", {
      id: item.id,
      type: "post",
      title: item.text?.slice(0, 120),
      url: `https://x.com/${author?.username || "i"}/status/${item.id}`,
      text: item.text || "",
      author: author?.username || item.author_id,
      publishedAt: item.created_at,
      authenticated: true,
      metadata: { metrics: item.public_metrics || {}, conversationId: item.conversation_id || null }
    });
  };
  return deepFreeze({
    id: "x",
    status() {
      return providerStatus("x", bearerToken ? "ready" : "missing_credentials", {
        search: Boolean(bearerToken),
        read: Boolean(bearerToken)
      }, bearerToken ? "X API v2 is configured." : "Set X_BEARER_TOKEN for approved X API v2 access.", "bearer_token");
    },
    async search(input) {
      if (!bearerToken) throw new SourceAccessError("SOURCE_NOT_CONFIGURED", "X access requires X_BEARER_TOKEN.", { provider: "x" });
      const url = new URL("https://api.x.com/2/tweets/search/recent");
      url.searchParams.set("query", input.query);
      url.searchParams.set("max_results", String(Math.max(10, Math.min(input.maxResults, 100))));
      url.searchParams.set("tweet.fields", "author_id,conversation_id,created_at,lang,public_metrics");
      url.searchParams.set("expansions", "author_id");
      url.searchParams.set("user.fields", "username,name");
      const { data } = await fetchJson(context, "x", url, { headers, signal: input.signal });
      const users = new Map((data?.includes?.users || []).map((user) => [user.id, user]));
      return (Array.isArray(data?.data) ? data.data : []).slice(0, input.maxResults).map((item) => mapTweet(item, users));
    },
    async read(input) {
      if (!bearerToken) throw new SourceAccessError("SOURCE_NOT_CONFIGURED", "X access requires X_BEARER_TOKEN.", { provider: "x" });
      const id = xTweetId(input.target);
      const url = new URL(`https://api.x.com/2/tweets/${encodeURIComponent(id)}`);
      url.searchParams.set("tweet.fields", "author_id,conversation_id,created_at,lang,public_metrics");
      url.searchParams.set("expansions", "author_id");
      url.searchParams.set("user.fields", "username,name");
      const { data } = await fetchJson(context, "x", url, { headers, signal: input.signal });
      const users = new Map((data?.includes?.users || []).map((user) => [user.id, user]));
      if (!data?.data) throw new SourceAccessError("SOURCE_NOT_FOUND", "X post was not found.", { provider: "x" });
      return [mapTweet(data.data, users)];
    }
  });
}

function redditPostId(target) {
  const value = primitiveString(target, "target", MAX_TARGET_LENGTH);
  if (/^[a-z0-9]{3,12}$/i.test(value)) return value;
  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/comments\/([a-z0-9]{3,12})/i);
    if ((url.hostname === "reddit.com" || url.hostname === "www.reddit.com" || url.hostname === "old.reddit.com") && match) {
      return match[1];
    }
  } catch {
    // Fall through to the typed error below.
  }
  throw new TypeError("Reddit target must be a post ID or reddit.com comments URL.");
}

function createRedditProvider(config, context) {
  const clientId = primitiveString(config.clientId, "reddit.clientId", 1_024, { optional: true });
  const clientSecret = primitiveString(config.clientSecret, "reddit.clientSecret", 4_096, { optional: true });
  const userAgent = primitiveString(config.userAgent, "reddit.userAgent", 256, { optional: true });
  const configured = Boolean(clientId && clientSecret && userAgent);
  let cachedToken = null;
  let tokenExpiresAt = 0;

  async function token(signal) {
    if (!configured) throw new SourceAccessError("SOURCE_NOT_CONFIGURED", "Reddit access requires client ID, client secret, and a contact-aware user agent.", { provider: "reddit" });
    if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;
    const authorization = btoa(`${clientId}:${clientSecret}`);
    const body = new URLSearchParams({ grant_type: "client_credentials" });
    const { data } = await fetchJson(context, "reddit", "https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        authorization: `Basic ${authorization}`,
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": userAgent
      },
      body,
      signal
    });
    if (typeof data?.access_token !== "string") {
      throw new SourceAccessError("SOURCE_AUTH_FAILED", "Reddit did not return an access token.", { provider: "reddit" });
    }
    cachedToken = data.access_token;
    tokenExpiresAt = Date.now() + boundedInteger(data.expires_in, "reddit expires_in", 3_600, 1, 86_400) * 1_000;
    return cachedToken;
  }

  function mapPost(item) {
    const post = item?.data || item;
    return record("reddit", {
      id: post.id,
      type: "post",
      title: post.title,
      url: post.permalink ? `https://www.reddit.com${post.permalink}` : post.url,
      text: post.selftext || "",
      author: post.author,
      publishedAt: Number.isFinite(post.created_utc) ? new Date(post.created_utc * 1_000).toISOString() : null,
      authenticated: true,
      metadata: {
        subreddit: post.subreddit,
        score: post.score,
        comments: post.num_comments,
        over18: post.over_18 === true,
        outboundUrl: post.url || null
      }
    });
  }

  return deepFreeze({
    id: "reddit",
    status() {
      return providerStatus("reddit", configured ? "ready" : "missing_credentials", {
        search: configured,
        read: configured
      }, configured
        ? "Reddit application-only OAuth is configured."
        : "Set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, and COCKROACH_REDDIT_USER_AGENT.", "oauth_client_credentials");
    },
    async search(input) {
      const accessToken = await token(input.signal);
      const subreddit = input.subreddit ? primitiveString(input.subreddit, "subreddit", 64) : null;
      if (subreddit && !/^[A-Za-z0-9_]{2,64}$/.test(subreddit)) throw new TypeError("subreddit contains unsupported characters.");
      const path = subreddit ? `/r/${encodeURIComponent(subreddit)}/search` : "/search";
      const url = new URL(`https://oauth.reddit.com${path}`);
      url.searchParams.set("q", input.query);
      url.searchParams.set("limit", String(Math.min(input.maxResults, 100)));
      url.searchParams.set("type", "link");
      url.searchParams.set("raw_json", "1");
      if (subreddit) url.searchParams.set("restrict_sr", "1");
      const { data } = await fetchJson(context, "reddit", url, {
        headers: { authorization: `Bearer ${accessToken}`, "user-agent": userAgent },
        signal: input.signal
      });
      return (Array.isArray(data?.data?.children) ? data.data.children : []).slice(0, input.maxResults).map(mapPost);
    },
    async read(input) {
      const accessToken = await token(input.signal);
      const id = redditPostId(input.target);
      const url = new URL(`https://oauth.reddit.com/comments/${encodeURIComponent(id)}`);
      url.searchParams.set("raw_json", "1");
      url.searchParams.set("limit", String(Math.min(input.maxResults, 100)));
      const { data } = await fetchJson(context, "reddit", url, {
        headers: { authorization: `Bearer ${accessToken}`, "user-agent": userAgent },
        signal: input.signal
      });
      const post = data?.[0]?.data?.children?.[0];
      if (!post) throw new SourceAccessError("SOURCE_NOT_FOUND", "Reddit post was not found.", { provider: "reddit" });
      const comments = Array.isArray(data?.[1]?.data?.children)
        ? data[1].data.children.filter((item) => item?.kind === "t1").slice(0, input.maxResults).map((item) => ({
          id: item.data?.id,
          author: item.data?.author,
          body: item.data?.body,
          score: item.data?.score
        }))
        : [];
      const normalized = mapPost(post);
      return [deepFreeze({
        ...normalized,
        metadata: { ...normalized.metadata, commentsSample: comments }
      })];
    }
  });
}

function createWebProvider(config) {
  const crawlOptions = snapshotRecord(config.crawlOptions, "web.crawlOptions", WEB_CRAWL_OPTION_KEYS);
  return deepFreeze({
    id: "web",
    status() {
      return providerStatus("web", "ready", { search: false, read: true, crawl: true },
        "The hardened public-web crawler is ready.", "none");
    },
    async search() {
      throw new SourceAccessError("SOURCE_CAPABILITY_UNAVAILABLE", "The web provider crawls explicit URLs; it is not a search engine.", {
        provider: "web"
      });
    },
    async read(input) {
      const target = primitiveString(input.target, "target", MAX_TARGET_LENGTH);
      const { crawl } = await import("./index.js");
      const pages = await crawl({
        ...crawlOptions,
        seeds: [target],
        maxPages: Math.min(input.maxResults, crawlOptions.maxPages || input.maxResults),
        signal: input.signal
      });
      return pages.map((page) => record("web", {
        id: page.contentHash || page.url,
        type: "web_page",
        title: page.title,
        url: page.url,
        text: page.markdown || page.text,
        publishedAt: page.lastModified,
        method: "crawler",
        authenticated: false,
        metadata: {
          description: page.description,
          language: page.language,
          depth: page.depth,
          contentHash: page.contentHash,
          discoveredFrom: page.discoveredFrom,
          redirectChain: page.redirectChain
        }
      }));
    }
  });
}

function normalizeSearchInput(value) {
  const input = snapshotRecord(value, "search", new Set(["query", "maxResults", "kind", "subreddit", "signal"]));
  return {
    query: primitiveString(input.query, "query", MAX_QUERY_LENGTH),
    maxResults: boundedInteger(input.maxResults, "maxResults", 10, 1, 100),
    kind: primitiveString(input.kind, "kind", 64, { optional: true }),
    subreddit: primitiveString(input.subreddit, "subreddit", 64, { optional: true }),
    signal: optionalSignal(input.signal)
  };
}

function normalizeReadInput(value) {
  if (typeof value === "string") value = { target: value };
  const input = snapshotRecord(value, "read", new Set(["target", "maxResults", "signal"]));
  return {
    target: primitiveString(input.target, "target", MAX_TARGET_LENGTH),
    maxResults: boundedInteger(input.maxResults, "maxResults", 10, 1, 100),
    signal: optionalSignal(input.signal)
  };
}

export function createSourceRegistry(options = {}) {
  const config = snapshotRecord(options, "source registry", new Set([
    "fetch", "timeoutMs", "maxResponseBytes", "github", "youtube", "x", "reddit", "web", "providers"
  ]));
  const fetchImpl = config.fetch || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new TypeError("A Fetch-compatible function is required.");
  const context = {
    fetch: fetchImpl,
    timeoutMs: boundedInteger(config.timeoutMs, "timeoutMs", DEFAULT_TIMEOUT_MS, 100, 120_000),
    maxResponseBytes: boundedInteger(config.maxResponseBytes, "maxResponseBytes", DEFAULT_MAX_RESPONSE_BYTES, 1_024, 20 * 1024 * 1024)
  };
  const webConfig = snapshotRecord(config.web, "web provider", new Set(["crawlOptions"]));
  const githubConfig = snapshotRecord(config.github, "github provider", new Set(["token"]));
  const youtubeConfig = snapshotRecord(config.youtube, "youtube provider", new Set(["apiKey"]));
  const xConfig = snapshotRecord(config.x, "x provider", new Set(["bearerToken"]));
  const redditConfig = snapshotRecord(config.reddit, "reddit provider", new Set(["clientId", "clientSecret", "userAgent"]));
  const providers = [
    createWebProvider(webConfig),
    createGitHubProvider(githubConfig, context),
    createYouTubeProvider(youtubeConfig, context),
    createXProvider(xConfig, context),
    createRedditProvider(redditConfig, context)
  ];
  if (config.providers !== undefined) {
    if (!Array.isArray(config.providers)) throw new TypeError("providers must be an array.");
    providers.push(...config.providers);
  }
  const providerMap = new Map();
  for (const provider of providers) {
    if (!provider || typeof provider !== "object" || typeof provider.id !== "string" || typeof provider.status !== "function") {
      throw new TypeError("Every source provider must expose id and status().");
    }
    if (providerMap.has(provider.id)) throw new TypeError(`Duplicate source provider '${provider.id}'.`);
    providerMap.set(provider.id, provider);
  }

  function getProvider(id) {
    const key = primitiveString(id, "provider", 128);
    const provider = providerMap.get(key);
    if (!provider) throw new SourceAccessError("SOURCE_UNKNOWN_PROVIDER", `Unknown source provider '${key}'.`, { provider: key });
    return provider;
  }

  return deepFreeze({
    list() {
      return [...providerMap.keys()];
    },
    doctor() {
      return deepFreeze([...providerMap.values()].map((provider) => provider.status()));
    },
    async search(id, input) {
      const provider = getProvider(id);
      if (typeof provider.search !== "function") {
        throw new SourceAccessError("SOURCE_CAPABILITY_UNAVAILABLE", `'${provider.id}' does not support search.`, { provider: provider.id });
      }
      return deepFreeze(await provider.search(normalizeSearchInput(input)));
    },
    async read(id, input) {
      const provider = getProvider(id);
      if (typeof provider.read !== "function") {
        throw new SourceAccessError("SOURCE_CAPABILITY_UNAVAILABLE", `'${provider.id}' does not support reads.`, { provider: provider.id });
      }
      return deepFreeze(await provider.read(normalizeReadInput(input)));
    }
  });
}

export function createSourceRegistryFromEnv(env = process.env, options = {}) {
  const environment = snapshotSelectedProperties(env, "env", ENVIRONMENT_KEYS);
  const config = snapshotRecord(options, "source registry environment", new Set([
    "fetch", "timeoutMs", "maxResponseBytes", "web", "providers"
  ]));
  return createSourceRegistry({
    ...config,
    github: { token: environment.GITHUB_TOKEN || environment.GH_TOKEN },
    youtube: { apiKey: environment.YOUTUBE_API_KEY },
    x: { bearerToken: environment.X_BEARER_TOKEN },
    reddit: {
      clientId: environment.REDDIT_CLIENT_ID,
      clientSecret: environment.REDDIT_CLIENT_SECRET,
      userAgent: environment.COCKROACH_REDDIT_USER_AGENT
    }
  });
}

export const builtinSourceIds = SOURCE_IDS;
