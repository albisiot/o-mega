import { describe, expect, it } from "vitest";
import {
  countStars,
  defaultStarCoins,
  joinOr,
  starCondition,
  starShort,
  storyStarCount,
  traitCategoryOf,
  type StarRulesText,
  type StoryStar,
} from "./story-stars";

const RULES: StarRulesText = {
  star_rarities: ["delta", "gamma"],
  star_rarity_names: ["Delta", "Gamma"],
  star_traits: ["origin.mito", "origin.strappo", "group.figli"],
  star_traits_text: [
    { category: "Origine", traits: ["Mito", "Strappo"] },
    { category: "Gruppo", traits: ["Figli dell'Ultima"] },
  ],
};

describe("story stars as players read them", () => {
  it("joins names with «o»", () => {
    expect(joinOr([])).toBe("");
    expect(joinOr(["Delta"])).toBe("Delta");
    expect(joinOr(["Delta", "Gamma"])).toBe("Delta o Gamma");
    expect(joinOr(["Delta", "Gamma", "Beta"])).toBe("Delta, Gamma o Beta");
  });

  it("says what every star asks", () => {
    expect(starCondition("flawless", RULES)).toBe("Vinci 3-0, senza perdere un round");
    expect(starCondition("rarities", RULES)).toBe("Vinci con solo Delta o Gamma in squadra");
    expect(starCondition("traits", RULES)).toBe("Vinci con solo Mito o Strappo · Figli dell'Ultima in squadra");
    expect(starShort("rarities", { ...RULES, star_rarity_names: ["Delta"] })).toBe("Solo Delta");
    expect(starShort("traits", { ...RULES, star_traits_text: [{ category: "Gruppo", traits: ["Custodi"] }] })).toBe(
      "Solo Custodi",
    );
  });

  it("counts the stars of a chapter", () => {
    expect(countStars([{ stars: ["flawless"] }, { stars: [] }, { stars: ["rarities", "traits"] }])).toEqual({
      earned: 3,
      total: 9,
    });
  });

  it("counts the stars of the whole story, locked missions included", () => {
    const open = (stars: StoryStar[]) => ({ stars, star_rarities: ["delta"] });
    expect(
      storyStarCount([
        { missions: [open(["flawless", "rarities", "traits"]), open(["traits"])] },
        { missions: [open([]), open([])] },
      ]),
    ).toEqual({ earned: 4, total: 12 });
    expect(storyStarCount([{ missions: [open([])] }, { missions: [] }])).toEqual({ earned: 0, total: 3 });
  });

  it("counts no stars before the database has them", () => {
    expect(storyStarCount([])).toBeNull();
    expect(storyStarCount([{ missions: [{ stars: [], star_rarities: [] }] }])).toBeNull();
  });

  it("gives new missions more coins per star later in the story", () => {
    expect([1, 4, 5, 8, 9, 12, 13].map(defaultStarCoins)).toEqual([10, 10, 20, 20, 30, 30, 40]);
  });

  it("knows the category of every trait", () => {
    const categoryOf = traitCategoryOf([
      { code: "origin", name: "Origine", traits: [{ code: "origin.mito", name: "Mito" }] },
      { code: "group", name: "Gruppo", traits: [{ code: "group.figli", name: "Figli dell'Ultima" }] },
    ]);
    expect(categoryOf("origin.mito")).toBe("origin");
    expect(categoryOf("group.figli")).toBe("group");
    expect(categoryOf("group.nope")).toBeUndefined();
  });
});
