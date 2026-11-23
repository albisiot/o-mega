// Photographs the 3D dioramas of /prova-modelli (a page that exists in `next dev` only) in Chrome,
// at a phone's size, to look at them without a phone: the diorama finished and still (reduced
// motion), then turned by dragging. One PNG per view, and any console error is reported.
//
//   node scripts/shoot-dioramas.mjs P055 P013          the dioramas of these cards
//   SHOTS_DIR=shots node scripts/shoot-dioramas.mjs P055   where the PNGs go (default: diorama-shots in the
//                                                          system's temporary folder)
//   DIORAMA_URL=http://localhost:3000 ...              the dev server to use (default: that one)
//
// Uses the Chrome (or Edge) installed on the computer through playwright-core: nothing is
// downloaded. Exit code 1 when a diorama does not open or logs an error.

import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

const codes = process.argv.slice(2);
if (!codes.length) throw new Error("Usage: node scripts/shoot-dioramas.mjs <card code>...");
const base = (process.env.DIORAMA_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const dir = process.env.SHOTS_DIR ?? join(tmpdir(), "diorama-shots");
mkdirSync(dir, { recursive: true });

/** Views: how far to drag from the resting angle before each picture, in pixels (0.012 rad each). */
const VIEWS = [
  ["rest", 0],
  ["front", 29],
  ["left", -120],
  ["right", 240],
];

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
    const context = await browser.newContext({ viewport: { width: 360, height: 700 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/prova-modelli/`, { waitUntil: "networkidle" });
    const button = page.locator(`[data-code="${code}"] button`, { hasText: "Guarda in 3D" });
    if (!(await button.count())) {
      console.log(`${code}: not in /prova-modelli`);
      failed = true;
      await context.close();
      continue;
    }
    await button.click();
    const canvas = page.locator("dialog[open] canvas");
    await canvas.waitFor();
    await page.waitForTimeout(1500);
    const box = await canvas.boundingBox();
    const y = box.y + box.height / 2;
    let x = box.x + box.width / 2;
    let turned = 0;
    for (const [name, drag] of VIEWS) {
      // A drag from the canvas centre; a long one is split in two, so it stays on the canvas.
      for (const step of drag > 150 || drag < -150 ? [drag / 2, drag / 2] : [drag - turned]) {
        if (!step) continue;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + step, y, { steps: 4 });
        await page.mouse.up();
      }
      turned = drag;
      await page.waitForTimeout(150);
      await canvas.screenshot({ path: join(dir, `${code}-${name}.png`) });
      x = box.x + box.width / 2;
    }
    const failedText = await page.locator("dialog[open]").getByText("Modello non disponibile").count();
    if (failedText || errors.length) failed = true;
    console.log(`${code}: ${failedText ? "NOT AVAILABLE" : "ok"}${errors.length ? `, errors: ${errors.join(" | ")}` : ""}`);
    await context.close();
  }
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
