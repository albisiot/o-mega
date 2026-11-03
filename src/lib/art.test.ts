import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fullArtUrl, thumbArtUrl } from "./art";

describe("fullArtUrl", () => {
  it("points base cards and variants to their larger copy", () => {
    expect(fullArtUrl("/cards/P064.webp")).toBe("/cards/full/P064.webp");
    expect(fullArtUrl("/cards/variants/P072-neon.webp")).toBe("/cards/full/variants/P072-neon.webp");
  });

  it("leaves other paths alone", () => {
    expect(fullArtUrl("/world/citta.webp")).toBe("/world/citta.webp");
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
