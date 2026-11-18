// Where the player was on a page: going back to it (a back arrow, or the browser's back)
// reopens it at the same scroll position, with the same mode or tab open.
//
// - Every in-app link click saves the page being left (see <PlaceMemory />).
// - A page comes back "returning" after the browser's back/forward or a back link.
// - Only then are the saved position and state restored: a page opened afresh starts clean.
// Which page a way back leads to is src/lib/nav-history.ts.
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BASE_PATH } from "@/lib/base-path";

const STORE_KEY = "o-mega.places";
const MAX_PLACES = 40;
/** Scroll containers inside a page that fits the screen: `data-keep-scroll="name"`. */
export const KEEP_SCROLL_ATTRIBUTE = "data-keep-scroll";

type Place = { y: number; boxes: Record<string, number>; state: Record<string, unknown> };
type Places = Record<string, Place>;

/** The page a URL points to, without basePath and trailing slash: "/squadra?difficulty=easy". */
export function placeKey(url: string): string {
  const parsed = new URL(url, "http://local");
  let path = parsed.pathname;
  if (BASE_PATH && (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`))) path = path.slice(BASE_PATH.length);
  path = path.replace(/\/+$/, "") || "/";
  return `${path}${parsed.search}`;
}

/** The path alone of a place key. */
export function placePath(key: string): string {
  return key.split("?")[0];
}

export function currentPlaceKey(): string {
  return placeKey(window.location.pathname + window.location.search);
}

function readPlaces(): Places {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Places) : {};
  } catch {
    return {};
  }
}

function writePlaces(places: Places) {
  try {
    const keys = Object.keys(places);
    // Oldest first in insertion order: drop the oldest beyond the limit.
    for (const key of keys.slice(0, Math.max(0, keys.length - MAX_PLACES))) delete places[key];
    sessionStorage.setItem(STORE_KEY, JSON.stringify(places));
  } catch {
    // The place is a convenience: losing it is fine.
  }
}

function placeOf(places: Places, key: string): Place {
  return places[key] ?? { y: 0, boxes: {}, state: {} };
}

/** Saves the scroll of the page being left (the window and its marked containers). */
export function rememberScroll(key = currentPlaceKey()) {
  const places = readPlaces();
  const place = placeOf(places, key);
  place.y = window.scrollY;
  place.boxes = {};
  document.querySelectorAll<HTMLElement>(`[${KEEP_SCROLL_ATTRIBUTE}]`).forEach((box) => {
    const name = box.getAttribute(KEEP_SCROLL_ATTRIBUTE);
    if (name) place.boxes[name] = box.scrollTop;
  });
  delete places[key];
  places[key] = place;
  writePlaces(places);
}

function rememberState(key: string, name: string, value: unknown) {
  const places = readPlaces();
  const place = placeOf(places, key);
  place.state[name] = value;
  places[key] = place;
  writePlaces(places);
}

export function savedPlace(key: string): Place | null {
  return readPlaces()[key] ?? null;
}

// The page being returned to, until its place has been restored.
let returningTo: string | null = null;

export function markReturning(key: string) {
  returningTo = key;
}

export function isReturning(key: string): boolean {
  return returningTo === key;
}

export function doneReturning() {
  returningTo = null;
}

/**
 * State that survives a trip to another page and back (the open mode, the tab): restored when
 * the page comes back, the initial value when it is opened afresh.
 */
export function useRememberedState<T>(name: string, initial: T) {
  // The router's path, not the address bar: on a push the page renders before the URL changes.
  const pathname = usePathname();
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined" || returningTo === null) return initial;
    if (placePath(returningTo) !== placePath(placeKey(pathname))) return initial;
    const saved = savedPlace(returningTo)?.state[name];
    return saved === undefined ? initial : (saved as T);
  });

  useEffect(() => {
    rememberState(currentPlaceKey(), name, value);
  }, [name, value]);

  return [value, setValue] as const;
}
