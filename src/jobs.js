import { randomUUID } from "node:crypto";

function integer(value, label, fallback, minimum, maximum) {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label} must be a safe integer from ${minimum} to ${maximum}.`);
  }
  return result;
}

function publicJob(job, includeResult = true) {
  return structuredClone({
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    ...(includeResult && job.status === "succeeded" ? { result: job.result } : {}),
    ...(job.error ? { error: job.error } : {})
  });
}

export function createBoundedJobQueue(options = {}) {
  if (typeof options.execute !== "function") {
    throw new TypeError("execute must be a trusted host function.");
  }
  const concurrency = integer(options.concurrency, "concurrency", 2, 1, 64);
  const maxPending = integer(options.maxPending, "maxPending", 100, 1, 10_000);
  const maxRetained = integer(options.maxRetained, "maxRetained", 1_000, 1, 100_000);
  const maxResultBytes = integer(
    options.maxResultBytes,
    "maxResultBytes",
    20_000_000,
    1_024,
    100_000_000
  );
  const jobs = new Map();
  const pending = [];
  let active = 0;
  let closed = false;

  const trim = () => {
    const completed = [...jobs.values()]
      .filter((job) => ["succeeded", "failed", "cancelled"].includes(job.status))
      .sort((left, right) => left.finishedAt.localeCompare(right.finishedAt));
    while (completed.length > maxRetained) {
      jobs.delete(completed.shift().id);
    }
  };

  const run = async (job) => {
    active += 1;
    job.status = "running";
    job.startedAt = new Date().toISOString();
    try {
      const result = await options.execute(structuredClone(job.input), {
        id: job.id,
        signal: job.controller.signal
      });
      const serialized = JSON.stringify(result);
      if (serialized === undefined || Buffer.byteLength(serialized) > maxResultBytes) {
        const error = new RangeError(`Job result exceeds maxResultBytes (${maxResultBytes}).`);
        error.code = "JOB_RESULT_LIMIT";
        throw error;
      }
      if (job.controller.signal.aborted) {
        job.status = "cancelled";
      } else {
        job.result = structuredClone(result);
        job.status = "succeeded";
      }
    } catch (error) {
      if (job.controller.signal.aborted) {
        job.status = "cancelled";
      } else {
        job.status = "failed";
        job.error = {
          code: error?.code || "JOB_FAILED",
          message: String(error?.message || error).slice(0, 2_048)
        };
      }
    } finally {
      job.finishedAt = new Date().toISOString();
      active -= 1;
      trim();
      pump();
    }
  };

  const pump = () => {
    while (!closed && active < concurrency && pending.length) {
      const job = pending.shift();
      if (job.status !== "queued") continue;
      void run(job);
    }
  };

  return Object.freeze({
    submit(input) {
      if (closed) throw new Error("Job queue is closed.");
      if (pending.length + active >= maxPending) {
        const error = new Error(`Job queue reached maxPending (${maxPending}).`);
        error.code = "JOB_QUEUE_FULL";
        error.status = 429;
        throw error;
      }
      const now = new Date().toISOString();
      const job = {
        id: randomUUID(),
        input: structuredClone(input),
        status: "queued",
        createdAt: now,
        startedAt: null,
        finishedAt: null,
        result: undefined,
        error: null,
        controller: new AbortController()
      };
      jobs.set(job.id, job);
      pending.push(job);
      queueMicrotask(pump);
      return publicJob(job, false);
    },
    get(id) {
      const job = jobs.get(id);
      return job ? publicJob(job) : null;
    },
    cancel(id) {
      const job = jobs.get(id);
      if (!job || ["succeeded", "failed", "cancelled"].includes(job.status)) return false;
      job.controller.abort(new Error("Job cancelled by operator."));
      if (job.status === "queued") {
        job.status = "cancelled";
        job.finishedAt = new Date().toISOString();
      }
      return true;
    },
    stats() {
      const counts = { queued: 0, running: 0, succeeded: 0, failed: 0, cancelled: 0 };
      for (const job of jobs.values()) counts[job.status] += 1;
      return { ...counts, concurrency, maxPending, maxRetained, maxResultBytes };
    },
    close() {
      closed = true;
      for (const job of jobs.values()) {
        if (["queued", "running"].includes(job.status)) {
          job.controller.abort(new Error("Job queue closed."));
          if (job.status === "queued") {
            job.status = "cancelled";
            job.finishedAt = new Date().toISOString();
          }
        }
      }
    }
  });
}
