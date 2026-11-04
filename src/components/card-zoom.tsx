"use client";

import { useState, type ReactNode } from "react";
import { CardView, type CardData } from "@/components/card-view";
import { ComicBurst } from "@/components/comic-parts";
import type { AbilityInfo } from "@/lib/catalog";

export const MAGNIFIER = (
  <svg viewBox="0 0 13 13" className="h-full w-full" fill="none" stroke="currentColor" aria-hidden>
    <circle cx="5.5" cy="5.5" r="4" strokeWidth={2} />
    <path d="m8.5 8.5 3.5 3.5" strokeWidth={2.2} />
  </svg>
);

/**
 * A card shown whole over the screen: a tap beside it or on the cross closes it.
 * `className` places the layer; with flex on it, the card sits in the middle.
 */
export function CardZoom({
  card,
  abilities,
  onClose,
  backLabel,
  className,
}: {
  card: CardData;
  abilities: AbilityInfo[] | null;
  onClose: () => void;
  backLabel: string;
  className: string;
}) {
  return (
    <div className={`overflow-y-auto bg-background/90 ${className}`}>
      <button type="button" aria-label={backLabel} onClick={onClose} className="absolute inset-0 cursor-default" />
      <div className="relative m-auto w-fit">
        <CardView card={card} abilities={abilities} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi la carta"
          className="absolute -right-2.5 -top-3.5 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-black shadow-[3px_3px_0_#000]"
        >
          <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth={2.6} aria-hidden>
            <path d="M1 1l12 12M13 1 1 13" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * A card won or lost at the end of a match, or a mission's prize, next to what it means: the
 * card is as tall as the room the row gets, never lower than the text, and a tap shows it
 * whole with its abilities. `celebrate` slams it in with BAM!.
 */
export function PrizeCard({
  card,
  abilities,
  glow = false,
  celebrate = false,
  backLabel = "Torna al risultato",
  className = "",
  children,
}: {
  card: CardData;
  abilities: AbilityInfo[] | null;
  glow?: boolean;
  celebrate?: boolean;
  /** Names what closing the whole card goes back to. */
  backLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        type="button"
        onClick={() => setZoomed(true)}
        aria-label={`Guarda ${card.name} per intero`}
        className={`relative aspect-[5/7] h-full max-h-[264px] shrink-0 rounded-xl text-left ${celebrate ? "animate-card-slam" : ""}`}
      >
        <CardView card={card} size="sm" fill glow={glow} />
        <span className="absolute bottom-2 right-2 z-[3] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-black/70 p-[5px] text-foreground">
          {MAGNIFIER}
        </span>
        {/* Off center towards the text: at its biggest it still clears the screen edge. */}
        {celebrate && (
          <ComicBurst
            fill="#ffd60a"
            className="animate-bam absolute left-[70%] top-[45%] z-20 h-40 w-40 -translate-x-1/2 -translate-y-1/2 -rotate-[8deg]"
            textClassName="text-[52px] tracking-wide"
          >
            BAM!
          </ComicBurst>
        )}
      </button>
      <div className="min-w-0 flex-1">{children}</div>
      {zoomed && (
        <CardZoom
          card={card}
          abilities={abilities}
          onClose={() => setZoomed(false)}
          backLabel={backLabel}
          className="fixed inset-0 z-30 flex flex-col px-3 pb-4 pt-[calc(var(--safe-top)+16px)]"
        />
      )}
    </div>
  );
}

/** Says that a tap on the card shows it whole, under the text next to it. */
export function ZoomHint() {
  return (
    <p className="mt-2 flex items-center gap-1.5 text-xs font-bold opacity-75">
      <span className="h-3.5 w-3.5 shrink-0">{MAGNIFIER}</span>
      Tocca la carta per vederla intera
    </p>
  );
}
