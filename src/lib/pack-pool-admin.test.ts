import { describe, expect, it } from "vitest";
import { rarityCount, searchPackCards, type PackPoolCard } from "@/lib/pack-pool-admin";

const card = (code: string, name: string, rarity_code: string, in_packs = true): PackPoolCard => ({
  code,
  name,
  rarity_code,
  art_url: null,
  in_packs,
});

const cards = [
  card("P001", "Foundling", "delta"),
  card("P002", "Écho Nero", "delta", false),
  card("P051", "Vetrix", "alfa"),
];

describe("searchPackCards", () => {
  it("finds a name ignoring case and accents", () => {
    expect(searchPackCards(cards, "eCHO").map((c) => c.code)).toEqual(["P002"]);
  });

  it("finds a code", () => {
    expect(searchPackCards(cards, "p051").map((c) => c.name)).toEqual(["Vetrix"]);
  });

  it("keeps every card for an empty search", () => {
    expect(searchPackCards(cards, "  ")).toBe(cards);
  });
});

describe("rarityCount", () => {
  it("counts the cards in packs out of the rarity's cards", () => {
    expect(rarityCount(cards, "delta")).toEqual({ inPacks: 1, total: 2 });
    expect(rarityCount(cards, "omega")).toEqual({ inPacks: 0, total: 0 });
  });
});
