"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { balance } from "@/config/balance";

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
    const tick = () => {
      setSeconds(secondsUntil(deadline, offset));
      const ms = deadline - (Date.now() + offset);
      if (ms <= 0) return;
      // Wake just after the shown number changes.
      timer = setTimeout(tick, (ms % 1000 || 1000) + 20);
    };
    // A new clock offset (or a deadline already past) shows at once, not at the next tick:
    // otherwise a refresh landing on the deadline left the last number on screen.
    timer = setTimeout(tick, 0);
    return () => clearTimeout(timer);
  }, [deadline, offset]);
  return seconds;
}

/** Time between two requests for the same expired deadline. */
export const EXPIRY_RETRY_MS = 2_000;

/**
 * When `deadline` (server time, in ms, read with the clock `offset`) is past, plus the
 * server's grace and a small margin, calls `onExpire` (a request asking the server to play
 * for whoever has not chosen). While the same `key` is still open after the request settles
 * (the server's clock said "not yet", or the request failed), asks again every
 * EXPIRY_RETRY_MS: never twice at once, never in a burst when the state (and so the offset)
 * changes. A null deadline or undefined key stops it.
 */
export function useExpiry(
  key: string | number | undefined,
  deadline: number | null,
  offset: number,
  onExpire: () => Promise<unknown> | void,
): void {
  const expire = useEffectEvent(onExpire);
  const last = useRef<{ key: string | number; at: number } | null>(null);
  const inFlight = useRef(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (key === undefined || deadline === null) return;
    const due = deadline + (balance.match.timeoutGraceSeconds + 0.5) * 1000 - (Date.now() + offset);
    const sinceLast = last.current?.key === key ? Date.now() - last.current.at : Infinity;
    const timer = setTimeout(
      async () => {
        // The request still running re-arms this effect when it settles.
        if (inFlight.current) return;
        inFlight.current = true;
        last.current = { key, at: Date.now() };
        try {
          await expire();
        } catch {
          // The screen shows its own errors; the next attempt follows below.
        } finally {
          inFlight.current = false;
          setAttempt((n) => n + 1);
        }
      },
      Math.max(0, due, EXPIRY_RETRY_MS - sinceLast),
    );
    return () => clearTimeout(timer);
  }, [key, deadline, offset, attempt]);
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
