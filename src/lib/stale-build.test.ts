import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { isStaleBuildError, mayReload, RELOAD_WINDOW_MS, STALE_BUILD_SCRIPT } from "./stale-build";

const mark = (path: string, at: number) => JSON.stringify({ path, at });

describe("isStaleBuildError", () => {
  it("recognizes Turbopack's ChunkLoadError", () => {
    const error = new Error("Failed to load chunk /o-mega/_next/static/chunks/0abc.js from module 123");
    error.name = "ChunkLoadError";
    expect(isStaleBuildError(error)).toBe(true);
  });

  it("recognizes failed native and webpack imports", () => {
    expect(isStaleBuildError(new TypeError("Failed to fetch dynamically imported module: https://x/a.js"))).toBe(true);
    expect(isStaleBuildError(new TypeError("Importing a module script failed."))).toBe(true);
    expect(isStaleBuildError(new Error("Loading chunk 42 failed."))).toBe(true);
    expect(isStaleBuildError(new Error("Loading CSS chunk app-page failed."))).toBe(true);
  });

  it("ignores other errors and non-errors", () => {
    expect(isStaleBuildError(new Error("match_not_found"))).toBe(false);
    expect(isStaleBuildError("ChunkLoadError")).toBe(false);
    expect(isStaleBuildError(null)).toBe(false);
  });
});

describe("mayReload", () => {
  it("allows the first reload of a tab", () => {
    expect(mayReload(null, "/o-mega/profilo/", 1_000)).toBe(true);
  });

  it("refuses a second reload of the same page within the window", () => {
    expect(mayReload(mark("/o-mega/profilo/", 1_000), "/o-mega/profilo/", 1_000 + RELOAD_WINDOW_MS - 1)).toBe(false);
  });

  it("allows it once the window has passed, or on another page", () => {
    expect(mayReload(mark("/o-mega/profilo/", 1_000), "/o-mega/profilo/", 1_000 + RELOAD_WINDOW_MS)).toBe(true);
    expect(mayReload(mark("/o-mega/profilo/", 1_000), "/o-mega/gioca/", 1_500)).toBe(true);
  });

  it("treats a damaged mark as no mark", () => {
    expect(mayReload("{oops", "/o-mega/", 1_000)).toBe(true);
    expect(mayReload("42", "/o-mega/", 1_000)).toBe(true);
  });
});

/** Runs the inline script against a fake page; returns a way to fire load errors and what happened. */
function loadPage({ path = "/o-mega/profilo/", now = 10_000, stored = null as string | null, online = true } = {}) {
  const listeners = new Map<string, Set<(event: unknown) => void>>();
  const storage = new Map<string, string>(stored === null ? [] : [["o-mega-stale-reload", stored]]);
  const page = { reloads: 0, storage };
  const context = {
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    },
    removeEventListener: (type: string, listener: (event: unknown) => void) => listeners.get(type)?.delete(listener),
    sessionStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
    location: { pathname: path, reload: () => page.reloads++ },
    navigator: { onLine: online },
    Date: { now: () => now },
    JSON,
  };
  runInNewContext(STALE_BUILD_SCRIPT, context);
  const fire = (type: string, target?: object) => {
    for (const listener of [...(listeners.get(type) ?? [])]) listener({ target });
  };
  return { page, fire };
}

const script = (src: string) => ({ tagName: "SCRIPT", src });
const stylesheet = (href: string) => ({ tagName: "LINK", rel: "stylesheet", href });
const BUILD_FILE = "https://albisiot.github.io/o-mega/_next/static/chunks/0abc.js";

describe("STALE_BUILD_SCRIPT", () => {
  it("reloads once when a build script of the page fails, leaving the mark mayReload reads", () => {
    const { page, fire } = loadPage();
    fire("error", script(BUILD_FILE));
    fire("error", script(BUILD_FILE));
    expect(page.reloads).toBe(1);
    const saved = page.storage.get("o-mega-stale-reload") ?? null;
    expect(mayReload(saved, "/o-mega/profilo/", 10_001)).toBe(false);
  });

  it("reloads when a build stylesheet fails", () => {
    const { page, fire } = loadPage();
    fire("error", stylesheet("https://albisiot.github.io/o-mega/_next/static/chunks/0def.css"));
    expect(page.reloads).toBe(1);
  });

  it("does not reload again right after reloading the same page", () => {
    const { page, fire } = loadPage({ stored: mark("/o-mega/profilo/", 9_000) });
    fire("error", script(BUILD_FILE));
    expect(page.reloads).toBe(0);
  });

  it("reloads a page whose mark belongs to another page", () => {
    const { page, fire } = loadPage({ stored: mark("/o-mega/gioca/", 9_000) });
    fire("error", script(BUILD_FILE));
    expect(page.reloads).toBe(1);
  });

  it("ignores other files, offline failures and anything after the load event", () => {
    const other = loadPage();
    other.fire("error", script("https://albisiot.github.io/o-mega/sw.js"));
    other.fire("error", { tagName: "IMG", src: BUILD_FILE });
    other.fire("error", { tagName: "LINK", rel: "preload", href: BUILD_FILE });
    other.fire("error");
    expect(other.page.reloads).toBe(0);

    const offline = loadPage({ online: false });
    offline.fire("error", script(BUILD_FILE));
    expect(offline.page.reloads).toBe(0);

    const loaded = loadPage();
    loaded.fire("load");
    loaded.fire("error", script(BUILD_FILE));
    expect(loaded.page.reloads).toBe(0);
  });
});
