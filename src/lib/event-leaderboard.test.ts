import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  completionLine,
  completionPlace,
  entryProgress,
  fetchEventLeaderboard,
  isEventCompleted,
  LEADERBOARD_LOCKED,
  lockedLine,
  placeBelow,
  playersLine,
  type EventLeaderboardEntry,
} from "@/lib/event-leaderboard";
import type { EventTier } from "@/lib/events";

const rpc = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ getSupabase: () => ({ rpc }) }));

const entry = (rank: number, extra: Partial<EventLeaderboardEntry> = {}): EventLeaderboardEntry => ({
  rank,
  username: `giocatore${rank}`,
  avatar_url: null,
  points: 100 - rank,
  steps: 3,
  completed_at: "2026-11-17T10:00:00Z",
  is_me: false,
  ...extra,
});

const tier = (reached: boolean): EventTier => ({
  tier: 1,
  points: 10,
  coins: 1,
  packs: 0,
  cards: [],
  reached,
  opening_ids: [],
  seen: true,
});

describe("isEventCompleted", () => {
  it("needs every target reached", () => {
    expect(isEventCompleted({ tiers: [tier(true), tier(true)] })).toBe(true);
    expect(isEventCompleted({ tiers: [tier(true), tier(false)] })).toBe(false);
  });
  it("is never true for an event without targets", () => {
    expect(isEventCompleted({ tiers: [] })).toBe(false);
  });
});

describe("completionPlace", () => {
  it("is the place, or nothing yet", () => {
    expect(completionPlace({ me: entry(1, { is_me: true }), players: 1 })).toBe("Sei 1° su 1");
    expect(completionPlace(null)).toBeNull();
  });
});

describe("completionLine", () => {
  it("says the place out of the players", () => {
    expect(completionLine({ me: entry(12, { is_me: true }), players: 87 })).toBe("Evento completato! Sei 12° su 87");
  });
  it("waits for the place without a board", () => {
    expect(completionLine(null)).toBe("Evento completato!");
    expect(completionLine({ me: null, players: 3 })).toBe("Evento completato!");
  });
});

describe("entryProgress", () => {
  it("marks who completed the event", () => {
    expect(entryProgress(entry(1), 3)).toEqual({ done: true, label: "Completato" });
  });
  it("counts the targets of who is on the way", () => {
    expect(entryProgress(entry(5, { steps: 2, completed_at: null }), 5)).toEqual({ done: false, label: "2/5 traguardi" });
    expect(entryProgress(entry(5, { steps: 0, completed_at: null }), 1)).toEqual({ done: false, label: "0/1 traguardo" });
  });
});

describe("placeBelow", () => {
  it("is null when the player is in the list", () => {
    const me = entry(2, { is_me: true });
    expect(placeBelow({ top: [entry(1), me, entry(3)], me })).toBeNull();
  });
  it("is the player's place when lower than the list", () => {
    const me = entry(140, { is_me: true });
    expect(placeBelow({ top: [entry(1), entry(2)], me })).toBe(me);
  });
  it("is null for a player without points", () => {
    expect(placeBelow({ top: [entry(1)], me: null })).toBeNull();
  });
});

describe("playersLine", () => {
  it("says how many completed it", () => {
    expect(playersLine({ players: 87, completed: 23 })).toBe("87 giocatori · 23 hanno completato l'evento");
    expect(playersLine({ players: 1, completed: 1 })).toBe("1 giocatore · 1 ha completato l'evento");
    expect(playersLine({ players: 4, completed: 0 })).toBe("4 giocatori");
  });
});

describe("lockedLine", () => {
  it("follows the server setting", () => {
    expect(lockedLine(300, "completed")).toContain("ultimo traguardo, 300 punti");
    expect(lockedLine(null, "completed")).toBe("La classifica generale si sblocca quando completi l'evento.");
    expect(lockedLine(300, "participants")).toBe("La classifica generale si sblocca con il primo punto evento.");
  });
});

describe("fetchEventLeaderboard", () => {
  beforeEach(() => rpc.mockReset());

  it("asks for an event by id", async () => {
    const board = { event_id: "e1", top: [], me: null };
    rpc.mockResolvedValue({ data: board, error: null });
    await expect(fetchEventLeaderboard("e1")).resolves.toBe(board);
    expect(rpc).toHaveBeenCalledWith("get_event_leaderboard", { p_event_id: "e1" });
  });

  it("asks for the last event without an id, and may get nothing", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(fetchEventLeaderboard(null)).resolves.toBeNull();
    expect(rpc).toHaveBeenCalledWith("get_event_leaderboard", {});
  });

  it("reads the server's refusal as locked", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "event_leaderboard_locked" } });
    await expect(fetchEventLeaderboard("e1")).resolves.toBe(LEADERBOARD_LOCKED);
  });

  it("throws any other error", async () => {
    const error = { message: "event_not_found" };
    rpc.mockResolvedValue({ data: null, error });
    await expect(fetchEventLeaderboard("e1")).rejects.toBe(error);
  });
});
