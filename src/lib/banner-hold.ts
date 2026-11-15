"use client";

// Screens that must not be covered (a round result playing out, a rare threat, a pack
// being opened, the splash) ask the in-app banners to wait. A banner on screen when
// one starts goes away and comes back, whole, when the last of them ends.

import { useEffect } from "react";

let holds = 0;
const listeners = new Set<() => void>();

function changed() {
  for (const listener of listeners) listener();
}

/** Banners wait until the returned function is called. Calling it twice releases once. */
export function holdBanners(): () => void {
  holds += 1;
  changed();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds -= 1;
    changed();
  };
}

export function bannersHeld(): boolean {
  return holds > 0;
}

export function subscribeBannerHolds(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Banners wait while the calling component is mounted and `active`. */
export function useBannerHold(active = true) {
  useEffect(() => (active ? holdBanners() : undefined), [active]);
}
