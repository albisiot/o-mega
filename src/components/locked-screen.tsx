"use client";

import { useLockedScreen } from "@/lib/use-locked-screen";

/** useLockedScreen for a static page that has no client code of its own. */
export function LockedScreen() {
  useLockedScreen(true);
  return null;
}
