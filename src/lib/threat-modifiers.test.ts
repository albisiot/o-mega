import { describe, expect, it } from "vitest";
import { describeThreatModifier } from "@/lib/threat-modifiers";

describe("describeThreatModifier", () => {
  it("names the doubled ability", () => {
    expect(describeThreatModifier({ code: "focus" }, "Forza")).toEqual({ name: "Colpo mirato", text: "Forza conta doppio." });
  });

  it("names the factions and the points", () => {
    const modifier = { code: "hostile_ground", favored: "heroes", hindered: "villains", bonus: 3, malus: 2 } as const;
    expect(describeThreatModifier(modifier, "Forza").text).toBe("Eroi +3, Cattivi -2.");
  });

  it("shows the points of the common and elite cards", () => {
    const modifier = { code: "underdogs", commonMaxRank: 1, eliteMinRank: 4, bonus: 3, malus: 3 } as const;
    expect(describeThreatModifier(modifier, "Forza").text).toBe("Delta +3, Alfa e Omega -3.");
  });
});
