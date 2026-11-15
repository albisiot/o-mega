// Sabotatore and ties (SPEC §4.4, §5.6, §5.15): the malus counts in the totals and in
// the tie-break on the highest value; Implacabile settles a tie before that value;
// Schermato and Riflesso keep their values; under Rovescio the lower values win.
import { describe, expect, it } from "vitest";
import { resolveBossTurn, type BossChoice, type BossState } from "./boss.ts";
import { requiredScore, resolveEmergencyPlay, type EmergencyRules } from "./emergency.ts";
import { resolveRound } from "./match.ts";
import { compareScores, scorePlay, type ScoreContext } from "./scoring.ts";
import { bossState, character, FAMILIES, newState, threat, tripleState } from "./test-fixtures.ts";
import { resolveTripleRound } from "./triple.ts";
import type { Character, Power, Threat } from "./types.ts";

const power = (code: string, params: Record<string, string | number> = {}): Power => ({ code, params });
const saboteur = (stats: Record<string, number>, malus = 1) => character("sab", stats, power("sabotage", { malus }), 0);
const plain = (stats: Record<string, number>, id = "plain") => character(id, stats, null, 0);

const FOR_VEL = threat("fv", ["FOR", "VEL"]);
const REVERSE: Threat = { ...FOR_VEL, modifier: { code: "reverse" } };

/** One classic round between `a` and `b` on `target`, as the server resolves it. */
function round(a: Character, b: Character, target: Threat = FOR_VEL) {
  const state = newState([a], [b], [target]);
  const choice = (c: Character) => ({ characterId: c.id, autoPlayed: false });
  return resolveRound(state, { a: choice(a), b: choice(b) }, FAMILIES).round;
}

describe("Sabotatore and ties in a match round", () => {
  it("full tie: equal totals and equal highest value after the malus, the round is void", () => {
    // FOR 8, VEL 5 lose 1 each: 7 + 4 = 11, highest 7. Without the malus in the tie-break 8 would win.
    const r = round(plain({ FOR: 8, VEL: 5 }), saboteur({ FOR: 7, VEL: 4 }));
    expect(r.plays.a).toMatchObject({ total: 11, highest: 7 });
    expect(r.plays.b).toMatchObject({ total: 11, highest: 7 });
    expect(r.winner).toBeNull();
  });

  it("equal totals, different highest values: the higher value after the malus wins", () => {
    const r = round(plain({ FOR: 9, VEL: 4 }), saboteur({ FOR: 6, VEL: 5 }));
    expect(r.plays.a).toMatchObject({ total: 11, highest: 8 });
    expect(r.plays.b).toMatchObject({ total: 11, highest: 6 });
    expect(r.winner).toBe("a");
  });

  it("the malus can turn the tie-break: 8 against 7 on the card, 6 against 7 in the round", () => {
    const r = round(plain({ FOR: 8, VEL: 7 }), saboteur({ FOR: 7, VEL: 4 }, 2));
    expect(r.plays.a).toMatchObject({ total: 11, highest: 6 });
    expect(r.plays.b).toMatchObject({ total: 11, highest: 7 });
    expect(r.winner).toBe("b");
  });

  it("Implacabile wins the tie the malus made, before the highest value", () => {
    const relentless = character("rel", { FOR: 7, VEL: 6 }, power("relentless"), 0);
    const r = round(relentless, saboteur({ FOR: 9, VEL: 2 }));
    expect(r.plays.a).toMatchObject({ total: 11, highest: 6, relentless: true });
    expect(r.plays.b).toMatchObject({ total: 11, highest: 9 });
    expect(r.winner).toBe("a");
  });

  it("an Annullatore takes Implacabile away: the tie goes back to the highest value", () => {
    const relentless = character("rel", { FOR: 6, VEL: 6 }, power("relentless"), 0);
    const nullifier = character("nul", { FOR: 9, VEL: 3 }, power("nullifier"), 0);
    const r = round(relentless, nullifier);
    expect(r.plays.a.relentless).toBeUndefined();
    expect(r.winner).toBe("b");
  });

  it("Schermato is not touched: its values count whole, in the total and in the tie-break", () => {
    const shielded = character("shi", { FOR: 5, VEL: 5 }, power("shielded", { bonus: 1 }), 0);
    const r = round(shielded, saboteur({ FOR: 6, VEL: 5 }));
    // 5 + 5 + 1 (Schermato against a Sabotatore) = 11, highest 5: the saboteur's 6 wins.
    expect(r.plays.a).toMatchObject({ base: 10, total: 11, highest: 5 });
    expect(r.plays.b).toMatchObject({ total: 11, highest: 6 });
    expect(r.winner).toBe("b");
  });

  it("Riflesso sends the malus back: the saboteur's tie-break value drops too", () => {
    const reflect = character("ref", { FOR: 6, VEL: 4 }, power("reflect"), 0);
    // The saboteur's FOR 7, VEL 5 count 6 + 4: 10 against 10, 6 against 6, void.
    const r = round(reflect, saboteur({ FOR: 7, VEL: 5 }));
    expect(r.plays.a).toMatchObject({ total: 10, highest: 6 });
    expect(r.plays.b).toMatchObject({ total: 10, highest: 6 });
    expect(r.winner).toBeNull();
  });

  it("the malus never brings a value below 0, nor the tie-break value", () => {
    const r = round(plain({ FOR: 0, VEL: 1 }), saboteur({ FOR: 0, VEL: 0 }, 3));
    expect(r.plays.a).toMatchObject({ total: 0, highest: 0 });
    expect(r.winner).toBeNull();
  });

  it("Silenzio della tomba: no Sabotatore, the tie is settled on the whole values", () => {
    const tomb: Threat = { ...FOR_VEL, modifier: { code: "tomb_silence" } };
    const r = round(plain({ FOR: 8, VEL: 3 }), saboteur({ FOR: 7, VEL: 4 }), tomb);
    expect(r.plays.a).toMatchObject({ total: 11, highest: 8 });
    expect(r.winner).toBe("a");
  });
});

describe("Sabotatore and ties under Rovescio", () => {
  it("the lower total wins: the malus helps the opponent", () => {
    // 8 + 4 lose 1 each: 10 against the saboteur's 11, and under Rovescio 10 wins.
    const r = round(plain({ FOR: 8, VEL: 4 }), saboteur({ FOR: 6, VEL: 5 }), REVERSE);
    expect(r.winner).toBe("a");
  });

  it("on equal totals the lower highest value wins, counted after the malus", () => {
    // 6 + 5 = 11, highest 6 after the malus (7 on the card) against 7 + 4: 6 is lower.
    const r = round(plain({ FOR: 7, VEL: 6 }), saboteur({ FOR: 7, VEL: 4 }), REVERSE);
    expect(r.plays.a).toMatchObject({ total: 11, highest: 6 });
    expect(r.plays.b).toMatchObject({ total: 11, highest: 7 });
    expect(r.winner).toBe("a");
  });

  it("equal totals and equal highest values: void, as without Rovescio", () => {
    const r = round(plain({ FOR: 8, VEL: 5 }), saboteur({ FOR: 7, VEL: 4 }), REVERSE);
    expect(r.winner).toBeNull();
  });

  it("Implacabile still wins a tie under Rovescio, before the highest value", () => {
    const relentless = character("rel", { FOR: 9, VEL: 3 }, power("relentless"), 0);
    const r = round(relentless, saboteur({ FOR: 6, VEL: 4 }), REVERSE);
    expect(r.plays.a).toMatchObject({ total: 10, highest: 8 });
    expect(r.winner).toBe("a");
  });
});

describe("Sabotatore and ties in the other modes", () => {
  it("Allarme Triplo: each threat is compared as a round, the malus in the tie-break too", () => {
    const deck = (prefix: string, first: Character[]) => [
      ...first,
      ...Array.from({ length: 9 - first.length }, (_, i) => character(`${prefix}${i + first.length}`, {}, null, 0)),
    ];
    // Threat 2 (VEL, RES): the saboteur's 4 + 4 against 5 + 5 lowered to 4 + 4: void.
    // Threat 3 (INT, VOL, PER): a different card, untouched by the saboteur.
    const a = deck("a", [plain({ FOR: 1 }, "a0"), character("a1", { VEL: 4, RES: 4 }, power("sabotage", { malus: 1 }), 0)]);
    const b = deck("b", [plain({ FOR: 1 }, "b0"), plain({ VEL: 5, RES: 5 }, "b1")]);
    const state = tripleState(a, b);
    const hand = (cards: Character[]) => ({ characterIds: cards.slice(0, 3).map((c) => c.id), autoPlayed: false });
    const result = resolveTripleRound(state, { a: hand(a), b: hand(b) }, FAMILIES).round;
    expect(result.plays.b[1]).toMatchObject({ total: 8, highest: 4 });
    expect(result.winners[1]).toBeNull();

    // The same on a Rovescio threat: equal totals, the lower highest value after the malus wins.
    const reversed = tripleState(
      deck("a", [plain({ FOR: 1 }, "a0"), character("a1", { VEL: 5, RES: 3 }, power("sabotage", { malus: 1 }), 0)]),
      deck("b", [plain({ FOR: 1 }, "b0"), plain({ VEL: 5, RES: 5 }, "b1")]),
      [state.threats[0], { ...state.threats[1], modifier: { code: "reverse" } }, state.threats[2]],
    );
    const flipped = resolveTripleRound(reversed, { a: hand(reversed.decks.a), b: hand(reversed.decks.b) }, FAMILIES).round;
    expect(flipped.plays.a[1]).toMatchObject({ total: 8, highest: 5 });
    expect(flipped.plays.b[1]).toMatchObject({ total: 8, highest: 4 });
    expect(flipped.winners[1]).toBe("b");
  });

  it("Grande Minaccia: arriving together, the front is held as a round is won", () => {
    const play = (state: BossState, a: [Character, number], b: [Character, number]) => {
      const choice = ([c, front]: [Character, number]): BossChoice => ({ characterId: c.id, front, autoPlayed: false });
      return resolveBossTurn(state, { a: choice(a), b: choice(b) }, FAMILIES).turn;
    };
    const sab = character("s", { VEL: 4, RES: 4 }, power("sabotage", { malus: 1 }), 0);
    // Front 1 (VEL, RES): 5 + 5 lowered to 8, highest 4 against 4: nobody holds it.
    expect(play(bossState([sab], [plain({ VEL: 5, RES: 5 }, "t")]), [sab, 1], [plain({ VEL: 5, RES: 5 }, "t"), 1]).holders[1]).toBeNull();
    // 6 + 4 lowered to 5 + 3: 8 against 8, 5 against 4: the newcomer holds it.
    const peak = plain({ VEL: 6, RES: 4 }, "p");
    expect(play(bossState([sab], [peak]), [sab, 1], [peak, 1]).holders[1]).toBe("b");
  });

  it("Grande Minaccia: a saboteur arriving later does not lower the score already on the front", () => {
    const sab = character("s", { VEL: 5, RES: 5 }, power("sabotage", { malus: 1 }), 0);
    const holder = plain({ VEL: 6, RES: 4 }, "h");
    const filler = character("f", {}, null, 0);
    const choice = (c: Character, front: number): BossChoice => ({ characterId: c.id, front, autoPlayed: false });
    let state = bossState([filler, sab], [holder, filler]);
    state = resolveBossTurn(state, { a: choice(filler, 4), b: choice(holder, 1) }, FAMILIES).state;
    const turn = resolveBossTurn(state, { a: choice(sab, 1), b: choice({ ...filler }, 3) }, FAMILIES).turn;
    // 10 against 10: the holder keeps its 6 (no malus), the saboteur 5: the holder keeps the front.
    expect(turn.plays.a).toMatchObject({ total: 10, highest: 5 });
    expect(turn.holders[1]).toBe("b");
  });

  it("Emergenza: there is no tie to break, reaching the lowered target passes", () => {
    const rules: EmergencyRules = {
      threatsPerRun: 8,
      maxFailures: 3,
      targets: { 1: 7, 2: 13, 3: 18, 4: 23, 5: 28, 6: 32 },
      threatLevels: { min: 1, max: 6, requireOneAtMost: 2, requireOneAtLeast: 5, minSum: 24, maxSum: 32 },
    };
    const sab = character("s", { FOR: 6, VEL: 5 }, power("sabotage", { malus: 1 }), 0);
    const resolve = (c: Character, t: Threat) =>
      resolveEmergencyPlay({ character: c, threat: t, squad: [c], attempts: [], rules, families: FAMILIES });
    // Level 2 needs 13; Sabotatore takes 1 per required ability: 11 is enough, 10 is not.
    expect(resolve(sab, FOR_VEL)).toMatchObject({ required: 11, passed: true, score: { total: 11 } });
    expect(resolve({ ...sab, stats: { ...sab.stats, VEL: 4 } }, FOR_VEL).passed).toBe(false);
    // Under Rovescio the target is the most a play may score: Sabotatore does not move it.
    expect(requiredScore(sab, { ...FOR_VEL, target: 11, modifier: { code: "reverse" } }, rules)).toBe(11);
  });
});

describe("compareScores reads the highest value it is given", () => {
  const context: ScoreContext = { families: FAMILIES, roundsWon: 0, opponentRoundsWon: 0, carriedBonus: 0, round: 1, team: [] };

  it("the same card scores a lower highest value with a malus", () => {
    const card = plain({ FOR: 8, VEL: 5 });
    expect(scorePlay(card, FOR_VEL, context).highest).toBe(8);
    expect(scorePlay(card, FOR_VEL, { ...context, abilityMalus: 1 }).highest).toBe(7);
    const lowered = scorePlay(card, FOR_VEL, { ...context, abilityMalus: 1 });
    const other = scorePlay(plain({ FOR: 7, VEL: 4 }), FOR_VEL, context);
    expect(compareScores(lowered, other, FOR_VEL)).toBeNull();
  });
});
