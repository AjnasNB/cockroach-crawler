import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("Glama metadata identifies the repository maintainer", async () => {
  const manifest = JSON.parse(await readFile(path.join(root, "glama.json"), "utf8"));
  assert.deepEqual(manifest, {
    $schema: "https://glama.ai/mcp/schemas/server.json",
    maintainers: ["AjnasNB"]
  });
});

test("Glama has a dedicated MCP image without changing the HTTP server image", async () => {
  const [glamaDockerfile, serverDockerfile, workflow] = await Promise.all([
    readFile(path.join(root, "Dockerfile.glama"), "utf8"),
    readFile(path.join(root, "Dockerfile"), "utf8"),
    readFile(path.join(root, ".github", "workflows", "ci.yml"), "utf8")
  ]);
  assert.match(glamaDockerfile, /^FROM node:24-bookworm-slim$/m);
  assert.match(glamaDockerfile, /^ENV COCKROACH_ALLOWED_ORIGINS=https:\/\/example\.com$/m);
  assert.match(glamaDockerfile, /^RUN npm ci --omit=dev --ignore-scripts$/m);
  assert.match(glamaDockerfile, /^COPY scripts\/mcp-glama-smoke\.mjs \.\/scripts\/mcp-glama-smoke\.mjs$/m);
  assert.match(glamaDockerfile, /^USER node$/m);
  assert.match(glamaDockerfile, /^CMD \["node", "bin\/cockroach-mcp\.js"\]$/m);
  assert.match(serverDockerfile, /^CMD \["node", "bin\/cockroach-server\.js"\]$/m);
  assert.match(workflow, /run: npm run mcp:glama:smoke/);
  assert.match(workflow, /docker build --file Dockerfile\.glama --tag cockroach-crawler-glama:/);
  assert.match(
    workflow,
    /docker run --rm --entrypoint node cockroach-crawler-glama:\$\{\{ github\.sha \}\} scripts\/mcp-glama-smoke\.mjs/
  );
});
