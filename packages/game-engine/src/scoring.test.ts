import { describe, expect, it } from "vitest";
import { carriedBonusAfter, compareScores, scorePlay, type ScoreContext } from "./scoring.ts";
import { character, FAMILIES, threat } from "./test-fixtures.ts";

const context: ScoreContext = { families: FAMILIES, roundsWon: 0, opponentRoundsWon: 0, carriedBonus: 0 };

describe("scorePlay", () => {
  it("sums the values of the required abilities", () => {
    const hero = character("h", { FOR: 9, TEC: 3 });
    expect(scorePlay(hero, threat("t", ["FOR", "TEC"]), context)).toEqual({
      characterId: "h",
      base: 12,
      bonus: 0,
      total: 12,
      highest: 9,
    });
  });

  it("applies Specialità only when the threat requires its ability", () => {
    const hero = character("h", {}, { code: "ability_bonus", params: { ability: "RES", bonus: 2 } });
    expect(scorePlay(hero, threat("t", ["RES", "FOR"]), context).bonus).toBe(2);
    expect(scorePlay(hero, threat("t", ["VEL", "FOR"]), context).bonus).toBe(0);
  });

  it("applies Affinità from the minimum number of abilities of the family", () => {
    const hero = character("h", {}, { code: "family_bonus", params: { family: "mind", min_count: 2, bonus: 2 } });
    expect(scorePlay(hero, threat("t", ["INT", "VOL", "FOR"]), context).bonus).toBe(2);
    expect(scorePlay(hero, threat("t", ["INT", "FOR", "VEL"]), context).bonus).toBe(0);
  });

  it("applies Terreno favorevole within the level range", () => {
    const hero = character("h", {}, { code: "level_bonus", params: { min_level: 1, max_level: 2, bonus: 2 } });
    expect(scorePlay(hero, threat("t", ["FOR"]), context).bonus).toBe(2);
    expect(scorePlay(hero, threat("t", ["FOR", "VEL"]), context).bonus).toBe(2);
    expect(scorePlay(hero, threat("t", ["FOR", "VEL", "RES"]), context).bonus).toBe(0);
  });

  it("applies Sfavorito only when the opponent has won more rounds", () => {
    const hero = character("h", {}, { code: "underdog", params: { bonus: 3 } });
    const t = threat("t", ["FOR"]);
    expect(scorePlay(hero, t, { ...context, roundsWon: 0, opponentRoundsWon: 1 }).bonus).toBe(3);
    expect(scorePlay(hero, t, { ...context, roundsWon: 1, opponentRoundsWon: 1 }).bonus).toBe(0);
    expect(scorePlay(hero, t, { ...context, roundsWon: 2, opponentRoundsWon: 1 }).bonus).toBe(0);
  });

  it("adds a bonus carried from the previous round, never in the tie-break value", () => {
    const hero = character("h", { FOR: 5 });
    const score = scorePlay(hero, threat("t", ["FOR"]), { ...context, carriedBonus: 2 });
    expect(score.total).toBe(7);
    expect(score.highest).toBe(5);
  });

  it("rejects powers the engine does not know", () => {
    const hero = character("h", {}, { code: "teleport", params: {} });
    expect(() => scorePlay(hero, threat("t", ["FOR"]), context)).toThrow(/Unknown power/);
  });
});

describe("carriedBonusAfter", () => {
  it("gives Riscossa's bonus only after a lost round", () => {
    const hero = character("h", {}, { code: "comeback", params: { bonus: 2 } });
    expect(carriedBonusAfter(hero, true)).toBe(2);
    expect(carriedBonusAfter(hero, false)).toBe(0);
    expect(carriedBonusAfter(character("x"), true)).toBe(0);
  });
});

describe("compareScores", () => {
  const score = (total: number, highest: number) => ({ characterId: "x", base: total, bonus: 0, total, highest });

  it("prefers the higher total", () => {
    expect(compareScores(score(12, 5), score(11, 9))).toBe("a");
    expect(compareScores(score(8, 8), score(10, 4))).toBe("b");
  });

  it("breaks ties with the highest single value, otherwise the round is void", () => {
    expect(compareScores(score(10, 7), score(10, 6))).toBe("a");
    expect(compareScores(score(10, 6), score(10, 7))).toBe("b");
    expect(compareScores(score(10, 6), score(10, 6))).toBeNull();
  });
});
