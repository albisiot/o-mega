import { describe, expect, it } from "vitest";
import { earnedStars, fitsStarRarities, fitsStarTraits, squadStars, type StarCharacter, type StoryStarRules } from "./story-stars.ts";

const CATEGORIES: Record<string, string> = {
  "origin.mito": "origin",
  "origin.strappo": "origin",
  "origin.segno": "origin",
  "group.figli": "group",
  "group.custodi": "group",
  "nature.umano": "nature",
};
const categoryOf = (code: string) => CATEGORIES[code];

const char = (rarity: string, ...traits: string[]): StarCharacter => ({ rarity, traits });
const RULES: StoryStarRules = { rarities: ["delta", "gamma"], traits: ["origin.mito", "origin.strappo", "group.figli"] };

describe("story star rules", () => {
  it("a rarity fits when it is listed", () => {
    expect(fitsStarRarities(char("delta"), RULES)).toBe(true);
    expect(fitsStarRarities(char("gamma"), RULES)).toBe(true);
    expect(fitsStarRarities(char("beta"), RULES)).toBe(false);
    expect(fitsStarRarities(char("delta"), { rarities: [], traits: [] })).toBe(false);
  });

  it("traits: one of a category is enough, every listed category must match", () => {
    expect(fitsStarTraits(char("delta", "origin.mito", "group.figli", "nature.umano"), RULES, categoryOf)).toBe(true);
    expect(fitsStarTraits(char("delta", "origin.strappo", "group.figli"), RULES, categoryOf)).toBe(true);
    expect(fitsStarTraits(char("delta", "origin.segno", "group.figli"), RULES, categoryOf)).toBe(false);
    expect(fitsStarTraits(char("delta", "origin.mito", "group.custodi"), RULES, categoryOf)).toBe(false);
    expect(fitsStarTraits(char("delta", "origin.mito"), { rarities: [], traits: [] }, categoryOf)).toBe(false);
  });

  it("an unknown trait is an error, as in the database", () => {
    expect(() => fitsStarTraits(char("delta"), { rarities: [], traits: ["group.nope"] }, categoryOf)).toThrow("unknown trait");
  });

  it("a squad can earn rarities and traits only when full and all fitting", () => {
    const fitting = Array.from({ length: 5 }, () => char("gamma", "origin.mito", "group.figli"));
    expect(squadStars(fitting, RULES, categoryOf, 5)).toEqual({ flawless: true, rarities: true, traits: true });
    expect(squadStars(fitting.slice(0, 4), RULES, categoryOf, 5)).toEqual({ flawless: true, rarities: false, traits: false });
    const oneBeta = [...fitting.slice(0, 4), char("beta", "origin.mito", "group.figli")];
    expect(squadStars(oneBeta, RULES, categoryOf, 5)).toEqual({ flawless: true, rarities: false, traits: true });
    const oneCustode = [...fitting.slice(0, 4), char("delta", "origin.mito", "group.custodi")];
    expect(squadStars(oneCustode, RULES, categoryOf, 5)).toEqual({ flawless: true, rarities: true, traits: false });
  });

  it("a win earns the stars whose conditions hold, several at once", () => {
    const squad = Array.from({ length: 5 }, () => char("delta", "origin.strappo", "group.figli"));
    expect(earnedStars({ won: true, forfeit: false, opponentRoundsWon: 0, squad }, RULES, categoryOf)).toEqual([
      "flawless",
      "rarities",
      "traits",
    ]);
    expect(earnedStars({ won: true, forfeit: false, opponentRoundsWon: 1, squad }, RULES, categoryOf)).toEqual([
      "rarities",
      "traits",
    ]);
    const mixed = [...squad.slice(0, 4), char("omega", "origin.segno")];
    expect(earnedStars({ won: true, forfeit: false, opponentRoundsWon: 0, squad: mixed }, RULES, categoryOf)).toEqual([
      "flawless",
    ]);
  });

  it("losses and abandoned matches earn nothing", () => {
    const squad = Array.from({ length: 5 }, () => char("delta", "origin.mito", "group.figli"));
    expect(earnedStars({ won: false, forfeit: false, opponentRoundsWon: 0, squad }, RULES, categoryOf)).toEqual([]);
    expect(earnedStars({ won: true, forfeit: true, opponentRoundsWon: 0, squad }, RULES, categoryOf)).toEqual([]);
  });
});
