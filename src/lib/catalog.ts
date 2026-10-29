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
  return data
    .sort((a, b) => a.family.sort_order - b.family.sort_order || a.sort_order - b.sort_order)
    .map(({ code, name, family }) => ({ code, name, family }));
}

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
