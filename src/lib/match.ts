import { FunctionsHttpError } from "@supabase/supabase-js";
import type { BotDifficulty, Power } from "@o-mega/game-engine";
import { getSupabase } from "@/lib/supabase/client";

export const DIFFICULTY_LABELS: Record<BotDifficulty | "super_pro", string> = {
  easy: "Facile",
  medium: "Medio",
  hard: "Difficile",
  super_pro: "Super Pro",
};

export type MatchCard = {
  definition_id: string;
  code: string;
  name: string;
  faction: string;
  flavor: string;
  art_url: string | null;
  stats: Record<string, number>;
  rarity: { code: string; name: string; rank: number; color: string };
  power: (Power & { name: string; text: string }) | null;
};

export type MatchPlay = {
  base: number;
  bonus: number;
  score: number;
  highest: number;
  auto_played: boolean;
};

export type MatchRound = {
  round: number;
  level: number;
  threat: { name: string; abilities: string[]; flavor: string };
  deadline_at: string;
  resolved: boolean;
  winner: "me" | "opponent" | "none" | null;
  my_play: (MatchPlay & { instance_id: string | null; definition_id: string }) | null;
  /** Only once the round is resolved. */
  opponent_play: (MatchCard & MatchPlay) | null;
  /** PvP: my secret choice waiting for the opponent. */
  my_pending_instance_id: string | null;
  /** PvP: whether the opponent has chosen (never what). */
  opponent_has_chosen: boolean;
};

/** What the server lets the player see (SPEC §10.2). */
export type MatchView = {
  id: string;
  mode: "bot" | "friendly" | "conquest";
  bot_difficulty: BotDifficulty | "super_pro" | null;
  status: "active" | "finished";
  my_side: "a" | "b";
  /** null against a bot. */
  opponent: { username: string; avatar_url: string | null; level: number; last_seen_at: string | null } | null;
  current_round: number;
  threat_levels: number[];
  rounds_won: { me: number; opponent: number };
  total_score: { me: number; opponent: number };
  result: "win" | "loss" | "draw" | null;
  end_reason: "completed" | "forfeit" | null;
  reward_coins: number | null;
  /** Levels reached with this match and the coins each one paid. */
  level_rewards: { level: number; coins: number }[];
  server_now: string;
  my_team: (MatchCard & { instance_id: string; played_round: number | null })[];
  rounds: MatchRound[];
  /** Conquest only, once the match is over with a winner. */
  conquest: ConquestState | null;
};

export type ConquestState = {
  role: "winner" | "loser";
  deadline_at: string;
  resolved: boolean;
  auto_assigned: boolean;
  bonus_coins: number;
  chosen: MatchCard | null;
  /** Winner only, while picking: the loser's five cards. */
  offered: (MatchCard & { instance_id: string; eligible: boolean })[] | null;
};

// The latest state of each match seen in this session, so navigating to the
// match page right after starting it needs no extra request.
const views = new Map<string, MatchView>();

export function cachedMatchView(id: string): MatchView | null {
  return views.get(id) ?? null;
}

function remember(view: MatchView): MatchView {
  views.set(view.id, view);
  return view;
}

/** Calls the "match" Edge Function and surfaces its error code as the message. */
async function invokeFunction<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabase().functions.invoke("match", { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      throw new Error(payload?.error ?? "internal_error");
    }
    throw error;
  }
  return data as T;
}

async function invokeMatch(body: Record<string, unknown>): Promise<MatchView> {
  return remember(await invokeFunction<MatchView>(body));
}

export function startBotMatch(difficulty: BotDifficulty, cardInstanceIds: string[]): Promise<MatchView> {
  return invokeMatch({ action: "start", difficulty, card_instance_ids: cardInstanceIds });
}

/** null: the timer expired, the server plays a random character. */
export function playRound(matchId: string, round: number, cardInstanceId: string | null): Promise<MatchView> {
  return invokeMatch({ action: "play", match_id: matchId, round, card_instance_id: cardInstanceId });
}

export async function fetchMatchState(matchId: string): Promise<MatchView> {
  const { data, error } = await getSupabase().rpc("get_match_state", { p_match_id: matchId });
  if (error) throw error;
  return data as unknown as MatchView;
}

export type ActiveMatch = { id: string; mode: string; bot_difficulty: BotDifficulty | null; current_round: number };

export async function fetchActiveMatch(): Promise<ActiveMatch | null> {
  const { data, error } = await getSupabase().rpc("get_active_match");
  if (error) throw error;
  return (data as unknown as ActiveMatch | null) ?? null;
}

export async function forfeitMatch(matchId: string): Promise<MatchView> {
  const { data, error } = await getSupabase().rpc("forfeit_match", { p_match_id: matchId });
  if (error) throw error;
  return data as unknown as MatchView;
}

// ---------------------------------------------------------------------------
// Matches between players
// ---------------------------------------------------------------------------

export function joinLobby(code: string, cardInstanceIds: string[]): Promise<MatchView> {
  return invokeMatch({ action: "join_lobby", code, card_instance_ids: cardInstanceIds });
}

/** Joins or refreshes the random queue; call it again while waiting. */
export function joinQueue(
  cardInstanceIds: string[],
  mode: QueueMode,
): Promise<{ matched: boolean; match_id: string | null }> {
  return invokeFunction({ action: "queue", mode, card_instance_ids: cardInstanceIds });
}

export type QueueMode = "friendly" | "conquest";

export type ConquestStatus = {
  unlocked: boolean;
  completed_matches: number;
  level: number;
  cards_lost_today: number;
};

export async function fetchConquestStatus(): Promise<ConquestStatus> {
  const { data, error } = await getSupabase().rpc("get_conquest_status");
  if (error) throw error;
  return data as unknown as ConquestStatus;
}

/** The winner's pick; null only settles a pick whose time is up. */
export async function claimConquestCard(matchId: string, cardInstanceId: string | null): Promise<MatchView> {
  const { data, error } = await getSupabase().rpc("claim_conquest_card", {
    p_match_id: matchId,
    p_card_instance_id: cardInstanceId as string,
  });
  if (error) throw error;
  return data as unknown as MatchView;
}

export type ConquestHistoryEntry = {
  won: boolean;
  created_at: string;
  opponent: string | null;
  card: MatchCard;
};

export async function fetchConquestHistory(): Promise<ConquestHistoryEntry[]> {
  const { data, error } = await getSupabase().rpc("get_conquest_history");
  if (error) throw error;
  return data as unknown as ConquestHistoryEntry[];
}

/** Sends a secret choice; the round resolves as soon as both players chose. */
export function submitChoice(matchId: string, round: number, cardInstanceId: string): Promise<MatchView> {
  return invokeMatch({ action: "submit", match_id: matchId, round, card_instance_id: cardInstanceId });
}

/** Asks the server to resolve the round once the time is up. Idempotent. */
export function resolvePvpRound(matchId: string): Promise<MatchView> {
  return invokeMatch({ action: "resolve", match_id: matchId });
}

export type Lobby = { code: string; expires_at: string };

export async function createLobby(cardInstanceIds: string[]): Promise<Lobby> {
  const { data, error } = await getSupabase().rpc("create_lobby", { p_card_instance_ids: cardInstanceIds });
  if (error) throw error;
  return data as unknown as Lobby;
}

export async function fetchMyLobby(): Promise<Lobby | null> {
  const { data, error } = await getSupabase().from("match_lobbies").select("code, expires_at").maybeSingle();
  if (error) throw error;
  return data;
}

export async function cancelLobby(): Promise<void> {
  const { error } = await getSupabase().rpc("cancel_lobby");
  if (error) throw error;
}

export async function leaveQueue(): Promise<void> {
  const { error } = await getSupabase().rpc("leave_queue");
  if (error) throw error;
}

/** Tells the server the player is still here (SPEC §5.7). */
export async function sendHeartbeat(matchId: string): Promise<void> {
  const { error } = await getSupabase().rpc("match_heartbeat", { p_match_id: matchId });
  if (error) throw error;
}

export async function claimVictory(matchId: string): Promise<MatchView> {
  const { data, error } = await getSupabase().rpc("claim_victory", { p_match_id: matchId });
  if (error) throw error;
  return data as unknown as MatchView;
}

/**
 * Listens to the server's "something changed" broadcasts on a topic
 * ("match:<id>" or "player:<user id>"). Returns the unsubscribe function.
 */
export function subscribeToUpdates(topic: string, onUpdate: (payload: Record<string, unknown>) => void): () => void {
  const supabase = getSupabase();
  const channel = supabase
    .channel(topic, { config: { private: false } })
    .on("broadcast", { event: "update" }, (message) => onUpdate((message.payload ?? {}) as Record<string, unknown>))
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export type MatchHistoryEntry = {
  id: string;
  mode: "bot" | "friendly" | "conquest";
  bot_difficulty: BotDifficulty | "super_pro" | null;
  finished_at: string;
  end_reason: "completed" | "forfeit";
  result: "win" | "loss" | "draw";
  rounds_me: number;
  rounds_opponent: number;
  coins: number;
  opponent: string | null;
  conquest: {
    won: boolean;
    bonus_coins: number;
    pending: boolean;
    card_name: string | null;
    card_color: string | null;
  } | null;
};

export async function fetchMatchHistory(): Promise<MatchHistoryEntry[]> {
  const { data, error } = await getSupabase().rpc("get_match_history");
  if (error) throw error;
  return data as unknown as MatchHistoryEntry[];
}

const PENDING_TEAM_KEY = "o-mega.pending-team";

/** The team chosen for the random queue, kept for the waiting page. */
export function storePendingTeam(cardInstanceIds: string[]) {
  try {
    sessionStorage.setItem(PENDING_TEAM_KEY, JSON.stringify(cardInstanceIds));
  } catch {
    // Without storage the waiting page sends the player back to pick a team.
  }
}

export function readPendingTeam(): string[] | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(PENDING_TEAM_KEY) ?? "null");
    return Array.isArray(value) && value.every((id) => typeof id === "string") ? value : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Teams and formations
// ---------------------------------------------------------------------------

export type Formation = { id: string; name: string; card_instance_ids: string[] };

/** One instance per owned character (any copy works outside Conquest). */
export async function fetchOwnedInstances(): Promise<Map<string, string>> {
  const { data, error } = await getSupabase()
    .from("card_instances")
    .select("id, definition_id, acquired_at")
    .order("acquired_at");
  if (error) throw error;
  const byDefinition = new Map<string, string>();
  for (const row of data) if (!byDefinition.has(row.definition_id)) byDefinition.set(row.definition_id, row.id);
  return byDefinition;
}

/**
 * The copy to field in Conquest for each owned character: the starter one when
 * there is one (it is protected), otherwise the oldest. Locked copies cannot
 * be fielded. `conquerable` lists the characters whose copy is at risk;
 * `atRiskCopies` holds, for characters with both, the copy the player may
 * choose to put at stake instead of the starter one.
 */
export async function fetchConquestInstances(): Promise<{
  owned: Map<string, string>;
  conquerable: Set<string>;
  atRiskCopies: Map<string, string>;
}> {
  const { data, error } = await getSupabase()
    .from("card_instances")
    .select("id, definition_id, is_starter, locked_until, acquired_at")
    .order("acquired_at");
  if (error) throw error;
  const owned = new Map<string, string>();
  const conquerable = new Set<string>();
  const oldestFree = new Map<string, string>();
  const starters = new Map<string, string>();
  const now = Date.now();
  for (const row of data) {
    if (row.is_starter) {
      starters.set(row.definition_id, row.id);
    } else if (!oldestFree.has(row.definition_id) && !(row.locked_until && Date.parse(row.locked_until) > now)) {
      oldestFree.set(row.definition_id, row.id);
    }
  }
  const atRiskCopies = new Map<string, string>();
  for (const [definitionId, id] of oldestFree) {
    if (starters.has(definitionId)) {
      atRiskCopies.set(definitionId, id);
    } else {
      owned.set(definitionId, id);
      conquerable.add(definitionId);
    }
  }
  for (const [definitionId, id] of starters) owned.set(definitionId, id);
  return { owned, conquerable, atRiskCopies };
}

/** Instance id → definition id for the player's cards. */
export async function fetchInstanceDefinitions(): Promise<Map<string, string>> {
  const { data, error } = await getSupabase().from("card_instances").select("id, definition_id");
  if (error) throw error;
  return new Map(data.map((row) => [row.id, row.definition_id]));
}

export async function fetchFormations(): Promise<Formation[]> {
  const { data, error } = await getSupabase()
    .from("formations")
    .select("id, name, card_instance_ids")
    .order("created_at");
  if (error) throw error;
  return data;
}

export async function saveFormation(id: string | null, name: string, cardInstanceIds: string[]): Promise<Formation> {
  const { data, error } = await getSupabase().rpc("save_formation", {
    p_formation_id: id as string,
    p_name: name,
    p_card_instance_ids: cardInstanceIds,
  });
  if (error) throw error;
  return data;
}

export async function deleteFormation(id: string): Promise<void> {
  const { error } = await getSupabase().rpc("delete_formation", { p_formation_id: id });
  if (error) throw error;
}
