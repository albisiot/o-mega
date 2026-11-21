import { describe, expect, it } from "vitest";
import type { CatalogCard } from "@/lib/collection";
import type { AppliedCosmetics } from "@/lib/cosmetics";
import { lookWith, previewCharacter } from "@/lib/cosmetic-preview";

const card = (id: string, rank: number) => ({ id, rarity: { rank } }) as unknown as CatalogCard;
const catalog = [card("a", 1), card("b", 4), card("c", 4), card("d", 5)];
const applied = (definition_id: string, frame: string | null, effect: string | null): AppliedCosmetics => ({
  definition_id,
  frame,
  frame_visible: true,
  effect,
  effect_visible: true,
  effect_serial: null,
});

describe("previewCharacter", () => {
  it("shows the rarest character the player owns", () => {
    const owned = new Map([["a", { copies: 2 }], ["b", { copies: 1 }], ["d", { copies: 0 }]]);
    expect(previewCharacter(catalog, owned, [], "frame")?.id).toBe("b");
  });

  it("takes the first in the album among equals", () => {
    const owned = new Map([["c", { copies: 1 }], ["b", { copies: 1 }]]);
    expect(previewCharacter(catalog, owned, [], "effect")?.id).toBe("b");
  });

  it("prefers a character with no look of that kind yet", () => {
    const owned = new Map([["a", { copies: 1 }], ["b", { copies: 1 }], ["d", { copies: 1 }]]);
    const looks = [applied("d", "gold", null), applied("b", null, "holo")];
    expect(previewCharacter(catalog, owned, looks, "frame")?.id).toBe("b");
    expect(previewCharacter(catalog, owned, looks, "effect")?.id).toBe("d");
  });

  it("falls back to the rarest when every character has one", () => {
    const owned = new Map([["a", { copies: 1 }], ["d", { copies: 1 }]]);
    expect(previewCharacter(catalog, owned, [applied("a", "neon", null), applied("d", "gold", null)], "frame")?.id).toBe("d");
  });

  it("is null without characters", () => {
    expect(previewCharacter(catalog, new Map(), [], "frame")).toBeNull();
  });
});

describe("lookWith", () => {
  it("puts a frame on and keeps the effect", () => {
    expect(lookWith({ frame: "neon", effect: "numbered", serial: 4 }, { code: "gold", kind: "frame", serial: 9 })).toEqual({
      frame: "gold",
      effect: "numbered",
      serial: 4,
    });
  });

  it("puts an effect on, with the serial of a numbered one", () => {
    expect(lookWith({ frame: "neon", effect: "holo", serial: null }, { code: "numbered", kind: "effect", serial: 12 })).toEqual({
      frame: "neon",
      effect: "numbered",
      serial: 12,
    });
    expect(lookWith(null, { code: "snow", kind: "effect", serial: 3 })).toEqual({ frame: null, effect: "snow", serial: null });
  });
});
