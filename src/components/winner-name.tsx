"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { FontData } from "three/addons/loaders/FontLoader.js";
import { CardName } from "@/components/card-name";
import { withBasePath } from "@/lib/base-path";
import { nameStyle } from "@/lib/card-names";

type NameCard = { code?: string; name: string; faction: string };

type WinnerNameProps = {
  card: NameCard;
  /** Seconds to wait, from when the screen appears, before the letters fly in. */
  delay?: number;
};

// Letter outlines by font, downloaded once per session.
const outlines = new Map<string, Promise<FontData>>();

function loadOutlines(font: string): Promise<FontData> {
  let pending = outlines.get(font);
  if (!pending) {
    pending = fetch(withBasePath(`/fonts/names/${font}.json`)).then((response) => {
      if (!response.ok) throw new Error(`Letter outlines: HTTP ${response.status}`);
      return response.json() as Promise<FontData>;
    });
    // A failed download is tried again next time.
    pending.catch(() => outlines.delete(font));
    outlines.set(font, pending);
  }
  return pending;
}

/** Downloads ahead what the 3D names of these cards need, so a won round shows its name on time. */
export function prefetchWinnerNames(cards: NameCard[]) {
  import("@/lib/winner-name-3d").catch(() => {});
  for (const card of cards) loadOutlines(nameStyle(card).font).catch(() => {});
}

/**
 * The name of the card that won the round, as 3D letters in its own style (winner-name-3d.ts).
 * Without WebGL it falls back to the flat card name.
 */
export const WinnerName = memo(function WinnerName({ card, delay = 0 }: WinnerNameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const dragStart = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let unmount: (() => void) | undefined;
    const style = nameStyle(card);
    const startAt = performance.now() + delay * 1000;
    // Three.js and the letter outlines are downloaded only when a round is won.
    Promise.all([import("@/lib/winner-name-3d"), loadOutlines(style.font)])
      .then(([{ mountWinnerName }, font]) => {
        if (!cancelled) unmount = mountWinnerName(canvas, { name: card.name, style, font, startAt }, () => setFailed(true));
      })
      .catch((cause: unknown) => {
        console.error("Winner name failed", cause);
        setFailed(true);
      });
    return () => {
      cancelled = true;
      unmount?.();
    };
    // The card is identified by its code, name and faction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.code, card.name, card.faction, delay]);

  if (failed) {
    return (
      <div className="flex h-[120px] items-center px-6">
        <CardName card={card} size="lg" as="p" className="h-14" />
      </div>
    );
  }
  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={card.name}
      // A tap still reaches the screen around it; turning the word with a finger does not.
      onPointerDown={(event) => {
        dragStart.current = event.clientX;
      }}
      onClick={(event) => {
        if (Math.abs(event.clientX - dragStart.current) > 6) event.stopPropagation();
      }}
      className="relative block h-[120px] w-full cursor-grab touch-pan-y"
    />
  );
});
