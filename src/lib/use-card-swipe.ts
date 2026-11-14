"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { flushSync } from "react-dom";
import { classifyDrag, dragOffset, swipeStep, type DragAxis, type SwipeStep } from "@/lib/card-swipe";
import { swallowReleaseClick } from "@/lib/use-long-press";

/** Where a swipe never starts: controls keep their own taps, holds and drags (3D, sheets). */
const NO_SWIPE = "button, a, input, select, textarea, label, dialog, [data-no-swipe]";

const OUT_MS = 170;
const IN_MS = 230;
const BOUNCE = "transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)";
/** How far the card nudges when a key or arrow asks past either end. */
const NUDGE_PX = 26;

type Drag = { pointerId: number; x: number; y: number; time: number; axis: DragAxis; dx: number };

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * A card that turns like a photo in a gallery: it follows a sideways finger, slides out and
 * lets the next one slide in; past either end it springs back. `canStep` says whether there
 * is a card that way, `onStep` shows it (the slide waits for it, then brings it in).
 * Vertical drags stay the page's scroll: give the area `touch-action: pan-y` (style below).
 */
export function useCardSwipe({ canStep, onStep }: { canStep: (step: SwipeStep) => boolean; onStep: (step: SwipeStep) => void }) {
  const area = useRef<HTMLElement | null>(null);
  const drag = useRef<Drag | null>(null);
  const busy = useRef(false);
  const timers = useRef<number[]>([]);
  const [offset, setOffset] = useState(0);
  const [transition, setTransition] = useState<string | undefined>(undefined);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  const later = (ms: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, ms));
  };

  const settle = useCallback(() => {
    setTransition(BOUNCE);
    setOffset(0);
    later(340, () => {
      setTransition(undefined);
      busy.current = false;
    });
  }, []);

  /** Turns to the card one step away, or nudges and springs back at either end. */
  const go = useCallback(
    (step: SwipeStep) => {
      if (busy.current) return;
      const reduced = prefersReducedMotion();
      if (!canStep(step)) {
        if (reduced) return;
        busy.current = true;
        setTransition("transform 110ms ease-out");
        setOffset(-step * NUDGE_PX);
        later(110, settle);
        return;
      }
      if (reduced) {
        setTransition(undefined);
        setOffset(0);
        onStep(step);
        return;
      }
      busy.current = true;
      const width = area.current?.clientWidth ?? window.innerWidth;
      setTransition(`transform ${OUT_MS}ms ease-in`);
      setOffset(-step * width);
      later(OUT_MS, () => {
        // The next card is drawn off screen on the other side, then slides in: the layout read
        // fixes that start, so the slide needs no frame to wait for.
        flushSync(() => {
          onStep(step);
          setTransition("none");
          setOffset(step * width);
        });
        area.current?.getBoundingClientRect();
        setTransition(`transform ${IN_MS}ms ease-out`);
        setOffset(0);
        later(IN_MS, () => {
          setTransition(undefined);
          busy.current = false;
        });
      });
    },
    [canStep, onStep, settle],
  );

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (busy.current || drag.current || !event.isPrimary || event.button !== 0) return;
    if ((event.target as Element).closest(NO_SWIPE)) return;
    // A mouse drag would otherwise select text or pick up the drawing.
    if (event.pointerType === "mouse") event.preventDefault();
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp, axis: "pending", dx: 0 };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.x;
    if (current.axis === "pending") {
      current.axis = classifyDrag(dx, event.clientY - current.y);
      if (current.axis === "vertical") {
        drag.current = null;
        return;
      }
      if (current.axis === "pending") return;
      // Sideways from here on: the card is ours until the finger lifts.
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // A pointer already gone: its release ends the drag all the same.
      }
      setTransition("none");
    }
    current.dx = dx;
    if (!prefersReducedMotion()) setOffset(dragOffset(dx, canStep(dx < 0 ? 1 : -1)));
  };

  const finish = (event: PointerEvent<HTMLElement>, released: boolean) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    if (current.axis !== "horizontal") return;
    // The release must not also tap the page behind (which closes the card).
    swallowReleaseClick();
    const width = area.current?.clientWidth ?? window.innerWidth;
    const step = released ? swipeStep(current.dx, event.timeStamp - current.time, width) : null;
    if (step && canStep(step)) go(step);
    else if (current.dx !== 0) {
      busy.current = true;
      settle();
    }
  };

  const style: CSSProperties = {
    transform: offset === 0 ? undefined : `translate3d(${offset}px, 0, 0)`,
    transition,
  };

  return {
    /** Spread on the area the finger swipes (it should not scroll sideways). */
    areaProps: {
      ref: area,
      onPointerDown,
      onPointerMove,
      onPointerUp: (event: PointerEvent<HTMLElement>) => finish(event, true),
      onPointerCancel: (event: PointerEvent<HTMLElement>) => finish(event, false),
      style: { touchAction: "pan-y" } satisfies CSSProperties,
    },
    /** Style for what moves: the card and what goes with it. */
    style,
    go,
  };
}
