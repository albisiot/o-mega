"use client";

import { useRef, useState } from "react";
import { CardSortToggle } from "@/components/card-sort-toggle";
import { BackLink } from "@/components/comic-parts";
import { TraitFilter } from "@/components/trait-filter";
import { thumbArtUrl } from "@/lib/art";
import { withBasePath } from "@/lib/base-path";
import { searchCards, sortCards, type CardOrder } from "@/lib/card-sort";
import { describeServerError } from "@/lib/errors";
import {
  fetchPackPool,
  rarityCount,
  setCardsInPacks,
  type PackPool,
  type PackPoolCard,
  type PackPoolRarity,
} from "@/lib/pack-pool-admin";
import { matchesTraits } from "@/lib/traits";
import { useLockedScreen } from "@/lib/use-locked-screen";

const CHIP = "flex min-h-11 shrink-0 items-center gap-1.5 border-2 px-3 text-sm font-bold";

/**
 * Ticks the cards packs can give; every change is saved on the server at once. The page fits
 * the phone and never scrolls (see .game-shell): search and filters stay on top, and only the
 * list scrolls, inside its panel.
 */
export function PackPoolAdmin({ initial }: { initial: PackPool }) {
  useLockedScreen(true);
  const [pool, setPool] = useState(initial);
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<CardOrder>("name");
  const [rarityFilter, setRarityFilter] = useState<string | null>(null);
  const [traits, setTraits] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Only the answer to the latest change is shown: an older one would undo newer ticks.
  const latest = useRef(0);

  async function apply(codes: string[], inPacks: boolean) {
    if (codes.length === 0) return;
    const id = ++latest.current;
    setError(null);
    setPool((current) => ({
      ...current,
      cards: current.cards.map((card) => (codes.includes(card.code) ? { ...card, in_packs: inPacks } : card)),
    }));
    try {
      const next = await setCardsInPacks(codes, inPacks);
      if (id === latest.current) setPool(next);
    } catch (cause) {
      setError(describeServerError(cause));
      // Back to what the server has.
      try {
        const fresh = await fetchPackPool();
        if (id === latest.current) setPool(fresh);
      } catch {
        // The error above is already shown.
      }
    }
  }

  const found = sortCards(searchCards(pool.cards, query), order).filter((card) =>
    matchesTraits(card.traits ?? [], traits, pool.trait_catalog ?? []),
  );
  const shownRarities = pool.rarities.filter((rarity) => rarityFilter === null || rarity.code === rarityFilter);
  const inPacks = pool.cards.filter((card) => card.in_packs).length;

  return (
    <div className="game-shell">
      <header className="flex shrink-0 items-center gap-2.5 px-3 pb-1 pt-2">
        <BackLink href="/editor" label="Torna all'Editor" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-[28px] uppercase leading-8 text-comic-yellow">Carte nei pacchetti</h1>
          <p className="text-xs font-semibold leading-4 text-muted">
            {inPacks} carte su {pool.cards.length} possono uscire nei pacchetti.
          </p>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        <div className="flex shrink-0 gap-2">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca nome o numero"
            aria-label="Cerca una carta"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="input-comic min-w-0 flex-1 placeholder:text-faint"
          />
          <CardSortToggle order={order} onChange={setOrder} />
        </div>
        <div className="-mx-3 flex shrink-0 gap-1.5 overflow-x-auto px-3 pb-1" role="group" aria-label="Filtra per rarità">
          <button
            type="button"
            onClick={() => setRarityFilter(null)}
            aria-pressed={rarityFilter === null}
            className={`${CHIP} ${rarityFilter === null ? "border-comic-yellow text-comic-yellow" : "border-line"}`}
          >
            Tutte
          </button>
          {pool.rarities.map((rarity) => {
            const count = rarityCount(pool.cards, rarity.code);
            const active = rarityFilter === rarity.code;
            return (
              <button
                key={rarity.code}
                type="button"
                onClick={() => setRarityFilter(active ? null : rarity.code)}
                aria-pressed={active}
                className={CHIP}
                style={{ borderColor: active ? rarity.color : "var(--line)", color: active ? rarity.color : undefined }}
              >
                {rarity.name}
                <span className="text-xs font-semibold text-muted">
                  {count.inPacks}/{count.total}
                </span>
              </button>
            );
          })}
        </div>
        {/* Older servers send no catalog: the filter simply does not show. */}
        {(pool.trait_catalog ?? []).length > 0 && (
          <TraitFilter
            catalog={pool.trait_catalog ?? []}
            chosen={traits}
            onChange={setTraits}
            layout="row"
            label="Filtra per tratto"
          />
        )}
        <div aria-live="polite" className="shrink-0 empty:hidden">
          {error && <p className="text-sm font-bold text-comic-magenta">{error}</p>}
        </div>
        {/* The list is longer than any screen: it scrolls inside, the page stays still. */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain">
          <p className="text-xs font-medium leading-4 text-muted">
            Togli la spunta per tenere una carta fuori dai pacchetti; puoi sempre darla con un codice bonus. Le carte
            dei livelli non escono mai e non sono in elenco. Le varianti seguono la loro carta. Con la ricerca o i
            tratti, Seleziona e Deseleziona valgono solo per le carte trovate: in un tratto basta uno di quelli scelti,
            tra tratti di tipo diverso servono tutti.
          </p>
          {shownRarities.map((rarity) => (
            <RaritySection
              key={rarity.code}
              rarity={rarity}
              allCards={pool.cards}
              shown={found.filter((card) => card.rarity_code === rarity.code)}
              searching={query.trim() !== "" || traits.length > 0}
              guaranteed={rarity.rank >= pool.guaranteed_min_rarity_rank}
              onApply={apply}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

type RaritySectionProps = {
  rarity: PackPoolRarity;
  allCards: PackPoolCard[];
  shown: PackPoolCard[];
  searching: boolean;
  guaranteed: boolean;
  onApply: (codes: string[], inPacks: boolean) => void;
};

function RaritySection({ rarity, allCards, shown, searching, guaranteed, onApply }: RaritySectionProps) {
  const count = rarityCount(allCards, rarity.code);
  if (count.total === 0 || (searching && shown.length === 0)) return null;
  // While searching, the buttons act only on the cards found.
  const which = searching ? "trovate" : "tutte";

  return (
    <section className="flex shrink-0 flex-col gap-2" aria-labelledby={`rarity-${rarity.code}`}>
      <div className="flex items-baseline justify-between gap-2 border-b-2 pb-1" style={{ borderColor: rarity.color }}>
        <h2 id={`rarity-${rarity.code}`} className="section-title" style={{ color: rarity.color }}>
          {rarity.name}
        </h2>
        <p className="text-sm font-bold">
          {count.inPacks} su {count.total} nei pacchetti
        </p>
      </div>
      {count.inPacks === 0 && (
        <p className="bg-panel px-3 py-2 text-sm font-semibold text-comic-magenta">
          Nessuna carta {rarity.name} nei pacchetti: questa rarità non esce e la sua probabilità passa alle altre, anche
          nel Negozio.
          {guaranteed && " La carta garantita del pacchetto sarà di un'altra rarità."}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onApply(shown.filter((card) => !card.in_packs).map((card) => card.code), true)}
          disabled={shown.every((card) => card.in_packs)}
          className="btn btn-ghost disabled:opacity-50"
        >
          Seleziona {which}
        </button>
        <button
          type="button"
          onClick={() => onApply(shown.filter((card) => card.in_packs).map((card) => card.code), false)}
          disabled={shown.every((card) => !card.in_packs)}
          className="btn btn-ghost disabled:opacity-50"
        >
          Deseleziona {which}
        </button>
      </div>
      <ul className="flex flex-col gap-1">
        {shown.map((card) => (
          <li key={card.code}>
            <label className={`flex min-h-14 items-center gap-3 bg-panel py-1 pl-1 pr-3 ${card.in_packs ? "" : "opacity-60"}`}>
              <span aria-hidden className="relative h-12 w-9 shrink-0 overflow-hidden bg-panel-raised">
                {card.art_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={withBasePath(thumbArtUrl(card.art_url))}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover object-top"
                  />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-bold">{card.name}</span>
                <span className="text-xs font-semibold text-muted">{card.code}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs font-bold">
                Nei pacchetti
                <input
                  type="checkbox"
                  checked={card.in_packs}
                  onChange={(event) => onApply([card.code], event.target.checked)}
                  className="h-6 w-6 accent-comic-yellow"
                />
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
