#!/usr/bin/env node
import process from "node:process";
import { runShell } from "../src/shell.js";

function parseOrigins(value) {
  return String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const allowed = parseOrigins(process.env.COCKROACH_ALLOWED_ORIGINS);

try {
  await runShell({
    ...(allowed.length ? { crawlDefaults: { allowedOrigins: allowed } } : {})
  });
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
