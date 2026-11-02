import type { BotDifficulty } from "@o-mega/game-engine";
import { forget } from "@/lib/last-seen";
import { invokeFunction, type MatchCard, type MatchView } from "@/lib/match";
import { getSupabase } from "@/lib/supabase/client";

export type StoryMission = {
  code: string;
  ord: number;
  title: string;
  intro: string;
  opponent: string;
  bot_difficulty: BotDifficulty;
  threat_levels: number[];
  reward_coins: number;
  /** The chapter boss gives a card. */
  reward_card: MatchCard | null;
  completed: boolean;
  unlocked: boolean;
};

export type StoryChapter = { chapter: number; title: string; intro: string; missions: StoryMission[] };

export type StoryReward = {
  mission: string;
  title: string;
  is_last: boolean;
  /** This match completed the mission for the first time: the reward was paid. */
  completed_now: boolean;
  completed_before: boolean;
  coins: number;
  card: (MatchCard & { instance_id: string }) | null;
};

export async function fetchStory(): Promise<StoryChapter[]> {
  const { data, error } = await getSupabase().rpc("get_story");
  if (error) throw error;
  return data as unknown as StoryChapter[];
}

export async function startStoryMission(mission: string, cardInstanceIds: string[]): Promise<MatchView> {
  return invokeFunction<MatchView>({ action: "story_start", mission, card_instance_ids: cardInstanceIds });
}

/** null for a match that is not a story mission. */
export async function fetchStoryReward(matchId: string): Promise<StoryReward | null> {
  const { data, error } = await getSupabase().rpc("get_story_reward", { p_match_id: matchId });
  if (error) throw error;
  const reward = data as unknown as StoryReward | null;
  if (reward?.completed_now) {
    // Coins and maybe a card just arrived.
    forget("packStatus");
    forget("coinHistory");
  }
  return reward;
}

/** Link to a mission's match: the result screen then shows the story reward. */
export function storyMatchHref(matchId: string): string {
  return `/partita/?id=${matchId}&storia=1`;
}
