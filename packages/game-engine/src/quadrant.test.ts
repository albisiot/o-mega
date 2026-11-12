import { describe, expect, it } from "vitest";
import { mulberry32 } from "./rng.ts";
import {
  applyQuadrantMove,
  emptyQuadrantBoard,
  isQuadrantCellLegal,
  isQuadrantFinished,
  playQuadrantMove,
  quadrantBoard,
  quadrantBounds,
  quadrantControlled,
  quadrantHand,
  quadrantLegalCells,
  quadrantResult,
  quadrantResultOf,
  quadrantSealsOnBoard,
  quadrantSideToMove,
  quadrantValues,
  resolveQuadrantMove,
  type QuadrantBoard,
  type QuadrantRules,
  type QuadrantState,
  type QuadrantVariant,
} from "./quadrant.ts";
import { chooseQuadrantBotPlacement, quadrantBotView } from "./quadrant-bots.ts";
import type { BotDifficulty } from "./bots.ts";
import type { Character, Side } from "./types.ts";

const ABILITIES = ["FOR", "VEL", "RES", "INT"];
const RULES: QuadrantRules = { size: 4, deckSize: 10, handSize: 3, cardsPerSide: 8, seals: 15, firstPlayerSeals: 3 };

/** A card with these numbers on top, right, bottom and left (unrotated). */
function card(id: string, sides: [number, number, number, number]): Character {
  return {
    id,
    definitionId: `def-${id}`,
    faction: "neutrals",
    rarityRank: 1,
    stats: { FOR: sides[0], VEL: sides[1], RES: sides[2], INT: sides[3], VOL: 5, PER: 5, ENE: 5, MAG: 5, PSI: 5, COM: 5, TEC: 5, FUR: 5 },
    power: null,
  };
}

function deck(prefix: string, sides: [number, number, number, number] = [5, 5, 5, 5]): Character[] {
  return Array.from({ length: 10 }, (_, i) => card(`${prefix}${i}`, sides));
}

function newState(variant: QuadrantVariant = "fixed", decks?: Partial<Record<Side, Character[]>>, first: Side = "a"): QuadrantState {
  return {
    rules: RULES,
    variant,
    abilities: ABILITIES,
    first,
    decks: { a: decks?.a ?? deck("a"), b: decks?.b ?? deck("b") },
    moves: [],
  };
}

/** Puts a card straight on a board, with seals, for the comparison tests. */
function put(board: QuadrantBoard, x: number, y: number, side: Side, values: [number, number, number, number], seals = { a: 0, b: 0 }) {
  board.cells.set(`${x},${y}`, { x, y, side, characterId: `c${x}${y}`, definitionId: `d${x}${y}`, values, seals: { ...seals } });
}

const NO_OPENING = { ...RULES, firstPlayerSeals: 0 };

describe("card sides", () => {
  it("takes the four abilities in direction order, and turns clockwise", () => {
    const c = card("x", [1, 2, 3, 4]);
    expect(quadrantValues(c, ABILITIES, 0)).toEqual([1, 2, 3, 4]);
    // One quarter turn: the top value goes to the right.
    expect(quadrantValues(c, ABILITIES, 1)).toEqual([4, 1, 2, 3]);
    expect(quadrantValues(c, ABILITIES, 2)).toEqual([3, 4, 1, 2]);
    expect(quadrantValues(c, ABILITIES, 3)).toEqual([2, 3, 4, 1]);
  });
});

describe("turns and hands", () => {
  it("alternates from the first side and draws a card after each play", () => {
    let state = newState("fixed", undefined, "b");
    expect(quadrantSideToMove(state)).toBe("b");
    expect(quadrantHand(state, "b").map((c) => c.id)).toEqual(["b0", "b1", "b2"]);
    state = resolveQuadrantMove(state, { characterId: "b1", x: 1, y: 1, rotation: 0 }, false).state;
    expect(quadrantSideToMove(state)).toBe("a");
    expect(quadrantHand(state, "b").map((c) => c.id)).toEqual(["b0", "b2", "b3"]);
  });

  it("refuses a card out of the hand, out of turn or a bad turn", () => {
    const state = newState();
    expect(() => resolveQuadrantMove(state, { characterId: "a5", x: 0, y: 0, rotation: 0 }, false)).toThrow("invalid_placement");
    expect(() => resolveQuadrantMove(state, { characterId: "b0", x: 0, y: 0, rotation: 0 }, false)).toThrow("invalid_placement");
    expect(() => resolveQuadrantMove(state, { characterId: "a0", x: 0, y: 0, rotation: 4 }, false)).toThrow("invalid_placement");
  });

  it("ends after eight cards each, with two left in each hand", () => {
    const rng = mulberry32(7);
    let state = newState();
    while (!isQuadrantFinished(state)) state = playQuadrantMove({ state, placement: null, rng }).state;
    expect(state.moves).toHaveLength(16);
    expect(quadrantHand(state, "a")).toHaveLength(2);
    expect(quadrantBoard(state).cells.size).toBe(16);
  });
});

describe("fixed grid", () => {
  it("takes the first card anywhere, then only next to a card, inside the 4×4", () => {
    const board = emptyQuadrantBoard();
    expect(quadrantLegalCells(board, "fixed", 4)).toHaveLength(16);
    put(board, 0, 0, "a", [5, 5, 5, 5]);
    expect(quadrantLegalCells(board, "fixed", 4)).toEqual([{ x: 1, y: 0 }, { x: 0, y: 1 }]);
    expect(isQuadrantCellLegal(board, "fixed", 4, -1, 0)).toBe(false);
    expect(isQuadrantCellLegal(board, "fixed", 4, 2, 2)).toBe(false);
  });
});

describe("shifting grid", () => {
  it("starts at the origin and grows any way until four columns or four rows", () => {
    const board = emptyQuadrantBoard();
    expect(quadrantLegalCells(board, "shifting", 4)).toEqual([{ x: 0, y: 0 }]);
    put(board, 0, 0, "a", [5, 5, 5, 5]);
    expect(isQuadrantCellLegal(board, "shifting", 4, -1, 0)).toBe(true);
    expect(isQuadrantCellLegal(board, "shifting", 4, 0, -1)).toBe(true);
    put(board, -1, 0, "b", [5, 5, 5, 5]);
    put(board, 1, 0, "a", [5, 5, 5, 5]);
    put(board, 2, 0, "b", [5, 5, 5, 5]);
    // Four columns: left and right are frozen, up and down still free.
    expect(isQuadrantCellLegal(board, "shifting", 4, -2, 0)).toBe(false);
    expect(isQuadrantCellLegal(board, "shifting", 4, 3, 0)).toBe(false);
    expect(isQuadrantCellLegal(board, "shifting", 4, 0, -1)).toBe(true);
    expect(isQuadrantCellLegal(board, "shifting", 4, 2, 1)).toBe(true);
  });

  it("always ends as a full 4×4 square", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rng = mulberry32(seed);
      let state = newState("shifting");
      while (!isQuadrantFinished(state)) state = playQuadrantMove({ state, placement: null, rng }).state;
      const bounds = quadrantBounds(quadrantBoard(state))!;
      expect(bounds.maxX - bounds.minX).toBe(3);
      expect(bounds.maxY - bounds.minY).toBe(3);
    }
  });
});

describe("seals", () => {
  const play = (values: [number, number, number, number]) => ({ characterId: "new", definitionId: "def-new", values });

  it("puts one seal on each beaten card and one on the new card for each; a tie does nothing", () => {
    const board = emptyQuadrantBoard();
    put(board, 1, 0, "b", [5, 5, 5, 3]); // its left side (3) faces the new card's right side
    put(board, 0, 1, "b", [6, 5, 5, 5]); // its top (6) faces the new card's bottom
    const outcome = applyQuadrantMove(board, NO_OPENING, "a", play([0, 4, 6, 0]), 0, 0, false);
    expect(outcome.beaten).toBe(1);
    expect(outcome.board.cells.get("1,0")!.seals).toEqual({ a: 1, b: 0 });
    expect(outcome.board.cells.get("0,1")!.seals).toEqual({ a: 0, b: 0 });
    expect(outcome.board.cells.get("0,0")!.seals).toEqual({ a: 1, b: 0 });
  });

  it("gives the opening card its free seals", () => {
    const state = resolveQuadrantMove(newState(), { characterId: "a0", x: 1, y: 1, rotation: 0 }, false);
    expect(state.move.placed).toBe(3);
    expect(quadrantSealsOnBoard(state.board)).toEqual({ a: 3, b: 0 });
  });

  it("ripples: a beaten card that beats a neighbour takes an opposing seal off it", () => {
    const board = emptyQuadrantBoard();
    put(board, 1, 0, "a", [5, 9, 5, 1]); // B: beaten from the left, beats C on its right (9 > 2)
    put(board, 2, 0, "b", [5, 5, 5, 2], { a: 0, b: 2 }); // C, with two seals of b
    const outcome = applyQuadrantMove(board, NO_OPENING, "a", play([0, 4, 0, 0]), 0, 0, false);
    expect(outcome.removed).toBe(1);
    expect(outcome.board.cells.get("2,0")!.seals).toEqual({ a: 0, b: 1 });
  });

  it("never ripples onto the new card nor removes the side's own seals", () => {
    const board = emptyQuadrantBoard();
    put(board, 1, 0, "b", [5, 5, 5, 1]);
    put(board, 2, 0, "b", [5, 5, 5, 0], { a: 2, b: 0 }); // only a's seals: nothing to take
    const outcome = applyQuadrantMove(board, NO_OPENING, "a", play([0, 4, 0, 0]), 0, 0, false);
    expect(outcome.removed).toBe(0);
    expect(outcome.board.cells.get("2,0")!.seals).toEqual({ a: 2, b: 0 });
  });

  it("places what is left of the reserve, beaten cards first", () => {
    const board = emptyQuadrantBoard();
    put(board, 1, 1, "b", [0, 0, 0, 0], { a: 13, b: 0 }); // not a neighbour of (0,0): a has 2 seals left
    put(board, 1, 0, "b", [0, 0, 0, 0]);
    put(board, 0, 1, "b", [0, 0, 0, 0]);
    // The new card at (0,0) beats (1,0) with its right side and (0,1) with its bottom.
    const outcome = applyQuadrantMove(board, NO_OPENING, "a", play([0, 3, 3, 0]), 0, 0, false);
    expect(outcome.beaten).toBe(2);
    expect(outcome.placed).toBe(2);
    expect(outcome.board.cells.get("1,0")!.seals.a).toBe(1);
    expect(outcome.board.cells.get("0,1")!.seals.a).toBe(1);
    expect(outcome.board.cells.get("0,0")!.seals.a).toBe(0);
  });
});

describe("result", () => {
  it("is more seals, then more cards controlled, then the side that played second", () => {
    const board = emptyQuadrantBoard();
    put(board, 0, 0, "a", [0, 0, 0, 0], { a: 3, b: 0 });
    put(board, 1, 0, "b", [0, 0, 0, 0], { a: 0, b: 2 });
    expect(quadrantResultOf(board, "a")).toBe("a");
    put(board, 2, 0, "b", [0, 0, 0, 0], { a: 0, b: 1 });
    // 3 to 3: a controls one card, b two.
    expect(quadrantControlled(board)).toEqual({ a: 1, b: 2 });
    expect(quadrantResultOf(board, "a")).toBe("b");
    board.cells.get("2,0")!.seals = { a: 1, b: 1 }; // 4 to 3
    expect(quadrantResultOf(board, "b")).toBe("a");
    board.cells.get("0,0")!.seals = { a: 2, b: 0 }; // 3 to 3, one card each
    expect(quadrantResultOf(board, "a")).toBe("b");
    expect(quadrantResultOf(board, "b")).toBe("a");
  });

  it("is null while playing", () => {
    expect(quadrantResult(newState())).toBeNull();
  });
});

describe("bots", () => {
  const knowledge = { characters: [...deck("k", [3, 6, 2, 8]), ...deck("m", [7, 1, 4, 4])].map((c, i) => ({ ...c, definitionId: `cat-${i}` })) };

  it("always play a legal move, to the end of the match", () => {
    const difficulties: BotDifficulty[] = ["easy", "medium", "hard", "super_pro"];
    for (const [i, difficulty] of difficulties.entries()) {
      const rng = mulberry32(100 + i);
      let state = newState(i % 2 ? "shifting" : "fixed", { a: deck("a", [1, 9, 3, 6]), b: deck("b", [7, 2, 5, 4]) });
      while (!isQuadrantFinished(state)) {
        const side = quadrantSideToMove(state)!;
        const placement = chooseQuadrantBotPlacement(quadrantBotView(state, side, knowledge), difficulty, rng);
        state = playQuadrantMove({ state, placement, rng }).state;
      }
      expect(state.moves.every((m) => !m.autoPlayed)).toBe(true);
    }
  });

  it("Medio takes a card it can beat", () => {
    let state = newState("fixed", { a: deck("a", [9, 9, 9, 9]), b: deck("b", [1, 1, 1, 1]) }, "b");
    state = resolveQuadrantMove(state, { characterId: "b0", x: 0, y: 0, rotation: 0 }, false).state;
    const placement = chooseQuadrantBotPlacement(quadrantBotView(state, "a", knowledge), "medium", mulberry32(3));
    const after = resolveQuadrantMove(state, placement, false);
    expect(after.move.beaten).toBe(1);
  });
});
