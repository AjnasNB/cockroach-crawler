# Quickstart

Three ways in. Pick one, copy it, run it.

## 1. Command line, no install

```bash
npx cockroach-crawler https://example.com/docs --max-pages 10 --jsonl --output crawl.jsonl
```

You get one JSON record per page: canonical URL, title, Markdown, links, content
hash, and retrieval metadata.

## 2. As a library

```bash
npm install cockroach-crawler
```

```js
import { crawl } from "cockroach-crawler";

const pages = await crawl({
  seeds: ["https://example.com/docs"],
  maxPages: 25,
  maxDepth: 2
});

console.log(pages[0].markdown);
console.log(pages.stats);
```

Selectors that survive a redesign:

```js
import { Selector } from "cockroach-crawler/parser";

const page = Selector.parse(html, { url: "https://shop.example/catalog" });
page.css(".title::text").getall();
page.css("a::attr(href)").getall();
page.findByText(/sale/iu, { tag: "h2" });
```

## 3. As an MCP server

Cockroach Crawler speaks MCP over stdio, so an agent can crawl without you
writing glue. `COCKROACH_ALLOWED_ORIGINS` is required and is the only thing that
grants network reach — the agent can narrow it but never widen it.

### Claude Code

```bash
claude mcp add cockroach-crawler \
  --env COCKROACH_ALLOWED_ORIGINS=https://example.com \
  -- npx -y cockroach-crawler cockroach-mcp
```

### Claude Desktop, Cursor, Windsurf, Codex

Add this to the host's MCP configuration file:

```json
{
  "mcpServers": {
    "cockroach-crawler": {
      "command": "npx",
      "args": ["-y", "cockroach-crawler", "cockroach-mcp"],
      "env": {
        "COCKROACH_ALLOWED_ORIGINS": "https://example.com,https://docs.example.com"
      }
    }
  }
}
```

Config file locations:

| Host | Path |
| --- | --- |
| Claude Desktop (macOS) | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Desktop (Windows) | `%APPDATA%\Claude\claude_desktop_config.json` |
| Cursor | `~/.cursor/mcp.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |
| Codex | `~/.codex/config.toml` |

The server exposes eight read-only tools:

| Tool | Does |
| --- | --- |
| `crawl` | Bounded evidence crawl of allowed origins |
| `crawl_spider` | Rule-driven crawl following only allow/deny matches |
| `map_site` | Fetch-validated site map, optionally ranked |
| `select` | CSS, XPath, or text query over supplied HTML |
| `find_similar` | Repeated records from one example element |
| `relocate_element` | Recover an element after a redesign |
| `extract_structured` | Deterministic CSS field extraction |
| `export_records` | Serialize records to CSV, XML, JSON, or JSONL |

Restart the host after editing. Then ask it to crawl something inside your
allowed origins.

## Verify the install

```bash
npx cockroach-sources doctor --json
npx cockroach-reach doctor --json
```

Both report the exact access state — which providers are reachable, which need
credentials, and which are unavailable — before you depend on them.

## Where to go next

| You want to | Read |
| --- | --- |
| CLI quickstart and bounded workflow | [CLI guide](https://cockroachcrawler.com/docs/cli/) |
| Selectors, relocation, identity, export | [SELECTORS-AND-IDENTITY.md](SELECTORS-AND-IDENTITY.md) |
| What is and is not supported | [CAPABILITIES.md](CAPABILITIES.md) |
| Network and security boundary | [../SECURITY.md](../SECURITY.md) |
