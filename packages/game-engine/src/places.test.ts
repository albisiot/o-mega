// The rules of the places beyond Nuova Megara (SPEC §5.4): fixed for each threat of that place.
import { describe, expect, it } from "vitest";
import { carriedBonus, playedBy, resolveRound } from "./match.ts";
import { asPlayedAgainst, modifierBonus, powersSilenced, scorePlay, type ScoreContext } from "./scoring.ts";
import { requiredScore } from "./emergency.ts";
import { placeModifier } from "./threats.ts";
import { character, FAMILIES, newState, RULES, threat } from "./test-fixtures.ts";
import type { Threat, ThreatModifier } from "./types.ts";

const context: ScoreContext = { families: FAMILIES, roundsWon: 0, opponentRoundsWon: 0, carriedBonus: 0, round: 2, team: [] };
const at = (abilities: string[], modifier: ThreatModifier): Threat => ({ ...threat("t", abilities), modifier });

describe("Abissi", () => {
  const abyss: ThreatModifier = { code: "abyss", abilities: ["ENE", "MAG", "PSI"] };

  it("doubles only the Potere abilities among the required ones", () => {
    const hero = character("h", { FOR: 7, MAG: 5, PSI: 3 });
    expect(scorePlay(hero, at(["FOR", "MAG", "PSI"], abyss), context)).toMatchObject({ base: 23, bonus: 0, total: 23 });
    expect(scorePlay(hero, at(["FOR"], abyss), context).total).toBe(7);
  });

  it("doubles the values lowered by Sabotatore, and the tie-break ignores it", () => {
    const hero = character("h", { MAG: 5, FOR: 6 });
    const score = scorePlay(hero, at(["MAG", "FOR"], abyss), { ...context, abilityMalus: 1 });
    expect(score).toMatchObject({ base: 13, highest: 5 });
  });
});

describe("Gelo", () => {
  const frost: ThreatModifier = { code: "frost", cap: 6 };

  it("counts no required ability above the cap", () => {
    const specialist = character("s", { FOR: 10, RES: 9, PER: 2 });
    expect(scorePlay(specialist, at(["FOR", "RES", "PER"], frost), context)).toMatchObject({ base: 14, total: 14 });
  });

  it("leaves the tie-break on the real values", () => {
    expect(scorePlay(character("s", { FOR: 10 }), at(["FOR"], frost), context)).toMatchObject({ total: 6, highest: 10 });
  });
});

describe("Duello", () => {
  const duel: ThreatModifier = { code: "duel", count: 2 };

  it("counts only the two highest required abilities", () => {
    const hero = character("h", { FOR: 3, VEL: 9, RES: 1, COM: 8, TEC: 5 });
    expect(scorePlay(hero, at(["FOR", "VEL", "RES", "COM", "TEC"], duel), context)).toMatchObject({ base: 17, total: 17 });
  });

  it("counts every ability when the threat requires fewer", () => {
    expect(scorePlay(character("h", { FOR: 3 }), at(["FOR"], duel), context).total).toBe(3);
  });
});

describe("Il conto lungo", () => {
  const longCount: ThreatModifier = { code: "long_count", bonus: 3 };
  const target = at(["FOR", "VEL"], longCount);
  const hero = character("h", { FOR: 5, VEL: 5 });

  it("pays the side that has won fewer rounds", () => {
    expect(scorePlay(hero, target, { ...context, roundsWon: 0, opponentRoundsWon: 1 })).toMatchObject({ base: 10, bonus: 3, total: 13 });
    expect(scorePlay(hero, target, { ...context, roundsWon: 1, opponentRoundsWon: 0 }).total).toBe(10);
    expect(scorePlay(hero, target, { ...context, roundsWon: 1, opponentRoundsWon: 1 }).total).toBe(10);
  });

  it("gives nothing without a standing", () => {
    expect(modifierBonus(hero, target)).toBe(0);
  });
});

describe("Silenzio della tomba", () => {
  const silence: ThreatModifier = { code: "tomb_silence" };
  const quiet = at(["FOR", "TEC"], silence);

  it("takes every power away, Sabotatore included", () => {
    const specialist = character("s", { FOR: 6, TEC: 4 }, { code: "ability_bonus", params: { ability: "FOR", bonus: 2 } });
    expect(scorePlay(specialist, quiet, context)).toMatchObject({ base: 10, bonus: 0, total: 10 });
    expect(scorePlay(character("h", { FOR: 6, TEC: 4 }), quiet, { ...context, abilityMalus: 1 }).base).toBe(10);
    const relentless = character("r", {}, { code: "relentless", params: {} });
    expect(scorePlay(relentless, quiet, context).relentless).toBeUndefined();
  });

  it("keeps the bonus received from the round before", () => {
    expect(scorePlay(character("h", { FOR: 6, TEC: 4 }), quiet, { ...context, carriedBonus: 3 }).total).toBe(13);
  });

  it("plays both characters without their power, also against an Annullatore", () => {
    const nullifier = character("n", {}, { code: "nullifier", params: {} });
    const comeback = character("c", {}, { code: "comeback", params: { bonus: 3 } });
    expect(powersSilenced(quiet)).toBe(true);
    expect(asPlayedAgainst(comeback, null, quiet).power).toBeNull();
    expect(asPlayedAgainst(nullifier, comeback, quiet).power).toBeNull();
    expect(asPlayedAgainst(comeback, nullifier, at(["FOR"], { code: "focus" })).power).toBeNull();
    expect(asPlayedAgainst(comeback, null, at(["FOR"], { code: "focus" })).power).not.toBeNull();
  });

  it("stops Riscossa and Sabotatore in a match", () => {
    const comeback = character("a1", { FOR: 1 }, { code: "comeback", params: { bonus: 3 } }, 1);
    const sabotage = character("b1", { FOR: 9 }, { code: "sabotage", params: { malus: 1 } }, 9);
    const teamA = [comeback, ...[2, 3, 4, 5].map((i) => character(`a${i}`))];
    const teamB = [sabotage, ...[2, 3, 4, 5].map((i) => character(`b${i}`))];
    const threats = [at(["FOR"], silence), threat("t2", ["FOR", "VEL"]), threat("t3", ["FOR"]), threat("t4", ["FOR"]), threat("t5", ["FOR"])];
    const { state, round } = resolveRound(
      newState(teamA, teamB, threats),
      { a: { characterId: "a1", autoPlayed: false }, b: { characterId: "b1", autoPlayed: false } },
      FAMILIES,
    );
    expect(round.plays.a.total).toBe(1); // no Sabotatore malus to take
    expect(round.winner).toBe("b");
    expect(carriedBonus(state, "a")).toBe(0); // Riscossa silenced
    expect(playedBy(state, "a")[0].power).toBeNull();
  });

  it("removes the Emergenza discounts of Sabotatore and Implacabile", () => {
    const rules = { threatsPerRun: 8, maxFailures: 3, targets: { 2: 13 }, threatLevels: RULES.threatLevels };
    const sabotage = character("s", {}, { code: "sabotage", params: { malus: 1 } });
    expect(requiredScore(sabotage, quiet, rules)).toBe(13);
    expect(requiredScore(sabotage, threat("t", ["FOR", "TEC"]), rules)).toBe(11);
  });
});

describe("placeModifier", () => {
  const rules = { longCountBonus: 3, frostCap: 6, duelCount: 2 };

  it("builds each place's rule with the configured numbers", () => {
    expect(placeModifier(null, {}, rules)).toBeNull();
    expect(placeModifier("tomb_silence", {}, rules)).toEqual({ code: "tomb_silence" });
    expect(placeModifier("long_count", {}, rules)).toEqual({ code: "long_count", bonus: 3 });
    expect(placeModifier("abyss", { abilities: ["ENE", "MAG"] }, rules)).toEqual({ code: "abyss", abilities: ["ENE", "MAG"] });
    expect(placeModifier("frost", {}, rules)).toEqual({ code: "frost", cap: 6 });
    expect(placeModifier("duel", {}, rules)).toEqual({ code: "duel", count: 2 });
  });

  it("refuses an unknown rule or an Abissi without abilities", () => {
    expect(() => placeModifier("focus", {}, rules)).toThrow(/Unknown place rule/);
    expect(() => placeModifier("abyss", {}, rules)).toThrow(/abilities/);
  });
});
