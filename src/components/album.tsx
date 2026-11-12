"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CardGroupHeading,
  CardListControls,
  Chip,
  ChipRow,
  useCardListReference,
  useCardListView,
} from "@/components/card-list-controls";
import { CardName } from "@/components/card-name";
import { HoldToConfirmButton } from "@/components/hold-to-confirm-button";
import { CardArt, Silhouette, VariantTag } from "@/components/card-view";
import { clearAlbumScroll, saveAlbumScroll, savedAlbumScroll } from "@/lib/album-scroll";
import { cardEffects } from "@/lib/card-effects";
import { applyCardListView, groupCardList, sortAbilityOf } from "@/lib/card-list";
import type { AbilityInfo } from "@/lib/catalog";
import {
  convertAllDuplicates,
  ownedArt,
  type CatalogCard,
  type ConversionResult,
  type OwnedSummary,
} from "@/lib/collection";
import { describeServerError } from "@/lib/errors";
import { loadSeenCards, saveSeenCards } from "@/lib/new-cards";
import { rarityFrame } from "@/lib/rarity-theme";

type Ownership = "all" | "owned" | "missing";

const VIEW_KEY = "o-mega.album-view";
const OWNERSHIP_KEY = "o-mega.album-ownership";
const EXTRA_SORTS = [{ value: "copies", label: "Copie" }];

function loadOwnership(): Ownership {
  try {
    const saved = sessionStorage.getItem(OWNERSHIP_KEY);
    return saved === "owned" || saved === "missing" ? saved : "all";
  } catch {
    return "all";
  }
}

export function Album({
  catalog,
  owned,
  abilities,
  onChanged,
}: {
  catalog: CatalogCard[];
  owned: Map<string, OwnedSummary>;
  abilities: AbilityInfo[];
  onChanged: () => void;
}) {
  const [view, updateView] = useCardListView(VIEW_KEY);
  const [ownership, setOwnership] = useState<Ownership>(loadOwnership);
  const { traits } = useCardListReference();
  // Lives here: the conversion panel disappears once no duplicates are left.
  const [notice, setNotice] = useState<string | null>(null);
  // Read once: the badges stay for this whole visit, and the next one no longer shows them.
  const [seenBefore] = useState(loadSeenCards);

  useEffect(() => saveSeenCards([...owned.keys()]), [owned]);

  // Back from a card: the same place, also when the page was reloaded meanwhile.
  useEffect(() => {
    const y = savedAlbumScroll();
    if (y === null) return;
    // A frame later, so it runs after the router's own scroll.
    const frame = requestAnimationFrame(() => {
      window.scrollTo(0, y);
      clearAlbumScroll();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function chooseOwnership(next: Ownership) {
    setOwnership(next);
    try {
      sessionStorage.setItem(OWNERSHIP_KEY, next);
    } catch {
      // Filters are a convenience: losing them is fine.
    }
  }

  const sortAbility = sortAbilityOf(view.sort);

  const groups = useMemo(() => {
    const cards = catalog.filter((card) => ownership === "all" || (ownership === "owned") === owned.has(card.id));
    const copies = (card: CatalogCard) => owned.get(card.id)?.copies ?? 0;
    const sorted = applyCardListView(cards, view, traits, {
      copies: (a, b) => copies(b) - copies(a) || b.rarity.rank - a.rarity.rank || a.code.localeCompare(b.code),
    });
    return groupCardList(sorted, view.sort, traits);
  }, [catalog, owned, ownership, view, traits]);

  const rarities = useMemo(
    () => [...new Map(catalog.map((card) => [card.rarity.rank, card.rarity])).values()].sort((a, b) => a.rank - b.rank),
    [catalog],
  );
  const totalCards = [...owned.values()].reduce((sum, entry) => sum + entry.copies, 0);
  const convertible = catalog.reduce(
    (totals, card) => {
      const copies = owned.get(card.id)?.convertible_copies ?? 0;
      return { copies: totals.copies + copies, coins: totals.coins + copies * card.duplicateCoinValue };
    },
    { copies: 0, coins: 0 },
  );

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex flex-1 flex-col gap-3 px-3 pb-6 pt-2">
        <section className="cut-bottom bg-comic-cyan px-3.5 pb-5 pt-2.5 text-black">
          <div className="flex items-baseline justify-between gap-2">
            <h1 className="font-display text-[32px] uppercase leading-10">Collezione</h1>
            <p className="text-right text-sm font-extrabold">
              {owned.size}/{catalog.length} personaggi · {totalCards} carte
            </p>
          </div>
          <div className="mt-1 h-2 bg-black">
            <div
              className="h-full bg-foreground"
              style={{ width: `${(owned.size / Math.max(catalog.length, 1)) * 100}%` }}
            />
          </div>
          <Link href="/bestiario" className="mt-2 inline-flex min-h-9 items-center bg-black px-3 text-sm font-extrabold uppercase text-foreground">
            Bestiario delle Minacce →
          </Link>
        </section>

        {convertible.copies > 0 && (
          <ConvertAll
            convertible={convertible}
            onConverted={(result) => {
              setNotice(
                `Convertite ${result.converted} copie: +${result.coins} monete (saldo ${result.coin_balance}).`,
              );
              onChanged();
            }}
          />
        )}
        {notice && <p className="text-sm font-semibold text-comic-cyan">{notice}</p>}

        <section className="flex flex-col gap-2">
          <ChipRow>
            {(["all", "owned", "missing"] as const).map((value) => (
              <Chip key={value} active={ownership === value} onClick={() => chooseOwnership(value)}>
                {{ all: "Tutte", owned: "Possedute", missing: "Mancanti" }[value]}
              </Chip>
            ))}
          </ChipRow>
          <CardListControls
            view={view}
            onChange={updateView}
            abilities={abilities}
            traits={traits}
            rarities={rarities}
            extraSorts={EXTRA_SORTS}
            layout="inline"
          />
        </section>

        {groups[0].cards.length === 0 ? (
          <p className="py-8 text-center text-sm font-semibold text-muted">Nessuna carta con questi filtri.</p>
        ) : (
          groups.map((group) => (
            <section key={group.key} className="flex flex-col gap-1.5">
              {group.label && <CardGroupHeading label={group.label} count={group.cards.length} />}
              <ul className="grid grid-cols-3 gap-2">
                {group.cards.map((card) => (
                  <li key={card.id}>
                    <AlbumTile
                      card={card}
                      owned={owned.get(card.id) ?? null}
                      // Before the first visit nothing is new: an existing player's whole album would be.
                      isNew={seenBefore !== null && owned.has(card.id) && !seenBefore.has(card.id)}
                      sortAbility={sortAbility}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>
    </div>
  );
}

function AlbumTile({
  card,
  owned,
  isNew,
  sortAbility,
}: {
  card: CatalogCard;
  owned: OwnedSummary | null;
  isNew: boolean;
  sortAbility: string | null;
}) {
  const number = card.code.replace(/^\D+/, "");
  return (
    <Link
      href={`/carta/?id=${card.id}`}
      onClick={saveAlbumScroll}
      className="relative flex flex-col rounded-[7px] p-1"
      style={{ background: owned ? rarityFrame(card.rarity) : "var(--panel-raised)" }}
    >
      {owned && owned.copies > 1 && (
        <span className="absolute left-1.5 top-1.5 z-10 bg-black px-1.5 text-xs font-extrabold leading-[18px] text-comic-yellow">
          ×{owned.copies}
        </span>
      )}
      {isNew && (
        <span className="animate-new-pop absolute left-1.5 top-[76px] z-10 bg-comic-yellow px-1.5 font-sfx text-sm leading-[18px] tracking-wide text-black shadow-[2px_2px_0_var(--comic-magenta)]">
          NEW!
        </span>
      )}
      {owned ? (
        <CardArt
          rarity={card.rarity}
          faction={card.faction}
          artUrl={ownedArt(card, owned).art_url}
          // Three tiles per row inside the page padding, minus each tile's 4px frame.
          thumbSizes="calc((100vw - 72px) / 3)"
          effects={cardEffects(card, "sm")}
          className="h-24 rounded-t"
        >
          {owned.variants[0] && <VariantTag name={owned.variants[0].name} compact />}
        </CardArt>
      ) : (
        <div className="relative h-24 overflow-hidden rounded-t bg-panel">
          <Silhouette faction={card.faction} ink="#3a3a45" className="absolute -bottom-1 left-1/2 h-[96%] -translate-x-1/2" />
        </div>
      )}
      <div className="rounded-b bg-panel px-1.5 py-1">
        {owned ? (
          <CardName card={card} size="sm" as="p" className="h-5" />
        ) : (
          <p className="truncate font-display text-sm uppercase text-faint">???</p>
        )}
        <div className="flex items-center justify-between gap-1 text-[11px] font-semibold">
          <span style={{ color: card.rarity.color }}>{card.rarity.name}</span>
          {owned && sortAbility ? (
            <span className="font-extrabold text-comic-yellow">
              {sortAbility} {card.stats[sortAbility] ?? 0}
            </span>
          ) : (
            <span className="text-faint">N. {number}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ConvertAll({
  convertible,
  onConverted,
}: {
  convertible: { copies: number; coins: number };
  onConverted: (result: ConversionResult) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function convert() {
    setBusy(true);
    setError(null);
    try {
      onConverted(await convertAllDuplicates());
    } catch (cause) {
      setError(describeServerError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 bg-panel p-3">
      <p className="text-sm font-semibold">
        {convertible.copies} {convertible.copies === 1 ? "doppione convertibile" : "doppioni convertibili"} ·{" "}
        <span className="font-extrabold text-comic-yellow">+{convertible.coins} monete</span>
      </p>
      <p className="text-xs font-medium text-muted">
        Tieni sempre almeno una copia di ogni personaggio e tutte le varianti. La conversione non si può annullare.
      </p>
      <HoldToConfirmButton
        onConfirm={convert}
        disabled={busy}
        hint={busy ? "" : "Tieni premuto per convertire"}
        fillColor="var(--comic-yellow)"
        className="btn btn-outline disabled:opacity-60"
      >
        {busy ? "Conversione…" : "Converti tutti i doppioni"}
      </HoldToConfirmButton>
      {error && <p className="text-sm font-semibold text-comic-magenta">{error}</p>}
    </div>
  );
}
