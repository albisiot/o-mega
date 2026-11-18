import { describe, expect, it } from "vitest";
import { createNavHistory, type NavHistory, type NavWindow } from "@/lib/nav-history";

type Entry = { url: string; state: unknown };

/**
 * A browser tab, enough for the history: entries with their state, traversals that fire
 * "popstate" when flushed (as a browser does, later), timers run by hand. `rendered` is what a
 * router listening after the app's history would have shown.
 */
class FakeTab {
  entries: Entry[];
  index: number;
  storage: Map<string, string>;
  rendered: string[] = [];
  listeners: ((event: PopStateEvent) => void)[] = [];
  traversals: number[] = [];
  timers: (() => void)[] = [];
  readonly win: NavWindow;

  constructor({ url = "/", entries, index, storage, type = "navigate" }: {
    url?: string;
    entries?: Entry[];
    index?: number;
    storage?: Map<string, string>;
    type?: string;
  } = {}) {
    this.entries = entries ?? [{ url, state: null }];
    this.index = index ?? this.entries.length - 1;
    this.storage = storage ?? new Map();
    this.win = fakeWindow(this, type);
  }

  /** The app's history, then a router listening after it. */
  start(): NavHistory {
    const nav = createNavHistory(this.win);
    this.win.addEventListener(
      "popstate",
      () => this.rendered.push(new URL(this.entries[this.index].url, "http://local").pathname),
      false,
    );
    return nav;
  }

  /** A link or router.push: the router writes the entry with its own state. */
  push(url: string) {
    this.win.history.pushState({ __NA: true }, "", url);
  }

  /** router.replace. */
  replace(url: string) {
    this.win.history.replaceState({ __NA: true }, "", url);
  }

  /** The browser's back (or forward) button. */
  press(delta: number) {
    this.win.history.go(delta);
    this.flush();
  }

  /** Runs the traversals asked for, each firing "popstate", until none is left. */
  flush() {
    for (let delta = this.traversals.shift(); delta !== undefined; delta = this.traversals.shift()) {
      const target = this.index + delta;
      if (target < 0 || target >= this.entries.length) continue;
      this.index = target;
      let stopped = false;
      const event = { state: this.entries[target].state, stopImmediatePropagation: () => (stopped = true) } as unknown as PopStateEvent;
      for (const listener of [...this.listeners]) {
        if (stopped) break;
        listener(event);
      }
    }
  }

  runTimers() {
    const timers = this.timers;
    this.timers = [];
    for (const timer of timers) timer();
    this.flush();
  }

  get path() {
    return new URL(this.entries[this.index].url, "http://local").pathname.replace(/\/$/, "") || "/";
  }
}

/** The window of the tab, as the app's history sees it. */
function fakeWindow(tab: FakeTab, type: string): NavWindow {
  return {
    history: {
      get state() {
        return tab.entries[tab.index].state;
      },
      pushState(data, _unused, url) {
        tab.entries = tab.entries.slice(0, tab.index + 1);
        tab.entries.push({ url: String(url ?? tab.entries[tab.index].url), state: structuredClone(data) });
        tab.index++;
      },
      replaceState(data, _unused, url) {
        tab.entries[tab.index] = { url: String(url ?? tab.entries[tab.index].url), state: structuredClone(data) };
      },
      go(delta) {
        tab.traversals.push(delta);
      },
    },
    location: {
      get pathname() {
        return new URL(tab.entries[tab.index].url, "http://local").pathname;
      },
      get search() {
        return new URL(tab.entries[tab.index].url, "http://local").search;
      },
    },
    sessionStorage: {
      getItem: (key) => tab.storage.get(key) ?? null,
      setItem: (key, value) => void tab.storage.set(key, value),
    },
    addEventListener: (_type, listener) => void tab.listeners.push(listener),
    navigationType: () => type,
    setTimeout: (callback) => tab.timers.push(callback),
    clearTimeout: () => {},
  };
}

/** Home → Gioca → team picker → waiting page → the match (the waiting page replaced by it). */
function queueToMatch(tab: FakeTab, nav: NavHistory) {
  tab.push("/gioca/");
  tab.push("/squadra/?mode=queue");
  tab.push("/attesa/?mode=queue");
  nav.consumePrevious("/squadra");
  tab.replace("/partita/?id=1");
}

describe("createNavHistory", () => {
  it("knows the page behind the one shown", () => {
    const tab = new FakeTab();
    const nav = tab.start();
    expect(nav.previous()).toBeNull();
    tab.push("/profilo/");
    tab.push("/bestiario/");
    expect(nav.current()).toBe("/bestiario");
    expect(nav.previous()).toBe("/profilo");
  });

  it("keeps its mark through the router's own writes", () => {
    const tab = new FakeTab();
    const nav = tab.start();
    tab.push("/storico/");
    // The router rewrites the entry with a state of its own, without the app's mark.
    tab.replace("/storico/");
    expect(nav.previous()).toBe("/");
    expect(tab.win.history.state).toMatchObject({ __NA: true, __omegaNav: { index: 1 } });
  });

  it("goes back to the page the player came from, not to a fixed one", () => {
    const tab = new FakeTab();
    const nav = tab.start();
    tab.push("/profilo/");
    tab.push("/bestiario/");
    expect(nav.back()).toBe(true);
    tab.flush();
    expect(tab.path).toBe("/profilo");
  });

  it("does not loop: back from B to A, then back from A leaves A", () => {
    const tab = new FakeTab();
    const nav = tab.start();
    tab.push("/profilo/");
    tab.push("/storico/");
    nav.back();
    tab.flush();
    expect(tab.path).toBe("/profilo");
    expect(nav.previous()).toBe("/");
  });

  it("has nothing behind a page opened afresh: the caller uses its fallback", () => {
    const tab = new FakeTab({ url: "/carta/?id=7" });
    const nav = tab.start();
    expect(nav.previous()).toBeNull();
    expect(nav.back()).toBe(false);
  });

  it("from a match goes back over the waiting page and the team picker", () => {
    const tab = new FakeTab();
    const nav = tab.start();
    queueToMatch(tab, nav);
    expect(nav.previous()).toBe("/gioca");
    nav.back();
    tab.flush();
    expect(tab.path).toBe("/gioca");
    expect(tab.rendered).toEqual(["/gioca/"]);
  });

  it("steps over the team picker on the browser's back, before the router shows it", () => {
    const tab = new FakeTab();
    const nav = tab.start();
    queueToMatch(tab, nav);
    tab.press(-1);
    expect(tab.path).toBe("/gioca");
    expect(tab.rendered).toEqual(["/gioca/"]);
  });

  it("steps over it going forward too", () => {
    const tab = new FakeTab();
    const nav = tab.start();
    queueToMatch(tab, nav);
    tab.press(-1);
    tab.press(1);
    expect(tab.path).toBe("/partita");
    expect(tab.rendered).toEqual(["/gioca/", "/partita/"]);
  });

  it("never reopens the waiting page: forward bounces back", () => {
    const tab = new FakeTab();
    const nav = tab.start();
    tab.push("/gioca/");
    tab.push("/squadra/?mode=queue");
    tab.push("/attesa/?mode=queue");
    tab.press(-1);
    expect(tab.path).toBe("/squadra");
    tab.press(1);
    expect(tab.path).toBe("/squadra");
    expect(tab.rendered).not.toContain("/attesa/");
    expect(nav.leaving()).toBe(false);
  });

  it("opens a step's parent in its place when nothing is behind it", async () => {
    const tab = new FakeTab({ url: "/squadra/?mode=join&code=ABC234" });
    const nav = tab.start();
    tab.push("/attesa/?mode=queue");
    nav.consumePrevious("/squadra");
    tab.replace("/partita/?id=1");
    let told = 0;
    nav.subscribe(() => told++);
    tab.press(-1);
    expect(tab.path).toBe("/squadra");
    expect(nav.redirect()).toBe("/gioca");
    expect(nav.leaving()).toBe(true);
    await Promise.resolve();
    expect(told).toBe(1);
    tab.replace("/gioca/");
    expect(nav.redirect()).toBeNull();
    expect(nav.leaving()).toBe(false);
  });

  it("steps over a pack already revealed", () => {
    const tab = new FakeTab();
    const nav = tab.start();
    tab.push("/obiettivi/");
    tab.push("/pacchetto/?id=a&from=%2Fobiettivi");
    nav.consumeCurrent();
    nav.back();
    tab.flush();
    expect(tab.path).toBe("/obiettivi");
    tab.press(1);
    expect(tab.path).toBe("/obiettivi");
    expect(tab.rendered).not.toContain("/pacchetto/");
  });

  it("only consumes the page behind when it is the one named", () => {
    const tab = new FakeTab();
    const nav = tab.start();
    tab.push("/gioca/");
    tab.push("/attesa/?mode=lobby");
    nav.consumePrevious("/squadra");
    tab.replace("/partita/?id=1");
    expect(nav.previous()).toBe("/gioca");
  });

  it("follows a page that changes its own address", () => {
    const tab = new FakeTab();
    const nav = tab.start();
    tab.push("/collezione/");
    tab.push("/carta/?id=1");
    // Swiping to the next card replaces the address.
    tab.win.history.replaceState(null, "", "/carta/?id=2");
    expect(nav.current()).toBe("/carta?id=2");
    expect(nav.previous()).toBe("/collezione");
  });

  it("survives a reload", () => {
    const first = new FakeTab();
    first.start();
    first.push("/profilo/");
    first.push("/storico/");
    const reloaded = new FakeTab({ entries: first.entries, index: first.index, storage: first.storage, type: "reload" });
    const nav = reloaded.start();
    expect(nav.previous()).toBe("/profilo");
    nav.back();
    reloaded.flush();
    expect(reloaded.path).toBe("/profilo");
  });

  it("stays on the waiting page reloaded, but leaves it when the browser's back reopens it", () => {
    const first = new FakeTab();
    first.start();
    first.push("/gioca/");
    first.push("/squadra/?mode=queue");
    first.push("/attesa/?mode=queue");
    const reloaded = new FakeTab({ entries: first.entries, index: first.index, storage: first.storage, type: "reload" });
    expect(reloaded.start().leaving()).toBe(false);
    const reopened = new FakeTab({ entries: first.entries, index: first.index, storage: first.storage, type: "back_forward" });
    const nav = reopened.start();
    // The page must not join the queue while the history moves on.
    expect(nav.leaving()).toBe(true);
    reopened.flush();
    expect(reopened.path).toBe("/squadra");
    expect(nav.leaving()).toBe(false);
  });

  it("starts a new visit in a tab opened afresh, keeping the others", () => {
    const first = new FakeTab();
    first.start();
    first.push("/profilo/");
    // Back from the Google sign-in: a new page load without the app's mark.
    const back = new FakeTab({ url: "/auth/callback/", storage: first.storage });
    const nav = back.start();
    expect(nav.previous()).toBeNull();
    back.replace("/");
    expect(nav.current()).toBe("/");
    expect(Object.keys(JSON.parse(back.storage.get("o-mega.nav") ?? "{}"))).toHaveLength(2);
  });

  it("goes back where it was when the entry after a step no longer exists", () => {
    const tab = new FakeTab();
    const nav = tab.start();
    queueToMatch(tab, nav);
    tab.press(-1);
    // The browser dropped the forward entries (a page of another site opened meanwhile).
    tab.entries = tab.entries.slice(0, tab.index + 2);
    tab.press(1);
    expect(tab.path).toBe("/squadra");
    tab.runTimers();
    expect(tab.path).toBe("/gioca");
  });
});
