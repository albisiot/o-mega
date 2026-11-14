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

/**
 * Wears a character the player owns as avatar: its base drawing, or the variant `variantId`.
 * With no character, back to the account picture. The server checks the ownership.
 */
export async function setAvatar(definitionId: string | null, variantId: string | null = null): Promise<Profile> {
  const { data, error } = await getSupabase().rpc("set_avatar", {
    p_definition_id: definitionId as string,
    p_variant_id: variantId as string,
  });
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
