import { describe, expect, it } from "vitest";
import { fullArtUrl } from "./art";

describe("fullArtUrl", () => {
  it("points base cards and variants to their larger copy", () => {
    expect(fullArtUrl("/cards/P064.webp")).toBe("/cards/full/P064.webp");
    expect(fullArtUrl("/cards/variants/P072-neon.webp")).toBe("/cards/full/variants/P072-neon.webp");
  });

  it("leaves other paths alone", () => {
    expect(fullArtUrl("/world/citta.webp")).toBe("/world/citta.webp");
  });
});
