import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import { crawlDetailed, extractStructured, mapSite } from "./index.js";
import { PACKAGE_VERSION } from "./version.js";

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

export function createCockroachMcpServer(options = {}) {
  const crawlDefaults = Object.freeze(structuredClone(options.crawlDefaults || {}));
  const extractDefaults = Object.freeze(structuredClone(options.extractDefaults || {}));
  if (!Array.isArray(crawlDefaults.allowedOrigins) || !crawlDefaults.allowedOrigins.length) {
    throw new TypeError("crawlDefaults.allowedOrigins must contain at least one operator-owned origin.");
  }
  const server = new McpServer({
    name: options.name || "cockroach-crawler",
    version: PACKAGE_VERSION
  });

  const crawlInput = {
    urls: z.array(z.url()).min(1).max(Math.min(100, crawlDefaults.maxSeeds || 100)),
    maxPages: z.number().int().min(1).optional(),
    maxDepth: z.number().int().min(0).optional(),
    query: z.string().max(2_048).optional()
  };
  server.registerTool("crawl", {
    title: "Bounded evidence crawl",
    description: "Crawl operator-authorized HTTP(S) URLs under fixed origin, robots, network, and resource policy.",
    inputSchema: crawlInput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  }, async (request) => toolResult(
    await crawlDetailed(buildMcpCrawlOptions(crawlDefaults, request))
  ));

  server.registerTool("map_site", {
    title: "Fetch-validated site map",
    description: "Return compact metadata for pages reached under fixed crawler policy.",
    inputSchema: crawlInput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  }, async (request) => toolResult(
    await mapSite(buildMcpCrawlOptions(crawlDefaults, request))
  ));

  server.registerTool("extract_structured", {
    title: "Bounded structured extraction",
    description: "Apply deterministic CSS fields to caller-supplied HTML without executing page scripts.",
    inputSchema: {
      html: z.string().max(extractDefaults.maxInputCharacters || 5 * 1024 * 1024),
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
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  }, async ({ html, url, fields }) => toolResult(
    extractStructured(html, url, { ...extractDefaults, fields })
  ));

  server.registerResource(
    "capability-boundary",
    "cockroach://capabilities",
    { title: "Cockroach Crawler capability boundary", mimeType: "application/json" },
    async () => ({
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
    })
  );
  return server;
}

export async function connectCockroachStdio(options = {}) {
  const server = createCockroachMcpServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}
