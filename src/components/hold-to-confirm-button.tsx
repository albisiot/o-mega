"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { balance } from "@/config/balance";
import { LONG_PRESS_CLASS } from "@/lib/use-long-press";

type HoldToConfirmButtonProps = {
  /** Runs once the button has been held for the whole duration. */
  onConfirm: () => void;
  disabled?: boolean;
  children: ReactNode;
  /** Said under the label and to screen readers: how to use the button. */
  hint?: string;
  className?: string;
  style?: CSSProperties;
  /** Colour of the bar that fills the button while it is held. */
  fillColor?: string;
  /** Override for the hold, in milliseconds; the default is the game's setting. */
  durationMs?: number;
};

/**
 * A button that acts only when held down for about a second, for purchases and other things a
 * stray tap must not do. A bar fills it while it is held; letting go early cancels. Works with a
 * finger, the mouse, and the keyboard (hold Space or Enter). No iOS callout or text selection.
 */
export function HoldToConfirmButton({
  onConfirm,
  disabled = false,
  children,
  hint = "Tieni premuto per comprare",
  className = "",
  style,
  fillColor = "currentColor",
  durationMs = balance.holdToConfirm.durationMs,
}: HoldToConfirmButtonProps) {
  const [holding, setHolding] = useState(false);
  // A tap too short to be a hold shows the hint in place of the label for a moment.
  const [nudge, setNudge] = useState(false);
  const timer = useRef<number | null>(null);
  const nudgeTimer = useRef<number | null>(null);
  const startedAt = useRef(0);
  const hintId = useId();

  function stop() {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  }

  function start() {
    if (disabled || timer.current !== null) return;
    startedAt.current = performance.now();
    setNudge(false);
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setHolding(false);
      navigator.vibrate?.(20);
      onConfirm();
    }, durationMs);
  }

  /** Let go: early, it cancels; very early (a tap), it also says how the button works. */
  function release() {
    if (timer.current === null) return;
    const short = performance.now() - startedAt.current < Math.min(250, durationMs / 2);
    stop();
    if (short) {
      setNudge(true);
      if (nudgeTimer.current !== null) window.clearTimeout(nudgeTimer.current);
      nudgeTimer.current = window.setTimeout(() => setNudge(false), 1800);
    }
  }

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      if (nudgeTimer.current !== null) window.clearTimeout(nudgeTimer.current);
    },
    [],
  );

  const filling = holding && !disabled;
  const isActivationKey = (event: KeyboardEvent) => event.key === " " || event.key === "Enter";

  return (
    <button
      type="button"
      disabled={disabled}
      aria-describedby={hint ? hintId : undefined}
      onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
        if (event.button === 0) start();
      }}
      onPointerUp={release}
      onPointerLeave={release}
      // The page scrolling under the finger (the shop carousel) is not a hold.
      onPointerCancel={stop}
      onKeyDown={(event) => {
        if (!isActivationKey(event)) return;
        event.preventDefault();
        if (!event.repeat) start();
      }}
      onKeyUp={(event) => {
        if (!isActivationKey(event)) return;
        event.preventDefault();
        release();
      }}
      onBlur={stop}
      // A click alone never confirms; long-press menus never open.
      onClick={(event) => event.preventDefault()}
      onContextMenu={(event) => event.preventDefault()}
      className={`relative touch-manipulation overflow-hidden ${LONG_PRESS_CLASS} ${className}`}
      style={style}
    >
      {/* The fill: a tint over the whole button and a solid bar along its bottom edge. */}
      {[
        "inset-0 opacity-30",
        "inset-x-0 bottom-0 h-1",
      ].map((place) => (
        <span
          key={place}
          aria-hidden
          className={`pointer-events-none absolute origin-left ${place}`}
          style={{
            background: fillColor,
            transform: `scaleX(${filling ? 1 : 0})`,
            transition: `transform ${filling ? durationMs : 150}ms linear`,
          }}
        />
      ))}
      <span className="relative flex flex-col items-center leading-tight">
        <span>{nudge ? "Tieni premuto!" : children}</span>
        {hint && (
          <span id={hintId} className="font-sans text-[10px] font-bold normal-case leading-3 tracking-normal opacity-80">
            {filling ? "Continua a tenere…" : hint}
          </span>
        )}
      </span>
    </button>
  );
}
