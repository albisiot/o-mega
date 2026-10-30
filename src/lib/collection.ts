import type { CardData } from "@/components/card-view";
import { getSupabase } from "@/lib/supabase/client";

export type CatalogCard = CardData & {
  id: string;
  code: string;
  rarity: CardData["rarity"] & { code: string };
  duplicateCoinValue: number;
};

export type OwnedSummary = {
  definition_id: string;
  copies: number;
  /** Bound to the account: never conquerable nor convertible. */
  starter_copies: number;
  /** Recently conquered: not convertible until the lock expires. */
  locked_copies: number;
  convertible_copies: number;
};

export type ConversionResult = { converted: number; coins: number; coin_balance: number };

let catalogPromise: Promise<CatalogCard[]> | null = null;

async function loadCatalog(): Promise<CatalogCard[]> {
  const { data, error } = await getSupabase().from("card_catalog").select("*").order("code");
  if (error) throw error;
  // View columns are typed as nullable; the view only joins non-null columns.
  return data.map((row) => ({
    id: row.id!,
    code: row.code!,
    name: row.name!,
    faction: row.faction!,
    flavor: row.flavor ?? "",
    art_url: row.art_url,
    stats: row.stats as Record<string, number>,
    rarity: { code: row.rarity_code!, name: row.rarity_name!, rank: row.rarity_rank!, color: row.rarity_color! },
    power: row.power_name ? { name: row.power_name, text: row.power_text ?? "" } : null,
    duplicateCoinValue: row.duplicate_coin_value ?? 0,
  }));
}

/** Every active character, by catalog number; fetched once per session. */
export function fetchCatalog(): Promise<CatalogCard[]> {
  const pending =
    catalogPromise ??
    loadCatalog().catch((error: unknown) => {
      catalogPromise = null; // let the next call retry
      throw error;
    });
  catalogPromise = pending;
  return pending;
}

/** The signed-in player's copies, per character. */
export async function fetchCollection(): Promise<Map<string, OwnedSummary>> {
  const { data, error } = await getSupabase().rpc("get_collection");
  if (error) throw error;
  return new Map(data.map((row) => [row.definition_id, row]));
}

/** Converts `count` duplicates of a character, or all of them when omitted. */
export async function convertDuplicates(definitionId: string, count?: number): Promise<ConversionResult> {
  const { data, error } = await getSupabase().rpc("convert_duplicates", {
    p_definition_id: definitionId,
    p_count: count,
  });
  if (error) throw error;
  return data as unknown as ConversionResult;
}

export async function convertAllDuplicates(): Promise<ConversionResult> {
  const { data, error } = await getSupabase().rpc("convert_all_duplicates");
  if (error) throw error;
  return data as unknown as ConversionResult;
}
