import { describe, expect, it } from "vitest";
import { describePlayBlock, playBlock } from "@/lib/last-play";
import {
  combinedStatus,
  modeDraftProblem,
  modeStatus,
  romeInputToInstant,
  startKeys,
  toModeMap,
  type ModeAvailability,
} from "@/lib/mode-availability";

// 22 November 2026, 12:00 in Rome (UTC+1).
const NOW = Date.parse("2026-11-22T11:00:00Z");

function row(patch: Partial<ModeAvailability>): ModeAvailability {
  return { key: "classic", state: "on", starts_at: null, ends_at: null, label: null, ...patch };
}

describe("modeStatus", () => {
  it("leaves a mode open when nothing is known", () => {
    expect(modeStatus(null, NOW)).toEqual({ open: true, phase: "on", label: null, auto: false });
  });

  it("shows the admin's label in any state, without blocking an open mode", () => {
    expect(modeStatus(row({ label: "Nuova" }), NOW)).toMatchObject({ open: true, label: "Nuova", auto: false });
    expect(modeStatus(row({ state: "off", label: "Prossimamente" }), NOW)).toMatchObject({
      open: false,
      phase: "off",
      label: "Prossimamente",
    });
  });

  it("says why a mode is closed when the admin set no label", () => {
    expect(modeStatus(row({ state: "off" }), NOW)).toMatchObject({ open: false, label: "Non attiva", auto: true });
    const ended = row({ state: "window", starts_at: "2026-11-01T00:00:00Z", ends_at: "2026-11-20T00:00:00Z" });
    expect(modeStatus(ended, NOW)).toMatchObject({ open: false, phase: "after", label: "Finita" });
  });

  it("tells the day a period starts, or the hour when it starts today (Rome time)", () => {
    const later = row({ state: "window", starts_at: "2026-12-03T17:00:00Z", ends_at: "2026-12-10T17:00:00Z" });
    expect(modeStatus(later, NOW)).toMatchObject({ open: false, phase: "before", label: "Dal 3 dic" });
    const tonight = row({ state: "window", starts_at: "2026-11-22T17:00:00Z", ends_at: "2026-11-23T17:00:00Z" });
    expect(modeStatus(tonight, NOW)).toMatchObject({ open: false, label: "Dalle 18:00" });
    // 23:30 UTC is already tomorrow in Rome.
    const afterMidnight = row({ state: "window", starts_at: "2026-11-22T23:30:00Z", ends_at: "2026-11-24T00:00:00Z" });
    expect(modeStatus(afterMidnight, NOW).label).toBe("Dal 23 nov");
  });

  it("is open from the start of its period up to (not at) its end", () => {
    const period = row({ state: "window", starts_at: "2026-11-22T11:00:00Z", ends_at: "2026-11-22T12:00:00Z" });
    expect(modeStatus(period, NOW)).toMatchObject({ open: true, phase: "during", label: null });
    expect(modeStatus(period, Date.parse("2026-11-22T12:00:00Z")).open).toBe(false);
  });
});

describe("startKeys and combinedStatus", () => {
  it("asks for the same modes as the server, the most specific first", () => {
    expect(startKeys("classic")).toEqual(["classic"]);
    expect(startKeys("quadrant_shifting")).toEqual(["quadrant_shifting", "quadrant"]);
    expect(startKeys("boss", "ranked")).toEqual(["boss", "ranked"]);
    expect(startKeys("classic", "conquest")).toEqual(["classic", "conquest"]);
  });

  it("closes a play when one of its modes is closed, with that mode's label", () => {
    const modes = toModeMap([row({ key: "quadrant", state: "off", label: "Prossimamente" }), row({ key: "quadrant_shifting", label: "Nuova" })]);
    expect(combinedStatus(modes, startKeys("quadrant_shifting"), NOW)).toMatchObject({ open: false, label: "Prossimamente" });
    const open = toModeMap([row({ key: "quadrant" }), row({ key: "quadrant_shifting", label: "Nuova" })]);
    expect(combinedStatus(open, startKeys("quadrant_shifting"), NOW)).toMatchObject({ open: true, label: "Nuova" });
  });

  it("keeps a closed mode's own label over the reason of another", () => {
    const modes = toModeMap([row({ key: "triple", state: "off", label: "Presto" }), row({ key: "ranked", state: "off" })]);
    expect(combinedStatus(modes, startKeys("triple", "ranked"), NOW).label).toBe("Presto");
  });
});

describe("playBlock", () => {
  it("stops «Gioca ancora» when its mode is closed, and says so", () => {
    const modes = toModeMap([row({ key: "boss", state: "off", label: "Prossimamente" })]);
    const block = playBlock({ mode: "bot", format: "boss", difficulty: "easy" }, { now: NOW, challenges: null, conquest: null, modes });
    expect(block).toEqual({ kind: "mode_closed", label: "Prossimamente" });
    expect(describePlayBlock(block!).short).toBe("Non disponibile ora · Prossimamente");
    expect(playBlock({ mode: "bot", format: "classic", difficulty: "easy" }, { now: NOW, challenges: null, conquest: null, modes })).toBeNull();
  });

  it("stops a Classificata or a Conquista when their own switch is off", () => {
    const modes = toModeMap([row({ key: "ranked", state: "off" }), row({ key: "conquest", state: "off" })]);
    const known = { now: NOW, challenges: null, conquest: null, modes };
    expect(playBlock({ mode: "ranked", format: "triple" }, known)?.kind).toBe("mode_closed");
    expect(playBlock({ mode: "conquest", format: "classic" }, known)?.kind).toBe("mode_closed");
    expect(playBlock({ mode: "queue", format: "triple" }, known)).toBeNull();
  });
});

describe("the EDITOR's draft", () => {
  const draft = { key: "classic" as const, state: "window" as const, startsAt: "2026-12-03T18:00", endsAt: "2026-12-10T23:59", label: "" };

  it("needs a period that ends after it starts, and a short label", () => {
    expect(modeDraftProblem(draft)).toBeNull();
    expect(modeDraftProblem({ ...draft, endsAt: "" })).toBe("Metti l'inizio e la fine.");
    expect(modeDraftProblem({ ...draft, endsAt: draft.startsAt })).toBe("La fine va dopo l'inizio.");
    expect(modeDraftProblem({ ...draft, label: "Diciassette lett." })).toMatch(/16 caratteri/);
    expect(modeDraftProblem({ ...draft, state: "off", endsAt: "" })).toBeNull();
  });

  it("reads datetime-local values as Rome time, summer or winter", () => {
    expect(romeInputToInstant("2026-12-03T18:00")).toBe("2026-12-03T17:00:00.000Z");
    expect(romeInputToInstant("2026-07-03T18:00")).toBe("2026-07-03T16:00:00.000Z");
    expect(romeInputToInstant("domani")).toBeNull();
  });
});
