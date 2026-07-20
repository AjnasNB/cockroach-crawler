#!/usr/bin/env node
import {
  createExternalSourceProviders,
  externalSourceChannels,
  setupExternalSources,
  updateExternalSources
} from "../src/external-sources.js";
import { SourceAccessError } from "../src/sources.js";

function usage() {
  process.stdout.write(`Cockroach Reach

Optional read-only browser-session channels and no-key YouTube access.

Usage:
  cockroach-reach doctor [--json]
  cockroach-reach setup [--channels <list>] [--apply] [--json]
  cockroach-reach update [--channels <list>] [--apply] [--json]

Supported channels: ${externalSourceChannels.join(", ")}

setup and update are dry-run plans by default. --apply executes only reviewed,
pinned package commands. Browser extensions and LinkedIn MCP alternatives remain
manual. This command never reads browser profile or cookie files and never exposes
social write operations.
`);
}

function channels(value) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError("--channels requires a comma-separated list.");
  const result = value.split(",").map((item) => item.trim());
  if (result.some((item) => !item)) throw new TypeError("--channels contains an empty channel name.");
  return result;
}

function parse(argv) {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "-h") return { help: true };
  if (command !== "doctor" && command !== "setup" && command !== "update") {
    throw new TypeError(`Unknown command '${command}'.`);
  }
  const options = { command, apply: false, json: false };
  const seen = new Set();
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--json") {
      if (seen.has("json")) throw new TypeError("--json may be provided only once.");
      seen.add("json");
      options.json = true;
    } else if (argument === "--apply") {
      if (seen.has("apply")) throw new TypeError("--apply may be provided only once.");
      seen.add("apply");
      options.apply = true;
    } else if (argument === "--channels") {
      if (seen.has("channels")) throw new TypeError("--channels may be provided only once.");
      if (index + 1 >= rest.length) throw new TypeError("Missing value for --channels.");
      seen.add("channels");
      options.channels = channels(rest[index + 1]);
      index += 1;
    } else {
      throw new TypeError(`Unknown option or positional argument '${argument}'.`);
    }
  }
  if (command === "doctor" && options.apply) throw new TypeError("doctor does not accept --apply.");
  if (command === "doctor" && options.channels) throw new TypeError("doctor does not accept --channels.");
  return options;
}

function printDoctor(statuses, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(statuses, null, 2)}\n`);
    return;
  }
  for (const status of statuses) {
    const capabilities = Object.entries(status.capabilities)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name)
      .join(", ") || "none";
    process.stdout.write(`${status.id}: ${status.status} (${capabilities}) - ${status.message}\n`);
  }
}

function printMaintenance(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${result.plan.action}: ${result.mode}\n`);
  for (const step of result.plan.steps) {
    if (step.kind === "command") {
      process.stdout.write(`- ${step.id}: ${step.file} ${step.args.join(" ")}\n`);
    } else {
      process.stdout.write(`- ${step.id}: manual action required at ${step.url}\n`);
    }
  }
  if (result.mode === "dry-run") process.stdout.write("No commands were executed. Re-run with --apply to execute the pinned command steps.\n");
}

async function main() {
  const options = parse(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }
  if (options.command === "doctor") {
    printDoctor(createExternalSourceProviders().map((provider) => provider.status()), options.json);
    return;
  }
  const operation = options.command === "setup" ? setupExternalSources : updateExternalSources;
  const result = await operation({ channels: options.channels, apply: options.apply });
  printMaintenance(result, options.json);
}

main().catch((error) => {
  const code = error instanceof SourceAccessError ? ` [${error.code}]` : "";
  process.stderr.write(`cockroach-reach${code}: ${error.message || String(error)}\n`);
  process.exitCode = 1;
});
