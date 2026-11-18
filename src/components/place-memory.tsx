"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { navHistory } from "@/lib/nav-history";
import { placeHref } from "@/lib/pack-return";
import {
  KEEP_SCROLL_ATTRIBUTE,
  currentPlaceKey,
  doneReturning,
  isReturning,
  markReturning,
  placeKey,
  rememberScroll,
  savedPlace,
} from "@/lib/place-memory";

/** How long a page coming back keeps trying to reach its place while its content loads. */
const RESTORE_MS = 2500;
const STEP_MS = 50;

const noSubscription = () => () => {};
const noRedirect = () => null;

/**
 * Remembers where the player was on each page and takes them back there (see
 * src/lib/place-memory.ts). Mounted once, in the root layout: importing it starts the app's
 * record of the history (src/lib/nav-history.ts) before the router writes its first entry.
 */
export function PlaceMemory() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const router = useRouter();
  const history = navHistory();
  const redirect = useSyncExternalStore(history?.subscribe ?? noSubscription, history?.redirect ?? noRedirect, noRedirect);

  // The history landed on a step with nothing behind it (a team picker whose match started,
  // opened from a shared link): its parent page takes its place, once the router shows the step
  // (opening it any earlier, the router's own return to the step would undo it).
  const shownKey = placeKey(search ? `${pathname}?${search}` : pathname);
  useEffect(() => {
    if (redirect !== null && shownKey === history?.current()) router.replace(placeHref(redirect));
  }, [redirect, shownKey, history, router]);

  // Leaving a page by a link: save where it was.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || (link.target && link.target !== "_self") || link.origin !== window.location.origin) return;
      rememberScroll(currentPlaceKey());
      doneReturning();
    };
    // The browser's back and forward: the page shown is one the player has been on. It must be
    // known before the page renders: the Navigation API tells first where there is one (the
    // router may render before "popstate"), "popstate" in capture phase elsewhere.
    const onPopState = () => markReturning(currentPlaceKey());
    const navigation = (window as WindowWithNavigation).navigation;
    const onNavigate = (event: Event) => {
      const { navigationType, destination } = event as NavigateEvent;
      if (navigationType === "traverse") markReturning(placeKey(destination.url));
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState, true);
    navigation?.addEventListener("navigate", onNavigate);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState, true);
      navigation?.removeEventListener("navigate", onNavigate);
    };
  }, []);

  // A page coming back: scroll to where it was as soon as its content is tall enough.
  useEffect(() => {
    const key = currentPlaceKey();
    if (!isReturning(key)) return;
    const place = savedPlace(key);
    const started = performance.now();
    let timer = 0;
    let stopped = false;

    const stop = () => {
      if (stopped) return;
      stopped = true;
      window.clearTimeout(timer);
      if (isReturning(key)) doneReturning();
      for (const type of INPUTS) window.removeEventListener(type, stop, true);
    };
    // The player's own scrolling wins.
    for (const type of INPUTS) window.addEventListener(type, stop, { capture: true, passive: true });

    const step = () => {
      if (place) {
        const root = document.documentElement;
        if (place.y > 0 && root.scrollHeight - window.innerHeight >= place.y - 1 && Math.abs(window.scrollY - place.y) > 1) {
          window.scrollTo(0, place.y);
        }
        for (const [name, top] of Object.entries(place.boxes)) {
          const box = document.querySelector<HTMLElement>(`[${KEEP_SCROLL_ATTRIBUTE}="${name}"]`);
          if (box && top > 0 && box.scrollHeight - box.clientHeight >= top - 1 && Math.abs(box.scrollTop - top) > 1) {
            box.scrollTop = top;
          }
        }
      }
      if (performance.now() - started > RESTORE_MS) stop();
      else timer = window.setTimeout(step, STEP_MS);
    };
    // Timers rather than animation frames: they also run while the page is still in the background.
    timer = window.setTimeout(step, 0);
    return stop;
  }, [pathname, search]);

  return null;
}

const INPUTS = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

// The parts of the Navigation API used here (not in every browser, nor in the DOM types yet).
type NavigateEvent = Event & { navigationType: string; destination: { url: string } };
type WindowWithNavigation = Window & { navigation?: EventTarget };
