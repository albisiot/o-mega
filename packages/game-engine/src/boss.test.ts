import { describe, expect, it } from "vitest";
import {
  autoBossChoice,
  bossPoints,
  bossResult,
  drawBossValues,
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
import type { Character, Power, Side } from "./types.ts";

const power = (code: string, params: Record<string, string | number> = {}): Power => ({ code, params });

function play(state: BossState, a: [Character, number], b: [Character, number]) {
  const choice = ([c, front]: [Character, number]): BossChoice => ({ characterId: c.id, front, autoPlayed: false });
  return resolveBossTurn(state, { a: choice(a), b: choice(b) }, FAMILIES);
}

/** Plays filler turns with characters that hold nothing: both alone on fronts nobody reaches. */
function fillers(count: number, prefix: string) {
  return Array.from({ length: count }, (_, i) => character(`${prefix}${i}`, {}, null, 0));
}

describe("drawBossValues", () => {
  it("draws a table that follows the rules, every time", () => {
    const rng = mulberry32(11);
    for (let i = 0; i < 200; i++) {
      const values = drawBossValues(rng, BOSS_RULES);
      expect(values).toHaveLength(5);
      expect(values.every((row) => row.length === 5)).toBe(true);
      expect([...values[0]].sort()).toEqual([1, 1, 1, 2, 2]);
      for (let t = 1; t < 5; t++) {
        const steps = values[t].map((v, f) => v - values[t - 1][f]).sort();
        expect(steps).toEqual([1, 1, 1, 2, 2]);
      }
      expect(isValidBossValues(values, BOSS_RULES)).toBe(true);
    }
  });

  it("varies which fronts are hot", () => {
    const rng = mulberry32(3);
    const firstRows = new Set(Array.from({ length: 30 }, () => drawBossValues(rng, BOSS_RULES)[0].join()));
    expect(firstRows.size).toBeGreaterThan(3);
  });

  it("refuses tables that break the rules", () => {
    expect(isValidBossValues(VALUES, BOSS_RULES)).toBe(true);
    expect(isValidBossValues(VALUES.slice(0, 4), BOSS_RULES)).toBe(false);
    expect(isValidBossValues([[2, 2, 2, 1, 1], ...VALUES.slice(1)], BOSS_RULES)).toBe(false);
    const flat = VALUES.map((row, t) => (t === 4 ? row.map((v, f) => (f === 0 ? v + 1 : v)) : row));
    expect(isValidBossValues(flat, BOSS_RULES)).toBe(false);
  });
});

describe("resolveBossTurn: same front", () => {
  it("compares as a round: the higher score takes the front's value", () => {
    const strong = character("s", { FOR: 9 });
    const weak = character("w", { FOR: 3 });
    const { state, turn } = play(bossState([strong], [weak]), [strong, 0], [weak, 0]);
    expect(turn.plays.a).toMatchObject({ total: 9, points: 2, outcome: "won", required: null, front: 0 });
    expect(turn.plays.b).toMatchObject({ total: 3, points: 0, outcome: "lost", required: null });
    expect(bossPoints(state)).toEqual({ a: 2, b: 0 });
    expect(frontsTaken(state)).toEqual({ a: 1, b: 0 });
  });

  it("breaks a tie on the highest single value, otherwise nobody takes the front", () => {
    const peak = character("p", { VEL: 8, RES: 2 });
    const flat = character("f", { VEL: 5, RES: 5 });
    expect(play(bossState([peak], [flat]), [peak, 1], [flat, 1]).turn.plays.a.points).toBe(2);

    const twin = character("t", { VEL: 5, RES: 5 });
    const { state, turn } = play(bossState([flat], [twin]), [flat, 1], [twin, 1]);
    expect(turn.plays.a).toMatchObject({ points: 0, outcome: "void" });
    expect(turn.plays.b).toMatchObject({ points: 0, outcome: "void" });
    expect(bossPoints(state)).toEqual({ a: 0, b: 0 });
  });

  it("Implacabile wins a tie on the same front", () => {
    const relentless = character("r", { FOR: 5 }, power("relentless"));
    const plain = character("p", { FOR: 5 });
    expect(play(bossState([relentless], [plain]), [relentless, 0], [plain, 0]).turn.plays.a.outcome).toBe("won");
  });

  it("Sabotatore and Annullatore act only on the character of the same front", () => {
    const saboteur = character("s", { FOR: 4 }, power("sabotage", { malus: 2 }));
    const target = character("t", { FOR: 5 });
    const contested = play(bossState([saboteur], [target]), [saboteur, 0], [target, 0]).turn;
    expect(contested.plays.b.total).toBe(3);

    const alone = play(bossState([saboteur], [target]), [saboteur, 0], [target, 1]).turn;
    expect(alone.plays.b.total).toBe(8); // VEL 4 + RES 4: untouched

    const nullifier = character("n", { FOR: 4 }, power("nullifier"));
    const bonus = character("b", { FOR: 4 }, power("ability_bonus", { ability: "FOR", bonus: 3 }));
    expect(play(bossState([nullifier], [bonus]), [nullifier, 0], [bonus, 0]).turn.plays.b.total).toBe(4);
    expect(play(bossState([nullifier], [bonus]), [nullifier, 2], [bonus, 0]).turn.plays.b.total).toBe(7);
  });
});

describe("resolveBossTurn: different fronts", () => {
  it("each side holds its front by reaching the presidio target, both can score", () => {
    const a = character("a", { FOR: 4 }); // level 1: target 4
    const b = character("b", { VEL: 3, RES: 3 }); // level 2: target 7
    const { state, turn } = play(bossState([a], [b]), [a, 0], [b, 1]);
    expect(turn.plays.a).toMatchObject({ total: 4, required: 4, points: 2, outcome: "won" });
    expect(turn.plays.b).toMatchObject({ total: 6, required: 7, points: 0, outcome: "lost" });
    expect(bossPoints(state)).toEqual({ a: 2, b: 0 });

    const c = character("c", { VEL: 4, RES: 3 });
    const both = play(bossState([a], [c]), [a, 0], [c, 1]).turn;
    expect([both.plays.a.points, both.plays.b.points]).toEqual([2, 2]);
  });

  it("Sabotatore lowers its own target by its malus per required ability, Implacabile by one", () => {
    const saboteur = character("s", { INT: 2, VOL: 2, PER: 2 }, power("sabotage", { malus: 1 }));
    const relentless = character("r", { VEL: 3, RES: 3 }, power("relentless"));
    const { turn } = play(bossState([saboteur], [relentless]), [saboteur, 2], [relentless, 1]);
    expect(turn.plays.a).toMatchObject({ total: 6, required: 6, outcome: "won", points: 1 });
    expect(turn.plays.b).toMatchObject({ total: 6, required: 6, outcome: "won", points: 2 });
  });

  it("fronts are not used up: the same front can be taken again later", () => {
    const team = [character("a1", { FOR: 6 }), character("a2", { FOR: 6 })];
    let state = bossState(team, fillers(2, "b"));
    state = play(state, [team[0], 0], [state.teams.b[0], 4]).state;
    state = play(state, [team[1], 0], [state.teams.b[1], 4]).state;
    expect(bossPoints(state)).toEqual({ a: 2 + 3, b: 0 });
  });

  it("refuses a front that does not exist or a character already played", () => {
    const a = character("a");
    const b = character("b");
    expect(() => play(bossState([a], [b]), [a, 5], [b, 0])).toThrow("invalid_front");
    expect(() => play(bossState([a], [b]), [a, -1], [b, 0])).toThrow("invalid_front");
    const two = [a, character("a2")];
    const state = play(bossState(two, [b, character("b2")]), [a, 0], [b, 1]).state;
    expect(() => play(state, [a, 0], [state.teams.b[1], 1])).toThrow();
  });
});

describe("powers across turns", () => {
  it("Riscossa gives its bonus after the side lost its own turn", () => {
    const comeback = character("c", { FOR: 1 }, power("comeback", { bonus: 3 }));
    const next = character("n", { VEL: 2, RES: 2 });
    const opp = fillers(2, "o");
    let state = bossState([comeback, next], opp);
    state = play(state, [comeback, 0], [opp[0], 4]).state; // 1 < 4: lost
    const { turn } = play(state, [next, 1], [opp[1], 4]);
    expect(turn.plays.a).toMatchObject({ base: 4, total: 7, outcome: "won" });
  });

  it("Slancio gives its bonus after the side took its front", () => {
    const momentum = character("m", { FOR: 5 }, power("momentum", { bonus: 2 }));
    const next = character("n", { VEL: 3, RES: 2 });
    const opp = fillers(2, "o");
    let state = bossState([momentum, next], opp);
    state = play(state, [momentum, 0], [opp[0], 4]).state;
    expect(play(state, [next, 1], [opp[1], 4]).turn.plays.a.total).toBe(7);
  });

  it("Crescendo reads the level of the front the side played in the turn before", () => {
    const first = character("f", {}, null, 0);
    const crescendo = character("c", {}, power("crescendo", { bonus: 3 }), 0);
    const opp = fillers(2, "o");
    let state = bossState([first, crescendo], opp);
    // Own previous front: level 1; the opponent's (level 6) does not count.
    state = play(state, [first, 0], [opp[0], 4]).state;
    expect(play(state, [crescendo, 1], [opp[1], 4]).turn.plays.a.bonus).toBe(3);
    expect(play(state, [crescendo, 0], [opp[1], 4]).turn.plays.a.bonus).toBe(0);
  });

  it("counts fronts taken as rounds won (Sfavorito)", () => {
    const underdog = character("u", {}, power("underdog", { bonus: 4 }), 0);
    const strong = [character("s1", { FOR: 9 }), character("s2")];
    const mine = [character("m", {}, null, 0), underdog];
    let state = bossState(mine, strong);
    state = play(state, [mine[0], 2], [strong[0], 0]).state; // b holds front 1, a holds nothing
    expect(play(state, [underdog, 1], [strong[1], 4]).turn.plays.a.bonus).toBe(4);
  });

  it("Veggente does nothing: everything is visible already", () => {
    const seer = character("v", { FOR: 5 }, power("foresight"));
    const opp = character("o", {}, null, 0);
    const { turn } = play(bossState([seer], [opp]), [seer, 0], [opp, 4]);
    expect(turn.plays.a).toMatchObject({ total: 5, bonus: 0 });
  });
});

describe("end of the match", () => {
  function finished(points: [number, number][], taken?: boolean): BossState {
    // Builds a finished state turn by turn from the outcome of each side.
    const teamA = Array.from({ length: 5 }, (_, i) => character(`a${i}`));
    const teamB = Array.from({ length: 5 }, (_, i) => character(`b${i}`));
    const state = bossState(teamA, teamB);
    return {
      ...state,
      turns: points.map(([pa, pb], i) => ({
        turn: i + 1,
        plays: Object.fromEntries(
          (["a", "b"] as Side[]).map((side, s) => {
            const p = s === 0 ? pa : pb;
            return [
              side,
              {
                characterId: `${side}${i}`,
                base: 5,
                bonus: 0,
                total: side === "a" && taken ? 6 : 5,
                highest: 5,
                autoPlayed: false,
                front: s,
                required: 4,
                points: p,
                outcome: p > 0 ? "won" : "lost",
              },
            ];
          }),
        ) as BossState["turns"][number]["plays"],
      })),
    };
  }

  it("ends after the last turn, with more points winning", () => {
    expect(isBossFinished(finished([[2, 0]]))).toBe(false);
    expect(bossResult(finished([[2, 0]]))).toBeNull();
    expect(bossResult(finished([[2, 1], [0, 3], [5, 0], [0, 4], [7, 0]]))).toBe("a");
  });

  it("breaks ties on fronts taken, then on the sum of scores, then draws", () => {
    // Points 7-7, fronts 1-2.
    expect(bossResult(finished([[0, 2], [0, 5], [7, 0], [0, 0], [0, 0]]))).toBe("b");
    // Points 4-4, fronts 2-2, scores equal: draw; a's higher scores win it.
    expect(bossResult(finished([[2, 0], [0, 3], [2, 0], [0, 1], [0, 0]]))).toBe("draw");
    expect(bossResult(finished([[2, 0], [0, 3], [2, 0], [0, 1], [0, 0]], true))).toBe("a");
  });
});

describe("timer and preview", () => {
  it("plays a random character on a front worth the most this turn", () => {
    const team = [character("a"), character("b"), character("c")];
    const state = bossState(team, team);
    const rng = mulberry32(5);
    for (let i = 0; i < 20; i++) {
      const choice = autoBossChoice(state, "a", rng);
      expect([0, 1]).toContain(choice.front);
      expect(choice.autoPlayed).toBe(true);
    }
    const resolved = playBossPvpTurn({ state, choices: { a: null, b: { characterId: "b", front: 3 } }, families: FAMILIES, rng });
    expect(resolved.turn.plays.a.autoPlayed).toBe(true);
    expect(resolved.turn.plays.b).toMatchObject({ autoPlayed: false, front: 3 });
  });

  it("previews a character alone on a front, without deciding anything", () => {
    const saboteur = character("s", { FOR: 5 }, power("sabotage", { malus: 1 }));
    const preview = previewBossPlay(bossState([saboteur], [saboteur]), "a", saboteur, 0, FAMILIES);
    expect(preview).toMatchObject({ score: { total: 5 }, required: 3 });
  });
});
