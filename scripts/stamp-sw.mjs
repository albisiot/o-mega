// Fills in the service worker placeholders after `next build`: the commit the
// site was built from, a content hash of every art, font and model file, and
// the list of the build's files under _next/static/.
// Usage (deploy workflow): node scripts/stamp-sw.mjs out <build-id>

import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const [outDir = "out", build = "local"] = process.argv.slice(2);
const ASSET_DIRS = ["cards", "world", "fonts", "models"];

const versions = {};
for (const dir of ASSET_DIRS) {
  for (const entry of await readdir(join(outDir, dir), { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = join(entry.parentPath, entry.name);
    const hash = createHash("sha256").update(await readFile(file)).digest("hex").slice(0, 10);
    versions[relative(outDir, file).split(sep).join("/")] = hash;
  }
}

// Their names carry a content hash: the worker keeps these across deploys and drops the others.
const nextDir = join(outDir, "_next", "static");
const nextFiles = (await readdir(nextDir, { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile())
  .map((entry) => relative(nextDir, join(entry.parentPath, entry.name)).split(sep).join("/"))
  .sort();

const swPath = join(outDir, "sw.js");
const sw = (await readFile(swPath, "utf8"))
  .replace("__BUILD_ID__", build)
  .replace("{} /* __ASSET_VERSIONS__ */", JSON.stringify(versions))
  .replace("[] /* __NEXT_FILES__ */", JSON.stringify(nextFiles));
await writeFile(swPath, sw);
console.log(`sw.js stamped: build ${build}, ${Object.keys(versions).length} asset versions, ${nextFiles.length} build files`);
