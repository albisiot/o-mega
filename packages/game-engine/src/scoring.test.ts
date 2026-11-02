import { describe, expect, it } from "vitest";
import {
  abilityMalusFrom,
  carriedBonusAfter,
  compareScores,
  revealsFutureThreats,
  scorePlay,
  type ScoreContext,
} from "./scoring.ts";
import { character, FAMILIES, threat } from "./test-fixtures.ts";

const context: ScoreContext = { families: FAMILIES, roundsWon: 0, opponentRoundsWon: 0, carriedBonus: 0, round: 3, team: [] };

describe("threat modifiers", () => {
  const hero = character("h", { FOR: 9, TEC: 3 });
  const plain = threat("t", ["FOR", "TEC"]);

  it("focus doubles the first required ability", () => {
    expect(scorePlay(hero, { ...plain, modifier: { code: "focus" } }, context)).toMatchObject({ base: 21, bonus: 0, total: 21 });
    expect(scorePlay(hero, { ...threat("t", ["TEC", "FOR"]), modifier: { code: "focus" } }, context).total).toBe(15);
  });

  it("weak_link doubles the lowest required value", () => {
    expect(scorePlay(hero, { ...plain, modifier: { code: "weak_link" } }, context)).toMatchObject({ base: 15, total: 15 });
  });

  it("doubled values use the abilities lowered by Sabotatore", () => {
    const score = scorePlay(hero, { ...plain, modifier: { code: "focus" } }, { ...context, abilityMalus: 1 });
    expect(score.base).toBe(18);
  });

  it("hostile_ground helps one faction and hinders another", () => {
    const modifier = { code: "hostile_ground", favored: "heroes", hindered: "villains", bonus: 3, malus: 2 } as const;
    const target = { ...plain, modifier };
    expect(scorePlay({ ...hero, faction: "heroes" }, target, context)).toMatchObject({ base: 12, bonus: 3, total: 15 });
    expect(scorePlay({ ...hero, faction: "villains" }, target, context)).toMatchObject({ base: 12, bonus: -2, total: 10 });
    expect(scorePlay({ ...hero, faction: "neutrals" }, target, context).total).toBe(12);
  });

  it("underdogs helps the common cards and hinders the elite ones", () => {
    const modifier = { code: "underdogs", commonMaxRank: 1, eliteMinRank: 4, bonus: 3, malus: 3 } as const;
    const target = { ...plain, modifier };
    expect(scorePlay({ ...hero, rarityRank: 1 }, target, context).total).toBe(15);
    expect(scorePlay({ ...hero, rarityRank: 3 }, target, context).total).toBe(12);
    expect(scorePlay({ ...hero, rarityRank: 5 }, target, context).total).toBe(9);
  });

  it("never brings a score below 0, and the bonus stays the difference from the base", () => {
    const weak = character("w", { FOR: 1 }, null, 0);
    const modifier = { code: "underdogs", commonMaxRank: 1, eliteMinRank: 4, bonus: 3, malus: 3 } as const;
    const score = scorePlay({ ...weak, rarityRank: 5 }, { ...threat("t", ["FOR"]), modifier }, context);
    expect(score).toMatchObject({ base: 1, bonus: -1, total: 0 });
  });

  it("the tie-break ignores the modifier", () => {
    expect(scorePlay(hero, { ...plain, modifier: { code: "focus" } }, context).highest).toBe(9);
  });
});

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

describe("new powers", () => {
  const t = threat("t", ["FOR"]);

  it("Apripista pays only in the first rounds", () => {
    const hero = character("h", {}, { code: "opener", params: { bonus: 3, max_round: 2 } });
    expect(scorePlay(hero, t, { ...context, round: 2 }).bonus).toBe(3);
    expect(scorePlay(hero, t, { ...context, round: 3 }).bonus).toBe(0);
  });

  it("Ultimo baluardo pays only in the last rounds", () => {
    const hero = character("h", {}, { code: "last_stand", params: { bonus: 3, min_round: 4 } });
    expect(scorePlay(hero, t, { ...context, round: 3 }).bonus).toBe(0);
    expect(scorePlay(hero, t, { ...context, round: 4 }).bonus).toBe(3);
  });

  it("Legame counts the other characters of the same faction, played ones too", () => {
    const hero = { ...character("h", {}, { code: "bond", params: { bonus: 1 } }), faction: "heroes" };
    const ally = { ...character("a"), faction: "heroes" };
    const ally2 = { ...character("b"), faction: "heroes" };
    const stranger = { ...character("c"), faction: "villains" };
    expect(scorePlay(hero, t, { ...context, team: [hero, ally, ally2, stranger] }).bonus).toBe(2);
    expect(scorePlay(hero, t, { ...context, team: [hero, stranger] }).bonus).toBe(0);
  });

  it("Sabotatore lowers every required ability, never below 0, and the tie-break", () => {
    const hero = character("h", { FOR: 5, VEL: 0, RES: 8 });
    const score = scorePlay(hero, threat("t", ["FOR", "VEL", "RES"]), { ...context, abilityMalus: 1 });
    expect(score.base).toBe(4 + 0 + 7);
    expect(score.highest).toBe(7);
    expect(abilityMalusFrom(character("s", {}, { code: "sabotage", params: { malus: 1 } }))).toBe(1);
    expect(abilityMalusFrom(hero)).toBe(0);
  });

  it("Veggente reveals and gives no points", () => {
    const seer = character("s", {}, { code: "foresight", params: {} });
    expect(revealsFutureThreats(seer)).toBe(true);
    expect(revealsFutureThreats(character("x"))).toBe(false);
    expect(scorePlay(seer, t, context).bonus).toBe(0);
  });

  it("Implacabile wins equal totals before the tie-break, unless both have it", () => {
    const relentless = scorePlay(character("r", { FOR: 5 }, { code: "relentless", params: {} }), t, context);
    const higher = { ...scorePlay(character("x", { FOR: 5 }), t, context), highest: 9 };
    expect(compareScores(relentless, higher)).toBe("a");
    expect(compareScores(higher, relentless)).toBe("b");
    expect(compareScores(relentless, relentless)).toBeNull();
    expect(compareScores({ ...relentless, total: 4 }, higher)).toBe("b");
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
