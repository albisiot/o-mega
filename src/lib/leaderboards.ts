// Classifiche (SPEC §8.6). The server ranks; this only fetches and words the numbers.

import { getSupabase } from "@/lib/supabase/client";

export type LeaderboardBoard = "general" | "emergency" | "classic" | "boss" | "triple" | "quadrant" | "conquest" | "story";
export type LeaderboardPeriod = "day" | "week" | "all";

export type LeaderboardEntry = {
  rank: number;
  username: string;
  avatar_url: string | null;
  /** The title the player shows (Imprese or a weekly title), or null. */
  title: string | null;
  /** What the board ranks by: points, threats passed, experience, missions. */
  value: number;
  /** The second key, only on the Emergenza of the day (the run's score); 0 elsewhere. */
  value2: number;
  /** Board numbers: wins and played (matches), runs and perfect (Emergenza), level (Generale). */
  detail: Record<string, number>;
  is_me: boolean;
};

export type Leaderboard = {
  board: LeaderboardBoard;
  period: LeaderboardPeriod;
  /** First day of the period (YYYY-MM-DD), null for all time. */
  from: string | null;
  players: number;
  min_matches_for_rate: number;
  top: LeaderboardEntry[];
  me: LeaderboardEntry | null;
};

export type LeaderboardPlace = {
  board: LeaderboardBoard;
  period: LeaderboardPeriod;
  rank: number;
  players: number;
  value: number;
};

/** A title of the Classifiche: weekly (until expires_at), or of a Mandato (board "ranked", no end). */
export type LeaderboardTitle = {
  id: string;
  board: LeaderboardBoard | "ranked";
  title: string;
  week: string | null;
  expires_at: string | null;
};

/** The boards in the order of the tabs, with the periods each one has. */
export const BOARDS: { key: LeaderboardBoard; label: string; periods: LeaderboardPeriod[]; rule: string }[] = [
  {
    key: "general",
    label: "Generale",
    periods: ["day", "week", "all"],
    rule: "Oggi e in settimana l'esperienza guadagnata con partite ed Emergenza; di sempre il livello.",
  },
  {
    key: "emergency",
    label: "Emergenza",
    periods: ["day", "week", "all"],
    rule: "Minacce superate: oggi nel tentativo del giorno, poi sommate. Conta il tentativo finito.",
  },
  { key: "classic", label: "Classica", periods: ["week", "all"], rule: "" },
  { key: "boss", label: "Grande Minaccia", periods: ["week", "all"], rule: "" },
  { key: "triple", label: "Allarme Triplo", periods: ["week", "all"], rule: "" },
  { key: "quadrant", label: "Quadrante", periods: ["week", "all"], rule: "" },
  { key: "conquest", label: "Conquista", periods: ["week", "all"], rule: "" },
  { key: "story", label: "Storia", periods: ["all"], rule: "Missioni completate; a parità, chi ci è arrivato prima." },
];

export const PERIOD_LABELS: Record<LeaderboardPeriod, string> = { day: "Oggi", week: "Settimana", all: "Sempre" };

/** Boards ranked by leaderboard points, one per match mode. */
export function isMatchBoard(board: LeaderboardBoard): boolean {
  return board === "classic" || board === "boss" || board === "triple" || board === "quadrant" || board === "conquest";
}

export function boardInfo(board: LeaderboardBoard) {
  return BOARDS.find((entry) => entry.key === board) ?? BOARDS[0];
}

/** A board from the address (?scheda=…); an unknown one is the Generale. */
export function parseBoard(value: string | null): LeaderboardBoard {
  return BOARDS.some((entry) => entry.key === value) ? (value as LeaderboardBoard) : "general";
}

/** The period a board opens on: the Emergenza on today's challenge, the others on the week. */
export function defaultPeriod(board: LeaderboardBoard): LeaderboardPeriod {
  if (board === "emergency") return "day";
  const { periods } = boardInfo(board);
  return periods.includes("week") ? "week" : periods[0];
}

/** A period the board has: the one asked, or its default. */
export function periodFor(board: LeaderboardBoard, period: LeaderboardPeriod | null): LeaderboardPeriod {
  return period && boardInfo(board).periods.includes(period) ? period : defaultPeriod(board);
}

const numberFormat = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });

/** 12,5 · 1.200 */
export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** How the match boards count, in a line, from balance values the server also holds. */
export function pointsRule(points: { person: number; superPro: number; hard: number; medium: number; easy: number }): string {
  return (
    `Vittoria contro una persona ${points.person} punti; contro un bot Super Pro ${points.superPro}, ` +
    `Difficile ${points.hard}, Medio ${points.medium}, Facile ${points.easy}. Pareggio metà, sconfitta e abbandono 0.`
  );
}

/** The numbers on a row: the big one, its unit, and a line under them (or null). */
export function entryNumbers(
  board: LeaderboardBoard,
  period: LeaderboardPeriod,
  entry: Pick<LeaderboardEntry, "value" | "value2" | "detail">,
  minMatchesForRate: number,
): { value: string; unit: string; note: string | null } {
  const detail = entry.detail ?? {};
  if (isMatchBoard(board)) {
    const wins = detail.wins ?? 0;
    const played = detail.played ?? 0;
    const rate = played >= minMatchesForRate && played > 0 ? ` · ${Math.round((wins / played) * 100)}%` : "";
    return { value: formatNumber(entry.value), unit: "pt", note: `${wins} ${wins === 1 ? "vittoria" : "vittorie"}${rate}` };
  }
  if (board === "emergency") {
    if (period === "day") return { value: formatNumber(entry.value), unit: "superate", note: `${formatNumber(entry.value2)} pt` };
    const runs = detail.runs ?? 0;
    const perfect = detail.perfect ?? 0;
    const note =
      perfect > 0
        ? `${perfect} ${perfect === 1 ? "perfetta" : "perfette"}`
        : `${runs} ${runs === 1 ? "tentativo" : "tentativi"}`;
    return { value: formatNumber(entry.value), unit: "superate", note };
  }
  if (board === "general") {
    const level = detail.level ?? 1;
    if (period === "all") return { value: `Liv. ${level}`, unit: "", note: `${formatNumber(entry.value)} XP` };
    return { value: formatNumber(entry.value), unit: "XP", note: `livello ${level}` };
  }
  return { value: formatNumber(entry.value), unit: entry.value === 1 ? "missione" : "missioni", note: null };
}

/** "1 giocatore" / "7 giocatori", with the period. */
export function playersLine(players: number, period: LeaderboardPeriod): string {
  const who = players === 1 ? "1 giocatore" : `${players} giocatori`;
  return period === "day" ? `${who} oggi` : period === "week" ? `${who} questa settimana` : `${who} in classifica`;
}

/** What the list says when nobody is on it yet. */
export function emptyLine(board: LeaderboardBoard, period: LeaderboardPeriod): string {
  if (board === "emergency" && period === "day") return "Nessuno ha ancora finito l'Emergenza di oggi: puoi essere il primo.";
  if (period === "day") return "Ancora nessuno oggi: puoi essere il primo.";
  if (period === "week") return "Ancora nessuno questa settimana: puoi essere il primo.";
  return "Ancora nessuno: puoi essere il primo.";
}

/**
 * The place to boast about on the home: the best one of this week (then of all time),
 * best rank first, then the bigger board, then the tab order.
 */
export function bestPlace(places: LeaderboardPlace[]): LeaderboardPlace | null {
  const order = (place: LeaderboardPlace) => BOARDS.findIndex((entry) => entry.key === place.board);
  const pick = (period: LeaderboardPeriod) =>
    places
      .filter((place) => place.period === period)
      .sort((a, b) => a.rank - b.rank || b.players - a.players || order(a) - order(b))[0] ?? null;
  return pick("week") ?? pick("all");
}

/** "Sei 3° su 7 questa settimana in Allarme Triplo". */
export function describePlace(place: LeaderboardPlace): string {
  const when = place.period === "day" ? "oggi" : place.period === "week" ? "questa settimana" : "di sempre";
  const board = boardInfo(place.board).label;
  const where = place.board === "general" ? "nella Generale" : `in ${board}`;
  return `Sei ${place.rank}° su ${place.players} ${when} ${where}`;
}

/** Where a board opens: the page with its tab (and period). */
export function leaderboardHref(board: LeaderboardBoard, period?: LeaderboardPeriod): string {
  return `/classifiche/?scheda=${board}${period ? `&periodo=${period}` : ""}`;
}

export async function fetchLeaderboard(board: LeaderboardBoard, period: LeaderboardPeriod): Promise<Leaderboard> {
  const { data, error } = await getSupabase().rpc("get_leaderboard", { p_board: board, p_period: period });
  if (error) throw error;
  return data as unknown as Leaderboard;
}

export async function fetchMyLeaderboardPlaces(): Promise<LeaderboardPlace[]> {
  const { data, error } = await getSupabase().rpc("get_my_leaderboard_places");
  if (error) throw error;
  return (data as unknown as LeaderboardPlace[] | null) ?? [];
}

/** The weekly titles the player holds now. */
export async function fetchLeaderboardTitles(): Promise<LeaderboardTitle[]> {
  const { data, error } = await getSupabase().rpc("get_leaderboard_titles");
  if (error) throw error;
  return (data as unknown as LeaderboardTitle[] | null) ?? [];
}
