import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  contrast,
  customPackColorValue,
  customPalette,
  GRADIENT_PACK_COLORS,
  isPackColor,
  normalizeHex,
  PACK_COLOR_KEYS,
  PACK_COLORS,
  packColor,
  parseCustomPackColor,
  SOLID_PACK_COLORS,
} from "@/lib/pack-colors";

describe("presets", () => {
  it("keeps the six original palettes first, and has 21 in all", () => {
    expect(PACK_COLOR_KEYS.slice(0, 6)).toEqual(["magenta", "cyan", "yellow", "orange", "violet", "green"]);
    expect(PACK_COLOR_KEYS).toHaveLength(21);
    expect(SOLID_PACK_COLORS.length + GRADIENT_PACK_COLORS.length).toBe(21);
  });

  it("are exactly the keys the server accepts", () => {
    const sql = readFileSync("supabase/migrations/20261116230000_special_pack_colors.sql", "utf8");
    const list = /p_color in \(([^)]*)\)/.exec(sql)?.[1] ?? "";
    expect(list.split(",").map((key) => key.trim().replace(/'/g, ""))).toEqual(PACK_COLOR_KEYS);
  });

  it("have a solid accent readable on the black buy button, and readable text", () => {
    for (const key of PACK_COLOR_KEYS) {
      const palette = PACK_COLORS[key];
      expect(normalizeHex(palette.accent), key).not.toBeNull();
      expect(contrast(palette.accent, "#000000"), key).toBeGreaterThanOrEqual(4.5);
      for (const stop of palette.background.match(/#[0-9a-f]{6}/g) ?? []) {
        expect(contrast(stop, palette.ink), `${key} ${stop}`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe("custom colours", () => {
  const custom = { from: "#FF2E6C", to: "#ffd60a", body: "#16c8ff", omega: "#000000" };

  it("are saved in lower case and read back", () => {
    const value = customPackColorValue(custom);
    expect(value).toBe("custom:#ff2e6c:#ffd60a:#16c8ff:#000000");
    expect(parseCustomPackColor(value)).toEqual({ ...custom, from: "#ff2e6c" });
  });

  it("refuse anything but #rrggbb", () => {
    expect(customPackColorValue({ ...custom, body: "blue" })).toBeNull();
    expect(customPackColorValue({ ...custom, body: "#16c8f" })).toBeNull();
    expect(parseCustomPackColor("custom:#ff2e6c:#ffd60a:#16c8ff")).toBeNull();
    expect(parseCustomPackColor("custom:#FF2E6C:#ffd60a:#16c8ff:#000000")).toBeNull();
  });

  it("draw a gradient, or a solid colour when both ends match", () => {
    expect(customPalette({ from: "#ff2e6c", to: "#ffd60a", body: "#16c8ff", omega: "#000000" }).background).toBe(
      "linear-gradient(135deg, #ff2e6c 0%, #ffd60a 100%)",
    );
    expect(customPalette({ from: "#ff2e6c", to: "#ff2e6c", body: "#16c8ff", omega: "#000000" }).background).toBe("#ff2e6c");
  });

  it("pick light text on a dark background and a readable accent", () => {
    const dark = customPalette({ from: "#101010", to: "#202040", body: "#16c8ff", omega: "#ffd60a" });
    expect(dark.ink).toBe("#fff8e7");
    expect(dark.accent).toBe("#ffd60a");
    expect(customPalette({ from: "#ffd60a", to: "#ffd60a", body: "#000000", omega: "#ff2e6c" }).ink).toBe("#000000");
  });
});

describe("isPackColor and packColor", () => {
  it("follow the server's rule", () => {
    expect(isPackColor("sunset")).toBe(true);
    expect(isPackColor("custom:#ff2e6c:#ffd60a:#16c8ff:#000000")).toBe(true);
    expect(isPackColor("toString")).toBe(false);
    expect(isPackColor("#ff2e6c")).toBe(false);
    expect(isPackColor(null)).toBe(false);
  });

  it("fall back to magenta for a colour this app does not know", () => {
    expect(packColor("ultraviolet")).toBe(PACK_COLORS.magenta);
    expect(packColor(null)).toBe(PACK_COLORS.magenta);
    expect(packColor("lava")).toBe(PACK_COLORS.lava);
  });
});
