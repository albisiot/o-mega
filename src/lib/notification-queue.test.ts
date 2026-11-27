import { describe, expect, it } from "vitest";
import { bannersHeld, holdBanners } from "./banner-hold";
import {
  bannerGesture,
  bannerHint,
  bannerHref,
  bannerReward,
  currentBanner,
  EMPTY_BANNER_QUEUE,
  enqueueBanners,
  leaveBanner,
  parseNotifications,
  removeBanner,
  type PlayerNotification,
} from "./notification-queue";

const note = (id: string, minute: number, kind = "objective_completed", data: Record<string, unknown> = {}): PlayerNotification => ({
  id,
  kind,
  title: "Obiettivo completato!",
  body: `Obiettivo ${id}`,
  data,
  created_at: `2026-11-15T10:${String(minute).padStart(2, "0")}:00Z`,
});

describe("banner queue", () => {
  it("shows the oldest first, one at a time", () => {
    const state = enqueueBanners(EMPTY_BANNER_QUEUE, [note("b", 2), note("a", 1)], 5);
    expect(state.queue.map((n) => n.id)).toEqual(["a", "b"]);
    expect(currentBanner(state, false)?.id).toBe("a");
  });

  it("never queues the same notification twice, even after it was shown", () => {
    let state = enqueueBanners(EMPTY_BANNER_QUEUE, [note("a", 1)], 5);
    state = enqueueBanners(state, [note("a", 1), note("b", 2)], 5);
    expect(state.queue.map((n) => n.id)).toEqual(["a", "b"]);
    state = removeBanner(leaveBanner(state, "a"), "a");
    state = enqueueBanners(state, [note("a", 1), note("b", 2)], 5);
    expect(state.queue.map((n) => n.id)).toEqual(["b"]);
  });

  it("returns the same state when nothing is new", () => {
    const state = enqueueBanners(EMPTY_BANNER_QUEUE, [note("a", 1)], 5);
    expect(enqueueBanners(state, [note("a", 1)], 5)).toBe(state);
  });

  it("keeps the banner on screen and drops the oldest waiting ones past the limit", () => {
    let state = enqueueBanners(EMPTY_BANNER_QUEUE, [note("a", 1)], 3);
    state = enqueueBanners(state, [note("b", 2), note("c", 3), note("d", 4), note("e", 5)], 3);
    expect(state.queue.map((n) => n.id)).toEqual(["a", "d", "e"]);
  });

  it("waits while held, then shows the same banner again", () => {
    const state = enqueueBanners(EMPTY_BANNER_QUEUE, [note("a", 1)], 5);
    expect(currentBanner(state, true)).toBeNull();
    expect(currentBanner(state, false)?.id).toBe("a");
  });

  it("moves to the next banner only once the one on screen has left", () => {
    let state = enqueueBanners(EMPTY_BANNER_QUEUE, [note("a", 1), note("b", 2)], 5);
    state = leaveBanner(state, "a");
    expect(state.leaving).toBe("a");
    expect(currentBanner(state, false)?.id).toBe("a");
    state = removeBanner(state, "a");
    expect(state.leaving).toBeNull();
    expect(currentBanner(state, false)?.id).toBe("b");
    expect(removeBanner(state, "a")).toBe(state);
  });

  it("only lets the banner on screen leave", () => {
    const state = enqueueBanners(EMPTY_BANNER_QUEUE, [note("a", 1), note("b", 2)], 5);
    expect(leaveBanner(state, "b")).toBe(state);
  });
});

describe("banner content", () => {
  it("links each kind to its page", () => {
    expect(bannerHref(note("a", 1))).toBe("/obiettivi/");
    expect(bannerHref(note("a", 1, "event_reward"))).toBe("/evento/");
    expect(bannerHref(note("a", 1, "achievement"))).toBe("/imprese/");
    expect(bannerHint(note("a", 1, "achievement", { count: 1 }))).toBe("Tocca per vederla");
    expect(bannerHint(note("a", 1, "achievement", { count: 3 }))).toBe("Tocca per vederle");
    expect(bannerHref(note("a", 1, "leaderboard", { board: "triple" }))).toBe("/classifiche/?scheda=triple&periodo=week");
    expect(bannerHref(note("a", 1, "leaderboard"))).toBe("/classifiche/");
    expect(bannerHref(note("a", 1, "something_new"))).toBeNull();
    // A kit of the Scontro: one character opens its card, several the Scontro.
    expect(bannerHref(note("a", 1, "combat_kit", { definition_ids: ["d-1"], codes: ["P001"] }))).toBe("/carta/?id=d-1");
    expect(bannerHint(note("a", 1, "combat_kit", { definition_ids: ["d-1"], codes: ["P001"] }))).toBe("Tocca per vedere le sue mosse");
    expect(bannerHref(note("a", 1, "combat_kit", { definition_ids: ["d-1", "d-2"], codes: ["P001", "P043"] }))).toBe("/scontro/");
    expect(bannerHint(note("a", 1, "combat_kit", { definition_ids: ["d-1", "d-2"] }))).toBe("Tocca per aprire lo Scontro");
    expect(bannerHint(note("a", 1, "something_new"))).toBe("Tocca per chiudere");
  });

  it("says the prize in Italian, singular and plural", () => {
    expect(bannerReward(note("a", 1, "objective_completed", { coins: 40 }))).toBe("40 monete");
    expect(bannerReward(note("a", 1, "event_reward", { coins: 1, packs: 1, cards: 2 }))).toBe(
      "1 moneta · 1 pacchetto · 2 carte",
    );
    expect(bannerReward(note("a", 1, "objective_completed", { coins: 0, packs: 2 }))).toBe("2 pacchetti");
    expect(bannerReward(note("a", 1, "objective_completed", { coins: "40" }))).toBeNull();
  });

  it("reads only well-formed notifications from the server", () => {
    expect(parseNotifications(null)).toEqual([]);
    expect(
      parseNotifications([
        { id: "a", kind: "event_reward", title: "Premio", body: null, data: [], created_at: "2026-11-15T10:00:00Z" },
        { id: 3, kind: "event_reward", title: "Rotto" },
        "rotto",
      ]),
    ).toEqual([{ id: "a", kind: "event_reward", title: "Premio", body: "", data: {}, created_at: "2026-11-15T10:00:00Z" }]);
  });
});

describe("banner gestures", () => {
  it("tells a tap, a swipe up and anything else apart", () => {
    expect(bannerGesture(0, 0)).toBe("tap");
    expect(bannerGesture(5, -6)).toBe("tap");
    expect(bannerGesture(3, -40)).toBe("swipe");
    expect(bannerGesture(60, -30)).toBe("none");
    expect(bannerGesture(0, 40)).toBe("none");
    expect(bannerGesture(0, -15)).toBe("none");
  });
});

describe("banner holds", () => {
  it("holds until every hold is released, and a release counts once", () => {
    expect(bannersHeld()).toBe(false);
    const first = holdBanners();
    const second = holdBanners();
    first();
    first();
    expect(bannersHeld()).toBe(true);
    second();
    expect(bannersHeld()).toBe(false);
  });
});
