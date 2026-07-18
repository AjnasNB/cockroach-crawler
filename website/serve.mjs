import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("./dist/", import.meta.url));
const port = Number.parseInt(process.env.PORT ?? "4173", 10);
const types = { ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".mp4": "video/mp4", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8", ".vtt": "text/vtt; charset=utf-8", ".webmanifest": "application/manifest+json", ".xml": "application/xml; charset=utf-8" };

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const safePath = normalize(pathname).replace(/^(?:\.\.(?:[\\/]|$))+/, "");
  let file = join(dist, safePath);
  if (pathname.endsWith("/")) file = join(file, "index.html");
  try {
    let info = await stat(file);
    if (info.isDirectory()) {
      file = join(file, "index.html");
      info = await stat(file);
    }
    const headers = { "Content-Type": types[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store", "Accept-Ranges": "bytes" };
    const range = request.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
    if (range) {
      const suffixLength = range[1] === "" ? Number.parseInt(range[2], 10) : null;
      const start = suffixLength === null ? Number.parseInt(range[1], 10) : Math.max(info.size - suffixLength, 0);
      const end = suffixLength === null && range[2] !== "" ? Math.min(Number.parseInt(range[2], 10), info.size - 1) : info.size - 1;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= info.size) {
        response.writeHead(416, { ...headers, "Content-Range": `bytes */${info.size}` });
        response.end();
        return;
      }
      response.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${info.size}`, "Content-Length": end - start + 1 });
      if (request.method === "HEAD") response.end();
      else createReadStream(file, { start, end }).pipe(response);
      return;
    }
    response.writeHead(200, { ...headers, "Content-Length": info.size });
    if (request.method === "HEAD") response.end();
    else createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    createReadStream(join(dist, "404.html")).pipe(response);
  }
}).listen(port, "127.0.0.1", () => console.log(`Cockroach Crawler site: http://127.0.0.1:${port}`));
