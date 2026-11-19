import { remember, type PackOpening } from "@/lib/packs";
import { getSupabase } from "@/lib/supabase/client";

/**
 * Schegge, frames and effects (SPEC §4.8). A duplicate variant breaks into Schegge; Schegge buy
 * packs, variants not owned, and frames and effects, which the player applies to a character.
 * The server decides everything; this file names the looks the app draws and calls the server.
 */

export type CosmeticKind = "frame" | "effect";

export const FRAME_CODES = [
  "silver",
  "gold",
  "prism",
  "slab",
  "slab_black",
  "neon",
  "magma",
  "ice",
  "circuit",
  "comic",
  "baroque",
  "marble",
  "carbon",
  "void",
  "pixel",
] as const;
export type FrameCode = (typeof FRAME_CODES)[number];

export const EFFECT_CODES = [
  "holo",
  "flash",
  "sparkles",
  "glitter",
  "cracked",
  "snow",
  "rays",
  "halftone",
  "signature",
  "numbered",
] as const;
export type EffectCode = (typeof EFFECT_CODES)[number];

/** Names and one line on each look. The server's catalog has the same names; this one draws them. */
export const COSMETIC_INFO: Record<FrameCode | EffectCode, { name: string; note: string }> = {
  silver: { name: "Argento", note: "Cromo lucido intorno alla cornice della rarità." },
  gold: { name: "Oro", note: "Una luce gira intorno alla carta." },
  prism: { name: "Prisma", note: "Un arcobaleno che scorre e un alone viola." },
  slab: { name: "Gradata", note: "Teca trasparente con l'etichetta del voto." },
  slab_black: { name: "Gradata nera", note: "Teca fumé, etichetta nera e oro: il voto massimo." },
  neon: { name: "Neon", note: "Un tubo del colore della fazione, che ogni tanto sfarfalla." },
  magma: { name: "Magma", note: "Roccia con la lava che scorre." },
  ice: { name: "Ghiaccio", note: "Cristallo azzurro con le venature." },
  circuit: { name: "Circuito", note: "Piste elettroniche, un impulso corre intorno." },
  comic: { name: "Fumetto", note: "Retino giallo e magenta, ombra piena." },
  baroque: { name: "Barocca", note: "Bronzo con angoli decorati e borchie." },
  marble: { name: "Marmo", note: "Marmo bianco con un filo d'oro." },
  carbon: { name: "Carbonio", note: "Fibra di carbonio con un filetto rosso." },
  void: { name: "Abisso", note: "Fumo viola che ruota nel buio." },
  pixel: { name: "Pixel", note: "Quadretti e angoli a gradino." },
  holo: { name: "Olografico", note: "Un arcobaleno che scorre sul disegno." },
  flash: { name: "Riflesso", note: "Una lama di luce passa ogni tanto." },
  sparkles: { name: "Scintille", note: "Stelline che si accendono una dopo l'altra." },
  glitter: { name: "Polvere di stelle", note: "Brillantini fitti che luccicano." },
  cracked: { name: "Ghiaccio incrinato", note: "Schegge di luce che cambiano colore." },
  snow: { name: "Neve", note: "Fiocchi che cadono sul disegno." },
  rays: { name: "Raggi", note: "Raggi di luce che ruotano dietro il personaggio." },
  halftone: { name: "Retino", note: "Puntini da fumetto stampato verso i bordi." },
  signature: { name: "Autografo", note: "La firma del personaggio in inchiostro d'oro." },
  numbered: { name: "Numerata", note: "Un timbro d'oro con il numero della copia." },
};

/** The frames drawn as a ring on the card's own frame; the others wrap the card. */
export const RING_FRAMES: readonly FrameCode[] = ["silver", "gold", "prism"];

export const isFrameCode = (code: string | null | undefined): code is FrameCode =>
  (FRAME_CODES as readonly string[]).includes(code ?? "");
export const isEffectCode = (code: string | null | undefined): code is EffectCode =>
  (EFFECT_CODES as readonly string[]).includes(code ?? "");

/** What a card shows: the frame and the effect its owner applied and left visible. */
export type CardCosmetics = { frame: FrameCode | null; effect: EffectCode | null; serial: number | null };

export type AppliedCosmetics = {
  definition_id: string;
  frame: string | null;
  frame_visible: boolean;
  effect: string | null;
  effect_visible: boolean;
  effect_serial: number | null;
};

export type ShardItem = "pack" | "cosmetic" | "frame" | "effect" | "variant";

export type CosmeticsState = {
  shard_balance: number;
  costs: { pack: number; cosmetic: number; kind: number; variant: number };
  /** Schegge a broken duplicate gives, by rarity code. */
  values: Record<string, number>;
  catalog: { code: string; kind: CosmeticKind; name: string; active: boolean }[];
  /** Frames and effects owned and not applied yet; serial: the lowest, the next one applied. */
  inventory: { code: string; count: number; serial: number }[];
  applied: AppliedCosmetics[];
  breakable: { variant_id: string; definition_id: string; copies: number; breakable: number }[];
  /** Variants the player does not own yet. */
  missing_variants: number;
};

/** The look a card shows, from what its owner applied: hidden or unknown looks are left out. */
export function shownCosmetics(applied: AppliedCosmetics | null | undefined): CardCosmetics | null {
  if (!applied) return null;
  const frame = applied.frame_visible && isFrameCode(applied.frame) ? applied.frame : null;
  const effect = applied.effect_visible && isEffectCode(applied.effect) ? applied.effect : null;
  if (!frame && !effect) return null;
  return { frame, effect, serial: effect === "numbered" ? applied.effect_serial : null };
}

/** The looks of every character, by definition id. */
export function cosmeticsByCharacter(state: CosmeticsState | null): Map<string, CardCosmetics> {
  const looks = new Map<string, CardCosmetics>();
  for (const applied of state?.applied ?? []) {
    const shown = shownCosmetics(applied);
    if (shown) looks.set(applied.definition_id, shown);
  }
  return looks;
}

/**
 * The opponent's looks a match state names (match_state_payload's `opponent_looks`): only for the
 * opposing characters already shown, by definition id, and only what the opponent left visible.
 */
export type OpponentLooks = Record<string, { frame: string | null; effect: string | null; serial: number | null }>;

/** The opponent's looks of a match state, by definition id: unknown frames and effects are left out. */
export function opponentCosmetics(looks: OpponentLooks | null | undefined): Map<string, CardCosmetics> {
  const shown = new Map<string, CardCosmetics>();
  for (const [definitionId, look] of Object.entries(looks ?? {})) {
    const frame = isFrameCode(look?.frame) ? look.frame : null;
    const effect = isEffectCode(look?.effect) ? look.effect : null;
    if (frame || effect) shown.set(definitionId, { frame, effect, serial: effect === "numbered" ? (look.serial ?? null) : null });
  }
  return shown;
}

export function appliedTo(state: CosmeticsState | null, definitionId: string): AppliedCosmetics | null {
  return state?.applied.find((entry) => entry.definition_id === definitionId) ?? null;
}

/** How many copies of a variant can be broken (one is always kept). */
export function breakableCopies(state: CosmeticsState | null, variantId: string): number {
  return state?.breakable.find((entry) => entry.variant_id === variantId)?.breakable ?? 0;
}

export type OwnedCosmetic = { code: FrameCode | EffectCode; kind: CosmeticKind; name: string; count: number; serial: number };

/** The frames or effects the player owns, in the catalog's order. */
export function ownedCosmetics(state: CosmeticsState | null, kind: CosmeticKind): OwnedCosmetic[] {
  if (!state) return [];
  const known = kind === "frame" ? isFrameCode : isEffectCode;
  return state.catalog.flatMap((entry) => {
    const owned = state.inventory.find((item) => item.code === entry.code);
    if (entry.kind !== kind || !owned || owned.count <= 0 || !known(entry.code)) return [];
    return [{ code: entry.code, kind, name: entry.name, count: owned.count, serial: owned.serial }];
  });
}

/** Name of a look: the server's, or the app's when the catalog has not arrived. */
export function cosmeticName(state: CosmeticsState | null, code: string): string {
  return state?.catalog.find((entry) => entry.code === code)?.name ?? COSMETIC_INFO[code as FrameCode]?.name ?? code;
}

export async function fetchCosmetics(): Promise<CosmeticsState> {
  const { data, error } = await getSupabase().rpc("get_cosmetics");
  if (error) throw error;
  return data as unknown as CosmeticsState;
}

export type BreakResult = { broken: number; shards: number; cosmetics: CosmeticsState };

export async function breakVariantDuplicates(variantId: string, count: number): Promise<BreakResult> {
  const { data, error } = await getSupabase().rpc("break_variant_duplicates", { p_variant_id: variantId, p_count: count });
  if (error) throw error;
  return data as unknown as BreakResult;
}

export type ShardPurchase = {
  cosmetics: CosmeticsState;
  /** A pack, or the variant bought, shown with the pack opening. */
  opening?: PackOpening;
  /** A frame or an effect. */
  item?: { code: string; kind: CosmeticKind; name: string; serial: number };
};

export async function buyWithShards(item: ShardItem): Promise<ShardPurchase> {
  const { data, error } = await getSupabase().rpc("buy_with_shards", { p_item: item });
  if (error) throw error;
  const purchase = data as unknown as ShardPurchase;
  if (purchase.opening) remember(purchase.opening);
  return purchase;
}

export async function applyCosmetic(definitionId: string, code: string): Promise<CosmeticsState> {
  const { data, error } = await getSupabase().rpc("apply_cosmetic", { p_definition_id: definitionId, p_code: code });
  if (error) throw error;
  return data as unknown as CosmeticsState;
}

export async function setCosmeticVisible(definitionId: string, kind: CosmeticKind, visible: boolean): Promise<CosmeticsState> {
  const { data, error } = await getSupabase().rpc("set_cosmetic_visible", {
    p_definition_id: definitionId,
    p_kind: kind,
    p_visible: visible,
  });
  if (error) throw error;
  return data as unknown as CosmeticsState;
}

export type ShardSettings = {
  rarities: { code: string; name: string; rank: number; color: string; value: number }[];
  costs: { pack_cost: number; random_cosmetic_cost: number; chosen_kind_cosmetic_cost: number; new_variant_cost: number };
};

export async function fetchShardSettings(): Promise<ShardSettings> {
  const { data, error } = await getSupabase().rpc("admin_get_shard_settings");
  if (error) throw error;
  return data as unknown as ShardSettings;
}

export async function saveShardSettings(values: Record<string, number>, costs: ShardSettings["costs"]): Promise<ShardSettings> {
  const { data, error } = await getSupabase().rpc("admin_save_shard_settings", { p_values: values, p_costs: costs });
  if (error) throw error;
  return data as unknown as ShardSettings;
}
