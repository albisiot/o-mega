import type { BotDifficulty, ThreatModifier } from "@o-mega/game-engine";
import { balance } from "@/config/balance";
import type { StoryStar } from "@/lib/story-stars";
import { getSupabase } from "@/lib/supabase/client";
import { matchesTraits, type TraitCategory } from "@/lib/traits";

/**
 * The Story page of the Editor (/gestione-storia, SPEC §5.11): what an admin may change of
 * the story (texts, coin prize, star rules and coins of the missions; texts of chapters and
 * seasons) and, read only, what the simulation tuned. Every function checks the admin on
 * the server; a save applies to the matches created after it.
 */

export type StoryAdminRarity = { code: string; name: string; rank: number; color: string };

export type StoryAdminMission = {
  code: string;
  /** Order of the whole story (1-6 season 1, 7-12 season 2). */
  chapter: number;
  ord: number;
  title: string;
  opponent: string;
  intro: string;
  reward_coins: number;
  star_rarities: string[];
  star_traits: string[];
  star_coins: number;
  /** What a star of this chapter pays by default (balance.story). */
  default_star_coins: number;
  // Read only: tuned by simulation.
  bot_difficulty: BotDifficulty;
  opponents: { code: string; name: string; rarity: string }[];
  threats: { code: string; name: string; level: number; modifier: ThreatModifier | null }[];
  reward_card: { code: string; name: string; rarity: string } | null;
  /** Players who completed the mission, and who earned each star. */
  completed: number;
  stars_earned: Record<StoryStar, number>;
};

export type StoryAdminChapter = { chapter: number; season: number; number: number; title: string; intro: string; outro: string };
export type StoryAdminSeason = { season: number; title: string; ending: string };

export type StoryAdmin = {
  rarities: StoryAdminRarity[];
  trait_catalog: TraitCategory[];
  /** [rarity, traits] of every character players can field. */
  characters: [string, string[]][];
  /** The server refuses a star rule admitting fewer characters: a squad. */
  min_star_characters: number;
  /** Players who completed at least one mission. */
  players: number;
  seasons: StoryAdminSeason[];
  chapters: StoryAdminChapter[];
  missions: StoryAdminMission[];
};

/** The editable part of a mission, as the form holds it (numbers as typed). */
export type MissionDraft = {
  code: string;
  title: string;
  opponent: string;
  intro: string;
  reward_coins: string;
  star_rarities: string[];
  star_traits: string[];
  star_coins: string;
};

export type ChapterDraft = { chapter: number; title: string; intro: string; outro: string };
export type SeasonDraft = { season: number; title: string; ending: string };

/** The same limits as the server's admin_save_story_* functions. */
export const STORY_TEXT_LIMITS = {
  title: [2, 40],
  opponent: [2, 60],
  missionIntro: [10, 600],
  chapterIntro: [10, 1000],
  outro: [10, 2000],
  ending: [10, 500],
} as const;
export const MAX_REWARD_COINS = 10000;
export const MAX_STAR_COINS = 1000;

export function missionDraft(mission: StoryAdminMission): MissionDraft {
  return {
    code: mission.code,
    title: mission.title,
    opponent: mission.opponent,
    intro: mission.intro,
    reward_coins: String(mission.reward_coins),
    star_rarities: [...mission.star_rarities],
    star_traits: [...mission.star_traits],
    star_coins: String(mission.star_coins),
  };
}

/** Characters players can field with every rarity in the list. */
export function countByRarities(characters: StoryAdmin["characters"], rarities: readonly string[]): number {
  return characters.filter(([rarity]) => rarities.includes(rarity)).length;
}

/** Characters players can field that match the traits (none chosen: none, as a star needs one). */
export function countByTraits(characters: StoryAdmin["characters"], traits: readonly string[], catalog: TraitCategory[]): number {
  if (traits.length === 0) return 0;
  return characters.filter(([, held]) => matchesTraits(held, traits, catalog)).length;
}

/** How a count reads: refused under the server's minimum, a warning under balance.story.starWarnBelow. */
export function countLevel(count: number, minimum: number): "refused" | "few" | "ok" {
  return count < minimum ? "refused" : count < balance.story.starWarnBelow ? "few" : "ok";
}

const within = (text: string, [min, max]: readonly [number, number]) => {
  const length = text.trim().length;
  return length >= min && length <= max;
};

const wholeNumber = (value: string, max: number) => /^\d+$/.test(value.trim()) && Number(value) <= max;

/** What stops a mission from being saved, in Italian; null when it can be saved. */
export function missionProblem(draft: MissionDraft, data: StoryAdmin): string | null {
  if (!within(draft.title, STORY_TEXT_LIMITS.title)) return "Il titolo va da 2 a 40 caratteri.";
  if (!within(draft.opponent, STORY_TEXT_LIMITS.opponent)) return "L'avversario va da 2 a 60 caratteri.";
  if (!within(draft.intro, STORY_TEXT_LIMITS.missionIntro)) return "L'introduzione va da 10 a 600 caratteri.";
  if (!wholeNumber(draft.reward_coins, MAX_REWARD_COINS)) return `Il premio va da 0 a ${MAX_REWARD_COINS} monete.`;
  if (!wholeNumber(draft.star_coins, MAX_STAR_COINS)) return `Le monete di una stella vanno da 0 a ${MAX_STAR_COINS}.`;
  if (draft.star_rarities.length === 0) return "Scegli almeno una rarità per la stella Rarità.";
  if (draft.star_traits.length === 0) return "Scegli almeno un tratto per la stella Tratti.";
  const minimum = data.min_star_characters;
  if (countByRarities(data.characters, draft.star_rarities) < minimum) {
    return `Le rarità scelte devono lasciare almeno ${minimum} personaggi.`;
  }
  if (countByTraits(data.characters, draft.star_traits, data.trait_catalog) < minimum) {
    return `I tratti scelti devono lasciare almeno ${minimum} personaggi.`;
  }
  return null;
}

export function chapterProblem(draft: ChapterDraft): string | null {
  if (!within(draft.title, STORY_TEXT_LIMITS.title)) return "Il titolo va da 2 a 40 caratteri.";
  if (!within(draft.intro, STORY_TEXT_LIMITS.chapterIntro)) return "L'introduzione va da 10 a 1000 caratteri.";
  if (!within(draft.outro, STORY_TEXT_LIMITS.outro)) return "Il finale va da 10 a 2000 caratteri.";
  return null;
}

export function seasonProblem(draft: SeasonDraft): string | null {
  if (!within(draft.title, STORY_TEXT_LIMITS.title)) return "Il titolo va da 2 a 40 caratteri.";
  if (!within(draft.ending, STORY_TEXT_LIMITS.ending)) return "Il messaggio di fine stagione va da 10 a 500 caratteri.";
  return null;
}

/** The fields of a mission the draft changes, to tell whether there is something to save. */
export function missionChanged(draft: MissionDraft, mission: StoryAdminMission): boolean {
  const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((value) => b.includes(value));
  return (
    draft.title.trim() !== mission.title ||
    draft.opponent.trim() !== mission.opponent ||
    draft.intro.trim() !== mission.intro ||
    Number(draft.reward_coins) !== mission.reward_coins ||
    Number(draft.star_coins) !== mission.star_coins ||
    !same(draft.star_rarities, mission.star_rarities) ||
    !same(draft.star_traits, mission.star_traits)
  );
}

export async function fetchStoryAdmin(): Promise<StoryAdmin> {
  const { data, error } = await getSupabase().rpc("admin_get_story");
  if (error) throw error;
  return data as unknown as StoryAdmin;
}

export async function saveStoryMission(draft: MissionDraft): Promise<StoryAdmin> {
  const { data, error } = await getSupabase().rpc("admin_save_story_mission", {
    p_code: draft.code,
    p_title: draft.title.trim(),
    p_opponent: draft.opponent.trim(),
    p_intro: draft.intro.trim(),
    p_reward_coins: Number(draft.reward_coins),
    p_star_rarities: draft.star_rarities,
    p_star_traits: draft.star_traits,
    p_star_coins: Number(draft.star_coins),
  });
  if (error) throw error;
  return data as unknown as StoryAdmin;
}

export async function saveStoryChapter(draft: ChapterDraft): Promise<StoryAdmin> {
  const { data, error } = await getSupabase().rpc("admin_save_story_chapter", {
    p_chapter: draft.chapter,
    p_title: draft.title.trim(),
    p_intro: draft.intro.trim(),
    p_outro: draft.outro.trim(),
  });
  if (error) throw error;
  return data as unknown as StoryAdmin;
}

export async function saveStorySeason(draft: SeasonDraft): Promise<StoryAdmin> {
  const { data, error } = await getSupabase().rpc("admin_save_story_season", {
    p_season: draft.season,
    p_title: draft.title.trim(),
    p_ending: draft.ending.trim(),
  });
  if (error) throw error;
  return data as unknown as StoryAdmin;
}
