/**
 * The squad rules of a Sfida a tema (SPEC §8.8): an existing mode, for a while, played only
 * with some characters. The database decides (check_challenge_team, when the match is
 * created); this is the same rule, for the team screen that marks what fits and says what is
 * missing, and for the simulations.
 *
 * - rarities, factions: the character has one of the listed ones; none listed admits all.
 * - traits: the rule of card_matches_traits (SPEC §4.7): inside a category one listed trait
 *   is enough, every listed category must match; none listed admits all.
 * - variants: how many fielded copies must have an artwork variant. allVariants asks every
 *   one of them; otherwise minVariants (0: no rule).
 */
import { fitsStarTraits, type TraitCategoryOf } from "./story-stars.ts";

export type ChallengeRules = {
  rarities: readonly string[];
  factions: readonly string[];
  traits: readonly string[];
  minVariants: number;
  allVariants: boolean;
};

/** What the rules look at in a character: rarity and faction codes, trait codes. */
export type ChallengeCharacter = { rarity: string; faction: string; traits: readonly string[] };

/** A fielded copy: its character, and whether it has an artwork variant. */
export type ChallengeCopy = ChallengeCharacter & { variant: boolean };

/** No rule at all: every squad is admitted. */
export const NO_CHALLENGE_RULES: ChallengeRules = { rarities: [], factions: [], traits: [], minVariants: 0, allVariants: false };

/**
 * The character passes the rarity, faction and trait rules. Variants are a rule of the
 * fielded copy, not of the character. An unknown trait is an error, as in the database.
 */
export function admittedByChallenge(character: ChallengeCharacter, rules: ChallengeRules, categoryOf: TraitCategoryOf): boolean {
  if (rules.rarities.length > 0 && !rules.rarities.includes(character.rarity)) return false;
  if (rules.factions.length > 0 && !rules.factions.includes(character.faction)) return false;
  return rules.traits.length === 0 || fitsStarTraits(character, { rarities: [], traits: rules.traits }, categoryOf);
}

/** How many copies of a squad of this size must be variants. */
export function challengeVariantsNeeded(rules: ChallengeRules, teamSize: number): number {
  return rules.allVariants ? teamSize : Math.min(Math.max(0, rules.minVariants), teamSize);
}

export type ChallengeTeamCheck = {
  /** Copies whose character is not admitted. */
  notAdmitted: number;
  /** Fielded copies with a variant, and how many the rules ask for a full squad. */
  variants: number;
  variantsNeeded: number;
  /** A full squad that keeps every rule. */
  ok: boolean;
};

/** Where a squad stands against the rules: a full squad is ok when every rule holds. */
export function checkChallengeTeam(
  squad: readonly ChallengeCopy[],
  rules: ChallengeRules,
  categoryOf: TraitCategoryOf,
  teamSize: number,
): ChallengeTeamCheck {
  const notAdmitted = squad.filter((copy) => !admittedByChallenge(copy, rules, categoryOf)).length;
  const variants = squad.filter((copy) => copy.variant).length;
  const variantsNeeded = challengeVariantsNeeded(rules, teamSize);
  return {
    notAdmitted,
    variants,
    variantsNeeded,
    ok: squad.length === teamSize && notAdmitted === 0 && variants >= variantsNeeded,
  };
}

/**
 * Can a player field a squad at all? The admitted characters they own, and among them those
 * they own with a variant: enough characters, and enough of them with a variant.
 */
export function canFieldChallenge(
  owned: { admitted: number; admittedWithVariant: number },
  rules: ChallengeRules,
  teamSize: number,
): boolean {
  return owned.admitted >= teamSize && owned.admittedWithVariant >= challengeVariantsNeeded(rules, teamSize);
}
