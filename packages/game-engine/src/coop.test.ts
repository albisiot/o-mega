import { describe, expect, it } from "vitest";
import {
  autoCoopPlacement,
  chooseRivalEco,
  coopBrokenFronts,
  coopContext,
  coopHand,
  coopPanic,
  coopResult,
  coopRivalHand,
  cutCoopRounds,
  isCoopFinished,
  isValidCoopPlacement,
  playCoopRound,
  previewCoopPlay,
  resolveCoopRound,
  type CoopCardPlacement,
  type CoopRules,
  type CoopState,
} from "./coop.ts";
import { mulberry32 } from "./rng.ts";
import { character, FAMILIES, threat } from "./test-fixtures.ts";
import type { Character, Power, Threat } from "./types.ts";

const power = (code: string, params: Record<string, string | number> = {}): Power => ({ code, params });

const RULES: CoopRules = {
  cityRounds: 4,
  squadSize: 6,
  bossCards: 2,
  targets: { 1: 7, 2: 13, 3: 18, 4: 23, 5: 28, 6: 32 },
  bossTargets: { 1: 9, 2: 15, 3: 20, 4: 25, 5: 30, 6: 34 },
  panicLimit: 8,
  panicLow: 1,
  panicHigh: 2,
  panicHighFromLevel: 4,
  panicReinforced: 1,
};

/** Five written rounds (four in the city, the Boss), five threats each: levels 1, 2, 3, 4, 5. */
function written(): { threats: Threat[]; reinforced: number }[] {
  return Array.from({ length: 5 }, (_, r) => ({
    threats: [
      threat(`r${r}-1`, ["FOR"]),
      threat(`r${r}-2`, ["VEL", "RES"]),
      threat(`r${r}-3`, ["INT", "VOL", "PER"]),
      threat(`r${r}-4`, ["ENE", "MAG", "PSI", "COM"]),
      threat(`r${r}-5`, ["FOR", "VEL", "RES", "INT", "VOL"]),
    ],
    reinforced: 2,
  }));
}

/** Six characters with every value at `base`. */
function squad(prefix: string, base = 4): Character[] {
  return Array.from({ length: 6 }, (_, i) => character(`${prefix}${i}`, {}, null, base));
}

function newCoop(a: Character[] = squad("a"), b: Character[] = squad("b"), rival: Character[] = squad("e", 3).slice(0, 5)): CoopState {
  return {
    rules: RULES,
    players: [
      { id: "alice", squad: a },
      { id: "bruno", squad: b },
    ],
    rival,
    rounds: cutCoopRounds(written(), 2),
    records: [],
  };
}

const put = (characterId: string, slot: number): CoopCardPlacement[] => [{ characterId, slot }];

/** Resolves the current round with the given cards and the rival's first Eco left. */
function play(state: CoopState, alice: CoopCardPlacement[], bruno: CoopCardPlacement[], eco: string | null = coopRivalHand(state)[0]?.id ?? null) {
  return resolveCoopRound(
    state,
    { alice: { cards: alice, autoPlayed: false }, bruno: { cards: bruno, autoPlayed: false } },
    eco,
    FAMILIES,
  );
}

/** The four rounds in the city: Alice on the level 1 threat, Bruno on the rival's; the level 2 one adds 1 Panic each time. */
function toTheBoss(state: CoopState): CoopState {
  for (let i = 0; i < 4; i++) state = play(state, put(`a${i}`, 0), put(`b${i}`, 2)).state;
  return state;
}

describe("cutCoopRounds", () => {
  it("keeps one threat more than the players, and marks the last round as the Boss", () => {
    const rounds = cutCoopRounds(written(), 2);
    expect(rounds.map((r) => r.threats.length)).toEqual([3, 3, 3, 3, 3]);
    expect(rounds.map((r) => r.boss)).toEqual([false, false, false, false, true]);
    expect(cutCoopRounds(written(), 4)[0].threats).toHaveLength(5);
  });

  it("refuses a reinforced threat the table does not use, or too few threats", () => {
    const rounds = written();
    rounds[1].reinforced = 3;
    expect(() => cutCoopRounds(rounds, 2)).toThrow();
    expect(() => cutCoopRounds(written().map((r) => ({ ...r, threats: r.threats.slice(0, 2) })), 2)).toThrow();
  });
});

describe("placements", () => {
  it("takes one unused card in the city and two on the Boss", () => {
    let state = newCoop(squad("a", 7), squad("b", 7));
    expect(isValidCoopPlacement(state, "alice", put("a0", 0))).toBe(true);
    expect(isValidCoopPlacement(state, "alice", [...put("a0", 0), ...put("a1", 1)])).toBe(false);
    expect(isValidCoopPlacement(state, "alice", put("b0", 0))).toBe(false);
    expect(isValidCoopPlacement(state, "alice", put("a0", 3))).toBe(false);
    state = toTheBoss(state);
    expect(coopHand(state, "alice").map((c) => c.id)).toEqual(["a4", "a5"]);
    expect(isValidCoopPlacement(state, "alice", put("a4", 0))).toBe(false);
    expect(isValidCoopPlacement(state, "alice", [...put("a4", 0), ...put("a5", 0)])).toBe(true);
    expect(isValidCoopPlacement(state, "alice", [...put("a0", 0), ...put("a5", 0)])).toBe(false);
  });
});

describe("resolveCoopRound", () => {
  it("stops a threat when the lead plus the supports' best value reach its target", () => {
    // Level 2 (VEL+RES, target 13): 12 alone falls short; a support with 4 brings it to 16.
    const alone = play(newCoop(squad("a", 6)), put("a0", 1), put("b0", 0)).record;
    expect(alone.threats[1]).toMatchObject({ stopped: false, total: 12, required: 13 });
    const together = play(newCoop(squad("a", 6)), put("a0", 1), put("b0", 1)).record;
    expect(together.threats[1]).toMatchObject({ stopped: true, total: 16, required: 13, panic: 0 });
    expect(together.plays.find((p) => p.characterId === "a0")?.role).toBe("lead");
    expect(together.plays.find((p) => p.characterId === "b0")?.role).toBe("support");
  });

  it("adds Panic for every threat nobody stopped: more from level 4, and more for the rival's", () => {
    const { record, state } = play(newCoop(), put("a0", 0), put("b0", 0));
    // Level 1 stopped (4 + 4 ≥ 7); level 2 untouched (+1); level 3, the rival's, untouched (+1 +1).
    expect(record.threats.map((t) => [t.stopped, t.panic])).toEqual([
      [true, 0],
      [false, 1],
      [false, 2],
    ]);
    expect(coopPanic(state)).toBe(3);
    expect(record.eco?.outcome).toBe("won");
  });

  it("on the rival's threat, the team must beat the Eco", () => {
    // Level 3 (INT+VOL+PER): the Eco scores 9 (all 3s); 12 beats it.
    const beaten = play(newCoop(), put("a0", 2), put("b0", 0)).record;
    expect(beaten.threats[2]).toMatchObject({ stopped: true, required: null, total: 12 });
    expect(beaten.eco).toMatchObject({ total: 9, outcome: "lost" });
    // An Eco of 15 holds against 12, and against 12 + 4 it falls.
    const strong = newCoop(squad("a"), squad("b"), squad("e", 5).slice(0, 5));
    expect(play(strong, put("a0", 2), put("b0", 0)).record.threats[2].stopped).toBe(false);
    expect(play(strong, put("a0", 2), put("b0", 2)).record.threats[2].stopped).toBe(true);
  });

  it("counts Sabotatore of the lead as a lower target, as in the Emergenza", () => {
    const saboteur = squad("a", 6);
    saboteur[0] = character("a0", { VEL: 6, RES: 6 }, power("sabotage", { malus: 1 }), 6);
    // 12 < 13, but Sabotatore takes 1 per required ability off the target: 11.
    const { record } = play(newCoop(saboteur), put("a0", 1), put("b0", 0));
    expect(record.threats[1]).toMatchObject({ stopped: true, required: 11 });
  });

  it("ends the operation as soon as Panic reaches the limit", () => {
    let state = newCoop(squad("a", 0), squad("b", 0));
    for (let i = 0; i < 2; i++) state = play(state, put(`a${i}`, 0), put(`b${i}`, 0)).state;
    // Nothing stopped: 1 + 1 + 2 per round, 8 after two rounds.
    expect(coopPanic(state)).toBe(8);
    expect(isCoopFinished(state)).toBe(true);
    expect(coopResult(state)).toBe("lost");
  });

  it("wins when the Boss loses one front per player, without Panic", () => {
    let state = newCoop(squad("a", 10), squad("b", 10));
    state = toTheBoss(state);
    expect(coopResult(state)).toBeNull();
    const panicBefore = coopPanic(state);
    // Fronts of level 1, 2 and 3 (the rival's): two broken are enough for two players.
    const boss = play(state, [...put("a4", 0), ...put("a5", 1)], [...put("b4", 0), ...put("b5", 0)]);
    expect(boss.record.threats.map((t) => t.stopped)).toEqual([true, true, false]);
    expect(boss.record.panic).toBe(0);
    expect(coopPanic(boss.state)).toBe(panicBefore);
    expect(coopBrokenFronts(boss.state)).toBe(2);
    expect(coopResult(boss.state)).toBe("won");
  });

  it("loses when the Boss keeps too many fronts", () => {
    let state = newCoop(squad("a", 10), squad("b", 10));
    state = toTheBoss(state);
    const boss = play(state, [...put("a4", 0), ...put("a5", 0)], [...put("b4", 0), ...put("b5", 0)]);
    expect(coopBrokenFronts(boss.state)).toBe(1);
    expect(coopResult(boss.state)).toBe("lost");
  });

  it("needs an Eco while the rival has one, and only one of its own", () => {
    const state = newCoop();
    expect(() => play(state, put("a0", 0), put("b0", 0), null)).toThrow("invalid_eco");
    expect(() => play(state, put("a0", 0), put("b0", 0), "a1")).toThrow("invalid_eco");
    expect(() => play(state, put("a0", 0), put("a1", 0))).toThrow("invalid_placement");
  });
});

describe("powers", () => {
  it("Legame counts the allies of the same faction in the whole team", () => {
    const bond = character("a0", {}, power("bond", { bonus: 1 }));
    const a = [bond, ...squad("a").slice(1)];
    const b = squad("b").map((c, i) => (i < 3 ? { ...c, faction: "heroes" } : c));
    const heroBond = { ...bond, faction: "heroes" };
    const state = newCoop([heroBond, ...a.slice(1)], b);
    // Three allies of Bruno are heroes.
    expect(previewCoopPlay(state, "alice", heroBond, 0, FAMILIES).score.bonus).toBe(3);
  });

  it("Riscossa passes its bonus to the same player's next card, not to the ally's", () => {
    const comeback = character("a0", {}, power("comeback", { bonus: 3 }), 0);
    let state = newCoop([comeback, ...squad("a").slice(1)]);
    // Alice's Riscossa fails the level 2 threat alone.
    state = play(state, put("a0", 1), put("b0", 0)).state;
    expect(coopContext(state, "alice", FAMILIES).carriedBonus).toBe(3);
    expect(coopContext(state, "bruno", FAMILIES).carriedBonus).toBe(0);
  });
});

describe("the rival", () => {
  it("plays its best Eco on the reinforced threat, keeping the best one for the Boss's front", () => {
    const rival = [
      character("e0", { INT: 9, VOL: 9, PER: 9 }, null, 1),
      character("e1", { INT: 6, VOL: 6, PER: 6 }, null, 1),
      character("e2", {}, null, 2),
      character("e3", {}, null, 2),
      character("e4", {}, null, 2),
    ];
    // The Boss's reinforced front is level 3 too: e0 stays for it.
    const state = newCoop(squad("a"), squad("b"), rival);
    expect(chooseRivalEco(state, FAMILIES, mulberry32(1))).toBe("e1");
  });

  it("plays its last Eco on the Boss", () => {
    let state = newCoop(squad("a", 7), squad("b", 7));
    state = toTheBoss(state);
    expect(coopRivalHand(state).map((c) => c.id)).toEqual(["e4"]);
    expect(chooseRivalEco(state, FAMILIES, mulberry32(1))).toBe("e4");
  });
});

describe("autoCoopPlacement and playCoopRound", () => {
  it("covers a threat nobody covers, where the card stops it", () => {
    const a = squad("a", 1);
    a[3] = character("a3", { VEL: 7, RES: 7 }, null, 1);
    const state = newCoop(a);
    const auto = autoCoopPlacement(state, "alice", put("b0", 0), FAMILIES, mulberry32(3));
    expect(auto).toEqual({ cards: [{ characterId: "a3", slot: 1 }], autoPlayed: true });
  });

  it("puts two cards on two fronts of the Boss", () => {
    let state = newCoop(squad("a", 10), squad("b", 10));
    state = toTheBoss(state);
    const auto = autoCoopPlacement(state, "alice", [], FAMILIES, mulberry32(3));
    expect(auto.cards).toHaveLength(2);
    expect(new Set(auto.cards.map((c) => c.slot)).size).toBe(2);
  });

  it("puts the cards down for a player who did not choose, and plays the rival", () => {
    const result = playCoopRound({ state: newCoop(), choices: { alice: put("a0", 0), bruno: null }, families: FAMILIES, rng: mulberry32(7) });
    const bruno = result.record.plays.filter((p) => p.player === "bruno");
    expect(bruno).toHaveLength(1);
    expect(bruno[0].autoPlayed).toBe(true);
    expect(bruno[0].slot).not.toBe(0);
    expect(result.record.eco).not.toBeNull();
    expect(result.finished).toBe(false);
  });
});
