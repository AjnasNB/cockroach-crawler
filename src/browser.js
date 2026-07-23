import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function integer(value, label, fallback, minimum, maximum) {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label} must be a safe integer from ${minimum} to ${maximum}.`);
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

function timeout(promise, timeoutMs, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} exceeded ${timeoutMs}ms.`)), timeoutMs);
    })
  ]).finally(() => clearTimeout(timer));
}

export function normalizeScrollOptions(value = {}) {
  if (value === true) value = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("scroll must be true or an object.");
  }
  const allowed = new Set(["maxSteps", "stepPixels", "delayMs", "stableIterations"]);
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) throw new TypeError(`Unknown scroll option(s): ${unknown.join(", ")}.`);
  return Object.freeze({
    maxSteps: integer(value.maxSteps, "scroll.maxSteps", 20, 1, 200),
    stepPixels: integer(value.stepPixels, "scroll.stepPixels", 800, 1, 10_000),
    delayMs: integer(value.delayMs, "scroll.delayMs", 100, 0, 10_000),
    stableIterations: integer(value.stableIterations, "scroll.stableIterations", 3, 1, 20)
  });
}

export async function scrollPage(page, value = {}) {
  const options = normalizeScrollOptions(value);
  let stable = 0;
  let previous = -1;
  let steps = 0;
  for (; steps < options.maxSteps && stable < options.stableIterations; steps += 1) {
    const state = await page.evaluate(({ stepPixels }) => {
      const before = Math.max(
        document.documentElement?.scrollHeight || 0,
        document.body?.scrollHeight || 0
      );
      window.scrollBy(0, stepPixels);
      for (const element of document.querySelectorAll("*")) {
        const style = getComputedStyle(element);
        if (
          ["auto", "scroll"].includes(style.overflowY)
          && element.scrollHeight > element.clientHeight
        ) {
          element.scrollTop = Math.min(element.scrollHeight, element.scrollTop + stepPixels);
        }
      }
      const after = Math.max(
        document.documentElement?.scrollHeight || 0,
        document.body?.scrollHeight || 0
      );
      return { before, after, y: window.scrollY };
    }, { stepPixels: options.stepPixels });
    stable = state.after === previous || state.after === state.before ? stable + 1 : 0;
    previous = state.after;
    if (options.delayMs) await page.waitForTimeout(options.delayMs);
  }
  return { steps, stableIterations: stable, finalHeight: Math.max(0, previous) };
}

export async function flattenPageDom(page, options = {}) {
  const shadowDom = options.shadowDom === true;
  const iframes = options.iframes === true;
  const maxRoots = integer(options.maxRoots, "flatten.maxRoots", 100, 1, 2_000);
  const maxFrames = integer(options.maxFrames, "flatten.maxFrames", 32, 1, 256);
  const maxClonedNodes = integer(options.maxClonedNodes, "flatten.maxClonedNodes", 20_000, 1, 200_000);
  return page.evaluate(({ shadowDom, iframes, maxRoots, maxFrames, maxClonedNodes }) => {
    let roots = 0;
    let frames = 0;
    let clonedNodes = 0;
    const warnings = [];

    const countNodes = (node) => {
      try {
        if (!document.createTreeWalker(node, NodeFilter.SHOW_ALL).nextNode()) return 1;
        return typeof node.querySelectorAll === "function"
          ? node.querySelectorAll("*").length + 1
          : 1;
      } catch {
        return 1;
      }
    };

    if (shadowDom) {
      for (const host of document.querySelectorAll("*")) {
        if (!host.shadowRoot || roots >= maxRoots || clonedNodes >= maxClonedNodes) continue;
        const container = document.createElement("section");
        container.setAttribute("data-cockroach-shadow-root", "open");
        for (const child of host.shadowRoot.childNodes) {
          const clone = child.cloneNode(true);
          const count = countNodes(clone);
          if (clonedNodes + count > maxClonedNodes) {
            warnings.push("Shadow DOM flattening reached maxClonedNodes.");
            break;
          }
          container.appendChild(clone);
          clonedNodes += count;
        }
        host.appendChild(container);
        roots += 1;
      }
      if (roots >= maxRoots) warnings.push("Shadow DOM flattening reached maxRoots.");
    }

    if (iframes) {
      for (const iframe of document.querySelectorAll("iframe")) {
        if (frames >= maxFrames || clonedNodes >= maxClonedNodes) break;
        try {
          const source = iframe.contentDocument?.body;
          if (!source) {
            warnings.push("An iframe could not be flattened because its DOM was unavailable.");
            continue;
          }
          const clone = source.cloneNode(true);
          const count = countNodes(clone);
          if (clonedNodes + count > maxClonedNodes) {
            warnings.push("Iframe flattening reached maxClonedNodes.");
            break;
          }
          const container = document.createElement("section");
          container.setAttribute("data-cockroach-iframe", iframe.src || "inline");
          container.appendChild(clone);
          iframe.insertAdjacentElement("afterend", container);
          frames += 1;
          clonedNodes += count;
        } catch {
          warnings.push("A cross-origin or detached iframe could not be flattened.");
        }
      }
      if (frames >= maxFrames) warnings.push("Iframe flattening reached maxFrames.");
    }
    return { shadowRoots: roots, frames, clonedNodes, warnings };
  }, { shadowDom, iframes, maxRoots, maxFrames, maxClonedNodes });
}

export async function runPageHooks(page, hooks, options = {}) {
  if (!Array.isArray(hooks)) throw new TypeError("hooks must be an array of trusted functions.");
  const maxHooks = integer(options.maxHooks, "maxHooks", 10, 0, 50);
  const timeoutMs = integer(options.timeoutMs, "timeoutMs", 5_000, 1, 120_000);
  const maxResultCharacters = integer(
    options.maxResultCharacters,
    "maxResultCharacters",
    32_768,
    2,
    1_000_000
  );
  if (hooks.length > maxHooks) throw new RangeError(`hooks exceeds maxHooks (${hooks.length} > ${maxHooks}).`);
  const results = [];
  for (let index = 0; index < hooks.length; index += 1) {
    const hook = hooks[index];
    if (typeof hook !== "function") throw new TypeError(`hooks[${index}] must be a trusted function.`);
    const result = await timeout(
      page.evaluate(hook, Object.freeze({ index })),
      timeoutMs,
      `hooks[${index}]`
    );
    const serialized = JSON.stringify(result);
    if (serialized !== undefined && serialized.length > maxResultCharacters) {
      throw new RangeError(`hooks[${index}] result exceeds maxResultCharacters.`);
    }
    results.push(result === undefined ? null : structuredClone(result));
  }
  return results;
}

function artifactName(url, extension) {
  const digest = createHash("sha256").update(url).digest("hex").slice(0, 24);
  return `${digest}.${extension}`;
}

async function persistArtifact(directory, filename, bytes, maximum) {
  if (bytes.byteLength > maximum) {
    throw new RangeError(`Browser artifact exceeds maxArtifactBytes (${bytes.byteLength} > ${maximum}).`);
  }
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const target = path.join(directory, filename);
  await writeFile(target, bytes, { mode: 0o600 });
  return {
    path: target,
    bytes: bytes.byteLength,
    contentHash: `sha256:${createHash("sha256").update(bytes).digest("hex")}`
  };
}

export async function capturePageArtifacts(page, url, options = {}) {
  const directory = path.resolve(options.directory || ".cockroach-artifacts");
  const maxArtifactBytes = integer(
    options.maxArtifactBytes,
    "maxArtifactBytes",
    25 * 1024 * 1024,
    1_024,
    100 * 1024 * 1024
  );
  const result = Object.create(null);
  if (options.screenshot) {
    const screenshot = options.screenshot === true ? {} : options.screenshot;
    if (!screenshot || typeof screenshot !== "object" || Array.isArray(screenshot)) {
      throw new TypeError("screenshot must be true or an object.");
    }
    const format = screenshot.format ?? "png";
    if (!["png", "jpeg"].includes(format)) throw new TypeError("screenshot.format must be png or jpeg.");
    const quality = format === "jpeg"
      ? integer(screenshot.quality, "screenshot.quality", 85, 1, 100)
      : undefined;
    const bytes = await page.screenshot({
      type: format,
      fullPage: screenshot.fullPage !== false,
      quality,
      animations: "disabled"
    });
    result.screenshot = await persistArtifact(
      directory,
      artifactName(url, format === "jpeg" ? "jpg" : "png"),
      bytes,
      maxArtifactBytes
    );
    result.screenshot.mediaType = format === "jpeg" ? "image/jpeg" : "image/png";
  }
  if (options.pdf) {
    const pdf = options.pdf === true ? {} : options.pdf;
    if (!pdf || typeof pdf !== "object" || Array.isArray(pdf)) {
      throw new TypeError("pdf must be true or an object.");
    }
    const bytes = await page.pdf({
      format: typeof pdf.format === "string" ? pdf.format : "A4",
      landscape: pdf.landscape === true,
      printBackground: pdf.printBackground !== false,
      preferCSSPageSize: pdf.preferCSSPageSize === true
    });
    result.pdf = await persistArtifact(
      directory,
      artifactName(url, "pdf"),
      bytes,
      maxArtifactBytes
    );
    result.pdf.mediaType = "application/pdf";
  }
  return result;
}
