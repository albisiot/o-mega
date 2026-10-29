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

/** "5 h 12 min", "12 min", "meno di un minuto". */
export function formatCountdown(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "meno di un minuto";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours} h ${rest} min` : `${rest} min`;
}
