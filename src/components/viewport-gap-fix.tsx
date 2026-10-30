"use client";

import { useEffect } from "react";
import { viewportGap } from "@/lib/viewport-gap";

/** Publishes the measured gap as --viewport-gap, for the .pin-bottom class. */
export function ViewportGapFix() {
  useEffect(() => {
    // Only the installed app: in Safari the browser's own bars explain the difference.
    if (!window.matchMedia("(display-mode: standalone)").matches) return;
    const update = () =>
      document.documentElement.style.setProperty("--viewport-gap", `${viewportGap(window.screen, window)}px`);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return null;
}
