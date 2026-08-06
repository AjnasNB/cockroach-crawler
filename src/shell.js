import { crawlDetailed, extractStructured, mapSite } from "./index.js";
import { findSimilarElements, relocateElement } from "./adaptive.js";
import { exportFormats, exportRecords } from "./exporters.js";
import { Selector } from "./parser.js";
import { detectChallenge, identityProfileNames, resolveIdentity } from "./identity.js";
import { PACKAGE_VERSION } from "./version.js";

const MAX_PREVIEW = 2_000;

function ownRecord(value, label, maximum = 32) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const result = Object.create(null);
  let count = 0;
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== "string" || ["__proto__", "prototype", "constructor"].includes(key)) {
      throw new TypeError(`${label} contains an unsafe property.`);
    }
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`${label}.${key} must be an own enumerable data property.`);
    }
    count += 1;
    if (count > maximum) throw new TypeError(`${label} exceeds its ${maximum}-property limit.`);
    result[key] = descriptor.value;
  }
  return result;
}

function splitArguments(line) {
  const parts = [];
  let current = "";
  let quote = null;
  for (const character of line) {
    if (quote) {
      if (character === quote) quote = null;
      else current += character;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (/\s/u.test(character)) {
      if (current) parts.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  if (current) parts.push(current);
  if (quote) throw new TypeError("Unterminated quote.");
  return parts;
}

function freeform(rest) {
  const text = String(rest ?? "").trim();
  const wrapped = text.length > 1
    && ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'")));
  return wrapped ? text.slice(1, -1) : text;
}

function preview(value, limit = MAX_PREVIEW) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  if (text === undefined) return "undefined";
  return text.length > limit ? `${text.slice(0, limit)}\n… ${text.length - limit} more characters` : text;
}

export function createShellSession(options = {}) {
  const settings = ownRecord(options, "shell options", 16);
  const state = {
    url: null,
    html: null,
    document: null,
    lastRecords: [],
    crawlDefaults: settings.crawlDefaults ? ownRecord(settings.crawlDefaults, "crawlDefaults", 32) : {},
    identity: settings.identity ?? null
  };

  function requireDocument() {
    if (!state.document) throw new TypeError("Load a page first with: fetch <url>");
    return state.document;
  }

  const commands = new Map([
    ["help", {
      summary: "List commands",
      run: () => [...commands.entries()]
        .map(([name, command]) => `  ${name.padEnd(12)} ${command.summary}`)
        .join("\n")
    }],
    ["fetch", {
      summary: "fetch <url> — crawl one page and hold it for querying",
      run: async (args) => {
        const [url] = args;
        if (!url) throw new TypeError("Usage: fetch <url>");
        const result = await crawlDetailed({
          ...state.crawlDefaults,
          seeds: [url],
          maxPages: 1,
          maxDepth: 0,
          ...(state.identity ? { identity: state.identity } : {}),
          challengePolicy: { mode: "report" }
        });
        if (!result.pages.length) {
          const failure = result.failures[0];
          return `No page. ${failure ? `${failure.code}: ${failure.error}` : "No failure recorded."}`;
        }
        const page = result.pages[0];
        state.url = page.url;
        state.html = page.markdown;
        state.document = Selector.parse(page.rawHtml ?? `<html><body>${page.markdown}</body></html>`, { url: page.url });
        return `${page.status} ${page.url}\n${page.title}\n${page.markdown.length} chars of markdown, ${page.links.length} links`;
      }
    }],
    ["load", {
      raw: true,
      summary: "load <html> — hold caller-supplied markup for querying",
      run: (args, rest) => {
        const html = freeform(rest);
        if (!html) throw new TypeError("Usage: load <html>");
        state.html = html;
        state.document = Selector.parse(html, state.url ? { url: state.url } : {});
        return `Loaded ${html.length} characters.`;
      }
    }],
    ["css", {
      raw: true,
      summary: "css <selector> — query the loaded page, supports ::text and ::attr()",
      run: (args, rest) => {
        const selector = freeform(rest);
        if (!selector) throw new TypeError("Usage: css <selector>");
        const matches = requireDocument().css(selector, { limit: 50 });
        if (!matches.length) return "No match.";
        return matches.map((entry, index) => `${index}: ${preview(entry.get() ?? entry.text, 200)}`).join("\n");
      }
    }],
    ["xpath", {
      raw: true,
      summary: "xpath <expression> — query the loaded page",
      run: (args, rest) => {
        const expression = freeform(rest);
        if (!expression) throw new TypeError("Usage: xpath <expression>");
        const matches = requireDocument().xpath(expression, { limit: 50 });
        if (!matches.length) return "No match.";
        return matches.map((entry, index) => `${index}: ${preview(entry.text, 200)}`).join("\n");
      }
    }],
    ["text", {
      raw: true,
      summary: "text <needle> — find elements containing text",
      run: (args, rest) => {
        const needle = freeform(rest);
        if (!needle) throw new TypeError("Usage: text <needle>");
        const matches = requireDocument().findByText(needle, { limit: 25 });
        if (!matches.length) return "No match.";
        return matches.map((entry) => `${entry.tag}\t${entry.cssPath()}\t${preview(entry.text, 120)}`).join("\n");
      }
    }],
    ["similar", {
      raw: true,
      summary: "similar <selector> — find records structurally like the first match",
      run: (args, rest) => {
        const selector = freeform(rest);
        if (!selector) throw new TypeError("Usage: similar <selector>");
        const example = requireDocument().css(selector).first;
        if (!example) return "Selector matched no element.";
        const matches = findSimilarElements(state.html, example.fingerprint(), { limit: 25 });
        return matches.length
          ? matches.map((entry) => `${entry.score.toFixed(3)}\t${entry.selector}\t${preview(entry.text, 90)}`).join("\n")
          : "No similar elements.";
      }
    }],
    ["path", {
      raw: true,
      summary: "path <selector> — show generated CSS and XPath for the first match",
      run: (args, rest) => {
        const selector = freeform(rest);
        if (!selector) throw new TypeError("Usage: path <selector>");
        const match = requireDocument().css(selector).first;
        if (!match) return "Selector matched no element.";
        return `css:   ${match.cssPath()}\nxpath: ${match.xpathPath()}`;
      }
    }],
    ["map", {
      summary: "map <url> [query] — fetch-validated site map",
      run: async (args) => {
        const [url, ...rest] = args;
        if (!url) throw new TypeError("Usage: map <url> [query]");
        const search = rest.join(" ");
        const result = await mapSite({
          ...state.crawlDefaults,
          seeds: [url],
          ...(search ? { search } : {})
        });
        return result.entries.map((entry) => `${entry.url}\t${entry.title}`).join("\n") || "No entries.";
      }
    }],
    ["relocate", {
      summary: "relocate <selector> <url> — recover the element on another page",
      run: async (args) => {
        const [selector, url] = args;
        if (!selector || !url) throw new TypeError("Usage: relocate <selector> <url>");
        const example = requireDocument().css(selector).first;
        if (!example) return "Selector matched no element on the loaded page.";
        const result = await crawlDetailed({
          ...state.crawlDefaults,
          seeds: [url],
          maxPages: 1,
          maxDepth: 0
        });
        if (!result.pages.length) return "Could not fetch the comparison page.";
        const moved = relocateElement(result.pages[0].markdown, example.fingerprint(), {});
        return moved.found
          ? `found  score ${moved.score.toFixed(3)}\n${moved.element.selector}\n${preview(moved.element.text, 200)}`
          : `miss   best score ${moved.score.toFixed(3)} (threshold ${moved.threshold})`;
      }
    }],
    ["extract", {
      summary: "extract <name>=<selector> … — deterministic CSS extraction",
      run: (args) => {
        if (!args.length) throw new TypeError("Usage: extract name=selector [name=selector …]");
        requireDocument();
        const fields = Object.create(null);
        for (const pair of args) {
          const index = pair.indexOf("=");
          if (index <= 0) throw new TypeError(`Malformed field '${pair}'. Use name=selector.`);
          fields[pair.slice(0, index)] = pair.slice(index + 1);
        }
        const result = extractStructured(state.html, state.url ?? "https://example.invalid/", { fields });
        state.lastRecords = [result.data];
        return preview(result);
      }
    }],
    ["export", {
      summary: `export <${exportFormats.join("|")}> — serialize the last extraction`,
      run: (args) => {
        const [format] = args;
        if (!format) throw new TypeError(`Usage: export <${exportFormats.join("|")}>`);
        if (!state.lastRecords.length) return "Nothing to export. Run extract first.";
        return exportRecords(state.lastRecords, format);
      }
    }],
    ["identity", {
      summary: "identity [name] — show or set the request identity profile",
      run: (args) => {
        const [name] = args;
        if (!name) {
          return `current: ${state.identity ?? "default"}\navailable: ${identityProfileNames.join(", ")}`;
        }
        const profile = resolveIdentity(name);
        state.identity = name;
        return `${profile.name}\n${profile.userAgent}\nviewport ${profile.viewport.width}x${profile.viewport.height}`;
      }
    }],
    ["challenge", {
      summary: "challenge — report whether the loaded page looks like an access challenge",
      run: () => {
        if (!state.html) throw new TypeError("Load a page first.");
        return preview(detectChallenge({ body: state.html, url: state.url ?? undefined }));
      }
    }],
    ["status", {
      summary: "status — show the loaded page and settings",
      run: () => [
        `version   ${PACKAGE_VERSION}`,
        `url       ${state.url ?? "(none)"}`,
        `loaded    ${state.html ? `${state.html.length} chars` : "(nothing)"}`,
        `identity  ${state.identity ?? "default"}`,
        `records   ${state.lastRecords.length}`
      ].join("\n")
    }]
  ]);

  return {
    state,
    commands,
    async execute(line) {
      const trimmed = String(line ?? "").trim();
      if (!trimmed) return "";
      if (trimmed.length > 8_192) throw new TypeError("Input exceeds 8192 characters.");
      const match = trimmed.match(/^(\S+)(?:\s+([\s\S]*))?$/u);
      const name = match[1];
      const rest = match[2] ?? "";
      const command = commands.get(name);
      if (!command) {
        throw new TypeError(`Unknown command '${name}'. Try: ${[...commands.keys()].join(", ")}`);
      }
      return command.run(command.raw ? [] : splitArguments(rest), rest);
    }
  };
}

export async function runShell(options = {}) {
  const settings = ownRecord(options, "runShell options", 16);
  const input = settings.input ?? process.stdin;
  const output = settings.output ?? process.stdout;
  const session = createShellSession(settings);

  const { createInterface } = await import("node:readline");
  const readline = createInterface({ input, output, prompt: "cockroach> ", terminal: settings.terminal !== false });

  output.write(`Cockroach Crawler ${PACKAGE_VERSION} shell. Type help for commands, exit to leave.\n`);
  readline.prompt();

  for await (const line of readline) {
    const trimmed = line.trim();
    if (trimmed === "exit" || trimmed === "quit") break;
    try {
      const result = await session.execute(trimmed);
      if (result) output.write(`${result}\n`);
    } catch (error) {
      output.write(`error: ${error.message}\n`);
    }
    readline.prompt();
  }

  readline.close();
  return session;
}
