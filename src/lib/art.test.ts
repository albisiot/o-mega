import { existsSync, readdirSync } from "node:fs";
import { sep } from "node:path";
import { describe, expect, it } from "vitest";
import { fullArtUrl, motionArtUrl, thumbArtUrl } from "./art";
import { FULL_ART } from "./full-art";
import { MOTION_ART } from "./motion-art";

describe("motionArtUrl", () => {
  it("points an animated drawing to its looping video", () => {
    expect(motionArtUrl("/cards/variants/P044-inferno.webp")).toBe("/cards/motion/variants/P044-inferno.mp4");
  });

  it("is null for still drawings and for other paths", () => {
    expect(motionArtUrl("/cards/variants/P072-neon.webp")).toBeNull();
    expect(motionArtUrl("/cards/P044.webp")).toBeNull();
    expect(motionArtUrl("/world/citta.webp")).toBeNull();
  });

  it("knows exactly the videos in public/cards/motion, each for a drawing that exists", () => {
    const files = readdirSync(new URL("../../public/cards/motion/", import.meta.url), { recursive: true, encoding: "utf8" })
      .map((file) => file.split(sep).join("/"))
      .filter((file) => file.endsWith(".mp4"))
      .sort();
    expect([...MOTION_ART].sort(), "run node scripts/list-motion-art.mjs").toEqual(files);
    const orphans = files.filter((file) => !existsSync(new URL(`../../public/cards/${file.replace(/\.mp4$/, ".webp")}`, import.meta.url)));
    expect(orphans).toEqual([]);
  });
});

describe("fullArtUrl", () => {
  it("points base cards and variants to their larger copy", () => {
    expect(fullArtUrl("/cards/P064.webp")).toBe("/cards/full/P064.webp");
    expect(fullArtUrl("/cards/variants/P072-neon.webp")).toBe("/cards/full/variants/P072-neon.webp");
  });

  it("is null for drawings without a larger copy and for other paths", () => {
    expect(fullArtUrl("/cards/P030.webp")).toBeNull();
    expect(fullArtUrl("/world/citta.webp")).toBeNull();
  });

  it("knows exactly the larger copies in public/cards/full", () => {
    const files = readdirSync(new URL("../../public/cards/full/", import.meta.url), { recursive: true, encoding: "utf8" })
      .map((file) => file.split(sep).join("/"))
      .filter((file) => file.endsWith(".webp"))
      .sort();
    expect([...FULL_ART].sort(), "run node scripts/list-full-art.mjs").toEqual(files);
  });
});

describe("thumbArtUrl", () => {
  it("points base cards and variants to their thumbnail", () => {
    expect(thumbArtUrl("/cards/P064.webp")).toBe("/cards/thumb/P064.webp");
    expect(thumbArtUrl("/cards/variants/P072-neon.webp")).toBe("/cards/thumb/variants/P072-neon.webp");
  });

  it("exists for every drawing in public/cards", () => {
    for (const dir of ["", "variants/"]) {
      const drawings = readdirSync(new URL(`../../public/cards/${dir}`, import.meta.url)).filter((name) => name.endsWith(".webp"));
      const missing = drawings.filter((name) => !existsSync(new URL(`../../public${thumbArtUrl(`/cards/${dir}${name}`)}`, import.meta.url)));
      expect(missing, "run node scripts/generate-thumbs.mjs").toEqual([]);
    }
  });
});
