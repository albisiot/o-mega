import { describe, expect, it } from "vitest";
import {
  COSMETIC_INFO,
  EFFECT_CODES,
  FRAME_CODES,
  breakableCopies,
  cosmeticName,
  cosmeticsByCharacter,
  ownedCosmetics,
  shownCosmetics,
  type AppliedCosmetics,
  type CosmeticsState,
} from "./cosmetics";

const applied = (overrides: Partial<AppliedCosmetics>): AppliedCosmetics => ({
  definition_id: "d1",
  frame: "neon",
  frame_visible: true,
  effect: "snow",
  effect_visible: true,
  effect_serial: 4,
  ...overrides,
});

const state: CosmeticsState = {
  shard_balance: 5,
  costs: { pack: 1, cosmetic: 1, kind: 2, variant: 3 },
  values: { delta: 1, gamma: 2, beta: 3, alfa: 5, omega: 7 },
  catalog: [
    { code: "silver", kind: "frame", name: "Argento", active: true },
    { code: "neon", kind: "frame", name: "Neon", active: true },
    { code: "retired", kind: "frame", name: "Vecchia", active: false },
    { code: "snow", kind: "effect", name: "Neve", active: true },
    { code: "numbered", kind: "effect", name: "Numerata", active: true },
  ],
  inventory: [
    { code: "neon", count: 2, serial: 7 },
    { code: "retired", count: 1, serial: 1 },
    { code: "numbered", count: 1, serial: 12 },
    { code: "silver", count: 0, serial: 3 },
  ],
  applied: [applied({ definition_id: "d1" }), applied({ definition_id: "d2", frame_visible: false, effect_visible: false })],
  breakable: [{ variant_id: "v1", definition_id: "d1", copies: 3, breakable: 2 }],
  missing_variants: 40,
};

describe("cosmetics", () => {
  it("names every frame and effect the server sells", () => {
    for (const code of [...FRAME_CODES, ...EFFECT_CODES]) expect(COSMETIC_INFO[code].name.length).toBeGreaterThan(1);
    expect(new Set([...FRAME_CODES, ...EFFECT_CODES]).size).toBe(FRAME_CODES.length + EFFECT_CODES.length);
  });

  it("shows only the visible looks, with the serial of a numbered card", () => {
    expect(shownCosmetics(applied({}))).toEqual({ frame: "neon", effect: "snow", serial: null });
    expect(shownCosmetics(applied({ effect: "numbered" }))).toEqual({ frame: "neon", effect: "numbered", serial: 4 });
    expect(shownCosmetics(applied({ frame_visible: false }))).toEqual({ frame: null, effect: "snow", serial: null });
    expect(shownCosmetics(applied({ frame_visible: false, effect_visible: false }))).toBeNull();
    expect(shownCosmetics(applied({ frame: "unknown", effect: null }))).toBeNull();
    expect(shownCosmetics(null)).toBeNull();
  });

  it("maps the looks by character, leaving out hidden ones", () => {
    const looks = cosmeticsByCharacter(state);
    expect(looks.get("d1")?.frame).toBe("neon");
    expect(looks.has("d2")).toBe(false);
    expect(cosmeticsByCharacter(null).size).toBe(0);
  });

  it("lists what the player owns, in the catalog's order, without looks the app cannot draw", () => {
    expect(ownedCosmetics(state, "frame").map((item) => [item.code, item.count])).toEqual([["neon", 2]]);
    expect(ownedCosmetics(state, "effect")).toEqual([{ code: "numbered", kind: "effect", name: "Numerata", count: 1, serial: 12 }]);
    expect(ownedCosmetics(null, "frame")).toEqual([]);
  });

  it("counts the copies of a variant that can be broken", () => {
    expect(breakableCopies(state, "v1")).toBe(2);
    expect(breakableCopies(state, "v2")).toBe(0);
    expect(breakableCopies(null, "v1")).toBe(0);
  });

  it("names a look from the server, or from the app", () => {
    expect(cosmeticName(state, "neon")).toBe("Neon");
    expect(cosmeticName(null, "gold")).toBe("Oro");
  });
});
