import { describe, expect, it } from "vitest";
import {
  backIndex,
  consumeEntry,
  isPlace,
  isTransient,
  landingOn,
  parentOf,
  pushEntry,
  replaceEntry,
  trimEntries,
  type NavEntries,
} from "@/lib/nav-stack";

const pages = (...keys: (string | null)[]): NavEntries => keys.map((key) => (key === null ? null : { key }));

describe("pushEntry", () => {
  it("drops the forward history", () => {
    expect(pushEntry(pages("/", "/gioca", "/squadra"), 2, "/storia")).toEqual(pages("/", "/gioca", "/storia"));
    expect(pushEntry(pages("/", "/gioca", "/squadra"), 1, "/profilo")).toEqual(pages("/", "/profilo"));
  });

  it("leaves unknown places unknown", () => {
    expect(pushEntry([], 2, "/gioca")).toEqual(pages(null, null, "/gioca"));
  });
});

describe("replaceEntry", () => {
  it("keeps the entry, and what is known of it, while the page is the same", () => {
    const entries = consumeEntry(pages("/", "/pacchetto?id=a"), 1);
    expect(replaceEntry(entries, 1, "/pacchetto?id=a")[1]).toEqual({ key: "/pacchetto?id=a", consumed: true });
  });

  it("starts afresh for another page", () => {
    const entries = consumeEntry(pages("/", "/pacchetto?id=a"), 1);
    expect(replaceEntry(entries, 1, "/pacchetto?id=b")[1]).toEqual({ key: "/pacchetto?id=b" });
  });

  it("keeps the forward history", () => {
    expect(replaceEntry(pages("/", "/carta?id=1", "/x"), 1, "/carta?id=2")).toEqual(pages("/", "/carta?id=2", "/x"));
  });
});

describe("isTransient", () => {
  it("is the waiting page, the sign-in callback and the steps that are over", () => {
    expect(isTransient({ key: "/attesa?mode=queue" })).toBe(true);
    expect(isTransient({ key: "/auth/callback" })).toBe(true);
    expect(isTransient({ key: "/squadra?mode=queue", consumed: true })).toBe(true);
    expect(isTransient({ key: "/squadra?mode=queue" })).toBe(false);
    expect(isTransient(null)).toBe(false);
  });

  it("lets a friend code's waiting page be reopened: it only shows the code", () => {
    expect(isTransient({ key: "/attesa?mode=lobby" })).toBe(false);
    expect(isTransient({ key: "/attesa?mode=queue&type=ranked" })).toBe(true);
  });
});

describe("backIndex", () => {
  it("is the page right behind", () => {
    expect(backIndex(pages("/", "/profilo", "/bestiario"), 2)).toBe(1);
  });

  it("steps over the waiting page and a team picker whose match started", () => {
    const entries = consumeEntry(pages("/", "/gioca", "/squadra?mode=queue", "/attesa?mode=queue", "/partita?id=1"), 2);
    expect(backIndex(entries, 4)).toBe(1);
  });

  it("is none at the start of the visit, or past what is known", () => {
    expect(backIndex(pages("/carta?id=1"), 0)).toBeNull();
    expect(backIndex(pages(null, "/storico"), 1)).toBeNull();
    expect(backIndex(consumeEntry(pages("/squadra?mode=queue", "/partita?id=1"), 0), 1)).toBeNull();
  });
});

describe("landingOn", () => {
  const queue = consumeEntry(pages("/gioca", "/squadra?mode=queue", "/partita?id=1"), 1);

  it("lets a page that may be shown stay", () => {
    expect(landingOn(queue, 0, 2)).toBeNull();
    expect(landingOn(queue, 2, 0)).toBeNull();
  });

  it("steps over a step going back", () => {
    expect(landingOn(queue, 1, 2)).toEqual({ go: 0 });
    // Loaded by the browser's back: the direction is not known, back is the likely one.
    expect(landingOn(queue, 1, null)).toEqual({ go: 0 });
  });

  it("steps over a step going forward", () => {
    expect(landingOn(queue, 1, 0)).toEqual({ go: 2 });
  });

  it("goes back where it was when nothing comes after the step", () => {
    expect(landingOn(pages("/gioca", "/squadra?mode=queue", "/attesa?mode=queue"), 2, 1)).toEqual({ go: 1 });
  });

  it("opens the step's parent when nothing is behind it", () => {
    const shared = consumeEntry(pages("/squadra?mode=join&code=ABC234", "/partita?id=1"), 0);
    expect(landingOn(shared, 0, 1)).toEqual({ replace: "/gioca" });
    expect(landingOn(pages("/attesa?mode=queue&type=ranked"), 0, null)).toEqual({ replace: "/classificata" });
  });
});

describe("parentOf", () => {
  it("is the page a step starts from", () => {
    expect(parentOf("/squadra?story=C1M1")).toBe("/storia");
    expect(parentOf("/squadra?mode=ranked&format=boss")).toBe("/classificata");
    expect(parentOf("/squadra?difficulty=easy")).toBe("/gioca");
    expect(parentOf("/attesa?mode=lobby")).toBe("/gioca");
    expect(parentOf("/pacchetto?id=a&from=%2Fobiettivi")).toBe("/obiettivi");
    expect(parentOf("/pacchetto?id=a&from=https%3A%2F%2Fevil.example")).toBe("/");
    expect(parentOf("/auth/callback")).toBe("/");
  });
});

describe("isPlace", () => {
  it("matches the path, and the query when the target has one", () => {
    expect(isPlace("/storia", "/storia")).toBe(true);
    expect(isPlace("/classifiche?scheda=albo", "/classifiche")).toBe(true);
    expect(isPlace("/partita?id=1", "/partita?id=1")).toBe(true);
    expect(isPlace("/partita?id=2", "/partita?id=1")).toBe(false);
    expect(isPlace("/gioca", "/")).toBe(false);
  });
});

describe("trimEntries", () => {
  it("forgets the oldest pages", () => {
    expect(trimEntries(pages("/a", "/b", "/c", "/d"), 2)).toEqual(pages(null, null, "/c", "/d"));
    expect(trimEntries(pages("/a"), 2)).toEqual(pages("/a"));
  });
});
