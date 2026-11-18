// The app's own record of the browser history: for each visit (a run of history entries the
// app wrote), the page at each position. Every way back (a back arrow, a "Torna a…" button,
// the browser's back, the iPhone's swipe) uses it to land on the page the player came from,
// stepping over the steps that must not be shown again.
//
// Pure functions: the browser side, which keeps it in step with the history, is
// src/lib/nav-history.ts.
import { safeReturnPath } from "@/lib/pack-return";
import { placePath } from "@/lib/place-memory";

/** One history entry: its page (a place key, "/squadra?difficulty=easy"). */
export type NavEntry = {
  key: string;
  /** A step that is over (a team picker whose match started, a pack already revealed). */
  consumed?: true;
};

/** The entries of one visit by position in the history; null where the page is not known. */
export type NavEntries = (NavEntry | null)[];

/** Whether the history must step over this entry. */
export function isTransient(entry: NavEntry | null | undefined): boolean {
  if (!entry) return false;
  if (entry.consumed) return true;
  const path = placePath(entry.key);
  // The waiting page joins a queue as it opens (a friend code's only shows the code again).
  if (path === "/attesa") return new URLSearchParams(entry.key.slice(path.length)).get("mode") !== "lobby";
  return path === "/auth/callback";
}

function upTo(entries: NavEntries, length: number): NavEntries {
  const kept = entries.slice(0, length);
  while (kept.length < length) kept.push(null);
  return kept;
}

/** A new entry at `index`: the ones after it (the forward history) are gone. */
export function pushEntry(entries: NavEntries, index: number, key: string): NavEntries {
  return [...upTo(entries, index), { key }];
}

/** The entry at `index` shows another address: the same entry still, unless the page changed. */
export function replaceEntry(entries: NavEntries, index: number, key: string): NavEntries {
  const next = upTo(entries, Math.max(entries.length, index + 1));
  const old = next[index];
  next[index] = old && old.key === key ? old : { key };
  return next;
}

export function consumeEntry(entries: NavEntries, index: number): NavEntries {
  const old = entries[index];
  if (!old || old.consumed) return entries;
  const next = [...entries];
  next[index] = { ...old, consumed: true };
  return next;
}

/** At most `max` known entries: the oldest are forgotten (a way back past them uses its fallback). */
export function trimEntries(entries: NavEntries, max: number): NavEntries {
  if (entries.length <= max) return entries;
  return entries.map((entry, index) => (index < entries.length - max ? null : entry));
}

/** The position a way back from `index` returns to: the nearest page behind it that may be shown. */
export function backIndex(entries: NavEntries, index: number): number | null {
  for (let at = index - 1; at >= 0; at--) {
    const entry = entries[at];
    if (!entry) return null;
    if (!isTransient(entry)) return at;
  }
  return null;
}

/** What to do once the history lands on an entry: move on to another one, or open a page in its place. */
export type Landing = { go: number } | { replace: string } | null;

/**
 * The history moved from `from` (null: not known, e.g. a page loaded by the browser's back)
 * to `index`. A step that must not be shown again is stepped over in the same direction; going
 * forward with nothing after it, the history goes back where it was; going back with nothing
 * before it, the step's parent page takes its place.
 */
export function landingOn(entries: NavEntries, index: number, from: number | null): Landing {
  const entry = entries[index];
  if (!entry || !isTransient(entry)) return null;
  if (from !== null && index > from) {
    for (let at = index + 1; at < entries.length; at++) {
      const next = entries[at];
      if (!next) break;
      if (!isTransient(next)) return { go: at };
    }
    return { go: from };
  }
  const back = backIndex(entries, index);
  return back === null ? { replace: parentOf(entry.key) } : { go: back };
}

/** The page above a step of the app, for when nothing is behind it: where a fresh visit starts. */
export function parentOf(key: string): string {
  const path = placePath(key);
  const params = new URLSearchParams(key.slice(path.length));
  if (path === "/squadra") {
    if (params.get("story")) return "/storia";
    return params.get("mode") === "ranked" ? "/classificata" : "/gioca";
  }
  if (path === "/attesa") return params.get("type") === "ranked" ? "/classificata" : "/gioca";
  if (path === "/pacchetto") return safeReturnPath(params.get("from")) ?? "/";
  return "/";
}

/** Whether `key` is the page `target` names: the same path, and the same query when it has one. */
export function isPlace(key: string, target: string): boolean {
  if (placePath(key) !== placePath(target)) return false;
  return !target.includes("?") || key === target;
}
