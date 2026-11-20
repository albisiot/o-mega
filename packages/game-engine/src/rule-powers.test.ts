// The twenty-two powers of 20 November 2026, second batch (SPEC §4.4): ready in the rules
// engine, for characters made for them.

import { describe, expect, it } from "vitest";
import { botView } from "./bots.ts";
import { resolveEmergencyPlay, type EmergencyRules } from "./emergency.ts";
import { availableCharacters, resolveRound } from "./match.ts";
import {
  calmedThreat,
  carriedBonusAfter,
  compareScores,
  isDistinctivePower,
  powerBonus,
  scorePlay,
  type ScoreContext,
} from "./scoring.ts";
import { character, FAMILIES, newState, RULES, threat } from "./test-fixtures.ts";
import type { Character, MatchState, PlayScore, Power, Threat } from "./types.ts";

const context: ScoreContext = { families: FAMILIES, roundsWon: 0, opponentRoundsWon: 0, carriedBonus: 0, round: 1, team: [] };
const p = (code: string, params: Record<string, string | number> = {}): Power => ({ code, params });
const total = (c: Character, t: Threat, extra: Partial<ScoreContext> = {}) => scorePlay(c, t, { ...context, ...extra }).total;
const two = threat("t", ["FOR", "VEL"]);

function play(state: MatchState, a: string, b: string) {
  return resolveRound(state, { a: { characterId: a, autoPlayed: false }, b: { characterId: b, autoPlayed: false } }, FAMILIES).state;
}

describe("rules on the opposing character's abilities", () => {
  const me = character("m", { FOR: 10, VEL: 2 });

  it("Gelo: no value counts more than 8", () => {
    expect(total(me, two, { opponent: character("o", {}, p("rival_frost", { cap: 8 })) })).toBe(10);
  });

  it("Tutto o niente: a value under 4 counts 0", () => {
    expect(total(me, two, { opponent: character("o", {}, p("rival_all_or_nothing", { min_value: 4 })) })).toBe(10);
  });

  it("Il prezzo: a value of 2 or less counts −2", () => {
    expect(total(me, two, { opponent: character("o", {}, p("rival_price", { max_value: 2, malus: 2 })) })).toBe(8);
  });

  it("Duello: only the 3 highest count", () => {
    const four = threat("q", ["FOR", "VEL", "RES", "INT"]);
    expect(total(character("x", { FOR: 1, VEL: 2, RES: 3, INT: 4 }), four, { opponent: character("o", {}, p("rival_duel", { count: 3 })) })).toBe(9);
  });

  it("not under Silenzio della tomba, nor from a card an Annullatore stopped", () => {
    const tomb: Threat = { ...two, modifier: { code: "tomb_silence" } };
    expect(total(me, tomb, { opponent: character("o", {}, p("rival_frost", { cap: 8 })) })).toBe(12);
    expect(total(me, two, { opponent: character("o", {}, null) })).toBe(12);
  });
});

describe("rules on the character's own abilities", () => {
  it("Una sola forza: the values of one family count as the highest", () => {
    const mixed = threat("m", ["FOR", "VEL", "INT"]);
    expect(total(character("x", { FOR: 9, VEL: 2, INT: 3 }, p("single_force")), mixed)).toBe(21);
  });

  it("Abissi: the next card's abilities of the family count double", () => {
    const abyss = character("a", {}, p("abyss_next", { family: "body" }));
    expect(total(character("x", { FOR: 5, VEL: 3 }), two, { played: [abyss] })).toBe(16);
    expect(total(character("x", { FOR: 5, VEL: 3 }), two, { played: [abyss, character("y")] })).toBe(8);
    // Its own card counts as usual.
    expect(total(abyss, two)).toBe(8);
  });

  it("Duellante: from level 4 only its 2 highest values, doubled", () => {
    const duelist = character("d", { FOR: 9, VEL: 8, RES: 1, INT: 1 }, p("duelist", { from_level: 4 }));
    expect(total(duelist, threat("q", ["FOR", "VEL", "RES", "INT"]))).toBe(34);
    expect(total(duelist, threat("r", ["FOR", "VEL", "RES"]))).toBe(18);
  });

  it("Negativo: each value counts 10 minus itself, the tie-break too", () => {
    const score = scorePlay(character("n", { FOR: 2, VEL: 9 }, p("negative_self")), two, context);
    expect(score.base).toBe(9);
    expect(score.highest).toBe(8);
  });

  it("Jolly: the lowest required value rises towards the best one not required", () => {
    const joker = (max: number) => character("j", { FOR: 2, VEL: 6, MAG: 9 }, p("joker", { max_gain: max }), 0);
    expect(total(joker(10), two)).toBe(15);
    expect(total(joker(3), two)).toBe(11);
  });
});

describe("results", () => {
  const score = (total: number, extra: Partial<PlayScore> = {}): PlayScore => ({ characterId: "x", base: total, bonus: 0, total, highest: 5, ...extra });

  it("Ribaltone: lost by 10 or more, it wins", () => {
    expect(compareScores(score(5, { upset: 10 }), score(15))).toBe("a");
    expect(compareScores(score(5, { upset: 10 }), score(14))).toBe("b");
    expect(compareScores(score(5, { upset: 10 }), score(15, { upset: 10 }))).toBe("b");
  });

  it("Muro: lost by 3 or less, the round is void", () => {
    expect(compareScores(score(10, { wall: 3 }), score(13))).toBeNull();
    expect(compareScores(score(10, { wall: 3 }), score(14))).toBe("b");
    expect(compareScores(score(13, { wall: 3 }), score(10))).toBe("a");
  });

  it("come from the power", () => {
    expect(scorePlay(character("u", {}, p("upset", { min_gap: 10 })), two, context).upset).toBe(10);
    expect(scorePlay(character("w", {}, p("wall", { margin: 3 })), two, context).wall).toBe(3);
  });
});

describe("points", () => {
  it("Pazienza: +1 per round already played, up to +4", () => {
    const patience = character("p", {}, p("patience", { bonus: 1, max: 4 }));
    expect(powerBonus(patience, two, context)).toBe(0);
    expect(powerBonus(patience, two, { ...context, round: 4 })).toBe(3);
    expect(powerBonus(patience, two, { ...context, round: 7 })).toBe(4);
  });

  it("Cacciatore: against a distinctive power", () => {
    const hunter = character("h", {}, p("hunter", { bonus: 4 }));
    expect(powerBonus(hunter, two, { ...context, opponent: character("o", {}, p("sabotage", { malus: 1 })) })).toBe(4);
    expect(powerBonus(hunter, two, { ...context, opponent: character("o", {}, p("bond", { bonus: 1 })) })).toBe(0);
    expect(isDistinctivePower("vampire")).toBe(true);
  });

  it("Arcobaleno: a Hero, a Villain and a Neutral in the team", () => {
    const rainbow = character("r", {}, p("rainbow", { bonus: 2 }));
    const of = (faction: string) => ({ ...character(faction), faction });
    expect(powerBonus(rainbow, two, { ...context, team: [rainbow, of("heroes"), of("villains")] })).toBe(2);
    expect(powerBonus(rainbow, two, { ...context, team: [rainbow, of("heroes")] })).toBe(0);
  });

  it("Costanza: the same level as the threat before", () => {
    const steady = character("s", {}, p("steady", { bonus: 6 }));
    expect(powerBonus(steady, two, { ...context, previousLevel: 2 })).toBe(6);
    expect(powerBonus(steady, two, { ...context, previousLevel: 3 })).toBe(0);
  });

  it("Azzardo: +3, and −3 to the next card after a lost round", () => {
    const gamble = character("g", {}, p("gamble", { bonus: 3, malus: 3 }));
    expect(powerBonus(gamble, two, context)).toBe(3);
    expect(carriedBonusAfter(gamble, "lost")).toBe(-3);
    expect(carriedBonusAfter(gamble, "won")).toBe(0);
  });

  it("Vampiro: +1 to itself and −1 to the rival per ability in which it does not beat it", () => {
    const vampire = character("v", { FOR: 5, VEL: 5 }, p("vampire"));
    const rival = character("o", { FOR: 7, VEL: 3 });
    expect(total(vampire, two, { opponent: rival })).toBe(11);
    expect(total(rival, two, { opponent: vampire })).toBe(9);
  });
});

describe("in a match", () => {
  const threats = [threat("t1", ["FOR"]), threat("t2", ["FOR"]), threat("t3", ["FOR"])];

  it("Calma piatta: the threat's rule does not count in its round, for both", () => {
    const focus: Threat = { ...threat("f", ["FOR", "VEL"]), modifier: { code: "focus" } };
    const calm = character("c", { FOR: 5, VEL: 5 }, p("calm"));
    const state = play(newState([calm], [character("b", { FOR: 6, VEL: 5 })], [focus]), "c", "b");
    expect(state.rounds[0].plays.a.total).toBe(10);
    expect(state.rounds[0].plays.b.total).toBe(11);
    expect(calmedThreat(focus, null, calm).modifier).toBeNull();
  });

  it("Ladro takes the points the opposing power gave", () => {
    const thief = character("l", { FOR: 5 }, p("thief"));
    const booster = character("b", { FOR: 5 }, p("ability_bonus", { ability: "FOR", bonus: 2 }));
    const state = play(newState([thief], [booster], threats), "l", "b");
    expect(state.rounds[0].plays.a.total).toBe(7);
    expect(state.rounds[0].plays.b.total).toBe(5);
    expect(state.rounds[0].winner).toBe("a");
  });

  it("Fenice: back in the team once after a lost round", () => {
    const phoenix = character("f", { FOR: 1 }, p("phoenix"));
    const team = [phoenix, character("a2"), character("a3")];
    let state = play(newState(team, [character("b1", { FOR: 9 }), character("b2", { FOR: 9 }), character("b3")], threats), "f", "b1");
    expect(availableCharacters(state, "a").map((c) => c.id)).toContain("f");
    state = play(state, "f", "b2");
    expect(availableCharacters(state, "a").map((c) => c.id)).not.toContain("f");
    const won = play(newState(team, [character("b1", { FOR: 0 }), character("b2")], threats), "f", "b1");
    expect(availableCharacters(won, "a").map((c) => c.id)).not.toContain("f");
  });

  it("Imboscata: in the round after, the bot chooses without the threat's abilities", () => {
    const ambush = character("i", {}, p("ambush"));
    const state = play(newState([ambush, character("a2")], [character("b1"), character("b2")], threats), "i", "b1");
    const knowledge = { threatCatalog: [], families: FAMILIES, abilityMeans: {}, characters: [] };
    expect(botView(state, "b", knowledge).currentThreat.abilities).toEqual([]);
    expect(botView(state, "a", knowledge).currentThreat.abilities).toEqual(["FOR"]);
  });

  it("in Emergenza: Calma piatta takes the rule away, the powers against an opponent do nothing", () => {
    const rules: EmergencyRules = { threatsPerRun: 8, maxFailures: 3, targets: { 2: 13 }, threatLevels: RULES.threatLevels };
    const focus: Threat = { ...two, modifier: { code: "focus" } };
    const calm = character("c", { FOR: 5, VEL: 5 }, p("calm"));
    expect(resolveEmergencyPlay({ character: calm, threat: focus, squad: [calm], attempts: [], rules, families: FAMILIES }).score.total).toBe(10);
    const vampire = character("v", { FOR: 5, VEL: 5 }, p("vampire"));
    expect(resolveEmergencyPlay({ character: vampire, threat: two, squad: [vampire], attempts: [], rules, families: FAMILIES }).score.total).toBe(10);
  });
});
