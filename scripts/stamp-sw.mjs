// Fills in the service worker placeholders after `next build`: the commit the
// site was built from and a content hash of every art, font and model file.
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

const swPath = join(outDir, "sw.js");
const sw = (await readFile(swPath, "utf8"))
  .replace("__BUILD_ID__", build)
  .replace("{} /* __ASSET_VERSIONS__ */", JSON.stringify(versions));
await writeFile(swPath, sw);
console.log(`sw.js stamped: build ${build}, ${Object.keys(versions).length} asset versions`);
