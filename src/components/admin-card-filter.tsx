"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chip } from "@/components/card-list-controls";
import { CardSortToggle } from "@/components/card-sort-toggle";
import { Sheet } from "@/components/sheet";
import { TraitFilter } from "@/components/trait-filter";
import {
  activeAdminFilterCount,
  addAllCards,
  countBy,
  countByStyle,
  describeAdminCardFilter,
  EMPTY_ADMIN_CARD_FILTER,
  FACTION_CODES,
  filterAdminCards,
  toggleValue,
  withCardFacts,
  type AdminCardFilter,
  type FilterableCard,
  type FilterRarity,
  type FilterStyle,
} from "@/lib/admin-card-filter";
import { FACTION_LABELS, fetchAdminCardReference, type AdminCardReference } from "@/lib/catalog";
import { sortCards, type CardOrder } from "@/lib/card-sort";
import type { TraitCategory } from "@/lib/traits";

/**
 * Rarity, faction and traits of every card from the public catalog, for pickers whose admin
 * payload sends only names. Null until it arrives (or if it cannot): the pickers still work,
 * with the search alone.
 */
export function useAdminCardReference(): AdminCardReference | null {
  const [reference, setReference] = useState<AdminCardReference | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchAdminCardReference()
      .then((next) => !cancelled && setReference(next))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return reference;
}

type FilterBarProps<T extends FilterableCard> = {
  /** Every card the picker offers, with the facts to filter by. */
  cards: readonly T[];
  filter: AdminCardFilter;
  onChange: (next: AdminCardFilter) => void;
  rarities: FilterRarity[];
  catalog: TraitCategory[];
  /** How many cards pass the filter, shown under the search. */
  matching: number;
  order?: CardOrder;
  onOrder?: (next: CardOrder) => void;
  /** Accessible name of the search field. */
  searchLabel?: string;
  /** The variant styles to filter by, with their names; none: no style filter. */
  styles?: readonly FilterStyle[];
};

/**
 * Search on one line, with the sort and a «Filtri» button that opens rarity, faction, traits and
 * variant styles in a sheet; under it how many cards match and what is chosen. Fits the admin pages that never
 * scroll: two lines, whatever the filter.
 */
export function AdminCardFilterBar<T extends FilterableCard>({
  cards,
  filter,
  onChange,
  rarities,
  catalog,
  matching,
  order,
  onOrder,
  searchLabel = "Cerca una carta",
  styles = [],
}: FilterBarProps<T>) {
  const sheet = useRef<HTMLDialogElement>(null);
  const active = activeAdminFilterCount(filter);
  const byRarity = useMemo(() => countBy(cards, "rarity_code"), [cards]);
  const byFaction = useMemo(() => countBy(cards, "faction"), [cards]);
  const byStyle = useMemo(() => countByStyle(cards), [cards]);
  const shownRarities = rarities.filter((rarity) => byRarity.has(rarity.code));
  const shownStyles = styles.filter((entry) => byStyle.has(entry.style));
  const summary = describeAdminCardFilter(filter, rarities, catalog, styles);
  const set = (change: Partial<AdminCardFilter>) => onChange({ ...filter, ...change });

  return (
    <div className="flex shrink-0 flex-col gap-1">
      <div className="flex gap-2">
        <input
          type="search"
          value={filter.query}
          onChange={(event) => set({ query: event.target.value })}
          placeholder="Nome o numero"
          aria-label={searchLabel}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="input-comic min-w-0 flex-1 placeholder:text-faint"
        />
        {order && onOrder && <CardSortToggle order={order} onChange={onOrder} />}
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => sheet.current?.showModal()}
          className={`flex min-h-11 shrink-0 items-center gap-1.5 border-2 px-3 text-sm font-bold ${
            active > 0 ? "border-comic-cyan text-comic-cyan" : "border-line text-foreground"
          }`}
        >
          Filtri
          {active > 0 && <span className="bg-comic-cyan px-1.5 text-xs font-extrabold leading-[18px] text-black">{active}</span>}
        </button>
      </div>
      <p className="flex min-w-0 items-baseline gap-2 text-xs font-semibold leading-4 text-muted" aria-live="polite">
        <span className="min-w-0 truncate">
          <span className="font-extrabold text-foreground">{matching === 1 ? "1 carta" : `${matching} carte`}</span>
          {summary ? ` · ${summary}` : " · tutte le rarità, fazioni e tratti"}
        </span>
        {(active > 0 || filter.query) && (
          <button type="button" onClick={() => onChange(EMPTY_ADMIN_CARD_FILTER)} className="shrink-0 font-bold underline">
            Azzera
          </button>
        )}
      </p>

      <Sheet sheetRef={sheet} title="Filtri carte">
        <h3 className="section-title">Rarità</h3>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Rarità">
          {shownRarities.map((rarity) => (
            <Chip
              key={rarity.code}
              active={filter.rarities.includes(rarity.code)}
              color={rarity.color}
              onClick={() => set({ rarities: toggleValue(filter.rarities, rarity.code) })}
            >
              {rarity.name} <span className="font-semibold opacity-75">{byRarity.get(rarity.code)}</span>
            </Chip>
          ))}
        </div>
        <h3 className="section-title">Fazione</h3>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Fazione">
          {FACTION_CODES.filter((code) => byFaction.has(code)).map((code) => (
            <Chip key={code} active={filter.factions.includes(code)} onClick={() => set({ factions: toggleValue(filter.factions, code) })}>
              {FACTION_LABELS[code]} <span className="font-semibold opacity-75">{byFaction.get(code)}</span>
            </Chip>
          ))}
        </div>
        {catalog.length > 0 && (
          <>
            <h3 className="section-title">Tratti</h3>
            <TraitFilter
              catalog={catalog}
              chosen={filter.traits}
              onChange={(traits) => set({ traits })}
              layout="wrap"
              label="Filtra per tratto"
            />
          </>
        )}
        {shownStyles.length > 0 && (
          <>
            <h3 className="section-title">Stile della variante</h3>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Stile della variante">
              {shownStyles.map((entry) => (
                <Chip
                  key={entry.style}
                  active={filter.styles.includes(entry.style)}
                  onClick={() => set({ styles: toggleValue(filter.styles, entry.style) })}
                >
                  ★ {entry.name} <span className="font-semibold opacity-75">{byStyle.get(entry.style)}</span>
                </Chip>
              ))}
            </div>
          </>
        )}
        {shownRarities.length === 0 && catalog.length === 0 && (
          <p className="text-sm font-medium text-muted">Rarità, fazioni e tratti non disponibili al momento: resta la ricerca.</p>
        )}
        <p className="text-xs font-medium text-muted">
          Più scelte nello stesso gruppo: basta una. Tra gruppi diversi (rarità, fazione, ogni tipo di tratto, stile) servono
          tutte.
        </p>
        <div className="sticky bottom-0 flex items-center gap-2 bg-background py-2">
          <button
            type="button"
            disabled={active === 0}
            onClick={() => onChange({ ...EMPTY_ADMIN_CARD_FILTER, query: filter.query })}
            className="btn btn-ghost disabled:opacity-50"
          >
            Azzera
          </button>
          <button type="button" onClick={() => sheet.current?.close()} className="btn btn-primary flex-1">
            Mostra {matching === 1 ? "1 carta" : `${matching} carte`}
          </button>
        </div>
      </Sheet>
    </div>
  );
}

type PickerCard = FilterableCard & { rarity?: string; variants: { style: string; name: string }[] };

type CardPickerProps = {
  /** The cards the server lets this reward hold (its payload: name, rarity name, variants). */
  cards: readonly PickerCard[];
  /** The cards already chosen: codes, or "code:style" for a variant. */
  chosen: readonly string[];
  onChange: (next: string[]) => void;
  /** The most the server accepts; none: no limit. */
  max?: number;
  reference: AdminCardReference | null;
  /** Traits from the admin payload when the public catalog has not arrived yet. */
  fallbackCatalog?: TraitCategory[];
  label: string;
};

/**
 * Adds reward cards: one at a time from a menu (a card with variants asks for its drawing), or
 * every card that passes the filter at once, in its base drawing, up to the server's limit.
 */
export function AdminCardPicker({ cards, chosen, onChange, max, reference, fallbackCatalog = [], label }: CardPickerProps) {
  const [filter, setFilter] = useState<AdminCardFilter>(EMPTY_ADMIN_CARD_FILTER);
  const [order, setOrder] = useState<CardOrder>("name");
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [pendingStyle, setPendingStyle] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const catalog = reference?.catalog ?? fallbackCatalog;
  // The styles come from each card's variants, which the reward payloads already send.
  const enriched = useMemo(
    () =>
      withCardFacts(cards, reference?.facts ?? null).map((card) => ({
        ...card,
        variant_styles: card.variants.map((variant) => variant.style),
      })),
    [cards, reference],
  );
  const styles = useMemo(() => variantStylesOf(cards), [cards]);
  const found = sortCards(filterAdminCards(enriched, filter, catalog), order);
  const pending = cards.find((card) => card.code === pendingCode) ?? null;
  const full = max !== undefined && chosen.length >= max;
  const fresh = found.filter((card) => !chosen.includes(card.code));

  /** One card, even one already chosen (two copies are two rewards), while there is room. */
  function addOne(code: string) {
    if (full) return;
    onChange([...chosen, code]);
    setNotice(null);
  }

  function addAll(codes: string[]) {
    const result = addAllCards(chosen, codes, max);
    onChange(result.next);
    setNotice(
      result.left > 0
        ? `Aggiunte ${result.added}: il massimo è ${max} carte, ${result.left} sono rimaste fuori.`
        : `Aggiunte ${result.added} carte.`,
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-bold">
        {label}
        {max !== undefined && <span className="font-semibold text-muted"> · {chosen.length} di {max} al massimo</span>}
      </span>
      <AdminCardFilterBar
        cards={enriched}
        filter={filter}
        onChange={setFilter}
        rarities={reference?.rarities ?? []}
        catalog={catalog}
        matching={found.length}
        order={order}
        onOrder={setOrder}
        searchLabel={`Cerca una carta da aggiungere: ${label}`}
        styles={styles}
      />
      <select
        value=""
        aria-label={`Aggiungi una carta: ${label}`}
        disabled={full || found.length === 0}
        onChange={(event) => {
          const picked = cards.find((card) => card.code === event.target.value);
          if (!picked) return;
          // A card with variants waits for the choice of drawing.
          if (picked.variants.length > 0) setPendingCode(picked.code);
          else addOne(picked.code);
        }}
        className="min-h-12 w-full min-w-0 border-2 border-comic-yellow bg-black px-3 text-base font-semibold disabled:opacity-50"
      >
        <option value="">
          {full ? "Massimo raggiunto" : found.length === 0 ? "Nessuna carta trovata" : `Aggiungi una carta… (${found.length})`}
        </option>
        {found.map((card) => (
          <option key={card.code} value={card.code}>
            {order === "number"
              ? `${card.code} · ${card.name}${card.rarity ? ` (${card.rarity})` : ""}`
              : `${card.name}${card.rarity ? ` (${card.rarity})` : ""} · ${card.code}`}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => addAll(fresh.map((card) => card.code))}
        disabled={full || fresh.length === 0}
        className="btn btn-ghost disabled:opacity-50"
      >
        {fresh.length === 0
          ? "Tutte le trovate sono già scelte"
          : fresh.length === found.length
            ? `Aggiungi tutte le ${found.length} trovate`
            : `Aggiungi le ${fresh.length} trovate non ancora scelte`}
      </button>
      {notice && <p className="text-xs font-bold text-comic-cyan">{notice}</p>}
      {pending && (
        <div className="flex flex-col gap-2 bg-black/40 p-3">
          <label className="flex min-w-0 flex-col gap-1 text-sm font-bold">
            Disegno di {pending.name}
            <select
              value={pendingStyle}
              onChange={(event) => setPendingStyle(event.target.value)}
              className="min-h-12 w-full min-w-0 border-2 border-comic-yellow bg-black px-3 text-base font-semibold"
            >
              <option value="">Base</option>
              {pending.variants.map((variant) => (
                <option key={variant.style} value={variant.style}>
                  Variante {variant.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                addOne(pendingStyle ? `${pending.code}:${pendingStyle}` : pending.code);
                setPendingCode(null);
                setPendingStyle("");
              }}
              className="btn btn-primary flex-1"
            >
              Aggiungi
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingCode(null);
                setPendingStyle("");
              }}
              className="btn btn-ghost"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Every variant style among the cards, by name: the style filter's chips. */
function variantStylesOf(cards: readonly PickerCard[]): FilterStyle[] {
  const byStyle = new Map<string, string>();
  for (const card of cards) for (const variant of card.variants) byStyle.set(variant.style, variant.name);
  return [...byStyle].map(([style, name]) => ({ style, name })).sort((a, b) => a.name.localeCompare(b.name, "it"));
}
