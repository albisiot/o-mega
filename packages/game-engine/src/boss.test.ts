import { describe, expect, it } from "vitest";
import {
  autoBossChoice,
  bossBoard,
  bossPoints,
  bossResult,
  drawBossValues,
  freeBossFronts,
  frontsTaken,
  isBossFinished,
  isValidBossValues,
  playBossPvpTurn,
  previewBossPlay,
  resolveBossTurn,
  type BossChoice,
  type BossState,
} from "./boss.ts";
import { mulberry32 } from "./rng.ts";
import { BOSS_RULES, bossState, character, FAMILIES, VALUES } from "./test-fixtures.ts";
import type { Character, Power } from "./types.ts";

const power = (code: string, params: Record<string, string | number> = {}): Power => ({ code, params });

function play(state: BossState, a: [Character, number], b: [Character, number]) {
  const choice = ([c, front]: [Character, number]): BossChoice => ({ characterId: c.id, front, autoPlayed: false });
  return resolveBossTurn(state, { a: choice(a), b: choice(b) }, FAMILIES);
}

/** Characters with every value at 0: they hold a front only when nobody else is there. */
function zeros(count: number, prefix: string) {
  return Array.from({ length: count }, (_, i) => character(`${prefix}${i}`, {}, null, 0));
}

describe("drawBossValues", () => {
  it("draws a table that follows the rules, every time", () => {
    const rng = mulberry32(11);
    for (let i = 0; i < 200; i++) {
      const values = drawBossValues(rng, BOSS_RULES);
      expect(values).toHaveLength(5);
      expect([...values[0]].sort()).toEqual([1, 1, 1, 2, 2]);
      for (let t = 1; t < 5; t++) expect(values[t].map((v, f) => v - values[t - 1][f]).sort()).toEqual([1, 1, 1, 2, 2]);
      expect(isValidBossValues(values, BOSS_RULES)).toBe(true);
    }
  });

  it("refuses tables that break the rules", () => {
    expect(isValidBossValues(VALUES, BOSS_RULES)).toBe(true);
    expect(isValidBossValues(VALUES.slice(0, 4), BOSS_RULES)).toBe(false);
    expect(isValidBossValues([[2, 2, 2, 1, 1], ...VALUES.slice(1)], BOSS_RULES)).toBe(false);
    const flat = VALUES.map((row, t) => (t === 4 ? row.map((v, f) => (f === 0 ? v + 1 : v)) : row));
    expect(isValidBossValues(flat, BOSS_RULES)).toBe(false);
  });
});

describe("placing characters", () => {
  it("a character stays on its front and closes it for its side only", () => {
    const mine = [character("a1"), character("a2")];
    const theirs = [character("b1"), character("b2")];
    const { state } = play(bossState(mine, theirs), [mine[0], 3], [theirs[0], 1]);
    expect(bossBoard(state, "a")[3]?.characterId).toBe("a1");
    expect(freeBossFronts(state, "a")).toEqual([0, 1, 2, 4]);
    expect(freeBossFronts(state, "b")).toEqual([0, 2, 3, 4]);
    expect(() => play(state, [mine[1], 3], [theirs[1], 3])).toThrow("invalid_front");
    expect(() => play(state, [mine[1], 1], [theirs[1], 3])).not.toThrow();
  });

  it("every occupied front pays its value of each turn, a lone character always", () => {
    const mine = zeros(2, "a");
    const theirs = zeros(2, "b");
    let state = bossState(mine, theirs);
    state = play(state, [mine[0], 0], [theirs[0], 4]).state;
    expect(bossPoints(state)).toEqual({ a: VALUES[0][0], b: VALUES[0][4] });
    const second = play(state, [mine[1], 1], [theirs[1], 3]);
    expect(second.turn.plays.a.points).toBe(VALUES[1][0] + VALUES[1][1]);
    expect(second.turn.plays.b.points).toBe(VALUES[1][4] + VALUES[1][3]);
    expect(second.turn.holders).toEqual(["a", "a", null, "b", "b"]);
    expect(frontsTaken(second.state)).toEqual({ a: 3, b: 3 });
  });

  it("on a front with both, the higher score holds it", () => {
    const strong = character("s", { FOR: 9 });
    const weak = character("w", { FOR: 3 });
    const { turn } = play(bossState([strong], [weak]), [strong, 0], [weak, 0]);
    expect(turn.holders[0]).toBe("a");
    expect(turn.plays.a).toMatchObject({ total: 9, points: 2, outcome: "won" });
    expect(turn.plays.b).toMatchObject({ total: 3, points: 0, outcome: "lost" });
  });

  it("a stronger character arriving later takes the front from that turn on", () => {
    const sitter = character("s", { FOR: 5 });
    const filler = zeros(1, "f")[0];
    const late = character("l", { FOR: 7 });
    const weakLate = character("x", { FOR: 2 });
    const idle = zeros(1, "z")[0];
    let state = bossState([sitter, filler], [idle, late]);
    state = play(state, [sitter, 0], [idle, 4]).state;
    expect(play(state, [filler, 2], [late, 0]).turn.holders[0]).toBe("b");

    let kept = bossState([sitter, filler], [idle, weakLate]);
    kept = play(kept, [sitter, 0], [idle, 4]).state;
    const after = play(kept, [filler, 2], [weakLate, 0]);
    expect(after.turn.holders[0]).toBe("a");
    expect(after.turn.plays.b.outcome).toBe("lost");
  });

  it("breaks a tie on the highest value, otherwise nobody holds the front", () => {
    const peak = character("p", { VEL: 8, RES: 2 });
    const flat = character("f", { VEL: 5, RES: 5 });
    expect(play(bossState([peak], [flat]), [peak, 1], [flat, 1]).turn.holders[1]).toBe("a");
    const twin = character("t", { VEL: 5, RES: 5 });
    const { turn } = play(bossState([flat], [twin]), [flat, 1], [twin, 1]);
    expect(turn.holders[1]).toBeNull();
    expect(turn.plays.a).toMatchObject({ points: 0, outcome: "void" });
  });

  it("keeps the score a character made when it arrived", () => {
    const opener = character("o", { FOR: 4 }, power("opener", { bonus: 3, max_round: 1 }));
    const rest = zeros(2, "r");
    const theirs = zeros(3, "b");
    let state = bossState([opener, ...rest], theirs);
    state = play(state, [opener, 0], [theirs[0], 4]).state;
    state = play(state, [rest[0], 1], [theirs[1], 3]).state;
    expect(bossBoard(state, "a")[0]?.score.total).toBe(7);
    expect(play(state, [rest[1], 2], [theirs[2], 0]).turn.holders[0]).toBe("a");
  });

  it("the opposing character already on the front acts on the newcomer", () => {
    const saboteur = character("s", { FOR: 2 }, power("sabotage", { malus: 2 }));
    const nullifier = character("n", { FOR: 1 }, power("nullifier"));
    const filler = zeros(2, "f");
    const plain = character("p", { FOR: 5 });
    const bonus = character("b", { VEL: 2, RES: 2 }, power("ability_bonus", { ability: "VEL", bonus: 3 }));
    let state = bossState([saboteur, nullifier], [...filler, plain, bonus]);
    state = play(state, [saboteur, 0], [filler[0], 4]).state;
    state = play(state, [nullifier, 1], [filler[1], 3]).state;
    // Sabotatore on front 0 lowers the newcomer: FOR 5 counts 3.
    expect(previewBossPlay(state, "b", plain, 0, FAMILIES).score.total).toBe(3);
    // Annullatore on front 1 takes the newcomer's power away.
    expect(previewBossPlay(state, "b", bonus, 1, FAMILIES)).toMatchObject({ score: { total: 4 }, against: { total: 8 } });
    // Where no opposing character stands, the power works: 20 + 3.
    expect(previewBossPlay(state, "b", bonus, 4, FAMILIES)).toMatchObject({ score: { total: 23 }, against: null });
  });

  it("characters arriving together on a front meet as in a round", () => {
    const saboteur = character("s", { FOR: 4 }, power("sabotage", { malus: 2 }));
    const target = character("t", { FOR: 5 });
    expect(play(bossState([saboteur], [target]), [saboteur, 0], [target, 0]).turn.plays.b.total).toBe(3);
    expect(play(bossState([saboteur], [target]), [saboteur, 0], [target, 1]).turn.plays.b.total).toBe(8);
  });
});

describe("powers across turns", () => {
  it("Riscossa gives its bonus after the side's character lost its front", () => {
    const comeback = character("c", { FOR: 1 }, power("comeback", { bonus: 3 }));
    const next = character("n", { VEL: 2, RES: 2 });
    const theirs = [character("x", { FOR: 9 }), zeros(1, "z")[0]];
    let state = bossState([comeback, next], theirs);
    state = play(state, [comeback, 0], [theirs[0], 0]).state;
    expect(play(state, [next, 1], [theirs[1], 4]).turn.plays.a.total).toBe(7);
  });

  it("Slancio gives its bonus after the side's character held its front", () => {
    const momentum = character("m", { FOR: 5 }, power("momentum", { bonus: 2 }));
    const next = character("n", { VEL: 3, RES: 2 });
    const theirs = zeros(2, "z");
    let state = bossState([momentum, next], theirs);
    state = play(state, [momentum, 0], [theirs[0], 4]).state;
    expect(play(state, [next, 1], [theirs[1], 3]).turn.plays.a.total).toBe(7);
  });

  it("Crescendo reads the level of the front the side used in the turn before", () => {
    const first = zeros(1, "f")[0];
    const crescendo = character("c", {}, power("crescendo", { bonus: 3 }), 0);
    const theirs = zeros(2, "z");
    let state = bossState([first, crescendo], theirs);
    state = play(state, [first, 1], [theirs[0], 4]).state;
    expect(play(state, [crescendo, 2], [theirs[1], 3]).turn.plays.a.bonus).toBe(3);
    expect(play(state, [crescendo, 0], [theirs[1], 3]).turn.plays.a.bonus).toBe(0);
  });

  it("Veggente does nothing: everything is visible already", () => {
    const seer = character("v", { FOR: 5 }, power("foresight"));
    const opp = zeros(1, "o")[0];
    expect(play(bossState([seer], [opp]), [seer, 0], [opp, 4]).turn.plays.a).toMatchObject({ total: 5, bonus: 0 });
  });
});

describe("end of the match", () => {
  it("ends after the fifth turn: more points win, a mirror is a draw", () => {
    const mine = Array.from({ length: 5 }, (_, i) => character(`a${i}`, { FOR: 9, VEL: 9, RES: 9 }));
    const theirs = zeros(5, "b");
    let state = bossState(mine, theirs);
    for (let t = 0; t < 5; t++) {
      expect(isBossFinished(state)).toBe(false);
      expect(bossResult(state)).toBeNull();
      state = play(state, [mine[t], t], [theirs[t], 4 - t]).state;
    }
    expect(isBossFinished(state)).toBe(true);
    expect(bossResult(state)).toBe("a");

    let mirror = bossState(zeros(5, "a"), zeros(5, "b"));
    for (let t = 0; t < 5; t++) mirror = play(mirror, [mirror.teams.a[t], t], [mirror.teams.b[t], t]).state;
    expect(bossPoints(mirror)).toEqual({ a: 0, b: 0 });
    expect(bossResult(mirror)).toBe("draw");
  });
});

describe("timer", () => {
  it("plays a random character on a free front worth the most this turn", () => {
    const team = [character("a"), character("b"), character("c")];
    let state = bossState(team, team);
    const rng = mulberry32(5);
    for (let i = 0; i < 20; i++) expect([0, 1]).toContain(autoBossChoice(state, "a", rng).front);
    state = play(state, [team[0], 0], [team[0], 2]).state;
    // Front 0 is taken: of the free fronts, front 1 is worth the most in turn 2.
    for (let i = 0; i < 20; i++) expect(autoBossChoice(state, "a", rng).front).toBe(1);
    const resolved = playBossPvpTurn({ state, choices: { a: null, b: { characterId: "b", front: 3 } }, families: FAMILIES, rng });
    expect(resolved.turn.plays.a.autoPlayed).toBe(true);
    expect(resolved.turn.plays.b).toMatchObject({ autoPlayed: false, front: 3 });
  });
});
