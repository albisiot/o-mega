// Layout check of the result pages: plays the fixed scenes of /prova-tavole (a page that exists
// in `next dev` only) in Chrome, at a phone's size and at a short phone's size, and reports any
// text that covers other text for half a second or more while the page plays and once it is
// over. Short overlaps (a sound effect word stamping in) are allowed.
//
//   npm run test:layout                 starts `next dev` on port 3210 and stops it at the end
//   LAYOUT_URL=http://localhost:3000 npm run test:layout     uses a dev server already running
//   npm run test:layout -- tre-fumetti  only the scenes whose name contains "tre-fumetti"
//
// Uses the Chrome (or Edge) installed on the computer through playwright-core: nothing is
// downloaded. Exit code 1 when something overlaps.

import { spawn, spawnSync } from "node:child_process";
import { chromium } from "playwright-core";

const VIEWPORTS = [
  { name: "telefono 375×812", width: 375, height: 812 },
  { name: "telefono basso 375×667", width: 375, height: 667 },
];
/** Samples a pair must overlap in a row to count (every 100 ms: half a second). */
const MIN_SAMPLES = 5;
/** Share of the smaller text box that must be covered. */
const MIN_SHARE = 0.2;
const filter = process.argv[2] ?? "";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(url, ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Not up yet.
    }
    await sleep(1000);
  }
  throw new Error(`${url} did not answer in ${ms / 1000} s`);
}

let server = null;
// On Windows the server runs under a shell: stop the whole tree.
const stopServer = () => {
  if (!server) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], { stdio: "ignore" });
  else server.kill();
  server = null;
};
let base = process.env.LAYOUT_URL?.replace(/\/+$/, "");
if (!base) {
  base = "http://localhost:3210";
  server = spawn("npx next dev -p 3210", { shell: true, stdio: "ignore", env: { ...process.env, NEXT_PUBLIC_BASE_PATH: "" } });
}

async function launch() {
  for (const channel of ["chrome", "msedge"]) {
    try {
      return await chromium.launch({ channel });
    } catch {
      // Try the next browser.
    }
  }
  throw new Error("Neither Chrome nor Edge found: install one of them.");
}

/** Runs in the page: samples the text boxes until the page is over, then 1.5 s more. */
async function sample({ minShare }) {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const opacity = (element) => {
    let value = 1;
    for (let e = element; e && e !== document.body; e = e.parentElement) {
      const style = getComputedStyle(e);
      if (style.display === "none" || style.visibility === "hidden") return 0;
      value *= Number(style.opacity);
    }
    return value;
  };
  const label = (node) => {
    const element = node.parentElement;
    const anchor = element.closest("[data-fx]")?.getAttribute("data-fx");
    return `«${node.textContent.trim().slice(0, 24)}»${anchor ? ` (${anchor})` : ""}`;
  };
  const runs = new Map();
  const found = new Map();
  let doneAt = null;
  const started = performance.now();
  while (performance.now() - started < 60000) {
    if (doneAt === null && document.documentElement.dataset.done) doneAt = performance.now();
    if (doneAt !== null && performance.now() - doneAt > 1500) break;
    const root = document.body;
    const boxes = [];
    if (root) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent.trim()) continue;
        const element = node.parentElement;
        // A cut-in crosses the whole page on purpose; flying tokens and sparks pass over.
        if (!element || element.closest(".comic-cutin, .fx-token, .fx-spark")) continue;
        if (opacity(element) < 0.5) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        // A line's box is taller than its letters (the font's ascent and descent): keep the
        // middle band where the letters are, about 0.7 em, or two lines one under the other touch.
        const core = parseFloat(getComputedStyle(element).fontSize) * 0.7;
        for (const line of range.getClientRects()) {
          if (line.width <= 2 || line.height <= 2) continue;
          const middle = line.top + line.height / 2;
          const half = Math.min(line.height, core) / 2;
          const rect = { left: line.left, right: line.right, top: middle - half, bottom: middle + half, width: line.width, height: half * 2 };
          boxes.push({ node, element, rect });
        }
      }
    }
    const seen = new Set();
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.element === b.element || a.element.contains(b.element) || b.element.contains(a.element)) continue;
        const w = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
        const h = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
        if (w <= 2 || h <= 2) continue;
        const share = (w * h) / Math.min(a.rect.width * a.rect.height, b.rect.width * b.rect.height);
        if (share < minShare) continue;
        const key = [label(a.node), label(b.node)].sort().join(" × ");
        if (seen.has(key)) continue;
        seen.add(key);
        const run = (runs.get(key) ?? 0) + 1;
        runs.set(key, run);
        const best = found.get(key) ?? { run: 0, share: 0 };
        found.set(key, { run: Math.max(best.run, run), share: Math.max(best.share, share) });
      }
    }
    for (const key of runs.keys()) if (!seen.has(key)) runs.set(key, 0);
    await sleep(100);
  }
  return { done: doneAt !== null, pairs: [...found.entries()].map(([key, value]) => ({ key, ...value })) };
}

let failures = 0;
const browser = await (async () => {
  try {
    await waitFor(`${base}/prova-tavole/`, 180000);
    return await launch();
  } catch (error) {
    stopServer();
    throw error;
  }
})();
try {
  const probe = await browser.newPage();
  await probe.goto(`${base}/prova-tavole/`);
  await probe.waitForFunction(() => Array.isArray(window.__SCENES), null, { timeout: 120000 });
  const scenes = (await probe.evaluate(() => window.__SCENES)).filter((scene) => scene.includes(filter));
  await probe.close();

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    console.log(`\n${viewport.name}`);
    for (const scene of scenes) {
      await page.goto(`${base}/prova-tavole/?s=${scene}`);
      await page.waitForFunction(() => document.body.innerText.length > 0, null, { timeout: 60000 });
      const result = await page.evaluate(sample, { minShare: MIN_SHARE });
      const bad = result.pairs.filter((pair) => pair.run >= MIN_SAMPLES);
      failures += bad.length + (result.done ? 0 : 1);
      console.log(`${bad.length === 0 && result.done ? "ok  " : "FAIL"}  ${scene}${result.done ? "" : " (non è arrivata alla fine)"}`);
      for (const pair of bad) {
        console.log(`        ${pair.key}: ${(pair.run / 10).toFixed(1)} s, ${Math.round(pair.share * 100)}%`);
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
  stopServer();
}

console.log(failures === 0 ? "\nNessuna sovrapposizione." : `\n${failures} sovrapposizioni o scene non finite.`);
process.exit(failures === 0 ? 0 : 1);
