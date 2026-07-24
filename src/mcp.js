import process from "node:process";
import * as z from "zod/v4";
import { crawlDetailed, extractStructured, mapSite } from "./index.js";
import { PACKAGE_VERSION } from "./version.js";

const LATEST_PROTOCOL_VERSION = "2025-11-25";
const SUPPORTED_PROTOCOL_VERSIONS = new Set([
  LATEST_PROTOCOL_VERSION,
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
  "2024-10-07"
]);
const MAX_STDIO_MESSAGE_BYTES = 8 * 1024 * 1024;

function integer(value, label, fallback, minimum, maximum) {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label} must be a safe integer from ${minimum} to ${maximum}.`);
  }
  return result;
}

export function buildMcpCrawlOptions(defaults, request) {
  const fixed = structuredClone(defaults || {});
  const maxPages = integer(fixed.maxPages, "defaults.maxPages", 20, 1, 10_000);
  const maxDepth = integer(fixed.maxDepth, "defaults.maxDepth", 2, 0, 100);
  if (!Array.isArray(request.urls) || !request.urls.length) {
    throw new TypeError("urls must be a non-empty array.");
  }
  const requestedPages = integer(request.maxPages, "maxPages", maxPages, 1, maxPages);
  const requestedDepth = integer(request.maxDepth, "maxDepth", maxDepth, 0, maxDepth);
  return {
    ...fixed,
    seeds: [...request.urls],
    maxPages: Math.min(requestedPages, maxPages),
    maxDepth: Math.min(requestedDepth, maxDepth),
    ...(request.query
      ? { traversal: { mode: "adaptive", query: String(request.query).slice(0, 2_048) } }
      : {})
  };
}

function toolResult(value) {
  const text = JSON.stringify(value);
  return {
    content: [{ type: "text", text }],
    structuredContent: value
  };
}

function toolError(error) {
  return {
    content: [{
      type: "text",
      text: error instanceof Error ? error.message : "Tool execution failed."
    }],
    isError: true
  };
}

function commonCrawlJsonSchema(maxSeeds) {
  return {
    type: "object",
    properties: {
      urls: {
        type: "array",
        minItems: 1,
        maxItems: maxSeeds,
        items: { type: "string", format: "uri" }
      },
      maxPages: { type: "integer", minimum: 1 },
      maxDepth: { type: "integer", minimum: 0 },
      query: { type: "string", maxLength: 2_048 }
    },
    required: ["urls"],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#"
  };
}

function createToolDefinitions(crawlDefaults, extractDefaults) {
  const maxSeeds = Math.min(100, crawlDefaults.maxSeeds || 100);
  const commonShape = {
    urls: z.array(z.url()).min(1).max(maxSeeds),
    maxPages: z.number().int().min(1).optional(),
    maxDepth: z.number().int().min(0).optional(),
    query: z.string().max(2_048).optional()
  };
  const annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true
  };
  const crawlInputSchema = commonCrawlJsonSchema(maxSeeds);
  const mapInputSchema = structuredClone(crawlInputSchema);
  mapInputSchema.properties.search = { type: "string", minLength: 1, maxLength: 2_048 };
  mapInputSchema.properties.maxResults = { type: "integer", minimum: 1 };
  const maxInputCharacters = extractDefaults.maxInputCharacters || 5 * 1024 * 1024;
  const extractInputSchema = {
    type: "object",
    properties: {
      html: { type: "string", maxLength: maxInputCharacters },
      url: { type: "string", format: "uri" },
      fields: {
        type: "object",
        additionalProperties: {
          anyOf: [
            { type: "string" },
            {
              type: "object",
              properties: {
                selector: { type: "string" },
                source: { type: "string", enum: ["text", "html", "attribute"] },
                attribute: { type: "string" },
                multiple: { type: "boolean" },
                limit: { type: "integer", minimum: 1 },
                resolveUrl: { type: "boolean" }
              },
              required: ["selector"],
              additionalProperties: false
            }
          ]
        }
      }
    },
    required: ["html", "url", "fields"],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#"
  };
  return new Map([
    ["crawl", {
      definition: {
        name: "crawl",
        title: "Bounded evidence crawl",
        description: "Crawl operator-authorized HTTP(S) URLs under fixed origin, robots, network, and resource policy.",
        inputSchema: crawlInputSchema,
        annotations: { ...annotations, openWorldHint: true },
        execution: { taskSupport: "forbidden" }
      },
      schema: z.object(commonShape).strict(),
      run: async (request) => toolResult(
        await crawlDetailed(buildMcpCrawlOptions(crawlDefaults, request))
      )
    }],
    ["map_site", {
      definition: {
        name: "map_site",
        title: "Fetch-validated site map",
        description: "Return compact metadata for pages reached under fixed crawler policy.",
        inputSchema: mapInputSchema,
        annotations: { ...annotations, openWorldHint: true },
        execution: { taskSupport: "forbidden" }
      },
      schema: z.object({
        ...commonShape,
        search: z.string().min(1).max(2_048).optional(),
        maxResults: z.number().int().min(1).optional()
      }).strict(),
      run: async (request) => {
        const crawlOptions = buildMcpCrawlOptions(crawlDefaults, request);
        return toolResult(await mapSite({
          ...crawlOptions,
          ...(request.search ? { search: request.search } : {}),
          maxResults: Math.min(request.maxResults ?? crawlOptions.maxPages, crawlOptions.maxPages)
        }));
      }
    }],
    ["extract_structured", {
      definition: {
        name: "extract_structured",
        title: "Bounded structured extraction",
        description: "Apply deterministic CSS fields to caller-supplied HTML without executing page scripts.",
        inputSchema: extractInputSchema,
        annotations: { ...annotations, openWorldHint: false },
        execution: { taskSupport: "forbidden" }
      },
      schema: z.object({
        html: z.string().max(maxInputCharacters),
        url: z.url(),
        fields: z.record(z.string(), z.union([
          z.string(),
          z.object({
            selector: z.string(),
            source: z.enum(["text", "html", "attribute"]).optional(),
            attribute: z.string().optional(),
            multiple: z.boolean().optional(),
            limit: z.number().int().positive().optional(),
            resolveUrl: z.boolean().optional()
          }).strict()
        ]))
      }).strict(),
      run: async ({ html, url, fields }) => toolResult(
        extractStructured(html, url, { ...extractDefaults, fields })
      )
    }]
  ]);
}

function capabilityResource(crawlDefaults) {
  return {
    contents: [{
      uri: "cockroach://capabilities",
      mimeType: "application/json",
      text: JSON.stringify({
        schema: "cockroach.mcp-capabilities.v1",
        version: PACKAGE_VERSION,
        tools: ["crawl", "map_site", "extract_structured"],
        fixedPolicy: {
          sameOrigin: crawlDefaults.sameOrigin !== false,
          allowedOrigins: crawlDefaults.allowedOrigins || [],
          maxPages: crawlDefaults.maxPages || 20,
          maxDepth: crawlDefaults.maxDepth || 2,
          obeyRobots: crawlDefaults.obeyRobots !== false,
          allowPrivateNetworks: crawlDefaults.allowPrivateNetworks === true
        },
        exclusions: [
          "CAPTCHA bypass",
          "authorization bypass",
          "model-controlled credentials",
          "model-controlled origin expansion"
        ]
      })
    }]
  };
}

class NativeMcpServer {
  constructor(options) {
    this.name = options.name;
    this.tools = options.tools;
    this.resource = options.resource;
    this.transport = undefined;
    this.pending = new Set();
  }

  async connect(transport) {
    if (this.transport) {
      throw new Error("Cockroach MCP server is already connected.");
    }
    if (!transport || typeof transport.start !== "function" || typeof transport.send !== "function") {
      throw new TypeError("transport must implement start() and send().");
    }
    this.transport = transport;
    transport.onmessage = (message) => {
      const operation = this.#receive(message).catch((error) => {
        transport.onerror?.(error instanceof Error ? error : new Error(String(error)));
      });
      this.pending.add(operation);
      operation.finally(() => this.pending.delete(operation));
    };
    transport.onclose = () => {
      if (this.transport === transport) this.transport = undefined;
    };
    await transport.start();
  }

  async #receive(message) {
    if (!message || typeof message !== "object" || Array.isArray(message)) {
      await this.#sendError(null, -32600, "Invalid JSON-RPC request.");
      return;
    }
    const { id, method, params } = message;
    if (message.jsonrpc !== "2.0" || typeof method !== "string") {
      if (id !== undefined) await this.#sendError(id ?? null, -32600, "Invalid JSON-RPC request.");
      return;
    }
    if (id === undefined) return;
    try {
      let result;
      switch (method) {
        case "initialize": {
          const requested = params?.protocolVersion;
          result = {
            protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.has(requested)
              ? requested
              : LATEST_PROTOCOL_VERSION,
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false }
            },
            serverInfo: { name: this.name, version: PACKAGE_VERSION },
            instructions: "Use only the configured origins and fixed crawler limits. Tool input cannot expand authority."
          };
          break;
        }
        case "ping":
          result = {};
          break;
        case "tools/list":
          result = { tools: [...this.tools.values()].map(({ definition }) => definition) };
          break;
        case "tools/call": {
          const tool = this.tools.get(params?.name);
          if (!tool) {
            await this.#sendError(id, -32602, `Unknown tool: ${String(params?.name || "")}`);
            return;
          }
          const parsed = tool.schema.safeParse(params?.arguments || {});
          if (!parsed.success) {
            await this.#sendError(id, -32602, `Invalid ${params.name} arguments: ${parsed.error.message}`);
            return;
          }
          try {
            result = await tool.run(parsed.data);
          } catch (error) {
            result = toolError(error);
          }
          break;
        }
        case "resources/list":
          result = {
            resources: [{
              name: "capability-boundary",
              title: "Cockroach Crawler capability boundary",
              uri: "cockroach://capabilities",
              mimeType: "application/json"
            }]
          };
          break;
        case "resources/read":
          if (params?.uri !== "cockroach://capabilities") {
            await this.#sendError(id, -32602, `Unknown resource: ${String(params?.uri || "")}`);
            return;
          }
          result = this.resource;
          break;
        default:
          await this.#sendError(id, -32601, `Method not found: ${method}`);
          return;
      }
      await this.transport?.send({ jsonrpc: "2.0", id, result });
    } catch (error) {
      await this.#sendError(
        id,
        -32603,
        error instanceof Error ? error.message : "Internal MCP server error."
      );
    }
  }

  async #sendError(id, code, message) {
    await this.transport?.send({
      jsonrpc: "2.0",
      id,
      error: { code, message }
    });
  }

  async close() {
    const transport = this.transport;
    this.transport = undefined;
    if (this.pending.size) await Promise.allSettled([...this.pending]);
    if (transport) await transport.close();
  }
}

class NativeStdioTransport {
  constructor(input = process.stdin, output = process.stdout) {
    this.input = input;
    this.output = output;
    this.buffer = Buffer.alloc(0);
    this.started = false;
    this.onData = (chunk) => this.#append(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    this.onError = (error) => this.onerror?.(error);
  }

  async start() {
    if (this.started) throw new Error("Native stdio transport is already started.");
    this.started = true;
    this.input.on("data", this.onData);
    this.input.on("error", this.onError);
  }

  #append(chunk) {
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : chunk;
    if (this.buffer.length > MAX_STDIO_MESSAGE_BYTES && this.buffer.indexOf(10) === -1) {
      this.onerror?.(new Error("MCP stdio message exceeds the 8 MiB transport ceiling."));
      this.buffer = Buffer.alloc(0);
      return;
    }
    while (true) {
      const newline = this.buffer.indexOf(10);
      if (newline === -1) break;
      if (newline > MAX_STDIO_MESSAGE_BYTES) {
        this.onerror?.(new Error("MCP stdio message exceeds the 8 MiB transport ceiling."));
        this.buffer = this.buffer.subarray(newline + 1);
        continue;
      }
      const line = this.buffer.subarray(0, newline).toString("utf8").replace(/\r$/, "");
      this.buffer = this.buffer.subarray(newline + 1);
      if (!line) continue;
      try {
        this.onmessage?.(JSON.parse(line));
      } catch (error) {
        this.onerror?.(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  async send(message) {
    const serialized = `${JSON.stringify(message)}\n`;
    if (Buffer.byteLength(serialized) > MAX_STDIO_MESSAGE_BYTES) {
      throw new Error("MCP stdio response exceeds the 8 MiB transport ceiling.");
    }
    if (!this.output.write(serialized)) {
      await new Promise((resolve) => this.output.once("drain", resolve));
    }
  }

  async close() {
    if (!this.started) return;
    this.started = false;
    this.input.off("data", this.onData);
    this.input.off("error", this.onError);
    this.buffer = Buffer.alloc(0);
    this.onclose?.();
  }
}

export function createCockroachMcpServer(options = {}) {
  const crawlDefaults = Object.freeze(structuredClone(options.crawlDefaults || {}));
  const extractDefaults = Object.freeze(structuredClone(options.extractDefaults || {}));
  if (!Array.isArray(crawlDefaults.allowedOrigins) || !crawlDefaults.allowedOrigins.length) {
    throw new TypeError("crawlDefaults.allowedOrigins must contain at least one operator-owned origin.");
  }
  return new NativeMcpServer({
    name: options.name || "cockroach-crawler",
    tools: createToolDefinitions(crawlDefaults, extractDefaults),
    resource: capabilityResource(crawlDefaults)
  });
}

export async function connectCockroachStdio(options = {}) {
  const server = createCockroachMcpServer(options);
  await server.connect(new NativeStdioTransport());
  return server;
}
