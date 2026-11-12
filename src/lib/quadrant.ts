// Quadrante on the client (SPEC §5.14): the state the server lets a player see, the
// calls to the "match" Edge Function, and the previews the screen shows. Previews come
// from the pure rules engine on the grid as the player sees it; the server alone decides.

import {
  applyQuadrantMove,
  cellKey,
  quadrantBounds,
  quadrantFrozenAxes,
  quadrantLegalCells,
  quadrantValues,
  type BotDifficulty,
  type QuadrantBoard,
  type QuadrantRules,
  type QuadrantVariant,
} from "@o-mega/game-engine";
import { balance } from "@/config/balance";
import { invokeFunction, remember, toCharacter, type MatchCard } from "@/lib/match";

export const QUADRANT_FORMATS = ["quadrant", "quadrant_shifting"] as const;
export type QuadrantFormat = (typeof QUADRANT_FORMATS)[number];

export function isQuadrantFormat(format: unknown): format is QuadrantFormat {
  return typeof format === "string" && (QUADRANT_FORMATS as readonly string[]).includes(format);
}

/** The name of a grid, for titles and lists. */
export const QUADRANT_GRID_LABELS: Record<QuadrantFormat, string> = {
  quadrant: "Griglia fissa",
  quadrant_shifting: "Griglia mobile",
};

export type QuadrantCellView = {
  x: number;
  y: number;
  mine: boolean;
  /** The card's numbers once turned: top, right, bottom, left. */
  values: [number, number, number, number];
  seals: { me: number; opponent: number };
  card: MatchCard;
};

export type QuadrantMoveView = {
  move: number;
  mine: boolean;
  x: number;
  y: number;
  rotation: number;
  name: string;
  beaten: number;
  removed: number;
  placed: number;
  auto_played: boolean;
};

export type QuadrantView = {
  id: string;
  mode: "bot" | "friendly";
  format: QuadrantFormat;
  variant: QuadrantVariant;
  bot_difficulty: BotDifficulty | null;
  status: "active" | "finished";
  my_side: "a" | "b";
  i_open: boolean;
  size: number;
  cards_per_side: number;
  seals_per_side: number;
  first_player_seals: number;
  /** The four abilities of the match, side by side: top, right, bottom, left. */
  abilities: { code: string; name: string; family: string }[];
  /** The move being played, 1-based. */
  move: number;
  moves_count: number;
  to_move: "me" | "opponent" | null;
  deadline_at: string | null;
  board: QuadrantCellView[];
  seals: { me: number; opponent: number };
  controlled: { me: number; opponent: number };
  my_hand: (MatchCard & { instance_id: string })[];
  my_deck_left: number;
  opponent_hand_count: number;
  opponent_deck_left: number;
  moves: QuadrantMoveView[];
  result: "win" | "loss" | "draw" | null;
  end_reason: "completed" | "forfeit" | null;
  reward_coins: number | null;
  level_rewards: { level: number; coins: number }[];
  level_unlocks?: { name: string; level: number }[];
  server_now: string;
  opponent: { username: string; avatar_url: string | null; level: number; last_seen_at: string | null } | null;
  /**
   * Against a bot, the states before this one in the same answer: after the player's move,
   * then after each bot move but the last. The screen shows them one at a time.
   */
  previous?: QuadrantView[];
};

export function isQuadrantView(view: { format?: string }): view is QuadrantView {
  return isQuadrantFormat(view.format);
}

async function invokeQuadrant(body: Record<string, unknown>): Promise<QuadrantView> {
  return remember(await invokeFunction<QuadrantView>(body));
}

export function startQuadrantBotMatch(difficulty: BotDifficulty, format: QuadrantFormat, cardInstanceIds: string[]): Promise<QuadrantView> {
  return invokeQuadrant({ action: "quadrant_start", difficulty, format, card_instance_ids: cardInstanceIds });
}

export type QuadrantPlacementInput = { card_instance_id: string; x: number; y: number; rotation: number };

/** A move against a bot (the bot answers in the same call); null when the timer expired. */
export function playQuadrantMove(matchId: string, move: number, placement: QuadrantPlacementInput | null): Promise<QuadrantView> {
  return invokeQuadrant({ action: "quadrant_play", match_id: matchId, move, placement });
}

/** Between players: the move of the side whose turn it is, resolved at once. */
export function submitQuadrantMove(matchId: string, move: number, placement: QuadrantPlacementInput): Promise<QuadrantView> {
  return invokeQuadrant({ action: "quadrant_submit", match_id: matchId, move, placement });
}

/** Between players: asks the server to play the move whose time is up. Idempotent. */
export function resolveQuadrantMove(matchId: string): Promise<QuadrantView> {
  return invokeQuadrant({ action: "resolve", match_id: matchId });
}

// ---------------------------------------------------------------------------
// The grid as the player sees it, for the engine
// ---------------------------------------------------------------------------

/** The player is side "a" here. */
export function knownQuadrantBoard(view: QuadrantView): QuadrantBoard {
  const cells: QuadrantBoard["cells"] = new Map();
  for (const cell of view.board) {
    cells.set(cellKey(cell.x, cell.y), {
      x: cell.x,
      y: cell.y,
      side: cell.mine ? "a" : "b",
      characterId: `${cell.x},${cell.y}`,
      definitionId: cell.card.definition_id,
      values: cell.values,
      seals: { a: cell.seals.me, b: cell.seals.opponent },
    });
  }
  return { cells };
}

export function quadrantRulesOf(view: QuadrantView): QuadrantRules {
  return {
    size: view.size,
    deckSize: balance.quadrant.deckSize,
    handSize: balance.quadrant.handSize,
    cardsPerSide: view.cards_per_side,
    seals: view.seals_per_side,
    firstPlayerSeals: view.first_player_seals,
  };
}

/** The numbers a card of the hand shows once turned. */
export function cardValues(view: QuadrantView, card: MatchCard, rotation: number): [number, number, number, number] {
  return quadrantValues(toCharacter(card, card.definition_id), view.abilities.map((a) => a.code), rotation);
}

export function legalCells(view: QuadrantView): { x: number; y: number }[] {
  return quadrantLegalCells(knownQuadrantBoard(view), view.variant, view.size);
}

/** How the seals on one cell changed: the player's and the opponent's, up or down. */
export type SealDelta = { x: number; y: number; me: number; opponent: number };

type SealCell = { x: number; y: number; seals: { me: number; opponent: number } };

/** The cells whose seals changed from one grid to the next (a new card counts from zero). */
export function sealDeltas(before: readonly SealCell[], after: readonly SealCell[]): SealDelta[] {
  const old = new Map(before.map((cell) => [`${cell.x},${cell.y}`, cell.seals]));
  const deltas: SealDelta[] = [];
  for (const cell of after) {
    const was = old.get(`${cell.x},${cell.y}`) ?? { me: 0, opponent: 0 };
    const delta = { x: cell.x, y: cell.y, me: cell.seals.me - was.me, opponent: cell.seals.opponent - was.opponent };
    if (delta.me !== 0 || delta.opponent !== 0) deltas.push(delta);
  }
  return deltas;
}

export type MovePreview = { gained: number; removed: number; beaten: number; deltas: SealDelta[] };

/** What a move would do now: seals the player places, seals the opponent loses, cards beaten, and where. */
export function previewQuadrantMove(view: QuadrantView, card: MatchCard, x: number, y: number, rotation: number): MovePreview {
  const before = knownQuadrantBoard(view);
  const outcome = applyQuadrantMove(
    before,
    quadrantRulesOf(view),
    "a",
    { characterId: "preview", definitionId: card.definition_id, values: cardValues(view, card, rotation) },
    x,
    y,
    view.move === 1,
  );
  const asCells = (board: QuadrantBoard) =>
    [...board.cells.values()].map((c) => ({ x: c.x, y: c.y, seals: { me: c.seals.a, opponent: c.seals.b } }));
  return {
    gained: outcome.placed,
    removed: outcome.removed,
    beaten: outcome.beaten,
    deltas: sealDeltas(asCells(before), asCells(outcome.board)),
  };
}

/** The best quarter turn for a card on a cell: the one that gains the most now (placed plus removed). */
export function bestRotation(view: QuadrantView, card: MatchCard, x: number, y: number): { rotation: number; gain: number } {
  let best = { rotation: 0, gain: -Infinity };
  for (let rotation = 0; rotation < 4; rotation++) {
    const p = previewQuadrantMove(view, card, x, y, rotation);
    if (p.gained + p.removed > best.gain) best = { rotation, gain: p.gained + p.removed };
  }
  return best;
}

/**
 * The cells to draw: every cell of the 4×4 that holds or may hold a card. On a shifting
 * grid the window follows the cards: the columns (rows) they span, widened on both sides
 * as long as the grid can still grow that way, up to the size.
 */
export function quadrantWindow(view: QuadrantView): { minX: number; minY: number; columns: number; rows: number } {
  if (view.variant === "fixed") return { minX: 0, minY: 0, columns: view.size, rows: view.size };
  const board = knownQuadrantBoard(view);
  const bounds = quadrantBounds(board);
  if (!bounds) return { minX: 0, minY: 0, columns: 1, rows: 1 };
  const frozen = quadrantFrozenAxes(board, view.variant, view.size);
  const span = (min: number, max: number, isFrozen: boolean) =>
    isFrozen ? { start: min, count: max - min + 1 } : { start: min - 1, count: max - min + 3 };
  const columns = span(bounds.minX, bounds.maxX, frozen.columns);
  const rows = span(bounds.minY, bounds.maxY, frozen.rows);
  return { minX: columns.start, minY: rows.start, columns: columns.count, rows: rows.count };
}

/** Whether the grid's columns and rows are frozen (the borders a card can no longer cross). */
export function frozenAxes(view: QuadrantView): { columns: boolean; rows: boolean } {
  return quadrantFrozenAxes(knownQuadrantBoard(view), view.variant, view.size);
}

// ---------------------------------------------------------------------------
// The story of a move, for the screen's effects
// ---------------------------------------------------------------------------

const STEP: readonly (readonly [number, number])[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/** One side of the card just played against the facing side of a neighbour. */
export type QuadrantClash = {
  /** The neighbour's cell; `side` is the played card's side that faces it (0 top … 3 left). */
  x: number;
  y: number;
  side: number;
  value: number;
  against: number;
  outcome: "win" | "tie" | "lose";
};

/** A beaten card that beat one of its own neighbours, which lost a seal of the other side. */
export type QuadrantRipple = {
  /** The beaten card, and its side towards the card that lost a seal. */
  from: { x: number; y: number };
  side: number;
  to: { x: number; y: number };
  value: number;
  against: number;
};

export type QuadrantMoveStory = {
  x: number;
  y: number;
  mine: boolean;
  clashes: QuadrantClash[];
  ripples: QuadrantRipple[];
  deltas: SealDelta[];
};

/**
 * What a move did, rebuilt from the grid before and after it: every comparison of the
 * card played with its neighbours, and every ripple that took a seal away. The server
 * decided all of it; this only explains it on screen.
 */
export function quadrantMoveStory(
  before: readonly QuadrantCellView[],
  after: readonly QuadrantCellView[],
  move: { x: number; y: number; mine: boolean },
): QuadrantMoveStory | null {
  const at = (x: number, y: number) => after.find((c) => c.x === x && c.y === y);
  const played = at(move.x, move.y);
  if (!played) return null;
  const deltas = sealDeltas(before, after);
  const clashes: QuadrantClash[] = [];
  for (let side = 0; side < 4; side++) {
    const neighbour = at(move.x + STEP[side][0], move.y + STEP[side][1]);
    if (!neighbour) continue;
    const value = played.values[side];
    const against = neighbour.values[(side + 2) % 4];
    clashes.push({ x: neighbour.x, y: neighbour.y, side, value, against, outcome: value > against ? "win" : value === against ? "tie" : "lose" });
  }
  // The other side's seals that went away: a ripple took them.
  const lostBy = (x: number, y: number) => {
    const d = deltas.find((delta) => delta.x === x && delta.y === y);
    return d ? (move.mine ? d.opponent : d.me) < 0 : false;
  };
  const ripples: QuadrantRipple[] = [];
  for (const clash of clashes.filter((c) => c.outcome === "win")) {
    const beaten = at(clash.x, clash.y)!;
    for (let side = 0; side < 4; side++) {
      const target = at(beaten.x + STEP[side][0], beaten.y + STEP[side][1]);
      if (!target || target === played) continue;
      const value = beaten.values[side];
      const against = target.values[(side + 2) % 4];
      if (value > against && lostBy(target.x, target.y)) {
        ripples.push({ from: { x: beaten.x, y: beaten.y }, side, to: { x: target.x, y: target.y }, value, against });
      }
    }
  }
  return { x: move.x, y: move.y, mine: move.mine, clashes, ripples, deltas };
}

/** Seconds between two comparisons, and between two ripples, in the move's effects. */
export const CLASH_SECONDS = 0.55;
export const RIPPLE_SECONDS = 0.6;

/** How long the effects of a move last, in seconds. */
export function storySeconds(story: QuadrantMoveStory | null): number {
  if (!story) return 0;
  return 0.3 + story.clashes.length * CLASH_SECONDS + story.ripples.length * RIPPLE_SECONDS + 0.5;
}
