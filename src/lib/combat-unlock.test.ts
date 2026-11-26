import { describe, expect, it } from "vitest";
import { combatReady, combatUnlocked, combatUnlockRule, type CombatUnlocks } from "./combat";

const unlocks = (patch: Partial<CombatUnlocks> = {}): CombatUnlocks => ({
  mode: "progress",
  basis: "wins",
  count: 50,
  since: null,
  needed: 5,
  progress: { a: 50, b: 49 },
  ready: 1,
  ...patch,
});

describe("the unlock of the Scontro kits", () => {
  it("opens a character at the matches needed, every one when always", () => {
    expect(combatUnlocked(unlocks(), "a")).toBe(true);
    expect(combatUnlocked(unlocks(), "b")).toBe(false);
    expect(combatUnlocked(unlocks(), "none")).toBe(false);
    expect(combatUnlocked(unlocks({ mode: "always" }), "none")).toBe(true);
  });

  it("lets the player in with enough characters unlocked", () => {
    expect(combatReady(unlocks())).toBe(false);
    expect(combatReady(unlocks({ ready: 5 }))).toBe(true);
  });

  it("says the rule with the matches won or played", () => {
    expect(combatUnlockRule({ basis: "wins", count: 50 })).toContain("dopo 50 vittorie con lui in squadra");
    expect(combatUnlockRule({ basis: "played", count: 30 })).toContain("dopo 30 partite giocate con lui in squadra");
  });
});
