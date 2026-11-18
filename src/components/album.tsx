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
import {
  ALBUM_SCROLL_BOX,
  albumScrollBox,
  clearAlbumScroll,
  saveAlbumOrder,
  saveAlbumScroll,
  savedAlbumScroll,
} from "@/lib/album-scroll";
import { cardEffects } from "@/lib/card-effects";
import { applyCardListView, groupCardList, sortAbilityOf } from "@/lib/card-list";
import type { AbilityInfo } from "@/lib/catalog";
import {
  convertAllDuplicates,
  foundVariantCount,
  foundVariants,
  ownedArt,
  type CatalogCard,
  type ConversionResult,
  type FoundVariant,
  type OwnedSummary,
} from "@/lib/collection";
import { describeServerError } from "@/lib/errors";
import { loadSeenCards, saveSeenCards } from "@/lib/new-cards";
import { rarityFrame } from "@/lib/rarity-theme";
import { useLockedScreen } from "@/lib/use-locked-screen";

type Ownership = "all" | "owned" | "missing" | "variants";

/** A tile of the album: a character, or under "★ Varianti" one of its variants found. */
type TileEntry = { card: CatalogCard; owned: OwnedSummary | null; variant: FoundVariant | null };

const OWNERSHIP_LABELS: Record<Ownership, string> = {
  all: "Tutte",
  owned: "Possedute",
  missing: "Mancanti",
  variants: "★ Varianti",
};

const VIEW_KEY = "o-mega.album-view";
const OWNERSHIP_KEY = "o-mega.album-ownership";
const EXTRA_SORTS = [{ value: "copies", label: "Copie" }];

function loadOwnership(): Ownership {
  try {
    const saved = sessionStorage.getItem(OWNERSHIP_KEY);
    return saved === "owned" || saved === "missing" || saved === "variants" ? saved : "all";
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
  useLockedScreen(true);

  useEffect(() => saveSeenCards([...owned.keys()]), [owned]);

  // Back from a card: the same place, also when the page was reloaded meanwhile.
  useEffect(() => {
    const y = savedAlbumScroll();
    if (y === null) return;
    // A frame later, so it runs after the router's own scroll.
    const frame = requestAnimationFrame(() => {
      const box = albumScrollBox();
      if (box) box.scrollTop = y;
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
    const shown = (card: CatalogCard) => {
      const mine = owned.get(card.id);
      if (ownership === "variants") return (mine?.variants.length ?? 0) > 0;
      return ownership === "all" || (ownership === "owned") === Boolean(mine);
    };
    const cards = catalog.filter(shown);
    const copies = (card: CatalogCard) => owned.get(card.id)?.copies ?? 0;
    const sorted = applyCardListView(cards, view, traits, {
      copies: (a, b) => copies(b) - copies(a) || b.rarity.rank - a.rarity.rank || a.code.localeCompare(b.code),
    });
    return groupCardList(sorted, view.sort, traits);
  }, [catalog, owned, ownership, view, traits]);

  // What a card's page swipes through: the owned characters shown, in the order shown.
  const browseIds = useMemo(
    () => groups.flatMap((group) => group.cards.filter((card) => owned.has(card.id)).map((card) => card.id)),
    [groups, owned],
  );
  const openCard = () => {
    saveAlbumScroll();
    saveAlbumOrder(browseIds);
  };

  // "★ Varianti" shows each variant found as a tile of its own; those still to find stay a count.
  const variantTotals = useMemo(
    () =>
      catalog.reduce(
        (totals, card) => {
          const mine = owned.get(card.id);
          if (!mine) return totals;
          const found = foundVariantCount(mine);
          return { found: totals.found + found, missing: totals.missing + Math.max(0, card.variantCount - found) };
        },
        { found: 0, missing: 0 },
      ),
    [catalog, owned],
  );

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
    // The page fits the screen above the bottom bar (see .home-shell): the title stays, the
    // album scrolls inside its own panel and never sideways.
    <div className="home-shell">
      <section className="cut-bottom mx-3 mt-2 shrink-0 bg-comic-cyan px-3.5 pb-5 pt-2.5 text-black">
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

      <main
        data-keep-scroll={ALBUM_SCROLL_BOX}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden overscroll-contain px-3 pb-6 pt-3"
      >
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
            {(Object.keys(OWNERSHIP_LABELS) as Ownership[]).map((value) => (
              <Chip key={value} active={ownership === value} onClick={() => chooseOwnership(value)}>
                {OWNERSHIP_LABELS[value]}
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

        {ownership === "variants" && (
          <p className="text-sm font-bold text-muted">
            {variantTotals.found === 1 ? "1 variante trovata" : `${variantTotals.found} varianti trovate`}
            {variantTotals.missing > 0 && ` · ${variantTotals.missing} da trovare tra i tuoi personaggi`}
          </p>
        )}

        {groups[0].cards.length === 0 ? (
          <p className="py-8 text-center text-sm font-semibold text-muted">
            {ownership !== "variants"
              ? "Nessuna carta con questi filtri."
              : variantTotals.found === 0
                ? "Non hai ancora varianti: sono disegni più rari dei personaggi e si trovano nei pacchetti."
                : "Nessuna variante con questi filtri."}
          </p>
        ) : (
          groups.map((group) => {
            // One tile per character, or, under "★ Varianti", one per variant found.
            const tiles = group.cards.flatMap((card): TileEntry[] => {
              const mine = owned.get(card.id) ?? null;
              if (ownership !== "variants" || !mine) return [{ card, owned: mine, variant: null }];
              return foundVariants(mine).map((variant) => ({ card, owned: mine, variant }));
            });
            return (
              <section key={group.key} className="flex flex-col gap-1.5">
                {group.label && <CardGroupHeading label={group.label} count={tiles.length} />}
                <ul className="grid grid-cols-3 gap-2">
                  {tiles.map(({ card, owned: mine, variant }) => (
                    <li key={variant ? `${card.id}-${variant.style}` : card.id}>
                      <AlbumTile
                        card={card}
                        owned={mine}
                        variant={variant}
                        // Before the first visit nothing is new: an existing player's whole album would be.
                        isNew={!variant && seenBefore !== null && mine !== null && !seenBefore.has(card.id)}
                        sortAbility={sortAbility}
                        onOpen={openCard}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </main>
    </div>
  );
}

function AlbumTile({
  card,
  owned,
  variant,
  isNew,
  sortAbility,
  onOpen,
}: {
  card: CatalogCard;
  owned: OwnedSummary | null;
  /** Set under "★ Varianti": the tile is this variant, and opens the card's page on it. */
  variant: FoundVariant | null;
  isNew: boolean;
  sortAbility: string | null;
  onOpen: () => void;
}) {
  const number = card.code.replace(/^\D+/, "");
  const variants = owned ? foundVariantCount(owned) : 0;
  // A variant's tile counts the copies of that drawing and names it; a character's tile counts
  // all its copies and names its variant, or says how many it has.
  const copies = variant ? variant.copies : (owned?.copies ?? 0);
  const tag = variant ? variant.name : variants > 1 ? `${variants}` : owned?.variants[0]?.name;
  return (
    <Link
      href={`/carta/?id=${card.id}${variant ? `&v=${encodeURIComponent(variant.style)}` : ""}`}
      onClick={onOpen}
      className="relative flex flex-col rounded-[7px] p-1"
      style={{ background: owned ? rarityFrame(card.rarity) : "var(--panel-raised)" }}
    >
      {copies > 1 && (
        <span className="absolute left-1.5 top-1.5 z-10 bg-black px-1.5 text-xs font-extrabold leading-[18px] text-comic-yellow">
          ×{copies}
        </span>
      )}
      {owned ? (
        <CardArt
          rarity={card.rarity}
          faction={card.faction}
          artUrl={variant ? variant.art_url : ownedArt(card, owned).art_url}
          // Three tiles per row inside the page padding, minus each tile's 4px frame.
          thumbSizes="calc((100vw - 72px) / 3)"
          effects={cardEffects(card, "sm")}
          className="h-24 rounded-t"
        >
          {/* At the foot of the drawing, clear of the copies count and of the face: NEW! on the left,
              the variants on the right, whose name gives way to NEW! instead of covering it. */}
          {(isNew || tag) && (
            <div className="absolute bottom-1.5 left-0.5 right-1.5 z-10 flex items-end gap-1">
              {isNew && (
                <span className="animate-new-pop shrink-0 bg-comic-yellow px-1.5 font-sfx text-sm leading-[18px] tracking-wide text-black shadow-[2px_2px_0_var(--comic-magenta)]">
                  NEW!
                </span>
              )}
              {/* Several variants found: how many; the card's page shows them all. */}
              {tag && (
                <VariantTag
                  name={tag}
                  hint={!variant && variants > 1 ? "varianti" : undefined}
                  compact
                  className="ml-auto min-w-0 truncate"
                />
              )}
            </div>
          )}
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
