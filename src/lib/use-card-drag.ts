"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { swallowReleaseClick } from "@/lib/use-long-press";

/**
 * How far the finger travels before a press becomes a drag: past the long press's own
 * tolerance (10 px), so a drag never opens the card's detail and a long press never drags.
 */
const DRAG_START_PX = 12;

/** The attribute that marks a drop zone; its value is what the drop reports. */
export const DROP_ATTRIBUTE = "data-drop";

export type CardDrag = {
  /** The card being dragged. */
  id: string;
  /** The drop zone under the finger, as its data-drop value; null over nothing. */
  over: string | null;
};

/**
 * Drags a card with a finger, a pen or the mouse. `start(id)` gives the onPointerDown to put
 * on the card; zones carry data-drop="…". A short tap is left to the card's onClick; a drag
 * ends with onDrop(id, zone) and swallows the click its release would make. The ghost (the
 * card under the finger) follows it through `ghostRef`, without a render per move.
 */
export function useCardDrag(onDrop: (id: string, zone: string | null) => void, disabled = false) {
  const [drag, setDrag] = useState<CardDrag | null>(null);
  const ghost = useRef<HTMLDivElement | null>(null);
  const position = useRef({ x: 0, y: 0 });
  const stop = useRef<(() => void) | null>(null);
  const dropRef = useRef(onDrop);

  useEffect(() => {
    dropRef.current = onDrop;
  }, [onDrop]);

  // A screen that goes away mid-drag leaves no listener behind.
  useEffect(() => () => stop.current?.(), []);

  const moveGhost = useCallback(() => {
    const { x, y } = position.current;
    if (ghost.current) ghost.current.style.transform = ghostTransform(x, y);
  }, []);

  /** The ref for the ghost element: placed under the finger as soon as it mounts. */
  const ghostRef = useCallback(
    (element: HTMLDivElement | null) => {
      ghost.current = element;
      moveGhost();
    },
    [moveGhost],
  );

  const start = useCallback(
    (id: string) => (event: PointerEvent<HTMLElement>) => {
      if (disabled || event.button !== 0 || !event.isPrimary) return;
      stop.current?.();
      const { pointerId, clientX: startX, clientY: startY } = event;
      let dragging = false;

      const zoneAt = (x: number, y: number) =>
        document.elementFromPoint(x, y)?.closest<HTMLElement>(`[${DROP_ATTRIBUTE}]`)?.getAttribute(DROP_ATTRIBUTE) ?? null;

      const move = (e: globalThis.PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        if (!dragging) {
          if (Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_START_PX) return;
          dragging = true;
        }
        e.preventDefault();
        position.current = { x: e.clientX, y: e.clientY };
        moveGhost();
        const over = zoneAt(e.clientX, e.clientY);
        setDrag((current) => (current?.id === id && current.over === over ? current : { id, over }));
      };
      const end = (e: globalThis.PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        cleanup();
        if (!dragging) return;
        swallowReleaseClick();
        setDrag(null);
        if (e.type === "pointerup") dropRef.current(id, zoneAt(e.clientX, e.clientY));
      };
      const cleanup = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        stop.current = null;
      };
      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
      stop.current = () => {
        cleanup();
        setDrag(null);
      };
    },
    [disabled, moveGhost],
  );

  // Leaving the choice (timer, busy) drops whatever was in the finger, nowhere.
  useEffect(() => {
    if (disabled) stop.current?.();
  }, [disabled]);

  return { drag, start, ghostRef };
}

function ghostTransform(x: number, y: number): string {
  return `translate(${x}px, ${y}px) translate(-50%, -65%) rotate(-4deg)`;
}
