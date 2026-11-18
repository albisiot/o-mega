import {
  admittedByChallenge,
  challengeVariantsNeeded,
  NO_CHALLENGE_RULES,
  type BotDifficulty,
  type ChallengeRules,
} from "@o-mega/game-engine";
import type { TraitIndex } from "@/lib/card-list";
import { FACTION_LABELS } from "@/lib/catalog";
import type { CatalogCard } from "@/lib/collection";
import { keepSeen, lastSeen } from "@/lib/last-seen";
import type { MatchFormat } from "@/lib/match";
import { describeRandomVariants, type RandomVariantsInfo, type RandomVariantsRule } from "@/lib/random-variants";
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
  /** Only variants of these styles count; empty: any. Missing from the first stage. */
  variant_styles?: string[];
  /** Character codes left out, or the only ones admitted; empty: no rule. */
  banned?: string[];
  only?: string[];
  /** No starter copies, no level cards. */
  no_starters?: boolean;
};

export type ChallengeEventPoints = { win: number; draw: number; loss: number };

/** A prize target: wins in the challenge, and what it gives. */
export type ChallengeTier = {
  tier: number;
  wins: number;
  coins: number;
  packs: number;
  cards: { name: string; variant?: { style: string; name: string } }[];
  /** "P051" or "P051:neon", for the admin's form. */
  card_codes: string[];
  /** As saved, for the admin's form; null: none. */
  random_variants: RandomVariantsRule | null;
  /** By name, for players; null: none. */
  random_variants_info: RandomVariantsInfo | null;
  reached: boolean;
  /** Players who reached it (the admin's list). */
  reached_by: number;
  /** The cards and packs it paid, shown with the pack reveal. */
  opening_ids: string[];
  seen: boolean;
};

export type Challenge = {
  id: string;
  title: string;
  description: string;
  /** '#rrggbb': the tag in Gioca and the band of its card. */
  color: string;
  format: MatchFormat;
  /** The bots players may choose, easiest first; none when it is online only. */
  bot_difficulties: BotDifficulty[];
  /** The bot plays only with characters the rules admit. */
  bot_follows_rules: boolean;
  /** Friendly online play: its own queue and friend codes. */
  online?: boolean;
  /** Players under this level cannot play it; null: any level. */
  min_level?: number | null;
  /** Quadrante: the seal target of its matches; null: none. */
  quadrant_seal_target?: number | null;
  rules: ChallengeRulesJson;
  /** Rarity, faction and trait rules as players read them: [{category: "Rarità", traits: ["Delta", "Gamma"]}]. */
  admitted: { category: string; traits: string[] }[];
  /** The names of the characters left out, or of the only ones admitted, and of the variant styles that count. */
  banned_names?: string[];
  only_names?: string[];
  variant_style_names?: string[];
  /** Characters of the catalog the rules admit. */
  admitted_characters: number;
  team_size: number;
  starts_at: string;
  ends_at: string;
  /** Matches a day; null: no limit. */
  daily_limit: number | null;
  plays_today: number;
  /** The player's characters the rules admit, and those of them they own with a variant that counts. */
  my_characters: number | null;
  my_characters_with_variant: number | null;
  my_level?: number | null;
  /** Wins of the player in the challenge, and its prize targets. */
  my_wins?: number;
  tiers?: ChallengeTier[];
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

/** A friend code in a challenge (online play); the guest learns the challenge from the code. */
export async function createChallengeLobby(
  challengeId: string,
  cardInstanceIds: string[],
): Promise<{ code: string; expires_at: string; format: MatchFormat }> {
  const { data, error } = await getSupabase().rpc("create_challenge_lobby", {
    p_challenge_id: challengeId,
    p_card_instance_ids: cardInstanceIds,
  });
  if (error) throw error;
  return data as unknown as { code: string; expires_at: string; format: MatchFormat };
}

/** The challenge of a friend code still valid; null for a code outside any challenge. */
export async function fetchLobbyChallenge(code: string): Promise<string | null> {
  const { data, error } = await getSupabase().rpc("get_lobby_challenge", { p_code: code });
  if (error) throw error;
  return (data as string | null) ?? null;
}

export async function markChallengeRewardsSeen(challengeId: string): Promise<void> {
  const { error } = await getSupabase().rpc("mark_challenge_rewards_seen", { p_challenge_id: challengeId });
  if (error) throw error;
}

/** The prize openings the player has not revealed yet. */
export function unseenChallengeOpenings(challenge: Pick<Challenge, "tiers">): string[] {
  return (challenge.tiers ?? []).filter((tier) => tier.reached && !tier.seen).flatMap((tier) => tier.opening_ids);
}

/** The rules for the engine's checks. */
export function toChallengeRules(rules: ChallengeRulesJson): ChallengeRules {
  return {
    rarities: rules.rarities,
    factions: rules.factions,
    traits: rules.traits,
    minVariants: rules.min_variants,
    allVariants: rules.all_variants,
    variantStyles: rules.variant_styles ?? [],
    banned: rules.banned ?? [],
    only: rules.only ?? [],
    noStarters: rules.no_starters ?? false,
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

/** The variant rule in words: "★ Solo varianti", "★ Almeno 2 varianti Neon"; null without one. */
export function describeVariantRule(
  rules: Pick<ChallengeRulesJson, "min_variants" | "all_variants">,
  styleNames: readonly string[] = [],
): string | null {
  const styles = styleNames.length > 0 ? ` ${joinOr(styleNames)}` : "";
  if (rules.all_variants) return `★ Solo varianti${styles}`;
  if (rules.min_variants <= 0) return null;
  return `★ Almeno ${rules.min_variants} ${rules.min_variants === 1 ? "variante" : "varianti"}${styles}`;
}

/** "Falx", "Falx e Groma", "Falx, Groma e altri 3". */
function listNames(names: readonly string[]): string {
  if (names.length <= 2) return names.join(" e ");
  return names.length === 3 ? `${names[0]}, ${names[1]} e ${names[2]}` : `${names[0]}, ${names[1]} e altri ${names.length - 2}`;
}

/** Every rule as a chip: "Delta o Gamma", "Cattivi", "Figli dell'Ultima", "★ Almeno 1 variante", "Senza starter". */
export function describeChallengeRules(
  challenge: Pick<Challenge, "admitted" | "rules" | "banned_names" | "only_names" | "variant_style_names">,
): string[] {
  const chips = challenge.admitted.map((group) => joinOr(group.traits));
  if (challenge.only_names && challenge.only_names.length > 0) chips.push(`Solo ${listNames(challenge.only_names)}`);
  if (challenge.banned_names && challenge.banned_names.length > 0) chips.push(`Senza ${listNames(challenge.banned_names)}`);
  const variants = describeVariantRule(challenge.rules, challenge.variant_style_names ?? []);
  if (variants) chips.push(variants);
  if (challenge.rules.no_starters) chips.push("Senza starter");
  return chips.length > 0 ? chips : ["Tutti i personaggi"];
}

/** Matches the player can still start today; null without a limit. */
export function playsLeft(challenge: Pick<Challenge, "daily_limit" | "plays_today">): number | null {
  return challenge.daily_limit === null ? null : Math.max(0, challenge.daily_limit - challenge.plays_today);
}

/** The facts of a character the rules look at. */
function characterOf(card: CatalogCard, traits: TraitIndex | null) {
  return {
    rarity: card.rarity.code,
    faction: card.faction,
    traits: traits?.byCard.get(card.id) ?? [],
    code: card.code,
    levelCard: card.unlockLevel !== null,
  };
}

/**
 * Does a character pass the rules of the character (rarity, faction, traits, the lists, level
 * cards)? null until the trait catalog arrives, when the rules ask for traits.
 */
export function cardFitsChallenge(card: CatalogCard, rules: ChallengeRules, traits: TraitIndex | null): boolean | null {
  if (rules.traits.length > 0 && !traits) return null;
  try {
    return admittedByChallenge(characterOf(card, traits), rules, traits ? traitCategoryOf(traits.catalog) : () => undefined);
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
 * What the player lacks to play, from the server's counts: null when they can (or before the
 * counts arrive), otherwise the sentence to show.
 */
export function missingForChallenge(
  challenge: Pick<Challenge, "my_characters" | "my_characters_with_variant" | "team_size" | "rules" | "min_level" | "my_level">,
): string | null {
  if (challenge.min_level != null && challenge.my_level != null && challenge.my_level < challenge.min_level) {
    return `Si gioca dal livello ${challenge.min_level}: tu sei al ${challenge.my_level}.`;
  }
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
 * with a variant that counts (only "Solo varianti" asks it of every character). null traits:
 * the trait catalog has not arrived yet, and trait rules wait for it.
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
  if (rules.banned.includes(card.code)) return { short: "✗ Esclusa", long: "è tra i personaggi esclusi" };
  if (rules.only.length > 0 && !rules.only.includes(card.code)) {
    return { short: "✗ Fuori elenco", long: "non è tra i personaggi della sfida" };
  }
  if (rules.noStarters && card.unlockLevel !== null) return { short: "✗ Di livello", long: "le carte di livello non sono ammesse" };
  if (cardFitsChallenge(card, { ...NO_CHALLENGE_RULES, traits: rules.traits }, traits) === false) {
    return { short: "✗ Tratti", long: "i suoi tratti non sono ammessi" };
  }
  if (rules.allVariants && !hasVariant) return { short: "✗ Senza variante", long: "servono solo varianti e non ne hai una adatta" };
  return null;
}

/** The team screen of a challenge against a bot. */
export function challengeHref(challenge: Pick<Challenge, "id" | "format">, difficulty: BotDifficulty): string {
  const format = challenge.format === "classic" ? "" : `&format=${challenge.format}`;
  return `/squadra/?sfida=${challenge.id}${format}&difficulty=${difficulty}`;
}

/** The team screen of a challenge online: a random player of the challenge, or a code for a friend. */
export function challengeOnlineHref(challenge: Pick<Challenge, "id" | "format">, mode: "queue" | "lobby"): string {
  const format = challenge.format === "classic" ? "" : `&format=${challenge.format}`;
  return `/squadra/?sfida=${challenge.id}&mode=${mode}${format}`;
}

/** The event points of a match: "20 · 10 · 5" (win, draw, loss). */
export function describeChallengePoints(points: ChallengeEventPoints): string {
  return `${points.win} · ${points.draw} · ${points.loss}`;
}

/** What a prize target gives, in a few words: "30 monete", "1 pacchetto + Falx", "2 varianti a caso". */
export function describeChallengeTierReward(tier: Pick<ChallengeTier, "coins" | "packs" | "cards" | "random_variants_info">): string {
  const parts = [
    tier.coins > 0 ? `${tier.coins} ${tier.coins === 1 ? "moneta" : "monete"}` : null,
    tier.packs > 0 ? `${tier.packs} ${tier.packs === 1 ? "pacchetto" : "pacchetti"}` : null,
    ...tier.cards.map((card) => (card.variant ? `${card.name} ${card.variant.name}` : card.name)),
    describeRandomVariants(tier.random_variants_info) || null,
  ].filter((part): part is string => part !== null);
  return parts.join(" + ");
}
