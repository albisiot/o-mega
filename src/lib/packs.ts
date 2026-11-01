import { forget, keepSeen, lastSeen } from "@/lib/last-seen";
import { getSupabase } from "@/lib/supabase/client";

export type PackCard = {
  instance_id: string;
  is_new: boolean;
  code: string;
  name: string;
  faction: string;
  flavor: string;
  art_url: string | null;
  variant: { style: string; name: string } | null;
  stats: Record<string, number>;
  rarity: { code: string; name: string; rank: number; color: string };
  power: { name: string; text: string } | null;
};

/** Cards come least rare first, so the best one is revealed last. */
export type PackOpening = {
  id: string;
  /** "bonus": the cards chosen for a bonus code, shown like a pack. */
  pack_type: "daily" | "standard" | "bonus";
  opened_at: string;
  cards: PackCard[];
};

export type PackStatus = {
  daily_available: boolean;
  /** Next midnight Europe/Rome, computed by the server. */
  resets_at: string;
  coin_balance: number;
  standard_pack_price: number;
};

export type PackOdds = {
  cards_per_pack: number;
  standard_pack_price: number;
  guaranteed_min_rarity_rank: number;
  guaranteed_rarity_name: string;
  variant_chance_percent: number;
  characters_with_variants: number;
  /** Per-card probability of each rarity, as used by the server draw. */
  odds: { code: string; name: string; rank: number; color: string; probability: number }[];
};

export async function fetchPackOdds(): Promise<PackOdds> {
  const { data, error } = await getSupabase().rpc("get_pack_odds");
  if (error) throw error;
  return keepSeen("packOdds", data as unknown as PackOdds);
}

export const seenPackOdds = () => lastSeen<PackOdds>("packOdds");
export const seenPackStatus = () => lastSeen<PackStatus>("packStatus");

export async function fetchPackStatus(): Promise<PackStatus> {
  const { data, error } = await getSupabase().rpc("get_pack_status");
  if (error) throw error;
  return keepSeen("packStatus", data as unknown as PackStatus);
}

export async function claimDailyPack(): Promise<PackOpening> {
  const { data, error } = await getSupabase().rpc("claim_daily_pack");
  if (error) throw error;
  return remember(data as unknown as PackOpening);
}

export async function buyPack(): Promise<PackOpening> {
  const { data, error } = await getSupabase().rpc("buy_pack");
  if (error) throw error;
  return remember(data as unknown as PackOpening);
}

export type BonusReward = {
  coins: number;
  cards: number;
  packs: number;
  /** Chosen cards first, then one opening per pack. */
  openings: PackOpening[];
};

export async function redeemBonusCode(code: string): Promise<BonusReward> {
  const { data, error } = await getSupabase().rpc("redeem_bonus_code", { p_code: code });
  if (error) throw error;
  // An unknown code is an answer, not a failure: the server must keep counting attempts.
  const result = data as unknown as BonusReward | { error: string };
  if ("error" in result) throw new Error(result.error);
  result.openings.forEach(remember);
  forget("packStatus");
  forget("coinHistory");
  return result;
}

/** "100 monete, 1 carta e 2 pacchetti" */
export function describeBonusReward({ coins, cards, packs }: Pick<BonusReward, "coins" | "cards" | "packs">): string {
  const parts = [
    coins > 0 && `${coins} ${coins === 1 ? "moneta" : "monete"}`,
    cards > 0 && `${cards} ${cards === 1 ? "carta" : "carte"}`,
    packs > 0 && `${packs} ${packs === 1 ? "pacchetto" : "pacchetti"}`,
  ].filter((part) => part !== false);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} e ${parts.at(-1)}` : (parts[0] ?? "");
}

/** Reveal page of the first opening; the others follow it, in order. */
export function packRevealHref([first, ...rest]: string[]): string {
  return `/pacchetto/?id=${first}${rest.length > 0 ? `&next=${rest.join(",")}` : ""}`;
}

// The opening RPCs already return the cards: keep them so the reveal page
// does not fetch them again. A reload falls back to get_pack_opening.
const openings = new Map<string, PackOpening>();

function remember(opening: PackOpening): PackOpening {
  openings.set(opening.id, opening);
  // A pack just opened: the old status would offer it again, the old balance is wrong.
  forget("packStatus");
  forget("coinHistory");
  return opening;
}

export function cachedPackOpening(id: string): PackOpening | null {
  return openings.get(id) ?? null;
}

export async function fetchPackOpening(id: string): Promise<PackOpening> {
  const cached = openings.get(id);
  if (cached) return cached;
  const { data, error } = await getSupabase().rpc("get_pack_opening", { p_opening_id: id });
  if (error) throw error;
  return remember(data as unknown as PackOpening);
}
