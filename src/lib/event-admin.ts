import type { EventPoints } from "@/lib/events";
import type { RandomVariantsRule } from "@/lib/random-variants";
import { getSupabase } from "@/lib/supabase/client";
import type { TraitCategory } from "@/lib/traits";

export type AdminEventTier = {
  tier: number;
  points: number;
  coins: number;
  packs: number;
  /** Schegge it gives (0: none; missing from older servers). */
  shards?: number;
  /** "P051" for the base drawing, "P051:neon" for that variant. */
  card_codes: string[];
  card_names: string[];
  /** Random variants it gives, as saved (style and rarity codes); null (or missing): none. */
  random_variants?: RandomVariantsRule | null;
  /** Players who reached it. */
  reached: number;
};

export type AdminEvent = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  points: EventPoints;
  daily_cap: number | null;
  /** Quadrante: the first side with this many seals on the grid wins; null without a target. */
  quadrant_seal_target?: number | null;
  /** "Caccia alle varianti": the variant chance of the standard packs during the event; null: unchanged. */
  variant_chance_percent?: number | null;
  /** Points for each variant in the team, in % of the match's points; null: none. */
  variant_bonus_percent?: number | null;
  /** Admitted traits; empty: every character. */
  traits?: string[];
  /** Admitted rarity codes and factions; empty: every one. Absent from older servers. */
  rarities?: string[];
  factions?: string[];
  is_active: boolean;
  /** Players with at least one point. */
  players: number;
  tiers: AdminEventTier[];
};

export type AdminEvents = {
  now: string;
  trait_catalog?: TraitCategory[];
  /** Every rarity, lowest first (absent from older servers). */
  rarities?: { code: string; name: string; rank: number; color: string }[];
  /** Fewest characters a rule may admit (an Emergenza squad). */
  min_admitted_characters?: number;
  /** The seal targets an event may set for Quadrante, and the one the form suggests. */
  quadrant_seal_target?: { min: number; max: number; suggested: number };
  /** The usual variant chance of the standard packs, which an event can raise. */
  base_variant_chance_percent?: number;
  events: AdminEvent[];
  /** The cards a target can give, each with the artwork variants it can come with, its traits, rarity and faction. */
  cards: {
    code: string;
    name: string;
    rarity: string;
    rarity_code?: string;
    faction?: string;
    traits?: string[];
    variants: { style: string; name: string }[];
  }[];
};

export type EventDraft = {
  /** Set when changing an existing event. */
  id?: string;
  title: string;
  description: string;
  /** datetime-local values, read by the server as Rome time. */
  startsAt: string;
  endsAt: string;
  points: EventPoints;
  /** Null: no daily limit. */
  dailyCap: number | null;
  /** Quadrante: the first side with this many seals wins. Null: no target. */
  sealTarget: number | null;
  /** "Caccia alle varianti": the variant chance of the standard packs during the event. Null: unchanged. */
  variantChance: number | null;
  /** Points for each variant in the team, in %. Null: none. */
  variantBonus: number | null;
  /** Admitted traits, rarity codes and factions; each empty: every character. All must hold. */
  traits: string[];
  rarities: string[];
  factions: string[];
  tiers: {
    points: number;
    coins: number;
    packs: number;
    cards: string[];
    random_variants?: RandomVariantsRule;
    /** Schegge, 0 to MAX_SHARD_REWARD; sent only when used. */
    shards?: number;
  }[];
};

export async function fetchAdminEvents(): Promise<AdminEvents> {
  const { data, error } = await getSupabase().rpc("admin_list_events");
  if (error) throw error;
  return data as unknown as AdminEvents;
}

export async function saveEvent(draft: EventDraft): Promise<AdminEvents> {
  const { data, error } = await getSupabase().rpc("admin_save_event", {
    p_id: draft.id,
    p_title: draft.title,
    p_description: draft.description,
    p_starts_at: draft.startsAt,
    p_ends_at: draft.endsAt,
    p_points: draft.points,
    p_daily_cap: draft.dailyCap ?? undefined,
    p_tiers: draft.tiers,
    p_traits: draft.traits,
    // Sent only when used, so the page keeps working against a server without them.
    ...(draft.rarities.length > 0 ? { p_rarities: draft.rarities } : {}),
    ...(draft.factions.length > 0 ? { p_factions: draft.factions } : {}),
    ...(draft.sealTarget !== null ? { p_quadrant_seal_target: draft.sealTarget } : {}),
    ...(draft.variantChance !== null ? { p_variant_chance_percent: draft.variantChance } : {}),
    ...(draft.variantBonus !== null ? { p_variant_bonus_percent: draft.variantBonus } : {}),
  });
  if (error) throw error;
  return data as unknown as AdminEvents;
}

export async function setEventActive(id: string, active: boolean): Promise<AdminEvents> {
  const { data, error } = await getSupabase().rpc("admin_set_event_active", { p_id: id, p_active: active });
  if (error) throw error;
  return data as unknown as AdminEvents;
}

export async function deleteEvent(id: string): Promise<AdminEvents> {
  const { data, error } = await getSupabase().rpc("admin_delete_event", { p_id: id });
  if (error) throw error;
  return data as unknown as AdminEvents;
}

/** Starting values of a new event's point table (SPEC §8.2). */
export const DEFAULT_EVENT_POINTS: EventPoints = {
  friendly: { win: 30, draw: 15, loss: 10 },
  conquest: { win: 40, draw: 20, loss: 15 },
  bot: { win: 10, draw: 5, loss: 3 },
  story: { win: 10, draw: 5, loss: 3 },
  emergency: { passed: 5 },
  coop: { win: 30, loss: 10, passed: 2 },
  raid: { win: 30, loss: 10, passed: 2 },
};

export type AdminEventState = "Programmato" | "In corso" | "Concluso" | "Disattivato";

export function adminEventState(event: Pick<AdminEvent, "is_active" | "starts_at" | "ends_at">, now: number): AdminEventState {
  if (!event.is_active) return "Disattivato";
  if (now < Date.parse(event.starts_at)) return "Programmato";
  if (now < Date.parse(event.ends_at)) return "In corso";
  return "Concluso";
}
