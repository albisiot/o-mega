import { forget, keepSeen, lastSeen } from "@/lib/last-seen";
import { describeRandomVariants, type RandomVariantsInfo } from "@/lib/random-variants";
import { describeShards } from "@/lib/shard-rewards";
import { getSupabase } from "@/lib/supabase/client";

export type ObjectiveDifficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_LABELS: Record<ObjectiveDifficulty, string> = {
  easy: "Facile",
  medium: "Media",
  hard: "Difficile",
};

export type ObjectiveRewardCard = {
  definition_id: string;
  code: string;
  name: string;
  rarity_code: string;
  art_url: string | null;
  variant_id: string | null;
};

export type DailyObjective = {
  id: string;
  slot: number;
  code: string;
  difficulty: ObjectiveDifficulty;
  title: string;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  coins: number;
  packs: number;
  /** Schegge it gives (0: none; missing from older servers). */
  shards?: number;
  cards: ObjectiveRewardCard[];
  /** Random variants it gives, by name; null (or missing): none. */
  random_variants?: RandomVariantsInfo | null;
  /** The packs and cards it paid, shown with the pack reveal. */
  opening_ids: string[];
};

export type DailyObjectives = {
  /** The game day (midnight Europe/Rome), as YYYY-MM-DD. */
  day: string;
  resets_at: string;
  refreshes_per_day: number;
  refreshes_left: number;
  objectives: DailyObjective[];
};

export type ObjectiveClaim = {
  coins: number;
  opening_ids: string[];
  coin_balance: number;
};

const KEY = "dailyObjectives";

/** Today's objectives: the server draws them on the first call of the day. */
export async function fetchDailyObjectives(): Promise<DailyObjectives> {
  const { data, error } = await getSupabase().rpc("get_daily_objectives");
  if (error) throw error;
  return keepSeen(KEY, data as unknown as DailyObjectives);
}

export const seenDailyObjectives = () => lastSeen<DailyObjectives>(KEY);

export async function claimDailyObjective(objectiveId: string): Promise<ObjectiveClaim> {
  const { data, error } = await getSupabase().rpc("claim_daily_objective", { p_objective_id: objectiveId });
  if (error) throw error;
  forget(KEY);
  // The balance shown by the home and the wallet is out of date.
  forget("coinHistory");
  return data as unknown as ObjectiveClaim;
}

export async function refreshDailyObjective(objectiveId: string): Promise<DailyObjectives> {
  const { data, error } = await getSupabase().rpc("refresh_daily_objective", { p_objective_id: objectiveId });
  if (error) throw error;
  return keepSeen(KEY, data as unknown as DailyObjectives);
}

/** Completed and not claimed yet. */
export function isClaimable(objective: DailyObjective): boolean {
  return objective.completed && !objective.claimed;
}

export function claimableCount(objectives: DailyObjectives | null): number {
  return objectives ? objectives.objectives.filter(isClaimable).length : 0;
}

/** "40 monete", "1 pacchetto + 20 monete", "2 Schegge", "Carta: Nome", "1 variante a caso". */
export function describeObjectiveReward({
  coins,
  packs,
  shards,
  cards,
  random_variants,
}: Pick<DailyObjective, "coins" | "packs" | "shards" | "cards" | "random_variants">): string {
  const parts: string[] = [];
  if (packs > 0) parts.push(packs === 1 ? "1 pacchetto" : `${packs} pacchetti`);
  if (coins > 0) parts.push(`${coins} monete`);
  const shardText = describeShards(shards);
  if (shardText) parts.push(shardText);
  if (cards.length === 1) parts.push(`Carta: ${cards[0].name}`);
  else if (cards.length > 1) parts.push(`${cards.length} carte`);
  const random = describeRandomVariants(random_variants);
  if (random) parts.push(random);
  return parts.join(" + ");
}

/** The home's line: what is left to do, or what waits to be claimed. */
/** The same in a few words, for the home's tile beside the event's. */
export function summarizeObjectivesShort(objectives: DailyObjectives): string {
  const list = objectives.objectives;
  const toClaim = list.filter(isClaimable).length;
  if (toClaim > 0) return toClaim === 1 ? "1 premio!" : `${toClaim} premi!`;
  const done = list.filter((objective) => objective.completed).length;
  if (list.length > 0 && done === list.length) return "Tutti fatti";
  return `${done} su ${list.length} fatti`;
}

export function summarizeObjectives(objectives: DailyObjectives): string {
  const list = objectives.objectives;
  const toClaim = list.filter(isClaimable).length;
  if (toClaim > 0) return toClaim === 1 ? "1 premio da riscattare" : `${toClaim} premi da riscattare`;
  const done = list.filter((objective) => objective.completed).length;
  if (list.length > 0 && done === list.length) return "Tutti completati: a domani!";
  return `${done} su ${list.length} completati`;
}
