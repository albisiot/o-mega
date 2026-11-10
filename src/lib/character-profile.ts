import { getSupabase } from "@/lib/supabase/client";

export type CharacterTrait = { code: string; name: string; description: string };

/** One line of traits on the profile: a category (Origine, Natura, Gruppo) and its values. */
export type TraitGroup = { category: string; traits: CharacterTrait[] };

/** What the card detail page shows about a character beyond the card itself. */
export type CharacterProfile = {
  realName: string | null;
  powers: string | null;
  traits: TraitGroup[];
};

type TraitRow = {
  code: string;
  name: string;
  description: string;
  sort_order: number;
  trait_categories: { name: string; sort_order: number };
};

/** Traits grouped by category, categories and values in catalog order. */
export function groupTraits(rows: TraitRow[]): TraitGroup[] {
  const sorted = [...rows].sort(
    (a, b) => a.trait_categories.sort_order - b.trait_categories.sort_order || a.sort_order - b.sort_order,
  );
  const groups: TraitGroup[] = [];
  for (const row of sorted) {
    const trait = { code: row.code, name: row.name, description: row.description };
    const last = groups[groups.length - 1];
    if (last?.category === row.trait_categories.name) last.traits.push(trait);
    else groups.push({ category: row.trait_categories.name, traits: [trait] });
  }
  return groups;
}

const profiles = new Map<string, Promise<CharacterProfile>>();

/** Real name, powers and traits of one character; fetched once per session. */
export function fetchCharacterProfile(definitionId: string): Promise<CharacterProfile> {
  const cached = profiles.get(definitionId);
  if (cached) return cached;
  const pending = loadProfile(definitionId).catch((error: unknown) => {
    profiles.delete(definitionId); // let the next call retry
    throw error;
  });
  profiles.set(definitionId, pending);
  return pending;
}

async function loadProfile(definitionId: string): Promise<CharacterProfile> {
  const { data, error } = await getSupabase()
    .from("card_definitions")
    .select(
      "real_name, powers_text, card_definition_traits(traits(code, name, description, sort_order, trait_categories(name, sort_order)))",
    )
    .eq("id", definitionId)
    .maybeSingle();
  if (error) throw error;
  return {
    realName: data?.real_name ?? null,
    powers: data?.powers_text ?? null,
    traits: groupTraits((data?.card_definition_traits ?? []).map((held) => held.traits)),
  };
}
