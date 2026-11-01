import type { CardData } from "@/components/card-view";
import { keepSeen, lastSeen } from "@/lib/last-seen";
import { getSupabase } from "@/lib/supabase/client";

export type CatalogCard = CardData & {
  id: string;
  code: string;
  rarity: CardData["rarity"] & { code: string };
  duplicateCoinValue: number;
  /** Set for the characters players get at a level instead of finding them in packs. */
  unlockLevel: number | null;
  /** Artwork variants of this character that exist; players see only those they found. */
  variantCount: number;
};

export type OwnedVariant = { instance_id: string; style: string; name: string; art_url: string };

export type OwnedSummary = {
  definition_id: string;
  copies: number;
  /** Bound to the account: never conquerable nor convertible. */
  starter_copies: number;
  /** Recently conquered: not convertible until the lock expires. */
  locked_copies: number;
  convertible_copies: number;
  /** Copies with an artwork variant: they count in `copies` and are never convertible. */
  variants: OwnedVariant[];
};

/** Shown on a character's own tile and page: the base drawing, unless the player has only variants. */
export function ownedArt(card: CatalogCard, owned: OwnedSummary): Pick<CatalogCard, "art_url" | "variant"> {
  const only = owned.variants.length === owned.copies ? owned.variants[0] : null;
  return only ? { art_url: only.art_url, variant: { name: only.name } } : { art_url: card.art_url, variant: null };
}

export type ConversionResult = { converted: number; coins: number; coin_balance: number };

let catalogPromise: Promise<CatalogCard[]> | null = null;

async function loadCatalog(): Promise<CatalogCard[]> {
  const { data, error } = await getSupabase().from("card_catalog").select("*").order("code");
  if (error) throw error;
  // View columns are typed as nullable; the view only joins non-null columns.
  return keepSeen("catalog", data.map((row) => ({
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
    unlockLevel: row.unlock_level ?? null,
    variantCount: row.variant_count ?? 0,
  })));
}

export const seenCatalog = () => lastSeen<CatalogCard[]>("catalog");
export const seenCollection = () => lastSeen<Map<string, OwnedSummary>>("collection");

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
  const supabase = getSupabase();
  const [summary, variants] = await Promise.all([
    supabase.rpc("get_collection"),
    supabase
      .from("card_instances")
      .select("id, definition_id, card_variants(style, style_name, art_url)")
      .not("variant_id", "is", null),
  ]);
  if (summary.error) throw summary.error;
  if (variants.error) throw variants.error;
  const byDefinition = new Map<string, OwnedVariant[]>();
  for (const row of variants.data) {
    if (!row.card_variants) continue;
    const { style, style_name: name, art_url } = row.card_variants;
    byDefinition.set(row.definition_id, [
      ...(byDefinition.get(row.definition_id) ?? []),
      { instance_id: row.id, style, name, art_url },
    ]);
  }
  return keepSeen(
    "collection",
    new Map(summary.data.map((row) => [row.definition_id, { ...row, variants: byDefinition.get(row.definition_id) ?? [] }])),
  );
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
