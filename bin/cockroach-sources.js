#!/usr/bin/env node
import { createSourceRegistryFromEnv, SourceAccessError } from "../src/sources.js";
import { formatSourceStatusLine, sourceStatusColorEnabled } from "../src/source-cli-format.js";

function usage() {
  process.stdout.write(`Cockroach Sources

Read-only source adapters for Cockroach Crawler.

Usage:
  cockroach-sources doctor [--json]
  cockroach-sources search <provider> <query> [--max-results <n>] [--kind <kind>] [--subreddit <name>] [--jsonl]
  cockroach-sources read <provider> <target> [--max-results <n>] [--jsonl]

Built-in providers: web, github, youtube, x, reddit

Credentials are read from environment variables and are never accepted as command-line flags:
  GITHUB_TOKEN or GH_TOKEN
  YOUTUBE_API_KEY
  X_BEARER_TOKEN
  REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET + COCKROACH_REDDIT_USER_AGENT

This command does not extract browser cookies, bypass authentication, install tools, or make write requests.
`);
}

function integer(value, option, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new TypeError(`${option} must be an integer from ${minimum} to ${maximum}.`);
  }
  return parsed;
}

function valueAfter(argv, index, option) {
  if (index + 1 >= argv.length) throw new TypeError(`Missing value for ${option}.`);
  return argv[index + 1];
}

function parseOptions(argv) {
  const positional = [];
  const options = { maxResults: 10, json: false, jsonl: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") options.json = true;
    else if (arg === "--jsonl") options.jsonl = true;
    else if (arg === "--max-results") {
      options.maxResults = integer(valueAfter(argv, index, arg), arg, 1, 100);
      index += 1;
    } else if (arg === "--kind") {
      options.kind = valueAfter(argv, index, arg);
      index += 1;
    } else if (arg === "--subreddit") {
      options.subreddit = valueAfter(argv, index, arg);
      index += 1;
    } else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("-")) throw new TypeError(`Unknown option: ${arg}`);
    else positional.push(arg);
  }
  return { positional, options };
}

function printRecords(records, jsonl) {
  if (jsonl) {
    for (const item of records) process.stdout.write(`${JSON.stringify(item)}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(records, null, 2)}\n`);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === "--help" || command === "-h") {
    usage();
    return;
  }
  const { positional, options } = parseOptions(rest);
  if (options.help) {
    usage();
    return;
  }
  const registry = createSourceRegistryFromEnv();
  if (command === "doctor") {
    if (positional.length) throw new TypeError("doctor does not accept positional arguments.");
    const report = registry.doctor();
    if (options.json) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      return;
    }
    const color = sourceStatusColorEnabled(process.stdout, process.env);
    for (const item of report) {
      process.stdout.write(`${formatSourceStatusLine(item, { color })}\n`);
    }
    return;
  }
  if (command === "search") {
    const [provider, ...queryParts] = positional;
    if (!provider || !queryParts.length) throw new TypeError("search requires <provider> and <query>.");
    const records = await registry.search(provider, {
      query: queryParts.join(" "),
      maxResults: options.maxResults,
      kind: options.kind,
      subreddit: options.subreddit
    });
    printRecords(records, options.jsonl);
    return;
  }
  if (command === "read") {
    const [provider, target, ...extra] = positional;
    if (!provider || !target || extra.length) throw new TypeError("read requires exactly <provider> and <target>.");
    const records = await registry.read(provider, { target, maxResults: options.maxResults });
    printRecords(records, options.jsonl);
    return;
  }
  throw new TypeError(`Unknown command '${command}'.`);
}

main().catch((error) => {
  const code = error instanceof SourceAccessError ? ` [${error.code}]` : "";
  process.stderr.write(`cockroach-sources${code}: ${error.message || String(error)}\n`);
  process.exitCode = 1;
});
