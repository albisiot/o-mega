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

describe("powers that read the opposing character", () => {
  it("resolveRound applies Nemesi and Schermato against the character actually played", () => {
    const nemesis = { ...character("a1", {}, { code: "nemesis", params: { bonus: 3 } }, 4), faction: "heroes" };
    const saboteur = { ...character("b1", {}, { code: "sabotage", params: { malus: 1 } }, 4), faction: "villains" };
    const shielded = character("a2", {}, { code: "shielded", params: { bonus: 1 } }, 4);
    const threats = [threat("t1", ["FOR", "VEL"]), threat("t2", ["FOR", "VEL"])];
    let state = newState([nemesis, shielded], [saboteur, character("b2")], threats);

    const first = resolveRound(state, { a: { characterId: "a1", autoPlayed: false }, b: { characterId: "b1", autoPlayed: false } }, FAMILIES);
    // Nemesi +3 against a Villain, Sabotatore -1 on both required abilities.
    expect(first.round.plays.a).toMatchObject({ base: 6, total: 9 });
    state = first.state;

    const second = resolveRound(state, { a: { characterId: "a2", autoPlayed: false }, b: { characterId: "b2", autoPlayed: false } }, FAMILIES);
    expect(second.round.plays.a).toMatchObject({ base: 8, bonus: 0, total: 8 });
  });
});

describe("Annullatore, Crescendo and Slancio in a match", () => {
  const nullifier = character("a1", {}, { code: "nullifier", params: {} }, 4);

  it("Annullatore stops Sabotatore, Implacabile and the opposing bonus", () => {
    const saboteur = character("b1", {}, { code: "sabotage", params: { malus: 1 } }, 4);
    const { round } = resolveRound(
      newState([nullifier], [saboteur], [threat("t1", ["FOR", "VEL"])]),
      { a: { characterId: "a1", autoPlayed: false }, b: { characterId: "b1", autoPlayed: false } },
      FAMILIES,
    );
    expect(round.plays.a).toMatchObject({ base: 8, total: 8 });

    const relentless = character("b1", {}, { code: "relentless", params: {} }, 4);
    const tie = resolveRound(
      newState([nullifier], [relentless], [threat("t1", ["FOR", "VEL"])]),
      { a: { characterId: "a1", autoPlayed: false }, b: { characterId: "b1", autoPlayed: false } },
      FAMILIES,
    );
    expect(tie.round.plays.b.relentless).toBeUndefined();
    expect(tie.round.winner).toBeNull();
  });

  it("Annullatore stops the Riscossa that would follow a lost round", () => {
    const comeback = character("b1", {}, { code: "comeback", params: { bonus: 3 } }, 1);
    let state = newState([nullifier, character("a2")], [comeback, character("b2")], threats);
    state = play(state, "a1", "b1");
    expect(state.rounds[0].winner).toBe("a");
    expect(carriedBonus(state, "b")).toBe(0);
  });

  it("Slancio carries its bonus after a won round", () => {
    const momentum = character("a1", {}, { code: "momentum", params: { bonus: 2 } }, 6);
    let state = newState([momentum, character("a2")], team("b", [4, 4]), threats);
    state = play(state, "a1", "b1");
    expect(state.rounds[0].winner).toBe("a");
    expect(carriedBonus(state, "a")).toBe(2);
    state = play(state, "a2", "b2");
    expect(state.rounds[1].plays.a).toMatchObject({ base: 8, bonus: 2, total: 10 });
  });

  it("Crescendo compares with the previous round's threat", () => {
    const rising = character("a2", {}, { code: "crescendo", params: { bonus: 3 } }, 4);
    const first = character("a1", {}, { code: "crescendo", params: { bonus: 3 } }, 4);
    let state = newState([first, rising], team("b", [4, 4]), threats);
    state = play(state, "a1", "b1");
    expect(state.rounds[0].plays.a.bonus).toBe(0); // no previous round
    state = play(state, "a2", "b2");
    expect(state.rounds[1].plays.a.bonus).toBe(3); // level 2 after level 1
  });
});

describe("backlog powers in a match", () => {
  it("Riflesso sends Sabotatore back to the opposing character", () => {
    const reflect = character("a1", {}, { code: "reflect", params: {} }, 5);
    const saboteur = character("b1", {}, { code: "sabotage", params: { malus: 1 } }, 5);
    const state = play(newState([reflect], [saboteur], threats), "a1", "b1");
    expect(state.rounds[0].plays.a.total).toBe(5);
    expect(state.rounds[0].plays.b.total).toBe(4);
    expect(state.rounds[0].winner).toBe("a");
  });

  it("Vendetta pays after a lost round, Grande prova on the highest level", () => {
    const vendetta = character("a2", {}, { code: "vendetta", params: { bonus: 3 } }, 4);
    const main = character("a3", {}, { code: "main_event", params: { bonus: 3 } }, 4);
    let state = newState([character("a1", {}, null, 1), vendetta, main], team("b", [5, 4, 4]), threats);
    state = play(state, "a1", "b1");
    state = play(state, "a2", "b2");
    expect(state.rounds[1].plays.a.bonus).toBe(3);
    state = play(state, "a3", "b3");
    expect(state.rounds[2].plays.a.bonus).toBe(0); // level 3, the match's highest is 5
  });

  it("Capobranco boosts later characters of its faction, unless an Annullatore stopped it", () => {
    const leader = { ...character("a1", {}, { code: "pack_leader", params: { bonus: 1 } }, 4), faction: "heroes" };
    const follower = { ...character("a2", {}, null, 4), faction: "heroes" };
    let state = newState([leader, follower], team("b", [4, 4]), threats);
    state = play(state, "a1", "b1");
    state = play(state, "a2", "b2");
    expect(state.rounds[1].plays.a.bonus).toBe(1);

    const nullifier = character("b1", {}, { code: "nullifier", params: {} }, 4);
    let stopped = newState([leader, follower], [nullifier, character("b2")], threats);
    stopped = play(stopped, "a1", "b1");
    stopped = play(stopped, "a2", "b2");
    expect(stopped.rounds[1].plays.a.bonus).toBe(0);
  });

  it("Sacrificio gives up its round and passes its bonus", () => {
    const sacrifice = character("a1", {}, { code: "sacrifice", params: { bonus: 5 } }, 9);
    let state = newState([sacrifice, character("a2")], team("b", [1, 4]), threats);
    state = play(state, "a1", "b1");
    expect(state.rounds[0].winner).toBe("b");
    expect(carriedBonus(state, "a")).toBe(5);
    state = play(state, "a2", "b2");
    expect(state.rounds[1].plays.a.total).toBe(13);
  });

  it("Catalizzatore and Riverbero work on the next character", () => {
    const opener = character("a1", {}, { code: "opener", params: { bonus: 3, max_round: 5 } }, 4);
    const echo = character("a2", {}, { code: "echo", params: {} }, 4);
    const catalyst = character("a3", {}, { code: "catalyst", params: { multiplier: 2 } }, 4);
    const second = character("a4", {}, { code: "opener", params: { bonus: 3, max_round: 5 } }, 4);
    let state = newState([opener, echo, catalyst, second], team("b", [4, 4, 4, 4]), threats);
    state = play(state, "a1", "b1");
    state = play(state, "a2", "b2");
    expect(state.rounds[1].plays.a.bonus).toBe(3); // copies Apripista
    state = play(state, "a3", "b3");
    state = play(state, "a4", "b4");
    expect(state.rounds[3].plays.a.bonus).toBe(6); // Apripista doubled
  });
});
