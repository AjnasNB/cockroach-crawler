const STATUS_LABELS = Object.freeze({
  ready: "READY",
  partial: "PARTIAL",
  missing_credentials: "MISSING CREDENTIALS",
  unavailable: "UNAVAILABLE"
});

const STATUS_COLORS = Object.freeze({
  ready: "\u001b[32m",
  partial: "\u001b[33m",
  missing_credentials: "\u001b[33m",
  unavailable: "\u001b[31m"
});

export function sourceStatusColorEnabled(stream = process.stdout, env = process.env) {
  if (Object.hasOwn(env, "NO_COLOR")) return false;
  if (env.FORCE_COLOR === "0") return false;
  if (env.FORCE_COLOR && env.FORCE_COLOR !== "0") return true;
  return stream?.isTTY === true;
}

export function formatSourceStatusLine(item, { color = false } = {}) {
  const label = STATUS_LABELS[item?.status];
  if (!label) throw new TypeError(`Unknown source status '${item?.status}'.`);
  const padded = label.padEnd(19);
  const visibleStatus = color ? `${STATUS_COLORS[item.status]}${padded}\u001b[0m` : padded;
  return `${String(item.id).padEnd(8)} [${visibleStatus}] ${String(item.message)}`;
}
