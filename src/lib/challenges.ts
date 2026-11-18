import { admittedByChallenge, challengeVariantsNeeded, type BotDifficulty, type ChallengeRules } from "@o-mega/game-engine";
import type { TraitIndex } from "@/lib/card-list";
import { FACTION_LABELS } from "@/lib/catalog";
import type { CatalogCard } from "@/lib/collection";
import { keepSeen, lastSeen } from "@/lib/last-seen";
import type { MatchFormat } from "@/lib/match";
import { joinOr, traitCategoryOf } from "@/lib/story-stars";
import { getSupabase } from "@/lib/supabase/client";

/**
 * Sfide a tema (SPEC §8.8): an existing mode, for a while, played only with some characters.
 * The server decides everything (get_challenges, and the squad check when the match starts);
 * this file reads them and says the rules in Italian.
 */

/** The squad rules as the server keeps them (challenge_normalize_rules). */
export type ChallengeRulesJson = {
  rarities: string[];
  factions: string[];
  traits: string[];
  min_variants: number;
  all_variants: boolean;
};

export type ChallengeEventPoints = { win: number; draw: number; loss: number };

export type Challenge = {
  id: string;
  title: string;
  description: string;
  /** '#rrggbb': the ribbon in Gioca and the band of its card. */
  color: string;
  format: MatchFormat;
  /** The bots players may choose, easiest first. */
  bot_difficulties: BotDifficulty[];
  /** The bot plays only with characters the rules admit. */
  bot_follows_rules: boolean;
  rules: ChallengeRulesJson;
  /** Rarity, faction and trait rules as players read them: [{category: "Rarità", traits: ["Delta", "Gamma"]}]. */
  admitted: { category: string; traits: string[] }[];
  /** Characters of the catalog the rules admit. */
  admitted_characters: number;
  team_size: number;
  starts_at: string;
  ends_at: string;
  /** Matches a day; null: no limit. */
  daily_limit: number | null;
  plays_today: number;
  /** The player's characters the rules admit, and those of them they own with a variant. */
  my_characters: number | null;
  my_characters_with_variant: number | null;
  /** The event whose points its matches give, if linked. */
  event: { id: string; title: string; starts_at: string; ends_at: string } | null;
  event_points: ChallengeEventPoints | null;
};

export type ChallengeList = { now: string; challenges: Challenge[] };

export async function fetchChallenges(): Promise<ChallengeList> {
  const { data, error } = await getSupabase().rpc("get_challenges");
  if (error) throw error;
  return keepSeen("challenges", data as unknown as ChallengeList);
}

export const seenChallenges = () => lastSeen<ChallengeList>("challenges");

/** The rules for the engine's checks. */
export function toChallengeRules(rules: ChallengeRulesJson): ChallengeRules {
  return {
    rarities: rules.rarities,
    factions: rules.factions,
    traits: rules.traits,
    minVariants: rules.min_variants,
    allVariants: rules.all_variants,
  };
}

/** The mode a challenge's tile is on in Gioca: the two Quadrante grids share one tile. */
export function challengeModeKey(format: MatchFormat): string {
  return format === "quadrant_shifting" ? "quadrant" : format;
}

/** The challenge running now on a mode's tile, if any (one per mode at a time). */
export function runningChallenge(challenges: readonly Challenge[] | null | undefined, modeKey: string, now: number): Challenge | null {
  return (
    challenges?.find(
      (challenge) =>
        challengeModeKey(challenge.format) === modeKey && Date.parse(challenge.starts_at) <= now && now < Date.parse(challenge.ends_at),
    ) ?? null
  );
}

/** The variant rule in words: "★ Solo varianti", "★ Almeno 2 varianti"; null without one. */
export function describeVariantRule(rules: Pick<ChallengeRulesJson, "min_variants" | "all_variants">): string | null {
  if (rules.all_variants) return "★ Solo varianti";
  if (rules.min_variants <= 0) return null;
  return `★ Almeno ${rules.min_variants} ${rules.min_variants === 1 ? "variante" : "varianti"}`;
}

/** Every rule as a chip: "Delta o Gamma", "Cattivi", "Figli dell'Ultima", "★ Almeno 1 variante". */
export function describeChallengeRules(challenge: Pick<Challenge, "admitted" | "rules">): string[] {
  const variants = describeVariantRule(challenge.rules);
  const chips = challenge.admitted.map((group) => joinOr(group.traits));
  if (variants) chips.push(variants);
  return chips.length > 0 ? chips : ["Tutti i personaggi"];
}

/** Matches the player can still start today; null without a limit. */
export function playsLeft(challenge: Pick<Challenge, "daily_limit" | "plays_today">): number | null {
  return challenge.daily_limit === null ? null : Math.max(0, challenge.daily_limit - challenge.plays_today);
}

/**
 * Does a character pass the rarity, faction and trait rules? null until the trait catalog
 * arrives, when the rules ask for traits.
 */
export function cardFitsChallenge(card: CatalogCard, rules: ChallengeRules, traits: TraitIndex | null): boolean | null {
  if (rules.traits.length > 0 && !traits) return null;
  try {
    return admittedByChallenge(
      { rarity: card.rarity.code, faction: card.faction, traits: traits?.byCard.get(card.id) ?? [] },
      rules,
      traits ? traitCategoryOf(traits.catalog) : () => undefined,
    );
  } catch {
    // A trait the catalog no longer has: the server refuses the squad anyway.
    return false;
  }
}

/**
 * Where a player's collection stands: the admitted characters they own, and those of them
 * owned with a variant. null until the trait catalog arrives.
 */
export function ownedForChallenge(
  owned: readonly CatalogCard[],
  withVariant: (definitionId: string) => boolean,
  rules: ChallengeRules,
  traits: TraitIndex | null,
): { admitted: number; admittedWithVariant: number } | null {
  let admitted = 0;
  let admittedWithVariant = 0;
  for (const card of owned) {
    const fits = cardFitsChallenge(card, rules, traits);
    if (fits === null) return null;
    if (!fits) continue;
    admitted += 1;
    if (withVariant(card.id)) admittedWithVariant += 1;
  }
  return { admitted, admittedWithVariant };
}

/** How many copies of a squad must be variants. */
export function variantsNeeded(challenge: Pick<Challenge, "rules" | "team_size">): number {
  return challengeVariantsNeeded(toChallengeRules(challenge.rules), challenge.team_size);
}

/**
 * What the player lacks to field a squad, from the server's counts: null when they can (or
 * before the counts arrive), otherwise the sentence to show.
 */
export function missingForChallenge(
  challenge: Pick<Challenge, "my_characters" | "my_characters_with_variant" | "team_size" | "rules">,
): string | null {
  if (challenge.my_characters === null || challenge.my_characters_with_variant === null) return null;
  if (challenge.my_characters < challenge.team_size) {
    return `Ti servono ${challenge.team_size} personaggi adatti: ne hai ${challenge.my_characters}.`;
  }
  const needed = variantsNeeded(challenge);
  if (challenge.my_characters_with_variant < needed) {
    return `Ti servono ${needed} personaggi adatti con una variante: ne hai ${challenge.my_characters_with_variant}.`;
  }
  return null;
}

/** Why a character is out of a challenge: a few words for its tile, a sentence for the message. */
export type ChallengeExclusion = { short: string; long: string };

/**
 * Why a character cannot be in the squad; null when it can. hasVariant: the player owns it
 * with a variant (only "Solo varianti" asks it of every character). null traits: the trait
 * catalog has not arrived yet, and trait rules wait for it.
 */
export function whyNotAdmitted(
  card: CatalogCard,
  rules: ChallengeRules,
  traits: TraitIndex | null,
  hasVariant: boolean,
): ChallengeExclusion | null {
  if (rules.rarities.length > 0 && !rules.rarities.includes(card.rarity.code)) {
    return { short: `✗ ${card.rarity.name}`, long: `la rarità ${card.rarity.name} non è ammessa` };
  }
  if (rules.factions.length > 0 && !rules.factions.includes(card.faction)) {
    const faction = FACTION_LABELS[card.faction] ?? card.faction;
    return { short: `✗ ${faction}`, long: `la fazione ${faction} non è ammessa` };
  }
  if (cardFitsChallenge(card, { ...rules, rarities: [], factions: [] }, traits) === false) {
    return { short: "✗ Tratti", long: "i suoi tratti non sono ammessi" };
  }
  if (rules.allVariants && !hasVariant) return { short: "✗ Senza variante", long: "servono solo varianti e non ne hai" };
  return null;
}

/** The team screen of a challenge against a bot. */
export function challengeHref(challenge: Pick<Challenge, "id" | "format">, difficulty: BotDifficulty): string {
  const format = challenge.format === "classic" ? "" : `&format=${challenge.format}`;
  return `/squadra/?sfida=${challenge.id}${format}&difficulty=${difficulty}`;
}

/** The event points of a match: "20 · 10 · 5" (win, draw, loss). */
export function describeChallengePoints(points: ChallengeEventPoints): string {
  return `${points.win} · ${points.draw} · ${points.loss}`;
}
