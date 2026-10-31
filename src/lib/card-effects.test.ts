import { describe, expect, it } from "vitest";
import { cardEffects } from "./card-effects";

const card = (rank: number, code = "P001") => ({ code, rarity: { rank } });

describe("cardEffects", () => {
  it("grows with the rank on large cards", () => {
    expect(cardEffects(card(1), "lg")).toEqual([]);
    expect(cardEffects(card(2), "lg")).toEqual(["flash"]);
    expect(cardEffects(card(3), "lg")).toEqual(["flash", "tilt"]);
    expect(cardEffects(card(4), "lg")).toEqual(["holo", "tilt"]);
    expect(cardEffects(card(5), "lg")).toEqual(["holo", "tilt"]);
  });

  it("adds each Omega character's own effect on large cards", () => {
    expect(cardEffects(card(5, "P057"), "lg")).toContain("aura");
    expect(cardEffects(card(5, "P058"), "lg")).toContain("bolts");
    expect(cardEffects(card(5, "P059"), "lg")).toContain("glitch");
    expect(cardEffects(card(5, "P060"), "lg")).toContain("embers");
    expect(cardEffects(card(5, "P080"), "lg")).toContain("aura");
  });

  it("keeps small cards calm", () => {
    expect(cardEffects(card(3), "sm")).toEqual([]);
    expect(cardEffects(card(4), "sm")).toEqual(["holo"]);
    expect(cardEffects(card(5, "P060"), "sm")).toEqual(["holo"]);
  });

  it("works without a code and for a new rarity above Omega", () => {
    expect(cardEffects({ rarity: { rank: 5 } }, "lg")).toEqual(["holo", "tilt"]);
    expect(cardEffects(card(6), "lg")).toEqual(["holo", "tilt"]);
  });
});
