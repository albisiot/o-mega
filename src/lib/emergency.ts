import { invokeFunction, type MatchCard } from "@/lib/match";
import { getSupabase } from "@/lib/supabase/client";

export type EmergencyThreat = { name: string; abilities: string[]; flavor: string };

export type EmergencyPlay = {
  round: number;
  level: number;
  threat: EmergencyThreat;
  instance_id: string;
  definition_id: string;
  base: number;
  bonus: number;
  score: number;
  required: number;
  passed: boolean;
};

export type EmergencySquadCard = MatchCard & { instance_id: string; played_round: number | null };

export type EmergencyRun = {
  status: "active" | "finished";
  current_round: number;
  passed: number;
  failed: number;
  total_score: number;
  coins: number;
  squad: EmergencySquadCard[];
  plays: EmergencyPlay[];
  /** null once the run is over. */
  current_threat: (EmergencyThreat & { id: string; round: number; level: number }) | null;
  /** Veggente: the threats after the current one, once the player has played it. */
  foreseen_threats: { round: number; level: number; name: string; abilities: string[] }[];
};

/** What the server lets the player see of today's challenge (SPEC §5.10). */
export type EmergencyView = {
  day: string;
  server_now: string;
  threat_levels: number[];
  rules: {
    threats_per_run: number;
    max_failures: number;
    targets: Record<string, number>;
    rewards: { passed: number; coins: number }[];
  };
  /** null until the player fields a squad. */
  run: EmergencyRun | null;
};

/** Opens today's challenge: the first player of the day makes the server draw it. */
export function openEmergency(): Promise<EmergencyView> {
  return invokeFunction({ action: "emergency_open" });
}

export function startEmergency(cardInstanceIds: string[]): Promise<EmergencyView> {
  return invokeFunction({ action: "emergency_start", card_instance_ids: cardInstanceIds });
}

export function playEmergency(round: number, cardInstanceId: string): Promise<EmergencyView> {
  return invokeFunction({ action: "emergency_play", round, card_instance_id: cardInstanceId });
}

export type EmergencyRank = {
  rank: number;
  username: string;
  avatar_url: string | null;
  passed: number;
  total_score: number;
  is_me: boolean;
};

export type EmergencyLeaderboard = { players: number; top: EmergencyRank[]; me: EmergencyRank | null };

export async function fetchEmergencyLeaderboard(): Promise<EmergencyLeaderboard> {
  const { data, error } = await getSupabase().rpc("get_emergency_leaderboard");
  if (error) throw error;
  return data as unknown as EmergencyLeaderboard;
}
