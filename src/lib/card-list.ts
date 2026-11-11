import { matchesTraits, type TraitCategory } from "@/lib/traits";

/**
 * How a player's card list is shown: the album and every team picker share it. Pure, so the
 * album and the pickers order and filter exactly alike.
 */
export type CardListView = {
  /** "number", "rarity", "name", "ability:<code>", "trait:<category code>", or a key of the list's extra sorts. */
  sort: string;
  rarity: number | null;
  faction: string | null;
  /** Trait codes: within a category any of them, across categories all (like the events). */
  traits: string[];
};

export const DEFAULT_CARD_LIST_VIEW: CardListView = { sort: "number", rarity: null, faction: null, traits: [] };

/** The traits of every character and the trait catalog, as the client reads them. */
export type TraitIndex = { catalog: TraitCategory[]; byCard: Map<string, string[]> };

type ListCard = {
  id: string;
  code: string;
  name: string;
  faction: string;
  stats: Record<string, number>;
  rarity: { rank: number };
};

export type CardSorter<T> = (a: T, b: T) => number;

export const BASE_SORT_OPTIONS = [
  { value: "number", label: "Numero" },
  { value: "rarity", label: "Rarità" },
  { value: "name", label: "Nome" },
];

const collator = new Intl.Collator("it", { sensitivity: "base", numeric: true });

const byNumber = (a: ListCard, b: ListCard) => collator.compare(a.code, b.code);
const byRarity = (a: ListCard, b: ListCard) => b.rarity.rank - a.rarity.rank || byNumber(a, b);

export function sortAbilityOf(sort: string): string | null {
  return sort.startsWith("ability:") ? sort.slice("ability:".length) : null;
}

export function sortTraitCategoryOf(sort: string): string | null {
  return sort.startsWith("trait:") ? sort.slice("trait:".length) : null;
}

/** The traits a list can sort by: one option per category ("Origine", "Natura", "Gruppo"). */
export function traitSortOptions(catalog: TraitCategory[]): { value: string; label: string }[] {
  return catalog.map((category) => ({ value: `trait:${category.code}`, label: category.name }));
}

/** Position of the card's first trait in a category, in catalog order; cards without one go last. */
function traitPosition(card: ListCard, category: TraitCategory | undefined, index: TraitIndex | null): number {
  if (!category || !index) return Number.POSITIVE_INFINITY;
  const held = index.byCard.get(card.id) ?? [];
  const position = category.traits.findIndex((trait) => held.includes(trait.code));
  return position < 0 ? Number.POSITIVE_INFINITY : position;
}

/** The cards that pass the view's filters, in its order. Ties always fall back to rarity, then number. */
export function applyCardListView<T extends ListCard>(
  cards: readonly T[],
  view: CardListView,
  traits: TraitIndex | null,
  extraSorts: Record<string, CardSorter<T>> = {},
): T[] {
  const kept = cards.filter(
    (card) =>
      (view.rarity === null || card.rarity.rank === view.rarity) &&
      (view.faction === null || card.faction === view.faction) &&
      (view.traits.length === 0 ||
        !traits ||
        matchesTraits(traits.byCard.get(card.id) ?? [], view.traits, traits.catalog)),
  );
  const ability = sortAbilityOf(view.sort);
  const categoryCode = sortTraitCategoryOf(view.sort);
  const category = traits?.catalog.find((entry) => entry.code === categoryCode);
  let sorter: CardSorter<T>;
  if (ability) sorter = (a, b) => (b.stats[ability] ?? 0) - (a.stats[ability] ?? 0) || byRarity(a, b);
  else if (categoryCode)
    sorter = (a, b) => traitPosition(a, category, traits) - traitPosition(b, category, traits) || byRarity(a, b);
  else if (extraSorts[view.sort]) sorter = extraSorts[view.sort];
  else if (view.sort === "rarity") sorter = byRarity;
  else if (view.sort === "name") sorter = (a, b) => collator.compare(a.name, b.name) || byNumber(a, b);
  else sorter = byNumber;
  return kept.sort(sorter);
}

export type CardGroup<T> = { key: string; label: string | null; cards: T[] };

/**
 * Sorted by a trait category, the list splits into one group per trait ("Mito · 12"); any other
 * order is one group without a label. Cards keep the order they come in.
 */
export function groupCardList<T extends ListCard>(cards: readonly T[], sort: string, traits: TraitIndex | null): CardGroup<T>[] {
  const category = traits?.catalog.find((entry) => entry.code === sortTraitCategoryOf(sort));
  if (!category || !traits) return [{ key: "all", label: null, cards: [...cards] }];
  const groups: CardGroup<T>[] = [];
  for (const card of cards) {
    const held = traits.byCard.get(card.id) ?? [];
    const trait = category.traits.find((entry) => held.includes(entry.code));
    const key = trait?.code ?? "none";
    const last = groups.at(-1);
    if (last?.key === key) last.cards.push(card);
    else groups.push({ key, label: trait?.name ?? `Senza ${category.name.toLowerCase()}`, cards: [card] });
  }
  return groups;
}

/** How many filters the view narrows by: shown on the filters button. */
export function activeFilterCount(view: CardListView): number {
  return (view.rarity === null ? 0 : 1) + (view.faction === null ? 0 : 1) + view.traits.length;
}

/** A saved view, from storage: anything unreadable falls back to the defaults. */
export function readCardListView(saved: unknown, fallback: CardListView = DEFAULT_CARD_LIST_VIEW): CardListView {
  if (!saved || typeof saved !== "object") return fallback;
  const value = saved as Partial<Record<keyof CardListView, unknown>>;
  return {
    sort: typeof value.sort === "string" ? value.sort : fallback.sort,
    rarity: typeof value.rarity === "number" ? value.rarity : null,
    faction: typeof value.faction === "string" ? value.faction : null,
    traits: Array.isArray(value.traits) ? value.traits.filter((code): code is string => typeof code === "string") : [],
  };
}
