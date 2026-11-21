/**
 * The long press as a small state machine, without React or the DOM, so it can be tested: a press
 * starts on the main button, fires once after `delayMs`, and ends early when the pointer lifts,
 * is cancelled or drifts further than `tolerancePx` (a scroll or a drag, not a press).
 */

export type LongPressEnv = {
  delayMs: number;
  tolerancePx: number;
  setTimer: (run: () => void, ms: number) => number;
  clearTimer: (id: number) => void;
};

export type PointerPoint = { pointerId: number; clientX: number; clientY: number };

export type LongPressController = {
  /**
   * A pointer went down. `onPressChange(true)` says a press began (to show a filling indicator),
   * `onPressChange(false)` that it ended, before `onLongPress` runs when it fires. False when the
   * press does not count (not the main button).
   */
  down: (
    event: PointerPoint & { button: number },
    onLongPress: () => void,
    onPressChange?: (pressing: boolean) => void,
  ) => boolean;
  /** The pointer moved: too far from where it went down, and the press is off. */
  move: (event: PointerPoint) => void;
  /** The pointer lifted, left or was taken by the browser: the press is off. */
  cancel: () => void;
  isPressing: () => boolean;
};

export function createLongPress(env: LongPressEnv): LongPressController {
  let current: { pointerId: number; x: number; y: number; timer: number; onPressChange?: (pressing: boolean) => void } | null = null;

  function cancel() {
    const press = current;
    if (!press) return;
    current = null;
    env.clearTimer(press.timer);
    press.onPressChange?.(false);
  }

  return {
    down(event, onLongPress, onPressChange) {
      if (event.button !== 0) return false;
      cancel();
      const timer = env.setTimer(() => {
        cancel();
        onLongPress();
      }, env.delayMs);
      current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, timer, onPressChange };
      onPressChange?.(true);
      return true;
    },
    move(event) {
      if (!current || current.pointerId !== event.pointerId) return;
      if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > env.tolerancePx) cancel();
    },
    cancel,
    isPressing: () => current !== null,
  };
}
