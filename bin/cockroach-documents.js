#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { parsePdf } from "../src/documents.js";

function usage() {
  process.stdout.write(`Cockroach Documents

Usage:
  cockroach-documents <file.pdf> [--max-pages <n>] [--max-bytes <n>] [--max-text-characters <n>]

The command reads an explicit local PDF path. It never fetches a URL or executes document scripts.
`);
}

function numberValue(argv, index, option) {
  if (index + 1 >= argv.length) throw new TypeError(`Missing value for ${option}.`);
  const value = Number(argv[index + 1]);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${option} must be a positive integer.`);
  }
  return value;
}

const argv = process.argv.slice(2);
if (!argv.length || argv.includes("--help") || argv.includes("-h")) {
  usage();
  process.exit(argv.length ? 0 : 1);
}
const filename = argv[0];
const options = {};
for (let index = 1; index < argv.length; index += 1) {
  const option = argv[index];
  if (option === "--max-pages") {
    options.maxPages = numberValue(argv, index, option);
    index += 1;
  } else if (option === "--max-bytes") {
    options.maxBytes = numberValue(argv, index, option);
    index += 1;
  } else if (option === "--max-text-characters") {
    options.maxTextCharacters = numberValue(argv, index, option);
    index += 1;
  } else {
    throw new TypeError(`Unknown option: ${option}`);
  }
}

const result = await parsePdf(await readFile(filename), options);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
