"use client";

import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent } from "react";
import { createLongPress, type LongPressController } from "@/lib/long-press";

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
 * `onPressChange` hears when a press begins and ends, to draw an indicator that fills meanwhile.
 */
export function useLongPress(): (onLongPress: () => void, onPressChange?: (pressing: boolean) => void) => LongPressHandlers {
  const controller = useRef<LongPressController | null>(null);
  controller.current ??= createLongPress({
    delayMs: LONG_PRESS_MS,
    tolerancePx: MOVE_TOLERANCE_PX,
    setTimer: (run, ms) => window.setTimeout(run, ms),
    clearTimer: (id) => window.clearTimeout(id),
  });

  // The pointer drifting anywhere, even off the element (a card being dragged), is not a press.
  const drifted = useCallback((event: { pointerId: number; clientX: number; clientY: number }) => {
    controller.current?.move(event);
  }, []);
  const cancel = useCallback(() => controller.current?.cancel(), []);

  useEffect(() => cancel, [cancel]);

  return useCallback(
    (onLongPress: () => void, onPressChange?: (pressing: boolean) => void): LongPressHandlers => ({
      onPointerDown(event) {
        const started = controller.current?.down(
          event,
          () => {
            swallowReleaseClick();
            onLongPress();
          },
          (pressing) => {
            if (!pressing) window.removeEventListener("pointermove", drifted);
            onPressChange?.(pressing);
          },
        );
        if (started) window.addEventListener("pointermove", drifted);
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
