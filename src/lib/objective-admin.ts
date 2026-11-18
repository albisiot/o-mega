import type { ObjectiveDifficulty } from "@/lib/objectives";
import { describeRandomVariants, ruleInfo, ruleToSend, type RandomVariantsRule } from "@/lib/random-variants";
import { getSupabase } from "@/lib/supabase/client";
import type { Json } from "@/types/database";

export type ObjectiveMetric =
  | "matches_played"
  | "matches_won"
  | "threats_won"
  | "cards_played"
  | "emergency_passed"
  | "packs_opened"
  | "duplicates_converted"
  | "cards_conquered"
  | "variants_found"
  | "variant_wins";

export type ObjectiveParams = Record<string, unknown>;

export type AdminObjective = {
  code: string;
  title: string;
  difficulty: ObjectiveDifficulty;
  metric: ObjectiveMetric;
  params: ObjectiveParams;
  target: number;
  /** Null: the difficulty's coins. */
  coins: number | null;
  packs: number;
  /** How many reward cards. */
  cards: number;
  /** The reward cards: "P051" for the base drawing, "P051:neon" for that variant (missing on an older server). */
  card_codes?: string[];
  /** Random variants it gives, as saved; null (or missing): none. */
  random_variants?: RandomVariantsRule | null;
  is_active: boolean;
  /** How many times players got it. */
  assigned: number;
};

export type AdminObjectives = {
  objectives: AdminObjective[];
  per_day: Record<ObjectiveDifficulty, number>;
  reward_coins: Record<ObjectiveDifficulty, number>;
  /** The cards an objective can give, with their variants (missing on an older server). */
  cards?: { code: string; name: string; rarity: string; rarity_code?: string; faction?: string; variants: { style: string; name: string }[] }[];
  /** The most reward cards an objective can give. */
  max_cards?: number;
  /** The styles and rarities a rule of random variants can name. */
  variant_styles?: { style: string; name: string }[];
  rarities?: { code: string; name: string; rank: number; color: string }[];
};

export type ObjectiveDraft = {
  code: string | null;
  title: string;
  difficulty: ObjectiveDifficulty;
  metric: ObjectiveMetric;
  params: ObjectiveParams;
  target: number;
  coins: number | null;
  packs: number;
  /** The reward cards; undefined keeps them as they are (an older server cannot set them). */
  cardCodes?: string[];
  randomVariants?: RandomVariantsRule | null;
};

/**
 * What an objective can count: a metric with its filters, and the title it suggests
 * ("{n}" is the target). The server checks the filters again.
 */
export const OBJECTIVE_KINDS: {
  key: string;
  label: string;
  metric: ObjectiveMetric;
  params: ObjectiveParams;
  one: string;
  many: string;
}[] = [
  { key: "play", label: "Partite giocate", metric: "matches_played", params: {}, one: "Gioca una partita", many: "Gioca {n} partite" },
  { key: "story", label: "Missioni della Storia giocate", metric: "matches_played", params: { story: true }, one: "Gioca una missione della Storia", many: "Gioca {n} missioni della Storia" },
  { key: "challenge_play", label: "Partite giocate in una Sfida a tema", metric: "matches_played", params: { challenge: true }, one: "Gioca una Sfida a tema", many: "Gioca {n} partite in una Sfida a tema" },
  { key: "challenge_win", label: "Vittorie in una Sfida a tema", metric: "matches_won", params: { challenge: true }, one: "Vinci una Sfida a tema", many: "Vinci {n} partite in una Sfida a tema" },
  { key: "win", label: "Partite vinte", metric: "matches_won", params: {}, one: "Vinci una partita", many: "Vinci {n} partite" },
  { key: "win_online", label: "Vittorie contro un giocatore", metric: "matches_won", params: { opponent: "player" }, one: "Vinci una partita online contro un giocatore", many: "Vinci {n} partite online contro un giocatore" },
  { key: "win_bot", label: "Vittorie contro un bot", metric: "matches_won", params: { opponent: "bot" }, one: "Vinci una partita contro un bot", many: "Vinci {n} partite contro un bot" },
  { key: "win_hard_bot", label: "Vittorie contro bot Difficile o Super Pro", metric: "matches_won", params: { opponent: "bot", bot_difficulties: ["hard", "super_pro"] }, one: "Vinci una partita contro un bot Difficile o Super Pro", many: "Vinci {n} partite contro un bot Difficile o Super Pro" },
  { key: "win_flawless", label: "Vittorie classiche 3-0", metric: "matches_won", params: { format: "classic", flawless: true }, one: "Vinci una partita classica 3-0", many: "Vinci {n} partite classiche 3-0" },
  { key: "win_triple", label: "Vittorie ad Allarme Triplo", metric: "matches_won", params: { format: "triple" }, one: "Vinci una partita ad Allarme Triplo", many: "Vinci {n} partite ad Allarme Triplo" },
  { key: "win_boss", label: "Vittorie a Grande Minaccia", metric: "matches_won", params: { format: "boss" }, one: "Vinci una partita a Grande Minaccia", many: "Vinci {n} partite a Grande Minaccia" },
  { key: "threats", label: "Minacce vinte in partita", metric: "threats_won", params: {}, one: "Vinci una Minaccia in partita", many: "Vinci {n} Minacce in partita" },
  { key: "threats_villains", label: "Minacce vinte con un Supercattivo", metric: "threats_won", params: { faction: "villains" }, one: "Vinci una Minaccia con un Supercattivo", many: "Vinci {n} Minacce con un Supercattivo" },
  { key: "threats_heroes", label: "Minacce vinte con un Supereroe", metric: "threats_won", params: { faction: "heroes" }, one: "Vinci una Minaccia con un Supereroe", many: "Vinci {n} Minacce con un Supereroe" },
  { key: "threats_delta", label: "Minacce vinte con una carta Delta", metric: "threats_won", params: { max_rarity_rank: 1 }, one: "Vinci una Minaccia con una carta Delta", many: "Vinci {n} Minacce con una carta Delta" },
  { key: "cards_beta", label: "Carte Beta o più rare giocate", metric: "cards_played", params: { min_rarity_rank: 3 }, one: "Gioca una carta Beta o più rara", many: "Gioca {n} carte Beta o più rare" },
  { key: "emergency", label: "Minacce superate in Emergenza", metric: "emergency_passed", params: {}, one: "Supera una Minaccia in Emergenza", many: "Supera {n} Minacce in Emergenza" },
  { key: "packs", label: "Pacchetti aperti", metric: "packs_opened", params: {}, one: "Apri un pacchetto", many: "Apri {n} pacchetti" },
  { key: "variants_found", label: "Varianti trovate nei pacchetti", metric: "variants_found", params: {}, one: "Trova una variante in un pacchetto", many: "Trova {n} varianti nei pacchetti" },
  { key: "variant_wins", label: "Partite vinte con una variante in squadra", metric: "variant_wins", params: {}, one: "Vinci una partita con una variante in squadra", many: "Vinci {n} partite con una variante in squadra" },
  { key: "duplicates", label: "Doppioni convertiti", metric: "duplicates_converted", params: {}, one: "Converti un doppione", many: "Converti {n} doppioni" },
  { key: "conquer", label: "Carte conquistate", metric: "cards_conquered", params: {}, one: "Conquista una carta", many: "Conquista {n} carte" },
];

function sameParams(a: ObjectiveParams, b: ObjectiveParams): boolean {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => JSON.stringify(a[key]) === JSON.stringify(b[key]));
}

/** The kind an objective counts, or null for one written by hand with SQL. */
export function kindOf(objective: Pick<AdminObjective, "metric" | "params">) {
  return OBJECTIVE_KINDS.find((kind) => kind.metric === objective.metric && sameParams(kind.params, objective.params)) ?? null;
}

/** The title a kind suggests for a target. */
export function suggestTitle(kindKey: string, target: number): string {
  const kind = OBJECTIVE_KINDS.find((entry) => entry.key === kindKey);
  if (!kind) return "";
  return target === 1 ? kind.one : kind.many.replace("{n}", String(target));
}

/** "40 monete (difficoltà)", "1 pacchetto", "1 pacchetto + 20 monete", "+ 2 carte", "+ 1 variante a caso". */
export function describeAdminReward(
  objective: Pick<AdminObjective, "coins" | "packs" | "cards" | "difficulty" | "random_variants">,
  rewardCoins: AdminObjectives["reward_coins"],
  lists: Pick<AdminObjectives, "variant_styles" | "rarities"> = {},
): string {
  const parts: string[] = [];
  if (objective.packs > 0) parts.push(objective.packs === 1 ? "1 pacchetto" : `${objective.packs} pacchetti`);
  if (objective.coins === null) parts.push(`${rewardCoins[objective.difficulty]} monete`);
  else if (objective.coins > 0) parts.push(`${objective.coins} monete`);
  if (objective.cards > 0) parts.push(objective.cards === 1 ? "1 carta" : `${objective.cards} carte`);
  const random = describeRandomVariants(ruleInfo(objective.random_variants, lists.variant_styles ?? [], lists.rarities ?? []));
  if (random) parts.push(random);
  return parts.join(" + ");
}

export async function fetchAdminObjectives(): Promise<AdminObjectives> {
  const { data, error } = await getSupabase().rpc("admin_list_daily_objectives");
  if (error) throw error;
  return data as unknown as AdminObjectives;
}

export async function saveAdminObjective(draft: ObjectiveDraft): Promise<AdminObjectives> {
  const { data, error } = await getSupabase().rpc("admin_save_daily_objective", {
    // The generated types have no null, but the function takes it: a new objective, the difficulty's coins.
    p_code: draft.code as string,
    p_title: draft.title,
    p_difficulty: draft.difficulty,
    p_metric: draft.metric,
    p_params: draft.params as Json,
    p_target: draft.target,
    p_coins: draft.coins as number,
    p_packs: draft.packs,
    // Sent only when used, so the page keeps working against a server without them.
    ...(ruleToSend(draft.randomVariants) ? { p_random_variants: ruleToSend(draft.randomVariants) } : {}),
    ...(draft.cardCodes !== undefined ? { p_card_codes: draft.cardCodes } : {}),
  });
  if (error) throw error;
  return data as unknown as AdminObjectives;
}

export async function setAdminObjectiveActive(code: string, isActive: boolean): Promise<AdminObjectives> {
  const { data, error } = await getSupabase().rpc("admin_set_daily_objective_active", {
    p_code: code,
    p_is_active: isActive,
  });
  if (error) throw error;
  return data as unknown as AdminObjectives;
}

export async function deleteAdminObjective(code: string): Promise<AdminObjectives> {
  const { data, error } = await getSupabase().rpc("admin_delete_daily_objective", { p_code: code });
  if (error) throw error;
  return data as unknown as AdminObjectives;
}
