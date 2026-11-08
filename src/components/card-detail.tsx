"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CardView, type CardData } from "@/components/card-view";
import { fetchAbilities, seenAbilities, type AbilityInfo } from "@/lib/catalog";
import { useLongPress, type LongPressHandlers } from "@/lib/use-long-press";

type CardDetail = {
  /** Pointer handlers that open the card's detail on a long press; spread them on its element. */
  press: (card: CardData) => LongPressHandlers;
  /** Opens the card's detail at once (for an element whose tap has nothing else to do). */
  open: (card: CardData) => void;
};

const CardDetailContext = createContext<CardDetail | null>(null);

/**
 * Lets every card on a game screen open its detail with a long press. The overlay lives
 * here, above the screen's steps, so it stays open when the step under it changes (a round
 * result giving way to the next threat).
 */
export function CardDetailProvider({ children }: { children: ReactNode }) {
  const [card, setCard] = useState<CardData | null>(null);
  const bind = useLongPress();
  const value = useMemo<CardDetail>(() => ({ press: (shown) => bind(() => setCard(shown)), open: setCard }), [bind]);

  return (
    <CardDetailContext value={value}>
      {children}
      {card && <CardDetailOverlay card={card} onClose={() => setCard(null)} />}
    </CardDetailContext>
  );
}

/** The long press (and direct opening) of a card's detail, from the nearest CardDetailProvider. */
export function useCardDetail(): CardDetail {
  const detail = useContext(CardDetailContext);
  if (!detail) throw new Error("useCardDetail needs a CardDetailProvider above it");
  return detail;
}

/**
 * A card over the dimmed screen with everything it can do: name, rarity and faction, its
 * power (or none), the 12 abilities by family and its flavor text. A tap beside it, "Chiudi"
 * or Esc closes it.
 */
export function CardDetailOverlay({ card, onClose }: { card: CardData; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [abilities, setAbilities] = useState<AbilityInfo[] | null>(() => seenAbilities() ?? null);

  useEffect(() => {
    fetchAbilities()
      .then(setAbilities)
      .catch((cause: unknown) => console.error("Abilities failed", cause));
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);

  const close = useCallback(() => dialog.current?.close(), []);

  return (
    <dialog
      ref={dialog}
      aria-label={`Dettaglio di ${card.name}`}
      onClose={onClose}
      // Only the card and its panels stop a tap: anywhere else is beside the card.
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest("[data-detail-content]")) close();
      }}
      className="m-0 h-dvh max-h-none w-full max-w-none overscroll-contain bg-transparent p-0 text-foreground backdrop:bg-black/80"
    >
      <div className="flex min-h-full flex-col items-center justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-[calc(var(--safe-top)+16px)]">
        <div data-detail-content className="animate-detail-pop flex w-[300px] flex-col gap-2.5">
          <CardView card={card} abilities={abilities} />
          {(!card.power || card.flavor) && (
            <div className="flex flex-col gap-1 border-[3px] border-black bg-foreground px-3 py-2 text-black shadow-[4px_4px_0_var(--comic-magenta)]">
              {!card.power && <p className="font-display text-sm uppercase">Nessun potere</p>}
              {card.flavor && <p className="text-xs font-semibold italic leading-4">«{card.flavor}»</p>}
            </div>
          )}
          <button type="button" onClick={close} className="btn btn-primary w-full">
            Chiudi
          </button>
        </div>
      </div>
    </dialog>
  );
}
