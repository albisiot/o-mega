// Keeps the app's record of the history (src/lib/nav-stack.ts) in step with the browser.
//
// - Every history entry the app writes carries its position: `{ sid, index }` in its state,
//   next to the router's own. `sid` names the visit: a page opened afresh (a new tab, a return
//   from the Google sign-in) starts a new one, a reload keeps it.
// - pushState and replaceState are wrapped, so every link, router.push or router.replace is
//   recorded, whoever makes it; the pages of each visit are kept in sessionStorage, so they
//   survive a reload.
// - The browser's back and forward (and the iPhone's swipe) land on an entry whose position is
//   known: one that must not be shown again (the waiting page, a team picker whose match
//   started) is stepped over before the router renders it.
import { usePathname } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";
import {
  backIndex,
  consumeEntry,
  landingOn,
  pushEntry,
  replaceEntry,
  trimEntries,
  type NavEntries,
  type NavEntry,
} from "@/lib/nav-stack";
import { placeKey, placePath } from "@/lib/place-memory";

const STATE_KEY = "__omegaNav";
const STORE_KEY = "o-mega.nav";
/** Visits kept: the current one and a few before it (a return from another site may reopen them). */
const MAX_VISITS = 4;
/** Pages kept per visit: a way back past the oldest uses its fallback. */
const MAX_ENTRIES = 150;
/** A jump over a step that has not landed by then (the entry after it no longer exists) goes back. */
const JUMP_TIMEOUT_MS = 600;

type Stamp = { sid: string; index: number };
type Visit = { entries: NavEntries; at: number };
type Store = Record<string, Visit>;

/** What the module needs of the browser: `window`, or a fake in the tests. */
export type NavWindow = {
  history: {
    readonly state: unknown;
    pushState(data: unknown, unused: string, url?: string | URL | null): void;
    replaceState(data: unknown, unused: string, url?: string | URL | null): void;
    go(delta: number): void;
  };
  location: { pathname: string; search: string };
  sessionStorage: { getItem(key: string): string | null; setItem(key: string, value: string): void };
  addEventListener(type: "popstate", listener: (event: PopStateEvent) => void, capture: boolean): void;
  /** How this page was loaded: "reload", "back_forward", "navigate". */
  navigationType(): string | undefined;
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
};

export type NavHistory = {
  /** The page a way back from the current one returns to, or null when the app has none behind it. */
  previous(): string | null;
  /** The page shown, as the history records it. */
  current(): string | null;
  /** Goes back to `previous()`, stepping over what must not be shown again. False when there is none. */
  back(): boolean;
  /** The step right behind this page, if it is a page on `path`, is over: the history steps over it. */
  consumePrevious(path: string): void;
  /** The step shown is over (a pack revealed): going back to it later steps over it. */
  consumeCurrent(): void;
  /** The history is stepping over the page shown, or replacing it: it must not act (join a queue…). */
  leaving(): boolean;
  /** A page the router should open in place of the one shown (a step with nothing behind it). */
  redirect(): string | null;
  subscribe(listener: () => void): () => void;
};

function readStamp(state: unknown): Stamp | null {
  const stamp = (state as Record<string, unknown> | null | undefined)?.[STATE_KEY] as Partial<Stamp> | undefined;
  if (!stamp || typeof stamp.sid !== "string" || typeof stamp.index !== "number" || !Number.isInteger(stamp.index)) {
    return null;
  }
  return stamp.index >= 0 ? { sid: stamp.sid, index: stamp.index } : null;
}

function stamped(data: unknown, stamp: Stamp): Record<string, unknown> {
  return { ...(data && typeof data === "object" ? (data as Record<string, unknown>) : {}), [STATE_KEY]: stamp };
}

function newSid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function createNavHistory(win: NavWindow): NavHistory {
  const { history } = win;
  const nativePush = history.pushState.bind(history);
  const nativeReplace = history.replaceState.bind(history);
  const listeners = new Set<() => void>();
  const store: Store = readStore();
  // The entry the router shows: where a traversal comes from.
  let shown: Stamp | null = null;
  // The entry being stepped over, until the history lands further on.
  let skipping: Stamp | null = null;
  let jumpTimer: unknown = null;
  let redirectTo: string | null = null;
  let notifyQueued = false;

  function readStore(): Store {
    try {
      const raw = win.sessionStorage.getItem(STORE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? (parsed as Store) : {};
    } catch {
      return {};
    }
  }

  function writeStore() {
    const sids = Object.keys(store).sort((a, b) => store[b].at - store[a].at);
    for (const sid of sids.slice(MAX_VISITS)) delete store[sid];
    try {
      win.sessionStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {
      // The record is a convenience: without it every way back uses its fallback.
    }
  }

  function entriesOf(sid: string): NavEntries {
    const visit = store[sid];
    return visit && Array.isArray(visit.entries) ? visit.entries : [];
  }

  function setEntries(sid: string, entries: NavEntries) {
    // Another page of the tab may have written meanwhile (this one kept by the browser's cache).
    Object.assign(store, readStore());
    store[sid] = { entries: trimEntries(entries, MAX_ENTRIES), at: Date.now() };
    writeStore();
  }

  function locationKey(): string {
    return placeKey(win.location.pathname + win.location.search);
  }

  // Listeners are told after the call that changed the history: the router writes it while
  // committing a render, when React must not be asked to render again.
  function notify() {
    if (notifyQueued) return;
    notifyQueued = true;
    queueMicrotask(() => {
      notifyQueued = false;
      for (const listener of listeners) listener();
    });
  }

  function here(): Stamp | null {
    const stamp = readStamp(history.state);
    return stamp && store[stamp.sid] ? stamp : null;
  }

  function landed(stamp: Stamp) {
    shown = stamp;
    skipping = null;
    if (jumpTimer !== null) win.clearTimeout(jumpTimer);
    jumpTimer = null;
  }

  /** Moves the history from the entry it is on (`at`) to position `to`, without showing `at`. */
  function jump(at: Stamp, to: number) {
    skipping = at;
    const from = shown && shown.sid === at.sid ? shown.index : null;
    history.go(to - at.index);
    if (jumpTimer !== null) win.clearTimeout(jumpTimer);
    // An entry after it that no longer exists (left for another site): back where it came from.
    jumpTimer = win.setTimeout(() => {
      jumpTimer = null;
      const still = readStamp(history.state);
      if (skipping && still && still.sid === at.sid && still.index === at.index && from !== null && from !== at.index) {
        history.go(from - at.index);
      }
    }, JUMP_TIMEOUT_MS);
  }

  // The entry shown when the page loads.
  {
    const key = locationKey();
    const stamp = readStamp(history.state);
    if (stamp) {
      // A reload, or a page reopened by back or forward: the visit goes on.
      setEntries(stamp.sid, replaceEntry(entriesOf(stamp.sid), stamp.index, key));
      landed(stamp);
      if (win.navigationType() === "back_forward") {
        const landing = landingOn(entriesOf(stamp.sid), stamp.index, null);
        if (landing && "go" in landing) jump(stamp, landing.go);
        else if (landing) redirectTo = landing.replace;
      }
    } else {
      const fresh = { sid: newSid(), index: 0 };
      setEntries(fresh.sid, [{ key }]);
      nativeReplace(stamped(history.state, fresh), "");
      landed(fresh);
    }
  }

  history.pushState = function pushState(data: unknown, unused: string, url?: string | URL | null) {
    const from = here();
    const stamp = from ? { sid: from.sid, index: from.index + 1 } : { sid: newSid(), index: 0 };
    nativePush(stamped(data, stamp), unused, url);
    setEntries(stamp.sid, pushEntry(entriesOf(stamp.sid), stamp.index, locationKey()));
    landed(stamp);
    redirectTo = null;
    notify();
  };

  history.replaceState = function replaceState(data: unknown, unused: string, url?: string | URL | null) {
    const stamp = here() ?? { sid: newSid(), index: 0 };
    nativeReplace(stamped(data, stamp), unused, url);
    const before = entriesOf(stamp.sid)[stamp.index]?.key;
    const key = locationKey();
    setEntries(stamp.sid, replaceEntry(entriesOf(stamp.sid), stamp.index, key));
    if (before !== key) {
      // Another page in place of this one (the redirect, a match after the wait): shown now.
      landed(stamp);
      redirectTo = null;
    }
    notify();
  };

  // Capture phase, added before the router's own listener: a step over an entry is decided
  // before the router renders it.
  win.addEventListener(
    "popstate",
    (event) => {
      const stamp = readStamp(event.state);
      if (!stamp || !store[stamp.sid]) {
        shown = null;
        return;
      }
      const from = shown && shown.sid === stamp.sid ? shown.index : null;
      const landing = landingOn(entriesOf(stamp.sid), stamp.index, from);
      if (landing && "go" in landing && landing.go !== stamp.index) {
        // The router never sees this entry: it keeps showing the page until the next one lands.
        event.stopImmediatePropagation();
        jump(stamp, landing.go);
        return;
      }
      landed(stamp);
      redirectTo = landing && "replace" in landing ? landing.replace : null;
      notify();
    },
    true,
  );

  return {
    previous() {
      const stamp = here();
      if (!stamp) return null;
      const entries = entriesOf(stamp.sid);
      const index = backIndex(entries, stamp.index);
      return index === null ? null : (entries[index] as NavEntry).key;
    },
    current() {
      const stamp = here();
      return stamp ? (entriesOf(stamp.sid)[stamp.index]?.key ?? null) : null;
    },
    back() {
      const stamp = here();
      if (!stamp) return false;
      const index = backIndex(entriesOf(stamp.sid), stamp.index);
      if (index === null) return false;
      history.go(index - stamp.index);
      return true;
    },
    consumePrevious(path: string) {
      const stamp = here();
      if (!stamp || stamp.index === 0) return;
      const entries = entriesOf(stamp.sid);
      const behind = entries[stamp.index - 1];
      if (behind && placePath(behind.key) === path) setEntries(stamp.sid, consumeEntry(entries, stamp.index - 1));
    },
    consumeCurrent() {
      const stamp = here();
      if (stamp) setEntries(stamp.sid, consumeEntry(entriesOf(stamp.sid), stamp.index));
    },
    leaving() {
      return skipping !== null || redirectTo !== null;
    },
    redirect() {
      return redirectTo;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

function browserWindow(): NavWindow {
  return {
    history: window.history,
    location: window.location,
    sessionStorage: {
      getItem: (key) => window.sessionStorage.getItem(key),
      setItem: (key, value) => window.sessionStorage.setItem(key, value),
    },
    addEventListener: (type, listener, capture) => window.addEventListener(type, listener, capture),
    navigationType: () => {
      try {
        return (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type;
      } catch {
        return undefined;
      }
    },
    setTimeout: (callback, ms) => window.setTimeout(callback, ms),
    clearTimeout: (handle) => window.clearTimeout(handle as number),
  };
}

let instance: NavHistory | null = null;

/**
 * The app's history, started as soon as this module loads in the browser: before the router
 * writes its first entry, so that every entry carries its position.
 */
export function navHistory(): NavHistory | null {
  if (instance === null && typeof window !== "undefined") instance = createNavHistory(browserWindow());
  return instance;
}

if (typeof window !== "undefined") {
  const started = navHistory();
  // In `next dev` only: the record can be read, and a step marked over, from the console.
  if (process.env.NODE_ENV === "development") Object.assign(window, { __omegaNav: started });
}

const noSubscription = () => () => {};

/**
 * The page a way back from this one returns to, or null when the app has none behind it. Known
 * only in the browser; arriving by a link, the page renders before its entry is written, and
 * the page being left is then the one behind it.
 */
export function usePreviousPage(): string | null {
  const pathname = usePathname();
  const read = useCallback(() => {
    const history = navHistory();
    if (!history) return null;
    const current = history.current();
    if (current !== null && placePath(current) !== placePath(placeKey(pathname))) return current;
    return history.previous();
  }, [pathname]);
  return useSyncExternalStore(navHistory()?.subscribe ?? noSubscription, read, () => null);
}
