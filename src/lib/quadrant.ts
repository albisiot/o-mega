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

/** What a move would do now: seals the player gains, seals the opponent loses, cards beaten. */
export function previewQuadrantMove(
  view: QuadrantView,
  card: MatchCard,
  x: number,
  y: number,
  rotation: number,
): { gained: number; removed: number; beaten: number } {
  const outcome = applyQuadrantMove(
    knownQuadrantBoard(view),
    quadrantRulesOf(view),
    "a",
    { characterId: "preview", definitionId: card.definition_id, values: cardValues(view, card, rotation) },
    x,
    y,
    view.move === 1,
  );
  return { gained: outcome.placed, removed: outcome.removed, beaten: outcome.beaten };
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
