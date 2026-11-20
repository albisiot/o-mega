import type { ScoreParts, ThreatModifier } from "@o-mega/game-engine";
import { invokeFunction, type MatchCard } from "@/lib/match";
import type { ThreatRarity } from "@/lib/threat-rarity";
import type { EmergencyPrizeTier } from "@/lib/emergency-prizes";
import { fetchChallengeLeaderboard, type ChallengeLeaderboardEntry } from "@/lib/challenges";
import { forget, keepSeen, lastSeen } from "@/lib/last-seen";
import { getSupabase } from "@/lib/supabase/client";

export type EmergencyThreat = {
  name: string;
  abilities: string[];
  flavor: string;
  /** A rare threat's fixed rule (SPEC §5.15); the usual threats of Emergenza have none. */
  modifier?: ThreatModifier | null;
  rarity?: ThreatRarity | null;
  /** A rare threat's own target (the most it allows, under Rovescio). */
  target?: number | null;
  /** Al buio: the abilities come once the threat is played. */
  hidden?: boolean;
};

export type EmergencyPlay = {
  round: number;
  level: number;
  threat: EmergencyThreat;
  modifier?: ThreatModifier | null;
  rarity?: ThreatRarity | null;
  instance_id: string;
  definition_id: string;
  base: number;
  bonus: number;
  /** Where the bonus comes from, as the server counted it; missing for plays stored before it did. */
  parts?: ScoreParts | null;
  score: number;
  required: number;
  passed: boolean;
};

export type EmergencySquadCard = MatchCard & { instance_id: string; played_round: number | null };

export type EmergencyRun = {
  /** The player's own run (weekly challenge): its event points are looked up by it. */
  id?: string;
  status: "active" | "finished";
  current_round: number;
  passed: number;
  failed: number;
  total_score: number;
  coins: number;
  /** XP paid at the end of the run (emergency.rewards.finish_xp). */
  xp?: number;
  squad: EmergencySquadCard[];
  plays: EmergencyPlay[];
  /** null once the run is over. */
  current_threat: (EmergencyThreat & { id: string; round: number; level: number }) | null;
  /** Veggente, Presagio, Oracolo: the threats after the current one they show (seen_by: foreseenBy in match.ts). */
  foreseen_threats: { round: number; level: number; name: string; abilities: string[]; seen_by?: string }[];
};

/**
 * The two challenges: the daily Emergenza (SPEC §5.10) and the Emergenza della settimana
 * (SPEC §5.16), harder, Monday to Sunday. Same screens, same engine, their own rules.
 */
export type EmergencyKind = "day" | "week";

/** Where a challenge opens: the weekly one with ?settimana=1 (no dynamic routes in the static export). */
export function emergencyHref(kind: EmergencyKind): string {
  return kind === "week" ? "/emergenza/?settimana=1" : "/emergenza";
}

/** What the server lets the player see of today's challenge (SPEC §5.10), or of this week's (SPEC §5.16). */
export type EmergencyView = {
  day: string;
  /** The week's Monday (YYYY-MM-DD), and when it ends: the weekly challenge only. */
  week?: string;
  ends_at?: string;
  server_now: string;
  /** null: Livello ignoto, until it is the current threat. */
  threat_levels: (number | null)[];
  threat_rarities?: (ThreatRarity | null)[];
  rules: {
    threats_per_run: number;
    max_failures: number;
    targets: Record<string, number>;
    rewards: { passed: number; coins: number }[];
    /** XP at the end of the run, 0 for none. */
    finish_xp?: number;
  };
  /** null until the player fields a squad. */
  run: EmergencyRun | null;
};

const ACTION_PREFIX: Record<EmergencyKind, string> = { day: "emergency", week: "emergency_week" };

/** The action of a call: an Emergenza a tema (SPEC §8.8) names its challenge. */
function emergencyAction(step: "open" | "start" | "play", kind: EmergencyKind, challengeId: string | null | undefined) {
  return challengeId
    ? { action: `challenge_emergency_${step}`, challenge_id: challengeId }
    : { action: `${ACTION_PREFIX[kind]}_${step}` };
}

/**
 * Opens today's challenge (or this week's, or a Sfida a tema's): the first player of the day
 * (or week, or challenge) makes the server draw it.
 */
export function openEmergency(kind: EmergencyKind = "day", challengeId?: string | null): Promise<EmergencyView> {
  return invokeFunction(emergencyAction("open", kind, challengeId));
}

export function startEmergency(cardInstanceIds: string[], kind: EmergencyKind = "day", challengeId?: string | null): Promise<EmergencyView> {
  forgetEmergencyBoards();
  return invokeFunction({ ...emergencyAction("start", kind, challengeId), card_instance_ids: cardInstanceIds });
}

export function playEmergency(
  round: number,
  cardInstanceId: string,
  kind: EmergencyKind = "day",
  challengeId?: string | null,
): Promise<EmergencyView> {
  forgetEmergencyBoards();
  return invokeFunction({ ...emergencyAction("play", kind, challengeId), round, card_instance_id: cardInstanceId });
}

/** A run moved on: the boards last seen no longer say where the player is. */
function forgetEmergencyBoards() {
  forget("emergencyDay");
  forget("emergencyWeek");
}

export type EmergencyRank = {
  rank: number;
  username: string;
  avatar_url: string | null;
  /** The title the player shows (Imprese), or null. */
  title: string | null;
  passed: number;
  total_score: number;
  is_me: boolean;
};

export type EmergencyLeaderboard = {
  players: number;
  top: EmergencyRank[];
  me: EmergencyRank | null;
  /** What each place wins when the day ends; missing from a server before the prizes. */
  prizes?: EmergencyPrizeTier[];
  /** Threats passed needed to win a prize. */
  prize_min_passed?: number;
};

/** This week's leaderboard (SPEC §5.16): also when the week ends and where the player's own run is. */
export type EmergencyWeekLeaderboard = EmergencyLeaderboard & {
  week: string;
  ends_at: string;
  server_now: string;
  threats_per_run: number;
  /** null before the player fields a squad this week. */
  my_run: { status: "active" | "finished"; passed: number; failed: number; current_round: number } | null;
};

/** A card of a podium lineup, drawn as it was played; `play` is null for a card the run never reached. */
export type EmergencyLineupCard = MatchCard & {
  instance_id: string;
  play: { round: number; threat: string; score: number; required: number; passed: boolean } | null;
};

export type EmergencyLineup = Omit<EmergencyRank, "rank"> & { rank: number; cards: EmergencyLineupCard[] };

/**
 * The lineups of a day's podium (SPEC §5.10): today's when the player's own attempt is
 * finished (`live`), yesterday's otherwise, since the threats are the same for everyone.
 */
export type EmergencyLineups = { day: string; live: boolean; lineups: EmergencyLineup[] };

/** The podium's lineups: of the day (yesterday's before one's own attempt), or of the week (last week's before). */
export async function fetchEmergencyLineups(kind: EmergencyKind = "day"): Promise<EmergencyLineups> {
  const { data, error } = await getSupabase().rpc(kind === "week" ? "get_emergency_week_lineups" : "get_emergency_lineups");
  if (error) throw error;
  return data as unknown as EmergencyLineups;
}

export async function fetchEmergencyLeaderboard(kind: EmergencyKind = "day"): Promise<EmergencyLeaderboard> {
  if (kind === "week") return fetchEmergencyWeekLeaderboard();
  const { data, error } = await getSupabase().rpc("get_emergency_leaderboard");
  if (error) throw error;
  return keepSeen("emergencyDay", data as unknown as EmergencyLeaderboard);
}

/** Today's board as last seen, for the Gioca page to show at once. */
export const seenEmergencyLeaderboard = () => lastSeen<EmergencyLeaderboard>("emergencyDay");

/** The leaderboard of an Emergenza a tema, in the shape of the others: its best runs. */
export async function fetchChallengeEmergencyLeaderboard(challengeId: string): Promise<EmergencyLeaderboard> {
  const board = await fetchChallengeLeaderboard(challengeId);
  const rank = (entry: ChallengeLeaderboardEntry): EmergencyRank => ({
    rank: entry.rank,
    username: entry.username,
    avatar_url: entry.avatar_url,
    title: null,
    passed: entry.wins,
    total_score: entry.score,
    is_me: entry.is_me,
  });
  return { players: board.players, top: board.top.map(rank), me: board.me ? rank(board.me) : null };
}

export async function fetchEmergencyWeekLeaderboard(): Promise<EmergencyWeekLeaderboard> {
  const { data, error } = await getSupabase().rpc("get_emergency_week_leaderboard");
  if (error) throw error;
  return keepSeen("emergencyWeek", data as unknown as EmergencyWeekLeaderboard);
}

export const seenEmergencyWeekLeaderboard = () => lastSeen<EmergencyWeekLeaderboard>("emergencyWeek");

/**
 * Days left in the week, today included, from the server's clock: 7 on Monday, 1 on Sunday.
 * Only for the words on screen; the server decides when the week ends.
 */
export function daysLeft(endsAt: string, now: number): number {
  return Math.max(1, Math.ceil((Date.parse(endsAt) - now) / 86_400_000));
}

/** "Ultimo giorno", "Ancora 2 giorni", "Ancora 7 giorni". */
export function daysLeftText(days: number): string {
  return days <= 1 ? "Ultimo giorno" : `Ancora ${days} giorni`;
}

/** "dal 16 al 22 novembre", "dal 30 novembre al 6 dicembre", from a week's Monday (YYYY-MM-DD). */
export function weekText(week: string): string {
  const [year, month, date] = week.split("-").map(Number);
  const monday = new Date(Date.UTC(year, month - 1, date));
  const sunday = new Date(Date.UTC(year, month - 1, date + 6));
  const day = (d: Date) => d.getUTCDate();
  const monthName = (d: Date) => new Intl.DateTimeFormat("it-IT", { month: "long", timeZone: "UTC" }).format(d);
  return monday.getUTCMonth() === sunday.getUTCMonth()
    ? `dal ${day(monday)} al ${day(sunday)} ${monthName(sunday)}`
    : `dal ${day(monday)} ${monthName(monday)} al ${day(sunday)} ${monthName(sunday)}`;
}
