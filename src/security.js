import { lookup as defaultLookup } from "node:dns/promises";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
import { Agent, fetch as undiciFetch } from "undici";

// This opt-in deliberately remains narrower than "all non-public networks".
// Link-local, multicast, unspecified, reserved, benchmarking, carrier-grade
// NAT, and cloud/platform endpoints are never allowed.
const TRUSTED_PRIVATE_RANGES = new Set(["private", "loopback", "uniqueLocal"]);
const METADATA_HOST_LABELS = new Set(["metadata", "instance-data"]);
const PLATFORM_ADDRESSES = new Set([
  // AWS IMDS (IPv4 and IPv6).
  "169.254.169.254",
  "fd00:ec2::254",
  // Azure host virtual IP / WireServer. Despite being globally-shaped
  // unicast, this address is local to the Azure host and must never be
  // treated as public crawler egress.
  "168.63.129.16",
  // Alibaba ECS metadata and Oracle legacy metadata. Their generic ranges
  // are already denied, but explicit classification prevents a future range
  // policy change from accidentally exposing them.
  "100.100.100.200",
  "192.0.0.192"
]);
const URL_SECURITY_OPTION_KEYS = new Set([
  "allowPrivateNetworks",
  "lookup",
  "signal"
]);

function snapshotUrlSecurityOptions(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("URL security options must be an object.");
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of URL_SECURITY_OPTION_KEYS) {
    const descriptor = Object.hasOwn(descriptors, key) ? descriptors[key] : null;
    if (!descriptor && key in value) {
      throw new TypeError(`Inherited URL security option '${key}' is not allowed.`);
    }
    if (descriptor && (!descriptor.enumerable || !Object.hasOwn(descriptor, "value"))) {
      throw new TypeError(`URL security option '${key}' must be an own enumerable data property.`);
    }
  }

  const snapshot = Object.create(null);
  for (const key of Reflect.ownKeys(descriptors)) {
    const label = typeof key === "symbol" ? key.toString() : key;
    if (typeof key !== "string" || !URL_SECURITY_OPTION_KEYS.has(key)) {
      throw new TypeError(`Unknown URL security option '${label}'.`);
    }
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`URL security option '${key}' must be an own enumerable data property.`);
    }
    snapshot[key] = descriptor.value;
  }

  if (snapshot.allowPrivateNetworks !== undefined && typeof snapshot.allowPrivateNetworks !== "boolean") {
    throw new TypeError("URL security option 'allowPrivateNetworks' must be a boolean.");
  }
  if (snapshot.lookup !== undefined && typeof snapshot.lookup !== "function") {
    throw new TypeError("URL security option 'lookup' must be a function.");
  }
  if (snapshot.signal !== undefined && !(snapshot.signal instanceof AbortSignal)) {
    throw new TypeError("URL security option 'signal' must be an AbortSignal.");
  }
  return snapshot;
}

function stripIpv6Brackets(hostname) {
  return hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
}

function normalizeHostname(hostname) {
  return stripIpv6Brackets(String(hostname || "")).replace(/\.$/, "").toLowerCase();
}

export function createCrawlerSecurityError(message, details = {}) {
  const error = new Error(message);
  error.name = "CrawlerSecurityError";
  error.code = "CRAWLER_URL_BLOCKED";
  error.details = details;
  return error;
}

export function classifyIpAddress(value) {
  const input = stripIpv6Brackets(String(value || ""));
  if (!ipaddr.isValid(input)) {
    return { address: input, family: 0, range: "invalid", isPublic: false };
  }

  let address = ipaddr.parse(input);
  if (address.kind() === "ipv6" && address.isIPv4MappedAddress()) {
    address = address.toIPv4Address();
  }
  const normalized = address.toString();
  const range = PLATFORM_ADDRESSES.has(normalized) ? "metadata" : address.range();
  return {
    address: normalized,
    family: address.kind() === "ipv4" ? 4 : 6,
    range,
    isPublic: range === "unicast"
  };
}

export function isPublicIpAddress(value) {
  return classifyIpAddress(value).isPublic;
}

function normalizeLookupResults(result) {
  const values = Array.isArray(result) ? result : [result];
  return values.map((item) => {
    if (typeof item === "string") {
      return { address: item, family: isIP(stripIpv6Brackets(item)) };
    }
    return {
      address: item?.address,
      family: Number(item?.family) || isIP(stripIpv6Brackets(item?.address || ""))
    };
  }).filter((item) => item.address && (item.family === 4 || item.family === 6));
}

function withAbort(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(signal.reason || new Error("DNS resolution was aborted."));
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason || new Error("DNS resolution was aborted."));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      }
    );
  });
}

export async function resolveUrlTarget(value, options = {}) {
  options = snapshotUrlSecurityOptions(options);
  let url;
  try {
    url = value instanceof URL ? new URL(value) : new URL(value);
  } catch (cause) {
    const error = createCrawlerSecurityError("Crawler URLs must be valid absolute HTTP(S) URLs.", {
      value: String(value)
    });
    error.cause = cause;
    throw error;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw createCrawlerSecurityError(`Protocol '${url.protocol}' is not allowed.`, { url: url.toString() });
  }
  if (url.username || url.password) {
    throw createCrawlerSecurityError("URLs containing embedded credentials are not allowed.", {
      origin: url.origin
    });
  }

  const hostname = normalizeHostname(url.hostname);
  if (!hostname || hostname.split(".").some((label) => METADATA_HOST_LABELS.has(label))) {
    throw createCrawlerSecurityError("Cloud metadata hostnames are never allowed.", { hostname });
  }

  const literalFamily = isIP(hostname);
  const lookup = options.lookup || defaultLookup;
  let addresses;
  if (literalFamily) {
    addresses = [{ address: hostname, family: literalFamily }];
  } else {
    try {
      addresses = normalizeLookupResults(await withAbort(Promise.resolve(lookup(hostname, {
        all: true,
        verbatim: true
      })), options.signal));
    } catch (cause) {
      const error = createCrawlerSecurityError(`DNS resolution failed for '${hostname}'.`, { hostname });
      error.cause = cause;
      throw error;
    }
  }

  if (!addresses.length) {
    throw createCrawlerSecurityError(`DNS resolution returned no usable addresses for '${hostname}'.`, { hostname });
  }

  const classified = addresses.map((entry) => ({
    ...entry,
    ...classifyIpAddress(entry.address)
  }));
  const blocked = classified.find((entry) => (
    !entry.isPublic
    && !(options.allowPrivateNetworks === true && TRUSTED_PRIVATE_RANGES.has(entry.range))
  ));
  if (blocked) {
    throw createCrawlerSecurityError(`Address range '${blocked.range}' is not allowed for crawler requests.`, {
      hostname,
      address: blocked.address,
      range: blocked.range
    });
  }

  return {
    url,
    hostname,
    address: classified[0].address,
    family: classified[0].family,
    addresses: classified
  };
}

function createPinnedDispatcher(target) {
  return new Agent({
    connect: {
      lookup(hostname, options, callback) {
        if (normalizeHostname(hostname) !== target.hostname) {
          callback(createCrawlerSecurityError("Crawler connection attempted an unvalidated hostname.", {
            expectedHostname: target.hostname,
            actualHostname: normalizeHostname(hostname)
          }));
          return;
        }
        if (options?.all) {
          callback(null, [{ address: target.address, family: target.family }]);
          return;
        }
        callback(null, target.address, target.family);
      }
    }
  });
}

export async function withPinnedFetch(value, requestOptions, securityOptions, consume) {
  const target = await resolveUrlTarget(value, securityOptions);
  const dispatcher = createPinnedDispatcher(target);
  let response = null;
  try {
    response = await undiciFetch(target.url, {
      ...requestOptions,
      redirect: "manual",
      dispatcher
    });
    return await consume(response, target);
  } catch (error) {
    try {
      await response?.body?.cancel();
    } catch {
      // The dispatcher is still closed below.
    }
    throw error;
  } finally {
    // A per-request dispatcher has no useful keep-alive lifetime. Destroying it
    // also guarantees that a stalled connect cannot outlive request/crawl abort.
    await dispatcher.destroy();
  }
}
