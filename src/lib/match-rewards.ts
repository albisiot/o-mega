import { getSupabase } from "@/lib/supabase/client";
import type { Json } from "@/types/database";

/**
 * What every match pays (SPEC §8.4): one row per mode x opponent x outcome, in coins,
 * XP and standard packs. The server reads the table when a match ends; the app only
 * shows it. A mode without rows of its own pays the "default" rows.
 */

export type RewardOutcome = "win" | "draw" | "loss";
export type RewardOpponent = "bot" | "person";

export type MatchRewardRule = {
  mode_key: string;
  opponent: RewardOpponent;
  outcome: RewardOutcome;
  coins: number;
  xp: number;
  packs: number;
};

/** game_config keys an admin changes on the same page. */
export type RewardSettingKey =
  | "match_rewards.daily_coin_cap"
  | "match_rewards.daily_pack_cap"
  | "conquest.no_card_bonus_coins"
  | "emergency.rewards.finish_xp"
  | "emergency.rewards.tier1_passed"
  | "emergency.rewards.tier2_passed"
  | "emergency.rewards.tier3_passed"
  | "emergency.rewards.tier1_coins"
  | "emergency.rewards.tier2_coins"
  | "emergency.rewards.tier3_coins";

export type MatchRewards = {
  rules: MatchRewardRule[];
  settings: Record<RewardSettingKey, number>;
  emergency_threats_per_run: number;
};

/** What the player earned in one finished match. */
export type MatchReward = { coins: number; xp: number; opening_ids: string[] };

export const OUTCOMES: { key: RewardOutcome; label: string }[] = [
  { key: "win", label: "Vittoria" },
  { key: "draw", label: "Pareggio" },
  { key: "loss", label: "Sconfitta" },
];

/** The modes in the order the admin page shows them; unknown keys from the server follow. */
export const REWARD_MODES: {
  key: string;
  label: string;
  note?: string;
  opponents: { key: RewardOpponent; label: string }[];
}[] = [
  {
    key: "classic",
    label: "Partita classica",
    opponents: [
      { key: "bot", label: "Contro un bot" },
      { key: "person", label: "Amichevole contro una persona" },
    ],
  },
  {
    key: "conquest",
    label: "Conquista",
    note: "Chi vince prende anche una carta dell'avversario.",
    opponents: [
      { key: "person", label: "Contro una persona" },
      { key: "bot", label: "Contro il bot di Conquista" },
    ],
  },
  {
    key: "boss",
    label: "Grande Minaccia",
    opponents: [
      { key: "bot", label: "Contro un bot" },
      { key: "person", label: "Amichevole contro una persona" },
    ],
  },
  {
    key: "triple",
    label: "Allarme Triplo",
    opponents: [
      { key: "bot", label: "Contro un bot" },
      { key: "person", label: "Amichevole contro una persona" },
    ],
  },
  {
    key: "quadrant",
    label: "Quadrante · griglia fissa",
    opponents: [
      { key: "bot", label: "Contro un bot" },
      { key: "person", label: "Amichevole contro una persona" },
    ],
  },
  {
    key: "quadrant_shifting",
    label: "Quadrante · griglia mobile",
    opponents: [
      { key: "bot", label: "Contro un bot" },
      { key: "person", label: "Amichevole contro una persona" },
    ],
  },
  {
    key: "story",
    label: "Missioni della Storia",
    note: "Ogni partita, anche rigiocata. Il premio della prima vittoria resta quello della missione.",
    opponents: [{ key: "bot", label: "Contro l'avversario della missione" }],
  },
  {
    key: "default",
    label: "Modalità future",
    note: "Vale per ogni modalità nuova finché non ha valori suoi.",
    opponents: [
      { key: "bot", label: "Contro un bot" },
      { key: "person", label: "Contro una persona" },
    ],
  },
];

/** Bounds the server enforces too. */
export const RULE_LIMITS = { coins: 10000, xp: 10000, packs: 3 } as const;

export const SETTING_LIMITS: Record<RewardSettingKey, { min: number; max: number }> = {
  "match_rewards.daily_coin_cap": { min: 0, max: 100000 },
  "match_rewards.daily_pack_cap": { min: 0, max: 20 },
  "conquest.no_card_bonus_coins": { min: 0, max: 10000 },
  "emergency.rewards.finish_xp": { min: 0, max: 10000 },
  "emergency.rewards.tier1_passed": { min: 1, max: 100 },
  "emergency.rewards.tier2_passed": { min: 1, max: 100 },
  "emergency.rewards.tier3_passed": { min: 1, max: 100 },
  "emergency.rewards.tier1_coins": { min: 1, max: 10000 },
  "emergency.rewards.tier2_coins": { min: 1, max: 10000 },
  "emergency.rewards.tier3_coins": { min: 1, max: 10000 },
};

/** The modes to show: the known ones present on the server, then any other key it sends. */
export function rewardModes(rules: MatchRewardRule[]): typeof REWARD_MODES {
  const keys = new Set(rules.map((rule) => rule.mode_key));
  const known = REWARD_MODES.filter((mode) => keys.has(mode.key));
  const unknown = [...keys]
    .filter((key) => !REWARD_MODES.some((mode) => mode.key === key))
    .sort()
    .map((key) => ({
      key,
      label: key,
      opponents: (["bot", "person"] as RewardOpponent[])
        .filter((opponent) => rules.some((rule) => rule.mode_key === key && rule.opponent === opponent))
        .map((opponent) => ({ key: opponent, label: opponent === "bot" ? "Contro un bot" : "Contro una persona" })),
    }));
  return [...known, ...unknown];
}

/** The row a match of this mode uses: its own, else the "default" one (as the server does). */
export function rewardRule(
  rules: MatchRewardRule[],
  modeKey: string,
  opponent: RewardOpponent,
  outcome: RewardOutcome,
): MatchRewardRule | null {
  const find = (key: string) =>
    rules.find((rule) => rule.mode_key === key && rule.opponent === opponent && rule.outcome === outcome) ?? null;
  return find(modeKey) ?? find("default");
}

export const ruleId = (rule: Pick<MatchRewardRule, "mode_key" | "opponent" | "outcome">) =>
  `${rule.mode_key}/${rule.opponent}/${rule.outcome}`;

/** "30 XP + 10 monete + 1 pacchetto", or "Niente". */
export function describeGain(gain: { coins: number; xp: number; packs: number }): string {
  const parts: string[] = [];
  if (gain.xp > 0) parts.push(`${gain.xp} XP`);
  if (gain.coins > 0) parts.push(gain.coins === 1 ? "1 moneta" : `${gain.coins} monete`);
  if (gain.packs > 0) parts.push(gain.packs === 1 ? "1 pacchetto" : `${gain.packs} pacchetti`);
  return parts.length > 0 ? parts.join(" + ") : "Niente";
}

/**
 * The matches that pay coins, for the shop: "Conquista: sconfitta +10, pareggio +10".
 * Opponents with the same coins share a line; "Modalità future" is left out.
 */
export function coinSources(rules: MatchRewardRule[]): string[] {
  const lines: string[] = [];
  for (const mode of rewardModes(rules)) {
    if (mode.key === "default") continue;
    const byOpponent = mode.opponents.map((opponent) => ({
      label: opponent.label.toLowerCase(),
      text: OUTCOMES.map((outcome) => {
        const coins = rewardRule(rules, mode.key, opponent.key, outcome.key)?.coins ?? 0;
        return coins > 0 ? `${outcome.label.toLowerCase()} +${coins}` : null;
      })
        .filter(Boolean)
        .join(", "),
    })).filter((entry) => entry.text !== "");
    if (byOpponent.length === 0) continue;
    const same = byOpponent.length === mode.opponents.length && byOpponent.every((entry) => entry.text === byOpponent[0].text);
    if (same) lines.push(`${mode.label}: ${byOpponent[0].text}`);
    else for (const entry of byOpponent) lines.push(`${mode.label} (${entry.label}): ${entry.text}`);
  }
  return lines;
}

/** Why a draft cannot be saved, in Italian, or null. */
export function rewardsProblem(
  rules: MatchRewardRule[],
  settings: Record<RewardSettingKey, number>,
  threatsPerRun: number,
): string | null {
  for (const rule of rules) {
    for (const field of ["coins", "xp", "packs"] as const) {
      const value = rule[field];
      if (!Number.isInteger(value) || value < 0 || value > RULE_LIMITS[field]) {
        const name = { coins: "monete", xp: "XP", packs: "pacchetti" }[field];
        return `Valore non valido (${name}): da 0 a ${RULE_LIMITS[field]}.`;
      }
    }
  }
  for (const [key, limit] of Object.entries(SETTING_LIMITS) as [RewardSettingKey, { min: number; max: number }][]) {
    const value = settings[key];
    if (!Number.isInteger(value) || value < limit.min || value > limit.max) {
      return `Valore non valido: deve stare tra ${limit.min} e ${limit.max}.`;
    }
  }
  const tiers = [1, 2, 3].map((tier) => settings[`emergency.rewards.tier${tier}_passed` as RewardSettingKey]);
  if (!(tiers[0] < tiers[1] && tiers[1] < tiers[2] && tiers[2] <= threatsPerRun)) {
    return `Le soglie dell'Emergenza devono crescere e arrivare al massimo a ${threatsPerRun} Minacce.`;
  }
  return null;
}

/** The rows and settings that differ from what the server has. */
export function rewardChanges(
  saved: MatchRewards,
  rules: MatchRewardRule[],
  settings: Record<RewardSettingKey, number>,
): { rules: MatchRewardRule[]; settings: Partial<Record<RewardSettingKey, number>> } {
  const before = new Map(saved.rules.map((rule) => [ruleId(rule), rule]));
  const changedRules = rules.filter((rule) => {
    const old = before.get(ruleId(rule));
    return !old || old.coins !== rule.coins || old.xp !== rule.xp || old.packs !== rule.packs;
  });
  const changedSettings: Partial<Record<RewardSettingKey, number>> = {};
  for (const key of Object.keys(SETTING_LIMITS) as RewardSettingKey[]) {
    if (settings[key] !== saved.settings[key]) changedSettings[key] = settings[key];
  }
  return { rules: changedRules, settings: changedSettings };
}

export async function fetchMatchRewards(): Promise<MatchRewards> {
  const { data, error } = await getSupabase().rpc("get_match_rewards");
  if (error) throw error;
  return data as unknown as MatchRewards;
}

/** Null until the match is finished, or for someone else's match. */
export async function fetchMatchReward(matchId: string): Promise<MatchReward | null> {
  const { data, error } = await getSupabase().rpc("get_match_reward", { p_match_id: matchId });
  if (error) throw error;
  return (data as unknown as MatchReward | null) ?? null;
}

export async function saveMatchRewards(
  rules: MatchRewardRule[],
  settings: Partial<Record<RewardSettingKey, number>>,
): Promise<MatchRewards> {
  const { data, error } = await getSupabase().rpc("admin_save_match_rewards", {
    p_rules: rules as unknown as Json,
    p_settings: settings as unknown as Json,
  });
  if (error) throw error;
  return data as unknown as MatchRewards;
}
