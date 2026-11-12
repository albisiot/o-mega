// Quadrante (SPEC §5.14): a 4×4 grid filled in turns. At the start the server draws
// four abilities, one for each side of a card (top, right, bottom, left): the number on
// a side is the character's value in that ability, so every card changes shape from
// one match to the next. Each side brings a deck of ten characters, shuffled by the
// server, and holds three; after each play it draws the next one. On its turn a side
// places a card from its hand, rotated as it likes, on a free cell next to a card in
// play. Every side of the new card that beats the facing side of a neighbour (strictly
// higher) puts one seal of its colour on the beaten card and one on the new card. When
// a beaten card in turn beats one of its other neighbours, one opposing seal is removed
// from that neighbour (the ripple). After eight cards each, the side with more seals on
// the grid wins; then the one that controls more cards; then the side that played second.
//
// Two grids: "fixed", whose borders are there from the start, and "shifting", which has
// no borders until the cards span four columns (left and right freeze) or four rows (top
// and bottom freeze): every card must stay inside a 4×4 square.
//
// Pure: the Edge Function loads and stores, the bots and the screen read the same rules.

import { otherSide } from "./match.ts";
import { pickOne, shuffle, type Rng } from "./rng.ts";
import type { AbilityCode, Character, MatchResult, Side } from "./types.ts";

export type QuadrantVariant = "fixed" | "shifting";

/** The numbers of the mode (balance.ts `quadrant`, game_config `quadrant.*`). */
export type QuadrantRules = {
  /** Cells per row and per column. */
  size: number;
  /** Characters of a deck. */
  deckSize: number;
  /** Cards held at once. */
  handSize: number;
  /** Cards each side plays: two per side stay in hand when size² = 16 and the deck is 10. */
  cardsPerSide: number;
  /** Seals each side has: a seal it no longer has cannot be placed. */
  seals: number;
  /** Free seals on the first card of the side that opens the match (it plays with fewer neighbours). */
  firstPlayerSeals: number;
};

/** Directions of a card's sides, clockwise: 0 top, 1 right, 2 bottom, 3 left. */
export const QUADRANT_DIRECTIONS = [0, 1, 2, 3] as const;
export type QuadrantDirection = (typeof QUADRANT_DIRECTIONS)[number];
const STEP: Record<QuadrantDirection, readonly [number, number]> = { 0: [0, -1], 1: [1, 0], 2: [0, 1], 3: [-1, 0] };

export function oppositeDirection(direction: QuadrantDirection): QuadrantDirection {
  return ((direction + 2) % 4) as QuadrantDirection;
}

/** A play: the card, the cell (x to the right, y downwards) and how many quarter turns clockwise. */
export type QuadrantPlacement = { characterId: string; x: number; y: number; rotation: number };

export type QuadrantCell = {
  x: number;
  y: number;
  side: Side;
  characterId: string;
  definitionId: string;
  /** The numbers on the card's sides once rotated, in direction order. */
  values: [number, number, number, number];
  seals: Record<Side, number>;
};

export type QuadrantMoveRecord = QuadrantPlacement & {
  /** 1-based. */
  move: number;
  side: Side;
  autoPlayed: boolean;
  values: [number, number, number, number];
  /** Neighbours the card beat. */
  beaten: number;
  /** Seals the side placed (fewer than due when it ran out). */
  placed: number;
  /** Opposing seals the ripple removed. */
  removed: number;
};

/** Everything the server knows about a Quadrante. Never send it to a client as is. */
export type QuadrantState = {
  rules: QuadrantRules;
  variant: QuadrantVariant;
  /** The four abilities of the match, in direction order before rotation. */
  abilities: AbilityCode[];
  /** The side that plays the first card. */
  first: Side;
  /** Each side's deck in draw order. */
  decks: Record<Side, Character[]>;
  moves: QuadrantMoveRecord[];
};

/** The grid at a moment of the match, rebuilt from the moves. Mutable copies are cheap. */
export type QuadrantBoard = {
  cells: Map<string, QuadrantCell>;
};

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

/** Four distinct abilities at random: the sides of every card in this match. */
export function drawQuadrantAbilities(rng: Rng, abilities: readonly AbilityCode[]): AbilityCode[] {
  const distinct = [...new Set(abilities)];
  if (distinct.length < 4) throw new Error("Not enough abilities for a Quadrante");
  return shuffle(rng, distinct).slice(0, 4);
}

/** The numbers on a character's sides, in direction order, after `rotation` quarter turns clockwise. */
export function quadrantValues(
  character: Character,
  abilities: readonly AbilityCode[],
  rotation = 0,
): [number, number, number, number] {
  const base = abilities.map((code) => character.stats[code] ?? 0);
  const turn = ((rotation % 4) + 4) % 4;
  // A quarter turn clockwise moves the top value to the right: values[d] = base[d - turn].
  return QUADRANT_DIRECTIONS.map((d) => base[(d - turn + 4) % 4]) as [number, number, number, number];
}

// ---------------------------------------------------------------------------
// Turns and hands
// ---------------------------------------------------------------------------

/** Moves of a match: every side plays the same number of cards. */
export function quadrantMoveCount(rules: QuadrantRules): number {
  return rules.cardsPerSide * 2;
}

/** 1-based number of the next move. */
export function quadrantMoveNumber(state: QuadrantState): number {
  return state.moves.length + 1;
}

/** The side that plays move `move` (1-based): the first side on odd moves. */
export function quadrantSideOfMove(state: Pick<QuadrantState, "first">, move: number): Side {
  return move % 2 === 1 ? state.first : otherSide(state.first);
}

export function isQuadrantFinished(state: QuadrantState): boolean {
  return state.moves.length >= quadrantMoveCount(state.rules);
}

/** The side whose turn it is; null once the match is over. */
export function quadrantSideToMove(state: QuadrantState): Side | null {
  return isQuadrantFinished(state) ? null : quadrantSideOfMove(state, quadrantMoveNumber(state));
}

function playedIds(state: QuadrantState, side: Side): Set<string> {
  return new Set(state.moves.filter((m) => m.side === side).map((m) => m.characterId));
}

/**
 * The cards a side holds: the first `handSize` of its deck, plus one more for every
 * card it played, minus those it played.
 */
export function quadrantHand(state: QuadrantState, side: Side): Character[] {
  const played = playedIds(state, side);
  const drawn = state.decks[side].slice(0, state.rules.handSize + played.size);
  return drawn.filter((c) => !played.has(c.id));
}

/** Cards still in a side's deck, not drawn yet. */
export function quadrantDeckLeft(state: QuadrantState, side: Side): number {
  const played = playedIds(state, side).size;
  return Math.max(0, state.decks[side].length - state.rules.handSize - played);
}

// ---------------------------------------------------------------------------
// The grid
// ---------------------------------------------------------------------------

export function emptyQuadrantBoard(): QuadrantBoard {
  return { cells: new Map() };
}

export function copyQuadrantBoard(board: QuadrantBoard): QuadrantBoard {
  const cells = new Map<string, QuadrantCell>();
  for (const [key, cell] of board.cells) cells.set(key, { ...cell, seals: { ...cell.seals } });
  return { cells };
}

/** Columns and rows the cards span; null on an empty grid. */
export function quadrantBounds(board: QuadrantBoard): { minX: number; maxX: number; minY: number; maxY: number } | null {
  let bounds: { minX: number; maxX: number; minY: number; maxY: number } | null = null;
  for (const cell of board.cells.values()) {
    if (!bounds) bounds = { minX: cell.x, maxX: cell.x, minY: cell.y, maxY: cell.y };
    else {
      bounds.minX = Math.min(bounds.minX, cell.x);
      bounds.maxX = Math.max(bounds.maxX, cell.x);
      bounds.minY = Math.min(bounds.minY, cell.y);
      bounds.maxY = Math.max(bounds.maxY, cell.y);
    }
  }
  return bounds;
}

/** Seals of each side on the grid. */
export function quadrantSealsOnBoard(board: QuadrantBoard): Record<Side, number> {
  const total = { a: 0, b: 0 };
  for (const cell of board.cells.values()) {
    total.a += cell.seals.a;
    total.b += cell.seals.b;
  }
  return total;
}

/** Cards each side controls: strictly more of its seals than the other's. */
export function quadrantControlled(board: QuadrantBoard): Record<Side, number> {
  const controlled = { a: 0, b: 0 };
  for (const cell of board.cells.values()) {
    if (cell.seals.a > cell.seals.b) controlled.a += 1;
    else if (cell.seals.b > cell.seals.a) controlled.b += 1;
  }
  return controlled;
}

/** Seals a side can still place. */
export function quadrantReserve(board: QuadrantBoard, rules: QuadrantRules, side: Side): number {
  return Math.max(0, rules.seals - quadrantSealsOnBoard(board)[side]);
}

/**
 * Whether a card may go on (x, y): a free cell next to a card in play (any cell for the
 * first card of a fixed grid, the origin for a shifting one), inside the grid. On a
 * shifting grid "inside" means the cards would still fit in a size × size square.
 */
export function isQuadrantCellLegal(board: QuadrantBoard, variant: QuadrantVariant, size: number, x: number, y: number): boolean {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
  if (board.cells.has(cellKey(x, y))) return false;
  if (variant === "fixed" && (x < 0 || y < 0 || x >= size || y >= size)) return false;
  if (board.cells.size === 0) return variant === "fixed" || (x === 0 && y === 0);
  const touches = QUADRANT_DIRECTIONS.some((d) => board.cells.has(cellKey(x + STEP[d][0], y + STEP[d][1])));
  if (!touches) return false;
  if (variant === "shifting") {
    const bounds = quadrantBounds(board)!;
    const width = Math.max(bounds.maxX, x) - Math.min(bounds.minX, x) + 1;
    const height = Math.max(bounds.maxY, y) - Math.min(bounds.minY, y) + 1;
    if (width > size || height > size) return false;
  }
  return true;
}

/** Every cell a card may go on now. */
export function quadrantLegalCells(board: QuadrantBoard, variant: QuadrantVariant, size: number): { x: number; y: number }[] {
  if (board.cells.size === 0) {
    if (variant === "shifting") return [{ x: 0, y: 0 }];
    const all: { x: number; y: number }[] = [];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) all.push({ x, y });
    return all;
  }
  const seen = new Set<string>();
  const legal: { x: number; y: number }[] = [];
  for (const cell of board.cells.values()) {
    for (const d of QUADRANT_DIRECTIONS) {
      const x = cell.x + STEP[d][0];
      const y = cell.y + STEP[d][1];
      const key = cellKey(x, y);
      if (seen.has(key)) continue;
      seen.add(key);
      if (isQuadrantCellLegal(board, variant, size, x, y)) legal.push({ x, y });
    }
  }
  return legal.sort((p, q) => p.y - q.y || p.x - q.x);
}

/**
 * Whether the sides facing outward can still meet a card: false for the borders of a
 * fixed grid and for the frozen borders of a shifting one. The screen draws them.
 */
export function quadrantFrozenAxes(board: QuadrantBoard, variant: QuadrantVariant, size: number): { columns: boolean; rows: boolean } {
  if (variant === "fixed") return { columns: true, rows: true };
  const bounds = quadrantBounds(board);
  if (!bounds) return { columns: false, rows: false };
  return { columns: bounds.maxX - bounds.minX + 1 >= size, rows: bounds.maxY - bounds.minY + 1 >= size };
}

// ---------------------------------------------------------------------------
// Playing a card
// ---------------------------------------------------------------------------

export type QuadrantMoveOutcome = {
  board: QuadrantBoard;
  values: [number, number, number, number];
  beaten: number;
  placed: number;
  removed: number;
};

/**
 * Plays a card on a copy of the board: free seals for the opening card, the comparisons
 * and the ripple. Seals come from the side's reserve: when it runs short, the beaten
 * cards get theirs first (in direction order), then the new card. The ripple always
 * removes, since an opposing seal off the grid is always worth it. Does not check legality.
 */
export function applyQuadrantMove(
  board: QuadrantBoard,
  rules: QuadrantRules,
  side: Side,
  card: { characterId: string; definitionId: string; values: [number, number, number, number] },
  x: number,
  y: number,
  opening: boolean,
): QuadrantMoveOutcome {
  const next = copyQuadrantBoard(board);
  const opponent = otherSide(side);
  const played: QuadrantCell = {
    x,
    y,
    side,
    characterId: card.characterId,
    definitionId: card.definitionId,
    values: card.values,
    seals: { a: 0, b: 0 },
  };
  next.cells.set(cellKey(x, y), played);
  let reserve = quadrantReserve(next, rules, side);
  let placed = 0;
  const place = (cell: QuadrantCell) => {
    if (reserve <= 0) return;
    cell.seals[side] += 1;
    reserve -= 1;
    placed += 1;
  };

  if (opening) for (let i = 0; i < rules.firstPlayerSeals; i++) place(played);

  // The comparisons: every side against the facing side of its neighbour.
  const beaten: { cell: QuadrantCell; from: QuadrantDirection }[] = [];
  for (const d of QUADRANT_DIRECTIONS) {
    const neighbour = next.cells.get(cellKey(x + STEP[d][0], y + STEP[d][1]));
    if (neighbour && card.values[d] > neighbour.values[oppositeDirection(d)]) {
      // `from`: the side of the beaten card that faces the new one.
      beaten.push({ cell: neighbour, from: oppositeDirection(d) });
    }
  }
  for (const { cell } of beaten) place(cell);
  for (let i = 0; i < beaten.length; i++) place(played);

  // The ripple: a beaten card that beats one of its other neighbours loses that one an opposing seal.
  let removed = 0;
  for (const { cell, from } of beaten) {
    for (const d of QUADRANT_DIRECTIONS) {
      if (d === from) continue;
      const target = next.cells.get(cellKey(cell.x + STEP[d][0], cell.y + STEP[d][1]));
      if (!target || target === played) continue;
      if (cell.values[d] > target.values[oppositeDirection(d)] && target.seals[opponent] > 0) {
        target.seals[opponent] -= 1;
        removed += 1;
      }
    }
  }
  return { board: next, values: card.values, beaten: beaten.length, placed, removed };
}

/** The grid after every move of the match. */
export function quadrantBoard(state: QuadrantState): QuadrantBoard {
  let board = emptyQuadrantBoard();
  for (const move of state.moves) {
    const character = characterOf(state, move.side, move.characterId);
    if (!character) throw new Error(`Unknown character ${move.characterId}`);
    board = applyQuadrantMove(
      board,
      state.rules,
      move.side,
      { characterId: move.characterId, definitionId: character.definitionId, values: move.values },
      move.x,
      move.y,
      move.move === 1,
    ).board;
  }
  return board;
}

function characterOf(state: QuadrantState, side: Side, id: string): Character | undefined {
  return state.decks[side].find((c) => c.id === id);
}

/** Whether a side may play this placement now: its turn, a card of its hand, a legal cell, a quarter turn. */
export function isValidQuadrantPlacement(
  state: QuadrantState,
  side: Side,
  placement: QuadrantPlacement,
  board: QuadrantBoard = quadrantBoard(state),
): boolean {
  if (quadrantSideToMove(state) !== side) return false;
  if (!Number.isInteger(placement.rotation) || placement.rotation < 0 || placement.rotation > 3) return false;
  if (!quadrantHand(state, side).some((c) => c.id === placement.characterId)) return false;
  return isQuadrantCellLegal(board, state.variant, state.rules.size, placement.x, placement.y);
}

/** Plays a move of the side whose turn it is and appends it. Pure. */
export function resolveQuadrantMove(
  state: QuadrantState,
  placement: QuadrantPlacement,
  autoPlayed: boolean,
): { state: QuadrantState; move: QuadrantMoveRecord; board: QuadrantBoard } {
  const side = quadrantSideToMove(state);
  if (side === null) throw new Error("The match is already over");
  const board = quadrantBoard(state);
  if (!isValidQuadrantPlacement(state, side, placement, board)) throw new Error("invalid_placement");
  const character = characterOf(state, side, placement.characterId)!;
  const values = quadrantValues(character, state.abilities, placement.rotation);
  const number = quadrantMoveNumber(state);
  const outcome = applyQuadrantMove(
    board,
    state.rules,
    side,
    { characterId: character.id, definitionId: character.definitionId, values },
    placement.x,
    placement.y,
    number === 1,
  );
  const move: QuadrantMoveRecord = {
    ...placement,
    move: number,
    side,
    autoPlayed,
    values,
    beaten: outcome.beaten,
    placed: outcome.placed,
    removed: outcome.removed,
  };
  return { state: { ...state, moves: [...state.moves, move] }, move, board: outcome.board };
}

/** Timer expired: a card of the hand at random, on a legal cell at random, turned at random. */
export function autoQuadrantPlacement(state: QuadrantState, side: Side, rng: Rng): QuadrantPlacement {
  const board = quadrantBoard(state);
  const cell = pickOne(rng, quadrantLegalCells(board, state.variant, state.rules.size));
  const card = pickOne(rng, quadrantHand(state, side));
  return { characterId: card.id, x: cell.x, y: cell.y, rotation: Math.floor(rng() * 4) };
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

/** More seals on the grid; then more cards controlled; then the side that played second. null while playing. */
export function quadrantResultOf(board: QuadrantBoard, first: Side): MatchResult {
  const seals = quadrantSealsOnBoard(board);
  if (seals.a !== seals.b) return seals.a > seals.b ? "a" : "b";
  const controlled = quadrantControlled(board);
  if (controlled.a !== controlled.b) return controlled.a > controlled.b ? "a" : "b";
  return otherSide(first);
}

export function quadrantResult(state: QuadrantState, board: QuadrantBoard = quadrantBoard(state)): MatchResult | null {
  return isQuadrantFinished(state) ? quadrantResultOf(board, state.first) : null;
}

/**
 * Plays the move of the side whose turn it is: its placement, or a random one when the
 * timer expired (null).
 */
export function playQuadrantMove(params: {
  state: QuadrantState;
  placement: QuadrantPlacement | null;
  rng: Rng;
}): { state: QuadrantState; move: QuadrantMoveRecord; board: QuadrantBoard; finished: boolean; result: MatchResult | null } {
  const { state, placement, rng } = params;
  const side = quadrantSideToMove(state);
  if (side === null) throw new Error("The match is already over");
  const played = placement
    ? resolveQuadrantMove(state, placement, false)
    : resolveQuadrantMove(state, autoQuadrantPlacement(state, side, rng), true);
  return { ...played, finished: isQuadrantFinished(played.state), result: quadrantResult(played.state, played.board) };
}
