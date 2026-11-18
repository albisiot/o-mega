import { searchCards } from "@/lib/card-sort";
import { FACTION_LABELS } from "@/lib/catalog";
import { describeTraits, matchesTraits, type TraitCategory } from "@/lib/traits";

/**
 * The filter every card picker of the admin pages shares: search, rarity, faction, traits and
 * variant styles, all combined. Within rarities, factions or a trait category any chosen value passes; across
 * them all must (the same rule as the collection and the server's card_matches_traits).
 */
export type AdminCardFilter = {
  query: string;
  /** Rarity codes ("delta", "omega"…); empty: every rarity. */
  rarities: string[];
  /** Faction codes ("heroes", "villains", "neutrals"); empty: every faction. */
  factions: string[];
  /** Trait codes; empty: every trait. */
  traits: string[];
  /** Variant styles ("neon"…): a card with a variant of any of them passes; empty: every card. */
  styles: string[];
};

export const EMPTY_ADMIN_CARD_FILTER: AdminCardFilter = { query: "", rarities: [], factions: [], traits: [], styles: [] };

/** What a card needs to be filtered; any missing fact lets the card through that part. */
export type FilterableCard = {
  code: string;
  name: string;
  rarity_code?: string | null;
  faction?: string | null;
  traits?: readonly string[] | null;
  /** The styles of the card's variants. */
  variant_styles?: readonly string[] | null;
};

export type CardFacts = { rarity_code: string; faction: string; traits: string[] };

export type FilterRarity = { code: string; name: string; rank: number; color: string };

export const FACTION_CODES = Object.keys(FACTION_LABELS);

/** Whether a card passes every part of the filter (the search included). */
export function matchesAdminCardFilter(card: FilterableCard, filter: AdminCardFilter, catalog: TraitCategory[]): boolean {
  return (
    (filter.rarities.length === 0 || (card.rarity_code != null && filter.rarities.includes(card.rarity_code))) &&
    (filter.factions.length === 0 || (card.faction != null && filter.factions.includes(card.faction))) &&
    matchesTraits(card.traits ?? [], filter.traits, catalog) &&
    (filter.styles.length === 0 || (card.variant_styles ?? []).some((style) => filter.styles.includes(style))) &&
    searchCards([card], filter.query).length === 1
  );
}

/** The cards that pass the filter, in the list's order. */
export function filterAdminCards<T extends FilterableCard>(cards: readonly T[], filter: AdminCardFilter, catalog: TraitCategory[]): T[] {
  return cards.filter((card) => matchesAdminCardFilter(card, filter, catalog));
}

/** How many filter parts are on, the search left out (it has its own field). */
export function activeAdminFilterCount(filter: AdminCardFilter): number {
  return filter.rarities.length + filter.factions.length + filter.traits.length + filter.styles.length;
}

/** The list with one more value, or one less. */
export function toggleValue(list: readonly string[], value: string): string[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

/** A variant style as the filter names it: its code and its Italian name. */
export type FilterStyle = { style: string; name: string };

/**
 * "Delta o Gamma · Eroi · Mito · variante Neon o Tarocco": the filter as one line, rarities in rank order;
 * "" when nothing is chosen.
 */
export function describeAdminCardFilter(
  filter: AdminCardFilter,
  rarities: FilterRarity[],
  catalog: TraitCategory[],
  styles: readonly FilterStyle[] = [],
): string {
  const rarityPart = [...rarities]
    .sort((a, b) => a.rank - b.rank)
    .filter((rarity) => filter.rarities.includes(rarity.code))
    .map((rarity) => rarity.name)
    .join(" o ");
  const factionPart = FACTION_CODES.filter((code) => filter.factions.includes(code))
    .map((code) => FACTION_LABELS[code])
    .join(" o ");
  const styleNames = styles.filter((entry) => filter.styles.includes(entry.style)).map((entry) => entry.name);
  const stylePart = styleNames.length > 0 ? `variante ${styleNames.join(" o ")}` : "";
  return [rarityPart, factionPart, describeTraits(filter.traits, catalog), stylePart].filter(Boolean).join(" · ");
}

/**
 * Adds every given card not chosen yet, up to `max` chosen in all. Returns the new list, how many
 * were added and how many did not fit.
 */
export function addAllCards(
  chosen: readonly string[],
  matching: readonly string[],
  max: number = Number.POSITIVE_INFINITY,
): { next: string[]; added: number; left: number } {
  const have = new Set(chosen);
  const missing = matching.filter((code) => !have.has(code));
  const room = Math.max(0, max - chosen.length);
  const added = missing.slice(0, room);
  return { next: [...chosen, ...added], added: added.length, left: missing.length - added.length };
}

/**
 * The facts the server's admin payload left out (rarity code, faction, traits), filled from the
 * public catalog. What the payload has wins; cards the catalog does not know stay as they are.
 */
export function withCardFacts<T extends FilterableCard>(cards: readonly T[], facts: ReadonlyMap<string, CardFacts> | null): T[] {
  if (!facts) return [...cards];
  return cards.map((card) => {
    const known = facts.get(card.code);
    if (!known) return card;
    return {
      ...card,
      rarity_code: card.rarity_code ?? known.rarity_code,
      faction: card.faction ?? known.faction,
      traits: card.traits ?? known.traits,
    };
  });
}

/** How many of the cards have a variant of each style, for the chips. */
export function countByStyle<T extends FilterableCard>(cards: readonly T[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const card of cards) {
    for (const style of new Set(card.variant_styles ?? [])) counts.set(style, (counts.get(style) ?? 0) + 1);
  }
  return counts;
}

/** Counts by value, for the chips: how many of the cards have each rarity and each faction. */
export function countBy<T extends FilterableCard>(cards: readonly T[], key: "rarity_code" | "faction"): Map<string, number> {
  const counts = new Map<string, number>();
  for (const card of cards) {
    const value = card[key];
    if (value != null) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

/** Every variant style among the cards (the editors' payloads list each card's variants), by name. */
export function variantStylesOf(cards: readonly { variants: readonly { style: string; name: string }[] }[]): FilterStyle[] {
  const byStyle = new Map<string, string>();
  for (const card of cards) for (const variant of card.variants) byStyle.set(variant.style, variant.name);
  return [...byStyle].map(([style, name]) => ({ style, name })).sort((a, b) => a.name.localeCompare(b.name, "it"));
}
