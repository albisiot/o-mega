import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NAME_FONTS, nameCss, nameShadow, nameStyle, nameWidth, STYLED_CODES, type NameFont } from "./card-names";

const CODES = Array.from({ length: 187 }, (_, i) => `P${String(i + 1).padStart(3, "0")}`);
const HEX = /^#[0-9a-f]{6}$/i;

describe("card name styles", () => {
  it("give every character of the catalog a look of its own", () => {
    expect([...STYLED_CODES].sort()).toEqual(CODES);
    const looks = CODES.map((code) => {
      const style = nameStyle({ code, faction: "heroes" });
      return JSON.stringify([style.font, style.fill, style.side]);
    });
    expect(new Set(looks).size).toBe(CODES.length);
  });

  it("use hex extrusion colors, which the shading mixes", () => {
    for (const code of CODES) {
      const { side } = nameStyle({ code, faction: "heroes" });
      expect(side.every((color) => HEX.test(color)), code).toBe(true);
    }
  });

  it("fall back to the faction's colors for a character added later", () => {
    const hero = nameStyle({ code: "P999", faction: "heroes" });
    const villain = nameStyle({ faction: "villains" });
    expect(hero.font).toBe("anton");
    expect(hero.fill).not.toBe(villain.fill);
  });

  it("make longer names and wider typefaces take more room", () => {
    const style = nameStyle({ code: "P001", faction: "heroes" });
    expect(nameWidth("Mongibello", style)).toBeGreaterThan(nameWidth("Glip", style));
    expect(nameWidth("Gantry", { ...style, font: "scifi" })).toBeGreaterThan(nameWidth("Gantry", { ...style, font: "anton" }));
  });

  it("extrude, close and shade every name", () => {
    const shadow = nameShadow(nameStyle({ code: "P060", faction: "heroes" }));
    expect(shadow.split(", ").length).toBeGreaterThan(10);
    const css = nameCss("Mongibello", nameStyle({ code: "P060", faction: "heroes" })) as Record<string, unknown>;
    expect(css["--nm-case"]).toBe("uppercase");
    expect((nameCss("Belladonna", nameStyle({ code: "P016", faction: "villains" })) as Record<string, unknown>)["--nm-case"]).toBe(
      "none",
    );
  });

  it("have the 3D letter outlines of every typeface", () => {
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (const font of Object.keys(NAME_FONTS) as NameFont[]) {
      const data = JSON.parse(readFileSync(new URL(`../../public/fonts/names/${font}.json`, import.meta.url), "utf8"));
      const needed = NAME_FONTS[font].mixedCase ? upper + upper.toLowerCase() : upper;
      for (const letter of needed) expect(data.glyphs[letter]?.o, `${font} ${letter}`).toBeTruthy();
    }
  });
});
