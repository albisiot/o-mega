// Photographs characters' 3D dioramas in Chrome, at the size they have on a phone, to look at
// them without a phone: the diorama finished and still (reduced motion), then turned by
// dragging. One PNG per view; any console error is reported. It builds its own little page with
// Vite (the diorama code from src/lib, nothing else), so no dev server is needed, and several
// can run at once.
//
//   node scripts/shoot-dioramas.mjs P055 P013          the dioramas of these cards
//   SHOTS_DIR=shots node scripts/shoot-dioramas.mjs P055   where the PNGs go (default: diorama-shots in the
//                                                          system's temporary folder)
//   SHEET=1 node scripts/shoot-dioramas.mjs P055 P013   also sheet.png: every card's resting view side by side
//
// Uses the Chrome (or Edge) installed on the computer through playwright-core: nothing is
// downloaded. Exit code 1 when a diorama does not open or logs an error.

import { createReadStream, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { build } from "vite";

const codes = process.argv.slice(2);
if (!codes.length) throw new Error("Usage: node scripts/shoot-dioramas.mjs <card code>...");
const dir = process.env.SHOTS_DIR ?? join(tmpdir(), "diorama-shots");
mkdirSync(dir, { recursive: true });

/** Views: how far to drag from the resting angle before each picture, in pixels (0.012 rad each). */
const VIEWS = [
  ["rest", 0],
  ["front", 29],
  ["left", -120],
  ["right", 240],
];

// A page with one canvas the size of the 3D sheet on a phone (62% of a 700 px high screen).
const work = mkdtempSync(join(tmpdir(), "diorama-page-"));
writeFileSync(
  join(work, "index.html"),
  `<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;background:#1b1a22}canvas{display:block;width:360px;height:434px}</style></head><body><canvas></canvas><script type="module" src="./main.ts"></script></body></html>`,
);
writeFileSync(
  join(work, "main.ts"),
  `import { loadCardDiorama, mountCardDiorama } from "@/lib/card-diorama";
(window as unknown as { show: (code: string) => Promise<string> }).show = async (code) => {
  const canvas = document.querySelector("canvas") as HTMLCanvasElement;
  const builder = await loadCardDiorama(code);
  mountCardDiorama(canvas, builder, () => console.error("WebGL context lost"));
  return "ok";
};
`,
);
await build({
  root: work,
  logLevel: "error",
  resolve: { alias: { "@": resolve("src") } },
  build: { outDir: join(work, "dist"), emptyOutDir: true, minify: false, chunkSizeWarningLimit: 4000 },
});

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = createServer((request, response) => {
  const name = decodeURIComponent(new URL(request.url, "http://x").pathname).replace(/^\/+/, "") || "index.html";
  const path = join(work, "dist", name);
  response.setHeader("Content-Type", TYPES[extname(path)] ?? "application/octet-stream");
  createReadStream(path)
    .on("error", () => {
      response.statusCode = 404;
      response.end();
    })
    .pipe(response);
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}`;

async function launch() {
  const args = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];
  for (const channel of ["chrome", "msedge"]) {
    try {
      return await chromium.launch({ channel, args });
    } catch {
      // Try the next browser.
    }
  }
  throw new Error("Neither Chrome nor Edge could be started");
}

const browser = await launch();
let failed = false;
try {
  for (const code of codes) {
    const context = await browser.newContext({ viewport: { width: 360, height: 434 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/index.html`, { waitUntil: "load" });
    const shown = await page.evaluate((card) => window.show(card).catch((error) => String(error)), code);
    if (shown !== "ok") {
      console.log(`${code}: NOT SHOWN (${shown})`);
      failed = true;
      await context.close();
      continue;
    }
    const canvas = page.locator("canvas");
    await page.waitForTimeout(300);
    const box = await canvas.boundingBox();
    const y = box.y + box.height / 2;
    const x = box.x + box.width / 2;
    let turned = 0;
    for (const [name, drag] of VIEWS) {
      // A drag from the canvas centre; a long one is split in two, so it stays on the canvas.
      const step = drag - turned;
      for (const part of Math.abs(step) > 150 ? [step / 2, step / 2] : [step]) {
        if (!part) continue;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + part, y, { steps: 4 });
        await page.mouse.up();
      }
      turned = drag;
      await page.waitForTimeout(80);
      await canvas.screenshot({ path: join(dir, `${code}-${name}.png`) });
    }
    if (errors.length) failed = true;
    console.log(`${code}: ok${errors.length ? `, errors: ${errors.join(" | ")}` : ""}`);
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
  rmSync(work, { recursive: true, force: true });
}

if (process.env.SHEET) {
  // Every resting view in a grid, each labelled with its card code.
  const [w, h, columns] = [260, 314, Math.min(5, codes.length)];
  const tiles = await Promise.all(
    codes.map(async (code, i) => {
      const label = Buffer.from(`<svg width="${w}" height="30"><text x="8" y="22" font-family="sans-serif" font-size="20" fill="#ffd60a">${code}</text></svg>`);
      const input = await sharp(join(dir, `${code}-rest.png`))
        .resize(w, h, { fit: "cover", position: "bottom" })
        .composite([{ input: label, top: 0, left: 0 }])
        .toBuffer()
        .catch(() => null);
      return input && { input, left: (i % columns) * w, top: Math.floor(i / columns) * h };
    }),
  );
  await sharp({ create: { width: w * columns, height: h * Math.ceil(codes.length / columns), channels: 3, background: "#1b1a22" } })
    .composite(tiles.filter(Boolean))
    .png()
    .toFile(join(dir, "sheet.png"));
  console.log(`sheet: ${join(dir, "sheet.png")}`);
}
process.exit(failed ? 1 : 0);
