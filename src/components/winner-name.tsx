"use client";

import { memo, useEffect, useRef, useState } from "react";
import { CardName } from "@/components/card-name";
import { withBasePath } from "@/lib/base-path";
import { nameStyle } from "@/lib/card-names";

type WinnerNameProps = { card: { code?: string; name: string; faction: string } };

/**
 * The name of the card that won the round, as 3D letters in its own style (winner-name-3d.ts).
 * Without WebGL it falls back to the flat card name.
 */
export const WinnerName = memo(function WinnerName({ card }: WinnerNameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const dragStart = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let unmount: (() => void) | undefined;
    const style = nameStyle(card);
    // Three.js and the letter outlines are downloaded only when a round is won.
    Promise.all([
      import("@/lib/winner-name-3d"),
      fetch(withBasePath(`/fonts/names/${style.font}.json`)).then((response) => {
        if (!response.ok) throw new Error(`Letter outlines: HTTP ${response.status}`);
        return response.json();
      }),
    ])
      .then(([{ mountWinnerName }, font]) => {
        if (!cancelled) unmount = mountWinnerName(canvas, { name: card.name, style, font }, () => setFailed(true));
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
  }, [card.code, card.name, card.faction]);

  if (failed) {
    return (
      <div className="flex h-[108px] items-center px-6">
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
      className="relative block h-[108px] w-full cursor-grab touch-pan-y"
    />
  );
});
