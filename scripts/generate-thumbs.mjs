// Writes the small copy of every card drawing used by album tiles and small
// cards: public/cards/thumb/<same path>, 360px wide, WebP quality 70.
// Uses the sharp copy installed with Next. Usage: node scripts/generate-thumbs.mjs
// Run it after adding or redrawing art; src/lib/art.test.ts fails while a thumbnail is missing.

import { mkdir, readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";

const CARDS = "public/cards";
const SOURCES = ["", "variants"];
const WIDTH = 360;

let written = 0;
for (const dir of SOURCES) {
  for (const name of await readdir(join(CARDS, dir))) {
    if (!name.endsWith(".webp")) continue;
    const source = join(CARDS, dir, name);
    const target = join(CARDS, "thumb", dir, name);
    const [from, to] = await Promise.all([stat(source), stat(target).catch(() => null)]);
    if (to && to.mtimeMs >= from.mtimeMs) continue;
    await mkdir(dirname(target), { recursive: true });
    await sharp(source).resize({ width: WIDTH }).webp({ quality: 70, effort: 6 }).toFile(target);
    written += 1;
    console.log(target);
  }
}
console.log(`${written} thumbnails written`);
