// The power variants of 16 November 2026: every exact power on at most one Hero, one
// Villain and one Neutral, so many cards got the same power with other numbers or
// another condition (SPEC §4.4, docs/POWERS-BACKLOG.md).

import { describe, expect, it } from "vitest";
import { botView } from "./bots.ts";
import { requiredScore, resolveEmergencyPlay, type EmergencyRules } from "./emergency.ts";
import { carriedBonus, playedIn, resolveRound } from "./match.ts";
import { compareScores, powerBonus, scorePlay, type ScoreContext } from "./scoring.ts";
import { character, FAMILIES, newState, RULES, threat, threatCatalog } from "./test-fixtures.ts";
import { resolveTripleRound } from "./triple.ts";
import { tripleState } from "./test-fixtures.ts";
import type { Character, MatchState, PlayScore, Power } from "./types.ts";

const context: ScoreContext = { families: FAMILIES, roundsWon: 0, opponentRoundsWon: 0, carriedBonus: 0, round: 1, team: [] };

function withPower(id: string, power: Power, faction = "heroes", stats: Record<string, number> = {}): Character {
  return { ...character(id, stats, power), faction };
}

function play(state: MatchState, a: string, b: string) {
  return resolveRound(state, { a: { characterId: a, autoPlayed: false }, b: { characterId: b, autoPlayed: false } }, FAMILIES).state;
}

const score = (total: number, extra: Partial<PlayScore> = {}): PlayScore => ({ characterId: "x", base: total, bonus: 0, total, highest: 5, ...extra });

describe("power variants", () => {
  it("Ultimo baluardo in a single round", () => {
    const wick = character("w", {}, { code: "round_exact", params: { bonus: 4, round: 4 } });
    const t = threat("t", ["FOR"]);
    expect(powerBonus(wick, t, { ...context, round: 3 })).toBe(0);
    expect(powerBonus(wick, t, { ...context, round: 4 })).toBe(4);
    expect(powerBonus(wick, t, { ...context, round: 5 })).toBe(0);
  });

  it("Legame variants count the faction in the team, the played ones, the unplayed ones or the one before", () => {
    const t = threat("t", ["FOR"]);
    const ally = (id: string) => withPower(id, { code: "ability_bonus", params: { ability: "VEL", bonus: 2 } });
    const villain = withPower("v", { code: "ability_bonus", params: { ability: "VEL", bonus: 2 } }, "villains");
    const [a1, a2, a3] = [ally("a1"), ally("a2"), ally("a3")];

    const pact = withPower("p", { code: "bond_threshold", params: { bonus: 3, min_allies: 2 } });
    expect(powerBonus(pact, t, { ...context, team: [pact, a1, villain] })).toBe(0);
    expect(powerBonus(pact, t, { ...context, team: [pact, a1, a2, villain] })).toBe(3);

    const relay = withPower("r", { code: "bond_relay", params: { bonus: 3 } });
    expect(powerBonus(relay, t, { ...context, played: [villain, a1] })).toBe(3);
    expect(powerBonus(relay, t, { ...context, played: [a1, villain] })).toBe(0);
    expect(powerBonus(relay, t, context)).toBe(0);

    const played = withPower("pl", { code: "bond_played", params: { bonus: 2 } });
    expect(powerBonus(played, t, { ...context, team: [played, a1, a2, a3, villain], played: [a1, villain, a2] })).toBe(4);

    const unplayed = withPower("u", { code: "bond_unplayed", params: { bonus: 2 } });
    expect(powerBonus(unplayed, t, { ...context, team: [unplayed, a1, a2, a3, villain], played: [a1] })).toBe(4);
  });

  it("Sfavorito variants: per round behind, against a side one round from winning, behind on points", () => {
    const t = threat("t", ["FOR"]);
    const fury = character("f", {}, { code: "underdog_per_round", params: { bonus: 2 } });
    expect(powerBonus(fury, t, { ...context, roundsWon: 0, opponentRoundsWon: 2 })).toBe(4);
    expect(powerBonus(fury, t, { ...context, roundsWon: 2, opponentRoundsWon: 1 })).toBe(0);

    const wall = character("w", {}, { code: "underdog_wall", params: { bonus: 4, min_wins: 2 } });
    expect(powerBonus(wall, t, { ...context, roundsWon: 2, opponentRoundsWon: 2 })).toBe(4);
    expect(powerBonus(wall, t, { ...context, roundsWon: 0, opponentRoundsWon: 1 })).toBe(0);

    const chaser = character("c", {}, { code: "underdog_points", params: { bonus: 3 } });
    expect(powerBonus(chaser, t, { ...context, scoreLead: -4 })).toBe(3);
    expect(powerBonus(chaser, t, { ...context, scoreLead: 0 })).toBe(0);
    // Emergenza and previews: no opponent, no points to compare.
    expect(powerBonus(chaser, t, context)).toBe(0);
  });

  it("Sfavorito sui punti reads the match totals before the round", () => {
    const t = [threat("t1", ["FOR"]), threat("t2", ["FOR"])];
    const chaser = character("c", { FOR: 5 }, { code: "underdog_points", params: { bonus: 3 } });
    let state = newState([character("a1", { FOR: 2 }), chaser], [character("b1", { FOR: 6 }), character("b2", { FOR: 5 })], t);
    state = play(state, "a1", "b1");
    state = resolveRound(state, { a: { characterId: "c", autoPlayed: false }, b: { characterId: "b2", autoPlayed: false } }, FAMILIES).state;
    expect(state.rounds[1].plays.a.total).toBe(8);
  });

  it("Nemesi variants: any other faction, or the same one", () => {
    const t = threat("t", ["FOR"]);
    const other = withPower("o", { code: "nemesis_other", params: { bonus: 2 } }, "villains");
    const rival = withPower("r", { code: "rival", params: { bonus: 3 } }, "neutrals");
    expect(powerBonus(other, t, { ...context, opponent: withPower("n", { code: "spy", params: {} }, "neutrals") })).toBe(2);
    expect(powerBonus(other, t, { ...context, opponent: withPower("v", { code: "spy", params: {} }, "villains") })).toBe(0);
    expect(powerBonus(rival, t, { ...context, opponent: withPower("n", { code: "spy", params: {} }, "neutrals") })).toBe(3);
    expect(powerBonus(rival, t, context)).toBe(0);
  });

  it("Riverbero copies the new point powers", () => {
    const echo = character("e", {}, { code: "echo", params: {} });
    const wall = character("w", {}, { code: "underdog_wall", params: { bonus: 4, min_wins: 2 } });
    expect(powerBonus(echo, threat("t", ["FOR"]), { ...context, opponentRoundsWon: 2, played: [wall] })).toBe(4);
  });
});

describe("Sabotatore variants", () => {
  const big = character("big", {}, { code: "sabotage_big", params: { malus: 1, from_level: 3 } });
  const flat = character("flat", {}, { code: "sabotage_flat", params: { malus: 2 } });
  const target = character("t", { FOR: 5, VEL: 5, RES: 5 });

  it("the one for the big threats acts only from its level", () => {
    const small = newState([big], [target], [threat("s", ["FOR", "VEL"])]);
    expect(play(small, "big", "t").rounds[0].plays.b.total).toBe(10);
    const large = newState([big], [target], [threat("l", ["FOR", "VEL", "RES"])]);
    expect(play(large, "big", "t").rounds[0].plays.b.total).toBe(12);
  });

  it("the one on the score takes points from the total, never from the tie-break", () => {
    const state = play(newState([flat], [target], [threat("l", ["FOR", "VEL"])]), "flat", "t");
    expect(state.rounds[0].plays.b.total).toBe(8);
    expect(state.rounds[0].plays.b.highest).toBe(5);
  });

  it("never brings the score below 0", () => {
    const weak = character("w", { FOR: 1 });
    expect(play(newState([flat], [weak], [threat("s", ["FOR"])]), "flat", "w").rounds[0].plays.b.total).toBe(0);
  });

  it("Schermato stops it and gets its bonus; Riflesso sends it back", () => {
    const shield = character("s", { FOR: 5, VEL: 5 }, { code: "shielded", params: { bonus: 2 } });
    const shielded = play(newState([flat], [shield], [threat("l", ["FOR", "VEL"])]), "flat", "s");
    expect(shielded.rounds[0].plays.b.total).toBe(12);
    const mirror = character("m", { FOR: 5, VEL: 5 }, { code: "reflect", params: {} });
    const reflected = play(newState([{ ...flat, stats: { ...flat.stats, FOR: 5, VEL: 5 } }], [mirror], [threat("l", ["FOR", "VEL"])]), "flat", "m");
    expect(reflected.rounds[0].plays.a.total).toBe(8);
    expect(reflected.rounds[0].plays.b.total).toBe(10);
  });

  it("Emergenza: they lower the target", () => {
    const rules = { targets: { 1: 7, 2: 13, 3: 18 } };
    expect(requiredScore(big, threat("s", ["FOR", "VEL"]), rules)).toBe(13);
    expect(requiredScore(big, threat("l", ["FOR", "VEL", "RES"]), rules)).toBe(15);
    expect(requiredScore(flat, threat("s", ["FOR", "VEL"]), rules)).toBe(11);
  });
});

describe("Implacabile variants", () => {
  it("win a round lost by their margin or less, unless the other is Implacabile too", () => {
    expect(compareScores(score(9, { relentless: true, relentlessMargin: 1 }), score(10))).toBe("a");
    expect(compareScores(score(8, { relentless: true, relentlessMargin: 1 }), score(10))).toBe("b");
    expect(compareScores(score(9, { relentless: true, relentlessMargin: 1 }), score(10, { relentless: true }))).toBe("b");
    expect(compareScores(score(10), score(8, { relentless: true, relentlessMargin: 2 }))).toBe("b");
    // Under Rovescio the lower total wins: one point more is what it loses by.
    const reverse = { ...threat("r", ["FOR"]), modifier: { code: "reverse" as const } };
    expect(compareScores(score(6, { relentless: true, relentlessMargin: 1 }), score(5), reverse)).toBe("a");
  });

  it("the margin applies on the small threats, on the big ones, or while behind", () => {
    const small = character("s", {}, { code: "relentless_small", params: { margin: 1, max_level: 2 } });
    const big = character("b", {}, { code: "relentless_big", params: { margin: 2, from_level: 5 } });
    const behind = character("h", {}, { code: "relentless_behind", params: { margin: 1 } });
    const one = threat("one", ["FOR"]);
    const five = threat("five", ["FOR", "VEL", "RES", "INT", "VOL"]);
    expect(scorePlay(small, one, context)).toMatchObject({ relentless: true, relentlessMargin: 1 });
    expect(scorePlay(small, five, context).relentlessMargin).toBeUndefined();
    expect(scorePlay(small, five, context).relentless).toBe(true);
    expect(scorePlay(big, five, context).relentlessMargin).toBe(2);
    expect(scorePlay(behind, one, { ...context, opponentRoundsWon: 1 }).relentlessMargin).toBe(1);
    expect(scorePlay(behind, one, context).relentlessMargin).toBeUndefined();
  });

  it("in a match, the one behind by its margin takes the round", () => {
    const small = character("s", { FOR: 6 }, { code: "relentless_small", params: { margin: 1, max_level: 2 } });
    const state = play(newState([small], [character("o", { FOR: 7 })], [threat("one", ["FOR"])]), "s", "o");
    expect(state.rounds[0].winner).toBe("a");
  });

  it("Emergenza: one point short, plus the margin when it applies", () => {
    const rules = { targets: { 1: 7, 5: 28 } };
    const big = character("b", {}, { code: "relentless_big", params: { margin: 2, from_level: 5 } });
    const behind = character("h", {}, { code: "relentless_behind", params: { margin: 1 } });
    expect(requiredScore(big, threat("five", ["FOR", "VEL", "RES", "INT", "VOL"]), rules)).toBe(25);
    expect(requiredScore(big, threat("one", ["FOR"]), rules)).toBe(6);
    expect(requiredScore(behind, threat("one", ["FOR"]), rules, { roundsWon: 0, opponentRoundsWon: 2 })).toBe(5);
  });
});

describe("Riscossa variants", () => {
  const t = [threat("t1", ["FOR"]), threat("t2", ["FOR"]), threat("t3", ["FOR"]), threat("t4", ["FOR"])];

  it("Riscossa lunga gives its bonus to the two characters after it", () => {
    const long = character("l", { FOR: 1 }, { code: "comeback_long", params: { bonus: 2 } });
    const team = [long, character("a2", { FOR: 1 }), character("a3", { FOR: 1 }), character("a4", { FOR: 1 })];
    const rivals = [1, 2, 3, 4].map((i) => character(`b${i}`, { FOR: 9 }));
    let state = play(newState(team, rivals, t), "l", "b1");
    expect(carriedBonus(state, "a")).toBe(2);
    state = play(state, "a2", "b2");
    expect(carriedBonus(state, "a")).toBe(2);
    state = play(state, "a3", "b3");
    expect(carriedBonus(state, "a")).toBe(0);
  });

  it("Riscossa sullo scarto passes the points it lost by, up to its max", () => {
    const margin = character("m", { FOR: 6 }, { code: "comeback_margin", params: { max: 4 } });
    const close = play(newState([margin, character("a2")], [character("b1", { FOR: 9 }), character("b2")], t), "m", "b1");
    expect(carriedBonus(close, "a")).toBe(3);
    const heavy = play(newState([{ ...margin, stats: { ...margin.stats, FOR: 1 } }, character("a2")], [character("b1", { FOR: 9 }), character("b2")], t), "m", "b1");
    expect(carriedBonus(heavy, "a")).toBe(4);
  });

  it("Emergenza: the margin is how far it fell short of the target", () => {
    const rules: EmergencyRules = {
      threatsPerRun: 8,
      maxFailures: 3,
      targets: { 1: 7 },
      threatLevels: RULES.threatLevels,
    };
    const margin = character("m", { FOR: 4 }, { code: "comeback_margin", params: { max: 4 } });
    const next = character("n", { FOR: 4 });
    const outcome = resolveEmergencyPlay({
      character: next,
      threat: threat("t2", ["FOR"]),
      squad: [margin, next],
      attempts: [{ character: margin, passed: false, level: 1, margin: -3 }],
      rules,
      families: FAMILIES,
    });
    expect(outcome.score.total).toBe(7);
    expect(outcome.passed).toBe(true);
  });
});

describe("Annullatore ritardato", () => {
  const t = [threat("t1", ["FOR"]), threat("t2", ["FOR"]), threat("t3", ["FOR"])];
  const delayed = character("d", {}, { code: "delayed_nullifier", params: {} });
  const booster = character("x", { FOR: 4 }, { code: "ability_bonus", params: { ability: "FOR", bonus: 3 } });

  it("takes the power of the character the opponent plays in the round after", () => {
    const state = play(play(newState([delayed, character("a2")], [character("b1"), booster], t), "d", "b1"), "a2", "x");
    expect(state.rounds[1].plays.b.total).toBe(4);
    expect(playedIn(state, state.rounds[1], "b")?.power).toBeNull();
  });

  it("does nothing in its own round, nor when an Annullatore stopped it", () => {
    const own = play(newState([delayed], [booster], t), "d", "x");
    expect(own.rounds[0].plays.b.total).toBe(7);
    const nullifier = character("n", {}, { code: "nullifier", params: {} });
    const stopped = play(play(newState([delayed, character("a2")], [nullifier, booster], t), "d", "n"), "a2", "x");
    expect(stopped.rounds[1].plays.b.total).toBe(7);
  });

  it("an Annullatore it silenced cancels nothing", () => {
    const nullifier = character("n", {}, { code: "nullifier", params: {} });
    const mine = { ...booster, id: "y" };
    const state = play(play(newState([delayed, mine], [character("b1"), nullifier], t), "d", "b1"), "y", "n");
    expect(state.rounds[1].plays.a.total).toBe(7);
  });

  it("in the Allarme Triplo, on the same threat in the round after", () => {
    const deckA = [delayed, character("a2"), character("a3"), character("a4"), character("a5"), character("a6")];
    const boosters = [0, 1, 2].map((i) => ({ ...booster, id: `x${i}` }));
    const deckB = [character("b1"), character("b2"), character("b3"), ...boosters];
    const threats = [threat("t1", ["FOR"]), threat("t2", ["FOR", "VEL"]), threat("t3", ["FOR", "VEL", "RES"])];
    let state = tripleState(deckA, deckB, threats);
    state = resolveTripleRound(state, { a: { characterIds: ["d", "a2", "a3"], autoPlayed: false }, b: { characterIds: ["b1", "b2", "b3"], autoPlayed: false } }, FAMILIES).state;
    state = resolveTripleRound(state, { a: { characterIds: ["a4", "a5", "a6"], autoPlayed: false }, b: { characterIds: ["x0", "x1", "x2"], autoPlayed: false } }, FAMILIES).state;
    expect(state.rounds[1].plays.b.map((p) => p.parts?.power)).toEqual([0, 3, 3]);
  });
});

describe("Veggente corto", () => {
  it("shows the bot only the next rounds it covers", () => {
    const catalog = threatCatalog();
    const threats = [catalog[0], catalog[10], catalog[20], catalog[30], catalog[40]];
    const short = character("v", {}, { code: "foresight_short", params: { count: 2 } });
    const teamA = [short, character("a2"), character("a3"), character("a4"), character("a5")];
    const teamB = [1, 2, 3, 4, 5].map((i) => character(`b${i}`));
    const state = play(newState(teamA, teamB, threats), "v", "b1");
    const view = botView(state, "a", { threatCatalog: catalog, families: FAMILIES, abilityMeans: {}, characters: [...teamA, ...teamB] });
    expect(view.foreseenThreats?.map((t) => t?.id)).toEqual([threats[2].id]);
  });
});
