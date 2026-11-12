// Bots of Quadrante (SPEC §5.14). Like every bot they know only what a player knows:
// the grid, their own hand and the opposing cards already played. Never the
// opponent's hand nor the order of either deck: Hard and Super Pro imagine opposing
// hands drawn from the catalog, without the characters the opponent already played.
//
// A move is a card of the hand, a legal cell and a quarter turn. Strength on the real
// catalog: scripts/simulate-quadrant.mts.

import { otherSide } from "./match.ts";
import { pickWeighted, shuffle, type Rng } from "./rng.ts";
import type { BotDifficulty, BotKnowledge } from "./bots.ts";
import {
  applyQuadrantMove,
  cellKey,
  isQuadrantCellLegal,
  QUADRANT_DIRECTIONS,
  quadrantBoard,
  quadrantHand,
  quadrantLegalCells,
  quadrantMoveCount,
  quadrantMoveNumber,
  quadrantSealsOnBoard,
  quadrantSideToMove,
  quadrantValues,
  type QuadrantBoard,
  type QuadrantPlacement,
  type QuadrantRules,
  type QuadrantState,
  type QuadrantVariant,
} from "./quadrant.ts";
import type { AbilityCode, Character, Side } from "./types.ts";

/** Hard and Super Pro: the best moves they look into, and the opposing hands they imagine for each. */
export const QUADRANT_HARD = { candidates: 6, hands: 12 };
export const QUADRANT_SUPER_PRO = { candidates: 10, hands: 32 };

/** Weight of an exposed side in Medio's choice: a seal now is worth more than a maybe later. */
const EXPOSURE_WEIGHT = 0.6;

export type QuadrantBotView = {
  side: Side;
  rules: QuadrantRules;
  variant: QuadrantVariant;
  abilities: AbilityCode[];
  /** 1-based number of the move to play, and how many the match has. */
  move: number;
  moveCount: number;
  board: QuadrantBoard;
  hand: Character[];
  /** Catalog characters the opponent may still hold: a deck never repeats a character. */
  opponentPool: Character[];
  /** For every number 0-10: the share of catalog characters whose best side beats it. */
  beatShare: number[];
};

export function quadrantBotView(state: QuadrantState, side: Side, knowledge: Pick<BotKnowledge, "characters">): QuadrantBotView {
  const opponent = otherSide(side);
  const seen = new Set(
    state.moves
      .filter((m) => m.side === opponent)
      .map((m) => state.decks[opponent].find((c) => c.id === m.characterId)?.definitionId),
  );
  return {
    side,
    rules: state.rules,
    variant: state.variant,
    abilities: state.abilities,
    move: quadrantMoveNumber(state),
    moveCount: quadrantMoveCount(state.rules),
    board: quadrantBoard(state),
    hand: quadrantHand(state, side),
    opponentPool: knowledge.characters.filter((c) => !seen.has(c.definitionId)),
    beatShare: beatShares(knowledge.characters, state.abilities),
  };
}

const beatShareCache = new Map<string, number[]>();

/** For every number 0-10, the share of characters with a side above it (their best side). */
function beatShares(characters: readonly Character[], abilities: readonly AbilityCode[]): number[] {
  const key = `${characters.length}:${abilities.join(",")}`;
  const cached = beatShareCache.get(key);
  if (cached) return cached;
  const best = characters.map((c) => Math.max(...abilities.map((code) => c.stats[code] ?? 0)));
  const shares = Array.from({ length: 12 }, (_, v) => (best.length ? best.filter((b) => b > v).length / best.length : 0));
  if (beatShareCache.size > 200) beatShareCache.clear();
  beatShareCache.set(key, shares);
  return shares;
}

type Candidate = { placement: QuadrantPlacement; gain: number; exposure: number; board: QuadrantBoard };

/** Every distinct move of a hand: a card, a legal cell, a quarter turn (turns that give the same sides count once). */
function candidates(view: Pick<QuadrantBotView, "abilities" | "variant" | "rules">, board: QuadrantBoard, side: Side, hand: readonly Character[], opening: boolean, beatShare?: number[]): Candidate[] {
  const cells = quadrantLegalCells(board, view.variant, view.rules.size);
  const before = quadrantSealsOnBoard(board);
  const opponent = otherSide(side);
  const list: Candidate[] = [];
  for (const card of hand) {
    const seenShapes = new Set<string>();
    for (let rotation = 0; rotation < 4; rotation++) {
      const values = quadrantValues(card, view.abilities, rotation);
      const shape = values.join(",");
      if (seenShapes.has(shape)) continue;
      seenShapes.add(shape);
      for (const { x, y } of cells) {
        const outcome = applyQuadrantMove(
          board,
          view.rules,
          side,
          { characterId: card.id, definitionId: card.definitionId, values },
          x,
          y,
          opening,
        );
        const after = quadrantSealsOnBoard(outcome.board);
        const gain = after[side] - before[side] - (after[opponent] - before[opponent]);
        list.push({
          placement: { characterId: card.id, x, y, rotation },
          gain,
          exposure: beatShare ? exposureOf(outcome.board, view, x, y, values, beatShare) : 0,
          board: outcome.board,
        });
      }
    }
  }
  return list;
}

/**
 * How much a card offers the opponent: for every side facing a cell a card may still
 * take, the chance that one of three opposing cards beats it (two seals for them).
 */
function exposureOf(
  board: QuadrantBoard,
  view: Pick<QuadrantBotView, "variant" | "rules">,
  x: number,
  y: number,
  values: readonly number[],
  beatShare: number[],
): number {
  const steps: Record<number, [number, number]> = { 0: [0, -1], 1: [1, 0], 2: [0, 1], 3: [-1, 0] };
  let exposure = 0;
  for (const d of QUADRANT_DIRECTIONS) {
    const nx = x + steps[d][0];
    const ny = y + steps[d][1];
    if (board.cells.has(cellKey(nx, ny)) || !isQuadrantCellLegal(board, view.variant, view.rules.size, nx, ny)) continue;
    const share = beatShare[Math.min(values[d], beatShare.length - 1)] ?? 0;
    exposure += 2 * (1 - (1 - share) ** 3);
  }
  return exposure;
}

function mediumScore(candidate: Candidate): number {
  return candidate.gain - EXPOSURE_WEIGHT * candidate.exposure;
}

function best<T>(items: readonly T[], score: (item: T) => number, rng: Rng): T {
  let top: T[] = [];
  let topScore = -Infinity;
  for (const item of items) {
    const s = score(item);
    if (s > topScore + 1e-9) {
      top = [item];
      topScore = s;
    } else if (Math.abs(s - topScore) <= 1e-9) top.push(item);
  }
  return top[Math.floor(rng() * top.length)];
}

/** The best immediate gain the opponent can make on a board with a given hand. */
function bestReplyGain(view: QuadrantBotView, board: QuadrantBoard, hand: readonly Character[]): number {
  const opponent = otherSide(view.side);
  let top = -Infinity;
  for (const c of candidates(view, board, opponent, hand, false)) if (c.gain > top) top = c.gain;
  return top === -Infinity ? 0 : top;
}

/** The bot's move. Pure apart from the injected rng. */
export function chooseQuadrantBotPlacement(view: QuadrantBotView, difficulty: BotDifficulty, rng: Rng): QuadrantPlacement {
  const opening = view.move === 1;
  const options = candidates(view, view.board, view.side, view.hand, opening, view.beatShare);
  if (options.length === 0) throw new Error("No legal move");

  if (difficulty === "easy") {
    // Mostly at random, leaning towards the moves that pay.
    return pickWeighted(rng, options, (c) => 1 + Math.max(0, c.gain) ** 2).placement;
  }
  if (difficulty === "medium") return best(options, mediumScore, rng).placement;

  // Hard and Super Pro: the best moves for Medio, each against the opponent's best answer
  // with hands it may hold. The last move has no answer.
  const plan = difficulty === "hard" ? QUADRANT_HARD : QUADRANT_SUPER_PRO;
  const ranked = [...options].sort((p, q) => mediumScore(q) - mediumScore(p)).slice(0, plan.candidates);
  if (view.move >= view.moveCount) return best(ranked, (c) => c.gain, rng).placement;
  const hands = Array.from({ length: plan.hands }, () => shuffle(rng, view.opponentPool).slice(0, view.rules.handSize));
  return best(
    ranked,
    (c) => c.gain - hands.reduce((sum, hand) => sum + bestReplyGain(view, c.board, hand), 0) / hands.length,
    rng,
  ).placement;
}

/**
 * A move against a bot: the player's placement (or a random one when the timer expired)
 * if it is the player's turn, otherwise the bot's.
 */
export function quadrantBotMoveFor(
  state: QuadrantState,
  playerSide: Side,
  knowledge: Pick<BotKnowledge, "characters">,
  difficulty: BotDifficulty,
  rng: Rng,
): QuadrantPlacement | null {
  const side = quadrantSideToMove(state);
  if (side === null || side === playerSide) return null;
  return chooseQuadrantBotPlacement(quadrantBotView(state, side, knowledge), difficulty, rng);
}

