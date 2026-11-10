import { describe, expect, it } from "vitest";
import { mulberry32 } from "./rng.ts";
import { character, FAMILIES, threatCatalog, TRIPLE_RULES, TRIPLE_THREATS, tripleState } from "./test-fixtures.ts";
import {
  autoTriplePlacement,
  drawTripleThreats,
  isTripleFinished,
  isValidTriplePlacement,
  playTriplePvpRound,
  previewTriplePlay,
  resolveTripleRound,
  shuffleDeck,
  tripleDeckSize,
  tripleHand,
  triplePoints,
  triplePowerRound,
  tripleResult,
  tripleTotalScores,
  type TripleState,
} from "./triple.ts";
import type { Character, Power } from "./types.ts";

const power = (code: string, params: Record<string, string | number> = {}): Power => ({ code, params });

/** Nine characters with every value at `base`. */
function deck(prefix: string, base = 4): Character[] {
  return Array.from({ length: 9 }, (_, i) => character(`${prefix}${i}`, {}, null, base));
}

/** Plays a round with each side's hand placed in hand order, or as given. */
function play(state: TripleState, a?: string[], b?: string[]) {
  return resolveTripleRound(
    state,
    {
      a: { characterIds: a ?? tripleHand(state, "a").map((c) => c.id), autoPlayed: false },
      b: { characterIds: b ?? tripleHand(state, "b").map((c) => c.id), autoPlayed: false },
    },
    FAMILIES,
  ).state;
}

describe("setup", () => {
  it("draws three distinct threats of any level", () => {
    const rng = mulberry32(3);
    const catalog = threatCatalog();
    const levels = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const threats = drawTripleThreats(rng, catalog, TRIPLE_RULES);
      expect(threats).toHaveLength(3);
      expect(new Set(threats.map((t) => t.id)).size).toBe(3);
      levels.add(threats.map((t) => t.level).sort().join(""));
    }
    // No composition rule: three low threats, three high ones, anything.
    expect(levels.has("111")).toBe(true);
    expect(levels.has("666")).toBe(true);
  });

  it("uses a deck of nine and shuffles it", () => {
    expect(tripleDeckSize(TRIPLE_RULES)).toBe(9);
    const cards = deck("a");
    const shuffled = shuffleDeck(mulberry32(5), cards);
    expect([...shuffled].sort((x, y) => x.id.localeCompare(y.id))).toEqual(cards);
    expect(shuffled.map((c) => c.id)).not.toEqual(cards.map((c) => c.id));
  });

  it("maps the rounds onto a classic match for the powers that count rounds", () => {
    expect([1, 2, 3].map((r) => triplePowerRound(TRIPLE_RULES, r))).toEqual([1, 3, 5]);
  });
});

describe("rounds", () => {
  it("draws the next three cards of each deck every round", () => {
    let state = tripleState(deck("a"), deck("b"));
    expect(tripleHand(state, "a").map((c) => c.id)).toEqual(["a0", "a1", "a2"]);
    state = play(state);
    expect(tripleHand(state, "a").map((c) => c.id)).toEqual(["a3", "a4", "a5"]);
    expect(tripleHand(state, "b").map((c) => c.id)).toEqual(["b3", "b4", "b5"]);
    state = play(play(state));
    expect(isTripleFinished(state)).toBe(true);
    expect(tripleHand(state, "a")).toEqual([]);
  });

  it("gives a point for each threat won and keeps void contests for nobody", () => {
    const a = deck("a");
    a[0] = character("a0", { FOR: 9 });
    a[1] = character("a1", { VEL: 1, RES: 1 });
    const state = play(tripleState(a, deck("b")));
    expect(state.rounds[0].winners).toEqual(["a", "b", null]);
    expect(state.rounds[0].plays.a.map((p) => p.outcome)).toEqual(["won", "lost", "void"]);
    expect(triplePoints(state)).toEqual({ a: 1, b: 1 });
  });

  it("lets each side choose which card goes on which threat", () => {
    const a = deck("a");
    a[2] = character("a2", { FOR: 10 });
    let state = tripleState(a, deck("b"));
    // The FOR specialist on the level 1 threat (FOR) wins it; elsewhere it loses.
    const on = play(state, ["a2", "a0", "a1"]);
    expect(on.rounds[0].winners[0]).toBe("a");
    state = play(state, ["a0", "a1", "a2"]);
    expect(state.rounds[0].winners[0]).toBe(null);
  });

  it("refuses a placement that is not exactly the hand", () => {
    const state = tripleState(deck("a"), deck("b"));
    expect(isValidTriplePlacement(state, "a", ["a0", "a1", "a2"])).toBe(true);
    expect(isValidTriplePlacement(state, "a", ["a0", "a1"])).toBe(false);
    expect(isValidTriplePlacement(state, "a", ["a0", "a0", "a1"])).toBe(false);
    expect(isValidTriplePlacement(state, "a", ["a0", "a1", "a3"])).toBe(false);
    expect(isValidTriplePlacement(state, "a", ["b0", "a1", "a2"])).toBe(false);
    expect(() => play(state, ["a0", "a1", "a3"])).toThrow("invalid_placement");
  });

  it("places a hand at random when the timer expires", () => {
    const state = tripleState(deck("a"), deck("b"));
    const orders = new Set<string>();
    const rng = mulberry32(8);
    for (let i = 0; i < 100; i++) {
      const placement = autoTriplePlacement(state, "a", rng);
      expect(placement.autoPlayed).toBe(true);
      expect(isValidTriplePlacement(state, "a", placement.characterIds)).toBe(true);
      orders.add(placement.characterIds.join());
    }
    expect(orders.size).toBe(6);
    const played = playTriplePvpRound({ state, choices: { a: null, b: ["b2", "b1", "b0"] }, families: FAMILIES, rng });
    expect(played.round.plays.a.every((p) => p.autoPlayed)).toBe(true);
    expect(played.round.plays.b.map((p) => p.characterId)).toEqual(["b2", "b1", "b0"]);
    expect(played.finished).toBe(false);
  });
});

describe("result", () => {
  it("is decided by points, then by the sum of scores, otherwise a draw", () => {
    const strong = deck("a", 6);
    let state = tripleState(strong, deck("b"));
    state = play(play(play(state)));
    expect(triplePoints(state)).toEqual({ a: 9, b: 0 });
    expect(tripleResult(state)).toBe("a");

    // Same points: the higher sum of scores.
    const a = deck("a");
    a[0] = character("a0", { FOR: 9 });
    a[1] = character("a1", { VEL: 3, RES: 3 });
    state = play(play(play(tripleState(a, deck("b")))));
    expect(triplePoints(state)).toEqual({ a: 1, b: 1 });
    const totals = tripleTotalScores(state);
    expect(totals.a).toBe(totals.b + 5 - 2);
    expect(tripleResult(state)).toBe("a");

    state = play(play(play(tripleState(deck("a"), deck("b")))));
    expect(tripleResult(state)).toBe("draw");
  });

  it("is null while playing", () => {
    expect(tripleResult(play(tripleState(deck("a"), deck("b"))))).toBe(null);
  });
});

describe("powers", () => {
  it("passes Riscossa to the card on the same threat in the next round only", () => {
    const a = deck("a");
    a[0] = character("a0", { FOR: 1 }, power("comeback", { bonus: 2 }));
    let state = play(tripleState(a, deck("b")));
    expect(state.rounds[0].winners[0]).toBe("b");
    state = play(state);
    expect(state.rounds[1].plays.a.map((p) => p.bonus)).toEqual([2, 0, 0]);
  });

  it("pays Slancio and Vendetta on the same threat", () => {
    const a = deck("a");
    a[1] = character("a1", { VEL: 9 }, power("momentum", { bonus: 2 }));
    a[5] = character("a5", {}, power("vendetta", { bonus: 3 }));
    a[2] = character("a2", { INT: 0 });
    let state = play(tripleState(a, deck("b")));
    expect(state.rounds[0].winners).toEqual([null, "a", "b"]);
    state = play(state);
    // a3, a4, a5: Slancio on threat 2 (a4); Vendetta pays on threat 3, lost the round before.
    expect(state.rounds[1].plays.a.map((p) => p.bonus)).toEqual([0, 2, 3]);
  });

  it("pays Apripista only in round 1 and Ultimo baluardo only in round 3", () => {
    const opener = (id: string) => character(id, {}, power("opener", { bonus: 3, max_round: 2 }));
    const lastStand = (id: string) => character(id, {}, power("last_stand", { bonus: 3, min_round: 4 }));
    const a = [opener("a0"), lastStand("a1"), ...deck("x").slice(0, 1), opener("a3"), lastStand("a4"), ...deck("y").slice(0, 1), opener("a6"), lastStand("a7"), ...deck("z").slice(0, 1)];
    const state = play(play(play(tripleState(a, deck("b")))));
    expect(state.rounds.map((r) => [r.plays.a[0].bonus, r.plays.a[1].bonus])).toEqual([
      [3, 0],
      [0, 0],
      [0, 3],
    ]);
  });

  it("never pays Crescendo: the threat on a lane keeps its level", () => {
    const a = deck("a").map((c, i) => (i % 3 === 2 ? character(c.id, {}, power("crescendo", { bonus: 3 })) : c));
    const state = play(play(play(tripleState(a, deck("b")))));
    expect(state.rounds.map((r) => r.plays.a[2].bonus)).toEqual([0, 0, 0]);
  });

  it("acts on the opposing card of the same threat only (Annullatore, Sabotatore)", () => {
    const a = deck("a");
    a[0] = character("a0", {}, power("nullifier"));
    a[1] = character("a1", {}, power("sabotage", { malus: 1 }));
    const b = deck("b");
    b[0] = character("b0", {}, power("ability_bonus", { ability: "FOR", bonus: 3 }));
    b[2] = character("b2", {}, power("ability_bonus", { ability: "INT", bonus: 3 }));
    const state = play(tripleState(a, b));
    const plays = state.rounds[0].plays;
    // Threat 1: the Annullatore stops b0's bonus. Threat 2: Sabotatore takes 1 from each ability. Threat 3: b2 keeps its bonus.
    expect(plays.b.map((p) => p.bonus)).toEqual([0, 0, 3]);
    expect(plays.b.map((p) => p.base)).toEqual([4, 6, 12]);
    expect(state.rounds[0].winners).toEqual([null, "a", "b"]);
  });

  it("counts threats won as rounds won (Sfavorito) and the whole deck as the team (Legame)", () => {
    const b = deck("b", 5);
    const a = deck("a");
    a[3] = character("a3", {}, power("underdog", { bonus: 3 }));
    a[4] = { ...character("a4", {}, power("bond", { bonus: 1 })), faction: "heroes" };
    a[7] = { ...a[7], faction: "heroes" };
    a[8] = { ...a[8], faction: "heroes" };
    let state = play(tripleState(a, b));
    expect(triplePoints(state)).toEqual({ a: 0, b: 3 });
    expect(previewTriplePlay(state, "a", a[3], 0, FAMILIES).bonus).toBe(3);
    state = play(state);
    expect(state.rounds[1].plays.a.map((p) => p.bonus)).toEqual([3, 2, 0]);
  });
});
