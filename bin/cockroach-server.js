#!/usr/bin/env node
import { startCrawlerApi } from "../src/server.js";

function parseOrigins(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const token = process.env.COCKROACH_API_TOKEN;
const host = process.env.COCKROACH_HOST || "0.0.0.0";
const port = Number(process.env.COCKROACH_PORT || 3_878);
const allowedOrigins = parseOrigins(process.env.COCKROACH_ALLOWED_ORIGINS);

if (!token) {
  process.stderr.write("COCKROACH_API_TOKEN is required.\n");
  process.exit(1);
}
if (!allowedOrigins.length) {
  process.stderr.write("COCKROACH_ALLOWED_ORIGINS must contain at least one comma-separated origin.\n");
  process.exit(1);
}

const api = await startCrawlerApi({
  token,
  host,
  port,
  crawlDefaults: {
    allowedOrigins,
    sameOrigin: true,
    maxPages: Number(process.env.COCKROACH_MAX_PAGES || 20),
    maxDepth: Number(process.env.COCKROACH_MAX_DEPTH || 2),
    maxRequests: Number(process.env.COCKROACH_MAX_REQUESTS || 100),
    maxDurationMs: Number(process.env.COCKROACH_MAX_DURATION_MS || 120_000)
  }
});

process.stdout.write(`Cockroach Crawler API listening at ${api.url}\n`);
const shutdown = async () => {
  await api.close();
  process.exit(0);
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
