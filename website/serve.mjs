import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("./dist/", import.meta.url));
const port = Number.parseInt(process.env.PORT ?? "4173", 10);
const types = { ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json", ".xml": "application/xml; charset=utf-8" };

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const safePath = normalize(pathname).replace(/^(?:\.\.(?:[\\/]|$))+/, "");
  let file = join(dist, safePath);
  if (pathname.endsWith("/")) file = join(file, "index.html");
  try {
    const info = await stat(file);
    if (info.isDirectory()) file = join(file, "index.html");
    response.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    createReadStream(join(dist, "404.html")).pipe(response);
  }
}).listen(port, "127.0.0.1", () => console.log(`Cockroach Crawler site: http://127.0.0.1:${port}`));
