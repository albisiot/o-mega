import type { BotDifficulty } from "@o-mega/game-engine";
import { forget, keepSeen, lastSeen } from "@/lib/last-seen";
import { invokeFunction, type MatchCard, type MatchView } from "@/lib/match";
import type { StarRulesText, StoryStar } from "@/lib/story-stars";
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
  /** Coins each star pays the first time it is earned. */
  star_coins: number;
  /** The stars the player has earned, in any order. */
  stars: StoryStar[];
} & StarRulesText;

export type StoryChapter = {
  /** Order of the whole story, across seasons: also what links use (/storia/?capitolo=). */
  chapter: number;
  season: number;
  season_title: string;
  /** The chapter's number inside its season: the one the player reads. */
  number: number;
  title: string;
  intro: string;
  /** How the chapter ends: only once all its missions are completed. */
  outro: string | null;
  /** Only on the last chapter of a season, once every mission of the season is completed. */
  season_ending: string | null;
  missions: StoryMission[];
};

export type StoryReward = {
  mission: string;
  title: string;
  /** No mission follows in the whole story. */
  is_last: boolean;
  /** This match completed the last mission of a season: how the season ends. */
  season_ending: string | null;
  /** This match completed the mission for the first time: the reward was paid. */
  completed_now: boolean;
  completed_before: boolean;
  coins: number;
  card: (MatchCard & { instance_id: string }) | null;
  /** Stars this match earned for the first time, and the coins they paid. */
  stars_now: StoryStar[];
  star_coins: number;
  /** Stars the player had already earned with other matches. */
  stars_had: StoryStar[];
  /** Stars whose conditions this match met, earned now or before. */
  stars_met: StoryStar[];
} & StarRulesText;

/** Until the stars reach the database the fields are missing: no star and no rule. */
const NO_STARS: StarRulesText = { star_rarities: [], star_rarity_names: [], star_traits: [], star_traits_text: [] };

function withStars(chapters: StoryChapter[]): StoryChapter[] {
  return chapters.map((chapter) => ({
    ...chapter,
    missions: chapter.missions.map((mission) => ({ ...NO_STARS, ...mission, star_coins: mission.star_coins ?? 0, stars: mission.stars ?? [] })),
  }));
}

export async function fetchStory(): Promise<StoryChapter[]> {
  const { data, error } = await getSupabase().rpc("get_story");
  if (error) throw error;
  return keepSeen("story", withStars(data as unknown as StoryChapter[]));
}

/** The chapters as last seen in this visit, to show at once while the fresh ones load. */
export const seenStory = () => lastSeen<StoryChapter[]>("story");

/** A chapter opens once every mission before it is completed: its first mission tells. */
export function chapterUnlocked(chapter: StoryChapter): boolean {
  return chapter.missions[0]?.unlocked ?? false;
}

/** What opens a locked chapter: the chapter before it, or the whole season before when it starts a new one. */
export function unlockHint(previous: StoryChapter | undefined, chapter: StoryChapter): string {
  if (!previous) return "Non ancora disponibile.";
  return previous.season === chapter.season
    ? `Completa il Capitolo ${previous.number} per sbloccarlo.`
    : `Completa la Stagione ${previous.season} per sbloccarlo.`;
}

export async function startStoryMission(mission: string, cardInstanceIds: string[]): Promise<MatchView> {
  return invokeFunction<MatchView>({ action: "story_start", mission, card_instance_ids: cardInstanceIds });
}

/** null for a match that is not a story mission. */
export async function fetchStoryReward(matchId: string): Promise<StoryReward | null> {
  const { data, error } = await getSupabase().rpc("get_story_reward", { p_match_id: matchId });
  if (error) throw error;
  const sent = data as unknown as StoryReward | null;
  const reward = sent && {
    ...NO_STARS,
    ...sent,
    star_coins: sent.star_coins ?? 0,
    stars_now: sent.stars_now ?? [],
    stars_had: sent.stars_had ?? [],
    stars_met: sent.stars_met ?? [],
  };
  if (reward && (reward.completed_now || reward.stars_now.length > 0)) {
    // Coins, stars and maybe a card just arrived, and the next mission or chapter opened.
    forget("packStatus");
    forget("coinHistory");
    forget("story");
  }
  return reward;
}

/** Link to a mission's match: the result screen then shows the story reward. */
export function storyMatchHref(matchId: string): string {
  return `/partita/?id=${matchId}&storia=1`;
}
