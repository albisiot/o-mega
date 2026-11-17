// The Classifica generale of a timed event: every player with event points, ranked by the
// server (get_event_leaderboard). It unlocks when the player reaches the last target; who
// sees it is the server's setting (events.leaderboard_visibility), mirrored in balance.ts.
import { balance } from "@/config/balance";
import type { GameEvent } from "@/lib/events";
import { getSupabase } from "@/lib/supabase/client";

export type EventLeaderboardEntry = {
  rank: number;
  username: string;
  avatar_url: string | null;
  points: number;
  /** Targets reached. */
  steps: number;
  /** When the last target was reached; null while the player is on the way. */
  completed_at: string | null;
  is_me: boolean;
};

export type EventLeaderboard = {
  event_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  ended: boolean;
  /** Targets of the event. */
  tiers: number;
  /** Players with event points. */
  players: number;
  /** Players who reached the last target. */
  completed: number;
  /** The first players (events.leaderboard_size). */
  top: EventLeaderboardEntry[];
  /** The caller's own place, also when below the list; null without points. */
  me: EventLeaderboardEntry | null;
};

/** The server said no: the player has not unlocked this leaderboard. */
export const LEADERBOARD_LOCKED = "locked" as const;

/**
 * The leaderboard of an event, or "locked" when the player may not see it yet. eventId null:
 * the last event that ended, or null when there is none to show to this player.
 */
export async function fetchEventLeaderboard(eventId: string | null): Promise<EventLeaderboard | typeof LEADERBOARD_LOCKED | null> {
  const { data, error } = await getSupabase().rpc(
    "get_event_leaderboard",
    eventId ? { p_event_id: eventId } : {},
  );
  if (error) {
    if (error.message === "event_leaderboard_locked") return LEADERBOARD_LOCKED;
    throw error;
  }
  return (data as unknown as EventLeaderboard | null) ?? null;
}

/** Every target of the event reached: the last "step" done. */
export function isEventCompleted(event: Pick<GameEvent, "tiers">): boolean {
  return event.tiers.length > 0 && event.tiers.every((tier) => tier.reached);
}

/** "Sei 12° su 87", or null while the place is unknown. */
export function completionPlace(board: Pick<EventLeaderboard, "me" | "players"> | null): string | null {
  const me = board?.me;
  return me ? `Sei ${me.rank}° su ${board.players}` : null;
}

/** "Evento completato! Sei 12° su 87", or without the place while it is unknown. */
export function completionLine(board: Pick<EventLeaderboard, "me" | "players"> | null): string {
  const place = completionPlace(board);
  return place ? `Evento completato! ${place}` : "Evento completato!";
}

/** The progress of a player in the list: "Completato" or "3/5 traguardi". */
export function entryProgress(entry: Pick<EventLeaderboardEntry, "steps" | "completed_at">, tiers: number): { done: boolean; label: string } {
  if (entry.completed_at) return { done: true, label: "Completato" };
  return { done: false, label: `${entry.steps}/${tiers} ${tiers === 1 ? "traguardo" : "traguardi"}` };
}

/** The caller's place when it is not in the list (shown apart, below it), else null. */
export function placeBelow(board: Pick<EventLeaderboard, "top" | "me">): EventLeaderboardEntry | null {
  const me = board.me;
  if (!me || board.top.some((entry) => entry.is_me)) return null;
  return me;
}

/** "87 giocatori · 23 hanno completato l'evento". */
export function playersLine(board: Pick<EventLeaderboard, "players" | "completed">): string {
  const players = `${board.players} ${board.players === 1 ? "giocatore" : "giocatori"}`;
  if (board.completed === 0) return players;
  return `${players} · ${board.completed} ${board.completed === 1 ? "ha completato" : "hanno completato"} l'evento`;
}

export type LeaderboardVisibility = typeof balance.events.leaderboardVisibility;

/** Why the leaderboard is closed, by the setting: what the player still has to do. */
export function lockedLine(lastTierPoints: number | null, visibility: LeaderboardVisibility = balance.events.leaderboardVisibility): string {
  if (visibility === "participants") return "La classifica generale si sblocca con il primo punto evento.";
  if (lastTierPoints === null) return "La classifica generale si sblocca quando completi l'evento.";
  return `La classifica generale si sblocca quando completi l'evento: raggiungi l'ultimo traguardo, ${lastTierPoints} punti.`;
}
