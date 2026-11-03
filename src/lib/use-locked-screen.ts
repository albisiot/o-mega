import { useEffect } from "react";

/**
 * Keeps the page still while `locked`: a screen that fits the phone neither scrolls nor
 * bounces (see .screen-locked in globals.css). It starts from the top, so a previous
 * screen scrolled down cannot leave it cut off.
 */
export function useLockedScreen(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const root = document.documentElement;
    window.scrollTo(0, 0);
    root.classList.add("screen-locked");
    return () => root.classList.remove("screen-locked");
  }, [locked]);
}
