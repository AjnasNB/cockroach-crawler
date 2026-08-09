import {
  activePage,
  engineActionResult,
  locator,
  persistArtifact,
  requiredMethod,
  serviceInput,
  toBuffer
} from "./engine-helpers.js";
import { browserAutomationFail } from "./errors.js";

export const fileHandlers = Object.freeze({
  upload: async (session, action) => {
    const files = await session.services.resolveFileRefs(serviceInput(session, {
      sessionId: session.publicSessionId,
      fileRefs: action.fileRefs
    }));
    if (!Array.isArray(files) || files.length !== action.fileRefs.length) {
      throw new TypeError("Trusted upload resolver must return one file payload for every reference.");
    }
    let totalBytes = 0;
    const payloads = files.map((file, index) => {
      if (!file || typeof file !== "object" || Array.isArray(file)
        || typeof file.ref !== "string"
        || typeof file.name !== "string" || !file.name || file.name.length > 255 || file.name.includes("/") || file.name.includes("\\")
        || typeof file.mimeType !== "string" || file.mimeType.length > 255
        || (!Buffer.isBuffer(file.buffer) && !(file.buffer instanceof Uint8Array))) {
        throw new TypeError(`Trusted upload resolver entry ${index} must be a bounded in-memory file payload.`);
      }
      const buffer = Buffer.from(file.buffer);
      totalBytes += buffer.length;
      if (buffer.length > action.maxFileBytes) browserAutomationFail("BROWSER_AUTOMATION_UPLOAD_LIMIT", "Trusted upload payload exceeds the authorized per-file byte limit.");
      if (totalBytes > action.maxBytes) browserAutomationFail("BROWSER_AUTOMATION_UPLOAD_LIMIT", "Trusted upload payloads exceed the authorized aggregate byte limit.");
      if (file.ref !== action.fileRefs[index]) browserAutomationFail("BROWSER_AUTOMATION_UPLOAD_REF_MISMATCH", "Trusted upload resolver changed file reference identity or order.");
      return Object.freeze({ name: file.name, mimeType: file.mimeType, buffer });
    });
    await requiredMethod(locator(session, action.selector, action.kind), "setInputFiles", action.kind)(payloads, {
      timeout: action.timeoutMs
    });
    return engineActionResult({ acceptedFileRefs: action.fileRefs.length });
  },
  "dialog.wait": async (session, action) => {
    const dialog = session.pendingDialog;
    return engineActionResult({
      type: requiredMethod(dialog, "type", action.kind)(),
      message: requiredMethod(dialog, "message", action.kind)(),
      defaultValue: requiredMethod(dialog, "defaultValue", action.kind)()
    });
  },
  "dialog.accept": async (session, action) => {
    const dialog = session.pendingDialog;
    if (!dialog) return engineActionResult({ accepted: false, reason: "no-pending-dialog" });
    await requiredMethod(dialog, "accept", action.kind)(action.promptText);
    session.pendingDialog = null;
    return engineActionResult({ accepted: true });
  },
  "dialog.dismiss": async (session, action) => {
    const dialog = session.pendingDialog;
    if (!dialog) return engineActionResult({ dismissed: false, reason: "no-pending-dialog" });
    await requiredMethod(dialog, "dismiss", action.kind)();
    session.pendingDialog = null;
    return engineActionResult({ dismissed: true });
  },
  screenshot: async (session, action) => {
    const target = action.selector ? locator(session, action.selector, action.kind) : activePage(session, action.kind);
    const dimensions = action.selector
      ? await requiredMethod(target, "boundingBox", action.kind)()
      : await requiredMethod(activePage(session, action.kind), "evaluate", action.kind)(() => ({
        width: Math.max(document.documentElement.scrollWidth, innerWidth),
        height: Math.max(document.documentElement.scrollHeight, innerHeight)
      }));
    if (!dimensions || dimensions.width * dimensions.height > 20_000_000) {
      browserAutomationFail("BROWSER_AUTOMATION_ARTIFACT_LIMIT", "Screenshot dimensions exceed the governed 20-megapixel ceiling.");
    }
    const bytes = await toBuffer(await requiredMethod(target, "screenshot", action.kind)({
      type: action.format,
      quality: action.quality,
      fullPage: action.selector ? undefined : action.fullPage
    }), action.kind, action.maxBytes);
    const artifact = await persistArtifact(session, action, bytes);
    return engineActionResult({ captured: true }, artifact);
  },
  pdf: async (session, action) => {
    const bytes = await toBuffer(await requiredMethod(activePage(session, action.kind), "pdf", action.kind)({
      format: action.format,
      landscape: action.landscape,
      printBackground: true,
      pageRanges: "1-50"
    }), action.kind, action.maxBytes);
    const artifact = await persistArtifact(session, action, bytes);
    return engineActionResult({ captured: true }, artifact);
  },
  "capture.paired": async (session, action) => {
    const page = activePage(session, action.kind);
    const bounds = await requiredMethod(page, "evaluate", action.kind)(() => ({
      width: Math.max(document.documentElement.scrollWidth, innerWidth),
      height: Math.max(document.documentElement.scrollHeight, innerHeight),
      htmlChars: document.documentElement.outerHTML.length
    }));
    if (bounds.width * bounds.height > 20_000_000 || bounds.htmlChars > Math.floor(action.maxBytes / 4)) {
      browserAutomationFail("BROWSER_AUTOMATION_ARTIFACT_LIMIT", "Paired capture exceeds its governed dimension or document ceiling.");
    }
    const image = await toBuffer(await requiredMethod(page, "screenshot", action.kind)({ fullPage: true }), action.kind, action.maxBytes);
    const snapshot = await requiredMethod(page, "content", action.kind)();
    const separator = Buffer.from("\n---DOCUMENT---\n");
    const document = Buffer.from(snapshot);
    if (image.length + separator.length + document.length > action.maxBytes) {
      throw new TypeError("Paired capture exceeds the authorized aggregate byte limit.");
    }
    const bytes = Buffer.concat([image, separator, document], image.length + separator.length + document.length);
    const artifact = await persistArtifact(session, action, bytes);
    return engineActionResult({ imageBytes: image.length, documentBytes: Buffer.byteLength(snapshot) }, artifact);
  }
});
