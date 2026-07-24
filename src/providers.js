const DEFAULT_ESCALATION_STATUSES = new Set([408, 429, 502, 503, 504]);
const CHALLENGE_PATTERN = /(?:captcha|cf-chl|challenge-platform|verify you are human|access denied)/i;

function integer(value, label, fallback, minimum, maximum) {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label} must be a safe integer from ${minimum} to ${maximum}.`);
  }
  return result;
}
function normalizeProvider(value, index) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`providers[${index}] must be an object.`);
  }
  if (typeof value.id !== "string" || !/^[A-Za-z0-9._-]{1,128}$/.test(value.id)) {
    throw new TypeError(`providers[${index}].id is invalid.`);
  }
  if (typeof value.execute !== "function") {
    throw new TypeError(`providers[${index}].execute must be a trusted function.`);
  }
  return Object.freeze({
    id: value.id,
    execute: value.execute,
    authority: typeof value.authority === "string" ? value.authority.slice(0, 256) : "operator-configured",
    credentialed: value.credentialed === true
  });
}

export function detectAccessChallenge(response) {
  const status = Number(response?.status || 0);
  const body = String(response?.body ?? response?.text ?? "").slice(0, 64 * 1024);
  const challenge = [401, 403].includes(status) || CHALLENGE_PATTERN.test(body);
  return {
    challenge,
    retryable: DEFAULT_ESCALATION_STATUSES.has(status),
    status,
    reason: challenge
      ? "access-challenge"
      : (DEFAULT_ESCALATION_STATUSES.has(status) ? "retryable-transport" : "none")
  };
}

export function createEscalationRouter(options = {}) {
  if (!Array.isArray(options.providers) || !options.providers.length) {
    throw new TypeError("providers must be a non-empty array.");
  }
  const providers = options.providers.map(normalizeProvider);
  if (new Set(providers.map(({ id }) => id)).size !== providers.length) {
    throw new TypeError("providers must have unique ids.");
  }
  const maxAttempts = integer(options.maxAttempts, "maxAttempts", providers.length, 1, providers.length);
  const escalationStatuses = new Set(options.escalationStatuses || DEFAULT_ESCALATION_STATUSES);
  for (const status of escalationStatuses) {
    if (!Number.isSafeInteger(status) || status < 400 || status > 599) {
      throw new TypeError("escalationStatuses must contain HTTP status integers from 400 to 599.");
    }
  }
  const allowChallengeProvider = options.allowChallengeProvider === true;

  return Object.freeze({
    providers: providers.map(({ id, authority, credentialed }) => ({ id, authority, credentialed })),
    async execute(request, execution = {}) {
      const attempts = [];
      for (const provider of providers.slice(0, maxAttempts)) {
        let response;
        try {
          response = await provider.execute(Object.freeze(structuredClone(request)), {
            signal: execution.signal
          });
        } catch (error) {
          attempts.push({
            provider: provider.id,
            outcome: "error",
            code: error?.code || "PROVIDER_ERROR",
            message: String(error?.message || error).slice(0, 1_024)
          });
          if (error?.retryable !== true) throw Object.assign(error, { attempts });
          continue;
        }
        const status = Number(response?.status || 0);
        const detection = detectAccessChallenge(response);
        attempts.push({
          provider: provider.id,
          outcome: detection.challenge ? "challenge" : "response",
          status,
          authority: provider.authority,
          credentialed: provider.credentialed
        });
        if (detection.challenge && !allowChallengeProvider) {
          const error = new Error(
            "Access challenge detected. Cockroach Crawler does not bypass CAPTCHAs or authorization controls."
          );
          error.code = "ACCESS_CHALLENGE";
          error.status = status;
          error.attempts = attempts;
          throw error;
        }
        if (!escalationStatuses.has(status) && !detection.challenge) {
          return { response, provider: provider.id, attempts };
        }
      }
      const error = new Error(`No configured provider succeeded after ${attempts.length} attempt(s).`);
      error.code = "PROVIDER_EXHAUSTED";
      error.attempts = attempts;
      throw error;
    }
  });
}

export function createProxyGatewayProvider(options = {}) {
  if (typeof options.id !== "string" || !/^[A-Za-z0-9._-]{1,128}$/.test(options.id)) {
    throw new TypeError("id is invalid.");
  }
  let endpoint;
  try {
    endpoint = new URL(options.endpoint);
  } catch {
    throw new TypeError("endpoint must be an absolute HTTP(S) URL.");
  }
  if (!["http:", "https:"].includes(endpoint.protocol) || endpoint.username || endpoint.password) {
    throw new TypeError("endpoint must be an HTTP(S) URL without embedded credentials.");
  }
  if (options.fetch !== undefined && typeof options.fetch !== "function") {
    throw new TypeError("fetch must be a trusted host function.");
  }
  const fetchImplementation = options.fetch || globalThis.fetch;
  const timeoutMs = integer(options.timeoutMs, "timeoutMs", 30_000, 100, 300_000);
  const maxResponseBytes = integer(
    options.maxResponseBytes,
    "maxResponseBytes",
    5_000_000,
    1_024,
    50_000_000
  );
  const token = options.token;
  if (token !== undefined && (typeof token !== "string" || token.length < 16 || token.length > 4_096)) {
    throw new TypeError("token must contain 16-4096 characters.");
  }
  return Object.freeze({
    id: options.id,
    authority: typeof options.authority === "string"
      ? options.authority.slice(0, 256)
      : `fixed proxy gateway ${endpoint.origin}`,
    credentialed: Boolean(token),
    async execute(request, context = {}) {
      const signal = context.signal
        ? AbortSignal.any([context.signal, AbortSignal.timeout(timeoutMs)])
        : AbortSignal.timeout(timeoutMs);
      const response = await fetchImplementation(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(structuredClone(request)),
        signal,
        redirect: "error"
      });
      const contentLength = Number(response.headers?.get?.("content-length") || 0);
      if (Number.isFinite(contentLength) && contentLength > maxResponseBytes) {
        const error = new RangeError(`Proxy response exceeds maxResponseBytes (${maxResponseBytes}).`);
        error.code = "PROXY_RESPONSE_LIMIT";
        throw error;
      }
      const body = await response.text();
      if (Buffer.byteLength(body) > maxResponseBytes) {
        const error = new RangeError(`Proxy response exceeds maxResponseBytes (${maxResponseBytes}).`);
        error.code = "PROXY_RESPONSE_LIMIT";
        throw error;
      }
      if (!response.ok) {
        const error = new Error(`Proxy gateway returned HTTP ${response.status}.`);
        error.code = "PROXY_GATEWAY_HTTP";
        error.status = response.status;
        error.retryable = DEFAULT_ESCALATION_STATUSES.has(response.status);
        throw error;
      }
      let value;
      try {
        value = JSON.parse(body);
      } catch (cause) {
        const error = new TypeError("Proxy gateway returned invalid JSON.");
        error.code = "PROXY_INVALID_RESPONSE";
        error.cause = cause;
        throw error;
      }
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new TypeError("Proxy gateway response must be an object.");
      }
      return structuredClone(value);
    }
  });
}
