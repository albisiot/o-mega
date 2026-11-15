import { getSupabase } from "@/lib/supabase/client";

/** A place of the day's Emergenza leaderboard that wins something (SPEC §5.10). */
export type EmergencyPrizeTier = { from: number; to: number; coins: number; packs: number };

/** A prize won when a day ended, still to claim. */
export type EmergencyPrize = {
  id: string;
  /** The game day, as YYYY-MM-DD. */
  day: string;
  rank: number;
  passed: number;
  total_score: number;
  players: number;
  coins: number;
  packs: number;
};

export type EmergencyPrizeClaim = { coins: number; opening_ids: string[]; coin_balance: number };

/** Closes the days that are over on the server, then the player's prizes still to claim. */
export async function fetchEmergencyPrizes(): Promise<EmergencyPrize[]> {
  const { data, error } = await getSupabase().rpc("get_emergency_prizes");
  if (error) throw error;
  return data as unknown as EmergencyPrize[];
}

export async function claimEmergencyPrize(id: string): Promise<EmergencyPrizeClaim> {
  const { data, error } = await getSupabase().rpc("claim_emergency_prize", { p_prize_id: id });
  if (error) throw error;
  return data as unknown as EmergencyPrizeClaim;
}

/** "1 pacchetto e 50 monete", "100 monete", "2 pacchetti". */
export function prizeText({ coins, packs }: { coins: number; packs: number }): string {
  const parts: string[] = [];
  if (packs > 0) parts.push(packs === 1 ? "1 pacchetto" : `${packs} pacchetti`);
  if (coins > 0) parts.push(`${coins} monete`);
  return parts.join(" e ");
}

/** "1°", or "4°–10°" for a range of places. */
export function placeText({ from, to }: { from: number; to: number }): string {
  return from === to ? `${from}°` : `${from}°–${to}°`;
}

/** One line for the leaderboard: "1° 1 pacchetto e 50 monete · 2° 100 monete · 4°–10° 25 monete". */
export function prizeTableText(tiers: EmergencyPrizeTier[]): string {
  return tiers.map((tier) => `${placeText(tier)} ${prizeText(tier)}`).join(" · ");
}

/** "sabato 14 novembre", from a game day (YYYY-MM-DD), whatever the device's time zone. */
export function prizeDayText(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, date)),
  );
}
