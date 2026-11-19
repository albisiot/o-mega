// End notices (SPEC §11.7): when an event, a Sfida a tema, the Emergenza della settimana or a
// Mandato of the Classificata ends, each player who took part is told once, full screen, with
// their result and the final leaderboard when there is one they may see. The server decides
// what to show (get_end_notices) and remembers what was shown (mark_end_notice_seen); this
// only fetches it and words it. Everything below the two fetches is pure.

import { getSupabase } from "@/lib/supabase/client";

export const END_NOTICE_KINDS = ["event", "challenge", "emergency_week", "ranked_season"] as const;
export type EndNoticeKind = (typeof END_NOTICE_KINDS)[number];

/** A row of a final leaderboard. value: what the board ranks by; value2: the second number, or null. */
export type EndBoardEntry = {
  rank: number;
  username: string;
  avatar_url: string | null;
  value: number;
  value2: number | null;
  is_me: boolean;
};

export type EndBoard = {
  players: number;
  /** The first players (end_notices.board_size). */
  top: EndBoardEntry[];
  /** The player's own row, also when below the list; null when they are not ranked. */
  me: EndBoardEntry | null;
};

type EndNoticeBase = {
  /** "<kind>:<ref>", unique. */
  id: string;
  /** The event or challenge id, the week's Monday (YYYY-MM-DD), the Mandato (YYYY-MM). */
  ref: string;
  title: string;
  /** A Sfida a tema's colour (#rrggbb), else null. */
  color: string | null;
  starts_at: string;
  ends_at: string;
  /** The player's final place; null when they had none (or may not see it). */
  rank: number | null;
  players: number | null;
  /** The final leaderboard; null when there is none, or the player may not see it. */
  board: EndBoard | null;
  /** There is a leaderboard, but not for this player (an event's, for who completed it). */
  board_locked: boolean;
};

export type EventEndResult = { points: number; steps: number; tiers: number };
export type ChallengeEndResult = {
  /** The challenge's mode: classic, boss, triple, quadrant, quadrant_shifting, emergency. */
  format: string;
  /** Wins; in an Emergenza, threats passed. */
  wins: number;
  played: number;
  /** In an Emergenza, the run's score. */
  score: number;
  /** In an Emergenza, whether the run finished; null in the other modes. */
  finished: boolean | null;
  /** In an Emergenza, its threats (8 or 10). */
  threats: number | null;
};
export type EmergencyWeekEndResult = {
  passed: number;
  score: number;
  finished: boolean;
  threats: number;
  prize_coins: number;
  prize_packs: number;
  /** Missing from older servers. */
  prize_shards?: number;
  prize_claimed: boolean;
};
export type RankedSeasonEndResult = {
  fama: number;
  league: string;
  league_name: string;
  matches: number;
  wins: number;
  prize_coins: number;
  prize_packs: number;
  prize_claimed: boolean;
  title: string | null;
};

export type EndNotice =
  | (EndNoticeBase & { kind: "event"; result: EventEndResult })
  | (EndNoticeBase & { kind: "challenge"; result: ChallengeEndResult })
  | (EndNoticeBase & { kind: "emergency_week"; result: EmergencyWeekEndResult })
  | (EndNoticeBase & { kind: "ranked_season"; result: RankedSeasonEndResult });

/** The caller's notices still to show, the oldest end first. */
export async function fetchEndNotices(): Promise<EndNotice[]> {
  const { data, error } = await getSupabase().rpc("get_end_notices");
  if (error) throw error;
  return parseEndNotices(data);
}

/** The notice has been shown: the server does not send it again, to any device. */
export async function markEndNoticeSeen(notice: Pick<EndNotice, "kind" | "ref">): Promise<void> {
  const { error } = await getSupabase().rpc("mark_end_notice_seen", { p_kind: notice.kind, p_ref: notice.ref });
  if (error) throw error;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The server's list, keeping only the kinds this app knows (a newer server may send more). */
export function parseEndNotices(data: unknown): EndNotice[] {
  if (!Array.isArray(data)) return [];
  return data.filter(
    (item): item is EndNotice =>
      isObject(item) &&
      typeof item.id === "string" &&
      typeof item.ref === "string" &&
      (END_NOTICE_KINDS as readonly unknown[]).includes(item.kind) &&
      isObject(item.result),
  );
}

/**
 * Adds the notices not in the line yet, keeping the oldest end first. A notice already
 * shown (`done`) does not come back while the app is open, even if the server is late.
 */
export function enqueueEndNotices(queue: EndNotice[], incoming: EndNotice[], done: readonly string[]): EndNotice[] {
  const known = new Set([...queue.map((notice) => notice.id), ...done]);
  const fresh = incoming.filter((notice) => !known.has(notice.id));
  if (fresh.length === 0) return queue;
  return [...queue, ...fresh].sort(
    (a, b) => Date.parse(a.ends_at) - Date.parse(b.ends_at) || a.id.localeCompare(b.id),
  );
}

// ---------------------------------------------------------------------------
// Wording
// ---------------------------------------------------------------------------

const ROME = "Europe/Rome";
const dayOfMonth = new Intl.DateTimeFormat("it-IT", { day: "numeric", timeZone: ROME });
const monthName = new Intl.DateTimeFormat("it-IT", { month: "long", timeZone: ROME });
const yearOf = new Intl.DateTimeFormat("it-IT", { year: "numeric", timeZone: ROME });

/**
 * "dal 12 al 19 novembre", "dal 28 ottobre al 3 novembre", "il 12 novembre", in Italian time.
 * The end is the moment it closed, so an end at midnight counts as the day before.
 */
export function periodText(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(Date.parse(endsAt) - 1);
  const day = (date: Date) => dayOfMonth.format(date);
  const month = (date: Date) => monthName.format(date);
  const sameMonth = month(start) === month(end) && yearOf.format(start) === yearOf.format(end);
  if (sameMonth && day(start) === day(end)) return `il ${day(end)} ${month(end)}`;
  return sameMonth ? `dal ${day(start)} al ${day(end)} ${month(end)}` : `dal ${day(start)} ${month(start)} al ${day(end)} ${month(end)}`;
}

/** The chip on top: what ended. */
export function endNoticeEyebrow(notice: EndNotice): string {
  switch (notice.kind) {
    case "event":
      return "Evento concluso";
    case "challenge":
      return "Sfida a tema conclusa";
    case "emergency_week":
      return "Emergenza della settimana conclusa";
    case "ranked_season":
      return "Classificata · Mandato concluso";
  }
}

/** Its name and when it ran: the title, then the days (a Mandato's name says the month). */
export function endNoticeName(notice: EndNotice): { name: string; period: string | null } {
  switch (notice.kind) {
    case "emergency_week":
      return { name: `Settimana ${periodText(notice.starts_at, notice.ends_at)}`, period: null };
    case "ranked_season":
      return { name: notice.title, period: null };
    default:
      return { name: notice.title, period: periodText(notice.starts_at, notice.ends_at) };
  }
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** The big line: the place, or what the player did when they had none. */
export function endNoticeHeadline(notice: EndNotice): string {
  if (notice.rank !== null) return `${notice.rank}° posto!`;
  switch (notice.kind) {
    case "event":
      return plural(notice.result.points, "punto", "punti");
    case "challenge":
      return notice.result.format === "emergency"
        ? `${notice.result.wins}/${notice.result.threats ?? 0}`
        : plural(notice.result.wins, "vittoria", "vittorie");
    case "emergency_week":
      return `${notice.result.passed}/${notice.result.threats}`;
    case "ranked_season":
      return notice.result.league_name;
  }
}

/** The result in one line, with how many took part when the player has a place. */
export function endNoticeSummary(notice: EndNotice): string {
  const parts: string[] = [];
  switch (notice.kind) {
    case "event": {
      const { points, steps, tiers } = notice.result;
      parts.push(plural(points, "punto evento", "punti evento"));
      if (tiers > 0) parts.push(steps >= tiers ? "tutti i traguardi" : `${steps}/${tiers} ${tiers === 1 ? "traguardo" : "traguardi"}`);
      break;
    }
    case "challenge": {
      const { format, wins, played, score, threats } = notice.result;
      if (format === "emergency") {
        parts.push(`${plural(wins, "Minaccia superata", "Minacce superate")} su ${threats ?? 0}`);
        parts.push(plural(score, "punto", "punti"));
      } else {
        parts.push(`${plural(wins, "vittoria", "vittorie")} su ${plural(played, "partita", "partite")}`);
      }
      break;
    }
    case "emergency_week": {
      const { passed, score } = notice.result;
      parts.push(plural(passed, "Minaccia superata", "Minacce superate"));
      parts.push(plural(score, "punto", "punti"));
      break;
    }
    case "ranked_season": {
      const { league_name, fama, matches } = notice.result;
      parts.push(league_name, `${fama} Fama`, plural(matches, "classificata", "classificate"));
      break;
    }
  }
  if (notice.rank !== null && notice.players !== null) parts.push(plural(notice.players, "giocatore", "giocatori"));
  return parts.join(" · ");
}

/** "1 pacchetto e 50 monete", "100 monete", "2 pacchetti", "1 pacchetto, 3 Schegge e 50 monete". */
function prizeText(coins: number, packs: number, shards = 0): string {
  const parts: string[] = [];
  if (packs > 0) parts.push(plural(packs, "pacchetto", "pacchetti"));
  if (shards > 0) parts.push(plural(shards, "Scheggia", "Schegge"));
  if (coins > 0) parts.push(`${coins} monete`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} e ${parts.at(-1)}` : (parts[0] ?? "");
}

/** What else the player should know: why there is no place, the prize, the title. */
export function endNoticeNotes(notice: EndNotice): string[] {
  const notes: string[] = [];
  switch (notice.kind) {
    case "event":
      if (notice.board_locked) notes.push("La classifica finale era per chi completava l'evento.");
      break;
    case "challenge":
      if (notice.result.finished === false) {
        notes.push(notice.board ? "Il tentativo non è finito: non è entrato in classifica." : "Il tentativo non è finito.");
      }
      break;
    case "emergency_week": {
      const { finished, prize_coins, prize_packs, prize_shards = 0, prize_claimed } = notice.result;
      if (!finished) notes.push("Il tentativo non è finito in tempo: non è entrato in classifica.");
      if (prize_coins > 0 || prize_packs > 0 || prize_shards > 0) {
        notes.push(`Premio: ${prizeText(prize_coins, prize_packs, prize_shards)}${prize_claimed ? " (riscosso)" : ""}`);
      }
      break;
    }
    case "ranked_season": {
      const { prize_coins, prize_packs, prize_claimed, title } = notice.result;
      if (prize_coins > 0 || prize_packs > 0) {
        notes.push(`Premio: ${prizeText(prize_coins, prize_packs)}${prize_claimed ? " (ritirato)" : ""}`);
      }
      if (title) notes.push(`Titolo: «${title}»`);
      break;
    }
  }
  return notes;
}

/** A prize still to take from another screen: the Mandato's, in the Classificata. */
export function endNoticePrizeLink(notice: EndNotice): { href: string; label: string } | null {
  if (notice.kind !== "ranked_season") return null;
  const { prize_coins, prize_packs, prize_claimed } = notice.result;
  if (prize_claimed || (prize_coins === 0 && prize_packs === 0)) return null;
  return { href: "/classificata/", label: "Ritira il premio" };
}

/** A leaderboard row's numbers: the value with its unit, and a detail under the name. */
export function endBoardEntryParts(notice: EndNotice, entry: EndBoardEntry): { value: string; unit: string; detail: string | null } {
  switch (notice.kind) {
    case "event": {
      const { tiers } = notice.result;
      const steps = entry.value2 ?? 0;
      const detail = tiers === 0 ? null : steps >= tiers ? "Completato" : `${steps}/${tiers} ${tiers === 1 ? "traguardo" : "traguardi"}`;
      return { value: String(entry.value), unit: entry.value === 1 ? "punto" : "punti", detail };
    }
    case "challenge":
      return notice.result.format === "emergency"
        ? { value: String(entry.value), unit: entry.value === 1 ? "superata" : "superate", detail: plural(entry.value2 ?? 0, "punto", "punti") }
        : { value: String(entry.value), unit: entry.value === 1 ? "vittoria" : "vittorie", detail: plural(entry.value2 ?? 0, "partita", "partite") };
    case "emergency_week":
      return { value: String(entry.value), unit: entry.value === 1 ? "superata" : "superate", detail: plural(entry.value2 ?? 0, "punto", "punti") };
    case "ranked_season":
      return { value: String(entry.value), unit: "Fama", detail: null };
  }
}

/** The player's own row when it is not in the list (shown apart, below it), else null. */
export function endBoardPlaceBelow(board: EndBoard): EndBoardEntry | null {
  const me = board.me;
  if (!me || board.top.some((entry) => entry.is_me)) return null;
  return me;
}
