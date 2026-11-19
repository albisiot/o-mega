import type { BotDifficulty, ChallengeSimulation } from "@o-mega/game-engine";
import type { Challenge, ChallengeEventPoints, ChallengeMatchRulesJson, ChallengeRulesJson } from "@/lib/challenges";
import { invokeFunction } from "@/lib/match";
import { toRomeInput } from "@/lib/events";
import { getSupabase } from "@/lib/supabase/client";

/** The Sfide a tema as the admin page (/gestione-sfide) reads them: every function checks the admin. */

export type AdminChallenge = Challenge & {
  is_active: boolean;
  version: number;
  /** Matches played (an Emergenza: runs), and the players who played them. */
  matches: number;
  players: number;
  /** The codes of the squad the challenge gives, for the form; null: none. */
  supplied_codes?: string[] | null;
};

export type AdminChallengeEvent = { id: string; title: string; starts_at: string; ends_at: string };

/** A card the form picks from: prize cards, the banned and only-these lists. */
export type AdminChallengeCard = {
  code: string;
  name: string;
  rarity: string;
  rarity_code?: string;
  faction?: string;
  traits?: string[];
  variants: { style: string; name: string }[];
};

export type AdminChallenges = {
  now: string;
  challenges: AdminChallenge[];
  /** Active events not over yet: a challenge can be linked to one of them. */
  events: AdminChallengeEvent[];
  /** Missing from the first stage. */
  cards?: AdminChallengeCard[];
  variant_styles?: { style: string; name: string; characters: number }[];
  seal_target?: { min: number; max: number; suggested: number };
};

/** A prize target as the form sends it: wins, and the rewards of a bonus code. */
export type ChallengeTierDraft = {
  wins: number;
  coins: number;
  packs: number;
  /** "P051" or "P051:neon". */
  cards: string[];
  random_variants?: { count: number; styles: string[]; rarities: string[] };
  /** Schegge, 0 to MAX_SHARD_REWARD; sent only when used. */
  shards?: number;
};

/** What the rules allow: admitted characters and players who can field a squad today. */
export type ChallengePreview = {
  rules: ChallengeRulesJson;
  team_size: number;
  variants_needed: number;
  admitted: number;
  admitted_with_variant: number;
  players_ready: number;
  players_total: number;
  /** Third stage: a squad can keep the composition, and the rarity budget of the cheapest one (null: none fits). */
  composition_possible?: boolean;
  cheapest_budget?: number | null;
};

export type ChallengeDraft = {
  id?: string;
  title: string;
  description: string;
  color: string;
  format: (typeof CHALLENGE_FORMATS)[number]["key"];
  botDifficulties: BotDifficulty[];
  botFollowsRules: boolean;
  rules: ChallengeRulesJson;
  /** datetime-local values, Rome time. */
  startsAt: string;
  endsAt: string;
  dailyLimit: number | null;
  eventId: string | null;
  eventPoints: ChallengeEventPoints | null;
  online: boolean;
  minLevel: number | null;
  sealTarget: number | null;
  tiers: ChallengeTierDraft[];
  /** Third stage. */
  leaderboard: boolean;
  matchRules: ChallengeMatchRulesJson;
  /** The codes of the squad every player fields (Classica against the bots); empty: the player's own. */
  suppliedTeam: string[];
  /** An Emergenza: 8 or 10 threats. */
  emergencyThreats: 8 | 10;
};

export const NO_MATCH_RULES_JSON: ChallengeMatchRulesJson = { modifier: null, place: null, levels: [], rare_multiplier: 1 };

/** The modes a challenge can be played in today, with their squad. */
export const CHALLENGE_FORMATS = [
  { key: "classic", label: "Classica", detail: "Squadra da 5" },
  { key: "boss", label: "Grande Minaccia", detail: "Squadra da 5" },
  { key: "triple", label: "Allarme Triplo", detail: "Mazzo da 9" },
  { key: "quadrant", label: "Quadrante fisso", detail: "Mazzo da 10" },
  { key: "quadrant_shifting", label: "Quadrante mobile", detail: "Mazzo da 10" },
  { key: "emergency", label: "Emergenza", detail: "8 o 10 Minacce, da soli" },
] as const;

/** Light colors: the ribbon and the card's band carry black text. */
export const CHALLENGE_COLORS = ["#ff7ad9", "#ffd60a", "#16c8ff", "#ff8a00", "#7dffb0", "#c9a0ff", "#ff9b8a", "#f5f0e6"] as const;

export async function fetchAdminChallenges(): Promise<AdminChallenges> {
  const { data, error } = await getSupabase().rpc("admin_list_challenges");
  if (error) throw error;
  return data as unknown as AdminChallenges;
}

export async function previewChallenge(format: string, rules: ChallengeRulesJson, emergencyThreats?: number): Promise<ChallengePreview> {
  const { data, error } = await getSupabase().rpc("admin_preview_challenge", {
    p_format: format,
    p_rules: rules,
    ...(format === "emergency" && emergencyThreats ? { p_emergency_threats: emergencyThreats } : {}),
  });
  if (error) throw error;
  return data as unknown as ChallengePreview;
}

export async function saveChallenge(draft: ChallengeDraft): Promise<AdminChallenges> {
  const { data, error } = await getSupabase().rpc("admin_save_challenge", {
    p_id: draft.id,
    p_title: draft.title,
    p_description: draft.description,
    p_color: draft.color,
    p_format: draft.format,
    p_bot_difficulties: draft.botDifficulties,
    p_bot_follows_rules: draft.botFollowsRules,
    p_rules: draft.rules,
    p_starts_at: draft.startsAt,
    p_ends_at: draft.endsAt,
    p_daily_limit: draft.dailyLimit ?? undefined,
    p_event_id: draft.eventId ?? undefined,
    p_event_points: draft.eventPoints ?? undefined,
    p_online: draft.online,
    p_min_level: draft.minLevel ?? undefined,
    p_quadrant_seal_target: draft.sealTarget ?? undefined,
    p_tiers: draft.tiers,
    p_leaderboard: draft.leaderboard,
    p_match_rules: draft.format === "classic" ? draft.matchRules : NO_MATCH_RULES_JSON,
    p_supplied_team: draft.format === "classic" && draft.suppliedTeam.length > 0 ? draft.suppliedTeam : undefined,
    p_emergency_threats: draft.format === "emergency" ? draft.emergencyThreats : undefined,
  });
  if (error) throw error;
  return data as unknown as AdminChallenges;
}

export async function setChallengeActive(id: string, active: boolean): Promise<AdminChallenges> {
  const { data, error } = await getSupabase().rpc("admin_set_challenge_active", { p_id: id, p_active: active });
  if (error) throw error;
  return data as unknown as AdminChallenges;
}

export async function deleteChallenge(id: string): Promise<AdminChallenges> {
  const { data, error } = await getSupabase().rpc("admin_delete_challenge", { p_id: id });
  if (error) throw error;
  return data as unknown as AdminChallenges;
}

export type AdminChallengeState = "In corso" | "Programmata" | "Conclusa" | "Disattivata";

export function adminChallengeState(
  challenge: Pick<AdminChallenge, "is_active" | "starts_at" | "ends_at">,
  now: number,
): AdminChallengeState {
  if (Date.parse(challenge.ends_at) <= now) return "Conclusa";
  if (!challenge.is_active) return "Disattivata";
  return Date.parse(challenge.starts_at) <= now ? "In corso" : "Programmata";
}

/** Another active challenge of the mode in those dates: the server refuses two at once. */
export function overlappingChallenge(
  challenges: readonly AdminChallenge[],
  draft: { id?: string; format: string; startsAt: number; endsAt: number },
): AdminChallenge | null {
  return (
    challenges.find(
      (other) =>
        other.is_active &&
        other.id !== draft.id &&
        other.format === draft.format &&
        Date.parse(other.starts_at) < draft.endsAt &&
        Date.parse(other.ends_at) > draft.startsAt,
    ) ?? null
  );
}

/** A datetime-local value read as Rome time, as an instant; NaN when it is not one. */
export function fromRomeInput(value: string): number {
  const guess = Date.parse(`${value}Z`);
  if (Number.isNaN(guess)) return NaN;
  // The Rome offset at that moment: the wall clock the guess shows there, minus the guess.
  const offset = Date.parse(`${toRomeInput(guess)}Z`) - guess;
  return guess - offset;
}

/**
 * One batch of simulated Classica matches of a draft against a bot (the Edge Function, admins
 * only): the editor asks again until it has the matches it wants.
 */
export function simulateChallengeBatch(params: {
  difficulty: BotDifficulty;
  matches: number;
  rules: ChallengeRulesJson;
  matchRules: ChallengeMatchRulesJson;
  botFollowsRules: boolean;
  /** The codes of a squad the challenge gives; empty: none. */
  suppliedCodes: string[];
}): Promise<ChallengeSimulation> {
  return invokeFunction({
    action: "challenge_simulate",
    difficulty: params.difficulty,
    matches: params.matches,
    rules: params.rules,
    match_rules: params.matchRules,
    bot_follows_rules: params.botFollowsRules,
    supplied_codes: params.suppliedCodes,
  });
}

/** A win rate in words, for the editor: how hard the challenge looks against a bot. */
export function difficultyWord(winRate: number): string {
  if (winRate >= 0.7) return "Facile";
  if (winRate >= 0.5) return "Equilibrata";
  if (winRate >= 0.3) return "Dura";
  return "Molto dura";
}
