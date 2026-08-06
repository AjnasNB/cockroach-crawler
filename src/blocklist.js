const RESOURCE_TYPES = Object.freeze([
  "document",
  "stylesheet",
  "image",
  "media",
  "font",
  "script",
  "texttrack",
  "xhr",
  "fetch",
  "eventsource",
  "websocket",
  "manifest",
  "other"
]);

const PRESETS = Object.freeze({
  none: Object.freeze([]),
  media: Object.freeze(["image", "media", "font"]),
  assets: Object.freeze(["image", "media", "font", "stylesheet"]),
  text: Object.freeze(["image", "media", "font", "stylesheet", "script"])
});

const TRACKER_DOMAINS = Object.freeze([...new Set([
  "google-analytics.com",
  "analytics.google.com",
  "googletagmanager.com",
  "googletagservices.com",
  "googlesyndication.com",
  "googleadservices.com",
  "doubleclick.net",
  "adservice.google.com",
  "pagead2.googlesyndication.com",
  "facebook.net",
  "connect.facebook.net",
  "facebook.com/tr",
  "scorecardresearch.com",
  "quantserve.com",
  "quantcast.com",
  "criteo.com",
  "criteo.net",
  "outbrain.com",
  "taboola.com",
  "adnxs.com",
  "rubiconproject.com",
  "pubmatic.com",
  "openx.net",
  "casalemedia.com",
  "smartadserver.com",
  "adform.net",
  "33across.com",
  "sharethrough.com",
  "indexww.com",
  "amazon-adsystem.com",
  "media.net",
  "bidswitch.net",
  "spotxchange.com",
  "teads.tv",
  "yieldmo.com",
  "hotjar.com",
  "hotjar.io",
  "mouseflow.com",
  "fullstory.com",
  "logrocket.com",
  "logrocket.io",
  "smartlook.com",
  "inspectlet.com",
  "luckyorange.com",
  "crazyegg.com",
  "clarity.ms",
  "mixpanel.com",
  "segment.com",
  "segment.io",
  "amplitude.com",
  "heap.io",
  "heapanalytics.com",
  "kissmetrics.com",
  "matomo.cloud",
  "chartbeat.com",
  "chartbeat.net",
  "parsely.com",
  "newrelic.com",
  "nr-data.net",
  "bugsnag.com",
  "sentry.io",
  "rollbar.com",
  "trackjs.com",
  "raygun.io",
  "intercom.io",
  "intercomcdn.com",
  "drift.com",
  "driftt.com",
  "zdassets.com",
  "zopim.com",
  "tawk.to",
  "crisp.chat",
  "livechatinc.com",
  "olark.com",
  "hubspot.com",
  "hs-analytics.net",
  "hs-scripts.com",
  "hsforms.net",
  "marketo.net",
  "mktoresp.com",
  "pardot.com",
  "salesforceliveagent.com",
  "eloqua.com",
  "demandbase.com",
  "6sense.com",
  "clearbit.com",
  "leadfeeder.com",
  "albacross.com",
  "optimizely.com",
  "optimizely.net",
  "vwo.com",
  "visualwebsiteoptimizer.com",
  "abtasty.com",
  "dynamicyield.com",
  "monetate.net",
  "branch.io",
  "appsflyer.com",
  "adjust.com",
  "kochava.com",
  "singular.net",
  "onesignal.com",
  "pushcrew.com",
  "pushengage.com",
  "addthis.com",
  "sharethis.com",
  "disqus.com",
  "discus.com",
  "cookiebot.com",
  "cookielaw.org",
  "onetrust.com",
  "trustarc.com",
  "usercentrics.eu",
  "quantcast.mgr.consensu.org",
  "bounceexchange.com",
  "exponea.com",
  "braze.com",
  "iterable.com",
  "customer.io",
  "klaviyo.com",
  "mailchimp.com",
  "list-manage.com",
  "yandex.ru/metrika",
  "mc.yandex.ru",
  "vk.com/rtrg",
  "tiktok.com/i18n/pixel",
  "analytics.tiktok.com",
  "ads.linkedin.com",
  "px.ads.linkedin.com",
  "snap.licdn.com",
  "bat.bing.com",
  "ads.twitter.com",
  "static.ads-twitter.com",
  "analytics.pinterest.com",
  "ct.pinterest.com",
  "reddit.com/api/v2/pixel",
  "redditstatic.com/ads",
  "adroll.com",
  "adsrvr.org",
  "advertising.com",
  "adtechus.com",
  "adzerk.net",
  "amplitude.io",
  "app-measurement.com",
  "appdynamics.com",
  "appnexus.com",
  "attn.tv",
  "bidr.io",
  "bing.com/action",
  "bizible.com",
  "bluekai.com",
  "boomtrain.com",
  "bounceexchange.net",
  "brandmetrics.com",
  "bttrack.com",
  "cdn.ampproject.org/v0/amp-analytics",
  "cdn.heapanalytics.com",
  "cdn.mxpnl.com",
  "cdn.segment.com",
  "chartbeat.net",
  "clicktale.net",
  "cloudflareinsights.com",
  "cnzz.com",
  "concert.io",
  "confiant-integrations.net",
  "contentsquare.net",
  "conversantmedia.com",
  "cootlogix.com",
  "creativecdn.com",
  "criteo.net",
  "crwdcntrl.net",
  "cxense.com",
  "d2wy8f7a9ursnm.cloudfront.net",
  "dable.io",
  "demdex.net",
  "dianomi.com",
  "dotomi.com",
  "doubleverify.com",
  "dpm.demdex.net",
  "dwin1.com",
  "emxdgt.com",
  "everesttech.net",
  "exelator.com",
  "flashtalking.com",
  "fullstory.io",
  "gemius.pl",
  "getclicky.com",
  "getdrip.com",
  "go-mpulse.net",
  "googleoptimize.com",
  "gscontxt.net",
  "gumgum.com",
  "hadronid.net",
  "hs-banner.com",
  "hubspot.net",
  "id5-sync.com",
  "improvedigital.com",
  "imrworldwide.com",
  "innovid.com",
  "inside-graph.com",
  "ipredictive.com",
  "jsdelivr.net/npm/@sentry",
  "keywee.co",
  "krxd.net",
  "lijit.com",
  "linksynergy.com",
  "liveintent.com",
  "liveramp.com",
  "loggly.com",
  "lucky-orange.com",
  "mathtag.com",
  "mediavine.com",
  "mgid.com",
  "moatads.com",
  "mookie1.com",
  "mparticle.com",
  "narrative.io",
  "nativo.com",
  "nr-data.net",
  "olytics.omeda.com",
  "omappapi.com",
  "omnitagjs.com",
  "onaudience.com",
  "onetag-sys.com",
  "openx.com",
  "optimizely.io",
  "optnmstr.com",
  "outbrainimg.com",
  "owneriq.net",
  "permutive.app",
  "permutive.com",
  "pippio.com",
  "pixel.wp.com",
  "postrelease.com",
  "powerlinks.com",
  "pro-market.net",
  "pubnation.com",
  "px.srvcs.tumblr.com",
  "qualaroo.com",
  "quantummetric.com",
  "revcontent.com",
  "richaudience.com",
  "rlcdn.com",
  "rtbhouse.com",
  "sail-horizon.com",
  "sc-static.net",
  "scarabresearch.com",
  "sciencemag.us",
  "servenobid.com",
  "sitescout.com",
  "smaato.net",
  "smartlook.cloud",
  "sonobi.com",
  "sovrn.com",
  "speedcurve.com",
  "splunkcloud.com",
  "spotx.tv",
  "springserve.com",
  "statcounter.com",
  "stackadapt.com",
  "sumo.com",
  "supership.jp",
  "taboolasyndication.com",
  "tapad.com",
  "tealiumiq.com",
  "technoratimedia.com",
  "tinypass.com",
  "tremorhub.com",
  "triplelift.com",
  "trustpilot.com/evaluate-bgcolor",
  "turn.com",
  "tynt.com",
  "undertone.com",
  "unrulymedia.com",
  "usabilla.com",
  "userreport.com",
  "vidoomy.com",
  "viglink.com",
  "vntsm.com",
  "wt-safetag.com",
  "yieldlab.net",
  "yieldoptimizer.com",
  "yotpo.com",
  "zemanta.com",
  "zencdn.net",
  "zeotap.com",
  "zqtk.net"
])]);

function ownRecord(value, label, maximum = 16) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const result = Object.create(null);
  let count = 0;
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== "string" || ["__proto__", "prototype", "constructor"].includes(key)) {
      throw new TypeError(`${label} contains an unsafe property.`);
    }
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`${label}.${key} must be an own enumerable data property.`);
    }
    count += 1;
    if (count > maximum) throw new TypeError(`${label} exceeds its ${maximum}-property limit.`);
    result[key] = descriptor.value;
  }
  return result;
}

function normalizeResourceList(value, label) {
  if (value === undefined) return null;
  if (typeof value === "string") {
    const preset = PRESETS[value];
    if (!preset) {
      throw new TypeError(`${label} must be one of: ${Object.keys(PRESETS).join(", ")}, or an array.`);
    }
    return [...preset];
  }
  if (!Array.isArray(value)) throw new TypeError(`${label} must be a preset name or an array.`);
  if (value.length > RESOURCE_TYPES.length) throw new TypeError(`${label} exceeds its entry limit.`);
  return value.map((entry) => {
    if (!RESOURCE_TYPES.includes(entry)) {
      throw new TypeError(`${label} contains unknown resource type '${entry}'.`);
    }
    if (entry === "document") throw new TypeError(`${label} must not block 'document'.`);
    return entry;
  });
}

function normalizeDomainList(value, label) {
  if (value === undefined) return [];
  const list = Array.isArray(value) ? value : [value];
  if (list.length > 5_000) throw new TypeError(`${label} exceeds its 5000-entry limit.`);
  return list.map((entry) => {
    const text = String(entry ?? "").trim().toLowerCase();
    if (!text || text.length > 253 || /[\s/\\]/u.test(text.replace(/\/.*$/u, ""))) {
      throw new TypeError(`${label} entries must be hostnames or hostname/path prefixes.`);
    }
    return text.replace(/^\./u, "");
  });
}

export function normalizeRequestPolicy(value = {}) {
  if (value === false || value === undefined || value === null) {
    return Object.freeze({
      blockResources: Object.freeze([]),
      blockDomains: Object.freeze([]),
      blockTrackers: false,
      allowDomains: Object.freeze([])
    });
  }
  const settings = ownRecord(value, "requestPolicy", 8);
  const unknown = Object.keys(settings).filter(
    (key) => !["blockResources", "blockDomains", "blockTrackers", "allowDomains"].includes(key)
  );
  if (unknown.length) throw new TypeError(`Unknown requestPolicy option(s): ${unknown.join(", ")}.`);

  if (settings.blockTrackers !== undefined && typeof settings.blockTrackers !== "boolean") {
    throw new TypeError("requestPolicy.blockTrackers must be a boolean.");
  }

  return Object.freeze({
    blockResources: Object.freeze(normalizeResourceList(settings.blockResources, "requestPolicy.blockResources") ?? []),
    blockDomains: Object.freeze(normalizeDomainList(settings.blockDomains, "requestPolicy.blockDomains")),
    allowDomains: Object.freeze(normalizeDomainList(settings.allowDomains, "requestPolicy.allowDomains")),
    blockTrackers: settings.blockTrackers === true
  });
}

function hostMatches(candidate, pattern) {
  if (pattern.includes("/")) {
    const [host, ...rest] = pattern.split("/");
    const prefix = `/${rest.join("/")}`;
    return (candidate.hostname === host || candidate.hostname.endsWith(`.${host}`))
      && candidate.pathname.startsWith(prefix);
  }
  return candidate.hostname === pattern || candidate.hostname.endsWith(`.${pattern}`);
}

export function shouldBlockRequest(url, resourceType, policy) {
  const resolved = policy?.blockResources ? policy : normalizeRequestPolicy(policy);
  let target;
  try {
    target = url instanceof URL ? url : new URL(String(url));
  } catch {
    return null;
  }

  if (resolved.allowDomains.some((pattern) => hostMatches(target, pattern))) return null;

  if (resourceType && resolved.blockResources.includes(resourceType)) {
    return { blocked: true, reason: "resource-type", detail: resourceType };
  }

  const domainHit = resolved.blockDomains.find((pattern) => hostMatches(target, pattern));
  if (domainHit) return { blocked: true, reason: "blocked-domain", detail: domainHit };

  if (resolved.blockTrackers) {
    const trackerHit = TRACKER_DOMAINS.find((pattern) => hostMatches(target, pattern));
    if (trackerHit) return { blocked: true, reason: "tracker", detail: trackerHit };
  }

  return null;
}

export const requestPolicyDefaults = Object.freeze({
  resourceTypes: RESOURCE_TYPES,
  presets: Object.freeze(Object.keys(PRESETS)),
  trackerDomainCount: TRACKER_DOMAINS.length,
  trackerDomains: TRACKER_DOMAINS
});
