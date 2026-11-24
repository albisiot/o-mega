import { useEffect, useState } from "react";
import { keepSeen, lastSeen } from "@/lib/last-seen";
import type { MatchFormat } from "@/lib/match";
import { getSupabase } from "@/lib/supabase/client";

/**
 * When each game mode is open (EDITOR → Modalità di gioco): always on, from a date to a date
 * (Europe/Rome), or off, with a short label on its button. What this file works out is for the
 * buttons only: the server refuses every start in a mode that is not open (mode_unavailable).
 */
export type GameModeKey =
  | "classic"
  | "boss"
  | "triple"
  | "quadrant"
  | "quadrant_shifting"
  | "ranked"
  | "conquest"
  | "story"
  | "emergency"
  | "emergency_week"
  | "coop"
  | "raid"
  | "combat";

export type ModeState = "on" | "window" | "off";

export type ModeAvailability = {
  key: GameModeKey;
  state: ModeState;
  starts_at: string | null;
  ends_at: string | null;
  label: string | null;
  updated_at?: string;
};

/** The modes by key; a mode missing is always on (so is everything before the first answer). */
export type ModeAvailabilityMap = Partial<Record<GameModeKey, ModeAvailability>>;

export const MODE_LABEL_MAX = 16;
export const MODE_LABEL_PRESETS = ["Attiva", "Nuova", "Prossimamente"] as const;
export const MODE_UNAVAILABLE = "Questa modalità non è disponibile ora.";

/** The modes the EDITOR lists, in the order of Gioca. `parent`: a part of another mode. */
export const GAME_MODES: { key: GameModeKey; name: string; detail: string; parent?: GameModeKey }[] = [
  { key: "classic", name: "Classica", detail: "Bot, Amichevole e codici amico" },
  { key: "boss", name: "Grande Minaccia", detail: "Bot, Amichevole e codici amico" },
  { key: "triple", name: "Allarme Triplo", detail: "Bot, Amichevole e codici amico" },
  { key: "quadrant", name: "Quadrante", detail: "Tutte e due le griglie" },
  { key: "quadrant_shifting", name: "Griglia mobile", detail: "Del Quadrante: serve anche il Quadrante aperto", parent: "quadrant" },
  { key: "ranked", name: "Classificata", detail: "Nelle modalità aperte" },
  { key: "conquest", name: "Conquista", detail: "Con le regole della Classica" },
  { key: "story", name: "Storia", detail: "Le missioni" },
  { key: "emergency", name: "Emergenza", detail: "Quella del giorno e quelle a tema" },
  { key: "emergency_week", name: "Emergenza della settimana", detail: "Il tentativo della settimana" },
  { key: "coop", name: "Operazioni", detail: "Stanze e coda pubblica" },
  { key: "raid", name: "Caccia grossa", detail: "Stanze contro un Boss" },
  { key: "combat", name: "Scontro a squadre", detail: "5 contro 5 contro il computer" },
];

/** Where a mode is now: `before`/`during`/`after` its period, or always `on`/`off`. */
export type ModePhase = "on" | "off" | "before" | "during" | "after";

export type ModeStatus = {
  open: boolean;
  phase: ModePhase;
  /** What the button shows: the admin's label, else one of the page's (`auto`), or none. */
  label: string | null;
  auto: boolean;
};

const ROME = "Europe/Rome";
const romeDay = new Intl.DateTimeFormat("en-CA", { timeZone: ROME, year: "numeric", month: "2-digit", day: "2-digit" });
const romeDayMonth = new Intl.DateTimeFormat("it-IT", { timeZone: ROME, day: "numeric", month: "short" });
const romeTime = new Intl.DateTimeFormat("it-IT", { timeZone: ROME, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** Whether a mode is open at `now`, and its label. */
export function modeStatus(row: ModeAvailability | null | undefined, now: number): ModeStatus {
  if (!row) return { open: true, phase: "on", label: null, auto: false };
  const phase = modePhase(row, now);
  const open = phase === "on" || phase === "during";
  if (row.label) return { open, phase, label: row.label, auto: false };
  const auto = autoLabel(phase, row, now);
  return { open, phase, label: auto, auto: auto !== null };
}

export function modePhase(row: Pick<ModeAvailability, "state" | "starts_at" | "ends_at">, now: number): ModePhase {
  if (row.state === "on") return "on";
  if (row.state === "off" || !row.starts_at || !row.ends_at) return "off";
  if (now < Date.parse(row.starts_at)) return "before";
  return now < Date.parse(row.ends_at) ? "during" : "after";
}

/**
 * The label a closed mode shows when the admin set none: «Dal 3 dic» (or «Dalle 18:00» the same
 * day) before its period, «Finita» after it, «Non attiva» when off. An open mode shows none.
 */
function autoLabel(phase: ModePhase, row: Pick<ModeAvailability, "starts_at">, now: number): string | null {
  switch (phase) {
    case "before": {
      const start = new Date(row.starts_at as string);
      return romeDay.format(start) === romeDay.format(new Date(now))
        ? `Dalle ${romeTime.format(start)}`
        : `Dal ${romeDayMonth.format(start).replace(".", "")}`;
    }
    case "after":
      return "Finita";
    case "off":
      return "Non attiva";
    default:
      return null;
  }
}

/**
 * The modes a start needs, as the server checks them (public.mode_keys_for): the rules (the
 * moving grid also needs the Quadrante), plus the Classificata or the Conquista when that is the
 * stake. The most specific first: its label is the button's (see combinedStatus).
 */
export function startKeys(format: MatchFormat, stake: "ranked" | "conquest" | null = null): GameModeKey[] {
  const rules: GameModeKey[] = format === "quadrant_shifting" ? ["quadrant_shifting", "quadrant"] : [format];
  return stake ? [...rules, stake] : rules;
}

/**
 * A button that needs several modes: open when all are; its label is the one of the first
 * closed mode, else the first mode's own (a «Nuova» on an open mode).
 */
export function combinedStatus(modes: ModeAvailabilityMap | null, keys: readonly GameModeKey[], now: number): ModeStatus {
  const statuses = keys.map((key) => modeStatus(modes?.[key], now));
  const closed = statuses.find((status) => !status.open);
  if (!closed) return statuses[0] ?? modeStatus(null, now);
  // A closed mode's own label (even «Nuova») stays; else the reason it is closed.
  const own = statuses[0];
  return !own.open && !own.auto && own.label ? own : closed;
}

/** One mode's status from what the page loaded (null: not known yet, so open). */
export function statusOf(modes: ModeAvailabilityMap | null, key: GameModeKey, now: number): ModeStatus {
  return modeStatus(modes?.[key], now);
}

export function toModeMap(rows: readonly ModeAvailability[]): ModeAvailabilityMap {
  return Object.fromEntries(rows.map((row) => [row.key, row]));
}

const SEEN_KEY = "mode-availability";

/**
 * Every mode's state, readable by anyone. A failure (an older server without the table) leaves
 * every mode open: the server still checks each start.
 */
export async function fetchModeAvailability(): Promise<ModeAvailabilityMap> {
  const { data, error } = await getSupabase().from("mode_availability").select("key, state, starts_at, ends_at, label");
  if (error) throw error;
  return keepSeen(SEEN_KEY, toModeMap((data ?? []) as ModeAvailability[]));
}

export const seenModeAvailability = () => lastSeen<ModeAvailabilityMap>(SEEN_KEY);

/** The modes for a page: what was seen last at once, then the fresh answer; null until known. */
export function useModeAvailability(enabled = true): ModeAvailabilityMap | null {
  const [modes, setModes] = useState<ModeAvailabilityMap | null>(seenModeAvailability);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetchModeAvailability()
      .then((next) => {
        if (!cancelled) setModes(next);
      })
      .catch((cause: unknown) => console.error("Mode availability failed", cause));
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return modes;
}

// ---------------------------------------------------------------------------
// EDITOR

export type AdminModes = { modes: ModeAvailability[]; server_now: string };

export type ModeDraft = {
  key: GameModeKey;
  state: ModeState;
  /** datetime-local values, read by the server as Rome time; used for `window`, kept otherwise. */
  startsAt: string;
  endsAt: string;
  label: string;
};

export async function fetchAdminModes(): Promise<AdminModes> {
  const { data, error } = await getSupabase().rpc("mode_availability_payload");
  if (error) throw error;
  return data as unknown as AdminModes;
}

export async function saveModeAvailability(draft: ModeDraft): Promise<AdminModes> {
  const dated = draft.startsAt !== "" && draft.endsAt !== "";
  const { data, error } = await getSupabase().rpc("admin_save_mode_availability", {
    p_key: draft.key,
    p_state: draft.state,
    ...(dated ? { p_starts_at: draft.startsAt, p_ends_at: draft.endsAt } : {}),
    p_label: draft.label.trim(),
  });
  if (error) throw error;
  const saved = data as unknown as AdminModes;
  keepSeen(SEEN_KEY, toModeMap(saved.modes));
  return saved;
}

/** What is wrong with a draft before sending it, in Italian; null when it can be saved. */
export function modeDraftProblem(draft: ModeDraft): string | null {
  if (draft.label.trim().length > MODE_LABEL_MAX) return `L'etichetta ha al massimo ${MODE_LABEL_MAX} caratteri.`;
  if (draft.state !== "window") return null;
  if (!draft.startsAt || !draft.endsAt) return "Metti l'inizio e la fine.";
  // Both are Rome wall-clock times in the same format: their order is the text order.
  if (draft.endsAt <= draft.startsAt) return "La fine va dopo l'inizio.";
  return null;
}

/** The draft as a row, to preview the button with the clock of the page. */
export function draftAsRow(draft: ModeDraft, toInstant: (value: string) => string | null): ModeAvailability {
  return {
    key: draft.key,
    state: draft.state,
    starts_at: draft.startsAt ? toInstant(draft.startsAt) : null,
    ends_at: draft.endsAt ? toInstant(draft.endsAt) : null,
    label: draft.label.trim() || null,
  };
}

/**
 * A Rome wall-clock datetime-local value ("2026-12-03T18:00") as an instant, for the preview:
 * the offset is the one Rome has at that moment (+01:00 or +02:00).
 */
export function romeInputToInstant(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  // Rome's offset near that moment, then once more in case the guess crossed a clock change.
  let instant = asUtc - romeOffset(asUtc);
  instant = asUtc - romeOffset(instant);
  return new Date(instant).toISOString();
}

const romeParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: ROME,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Milliseconds Rome is ahead of UTC at an instant. */
function romeOffset(instant: number): number {
  const parts = Object.fromEntries(romeParts.formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
  const wall = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return wall - Math.floor(instant / 60_000) * 60_000;
}
