import { describe, expect, it } from "vitest";
import { foundVariantCount, ownedArt, ownedLooks, type CatalogCard, type OwnedSummary, type OwnedVariant } from "@/lib/collection";

const card: CatalogCard = {
  id: "def-1",
  code: "P082",
  name: "Abeyance",
  faction: "neutrals",
  flavor: "",
  art_url: "/cards/P082.webp",
  stats: {},
  rarity: { code: "delta", name: "Delta", rank: 1, color: "#9aa5b1" },
  power: null,
  duplicateCoinValue: 5,
  unlockLevel: null,
  variantCount: 2,
};

const variant = (style: string, name: string, instance: string): OwnedVariant => ({
  instance_id: instance,
  variant_id: `variant-${style}`,
  style,
  name,
  art_url: `/cards/variants/P082-${style}.webp`,
});

const owned = (baseCopies: number, variants: OwnedVariant[]): OwnedSummary => ({
  definition_id: card.id,
  copies: baseCopies + variants.length,
  starter_copies: 0,
  locked_copies: 0,
  convertible_copies: Math.max(0, baseCopies - 1),
  variants,
});

const circuit = variant("circuit", "Circuito", "i-1");
const ink = variant("ink", "Inchiostro", "i-2");

describe("foundVariantCount", () => {
  it("counts each style once, however many copies", () => {
    expect(foundVariantCount(owned(1, []))).toBe(0);
    expect(foundVariantCount(owned(0, [circuit, variant("circuit", "Circuito", "i-3")]))).toBe(1);
    expect(foundVariantCount(owned(1, [circuit, ink]))).toBe(2);
  });
});

describe("ownedLooks", () => {
  it("puts the base drawing first, then every style found in the order found", () => {
    expect(ownedLooks(card, owned(1, [ink, circuit])).map((look) => look.key)).toEqual(["base", "ink", "circuit"]);
  });

  it("leaves the base out when the player owns only variants", () => {
    const looks = ownedLooks(card, owned(0, [circuit, ink]));
    expect(looks.map((look) => look.key)).toEqual(["circuit", "ink"]);
    expect(looks[1]).toMatchObject({ label: "Inchiostro", art_url: ink.art_url, variant: { name: "Inchiostro" } });
  });

  it("shows two copies of the same variant as one drawing", () => {
    expect(ownedLooks(card, owned(0, [circuit, variant("circuit", "Circuito", "i-3")]))).toHaveLength(1);
  });
});

describe("ownedArt", () => {
  it("shows the base drawing when the player has a base copy", () => {
    expect(ownedArt(card, owned(1, [circuit]))).toEqual({ art_url: card.art_url, variant: null });
  });

  it("shows the first variant found when the player has only variants", () => {
    expect(ownedArt(card, owned(0, [ink, circuit]))).toEqual({ art_url: ink.art_url, variant: { name: "Inchiostro" } });
  });
});
