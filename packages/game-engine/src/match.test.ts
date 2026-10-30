import { describe, expect, it } from "vitest";
import {
  availableCharacters,
  carriedBonus,
  isFinished,
  matchResult,
  resolveRound,
  roundsWon,
  totalScores,
} from "./match.ts";
import { character, FAMILIES, newState, threat } from "./test-fixtures.ts";
import type { MatchState } from "./types.ts";

const threats = [
  threat("t1", ["FOR"]),
  threat("t2", ["FOR", "VEL"]),
  threat("t3", ["FOR", "VEL", "RES"]),
  threat("t4", ["FOR", "VEL", "RES", "INT"]),
  threat("t5", ["FOR", "VEL", "RES", "INT", "VOL"]),
];

function team(prefix: string, values: number[]) {
  return values.map((value, i) => character(`${prefix}${i + 1}`, {}, null, value));
}

function play(state: MatchState, a: string, b: string) {
  return resolveRound(
    state,
    { a: { characterId: a, autoPlayed: false }, b: { characterId: b, autoPlayed: false } },
    FAMILIES,
  ).state;
}

describe("resolveRound", () => {
  it("scores the current threat and records the winner", () => {
    const state = newState(team("a", [6, 4, 4, 4, 4]), team("b", [5, 4, 4, 4, 4]), threats);
    const { round } = resolveRound(
      state,
      { a: { characterId: "a1", autoPlayed: false }, b: { characterId: "b1", autoPlayed: true } },
      FAMILIES,
    );
    expect(round).toMatchObject({ round: 1, threatId: "t1", winner: "a" });
    expect(round.plays.a.total).toBe(6);
    expect(round.plays.b).toMatchObject({ total: 5, autoPlayed: true });
  });

  it("uses every character only once", () => {
    let state = newState(team("a", [4, 4, 4, 4, 4]), team("b", [4, 4, 4, 4, 4]), threats);
    state = play(state, "a1", "b1");
    expect(availableCharacters(state, "a").map((c) => c.id)).toEqual(["a2", "a3", "a4", "a5"]);
    expect(() => play(state, "a1", "b2")).toThrow(/not available/);
  });

  it("ends as soon as a side wins 3 rounds", () => {
    let state = newState(team("a", [9, 9, 9, 1, 1]), team("b", [1, 1, 1, 9, 9]), threats);
    state = play(play(play(state, "a1", "b1"), "a2", "b2"), "a3", "b3");
    expect(roundsWon(state)).toEqual({ a: 3, b: 0 });
    expect(isFinished(state)).toBe(true);
    expect(matchResult(state)).toBe("a");
    expect(() => play(state, "a4", "b4")).toThrow(/already over/);
  });

  it("after 5 rounds with equal rounds won, the higher total score wins", () => {
    // a wins rounds 1 and 2, b wins 4 and 5, round 3 is void: 2-2.
    let state = newState(team("a", [9, 9, 4, 1, 1]), team("b", [1, 1, 4, 9, 9]), threats);
    state = play(play(play(play(play(state, "a1", "b1"), "a2", "b2"), "a3", "b3"), "a4", "b4"), "a5", "b5");
    expect(roundsWon(state)).toEqual({ a: 2, b: 2 });
    expect(totalScores(state)).toEqual({ a: 9 + 18 + 12 + 4 + 5, b: 1 + 2 + 12 + 36 + 45 });
    expect(matchResult(state)).toBe("b");
  });

  it("is a draw when rounds and total scores are equal", () => {
    let state = newState(team("a", [4, 4, 4, 4, 4]), team("b", [4, 4, 4, 4, 4]), threats);
    for (let i = 1; i <= 5; i++) state = play(state, `a${i}`, `b${i}`);
    expect(roundsWon(state)).toEqual({ a: 0, b: 0 });
    expect(matchResult(state)).toBe("draw");
  });

  it("returns no result while the match is running", () => {
    const state = play(newState(team("a", [5, 4, 4, 4, 4]), team("b", [4, 4, 4, 4, 4]), threats), "a1", "b1");
    expect(matchResult(state)).toBeNull();
  });
});

describe("Riscossa (comeback)", () => {
  it("carries the bonus to the next character only after a lost round", () => {
    const comeback = character("a1", {}, { code: "comeback", params: { bonus: 2 } }, 1);
    const teamA = [comeback, ...team("a", [4, 4, 4, 4]).map((c, i) => ({ ...c, id: `a${i + 2}` }))];
    let state = newState(teamA, team("b", [5, 4, 4, 4, 4]), threats);
    state = play(state, "a1", "b1");
    expect(state.rounds[0].winner).toBe("b");
    expect(carriedBonus(state, "a")).toBe(2);
    expect(carriedBonus(state, "b")).toBe(0);

    state = play(state, "a2", "b2");
    expect(state.rounds[1].plays.a).toMatchObject({ base: 8, bonus: 2, total: 10 });
    expect(carriedBonus(state, "a")).toBe(0);
  });

  it("does not trigger on a void round", () => {
    const comeback = character("a1", {}, { code: "comeback", params: { bonus: 2 } }, 4);
    const state = play(newState([comeback, ...team("x", [4, 4, 4, 4])], team("b", [4, 4, 4, 4, 4]), threats), "a1", "b1");
    expect(state.rounds[0].winner).toBeNull();
    expect(carriedBonus(state, "a")).toBe(0);
  });
});
