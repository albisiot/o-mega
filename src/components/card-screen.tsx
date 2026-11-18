"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { ArtViewerButton } from "@/components/art-viewer";
import { CopiesSheet, MissingCard } from "@/components/card-details";
import { CardModelButton } from "@/components/card-model";
import { CardView, Silhouette } from "@/components/card-view";
import { CharacterProfileSheet } from "@/components/character-profile";
import { thumbArtUrl } from "@/lib/art";
import { withBasePath } from "@/lib/base-path";
import { browsePosition, neighbourId, type SwipeStep } from "@/lib/card-swipe";
import type { AbilityInfo } from "@/lib/catalog";
import {
  foundVariantCount,
  ownedLooks,
  type CardLook,
  type CatalogCard,
  type OwnedSummary,
} from "@/lib/collection";
import { useCardSwipe } from "@/lib/use-card-swipe";

/**
 * A character's page, fitting the screen. Opened from the album, it swipes (or arrows, or
 * the keyboard's ← →) to the next or previous owned character the album showed.
 */
export function CardScreen({
  card,
  owned,
  initialLook = null,
  abilities,
  browseIds,
  onBrowse,
  onClose,
  onConverted,
}: {
  card: CatalogCard;
  owned: OwnedSummary | null;
  /** The drawing to open the page on (a variant's style): the base, or the only variant, when unset or not owned. */
  initialLook?: string | null;
  abilities: AbilityInfo[];
  /** The owned characters to browse, in the album's order; empty when the card stands alone. */
  browseIds: readonly string[];
  onBrowse: (id: string) => void;
  onClose: () => void;
  onConverted: () => void;
}) {
  // The drawing chosen belongs to this card: the next one starts from its own first.
  const [chosenLook, setChosenLook] = useState<{ cardId: string; key: string } | null>(() =>
    initialLook ? { cardId: card.id, key: initialLook } : null,
  );

  const position = browsePosition(browseIds, card.id);
  const canStep = useCallback((step: SwipeStep) => neighbourId(browseIds, card.id, step) !== null, [browseIds, card.id]);
  const onStep = useCallback(
    (step: SwipeStep) => {
      const next = neighbourId(browseIds, card.id, step);
      if (next) onBrowse(next);
    },
    [browseIds, card.id, onBrowse],
  );
  const swipe = useCardSwipe({ canStep, onStep });
  const { go } = swipe;
  // Shown only when there is somewhere to go: a lone card has no arrows nor counter.
  const browsing = position && position.total > 1 ? position : null;

  const canBrowse = browsing !== null;
  // Escape closes the card, ← → browse, unless a dialog (drawing, 3D, sheet) is open: it has the keys.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (document.querySelector("dialog[open]") || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "Escape") onClose();
      else if (canBrowse && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        go(event.key === "ArrowRight" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, go, canBrowse]);

  // A tap on the empty page around the card closes it; the card, buttons and panels do not.
  const closeOnBackground = (event: MouseEvent) => {
    if (event.target === event.currentTarget) onClose();
  };

  const looks = owned ? ownedLooks(card, owned) : [];
  const look = looks.find((l) => chosenLook?.cardId === card.id && l.key === chosenLook.key) ?? looks[0];
  return (
    <div className="game-shell" onClick={closeOnBackground}>
      <header className="flex min-h-13 shrink-0 items-center gap-1.5 px-4 py-1" onClick={closeOnBackground}>
        {/* The variants found show on the card in place of the base drawing. */}
        {owned && looks.length > 1 && (
          <DrawingPicker
            looks={looks}
            chosenKey={look.key}
            missing={Math.max(0, card.variantCount - foundVariantCount(owned))}
            faction={card.faction}
            onChoose={(key) => setChosenLook({ cardId: card.id, key })}
          />
        )}
        <span className="ml-auto shrink-0 text-sm font-bold text-muted">
          {browsing && (
            <span className="mr-2 tabular-nums text-faint" aria-label={`Carta ${browsing.index + 1} di ${browsing.total}`}>
              {browsing.index + 1} / {browsing.total}
            </span>
          )}
          N. {card.code.replace(/^\D+/, "")}
        </span>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* What a short window cannot fit scrolls inside, rather than being cut; never sideways. */}
        <main
          {...swipe.areaProps}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 pb-[calc(env(safe-area-inset-bottom)+12px)]"
          onClick={closeOnBackground}
        >
          <div
            className="flex min-h-0 w-full flex-1 flex-col items-center gap-2.5"
            style={swipe.style}
            onClick={closeOnBackground}
          >
            {owned && look ? (
              <>
                <div className="flex min-h-0 flex-1 flex-col justify-center py-1" onClick={closeOnBackground}>
                  <div className="flex min-h-0 flex-col rounded-xl shadow-[6px_6px_0_var(--comic-magenta)]">
                    <CardView
                      key={card.id}
                      card={{ ...card, art_url: look.art_url, variant: look.variant }}
                      abilities={abilities}
                      fit
                      animated
                    />
                  </div>
                </div>
                {card.flavor && (
                  <p className="w-full max-w-sm shrink-0 -rotate-1 bg-comic-yellow px-3 py-2 text-sm font-semibold italic text-black shadow-[3px_3px_0_var(--foreground)]">
                    {card.flavor}
                  </p>
                )}
                <div className="flex w-full max-w-sm shrink-0 gap-2 empty:hidden">
                  {look.art_url && (
                    <ArtViewerButton
                      key={`${card.id}-${look.key}`}
                      artUrl={look.art_url}
                      name={look.variant ? `${card.name} · ${look.label}` : card.name}
                      label={look.variant ? `Guarda il disegno ${look.label}` : "Guarda il disegno"}
                      className="min-h-12 flex-1"
                    />
                  )}
                  <CardModelButton key={card.id} code={card.code} name={card.name} className="min-h-12 flex-1" />
                </div>
                <CharacterProfileSheet key={`profile-${card.id}`} definitionId={card.id} name={card.name} />
                <CopiesSheet key={`copies-${card.id}`} card={card} owned={owned} onConverted={onConverted} />
              </>
            ) : (
              <MissingCard card={card} />
            )}
          </div>
        </main>

        {browsing && (
          <>
            <BrowseArrow step={-1} hidden={browsing.index === 0} onClick={() => go(-1)} />
            <BrowseArrow step={1} hidden={browsing.index === browsing.total - 1} onClick={() => go(1)} />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * The drawings of a character the player owns, as thumbnails that all fit beside the card's
 * number: a tap shows that drawing on the card, which names it. After them, a "?" for each
 * variant still to find, never its drawing.
 */
function DrawingPicker({
  looks,
  chosenKey,
  missing,
  faction,
  onChoose,
}: {
  looks: CardLook[];
  chosenKey: string;
  missing: number;
  faction: string;
  onChoose: (key: string) => void;
}) {
  return (
    // Scrolls sideways only if a character ever has more drawings than the header fits.
    <div className="flex min-w-0 items-center overflow-x-auto pb-0.5" role="group" aria-label="Disegno">
      {looks.map((l) => {
        const chosen = l.key === chosenKey;
        return (
          // The 3px each side make the tap target 39px wide around a 33px thumbnail.
          <button
            key={l.key}
            type="button"
            aria-pressed={chosen}
            aria-label={l.variant ? `Disegno ★ ${l.label}` : "Disegno base"}
            onClick={() => onChoose(l.key)}
            className="shrink-0 px-[3px]"
          >
            <span
              className={`relative block h-11 w-[33px] overflow-hidden rounded-[3px] border-2 bg-panel-raised ${
                chosen ? "border-comic-magenta shadow-[2px_2px_0_var(--comic-magenta)]" : "border-line opacity-80"
              }`}
            >
              {l.art_url ? (
                // Plain <img>: the static export has no image optimization.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={withBasePath(thumbArtUrl(l.art_url))}
                  alt=""
                  decoding="async"
                  className="h-full w-full object-cover object-top"
                />
              ) : (
                <Silhouette faction={faction} ink="#3a3a45" className="absolute -bottom-0.5 left-1/2 h-[90%] -translate-x-1/2" />
              )}
              {l.variant && (
                <span aria-hidden className="absolute bottom-0 right-0 bg-comic-magenta px-0.5 text-[9px] font-black leading-[11px] text-black">
                  ★
                </span>
              )}
            </span>
          </button>
        );
      })}
      {Array.from({ length: missing }, (_, index) => (
        <span
          key={`missing-${index}`}
          role="img"
          aria-label="Variante da trovare"
          className="mx-[3px] flex h-11 w-[33px] shrink-0 items-center justify-center rounded-[3px] border-2 border-dashed border-line font-display text-lg text-faint"
        >
          ?
        </span>
      ))}
    </div>
  );
}

/** A quiet arrow on the card's side, for the mouse and for whoever prefers a tap to a swipe. */
function BrowseArrow({ step, hidden, onClick }: { step: SwipeStep; hidden: boolean; onClick: () => void }) {
  if (hidden) return null;
  return (
    <button
      type="button"
      aria-label={step === 1 ? "Carta successiva" : "Carta precedente"}
      onClick={onClick}
      className={`absolute top-[38%] z-10 flex h-14 w-7 -translate-y-1/2 items-center justify-center bg-black/55 font-display text-2xl leading-none text-foreground/85 active:bg-black/80 ${
        step === 1 ? "right-0 rounded-l-md" : "left-0 rounded-r-md"
      }`}
    >
      {step === 1 ? "›" : "‹"}
    </button>
  );
}
