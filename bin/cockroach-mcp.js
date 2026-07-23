#!/usr/bin/env node
import { connectCockroachStdio } from "../src/mcp.js";

function parseOrigins(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const allowedOrigins = parseOrigins(process.env.COCKROACH_ALLOWED_ORIGINS);
if (!allowedOrigins.length) {
  process.stderr.write(
    "COCKROACH_ALLOWED_ORIGINS must contain at least one comma-separated origin before MCP starts.\n"
  );
  process.exit(1);
}

await connectCockroachStdio({
  crawlDefaults: {
    allowedOrigins,
    sameOrigin: true,
    maxPages: Number(process.env.COCKROACH_MAX_PAGES || 20),
    maxDepth: Number(process.env.COCKROACH_MAX_DEPTH || 2),
    maxRequests: Number(process.env.COCKROACH_MAX_REQUESTS || 100),
    maxDurationMs: Number(process.env.COCKROACH_MAX_DURATION_MS || 120_000)
  }
});
