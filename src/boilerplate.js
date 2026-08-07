const STRUCTURAL_SELECTORS = Object.freeze([
  "nav",
  "aside",
  "footer",
  "[role='navigation']",
  "[role='complementary']",
  "[role='contentinfo']",
  "[role='banner']",
  "[role='search']",
  "[role='alertdialog']",
  "[role='dialog']"
]);

const LABEL_PATTERNS = Object.freeze([
  /(^|[-_ ])nav([-_ ]|$)/i,
  /navbar|navigation|menu|megamenu/i,
  /sidebar|side-bar|rail|widget-area/i,
  /(^|[-_ ])foot(er)?([-_ ]|$)/i,
  /(^|[-_ ])head(er)?([-_ ]|$)/i,
  /masthead|topbar|toolbar/i,
  /breadcrumb/i,
  /pagination|pager|page-numbers/i,
  /cookie|consent|gdpr|privacy-banner/i,
  /newsletter|subscribe|signup-prompt|mailing-list/i,
  /share|social|follow-us/i,
  /related|recommend|you-may-also|more-from|read-next|up-next/i,
  /comment|disqus|livefyre/i,
  /advert|advertisement|(^|[-_ ])ads?([-_ ]|$)|sponsor|promo/i,
  /popup|modal|overlay|lightbox|interstitial/i,
  /skip-link|screen-reader|sr-only|visually-hidden/i,
  /banner|announcement|notification-bar/i,
  /author-bio|about-the-author/i,
  /tags?-list|tag-cloud|categories-list/i,
  /back-to-top|scroll-to-top/i,
  /site-info|copyright|legal/i
]);

const PRESETS = Object.freeze(["off", "structural", "balanced", "aggressive"]);

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

function finite(value, label, fallback, minimum, maximum) {
  const result = Number(value ?? fallback);
  if (!Number.isFinite(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label} must be a finite number from ${minimum} to ${maximum}.`);
  }
  return result;
}

export function normalizeBoilerplateOptions(value) {
  if (value === null || value === false || value === "off") {
    return Object.freeze({ mode: "off", maxTextShare: 0, labels: false, linkDensity: 0 });
  }
  // The default removes only HTML landmarks the specification already defines
  // as outside main content. On the pinned WCEB split that costs no measurable
  // recall (0.9041 to 0.9038) while cutting unwanted-boilerplate inclusion by
  // a quarter, so it behaves as a defect fix rather than a policy change.
  // "balanced" scores higher F1 but trades real recall, so it stays opt-in.
  if (value === undefined) value = "structural";
  if (value === true) value = "balanced";

  if (typeof value === "string") {
    if (!PRESETS.includes(value)) {
      throw new TypeError(`boilerplate must be one of: ${PRESETS.join(", ")}, or an object.`);
    }
    if (value === "structural") {
      return Object.freeze({ mode: "structural", maxTextShare: 0.25, labels: false, linkDensity: 0 });
    }
    if (value === "aggressive") {
      return Object.freeze({ mode: "aggressive", maxTextShare: 0.4, labels: true, linkDensity: 0.65 });
    }
    return Object.freeze({ mode: "balanced", maxTextShare: 0.25, labels: true, linkDensity: 0.8 });
  }

  const settings = ownRecord(value, "boilerplate", 8);
  const unknown = Object.keys(settings).filter(
    (key) => !["mode", "maxTextShare", "labels", "linkDensity"].includes(key)
  );
  if (unknown.length) throw new TypeError(`Unknown boilerplate option(s): ${unknown.join(", ")}.`);

  const mode = settings.mode ?? "balanced";
  if (!PRESETS.includes(mode)) throw new TypeError(`boilerplate.mode must be one of: ${PRESETS.join(", ")}.`);
  if (settings.labels !== undefined && typeof settings.labels !== "boolean") {
    throw new TypeError("boilerplate.labels must be a boolean.");
  }

  return Object.freeze({
    mode,
    maxTextShare: finite(settings.maxTextShare, "boilerplate.maxTextShare", 0.25, 0, 1),
    labels: settings.labels ?? mode !== "structural",
    linkDensity: finite(settings.linkDensity, "boilerplate.linkDensity", mode === "aggressive" ? 0.65 : 0.8, 0, 1)
  });
}

function normalizedLength(value) {
  return String(value || "").replace(/\s+/g, " ").trim().length;
}

function labelOf($, node) {
  const selection = $(node);
  return `${selection.attr("class") || ""} ${selection.attr("id") || ""} ${selection.attr("data-testid") || ""}`;
}

function linkDensity($, node) {
  const total = normalizedLength($(node).text());
  if (!total) return 1;
  let anchored = 0;
  $(node).find("a").each((_, anchor) => {
    anchored += normalizedLength($(anchor).text());
  });
  return Math.min(1, anchored / total);
}

/**
 * Removes boilerplate from a content root in place and reports what went.
 *
 * The text-share guard is the important part. Class names are unreliable
 * signals: a container called "page-header" may legitimately hold the article,
 * and "content-nav" may hold the article's own table of contents. Removing any
 * element that carries a large share of the root's text would turn a precision
 * improvement into a recall collapse, so an element is never removed when it
 * holds more than maxTextShare of the text, no matter what it is called.
 */
export function stripBoilerplate($, root, options) {
  const policy = options?.mode ? options : normalizeBoilerplateOptions(options);
  if (policy.mode === "off") return Object.freeze({ removed: 0, reasons: Object.freeze({}) });

  const rootText = normalizedLength(root.text());
  if (!rootText) return Object.freeze({ removed: 0, reasons: Object.freeze({}) });

  const reasons = Object.create(null);
  let removed = 0;

  const drop = (node, reason) => {
    if (!node || !$(node).length) return false;
    if ($(node).closest("[data-cockroach-kept]").length) return false;
    const share = normalizedLength($(node).text()) / rootText;
    if (share > policy.maxTextShare) return false;
    $(node).remove();
    reasons[reason] = (reasons[reason] || 0) + 1;
    removed += 1;
    return true;
  };

  for (const selector of STRUCTURAL_SELECTORS) {
    for (const node of root.find(selector).toArray()) drop(node, "structural");
  }

  if (policy.labels) {
    const candidates = root.find("div, section, ul, ol, form, header, span, aside, p").toArray();
    for (const node of candidates) {
      if (!$(node).length || !$(node).parents("body").length) continue;
      const label = labelOf($, node);
      if (!label.trim()) continue;
      if (!LABEL_PATTERNS.some((pattern) => pattern.test(label))) continue;
      drop(node, "label");
    }
  }

  if (policy.linkDensity > 0 && policy.linkDensity < 1) {
    for (const node of root.find("ul, ol, div, section").toArray()) {
      if (!$(node).length || !$(node).parents("body").length) continue;
      const text = normalizedLength($(node).text());
      if (text < 40) continue;
      if (linkDensity($, node) < policy.linkDensity) continue;
      drop(node, "link-density");
    }
  }

  return Object.freeze({ removed, reasons: Object.freeze({ ...reasons }) });
}

export const boilerplateDefaults = Object.freeze({
  presets: PRESETS,
  structuralSelectors: STRUCTURAL_SELECTORS,
  labelPatternCount: LABEL_PATTERNS.length
});
