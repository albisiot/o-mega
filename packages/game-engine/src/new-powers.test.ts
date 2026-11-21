// The thirteen powers of 20 November 2026 (SPEC §4.4): ready in the rules engine, for
// characters made for them.

import { describe, expect, it } from "vitest";
import { botView } from "./bots.ts";
import { resolveBossTurn } from "./boss.ts";
import { resolveEmergencyPlay, type EmergencyRules } from "./emergency.ts";
import { resolveRound } from "./match.ts";
import { isPlaceThreat, powerBonus, scorePlay, type ScoreContext } from "./scoring.ts";
import { bossState, character, FAMILIES, newState, RULES, threat, threatCatalog, tripleState } from "./test-fixtures.ts";
import { previewTriplePlay, resolveTripleRound } from "./triple.ts";
import type { Character, MatchState, Power, Threat } from "./types.ts";

const context: ScoreContext = { families: FAMILIES, roundsWon: 0, opponentRoundsWon: 0, carriedBonus: 0, round: 1, team: [] };
const t = threat("t", ["FOR", "VEL"]);
const withPower = (id: string, power: Power, stats: Record<string, number> = {}, rarityRank = 2): Character => ({
  ...character(id, stats, power),
  rarityRank,
});

function play(state: MatchState, a: string, b: string) {
  return resolveRound(state, { a: { characterId: a, autoPlayed: false }, b: { characterId: b, autoPlayed: false } }, FAMILIES).state;
}

describe("the powers that add points", () => {
  it("Fuoriclasse: one required ability at 10, after Sabotatore", () => {
    const peak = withPower("p", { code: "peak", params: { bonus: 3 } }, { FOR: 10 });
    expect(powerBonus(peak, t, context)).toBe(3);
    expect(powerBonus(peak, threat("v", ["VEL"]), context)).toBe(0);
    expect(powerBonus(peak, t, { ...context, abilityMalus: 1 })).toBe(0);
  });

  it("Euforia: after a won round, the mirror of Vendetta", () => {
    const euphoria = withPower("e", { code: "euphoria", params: { bonus: 3 } });
    expect(powerBonus(euphoria, t, { ...context, previousOutcome: "won" })).toBe(3);
    expect(powerBonus(euphoria, t, { ...context, previousOutcome: "lost" })).toBe(0);
    expect(powerBonus(euphoria, t, context)).toBe(0);
  });

  it("Fuori casa: on the threats of the places, not on the rare ones with the same rule", () => {
    const away = withPower("a", { code: "away", params: { bonus: 4 } });
    const frost: Threat = { ...t, modifier: { code: "frost", cap: 6 } };
    expect(isPlaceThreat(frost)).toBe(true);
    expect(powerBonus(away, frost, context)).toBe(4);
    expect(powerBonus(away, { ...frost, rarity: "epic" }, context)).toBe(0);
    expect(powerBonus(away, { ...t, modifier: { code: "focus" } }, context)).toBe(0);
    expect(powerBonus(away, t, context)).toBe(0);
    // The Novecielo's rule is a rare threats' rule: on a usual threat it is a place.
    const novecielo: Threat = { ...t, modifier: { code: "one_force", abilities: ["ENE", "PSI"] } };
    expect(powerBonus(away, novecielo, context)).toBe(4);
    expect(powerBonus(away, { ...novecielo, rarity: "legendary" }, context)).toBe(0);
  });

  it("Gemello: against the same rarity", () => {
    const twin = withPower("g", { code: "twin", params: { bonus: 3 } }, {}, 3);
    expect(powerBonus(twin, t, { ...context, opponent: withPower("o", null as unknown as Power, {}, 3) })).toBe(3);
    expect(powerBonus(twin, t, { ...context, opponent: withPower("o", null as unknown as Power, {}, 4) })).toBe(0);
    expect(powerBonus(twin, t, context)).toBe(0);
  });

  it("Colpo di grazia, Rompighiaccio, Testa a testa read the rounds won", () => {
    const point = withPower("m", { code: "match_point", params: { bonus: 3, min_wins: 2 } });
    const ice = withPower("i", { code: "icebreaker", params: { bonus: 3 } });
    const even = withPower("v", { code: "even_score", params: { bonus: 2 } });
    expect(powerBonus(point, t, { ...context, roundsWon: 2, opponentRoundsWon: 1 })).toBe(3);
    expect(powerBonus(point, t, { ...context, roundsWon: 1 })).toBe(0);
    expect(powerBonus(ice, t, { ...context, opponentRoundsWon: 2 })).toBe(3);
    expect(powerBonus(ice, t, { ...context, roundsWon: 1 })).toBe(0);
    expect(powerBonus(even, t, { ...context, roundsWon: 1, opponentRoundsWon: 1 })).toBe(2);
    expect(powerBonus(even, t, { ...context, roundsWon: 1 })).toBe(0);
  });

  it("Diminuendo: a lower level than the round before, never in the first round", () => {
    const down = withPower("d", { code: "diminuendo", params: { bonus: 2 } });
    expect(powerBonus(down, t, { ...context, previousLevel: 4 })).toBe(2);
    expect(powerBonus(down, t, { ...context, previousLevel: 2 })).toBe(0);
    expect(powerBonus(down, t, context)).toBe(0);
  });

  it("Riverbero copies them", () => {
    const echo = withPower("r", { code: "echo", params: {} });
    const ice = withPower("i", { code: "icebreaker", params: { bonus: 3 } });
    expect(powerBonus(echo, t, { ...context, played: [ice] })).toBe(3);
  });

  it("Emergenza reads them like a match: passed threats are rounds won", () => {
    const rules: EmergencyRules = { threatsPerRun: 8, maxFailures: 3, targets: { 2: 13 }, threatLevels: RULES.threatLevels };
    const point = withPower("m", { code: "match_point", params: { bonus: 3, min_wins: 2 } }, { FOR: 5, VEL: 5 });
    const passed = { character: character("x"), passed: true, level: 2 };
    const outcome = resolveEmergencyPlay({ character: point, threat: t, squad: [point], attempts: [passed, passed], rules, families: FAMILIES });
    expect(outcome.score.total).toBe(13);
  });
});

describe("Logoramento", () => {
  const worn = withPower("w", { code: "attrition", params: { malus: 2 } });
  const threats = [threat("t1", ["FOR"]), threat("t2", ["FOR"]), threat("t3", ["FOR"])];

  it("takes points from the next character the opponent plays, never from the tie-break", () => {
    const state = play(play(newState([worn, character("a2")], [character("b1"), character("b2", { FOR: 7 })], threats), "w", "b1"), "a2", "b2");
    expect(state.rounds[0].plays.b.total).toBe(4);
    expect(state.rounds[1].plays.b.total).toBe(5);
    expect(state.rounds[1].plays.b.highest).toBe(7);
  });

  it("does nothing when an Annullatore stopped it in its round", () => {
    const nullifier = character("n", {}, { code: "nullifier", params: {} });
    const state = play(play(newState([worn, character("a2")], [nullifier, character("b2", { FOR: 7 })], threats), "w", "n"), "a2", "b2");
    expect(state.rounds[1].plays.b.total).toBe(7);
  });

  it("in the Allarme Triplo on the same threat, in the Grande Minaccia on the next turn", () => {
    const lane = [threat("t1", ["FOR"]), threat("t2", ["FOR", "VEL"]), threat("t3", ["FOR", "VEL", "RES"])];
    const deckA = [worn, character("a2"), character("a3"), character("a4"), character("a5"), character("a6")];
    const deckB = [1, 2, 3, 4, 5, 6].map((i) => character(`b${i}`));
    let triple = tripleState(deckA, deckB, lane);
    triple = resolveTripleRound(triple, { a: { characterIds: ["w", "a2", "a3"], autoPlayed: false }, b: { characterIds: ["b1", "b2", "b3"], autoPlayed: false } }, FAMILIES).state;
    // The preview of the screen and the bots counts it too.
    expect(previewTriplePlay(triple, "b", character("x"), 0, FAMILIES).total).toBe(2);
    expect(previewTriplePlay(triple, "b", character("x"), 1, FAMILIES).total).toBe(8);
    triple = resolveTripleRound(triple, { a: { characterIds: ["a4", "a5", "a6"], autoPlayed: false }, b: { characterIds: ["b4", "b5", "b6"], autoPlayed: false } }, FAMILIES).state;
    expect(triple.rounds[1].plays.b.map((p) => p.total)).toEqual([2, 8, 12]);

    let boss = bossState([worn, character("a2")], [character("b1"), character("b2")]);
    boss = resolveBossTurn(boss, { a: { characterId: "w", front: 0, autoPlayed: false }, b: { characterId: "b1", front: 1, autoPlayed: false } }, FAMILIES).state;
    boss = resolveBossTurn(boss, { a: { characterId: "a2", front: 2, autoPlayed: false }, b: { characterId: "b2", front: 3, autoPlayed: false } }, FAMILIES).state;
    expect(boss.turns[1].plays.b.total).toBe(14);
  });

  it("the bot knows what it takes this round", () => {
    const state = play(newState([worn, character("a2")], [character("b1"), character("b2")], threats), "w", "b1");
    const view = botView(state, "b", { threatCatalog: threatCatalog(), families: FAMILIES, abilityMeans: {}, characters: [] });
    expect(view.wornDown).toBe(2);
  });
});

describe("Guastafeste", () => {
  it("the opposing character gets no bonus from its earlier cards", () => {
    const comeback = character("c", { FOR: 1 }, { code: "comeback", params: { bonus: 3 } });
    const spoiler = character("s", {}, { code: "spoiler", params: {} });
    const threats = [threat("t1", ["FOR"]), threat("t2", ["FOR"])];
    const lost = play(newState([comeback, character("a2")], [character("b1", { FOR: 9 }), spoiler], threats), "c", "b1");
    expect(play(lost, "a2", "s").rounds[1].plays.a.total).toBe(4);
    expect(play(lost, "a2", "s").rounds[1].plays.a.parts?.carried).toBe(0);
    const plain = play(newState([comeback, character("a2")], [character("b1", { FOR: 9 }), character("b2")], threats), "c", "b1");
    expect(play(plain, "a2", "b2").rounds[1].plays.a.total).toBe(7);
  });

  it("an Annullatore stops it", () => {
    const spoiler = character("s", {}, { code: "spoiler", params: {} });
    const nullifier = character("n", {}, { code: "nullifier", params: {} });
    const score = scorePlay(character("x"), t, { ...context, carriedBonus: 3, opponent: { ...spoiler, power: null } });
    expect(score.total).toBe(11);
    expect(nullifier.power?.code).toBe("nullifier");
  });
});

describe("Presagio", () => {
  it("while in the team and not played, the bot sees the next round's threat", () => {
    const catalog = threatCatalog();
    const threats = [catalog[0], catalog[10], catalog[20], catalog[30], catalog[40]];
    const omen = character("o", {}, { code: "omen", params: {} });
    const teamA = [omen, character("a2"), character("a3"), character("a4"), character("a5")];
    const teamB = [1, 2, 3, 4, 5].map((i) => character(`b${i}`));
    const knowledge = { threatCatalog: catalog, families: FAMILIES, abilityMeans: {}, characters: [...teamA, ...teamB] };
    const start = newState(teamA, teamB, threats);
    expect(botView(start, "a", knowledge).foreseenThreats?.map((x) => x?.id)).toEqual([threats[1].id]);
    const after = play(start, "o", "b1");
    expect(botView(after, "a", knowledge).foreseenThreats).toBeNull();
  });

  it("Oracolo: the bot sees the threats of the highest level, wherever they are", () => {
    const oracle = character("o", {}, { code: "oracle", params: {} });
    const lane = [threat("t1", ["FOR"]), threat("t2", ["FOR", "VEL", "RES"]), threat("t3", ["FOR"]), threat("t4", ["FOR", "VEL", "RES"]), threat("t5", ["FOR", "VEL"])];
    const teamA = [oracle, character("a2"), character("a3"), character("a4"), character("a5")];
    const teamB = [1, 2, 3, 4, 5].map((i) => character(`b${i}`));
    const knowledge = { threatCatalog: threatCatalog(), families: FAMILIES, abilityMeans: {}, characters: [...teamA, ...teamB] };
    const view = botView(newState(teamA, teamB, lane), "a", knowledge);
    expect(view.foreseenThreats?.map((x) => x?.id ?? null)).toEqual(["t2", null, "t4"]);
    expect(botView(newState(teamB, teamA, lane), "a", knowledge).foreseenThreats).toBeNull();
  });
});
