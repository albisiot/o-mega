"use client";

import { useCallback, useEffect, useState } from "react";
import { describeServerError } from "@/lib/errors";
import { fetchPackStatus, type PackStatus } from "@/lib/packs";
import { useNow } from "@/lib/use-now";

/**
 * Daily pack availability and coin balance, from the server. Reloads on
 * demand and after the daily reset; `now` drives countdowns.
 */
export function usePackStatus() {
  const now = useNow(30_000);
  const [status, setStatus] = useState<PackStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const resetsAt = status ? Date.parse(status.resets_at) : null;
  // Changes at most once per tick of `now`, so a device clock ahead of the
  // server cannot cause a request loop.
  const resetTick = resetsAt !== null && now >= resetsAt ? now : 0;

  useEffect(() => {
    let cancelled = false;
    fetchPackStatus()
      .then((next) => {
        if (cancelled) return;
        setStatus(next);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [version, resetTick]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  return { status, error, refresh, now, resetsAt };
}
