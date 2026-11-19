import { STORY_STARS, type StoryStar, type StoryStarRules, type TraitCategoryOf } from "@o-mega/game-engine";
import { balance } from "@/config/balance";
import type { TraitCategory } from "@/lib/traits";

export { STORY_STARS, type StoryStar };

/** What a mission says about its stars, as get_story and get_story_reward send it. */
export type StarRulesText = {
  /** Rarity codes and their names, rarest last. */
  star_rarities: string[];
  star_rarity_names: string[];
  /** Trait codes and how players read them: [{category: "Gruppo", traits: ["Custodi"]}]. */
  star_traits: string[];
  star_traits_text: { category: string; traits: string[] }[];
};

/** The short name of each star, on the chips and the result. */
export const STAR_NAMES: Record<StoryStar, string> = {
  flawless: "3-0",
  rarities: "Rarità",
  traits: "Tratti",
};

/** "Delta", "Delta o Gamma", "Delta, Gamma o Beta". */
export function joinOr(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} o ${names[names.length - 1]}`;
}

/** The traits as players read them: "Mito o Strappo · Figli dell'Ultima". */
export function describeStarTraits(text: StarRulesText["star_traits_text"]): string {
  return text.map((group) => joinOr(group.traits)).join(" · ");
}

/** What a star asks, in plain Italian: "Vinci 3-0", "Vinci con solo Delta o Gamma in squadra". */
export function starCondition(star: StoryStar, rules: StarRulesText): string {
  switch (star) {
    case "flawless":
      return "Vinci 3-0, senza perdere un round";
    case "rarities":
      return `Vinci con solo ${joinOr(rules.star_rarity_names)} in squadra`;
    case "traits":
      return `Vinci con solo ${describeStarTraits(rules.star_traits_text)} in squadra`;
  }
}

/** The short form, where room is tight: "3-0", "Solo Delta o Gamma", "Solo Custodi". */
export function starShort(star: StoryStar, rules: StarRulesText): string {
  switch (star) {
    case "flawless":
      return "Vinci 3-0";
    case "rarities":
      return `Solo ${joinOr(rules.star_rarity_names)}`;
    case "traits":
      return `Solo ${describeStarTraits(rules.star_traits_text)}`;
  }
}

export function starRules(rules: Pick<StarRulesText, "star_rarities" | "star_traits">): StoryStarRules {
  return { rarities: rules.star_rarities, traits: rules.star_traits };
}

/** The category of each trait code, from the trait catalog. */
export function traitCategoryOf(catalog: readonly TraitCategory[]): TraitCategoryOf {
  const map = new Map(catalog.flatMap((category) => category.traits.map((trait) => [trait.code, category.code] as const)));
  return (code) => map.get(code);
}

/** Stars earned out of the stars there are: "12/15". */
export function countStars(missions: readonly { stars: readonly StoryStar[] }[]): { earned: number; total: number } {
  return {
    earned: missions.reduce((sum, mission) => sum + mission.stars.length, 0),
    total: missions.length * STORY_STARS.length,
  };
}

/**
 * Stars earned in the whole Story out of every star it has, locked missions included: "15/180"
 * on the Story tile in Gioca. null until the stars reach the database (no mission has their rules).
 */
export function storyStarCount(
  chapters: readonly { missions: readonly ({ stars: readonly StoryStar[] } & Pick<StarRulesText, "star_rarities">)[] }[],
): { earned: number; total: number } | null {
  const missions = chapters.flatMap((chapter) => chapter.missions);
  return missions.some((mission) => mission.star_rarities.length > 0) ? countStars(missions) : null;
}

/** The coins a star of a new mission pays, by its chapter in the whole story (balance.story). */
export function defaultStarCoins(chapter: number): number {
  const { starCoinsBase, starCoinsStep, starCoinsStepChapters } = balance.story;
  return starCoinsBase + starCoinsStep * Math.floor((Math.max(1, chapter) - 1) / starCoinsStepChapters);
}
