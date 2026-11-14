import { describe, expect, it } from "vitest";
import { avatarChoices, filterAvatarChoices, isCardArtAvatar } from "@/lib/avatar";
import type { CatalogCard, OwnedSummary } from "@/lib/collection";

const RARE = { code: "beta", name: "Rara", rank: 2, color: "#0ff" };
const COMMON = { code: "delta", name: "Comune", rank: 1, color: "#fff" };

function card(id: string, code: string, name: string, rarity = COMMON): CatalogCard {
  return { id, code, name, rarity, art_url: `/cards/${code}.webp` } as CatalogCard;
}

function owned(id: string, copies: number, variants: [string, string][] = []): [string, OwnedSummary] {
  return [
    id,
    {
      definition_id: id,
      copies,
      starter_copies: 0,
      locked_copies: 0,
      convertible_copies: 0,
      variants: variants.map(([variantId, style], i) => ({
        instance_id: `${id}-${i}`,
        variant_id: variantId,
        style,
        name: style.toUpperCase(),
        art_url: `/cards/variants/${id}-${style}.webp`,
      })),
    },
  ];
}

const catalog = [card("a", "P001", "Écho"), card("b", "P051", "Brina", RARE), card("c", "P099", "Mai trovata")];

describe("avatarChoices", () => {
  it("offers the base drawing of each owned character and each variant once", () => {
    const collection = new Map([owned("a", 3, [["va", "neon"], ["va", "neon"]]), owned("b", 1)]);
    const choices = avatarChoices(catalog, collection);
    expect(choices.map((c) => [c.key, c.variantId, c.art_url, c.styleName])).toEqual([
      ["a", null, "/cards/P001.webp", null],
      ["a:va", "va", "/cards/variants/a-neon.webp", "NEON"],
      ["b", null, "/cards/P051.webp", null],
    ]);
  });

  it("offers the base drawing of a character owned only as a variant", () => {
    const choices = avatarChoices(catalog, new Map([owned("a", 1, [["va", "neon"]])]));
    expect(choices.map((c) => c.key)).toEqual(["a", "a:va"]);
  });

  it("offers nothing the player does not own", () => {
    expect(avatarChoices(catalog, new Map([owned("c", 0)]))).toEqual([]);
  });
});

describe("filterAvatarChoices", () => {
  const choices = avatarChoices(catalog, new Map([owned("a", 1, [["va", "neon"]]), owned("b", 1)]));

  it("searches name without accents and the number", () => {
    expect(filterAvatarChoices(choices, "ech", null).map((c) => c.key)).toEqual(["a", "a:va"]);
    expect(filterAvatarChoices(choices, "51", null).map((c) => c.key)).toEqual(["b"]);
  });

  it("filters by rarity", () => {
    expect(filterAvatarChoices(choices, "", 2).map((c) => c.key)).toEqual(["b"]);
  });
});

describe("isCardArtAvatar", () => {
  it("tells a card drawing from an account photo and from no picture", () => {
    expect(isCardArtAvatar("/cards/P001.webp")).toBe(true);
    expect(isCardArtAvatar("https://lh3.googleusercontent.com/a/x")).toBe(false);
    expect(isCardArtAvatar(null)).toBe(false);
  });
});
