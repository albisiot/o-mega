import { getSupabase } from "@/lib/supabase/client";
import type { TraitCategory } from "@/lib/traits";

export type PackPoolRarity = { code: string; name: string; rank: number; color: string };

export type PackPoolCard = {
  code: string;
  name: string;
  rarity_code: string;
  art_url: string | null;
  in_packs: boolean;
  /** Trait codes, to filter the list. */
  traits?: string[];
};

/** Every card packs could give (level cards never can), rarest last. */
export type PackPool = {
  rarities: PackPoolRarity[];
  cards: PackPoolCard[];
  guaranteed_min_rarity_rank: number;
  trait_catalog?: TraitCategory[];
};

export async function fetchPackPool(): Promise<PackPool> {
  const { data, error } = await getSupabase().rpc("admin_list_pack_cards");
  if (error) throw error;
  return data as unknown as PackPool;
}

/** Ticks or unticks the given cards; the server refuses to leave packs without a card for the guarantee. */
export async function setCardsInPacks(cardCodes: string[], inPacks: boolean): Promise<PackPool> {
  const { data, error } = await getSupabase().rpc("admin_set_cards_in_packs", {
    p_card_codes: cardCodes,
    p_in_packs: inPacks,
  });
  if (error) throw error;
  return data as unknown as PackPool;
}

/** How many cards of a rarity packs can give, out of how many there are. */
export function rarityCount(cards: PackPoolCard[], rarityCode: string): { inPacks: number; total: number } {
  const ofRarity = cards.filter((card) => card.rarity_code === rarityCode);
  return { inPacks: ofRarity.filter((card) => card.in_packs).length, total: ofRarity.length };
}
