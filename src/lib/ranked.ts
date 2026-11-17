// Classificata (SPEC §8.7): one Fama for every mode, its leagues, the Albo dei
// Reggenti and the monthly Mandato. The server computes every number; this file
// only names and shows them.

import { balance } from "@/config/balance";
import type { MatchFormat } from "@/lib/match";
import { getSupabase } from "@/lib/supabase/client";

export type RankedLeague = "recluta" | "vigilante" | "veterano" | "asso" | "leggenda" | "omega";

/** The leagues from the first, with their name and the colour of their badge. */
export const RANKED_LEAGUES: { key: RankedLeague; name: string; color: string }[] = [
  { key: "recluta", name: "Recluta", color: "#b9b5a8" },
  { key: "vigilante", name: "Vigilante", color: "#16c8ff" },
  { key: "veterano", name: "Veterano", color: "#3ddc84" },
  { key: "asso", name: "Asso", color: "#ff8a00" },
  { key: "leggenda", name: "Leggenda", color: "#ff2e6c" },
  { key: "omega", name: "O-MEGA", color: "#ffd60a" },
];

export function leagueInfo(league: RankedLeague) {
  return RANKED_LEAGUES.find((l) => l.key === league) ?? RANKED_LEAGUES[0];
}

/** The league of a Fama by the thresholds of balance.ts (the server sends its own). */
export function leagueOf(fama: number): RankedLeague {
  let league: RankedLeague = "recluta";
  for (const { key } of RANKED_LEAGUES) if (fama >= balance.ranked.leagues[key]) league = key;
  return league;
}

/** How far a Fama is from the start of its league (0) to the next one (1); 1 at the top. */
export function leagueProgress(fama: number, start: number, next: number | null): number {
  if (next === null || next <= start) return 1;
  return Math.min(1, Math.max(0, (fama - start) / (next - start)));
}

/** "+25 Fama", "−20 Fama", "Fama invariata". */
export function describeFamaChange(delta: number): string {
  if (delta === 0) return "Fama invariata";
  return `${delta > 0 ? "+" : "−"}${Math.abs(delta)} Fama`;
}

/** The boards of the Albo: every format together, or one (both Quadrante grids are one). */
export type RankedBoardFormat = "classic" | "boss" | "triple" | "quadrant";

/** `short`: on the Albo's filters, which fit one line of a phone. */
export const RANKED_BOARD_FORMATS: { key: RankedBoardFormat | null; label: string; short: string }[] = [
  { key: null, label: "Tutte", short: "Tutte" },
  { key: "classic", label: "Classica", short: "Classica" },
  { key: "boss", label: "Grande Minaccia", short: "Minaccia" },
  { key: "triple", label: "Allarme Triplo", short: "Triplo" },
  { key: "quadrant", label: "Quadrante", short: "Quadrante" },
];

export function boardFormatOf(format: MatchFormat): RankedBoardFormat {
  return format === "quadrant_shifting" ? "quadrant" : format;
}

/** The ranked side of a match as the server shows it to one player. */
export type RankedMatchInfo = {
  /** Both Fama when the match started. */
  fama: number;
  opponent_fama: number;
  /** What the match moved: null until it is over. */
  delta: number | null;
  league: RankedLeague;
  league_before: RankedLeague;
  league_start: number;
  next_league_at: number | null;
};

/** A league reached or left with a match: "Sei salito in Vigilante!" / "Sei sceso in Recluta". */
export function describeLeagueChange(info: RankedMatchInfo): string | null {
  if (info.league === info.league_before) return null;
  const up = RANKED_LEAGUES.findIndex((l) => l.key === info.league) > RANKED_LEAGUES.findIndex((l) => l.key === info.league_before);
  return up ? `Sei salito in ${leagueInfo(info.league).name}!` : `Sei sceso in ${leagueInfo(info.league).name}`;
}

export type RankedPrize = {
  season: string;
  label: string;
  place: number;
  league: RankedLeague;
  fama: number;
  coins: number;
  packs: number;
  title: string | null;
};

/** The player's Classificata: Fama and league now, the Mandato in course, all-time results. */
export type MyRanked = {
  season: string;
  season_label: string;
  season_ends_at: string;
  fama: number;
  league: RankedLeague;
  league_start: number;
  next_league_at: number | null;
  best_fama: number;
  wins: number;
  losses: number;
  draws: number;
  season_matches: number;
  min_matches: number;
  place: number | null;
  prizes: RankedPrize[];
};

export type RankedBoardEntry = {
  place: number;
  username: string;
  avatar_url: string | null;
  title: string | null;
  /** What the Albo sorts by: the Fama, or what one format gave in the Mandato. */
  value: number;
  fama: number;
  league: RankedLeague;
  matches: number;
  wins: number;
  losses: number;
  is_me: boolean;
};

export type RankedBoard = {
  season: string;
  label: string;
  ends_at: string;
  current: boolean;
  format: RankedBoardFormat | null;
  players: number;
  top: RankedBoardEntry[];
  me: RankedBoardEntry | null;
};

export type RankedHallEntry = { season: string; label: string; podium: RankedBoardEntry[] };

export async function fetchMyRanked(): Promise<MyRanked> {
  const { data, error } = await getSupabase().rpc("get_my_ranked");
  if (error) throw error;
  return data as unknown as MyRanked;
}

export async function fetchRankedBoard(format: RankedBoardFormat | null, season?: string): Promise<RankedBoard> {
  const { data, error } = await getSupabase().rpc("get_ranked_board", {
    ...(season ? { p_season: season } : {}),
    ...(format ? { p_format: format } : {}),
  });
  if (error) throw error;
  return data as unknown as RankedBoard;
}

export async function fetchRankedHall(): Promise<RankedHallEntry[]> {
  const { data, error } = await getSupabase().rpc("get_ranked_hall");
  if (error) throw error;
  return (data as unknown as RankedHallEntry[] | null) ?? [];
}

export async function claimRankedPrize(season: string): Promise<{ coins: number; opening_ids: string[]; coin_balance: number }> {
  const { data, error } = await getSupabase().rpc("claim_ranked_prize", { p_season: season });
  if (error) throw error;
  return data as unknown as { coins: number; opening_ids: string[]; coin_balance: number };
}

/** How a Mandato's prize reads: "1 pacchetto e 100 monete". */
export function describePrize(prize: { coins: number; packs: number }): string {
  const parts = [
    prize.packs > 0 ? (prize.packs === 1 ? "1 pacchetto" : `${prize.packs} pacchetti`) : null,
    prize.coins > 0 ? `${prize.coins} monete` : null,
  ].filter(Boolean);
  return parts.join(" e ");
}

/** The prizes of the leagues at the end of a Mandato, from the first. */
export function seasonPrizes(): { league: RankedLeague; name: string; text: string }[] {
  return RANKED_LEAGUES.map(({ key, name }) => {
    const prize = balance.ranked.season.rewards[key];
    const title = key === "omega" || key === "leggenda" ? " e un titolo" : "";
    return { league: key, name, text: `${describePrize(prize)}${title}` };
  });
}

/** The sentence every Classificata shows: the rules, and that the opponent may be the system's. */
export const RANKED_RULES =
  "Vinci e guadagni Fama, perdi e ne perdi un po': conta di più battere chi ne ha di più. Una sola Fama per tutte le modalità. Se nessuno è libero, dopo qualche secondo affronti un Reggente gestito dal sistema, del tuo livello. Nessuna carta in gioco.";
