"use client";

import { useEffect } from "react";

/**
 * The app is built for the phone screen and never needs zooming, which only gets in the way
 * (a pinch during a match, a double tap on a card). The viewport (layout.tsx) and the CSS
 * (touch-action on html) stop it on Android and most browsers; Safari on iPhone ignores both
 * for pinching, so its gesture events are cancelled here. A trackpad pinch on a computer
 * arrives as a wheel event with Ctrl, and is cancelled too. Scrolling is untouched.
 */
export function NoZoom() {
  useEffect(() => {
    const cancel = (event: Event) => event.preventDefault();
    const cancelPinch = (event: TouchEvent) => {
      // Safari's non-standard scale: 1 for a one-finger scroll, anything else for a pinch.
      const scale = (event as TouchEvent & { scale?: number }).scale;
      if (event.touches.length > 1 && scale !== undefined && scale !== 1) event.preventDefault();
    };
    const cancelWheelZoom = (event: WheelEvent) => {
      if (event.ctrlKey) event.preventDefault();
    };
    const options = { passive: false } as const;
    document.addEventListener("gesturestart", cancel, options);
    document.addEventListener("gesturechange", cancel, options);
    document.addEventListener("gestureend", cancel, options);
    document.addEventListener("touchmove", cancelPinch, options);
    document.addEventListener("wheel", cancelWheelZoom, options);
    return () => {
      document.removeEventListener("gesturestart", cancel);
      document.removeEventListener("gesturechange", cancel);
      document.removeEventListener("gestureend", cancel);
      document.removeEventListener("touchmove", cancelPinch);
      document.removeEventListener("wheel", cancelWheelZoom);
    };
  }, []);
  return null;
}
