"use client";

import { useRef, useState } from "react";
import { CardSortToggle } from "@/components/card-sort-toggle";
import { PageHeader } from "@/components/comic-parts";
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

const CHIP = "flex min-h-11 shrink-0 items-center gap-1.5 border-2 px-3 text-sm font-bold";

/** Ticks the cards packs can give; every change is saved on the server at once. */
export function PackPoolAdmin({ initial }: { initial: PackPool }) {
  const [pool, setPool] = useState(initial);
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<CardOrder>("name");
  const [rarityFilter, setRarityFilter] = useState<string | null>(null);
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

  const found = sortCards(searchCards(pool.cards, query), order);
  const shownRarities = pool.rarities.filter((rarity) => rarityFilter === null || rarity.code === rarityFilter);
  const inPacks = pool.cards.filter((card) => card.in_packs).length;

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
      <PageHeader
        title="Carte nei pacchetti"
        subtitle={`${inPacks} carte su ${pool.cards.length} possono uscire nei pacchetti.`}
      />
      <main className="flex flex-1 flex-col gap-4 px-3 pb-6">
        <p className="text-sm font-medium text-muted">
          Togli la spunta per tenere una carta fuori dai pacchetti; puoi sempre darla con un codice bonus. Le carte
          dei livelli non escono mai e non sono in elenco. Le varianti seguono la loro carta.
        </p>
        <div className="flex gap-2">
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
        <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1" role="group" aria-label="Filtra per rarità">
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
        <div aria-live="polite">{error && <p className="text-sm font-bold text-comic-magenta">{error}</p>}</div>
        {shownRarities.map((rarity) => (
          <RaritySection
            key={rarity.code}
            rarity={rarity}
            allCards={pool.cards}
            shown={found.filter((card) => card.rarity_code === rarity.code)}
            searching={query.trim() !== ""}
            guaranteed={rarity.rank >= pool.guaranteed_min_rarity_rank}
            onApply={apply}
          />
        ))}
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
    <section className="flex flex-col gap-2" aria-labelledby={`rarity-${rarity.code}`}>
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
