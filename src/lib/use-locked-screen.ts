import { useEffect, useState } from "react";

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

/**
 * Whether the whole page fits the window, kept up to date as either changes size. A screen
 * that can shrink to the phone locks only when it really fits: on a shorter window (Safari
 * with its bars) it scrolls instead of cutting something off.
 */
export function usePageFits() {
  const [fits, setFits] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    // One pixel of slack for rounded heights.
    const check = () => setFits(root.scrollHeight <= root.clientHeight + 1);
    // The observer also reports the first size.
    const observer = new ResizeObserver(check);
    observer.observe(document.body);
    window.addEventListener("resize", check);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", check);
    };
  }, []);
  return fits;
}
