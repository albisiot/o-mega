"use client";

import { useEffect, useRef } from "react";

function probe(css: string, read: (element: HTMLElement) => number): number {
  const element = document.createElement("div");
  element.style.cssText = `position:fixed;visibility:hidden;${css}`;
  document.body.append(element);
  const value = read(element);
  element.remove();
  return Math.round(value);
}

/** Temporary: shows the real viewport sizes in the installed app, to diagnose the iOS gap on a device. */
export function ViewportReadout() {
  const line = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(display-mode: standalone)").matches) return;
    const update = () => {
      if (!line.current) return;
      const lvh = probe("height:100lvh", (element) => element.offsetHeight);
      const top = probe("padding-top:env(safe-area-inset-top)", (element) => element.offsetHeight);
      const bottom = probe("padding-top:env(safe-area-inset-bottom)", (element) => element.offsetHeight);
      const ios = /OS (\d+_\d+)/.exec(navigator.userAgent)?.[1] ?? "?";
      line.current.textContent = [
        "b3",
        `win ${window.innerHeight}`,
        `scr ${window.screen.height}`,
        `lvh ${lvh}`,
        `doc ${document.documentElement.scrollHeight}`,
        `vv ${Math.round(window.visualViewport?.height ?? 0)}`,
        `in ${top}/${bottom}`,
        `iOS ${ios}`,
      ].join(" · ");
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <p
      ref={line}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-30 text-center text-[10px] text-zinc-500"
    />
  );
}
