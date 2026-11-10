import type { EventPoints } from "@/lib/events";
import { getSupabase } from "@/lib/supabase/client";
import type { TraitCategory } from "@/lib/traits";

export type AdminEventTier = {
  tier: number;
  points: number;
  coins: number;
  packs: number;
  /** "P051" for the base drawing, "P051:neon" for that variant. */
  card_codes: string[];
  card_names: string[];
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
  /** Admitted traits; empty: every character. */
  traits?: string[];
  is_active: boolean;
  /** Players with at least one point. */
  players: number;
  tiers: AdminEventTier[];
};

export type AdminEvents = {
  now: string;
  trait_catalog?: TraitCategory[];
  /** Fewest characters a rule may admit (an Emergenza squad). */
  min_admitted_characters?: number;
  events: AdminEvent[];
  /** The cards a target can give, each with the artwork variants it can come with, and its traits. */
  cards: { code: string; name: string; rarity: string; traits?: string[]; variants: { style: string; name: string }[] }[];
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
  /** Admitted traits; empty: every character. */
  traits: string[];
  tiers: { points: number; coins: number; packs: number; cards: string[] }[];
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
};

export type AdminEventState = "Programmato" | "In corso" | "Concluso" | "Disattivato";

export function adminEventState(event: Pick<AdminEvent, "is_active" | "starts_at" | "ends_at">, now: number): AdminEventState {
  if (!event.is_active) return "Disattivato";
  if (now < Date.parse(event.starts_at)) return "Programmato";
  if (now < Date.parse(event.ends_at)) return "In corso";
  return "Concluso";
}
