# Advanced AI crawler capabilities

Cockroach Crawler `0.4.x` is the stable capability line for agents that need
deep traversal, browser evidence, document parsing, structured extraction,
local deployment, and MCP without losing the package's origin, robots,
network, and resource boundaries.

The stable line is designed to be the best AI crawler for governed agents.
That scope matters: it is a compact Node.js package with reviewable authority,
not a claim to be a hosted proxy fleet, a CAPTCHA bypass, or a distributed
multi-tenant scraping cloud.

## Capability map

| Capability | Public surface | Authority and limit |
| --- | --- | --- |
| BFS, DFS, best-first, adaptive crawl | root `traversal` option; `cockroach-crawler/strategies` | Ranking changes queue order only; it cannot expand URL or resource policy |
| Persistent crawl cache | `cockroach-crawler/cache` | Explicit local directory, namespace, TTL, entry and byte ceilings, SHA-256 verification |
| Screenshots and PDF generation | root `browser` options; `cockroach-crawler/browser` | Explicit artifact directory and byte ceiling |
| PDF parsing | `cockroach-crawler/documents`; `cockroach-documents` | Caller-supplied bytes only, PDF signature, byte/page/text ceilings |
| Shadow DOM flattening | `browser.flattenShadowDom` | Open roots only, bounded root and cloned-node counts |
| Iframe flattening | `browser.flattenIframes` | Readable same-origin frames only; cross-origin frames remain unavailable |
| Infinite/virtual scroll | `browser.scroll`; browser helper | Bounded steps, pixels, delay, and stability iterations |
| Trusted page JavaScript | `browser.hooks` | Direct operator API only and requires `allowPageJavaScript: true`; excluded from agent/MCP input |
| CSS extraction | root `extract` and `extractStructured` | No script execution; independent field, item, value, and total ceilings |
| XPath extraction | `cockroach-crawler/extractors` | Active nodes removed; XPath, field, input, item, value, and total ceilings |
| Optional LLM schema extraction | `cockroach-crawler/extractors` | Host-supplied adapter, bounded disclosure/output, mandatory JSON Schema validation |
| Provider/proxy rotation | `cockroach-crawler/providers` | Explicit operator providers and escalation statuses; attempts recorded |
| Access-challenge detection | `cockroach-crawler/providers` | Stops on challenge by default; no CAPTCHA or authorization bypass |
| Docker crawler API | `Dockerfile`; `cockroach-server` | Bearer auth, deployment-owned origins and limits, bounded request/response |
| Dashboard and playground | `/` and `/playground` on the Node API | Cannot widen the server's crawl defaults |
| Native MCP service | `cockroach-crawler/mcp`; `cockroach-mcp` | Model arguments can only narrow deployment-owned origins and budgets |
| Persistent managed profile | `browser.profileDirectory` | Explicit operator directory plus `allowPersistentProfile: true`; never inferred from a local browser |

## Deep crawl strategies

The default remains breadth-first:

```js
import { crawl } from "cockroach-crawler";

const pages = await crawl({
  seeds: ["https://docs.example.com"],
  traversal: "bfs",
  maxDepth: 4,
  maxPages: 200
});
```

Depth-first takes the newest admitted link first:

```js
const pages = await crawl({
  seeds: ["https://docs.example.com"],
  traversal: "dfs",
  maxDepth: 8,
  maxPages: 100
});
```

Best-first and adaptive modes rank already-admitted URLs. The built-in scorer
uses bounded normalized URL, title, description, and text matches. A trusted
host may provide a scorer, but model-facing adapters do not accept functions.

```js
const pages = await crawl({
  seeds: ["https://docs.example.com"],
  traversal: {
    mode: "adaptive",
    query: ["oauth", "migration", "breaking change"],
    depthPenalty: 0.2,
    maxScoreInputCharacters: 20_000
  },
  maxPages: 50
});
```

Traversal never changes `sameOrigin`, `allowedOrigins`, `include`, `exclude`,
private-network policy, sensitive-path policy, robots, page/request/queue
limits, or the total deadline.

## Persistent cache

The cache wraps a crawler rather than becoming ambient global state. Cache
identity contains a caller-selected namespace and a deterministic digest of
the crawl input. Stored values carry creation/expiry times and a value digest.

```js
import { crawlDetailed } from "cockroach-crawler";
import { FileCrawlCache, createCachedCrawler } from "cockroach-crawler/cache";

const cache = new FileCrawlCache({
  directory: ".cache/cockroach",
  namespace: "public-docs-v1",
  ttlMs: 60 * 60 * 1_000,
  maxEntries: 2_000,
  maxBytes: 512 * 1024 * 1024
});
const cachedCrawl = createCachedCrawler(cache, crawlDetailed);
const result = await cachedCrawl({
  seeds: ["https://docs.example.com"],
  maxPages: 100
});

console.log(result.cache.hit, result.cache.key);
```

Use separate namespaces for different credentials, origin policies, browser
profiles, tenants, or disclosure boundaries. A cache hit does not re-contact
the origin; choose a TTL and refresh policy appropriate to the use case.

## Browser rendering and artifacts

Browser requests still pass through the crawler's pinned local proxy. Only
GET and HEAD are permitted. WebSocket and WebRTC egress remain disabled.

```js
const pages = await crawl({
  seeds: ["https://app.example.com/public-report"],
  maxPages: 1,
  browser: {
    waitUntil: "networkidle",
    scroll: {
      maxSteps: 30,
      stepPixels: 900,
      delayMs: 100,
      stableIterations: 3
    },
    flattenShadowDom: true,
    flattenIframes: true,
    screenshot: { format: "png", fullPage: true },
    pdf: {
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true
    },
    artifactDirectory: ".cockroach-artifacts",
    maxArtifactBytes: 25 * 1024 * 1024
  }
});

console.log(pages[0].artifacts);
console.log(pages[0].browserDetails);
```

Shadow flattening copies open shadow-root content into marked light-DOM
containers before the final HTML snapshot. Iframe flattening does the same
only when the browser can read the frame DOM under same-origin rules. These
operations improve extraction; they do not weaken browser origin isolation.

## Trusted page hooks

Hooks are an operator escape hatch for authorized pages. They are not accepted
from the default agent schema, MCP tool input, Docker playground, or crawl
content.

```js
const pages = await crawl({
  seeds: ["https://app.example.com/report"],
  browser: {
    hooks: [
      () => {
        document.querySelector("[data-open-report]")?.click();
        return { opened: true };
      }
    ],
    allowPageJavaScript: true
  }
});
```

Each hook has a timeout, the number of hooks is bounded, and serialized hook
results have a size ceiling. Browser routes triggered by a hook remain subject
to the crawler's method, origin, robots, network, byte, and deadline policy.

## Persistent managed profiles

Cockroach Crawler never searches for or extracts an existing Chrome profile.
The operator supplies an explicit profile directory:

```js
const pages = await crawl({
  seeds: ["https://portal.example.com"],
  browser: {
    profileDirectory: ".profiles/portal-test",
    allowPersistentProfile: true
  }
});
```

Use a dedicated least-privilege profile. Persistent profile mode is mutually
exclusive with Playwright storage-state import/export. Isolate untrusted
targets in a container or virtual machine; browser request policy is not an
operating-system sandbox.

## PDF generation and parsing

Browser PDF generation records the artifact path, byte size, media type, and
SHA-256 hash. Parsing accepts only explicit local bytes:

```js
import { readFile } from "node:fs/promises";
import { parsePdf } from "cockroach-crawler/documents";

const document = await parsePdf(await readFile("report.pdf"), {
  maxBytes: 20 * 1024 * 1024,
  maxPages: 250,
  maxTextCharacters: 2_000_000
});

console.log(document.pageCount, document.contentHash, document.text);
```

The CLI equivalent is:

```bash
cockroach-documents ./report.pdf --max-pages 100
```

The parser does not fetch URLs, execute embedded JavaScript, or resolve
external document resources.

## XPath extraction

```js
import { extractWithXPath } from "cockroach-crawler/extractors";

const result = extractWithXPath(html, "https://example.com/catalog", {
  fields: {
    heading: "//*[local-name()='h1']",
    links: {
      xpath: "//*[local-name()='main']//*[local-name()='a']",
      source: "attribute",
      attribute: "href",
      resolveUrl: true,
      multiple: true,
      limit: 100
    }
  },
  maxTotalCharacters: 200_000
});
```

Script, style, noscript, and template elements are removed before XPath
evaluation. Returned HTML remains untrusted markup and must not be inserted
into an application DOM without application-specific sanitization.

## Optional LLM schema extraction

Cockroach Crawler does not select a model or read a model key. The application
supplies an adapter and a JSON Schema:

```js
import { extractWithLlm } from "cockroach-crawler/extractors";

const result = await extractWithLlm(page, {
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      product: { type: "string" },
      price: { type: "number" }
    },
    required: ["product", "price"]
  },
  adapter: async ({ content, schema, instruction }) => {
    return modelClient.extract({ content, schema, instruction });
  },
  maxInputCharacters: 100_000,
  maxOutputCharacters: 100_000
});
```

The adapter receives bounded content. The result must be valid JSON and pass
the supplied schema. Model identity, data residency, credential handling,
retry behavior, and billing remain the host's responsibility.

## Provider and proxy escalation

The router composes approved transports without bundling a proxy service:

```js
import { createEscalationRouter } from "cockroach-crawler/providers";

const router = createEscalationRouter({
  providers: [
    { id: "direct", execute: directTransport },
    {
      id: "company-proxy",
      authority: "operator-approved proxy pool",
      credentialed: true,
      execute: companyProxyTransport
    }
  ],
  escalationStatuses: [408, 429, 502, 503, 504],
  maxAttempts: 2
});

const result = await router.execute({ url: "https://example.com/public" });
console.log(result.provider, result.attempts);
```

HTTP access challenges stop the route by default. Setting
`allowChallengeProvider` permits an explicitly configured provider to inspect
the response, but does not add CAPTCHA solving, login bypass, fingerprint
evasion, or authorization bypass.

## Native MCP

Configure origins and launch the stdio server:

```bash
COCKROACH_ALLOWED_ORIGINS=https://docs.example.com \
COCKROACH_MAX_PAGES=20 \
cockroach-mcp
```

The server exposes:

- `crawl` for complete evidence records;
- `map_site` for compact fetch-validated entries;
- `extract_structured` for deterministic CSS extraction;
- `cockroach://capabilities` for the deployment's fixed boundary.

Tool calls may lower maximum pages or depth and may add a relevance query.
They cannot enable private networks, add origins, inject browser hooks, select
credentials, or expand deployment budgets.

## Docker API and playground

Build:

```bash
docker build -t cockroach-crawler:0.4.1 .
```

Run with an API token and fixed origins:

```bash
docker run --rm -p 3878:3878 \
  -e COCKROACH_API_TOKEN="replace-with-a-long-random-secret" \
  -e COCKROACH_ALLOWED_ORIGINS="https://docs.example.com" \
  -e COCKROACH_MAX_PAGES=20 \
  cockroach-crawler:0.4.1
```

Endpoints:

- `GET /health`;
- `GET /` and `GET /playground`;
- authenticated `POST /v1/crawl`;
- authenticated `POST /v1/extract`.

The request body can provide seeds and lower page/depth limits. It cannot
provide an origin allowlist, private-network flag, credential, callback,
browser hook, executable path, or profile path.

## Definition of release proof

The capability line is ready for an immutable npm release only when:

1. root and subpath runtime APIs, declaration files, and packed exports agree;
2. core, browser, TypeScript consumer, license, benchmark, Worker, security,
   and tarball gates pass;
3. screenshots, PDF parsing, scroll, flattening, hooks, persistent profiles,
   strategies, cache, extractors, provider escalation, server, and MCP have
   executable tests;
4. npm version, `PACKAGE_VERSION`, changelog, release notes, tag, and
   `dist.integrity` identify the same reviewed commit and artifact.
