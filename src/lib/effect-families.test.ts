import { describe, expect, it } from "vitest";
import { chargeSource, familyOrder, pointsHelp, powerFamily, powerSfx, ruleFamily, rulePageEffect } from "./effect-families";

// Every power the rules engine knows (scoring.ts powerBonus and the powers acting elsewhere).
const POWERS = [
  "ability_bonus", "family_bonus", "level_bonus", "underdog", "opener", "last_stand", "bond", "shielded", "nemesis",
  "all_rounder", "giant_slayer", "crescendo", "scrappy", "counterpunch", "eclectic", "lone_wolf", "opportunist",
  "vendetta", "main_event", "adaptable", "echo", "reflect", "sacrifice", "pack_leader", "catalyst", "fog", "comeback",
  "momentum", "nullifier", "sabotage", "foresight", "relentless", "spy",
];

describe("powerFamily", () => {
  it("puts every power of the engine in a family", () => {
    expect(POWERS).toHaveLength(33);
    const families = POWERS.map(powerFamily);
    expect(new Set(families)).toEqual(new Set(["charge", "strike", "shield", "stop", "tiebreak", "forward", "copy", "reveal"]));
  });

  it("knows where a charge comes from", () => {
    expect(chargeSource("all_rounder")).toBe("threat");
    expect(chargeSource("last_stand")).toBe("round");
    expect(chargeSource("nemesis")).toBe("rival");
    expect(chargeSource("bond")).toBe("team");
  });

  it("speaks in order: stops, then hits and shields, then charges", () => {
    const order = (code: string) => familyOrder(powerFamily(code));
    expect(order("nullifier")).toBeLessThan(order("sabotage"));
    expect(order("sabotage")).toBeLessThan(order("shielded"));
    expect(order("shielded")).toBeLessThan(order("all_rounder"));
    expect(order("all_rounder")).toBeLessThan(order("relentless"));
  });

  it("has a word for every power and a new one for Riflesso", () => {
    expect(powerSfx("sabotage")).toBe("ZAP!");
    expect(powerSfx("reflect")).toBe("BOING!");
    expect(powerSfx("unknown_power")).toBe("POW!");
  });
});

describe("rules", () => {
  it("groups the threat rules", () => {
    expect(ruleFamily({ code: "focus" })).toBe("count");
    expect(ruleFamily({ code: "hostile_ground", favored: "heroes", hindered: "villains", bonus: 3, malus: 2 })).toBe("flag");
    expect(ruleFamily({ code: "tomb_silence" })).toBe("silence");
    expect(ruleFamily({ code: "reverse" })).toBe("flip");
    expect(ruleFamily({ code: "blind", abilities: [] })).toBe("hidden");
    expect(rulePageEffect({ code: "frost", cap: 6 })).toBe("frost");
    expect(rulePageEffect({ code: "focus" })).toBeNull();
  });

  it("colours points by what they do to the result", () => {
    expect(pointsHelp(3, null)).toBe(true);
    expect(pointsHelp(3, { code: "reverse" })).toBe(false);
    expect(pointsHelp(-2, { code: "reverse" })).toBe(true);
  });
});
