import { timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { crawlDetailed, extractStructured, mapSite } from "./index.js";

const DASHBOARD = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Cockroach Crawler Playground</title>
  <style>
    :root{color-scheme:dark;background:#07110d;color:#eafff2;font:15px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}
    *{box-sizing:border-box}body{margin:0}.shell{max-width:1100px;margin:auto;padding:32px 20px}
    h1{font:700 clamp(32px,6vw,72px)/.95 system-ui;margin:0 0 16px;letter-spacing:-.055em}
    .tag{color:#71f6a6;margin-bottom:32px}.grid{display:grid;grid-template-columns:minmax(280px,380px) 1fr;gap:18px}
    .panel{border:1px solid #24553b;background:#091812;padding:18px}.field{display:grid;gap:6px;margin:0 0 14px}
    input,select,button,textarea{font:inherit;color:inherit;background:#06100b;border:1px solid #2c6b48;padding:10px}
    button{cursor:pointer;background:#71f6a6;color:#041008;font-weight:800;border-color:#71f6a6}
    pre{margin:0;white-space:pre-wrap;word-break:break-word;max-height:70vh;overflow:auto}.small{font-size:12px;color:#9db9a7}
    @media(max-width:760px){.grid{grid-template-columns:1fr}}
  </style>
</head>
<body><main class="shell">
  <div class="tag">BOUNDED WEB REACH / REVIEWABLE EVIDENCE</div>
  <h1>Give your AI agent<br>eyes on the web.</h1>
  <p>Crawl or map an operator-authorized URL through fixed server policy. This playground cannot widen origins, credentials, robots, or resource budgets.</p>
  <div class="grid">
    <form class="panel" id="form">
      <label class="field">API token<input id="token" type="password" autocomplete="off"></label>
      <label class="field">Public URL<input id="url" type="url" required placeholder="https://example.com"></label>
      <label class="field">Operation<select id="mode"><option value="map">Compact map</option><option value="crawl">Evidence crawl</option></select></label>
      <label class="field">Maximum pages<input id="pages" type="number" min="1" max="100" value="5"></label>
      <button type="submit">Run bounded crawl</button>
      <p class="small">The server may lower this limit. Private networks, sensitive routes, origin escapes, and disallowed robots paths remain blocked unless the deployment owner explicitly configured them.</p>
    </form>
    <section class="panel"><pre id="output">Ready.</pre></section>
  </div>
</main><script>
const form=document.querySelector("#form"),output=document.querySelector("#output");
form.addEventListener("submit",async(event)=>{
  event.preventDefault();output.textContent="Running...";
  const token=document.querySelector("#token").value;
  try{
    const response=await fetch("/v1/crawl",{method:"POST",headers:{"content-type":"application/json",...(token?{authorization:"Bearer "+token}:{})},body:JSON.stringify({seeds:[document.querySelector("#url").value],mode:document.querySelector("#mode").value,maxPages:Number(document.querySelector("#pages").value)})});
    const body=await response.json();output.textContent=JSON.stringify(body,null,2);
  }catch(error){output.textContent=String(error?.message||error)}
});
</script></body></html>`;

function integer(value, label, fallback, minimum, maximum) {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label} must be a safe integer from ${minimum} to ${maximum}.`);
  }
  return result;
}

function safeTokenEqual(actual, expected) {
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function readJson(request, maxBodyBytes) {
  const chunks = [];
  let received = 0;
  for await (const chunk of request) {
    received += chunk.byteLength;
    if (received > maxBodyBytes) {
      const error = new RangeError(`Request body exceeds maxBodyBytes (${maxBodyBytes}).`);
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (cause) {
    const error = new TypeError("Request body must be valid JSON.");
    error.status = 400;
    error.cause = cause;
    throw error;
  }
}

function writeJson(response, status, value, maxResponseBytes) {
  let body = `${JSON.stringify(value)}\n`;
  if (Buffer.byteLength(body) > maxResponseBytes) {
    status = 413;
    body = `${JSON.stringify({
      error: { code: "RESPONSE_LIMIT", message: `Response exceeds maxResponseBytes (${maxResponseBytes}).` }
    })}\n`;
  }
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  response.end(body);
}

function deploymentCrawlOptions(defaults, request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new TypeError("Crawl request must be an object.");
  }
  const allowed = new Set(["seeds", "mode", "maxPages", "maxDepth", "query"]);
  const unknown = Object.keys(request).filter((key) => !allowed.has(key));
  if (unknown.length) throw new TypeError(`Unknown crawl request field(s): ${unknown.join(", ")}.`);
  const seeds = Array.isArray(request.seeds) ? request.seeds : [];
  if (!seeds.length || seeds.length > Math.min(100, defaults.maxSeeds ?? 100)) {
    throw new TypeError("seeds must be a non-empty bounded array.");
  }
  if (seeds.some((seed) => typeof seed !== "string")) {
    throw new TypeError("Every seed must be a string.");
  }
  const maximumPages = integer(defaults.maxPages, "defaults.maxPages", 20, 1, 10_000);
  const maximumDepth = integer(defaults.maxDepth, "defaults.maxDepth", 2, 0, 100);
  const maxPages = Math.min(integer(request.maxPages, "maxPages", maximumPages, 1, maximumPages), maximumPages);
  const maxDepth = Math.min(integer(request.maxDepth, "maxDepth", maximumDepth, 0, maximumDepth), maximumDepth);
  const query = request.query === undefined ? undefined : String(request.query).slice(0, 2_048);
  return {
    ...defaults,
    seeds: [...seeds],
    maxPages,
    maxDepth,
    ...(query ? { traversal: { mode: "adaptive", query } } : {})
  };
}

export function createCrawlerApiServer(options = {}) {
  const host = options.host || "127.0.0.1";
  const token = options.token || null;
  if (!token && !(options.allowUnauthenticatedLoopback === true && ["127.0.0.1", "::1"].includes(host))) {
    throw new TypeError("A bearer token is required unless unauthenticated loopback is explicitly enabled.");
  }
  if (token && (typeof token !== "string" || token.length < 16 || token.length > 4_096)) {
    throw new TypeError("token must contain 16-4096 characters.");
  }
  const maxBodyBytes = integer(options.maxBodyBytes, "maxBodyBytes", 1_000_000, 1_024, 20_000_000);
  const maxResponseBytes = integer(
    options.maxResponseBytes,
    "maxResponseBytes",
    20_000_000,
    1_024,
    100_000_000
  );
  const crawlDefaults = Object.freeze(structuredClone(options.crawlDefaults || {}));
  const extractDefaults = Object.freeze(structuredClone(options.extractDefaults || {}));
  if (!Array.isArray(crawlDefaults.allowedOrigins) || !crawlDefaults.allowedOrigins.length) {
    throw new TypeError("crawlDefaults.allowedOrigins must contain at least one deployment-owned origin.");
  }

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", `http://${request.headers.host || host}`);
      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/playground")) {
        response.writeHead(200, {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
          "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'"
        });
        response.end(DASHBOARD);
        return;
      }
      if (request.method === "GET" && url.pathname === "/health") {
        writeJson(response, 200, {
          ok: true,
          service: "cockroach-crawler",
          capabilities: ["crawl", "map", "structured-extract", "playground"]
        }, maxResponseBytes);
        return;
      }

      const authorization = request.headers.authorization || "";
      const actualToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
      if (token && !safeTokenEqual(actualToken, token)) {
        writeJson(response, 401, { error: { code: "UNAUTHORIZED", message: "Valid bearer token required." } }, maxResponseBytes);
        return;
      }

      if (request.method === "POST" && url.pathname === "/v1/crawl") {
        const body = await readJson(request, maxBodyBytes);
        const crawlOptions = deploymentCrawlOptions(crawlDefaults, body);
        const result = body.mode === "map"
          ? await mapSite(crawlOptions)
          : await crawlDetailed(crawlOptions);
        writeJson(response, 200, result, maxResponseBytes);
        return;
      }
      if (request.method === "POST" && url.pathname === "/v1/extract") {
        const body = await readJson(request, maxBodyBytes);
        if (typeof body.html !== "string" || typeof body.url !== "string") {
          throw new TypeError("html and url strings are required.");
        }
        const result = extractStructured(body.html, body.url, {
          ...extractDefaults,
          fields: body.fields
        });
        writeJson(response, 200, result, maxResponseBytes);
        return;
      }
      writeJson(response, 404, { error: { code: "NOT_FOUND", message: "Route not found." } }, maxResponseBytes);
    } catch (error) {
      writeJson(response, error?.status || 400, {
        error: {
          code: error?.code || "BAD_REQUEST",
          message: String(error?.message || error).slice(0, 2_048)
        }
      }, maxResponseBytes);
    }
  });
  return { server, host };
}

export async function startCrawlerApi(options = {}) {
  const port = integer(options.port, "port", 3_878, 0, 65_535);
  const { server, host } = createCrawlerApiServer(options);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
  return {
    server,
    host,
    port: server.address().port,
    url: `http://${host.includes(":") ? `[${host}]` : host}:${server.address().port}`,
    async close() {
      if (!server.listening) return;
      server.closeIdleConnections?.();
      server.closeAllConnections?.();
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  };
}
