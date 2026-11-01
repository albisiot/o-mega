import { getSupabase } from "@/lib/supabase/client";

export type AdminBonusCode = {
  id: string;
  code: string;
  coins: number;
  packs: number;
  card_names: string[];
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  is_active: boolean;
  note: string | null;
};

export type AdminBonusCodes = {
  codes: AdminBonusCode[];
  /** The cards a code can give. */
  cards: { code: string; name: string; rarity: string }[];
};

export type NewBonusCode = {
  code: string;
  coins: number;
  packs: number;
  cardCodes: string[];
  maxUses?: number;
  /** Last valid day (YYYY-MM-DD), up to midnight Europe/Rome. */
  expiresOn?: string;
  note?: string;
};

/** The server decides who is an admin; this only chooses whether to show the link. */
export async function fetchIsAdmin(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc("is_admin");
  if (error) throw error;
  return data;
}

export async function fetchAdminBonusCodes(): Promise<AdminBonusCodes> {
  const { data, error } = await getSupabase().rpc("admin_list_bonus_codes");
  if (error) throw error;
  return data as unknown as AdminBonusCodes;
}

export async function createBonusCode(code: NewBonusCode): Promise<AdminBonusCodes> {
  const { data, error } = await getSupabase().rpc("admin_create_bonus_code", {
    p_code: code.code,
    p_coins: code.coins,
    p_packs: code.packs,
    p_card_codes: code.cardCodes,
    p_max_uses: code.maxUses,
    p_expires_on: code.expiresOn,
    p_note: code.note,
  });
  if (error) throw error;
  return data as unknown as AdminBonusCodes;
}

export async function setBonusCodeActive(id: string, isActive: boolean): Promise<AdminBonusCodes> {
  const { data, error } = await getSupabase().rpc("admin_set_bonus_code_active", {
    p_id: id,
    p_is_active: isActive,
  });
  if (error) throw error;
  return data as unknown as AdminBonusCodes;
}

/** "Attivo", or why the code no longer works. */
export function bonusCodeState(code: AdminBonusCode, now: number): string {
  if (!code.is_active) return "Disattivato";
  if (code.expires_at && Date.parse(code.expires_at) <= now) return "Scaduto";
  if (code.max_uses !== null && code.uses >= code.max_uses) return "Esaurito";
  return "Attivo";
}
