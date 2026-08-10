import { createHash } from "node:crypto";
import { browserAutomationFail } from "./errors.js";

export function unsupported(kind, detail) {
  browserAutomationFail(
    "BROWSER_AUTOMATION_ENGINE_UNSUPPORTED",
    `The active browser engine cannot safely perform '${kind}'${detail ? `: ${detail}` : "."}`
  );
}

export function requiredMethod(target, name, kind) {
  const candidate = target?.[name];
  if (typeof candidate !== "function") unsupported(kind, `missing engine method ${name}`);
  return candidate.bind(target);
}

export function optionalMethod(target, name) {
  const candidate = target?.[name];
  return typeof candidate === "function" ? candidate.bind(target) : null;
}

export function activePage(session, kind) {
  if (!session.activePage) unsupported(kind, "the governed session has no active page");
  return session.activePage;
}

export function activeTarget(session, kind) {
  return session.activeFrame ?? activePage(session, kind);
}

export function locator(session, selector, kind) {
  return requiredMethod(activeTarget(session, kind), "locator", kind)(selector);
}

export function frame(session, frameId, kind) {
  const selected = session.frames.get(frameId);
  if (!selected) unsupported(kind, `unknown governed frame '${frameId}'`);
  return selected;
}

export function worker(session, workerId, kind) {
  const selected = session.workers.get(workerId);
  if (!selected) unsupported(kind, `unknown governed worker '${workerId}'`);
  return selected;
}

export function pageId(session, page) {
  let id = session.pageIds.get(page);
  if (!id) {
    id = `page-${session.nextPageId++}`;
    session.pageIds.set(page, id);
    session.pages.set(id, page);
  }
  return id;
}

export function frameId(session, value) {
  let id = session.frameIds.get(value);
  if (!id) {
    id = `frame-${session.nextFrameId++}`;
    session.frameIds.set(value, id);
    session.frames.set(id, value);
  }
  return id;
}

export function workerId(session, value) {
  let id = session.workerIds.get(value);
  if (!id) {
    id = `worker-${session.nextWorkerId++}`;
    session.workerIds.set(value, id);
    session.workers.set(id, value);
  }
  return id;
}

export function safeUrl(value) {
  try {
    const parsed = new URL(String(value));
    parsed.username = "";
    parsed.password = "";
    for (const key of [...parsed.searchParams.keys()]) parsed.searchParams.set(key, "[redacted]");
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "";
  }
}

export function plainResponse(response) {
  return Object.freeze({
    url: safeUrl(optionalMethod(response, "url")?.() ?? ""),
    status: optionalMethod(response, "status")?.() ?? null,
    ok: optionalMethod(response, "ok")?.() ?? null
  });
}

export async function toBuffer(value, kind, maximumBytes = Number.MAX_SAFE_INTEGER) {
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    const bytes = Buffer.from(value);
    if (bytes.length > maximumBytes) {
      browserAutomationFail("BROWSER_AUTOMATION_ARTIFACT_LIMIT", `Artifact for '${kind}' exceeded its authorized byte limit.`);
    }
    return bytes;
  }
  if (value && typeof value[Symbol.asyncIterator] === "function") {
    const chunks = [];
    let total = 0;
    for await (const chunk of value) {
      const bytes = Buffer.from(chunk);
      total += bytes.length;
      if (total > maximumBytes) {
        if (typeof value.destroy === "function") value.destroy();
        browserAutomationFail("BROWSER_AUTOMATION_ARTIFACT_LIMIT", `Artifact for '${kind}' exceeded its authorized byte limit.`);
      }
      chunks.push(bytes);
    }
    return Buffer.concat(chunks);
  }
  unsupported(kind, "engine artifact was not bytes or a byte stream");
}

export async function persistArtifact(session, action, bytes) {
  if (bytes.length > action.maxBytes) {
    browserAutomationFail("BROWSER_AUTOMATION_ARTIFACT_LIMIT", `Artifact '${action.artifactName}' exceeded its authorized byte limit.`);
  }
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  await session.services.saveArtifact(serviceInput(session, {
    sessionId: session.publicSessionId,
    name: action.artifactName,
    bytes,
    sha256,
    kind: action.kind
  }));
  return Object.freeze({ name: action.artifactName, bytes: bytes.length, sha256 });
}

export function serializeValue(value) {
  if (value === undefined) return null;
  return value;
}

export function engineActionResult(data, artifact) {
  return Object.freeze({ data: data ?? null, ...(artifact ? { artifact } : {}) });
}

export function serviceInput(session, input) {
  return Object.freeze({
    ...input,
    signal: session.actionSignal,
    deadline: session.actionDeadline
  });
}
