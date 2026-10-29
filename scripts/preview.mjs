// Serves the static export in `out/` the way GitHub Pages does, including the
// basePath (read from NEXT_PUBLIC_BASE_PATH, e.g. "/o-mega"). No dependencies.
// Usage: npm run build && npm run preview

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const OUT_DIR = join(process.cwd(), "out");
const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");
const PORT = Number(process.env.PORT ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

async function resolveFile(pathname) {
  const file = normalize(join(OUT_DIR, decodeURIComponent(pathname)));
  if (!file.startsWith(OUT_DIR)) return null;
  const info = await stat(file).catch(() => null);
  if (info?.isFile()) return file;
  if (info?.isDirectory()) return resolveFile(join(pathname, "index.html"));
  return null;
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");

  if (!pathname.startsWith(`${BASE_PATH}/`)) {
    res.writeHead(302, { location: `${BASE_PATH}/` }).end();
    return;
  }

  const relative = pathname.slice(BASE_PATH.length);
  // Like GitHub Pages: "/foo" redirects to "/foo/" when it is a folder.
  if (!relative.endsWith("/") && !extname(relative) && (await resolveFile(`${relative}/`))) {
    res.writeHead(301, { location: `${pathname}/` }).end();
    return;
  }

  const file = (await resolveFile(relative)) ?? (await resolveFile("/404.html"));
  if (!file) {
    res.writeHead(404).end("Not found");
    return;
  }
  const status = file.endsWith("404.html") && !relative.endsWith("404.html") ? 404 : 200;
  res.writeHead(status, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  res.end(await readFile(file));
}).listen(PORT, () => {
  console.log(`Anteprima dell'export statico: http://localhost:${PORT}${BASE_PATH}/`);
});
