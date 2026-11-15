import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

// The Imprese (SPEC §8.5): long-term objectives that stay secret until completed. The
// server decides everything; for an impresa not completed the page gets its tier and hint only.

export type AchievementTier = "bronze" | "silver" | "gold" | "legend";

export const TIERS: AchievementTier[] = ["bronze", "silver", "gold", "legend"];

export const TIER_LABELS: Record<AchievementTier, string> = {
  bronze: "Bronzo",
  silver: "Argento",
  gold: "Oro",
  legend: "Leggenda",
};

/** Medal colours: text on them is always black. */
export const TIER_COLORS: Record<AchievementTier, string> = {
  bronze: "#d9894a",
  silver: "#c9d3dc",
  gold: "#ffd23f",
  legend: "#ff4fd8",
};

export type AchievementCard = {
  code: string;
  name: string;
  rarity_code: string;
  art_url: string | null;
  /** The variant's name, or null for the base drawing. */
  variant: string | null;
};

export type LockedAchievement = {
  id: string;
  tier: AchievementTier;
  done: false;
  hint: string | null;
};

export type CompletedAchievement = {
  id: string;
  tier: AchievementTier;
  done: true;
  name: string;
  description: string;
  completed_at: string;
  /** Switched off or ended after the player completed it: nobody else can get it. */
  retired: boolean;
  coins: number;
  packs: number;
  cards: AchievementCard[];
  title: string | null;
  claimed: boolean;
  opening_ids: string[];
  /** Completed since the page was last opened. */
  new: boolean;
};

export type Achievement = LockedAchievement | CompletedAchievement;

export type AchievementBoard = {
  /** The title the player shows, or null. */
  title: string | null;
  discovered: number;
  total: number;
  achievements: Achievement[];
};

export async function fetchAchievements(): Promise<AchievementBoard> {
  const { data, error } = await getSupabase().rpc("get_achievements");
  if (error) throw error;
  return data as unknown as AchievementBoard;
}

export async function claimAchievement(id: string): Promise<{ coins: number; opening_ids: string[]; coin_balance: number }> {
  const { data, error } = await getSupabase().rpc("claim_achievement", { p_achievement_id: id });
  if (error) throw error;
  return data as unknown as { coins: number; opening_ids: string[]; coin_balance: number };
}

/** Shows the title of a completed impresa; null takes it off. */
export async function setPlayerTitle(id: string | null): Promise<string | null> {
  // The generated types have no null, but the function takes it: no title.
  const { data, error } = await getSupabase().rpc("set_player_title", { p_achievement_id: id as string });
  if (error) throw error;
  return (data as string | null) ?? null;
}

/** The title the other player of a match shows, or null. */
export async function fetchOpponentTitle(matchId: string): Promise<string | null> {
  const { data, error } = await getSupabase().rpc("get_match_opponent_title", { p_match_id: matchId });
  if (error) throw error;
  return (data as string | null) ?? null;
}

/** The other player's title in a match against a person, once loaded; null for none or a bot. */
export function useOpponentTitle(matchId: string, enabled: boolean): string | null {
  const [title, setTitle] = useState<{ matchId: string; title: string | null } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetchOpponentTitle(matchId)
      .then((next) => {
        if (!cancelled) setTitle({ matchId, title: next });
      })
      .catch((error: unknown) => console.error("Opponent title failed", error));
    return () => {
      cancelled = true;
    };
  }, [matchId, enabled]);
  return enabled && title?.matchId === matchId ? title.title : null;
}

/** Discovered and total imprese of each tier. */
export function tierCounts(board: AchievementBoard): Record<AchievementTier, { done: number; total: number }> {
  const counts = Object.fromEntries(TIERS.map((tier) => [tier, { done: 0, total: 0 }])) as Record<
    AchievementTier,
    { done: number; total: number }
  >;
  for (const achievement of board.achievements) {
    const entry = counts[achievement.tier];
    if (!entry) continue;
    entry.total += 1;
    if (achievement.done) entry.done += 1;
  }
  return counts;
}

/** Whether a completed impresa has something to give. */
export function hasReward(achievement: CompletedAchievement): boolean {
  return achievement.coins > 0 || achievement.packs > 0 || achievement.cards.length > 0;
}

/** Imprese whose reward waits to be claimed. */
export function claimableCount(board: AchievementBoard | null): number {
  if (!board) return 0;
  return board.achievements.filter((a) => a.done && !a.claimed && hasReward(a)).length;
}

/** "150 monete · 1 pacchetto · Variante Neon di X · titolo «Il Conquistatore»", or "Solo la medaglia". */
export function describeAchievementReward(achievement: Pick<CompletedAchievement, "coins" | "packs" | "cards" | "title">): string {
  const parts: string[] = [];
  if (achievement.coins > 0) parts.push(`${achievement.coins} ${achievement.coins === 1 ? "moneta" : "monete"}`);
  if (achievement.packs > 0) parts.push(achievement.packs === 1 ? "1 pacchetto" : `${achievement.packs} pacchetti`);
  for (const card of achievement.cards) parts.push(card.variant ? `${card.name} (${card.variant})` : card.name);
  if (achievement.title) parts.push(`titolo «${achievement.title}»`);
  return parts.length > 0 ? parts.join(" · ") : "Solo la medaglia";
}

/**
 * The titles the player can choose from, once each: the Imprese in board order, then the
 * weekly titles of the Classifiche still held (`weekly: true`, they run out).
 */
export function availableTitles(
  board: AchievementBoard,
  weeklyTitles: { id: string; title: string }[] = [],
): { id: string; title: string; weekly: boolean }[] {
  const seen = new Set<string>();
  const titles: { id: string; title: string; weekly: boolean }[] = [];
  for (const achievement of board.achievements) {
    if (!achievement.done || !achievement.title || seen.has(achievement.title)) continue;
    seen.add(achievement.title);
    titles.push({ id: achievement.id, title: achievement.title, weekly: false });
  }
  for (const entry of weeklyTitles) {
    if (seen.has(entry.title)) continue;
    seen.add(entry.title);
    titles.push({ id: entry.id, title: entry.title, weekly: true });
  }
  return titles;
}
