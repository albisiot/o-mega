import { forget, keepSeen, lastSeen } from "@/lib/last-seen";
import { getSupabase } from "@/lib/supabase/client";

/** Kinds of play that earn event points, in the order the event page lists them. */
export const EVENT_KINDS = [
  { key: "friendly", label: "Amichevole online" },
  { key: "conquest", label: "Conquista" },
  { key: "bot", label: "Contro bot" },
  { key: "story", label: "Storia" },
  { key: "emergency", label: "Emergenza" },
] as const;

export type EventKind = (typeof EVENT_KINDS)[number]["key"];
export type MatchOutcome = "win" | "draw" | "loss";

/** Points per kind and outcome; Emergenza pays per threat passed. */
export type EventPoints = Record<Exclude<EventKind, "emergency">, Record<MatchOutcome, number>> & {
  emergency: { passed: number };
};

export type EventRewardCard = {
  code: string;
  name: string;
  faction: string;
  flavor: string;
  art_url: string | null;
  variant?: { style: string; name: string };
  stats: Record<string, number>;
  rarity: { code: string; name: string; rank: number; color: string };
  power: { name: string; text: string } | null;
};

export type EventTier = {
  tier: number;
  points: number;
  coins: number;
  packs: number;
  cards: EventRewardCard[];
  reached: boolean;
  /** The cards and packs it paid, shown with the pack reveal. */
  opening_ids: string[];
  seen: boolean;
};

export type GameEvent = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  points: EventPoints;
  daily_cap: number | null;
  tiers: EventTier[];
  my_points: number;
  my_points_today: number;
};

export type EventStatus = {
  /** Server time, to read the countdowns with the server clock. */
  now: string;
  /** The running event, else the next one. */
  event: GameEvent | null;
  /** An event already over whose rewards the player has not opened yet. */
  ended_with_rewards: GameEvent | null;
};

export async function fetchEventStatus(): Promise<EventStatus> {
  const { data, error } = await getSupabase().rpc("get_event");
  if (error) throw error;
  return keepSeen("eventStatus", data as unknown as EventStatus);
}

export const seenEventStatus = () => lastSeen<EventStatus>("eventStatus");

export async function markEventRewardsSeen(eventId: string): Promise<void> {
  const { error } = await getSupabase().rpc("mark_event_rewards_seen", { p_event_id: eventId });
  if (error) throw error;
  forget("eventStatus");
}

export type MatchEventPoints = {
  points: number;
  title: string;
  total: number;
  /** Targets reached and not opened yet. */
  new_rewards: number;
};

/** What a match (null: today's Emergenza run) earned the player in the running event, or null. */
export async function fetchEventPointsFor(refId: string | null): Promise<MatchEventPoints | null> {
  const { data, error } = await getSupabase().rpc("get_event_points_for", {
    // The generated type has no null, but the function takes it: today's Emergenza run.
    p_ref_id: refId as string,
  });
  if (error) throw error;
  // New points: the banner's progress is out of date.
  if (data) forget("eventStatus");
  return data as unknown as MatchEventPoints | null;
}

export type EventPhase = "upcoming" | "running" | "ended";

export function eventPhase(event: Pick<GameEvent, "starts_at" | "ends_at">, now: number): EventPhase {
  if (now < Date.parse(event.starts_at)) return "upcoming";
  if (now < Date.parse(event.ends_at)) return "running";
  return "ended";
}

/** "2 g 4 h", "5 h 12 min", "12 min", "meno di un minuto". */
export function formatEventCountdown(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "meno di un minuto";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  if (days > 0) return `${days} g ${hours} h`;
  return hours > 0 ? `${hours} h ${rest} min` : `${rest} min`;
}

export type TierProgress = {
  /** The next target, or null once all are reached. */
  next: EventTier | null;
  /** Points of the target before the next one (0 for the first). */
  from: number;
  /** Share of the way from `from` to the next target, 0 to 1 (1 when all are reached). */
  fraction: number;
};

export function tierProgress(points: number, tiers: EventTier[]): TierProgress {
  const sorted = [...tiers].sort((a, b) => a.points - b.points);
  const index = sorted.findIndex((tier) => tier.points > points);
  if (index < 0) return { next: null, from: sorted.at(-1)?.points ?? 0, fraction: 1 };
  const from = index === 0 ? 0 : sorted[index - 1].points;
  const next = sorted[index];
  return { next, from, fraction: Math.min(1, Math.max(0, (points - from) / (next.points - from))) };
}

/** Openings of the targets reached and not opened yet, in order. */
export function unseenOpenings(event: GameEvent): string[] {
  return event.tiers.filter((tier) => tier.reached && !tier.seen).flatMap((tier) => tier.opening_ids);
}

/** "100 monete, 1 carta e 2 pacchetti" for a target. */
export function describeTierReward(tier: Pick<EventTier, "coins" | "packs"> & { cards: unknown[] }): string {
  const parts = [
    tier.coins > 0 && `${tier.coins} ${tier.coins === 1 ? "moneta" : "monete"}`,
    tier.cards.length > 0 && `${tier.cards.length} ${tier.cards.length === 1 ? "carta" : "carte"}`,
    tier.packs > 0 && `${tier.packs} ${tier.packs === 1 ? "pacchetto" : "pacchetti"}`,
  ].filter((part) => part !== false);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} e ${parts.at(-1)}` : (parts[0] ?? "");
}

const ROME = "Europe/Rome";
const romeDateTime = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ROME,
});

/** "sab 14 nov, 18:00", always in Rome time. */
export function formatRomeDateTime(iso: string): string {
  return romeDateTime.format(new Date(iso));
}

const romeParts = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: ROME,
});

/** The wall-clock time in Rome of an instant, as a datetime-local value: "2026-11-14T18:00". */
export function toRomeInput(instant: string | number): string {
  const parts = Object.fromEntries(romeParts.formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** A datetime-local value moved by whole hours, as wall-clock arithmetic (the server reads it as Rome time). */
export function addHoursToInput(value: string, hours: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const [, y, mo, d, h, mi] = match.map(Number);
  const moved = new Date(Date.UTC(y, mo - 1, d, h + hours, mi));
  return moved.toISOString().slice(0, 16);
}
