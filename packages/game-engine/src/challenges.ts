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
 * - composition, a rule of the whole squad: the rarity ranks of the fielded copies (Delta 1 …
 *   Omega 5) add up to at most rarityBudget; at most rarityMax[code] copies of a rarity; at
 *   least minFactions different factions.
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
  /** The squad's rarity ranks add up to at most this; null: no budget. */
  rarityBudget: number | null;
  /** At most this many fielded copies of each listed rarity code; a rarity not listed has no limit. */
  rarityMax: Readonly<Record<string, number>>;
  /** At least this many different factions in the squad; 0: no rule. */
  minFactions: number;
};

/**
 * What the rules look at in a character: rarity and faction codes, trait codes, its own code
 * (for the banned and only-these lists), whether it is a level card, and the rank of its
 * rarity (Delta 1 … Omega 5, for the rarity budget).
 */
export type ChallengeCharacter = {
  rarity: string;
  faction: string;
  traits: readonly string[];
  code?: string;
  levelCard?: boolean;
  rarityRank?: number;
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
  rarityBudget: null,
  rarityMax: {},
  minFactions: 0,
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
  /** The rarity ranks of the squad added up (for the budget). */
  budget: number;
  /** Rarity codes with more copies than the rules allow. */
  overRarities: string[];
  /** Different factions in the squad. */
  factions: number;
  /** A full squad that keeps every rule. */
  ok: boolean;
};

/** The rarity ranks of the copies added up (a copy without a rank counts 0). */
export function rarityBudgetOf(squad: readonly Pick<ChallengeCharacter, "rarityRank">[]): number {
  return squad.reduce((sum, copy) => sum + (copy.rarityRank ?? 0), 0);
}

/** Rarity codes the squad has more copies of than the rules allow. */
function overRaritiesOf(squad: readonly Pick<ChallengeCharacter, "rarity">[], rules: ChallengeRules): string[] {
  return Object.entries(rules.rarityMax)
    .filter(([rarity, max]) => squad.filter((copy) => copy.rarity === rarity).length > max)
    .map(([rarity]) => rarity);
}

/** Where a squad stands against the composition rules (also before it is full). */
export function compositionOfSquad(
  squad: readonly Pick<ChallengeCharacter, "rarity" | "faction" | "rarityRank">[],
  rules: ChallengeRules,
): Pick<ChallengeTeamCheck, "budget" | "overRarities" | "factions"> {
  return {
    budget: rarityBudgetOf(squad),
    overRarities: overRaritiesOf(squad, rules),
    factions: new Set(squad.map((copy) => copy.faction)).size,
  };
}

/** The squad has a composition rule at all. */
export function hasCompositionRules(rules: ChallengeRules): boolean {
  return rules.rarityBudget !== null || Object.keys(rules.rarityMax).length > 0 || rules.minFactions > 0;
}

/** Why a composition rule stops a character from joining a squad. */
export type CompositionBlock = "budget" | "rarity" | "factions";

/**
 * Would adding this character keep a full squad possible under the composition rules? null:
 * yes; otherwise the rule it breaks. cheapestRank: the lowest rarity rank that can still fill
 * the empty places (1, Delta, unless the rules admit no Delta), for the budget.
 */
export function compositionBlock(
  squad: readonly Pick<ChallengeCharacter, "rarity" | "faction" | "rarityRank">[],
  candidate: Pick<ChallengeCharacter, "rarity" | "faction" | "rarityRank">,
  rules: ChallengeRules,
  teamSize: number,
  cheapestRank = 1,
): CompositionBlock | null {
  const next = [...squad, candidate];
  const empty = Math.max(0, teamSize - next.length);
  const max = rules.rarityMax[candidate.rarity];
  if (max !== undefined && next.filter((copy) => copy.rarity === candidate.rarity).length > max) return "rarity";
  if (rules.rarityBudget !== null && rarityBudgetOf(next) + empty * cheapestRank > rules.rarityBudget) return "budget";
  if (rules.minFactions > 0 && new Set(next.map((copy) => copy.faction)).size + empty < rules.minFactions) return "factions";
  return null;
}

/**
 * A squad that keeps the composition rules, taken in order from the candidates (the order is
 * the picker's preference: strongest first for a strong bot, shuffled for a weak one). A
 * candidate that would make a full squad impossible is skipped. null when no full squad comes
 * out: the caller keeps its own squad then.
 */
export function pickWithComposition<T extends Pick<ChallengeCharacter, "rarity" | "faction" | "rarityRank">>(
  candidates: readonly T[],
  rules: ChallengeRules,
  teamSize: number,
): T[] | null {
  if (!hasCompositionRules(rules)) return candidates.length >= teamSize ? candidates.slice(0, teamSize) : null;
  const cheapestRank = Math.min(...candidates.map((card) => card.rarityRank ?? 0));
  const squad: T[] = [];
  for (const card of candidates) {
    if (squad.length === teamSize) break;
    if (compositionBlock(squad, card, rules, teamSize, cheapestRank) === null) squad.push(card);
  }
  return squad.length === teamSize ? squad : null;
}

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
  const budget = rarityBudgetOf(squad);
  const overRarities = overRaritiesOf(squad, rules);
  const factions = new Set(squad.map((copy) => copy.faction)).size;
  const composition =
    (rules.rarityBudget === null || budget <= rules.rarityBudget) && overRarities.length === 0 && factions >= rules.minFactions;
  return {
    notAdmitted,
    starters,
    variants,
    variantsNeeded,
    budget,
    overRarities,
    factions,
    ok: squad.length === teamSize && notAdmitted === 0 && starters === 0 && variants >= variantsNeeded && composition,
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

/** The squad rules as the database keeps them (challenge_normalize_rules), for the engine. */
export function parseChallengeRules(json: Record<string, unknown> | null | undefined): ChallengeRules {
  const list = (key: string): string[] => {
    const value = json?.[key];
    return Array.isArray(value) ? value.map(String) : [];
  };
  const number = (key: string): number => {
    const value = Number(json?.[key] ?? 0);
    return Number.isFinite(value) ? value : 0;
  };
  const max = json?.rarity_max;
  const budget = json?.rarity_budget;
  return {
    rarities: list("rarities"),
    factions: list("factions"),
    traits: list("traits"),
    minVariants: number("min_variants"),
    allVariants: json?.all_variants === true,
    variantStyles: list("variant_styles"),
    banned: list("banned"),
    only: list("only"),
    noStarters: json?.no_starters === true,
    rarityBudget: typeof budget === "number" ? budget : null,
    rarityMax:
      max && typeof max === "object" && !Array.isArray(max)
        ? Object.fromEntries(Object.entries(max as Record<string, unknown>).map(([code, most]) => [code, Number(most)]))
        : {},
    minFactions: number("min_factions"),
  };
}
