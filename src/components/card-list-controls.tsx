"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Sheet } from "@/components/sheet";
import { TraitFilter } from "@/components/trait-filter";
import { FACTION_LABELS, fetchAbilities, fetchTraitIndex, seenAbilities, seenTraitIndex, type AbilityInfo } from "@/lib/catalog";
import {
  activeFilterCount,
  BASE_SORT_OPTIONS,
  DEFAULT_CARD_LIST_VIEW,
  readCardListView,
  traitSortOptions,
  type CardListView,
  type TraitIndex,
} from "@/lib/card-list";

type SortOption = { value: string; label: string };
type Rarity = { rank: number; name: string; color: string };

/** A list's view (order and filters), kept for this visit under `storageKey`. */
export function useCardListView(storageKey: string, fallback: CardListView = DEFAULT_CARD_LIST_VIEW) {
  const [view, setView] = useState<CardListView>(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      return saved ? readCardListView(JSON.parse(saved), fallback) : fallback;
    } catch {
      return fallback;
    }
  });

  function update(change: Partial<CardListView>) {
    const next = { ...view, ...change };
    setView(next);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // The view is a convenience: losing it is fine.
    }
  }

  return [view, update] as const;
}

/**
 * The abilities and the traits a card list sorts and filters by, fetched once per session. Until
 * they arrive (or if they cannot) the list still works, without those options.
 */
export function useCardListReference(): { abilities: AbilityInfo[]; traits: TraitIndex | null } {
  const [abilities, setAbilities] = useState<AbilityInfo[]>(() => seenAbilities() ?? []);
  const [traits, setTraits] = useState<TraitIndex | null>(seenTraitIndex);

  useEffect(() => {
    let cancelled = false;
    fetchAbilities()
      .then((list) => !cancelled && setAbilities(list))
      .catch(() => undefined);
    fetchTraitIndex()
      .then((index) => !cancelled && setTraits(index))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return { abilities, traits };
}

type CardListControlsProps = {
  view: CardListView;
  onChange: (change: Partial<CardListView>) => void;
  abilities: AbilityInfo[];
  traits: TraitIndex | null;
  /** The rarities present in the list, lowest first. */
  rarities: Rarity[];
  /** Orders only this list has, after the common ones (the album's "Copie"). */
  extraSorts?: SortOption[];
  /**
   * "inline": rarity and faction as rows of chips, traits behind a button (the album, which scrolls).
   * "compact": one line, every filter behind a button (the team pickers, where the cards need the room).
   */
  layout: "inline" | "compact";
};

/** Order and filters of a card list: the album and every team picker use these same controls. */
export function CardListControls({ view, onChange, abilities, traits, rarities, extraSorts = [], layout }: CardListControlsProps) {
  const sortSheet = useRef<HTMLDialogElement>(null);
  const filterSheet = useRef<HTMLDialogElement>(null);
  const abilityOptions = abilities.map((ability) => ({ value: `ability:${ability.code}`, label: ability.name }));
  const traitOptions = traits ? traitSortOptions(traits.catalog) : [];
  const sortOptions = [...BASE_SORT_OPTIONS, ...extraSorts];
  const current =
    [...sortOptions, ...traitOptions, ...abilityOptions].find((option) => option.value === view.sort) ?? sortOptions[0];
  const compact = layout === "compact";
  const filters = compact ? activeFilterCount(view) : view.traits.length;
  const filterLabel = compact ? "Filtri" : "Tratti";

  function chooseSort(sort: string) {
    onChange({ sort });
    sortSheet.current?.close();
  }

  const sortChips = (list: SortOption[]) => (
    <div className="flex flex-wrap gap-1.5">
      {list.map((option) => (
        <Chip key={option.value} active={option.value === current.value} onClick={() => chooseSort(option.value)}>
          {option.label}
        </Chip>
      ))}
    </div>
  );

  const rarityChips = (
    <>
      <Chip active={view.rarity === null} onClick={() => onChange({ rarity: null })}>
        Ogni rarità
      </Chip>
      {rarities.map((rarity) => (
        <Chip key={rarity.rank} active={view.rarity === rarity.rank} color={rarity.color} onClick={() => onChange({ rarity: rarity.rank })}>
          {rarity.name}
        </Chip>
      ))}
    </>
  );
  const factionChips = (
    <>
      <Chip active={view.faction === null} onClick={() => onChange({ faction: null })}>
        Ogni fazione
      </Chip>
      {Object.entries(FACTION_LABELS).map(([code, label]) => (
        <Chip key={code} active={view.faction === code} onClick={() => onChange({ faction: code })}>
          {label}
        </Chip>
      ))}
    </>
  );

  return (
    <div className="flex flex-col gap-2">
      {!compact && (
        <>
          <ChipRow>{rarityChips}</ChipRow>
          <ChipRow>{factionChips}</ChipRow>
        </>
      )}
      <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-muted">
        {!compact && <span className="shrink-0">Ordina per</span>}
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={`Ordina per: ${current.label}`}
          onClick={() => sortSheet.current?.showModal()}
          className="input-comic flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 text-left text-foreground"
        >
          <span className="truncate">
            {compact && <span className="text-muted">Ordina: </span>}
            {current.label}
          </span>
          <span aria-hidden className="text-comic-yellow">
            ▾
          </span>
        </button>
        {(compact || traits) && (
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => filterSheet.current?.showModal()}
            className={`flex min-h-11 shrink-0 items-center gap-1.5 border-2 px-3 text-sm font-bold ${
              filters > 0 ? "border-comic-cyan text-comic-cyan" : "border-line text-foreground"
            }`}
          >
            {filterLabel}
            {filters > 0 && <span className="bg-comic-cyan px-1.5 text-xs font-extrabold leading-[18px] text-black">{filters}</span>}
          </button>
        )}
      </div>

      <Sheet sheetRef={sortSheet} title="Ordina per">
        {sortChips(sortOptions)}
        {traitOptions.length > 0 && (
          <>
            <h3 className="section-title">Tratti (raggruppati)</h3>
            {sortChips(traitOptions)}
          </>
        )}
        {abilityOptions.length > 0 && (
          <>
            <h3 className="section-title">Abilità (dalla più alta)</h3>
            {sortChips(abilityOptions)}
          </>
        )}
      </Sheet>

      <Sheet sheetRef={filterSheet} title={filterLabel}>
        {compact && (
          <>
            <h3 className="section-title">Rarità</h3>
            <div className="flex flex-wrap gap-1.5">{rarityChips}</div>
            <h3 className="section-title">Fazione</h3>
            <div className="flex flex-wrap gap-1.5">{factionChips}</div>
          </>
        )}
        {traits ? (
          <>
            {compact && <h3 className="section-title">Tratti</h3>}
            <TraitFilter
              catalog={traits.catalog}
              chosen={view.traits}
              onChange={(next) => onChange({ traits: next })}
              layout="wrap"
              label="Filtra per tratto"
            />
            <p className="text-xs font-medium text-muted">
              Nella stessa categoria basta uno dei tratti scelti; tra categorie diverse servono tutti.
            </p>
          </>
        ) : (
          <p className="text-sm font-medium text-muted">Tratti non disponibili al momento.</p>
        )}
        <button
          type="button"
          disabled={filters === 0}
          onClick={() => onChange(compact ? { rarity: null, faction: null, traits: [] } : { traits: [] })}
          className="btn btn-ghost self-start disabled:opacity-50"
        >
          Azzera
        </button>
      </Sheet>
    </div>
  );
}

/** The heading of a group of cards when a list is sorted by trait: "Mito · 12". */
export function CardGroupHeading({ label, count }: { label: string; count: number }) {
  return (
    <h3 className="flex items-baseline gap-1.5 font-display text-lg uppercase leading-6 text-comic-cyan">
      {label}
      <span className="text-sm text-muted">· {count}</span>
    </h3>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">{children}</div>;
}

export function Chip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`btn shrink-0 border-2 px-3 text-sm font-bold ${active ? "border-transparent text-black" : "border-line bg-panel"}`}
      style={active ? { backgroundColor: color ?? "var(--comic-yellow)" } : color ? { color, borderColor: color } : undefined}
    >
      {children}
    </button>
  );
}
