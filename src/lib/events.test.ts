import { describe, expect, it } from "vitest";
import {
  addHoursToInput,
  describeTierReward,
  eventPhase,
  formatEventCountdown,
  tierProgress,
  toRomeInput,
  unseenOpenings,
  type EventTier,
  type GameEvent,
} from "@/lib/events";

const tier = (points: number, extra: Partial<EventTier> = {}): EventTier => ({
  tier: 1,
  points,
  coins: 0,
  packs: 0,
  cards: [],
  reached: false,
  opening_ids: [],
  seen: false,
  ...extra,
});

describe("eventPhase", () => {
  const event = { starts_at: "2026-11-14T17:00:00Z", ends_at: "2026-11-16T17:00:00Z" };
  it("follows the start and the end", () => {
    expect(eventPhase(event, Date.parse("2026-11-14T16:59:59Z"))).toBe("upcoming");
    expect(eventPhase(event, Date.parse("2026-11-14T17:00:00Z"))).toBe("running");
    expect(eventPhase(event, Date.parse("2026-11-16T17:00:00Z"))).toBe("ended");
  });
});

describe("formatEventCountdown", () => {
  it("shows days only when they matter", () => {
    expect(formatEventCountdown(30_000)).toBe("meno di un minuto");
    expect(formatEventCountdown(12 * 60_000)).toBe("12 min");
    expect(formatEventCountdown((5 * 60 + 12) * 60_000)).toBe("5 h 12 min");
    expect(formatEventCountdown(((2 * 24 + 4) * 60 + 30) * 60_000)).toBe("2 g 4 h");
  });
});

describe("tierProgress", () => {
  const tiers = [tier(300), tier(100)];
  it("measures the way to the next target from the one before", () => {
    expect(tierProgress(0, tiers)).toMatchObject({ from: 0, fraction: 0, next: { points: 100 } });
    expect(tierProgress(50, tiers)).toMatchObject({ from: 0, fraction: 0.5, next: { points: 100 } });
    expect(tierProgress(100, tiers)).toMatchObject({ from: 100, fraction: 0, next: { points: 300 } });
    expect(tierProgress(200, tiers)).toMatchObject({ from: 100, fraction: 0.5, next: { points: 300 } });
  });
  it("is full once every target is reached", () => {
    expect(tierProgress(350, tiers)).toEqual({ next: null, from: 300, fraction: 1 });
  });
});

describe("unseenOpenings", () => {
  it("lists the openings of the targets reached and not opened yet", () => {
    const event = {
      tiers: [
        tier(100, { reached: true, seen: true, opening_ids: ["a"] }),
        tier(200, { reached: true, opening_ids: ["b", "c"] }),
        tier(300),
      ],
    } as GameEvent;
    expect(unseenOpenings(event)).toEqual(["b", "c"]);
  });
});

describe("describeTierReward", () => {
  it("lists what a target pays", () => {
    expect(describeTierReward({ coins: 100, packs: 2, cards: [{}] })).toBe("100 monete, 1 carta e 2 pacchetti");
    expect(describeTierReward({ coins: 0, packs: 1, cards: [] })).toBe("1 pacchetto");
  });
});

describe("Rome times", () => {
  it("writes an instant as the wall clock in Rome, summer and winter", () => {
    expect(toRomeInput("2026-11-14T17:00:00Z")).toBe("2026-11-14T18:00");
    expect(toRomeInput("2026-07-14T17:00:00Z")).toBe("2026-07-14T19:00");
  });
  it("adds hours to a wall-clock value across days and months", () => {
    expect(addHoursToInput("2026-11-14T18:00", 24)).toBe("2026-11-15T18:00");
    expect(addHoursToInput("2026-11-30T20:00", 48)).toBe("2026-12-02T20:00");
    expect(addHoursToInput("non valida", 24)).toBe("non valida");
  });
});
