"use client";

import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent } from "react";

/** How long a finger or the mouse button stays down before a press counts as long. */
export const LONG_PRESS_MS = 450;
/** How far the pointer may drift meanwhile: any further and it is a scroll, not a press. */
const MOVE_TOLERANCE_PX = 10;

/**
 * Classes for an element that answers a long press: no text selection and no iOS
 * callout (copy, save image) while the finger rests on it.
 */
export const LONG_PRESS_CLASS = "select-none [-webkit-touch-callout:none]";

export type LongPressHandlers = {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
  onContextMenu: (event: MouseEvent<HTMLElement>) => void;
};

/**
 * Swallows the click that ends a long press (or a drag), wherever it lands: on the pressed element it
 * must not select or play it, on an overlay just opened it must not close it. The next
 * press (or key) starts afresh, so a release that makes no click leaves nothing behind.
 */
export function swallowReleaseClick() {
  const done = () => {
    window.removeEventListener("click", swallow, true);
    window.removeEventListener("pointerdown", done, true);
    window.removeEventListener("keydown", done, true);
  };
  const swallow = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    done();
  };
  window.addEventListener("click", swallow, true);
  window.addEventListener("pointerdown", done, true);
  window.addEventListener("keydown", done, true);
}

/**
 * A long press on touch, pen or mouse. Returns a binder: `bind(action)` gives the pointer
 * handlers to spread on an element, so one hook serves every card of a list. A short tap
 * keeps doing what the element's own onClick does; moving the pointer cancels the press.
 */
export function useLongPress(): (onLongPress: () => void) => LongPressHandlers {
  const press = useRef<{ pointerId: number; x: number; y: number; timer: number; stop: () => void } | null>(null);

  const cancel = useCallback(() => {
    if (press.current) {
      window.clearTimeout(press.current.timer);
      press.current.stop();
    }
    press.current = null;
  }, []);

  // The pointer drifting anywhere, even off the element (a card being dragged), is not a press.
  const drifted = useCallback(
    (event: { pointerId: number; clientX: number; clientY: number }) => {
      const current = press.current;
      if (!current || current.pointerId !== event.pointerId) return;
      if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > MOVE_TOLERANCE_PX) cancel();
    },
    [cancel],
  );

  useEffect(() => cancel, [cancel]);

  return useCallback(
    (onLongPress: () => void): LongPressHandlers => ({
      onPointerDown(event) {
        // The main button only: a right click keeps its own meaning.
        if (event.button !== 0) return;
        cancel();
        const timer = window.setTimeout(() => {
          cancel();
          swallowReleaseClick();
          onLongPress();
        }, LONG_PRESS_MS);
        window.addEventListener("pointermove", drifted);
        const stop = () => window.removeEventListener("pointermove", drifted);
        press.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, timer, stop };
      },
      onPointerMove: drifted,
      onPointerUp: cancel,
      onPointerCancel: cancel,
      onPointerLeave: cancel,
      // Android and desktop open a menu on a long press or a right click: not on a card.
      onContextMenu(event) {
        event.preventDefault();
      },
    }),
    [cancel, drifted],
  );
}
