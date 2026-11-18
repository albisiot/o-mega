import { getSupabase } from "@/lib/supabase/client";

/** A place of the day's Emergenza leaderboard that wins something (SPEC §5.10). */
export type EmergencyPrizeTier = { from: number; to: number; coins: number; packs: number };

/** A prize won when a day (or a week, SPEC §5.16) ended, still to claim. */
export type EmergencyPrize = {
  id: string;
  /** Of the daily leaderboard or of the weekly one. */
  kind: "day" | "week";
  /** The game day, as YYYY-MM-DD; for a weekly prize, the week's Monday. */
  day: string;
  rank: number;
  passed: number;
  total_score: number;
  players: number;
  coins: number;
  packs: number;
};

export type EmergencyPrizeClaim = { coins: number; opening_ids: string[]; coin_balance: number };

/**
 * Closes the days and the weeks that are over on the server, then the player's prizes still to
 * claim: the weekly ones first, then the daily ones, oldest first. A server without the weekly
 * Emergenza yet still gives the daily ones.
 */
export async function fetchEmergencyPrizes(): Promise<EmergencyPrize[]> {
  const supabase = getSupabase();
  const [daily, weekly] = await Promise.all([
    supabase.rpc("get_emergency_prizes"),
    supabase.rpc("get_emergency_week_prizes"),
  ]);
  if (daily.error) throw daily.error;
  const days = (daily.data as unknown as Omit<EmergencyPrize, "kind">[]).map((prize) => ({ ...prize, kind: "day" as const }));
  const weeks = weekly.error
    ? []
    : (weekly.data as unknown as Omit<EmergencyPrize, "kind">[]).map((prize) => ({ ...prize, kind: "week" as const }));
  return [...weeks, ...days];
}

export async function claimEmergencyPrize(prize: Pick<EmergencyPrize, "id" | "kind">): Promise<EmergencyPrizeClaim> {
  const { data, error } = await getSupabase().rpc(prize.kind === "week" ? "claim_emergency_week_prize" : "claim_emergency_prize", {
    p_prize_id: prize.id,
  });
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
