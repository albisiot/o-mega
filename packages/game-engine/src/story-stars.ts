/**
 * The three stars of a story mission (SPEC §5.11). The database decides them when a
 * mission match ends (grant_story_reward); this is the same rule, for the pages that
 * show what a squad can still earn and for the simulations.
 *
 * - flawless: win the mission 3-0, the bot wins no round.
 * - rarities: win with a squad whose 5 characters all have one of the mission's rarities.
 * - traits: win with a squad whose 5 characters all match the mission's traits, with the
 *   rule of card_matches_traits: inside a category one listed trait is enough, every
 *   listed category must match.
 *
 * Stars are independent, a single win can earn several, and an abandoned match never counts.
 */
export type StoryStar = "flawless" | "rarities" | "traits";

/** In the order the player reads them. */
export const STORY_STARS: readonly StoryStar[] = ["flawless", "rarities", "traits"];

/** A mission's star rules: rarity codes ("delta", "gamma") and trait codes ("group.custodi"). */
export type StoryStarRules = { rarities: readonly string[]; traits: readonly string[] };

/** What the rules look at in a character. */
export type StarCharacter = { rarity: string; traits: readonly string[] };

/** Category code of every trait code ("group.custodi" → "group"). */
export type TraitCategoryOf = (traitCode: string) => string | undefined;

/** The character has one of the mission's rarities. No rarity listed: no character fits. */
export function fitsStarRarities(character: StarCharacter, rules: StoryStarRules): boolean {
  return rules.rarities.includes(character.rarity);
}

/**
 * The character matches the mission's traits: for every category with a listed trait,
 * it holds one of the listed traits of that category. No trait listed: no character fits.
 * An unknown trait is an error, as in the database.
 */
export function fitsStarTraits(character: StarCharacter, rules: StoryStarRules, categoryOf: TraitCategoryOf): boolean {
  if (rules.traits.length === 0) return false;
  const wanted = new Map<string, string[]>();
  for (const code of rules.traits) {
    const category = categoryOf(code);
    if (!category) throw new Error(`unknown trait ${code}`);
    wanted.set(category, [...(wanted.get(category) ?? []), code]);
  }
  return [...wanted.values()].every((codes) => codes.some((code) => character.traits.includes(code)));
}

/**
 * The stars a squad can still earn, before the match: flawless always (it depends on the
 * match), the other two when every character of a full squad fits.
 */
export function squadStars(
  squad: readonly StarCharacter[],
  rules: StoryStarRules,
  categoryOf: TraitCategoryOf,
  teamSize: number,
): Record<StoryStar, boolean> {
  const full = squad.length === teamSize;
  return {
    flawless: true,
    rarities: full && squad.every((character) => fitsStarRarities(character, rules)),
    traits: full && squad.every((character) => fitsStarTraits(character, rules, categoryOf)),
  };
}

/** The stars a finished mission match earns: none unless the player won it, and never by abandon. */
export function earnedStars(
  match: { won: boolean; forfeit: boolean; opponentRoundsWon: number; squad: readonly StarCharacter[] },
  rules: StoryStarRules,
  categoryOf: TraitCategoryOf,
): StoryStar[] {
  if (!match.won || match.forfeit || match.squad.length === 0) return [];
  const can = squadStars(match.squad, rules, categoryOf, match.squad.length);
  return STORY_STARS.filter((star) => (star === "flawless" ? match.opponentRoundsWon === 0 : can[star]));
}
