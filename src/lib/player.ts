import { getSupabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

export type Profile = Tables<"profiles">;

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

/** Cards currently owned (RLS only counts the player's own; converted cards have no owner). */
export async function countOwnedCards(): Promise<number> {
  const { count, error } = await getSupabase()
    .from("card_instances")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}
