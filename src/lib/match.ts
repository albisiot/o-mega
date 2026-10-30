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
};

/** What the server lets the player see (SPEC §10.2). */
export type MatchView = {
  id: string;
  mode: "bot" | "friendly" | "conquest";
  bot_difficulty: BotDifficulty | "super_pro" | null;
  status: "active" | "finished";
  current_round: number;
  threat_levels: number[];
  rounds_won: { me: number; opponent: number };
  total_score: { me: number; opponent: number };
  result: "win" | "loss" | "draw" | null;
  end_reason: "completed" | "forfeit" | null;
  reward_coins: number | null;
  server_now: string;
  my_team: (MatchCard & { instance_id: string; played_round: number | null })[];
  rounds: MatchRound[];
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
async function invokeMatch(body: Record<string, unknown>): Promise<MatchView> {
  const { data, error } = await getSupabase().functions.invoke("match", { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      throw new Error(payload?.error ?? "internal_error");
    }
    throw error;
  }
  return remember(data as MatchView);
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
