import type { BotDifficulty } from "@o-mega/game-engine";
import type { Challenge, ChallengeEventPoints, ChallengeRulesJson } from "@/lib/challenges";
import { toRomeInput } from "@/lib/events";
import { getSupabase } from "@/lib/supabase/client";

/** The Sfide a tema as the admin page (/gestione-sfide) reads them: every function checks the admin. */

export type AdminChallenge = Challenge & { is_active: boolean; version: number; matches: number; players: number };

export type AdminChallengeEvent = { id: string; title: string; starts_at: string; ends_at: string };

export type AdminChallenges = {
  now: string;
  challenges: AdminChallenge[];
  /** Active events not over yet: a challenge can be linked to one of them. */
  events: AdminChallengeEvent[];
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
};

export type ChallengeDraft = {
  id?: string;
  title: string;
  description: string;
  color: string;
  format: "classic" | "triple";
  botDifficulties: BotDifficulty[];
  botFollowsRules: boolean;
  rules: ChallengeRulesJson;
  /** datetime-local values, Rome time. */
  startsAt: string;
  endsAt: string;
  dailyLimit: number | null;
  eventId: string | null;
  eventPoints: ChallengeEventPoints | null;
};

/** The modes a challenge can be played in today, with their squad. */
export const CHALLENGE_FORMATS = [
  { key: "classic", label: "Classica", detail: "Squadra da 5" },
  { key: "triple", label: "Allarme Triplo", detail: "Mazzo da 9" },
] as const;

/** Light colors: the ribbon and the card's band carry black text. */
export const CHALLENGE_COLORS = ["#ff7ad9", "#ffd60a", "#16c8ff", "#ff8a00", "#7dffb0", "#c9a0ff", "#ff9b8a", "#f5f0e6"] as const;

export async function fetchAdminChallenges(): Promise<AdminChallenges> {
  const { data, error } = await getSupabase().rpc("admin_list_challenges");
  if (error) throw error;
  return data as unknown as AdminChallenges;
}

export async function previewChallenge(format: string, rules: ChallengeRulesJson): Promise<ChallengePreview> {
  const { data, error } = await getSupabase().rpc("admin_preview_challenge", { p_format: format, p_rules: rules });
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
