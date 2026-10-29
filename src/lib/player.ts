import { getSupabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

export type Profile = Tables<"profiles">;

export type OwnedCard = {
  id: string;
  is_starter: boolean;
  acquired_at: string;
  definition: {
    code: string;
    name: string;
    faction: string;
    rarity: { name: string; rank: number; color: string };
  };
};

/** Creates the profile and grants the starter set on first access (idempotent). */
export async function bootstrapPlayer(): Promise<Profile> {
  const { data, error } = await getSupabase().rpc("bootstrap_player");
  if (error) throw error;
  return data;
}

export async function updateUsername(username: string): Promise<Profile> {
  const { data, error } = await getSupabase().rpc("set_username", { p_username: username });
  if (error) throw error;
  return data;
}

export async function countOwnedCards(): Promise<number> {
  const { count, error } = await getSupabase()
    .from("card_instances")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

/** The signed-in player's cards (RLS only returns their own), rarest first. */
export async function fetchOwnedCards(): Promise<OwnedCard[]> {
  const { data, error } = await getSupabase()
    .from("card_instances")
    .select(
      "id, is_starter, acquired_at, definition:card_definitions!inner(code, name, faction, rarity:rarity_definitions!inner(name, rank, color))",
    );
  if (error) throw error;
  const cards: OwnedCard[] = data;
  return cards.sort(
    (a, b) =>
      b.definition.rarity.rank - a.definition.rarity.rank ||
      a.definition.name.localeCompare(b.definition.name, "it"),
  );
}
