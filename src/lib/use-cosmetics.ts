"use client";

import { useEffect, useSyncExternalStore } from "react";
import { fetchCosmetics, type CosmeticsState } from "@/lib/cosmetics";
import { keepSeen, lastSeen } from "@/lib/last-seen";

// One copy of the player's Schegge, frames and effects for every screen: the album, a card's page
// and the shop show the same, and an action on one is seen by the others at once.
const KEY = "cosmetics";
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;

export function keepCosmetics(state: CosmeticsState): void {
  keepSeen(KEY, state);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const snapshot = () => lastSeen<CosmeticsState>(KEY);

/** The player's Schegge, frames and effects: null until the first answer, then kept up to date. */
export function useCosmetics(): CosmeticsState | null {
  const state = useSyncExternalStore(subscribe, snapshot, () => null);
  useEffect(() => {
    // Once per visit of a screen; the screens share the answer.
    if (loading) return;
    loading = fetchCosmetics()
      .then(keepCosmetics)
      // Looks are a nicety: a screen works without them.
      .catch((cause: unknown) => console.error("Cosmetics failed", cause))
      .finally(() => {
        loading = null;
      });
  }, []);
  return state;
}
