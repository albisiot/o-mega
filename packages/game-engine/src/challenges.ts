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
 *   one of them; otherwise minVariants (0: no rule). With variantStyles, only variants of
 *   those styles count.
 * - banned, only: character codes left out, or the only ones admitted (none listed: no rule).
 * - noStarters: no starter copy fielded, and no level card.
 */
import { fitsStarTraits, type TraitCategoryOf } from "./story-stars.ts";

export type ChallengeRules = {
  rarities: readonly string[];
  factions: readonly string[];
  traits: readonly string[];
  minVariants: number;
  allVariants: boolean;
  variantStyles: readonly string[];
  banned: readonly string[];
  only: readonly string[];
  noStarters: boolean;
};

/**
 * What the rules look at in a character: rarity and faction codes, trait codes, its own code
 * (for the banned and only-these lists) and whether it is a level card.
 */
export type ChallengeCharacter = {
  rarity: string;
  faction: string;
  traits: readonly string[];
  code?: string;
  levelCard?: boolean;
};

/** A fielded copy: its character, its artwork variant's style if any, and whether it is a starter copy. */
export type ChallengeCopy = ChallengeCharacter & { variant: boolean; variantStyle?: string | null; starter?: boolean };

/** No rule at all: every squad is admitted. */
export const NO_CHALLENGE_RULES: ChallengeRules = {
  rarities: [],
  factions: [],
  traits: [],
  minVariants: 0,
  allVariants: false,
  variantStyles: [],
  banned: [],
  only: [],
  noStarters: false,
};

/**
 * The character passes the rarity, faction and trait rules. Variants are a rule of the
 * fielded copy, not of the character. An unknown trait is an error, as in the database.
 */
export function admittedByChallenge(character: ChallengeCharacter, rules: ChallengeRules, categoryOf: TraitCategoryOf): boolean {
  if (rules.rarities.length > 0 && !rules.rarities.includes(character.rarity)) return false;
  if (rules.factions.length > 0 && !rules.factions.includes(character.faction)) return false;
  if (character.code !== undefined && rules.banned.includes(character.code)) return false;
  if (rules.only.length > 0 && (character.code === undefined || !rules.only.includes(character.code))) return false;
  if (rules.noStarters && character.levelCard) return false;
  return rules.traits.length === 0 || fitsStarTraits(character, { rarities: [], traits: rules.traits }, categoryOf);
}

/** The copy counts as a variant for the rules: it has one, of a listed style if styles are listed. */
export function variantCountsForChallenge(copy: Pick<ChallengeCopy, "variant" | "variantStyle">, rules: ChallengeRules): boolean {
  if (!copy.variant) return false;
  return rules.variantStyles.length === 0 || (copy.variantStyle != null && rules.variantStyles.includes(copy.variantStyle));
}

/** How many copies of a squad of this size must be variants. */
export function challengeVariantsNeeded(rules: ChallengeRules, teamSize: number): number {
  return rules.allVariants ? teamSize : Math.min(Math.max(0, rules.minVariants), teamSize);
}

export type ChallengeTeamCheck = {
  /** Copies whose character is not admitted. */
  notAdmitted: number;
  /** Starter copies, out when the rules say no starters. */
  starters: number;
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
  const starters = rules.noStarters ? squad.filter((copy) => copy.starter).length : 0;
  const variants = squad.filter((copy) => variantCountsForChallenge(copy, rules)).length;
  const variantsNeeded = challengeVariantsNeeded(rules, teamSize);
  return {
    notAdmitted,
    starters,
    variants,
    variantsNeeded,
    ok: squad.length === teamSize && notAdmitted === 0 && starters === 0 && variants >= variantsNeeded,
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
