"use client";

import { useEffect, useState } from "react";

/** Current time in ms, refreshed every `intervalMs` (for countdowns). */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/**
 * Whole seconds left until `deadline` (server time, in ms), read with the server clock
 * `offset` (server time minus device time). Re-renders only when the number changes and
 * stops at zero. Key the component on the deadline: a new deadline starts a new count.
 */
export function useSecondsLeft(deadline: number, offset: number): number {
  const [seconds, setSeconds] = useState(() => secondsUntil(deadline, offset));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      const ms = deadline - (Date.now() + offset);
      if (ms <= 0) return;
      // Wake just after the shown number changes.
      timer = setTimeout(() => {
        setSeconds(secondsUntil(deadline, offset));
        schedule();
      }, (ms % 1000 || 1000) + 20);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [deadline, offset]);
  return seconds;
}

function secondsUntil(deadline: number, offset: number): number {
  return Math.max(0, Math.ceil((deadline - (Date.now() + offset)) / 1000));
}

/** "5 h 12 min", "12 min", "meno di un minuto". */
export function formatCountdown(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "meno di un minuto";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours} h ${rest} min` : `${rest} min`;
}
