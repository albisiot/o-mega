import type { TraitIndex } from "@/lib/card-list";
import { keepSeen, lastSeen } from "@/lib/last-seen";
import { getSupabase } from "@/lib/supabase/client";

// UI labels for catalog codes stored in the database.
export const FACTION_LABELS: Record<string, string> = {
  heroes: "Eroi",
  villains: "Cattivi",
  neutrals: "Neutrali",
};

export type AbilityInfo = {
  code: string;
  name: string;
  family: { code: string; name: string; color: string; sort_order: number };
};

let abilitiesPromise: Promise<AbilityInfo[]> | null = null;

async function loadAbilities(): Promise<AbilityInfo[]> {
  const { data, error } = await getSupabase()
    .from("ability_definitions")
    .select("code, name, sort_order, family:ability_families!inner(code, name, color, sort_order)");
  if (error) throw error;
  return keepSeen(
    "abilities",
    data
      .sort((a, b) => a.family.sort_order - b.family.sort_order || a.sort_order - b.sort_order)
      .map(({ code, name, family }) => ({ code, name, family })),
  );
}

export const seenAbilities = () => lastSeen<AbilityInfo[]>("abilities");

/** The 12 abilities ordered by family then position; fetched once per session. */
export function fetchAbilities(): Promise<AbilityInfo[]> {
  const pending =
    abilitiesPromise ??
    loadAbilities().catch((error: unknown) => {
      abilitiesPromise = null; // let the next call retry
      throw error;
    });
  abilitiesPromise = pending;
  return pending;
}

let traitIndexPromise: Promise<TraitIndex> | null = null;

/** Rows per request: PostgREST caps a response, and there are three traits per character. */
const TRAIT_PAGE = 1000;

async function loadTraitIndex(): Promise<TraitIndex> {
  const supabase = getSupabase();
  const categories = await supabase
    .from("trait_categories")
    .select("code, name, sort_order, traits(code, name, sort_order)")
    .order("sort_order");
  if (categories.error) throw categories.error;
  const byCard = new Map<string, string[]>();
  for (let from = 0; ; from += TRAIT_PAGE) {
    const page = await supabase
      .from("card_definition_traits")
      .select("definition_id, trait_code")
      .order("definition_id")
      .order("trait_code")
      .range(from, from + TRAIT_PAGE - 1);
    if (page.error) throw page.error;
    for (const row of page.data) byCard.set(row.definition_id, [...(byCard.get(row.definition_id) ?? []), row.trait_code]);
    if (page.data.length < TRAIT_PAGE) break;
  }
  const catalog = categories.data.map((category) => ({
    code: category.code,
    name: category.name,
    traits: [...category.traits].sort((a, b) => a.sort_order - b.sort_order).map(({ code, name }) => ({ code, name })),
  }));
  return keepSeen("traitIndex", { catalog, byCard });
}

export const seenTraitIndex = () => lastSeen<TraitIndex>("traitIndex");

/** Trait categories and the traits of every character, to sort and filter card lists; fetched once per session. */
export function fetchTraitIndex(): Promise<TraitIndex> {
  const pending =
    traitIndexPromise ??
    loadTraitIndex().catch((error: unknown) => {
      traitIndexPromise = null; // let the next call retry
      throw error;
    });
  traitIndexPromise = pending;
  return pending;
}

/** Rarity, faction and traits of every card by code, with the rarities and the trait catalog, for the admin card pickers. */
export type AdminCardReference = {
  facts: Map<string, { rarity_code: string; faction: string; traits: string[] }>;
  rarities: { code: string; name: string; rank: number; color: string }[];
  catalog: TraitIndex["catalog"];
};

let adminReferencePromise: Promise<AdminCardReference> | null = null;

async function loadAdminCardReference(): Promise<AdminCardReference> {
  const supabase = getSupabase();
  const [cards, rarities, traits] = await Promise.all([
    supabase.from("card_definitions").select("id, code, faction, rarity_code").order("code").range(0, 4999),
    supabase.from("rarity_definitions").select("code, name, rank, color").order("rank"),
    fetchTraitIndex(),
  ]);
  if (cards.error) throw cards.error;
  if (rarities.error) throw rarities.error;
  const facts = new Map(
    cards.data.map((card) => [
      card.code,
      { rarity_code: card.rarity_code, faction: card.faction, traits: traits.byCard.get(card.id) ?? [] },
    ]),
  );
  return { facts, rarities: rarities.data, catalog: traits.catalog };
}

/** The public catalog the admin card pickers filter by; fetched once per session. */
export function fetchAdminCardReference(): Promise<AdminCardReference> {
  const pending =
    adminReferencePromise ??
    loadAdminCardReference().catch((error: unknown) => {
      adminReferencePromise = null; // let the next call retry
      throw error;
    });
  adminReferencePromise = pending;
  return pending;
}
