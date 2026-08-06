import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";

import { createCockroachMcpServer } from "../src/mcp.js";

const PAGE = `<html><body><div id="app"><ul class="products">
<li class="product" data-id="1"><h2 class="title">Widget A</h2><a href="/a">Buy</a><span class="price">$10</span></li>
<li class="product" data-id="2"><h2 class="title">Widget B</h2><a href="/b">Buy</a><span class="price">$20</span></li>
<li class="promo"><h2 class="title">Clearance</h2></li>
</ul></div></body></html>`;

const REDESIGNED = `<html><body><div id="app"><section><ul class="items">
<li class="card" data-id="1"><h3 class="name">Widget A</h3><span class="cost">$10</span></li>
</ul></section></div></body></html>`;

let server;
let baseUrl;

before(async () => {
  server = createServer((request, response) => {
    if (request.url === "/robots.txt") {
      response.setHeader("content-type", "text/plain");
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    response.setHeader("content-type", "text/html");
    if (request.url === "/") {
      response.end(`<html><head><title>Home</title></head><body><main><h1>Home</h1>
        <a href="/product/a">A</a><a href="/about">About</a></main></body></html>`);
      return;
    }
    if (request.url === "/product/a") {
      response.end("<html><head><title>Product A</title></head><body><main><h1>Product A</h1></main></body></html>");
      return;
    }
    response.end("<html><head><title>About</title></head><body><main><h1>About</h1></main></body></html>");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

function build(overrides = {}) {
  return createCockroachMcpServer({
    crawlDefaults: {
      allowedOrigins: [baseUrl],
      allowPrivateNetworks: true,
      maxPages: 5,
      maxDepth: 2,
      ...overrides
    }
  });
}

async function call(server_, name, args) {
  const tool = server_.tools.get(name);
  assert.ok(tool, `tool ${name} should be registered`);
  return tool.run(tool.schema.parse(args));
}

test("the new tools are advertised with schemas and read-only annotations", () => {
  const mcp = build();
  for (const name of ["select", "find_similar", "relocate_element", "crawl_spider", "export_records"]) {
    const tool = mcp.tools.get(name);
    assert.ok(tool, `${name} must be registered`);
    assert.equal(tool.definition.name, name);
    assert.equal(tool.definition.annotations.readOnlyHint, true);
    assert.equal(tool.definition.annotations.destructiveHint, false);
    assert.equal(tool.definition.inputSchema.additionalProperties ?? false, false);
    assert.ok(tool.definition.description.length > 20);
  }
});

test("select runs css with pseudo-elements and resolves urls", async () => {
  const mcp = build();
  const text = await call(mcp, "select", { html: PAGE, css: ".title::text" });
  assert.equal(text.structuredContent.matched, 3);
  assert.deepEqual(
    text.structuredContent.items.map((item) => item.text),
    ["Widget A", "Widget B", "Clearance"]
  );

  const attr = await call(mcp, "select", { html: PAGE, url: "https://shop.test/c", css: "a::attr(href)" });
  assert.equal(attr.structuredContent.items[0].attributes.href, "/a");
});

test("select supports xpath and text search", async () => {
  const mcp = build();
  const byXpath = await call(mcp, "select", { html: PAGE, xpath: "//span[@class='price']" });
  assert.equal(byXpath.structuredContent.matched, 2);

  const byText = await call(mcp, "select", { html: PAGE, text: "Widget B" });
  assert.equal(byText.structuredContent.items[0].tag, "h2");

  const scoped = await call(mcp, "select", { html: PAGE, text: "Widget", tag: "h2" });
  assert.equal(scoped.structuredContent.matched, 2);
});

test("select requires one query and rejects unknown fields", async () => {
  const mcp = build();
  await assert.rejects(() => call(mcp, "select", { html: PAGE }), /Supply one of css, xpath, or text/);
  assert.throws(() => mcp.tools.get("select").schema.parse({ html: PAGE, nope: 1 }));
});

test("select honours its limit", async () => {
  const mcp = build();
  const limited = await call(mcp, "select", { html: PAGE, css: "li", limit: 2 });
  assert.equal(limited.structuredContent.matched, 2);
});

test("find_similar pulls the repeated records from one example", async () => {
  const mcp = build();
  const result = await call(mcp, "find_similar", { html: PAGE, selector: "li.product", threshold: 0.7 });
  assert.ok(result.structuredContent.matched >= 2);
  assert.ok(result.structuredContent.items.every((item) => item.tag === "li"));
});

test("find_similar rejects a selector that matches nothing", async () => {
  const mcp = build();
  await assert.rejects(
    () => call(mcp, "find_similar", { html: PAGE, selector: ".missing" }),
    /selector matched no element/
  );
});

test("relocate_element recovers an element across a redesign", async () => {
  const mcp = build();
  const result = await call(mcp, "relocate_element", {
    originalHtml: PAGE,
    updatedHtml: REDESIGNED,
    selector: "li.product[data-id='1'] h2.title"
  });
  assert.equal(result.structuredContent.found, true);
  assert.equal(result.structuredContent.element.text, "Widget A");
  assert.equal(result.structuredContent.element.tag, "h3");
});

test("relocate_element reports a miss instead of guessing", async () => {
  const mcp = build();
  const result = await call(mcp, "relocate_element", {
    originalHtml: PAGE,
    updatedHtml: "<html><body><p>Service unavailable</p></body></html>",
    selector: "li.product[data-id='1'] h2.title"
  });
  assert.equal(result.structuredContent.found, false);
  assert.equal(result.structuredContent.element, null);
});

test("crawl_spider follows only urls matching the rules", async () => {
  const mcp = build();
  const result = await call(mcp, "crawl_spider", {
    urls: [`${baseUrl}/`],
    allow: ["/product/", "/"],
    deny: ["/about"]
  });
  const urls = result.structuredContent.items.map((item) => item.url);
  assert.ok(urls.some((url) => url.endsWith("/product/a")), `expected the product page in ${urls.join(", ")}`);
  assert.equal(urls.some((url) => url.endsWith("/about")), false);
});

test("crawl_spider cannot widen the deployment origin allowlist", async () => {
  const mcp = build();
  await assert.rejects(() => call(mcp, "crawl_spider", { urls: ["https://elsewhere.test/"] }));
});

test("export_records serializes every published format", async () => {
  const mcp = build();
  const records = [{ title: "Widget A", price: 10 }, { title: "Widget B", price: 20 }];
  for (const format of ["csv", "xml", "jsonl", "json"]) {
    const result = await call(mcp, "export_records", { records, format });
    assert.equal(result.structuredContent.rows, 2);
    assert.ok(result.structuredContent.output.includes("Widget A"), `${format} output`);
  }
});

test("export_records projects columns and guards csv formula injection", async () => {
  const mcp = build();
  const projected = await call(mcp, "export_records", {
    records: [{ title: "A", price: 1 }],
    format: "csv",
    columns: ["title"]
  });
  assert.equal(projected.structuredContent.output.trimEnd(), "title\nA");

  const guarded = await call(mcp, "export_records", {
    records: [{ formula: "=cmd|calc" }],
    format: "csv"
  });
  assert.match(guarded.structuredContent.output, /'=cmd/);
});

test("export_records rejects an unknown format", () => {
  const mcp = build();
  assert.throws(() => mcp.tools.get("export_records").schema.parse({ records: [{ a: 1 }], format: "yaml" }));
});
