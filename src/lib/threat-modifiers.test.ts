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

describe("the rules of the places", () => {
  const names: Record<string, string> = { ENE: "Energia", MAG: "Magia", PSI: "Psiche" };

  it("lists the abilities Abissi doubles", () => {
    const abyss = { code: "abyss", abilities: ["ENE", "MAG", "PSI"] } as const;
    expect(describeThreatModifier(abyss, "Forza", (code) => names[code])).toEqual({
      name: "Abissi",
      text: "Energia, Magia e Psiche contano doppio.",
    });
  });

  it("tells the numbers of Gelo, Duello and Il conto lungo", () => {
    expect(describeThreatModifier({ code: "frost", cap: 6 }, "Forza").text).toBe("Nessuna abilità conta più di 6.");
    expect(describeThreatModifier({ code: "duel", count: 2 }, "Forza").text).toBe(
      "Contano solo le 2 abilità più alte tra quelle richieste.",
    );
    expect(describeThreatModifier({ code: "long_count", bonus: 3 }, "Forza").text).toBe("+3 a chi finora ha vinto meno round.");
    expect(describeThreatModifier({ code: "tomb_silence" }, "Forza").name).toBe("Silenzio della tomba");
  });
});

describe("the rules of the rare threats", () => {
  const names: Record<string, string> = { ENE: "Energia", MAG: "Magia", PSI: "Psiche", VEL: "Velocità" };
  const nameOf = (code: string) => names[code] ?? code;

  it("gives every rule a name and its numbers", () => {
    expect(describeThreatModifier({ code: "reverse" }, "Forza").name).toBe("Rovescio");
    expect(describeThreatModifier({ code: "mirror" }, "Forza").name).toBe("Specchio");
    expect(describeThreatModifier({ code: "all_or_nothing", min: 5 }, "Forza").text).toBe("Le abilità sotto 5 contano 0.");
    expect(describeThreatModifier({ code: "price", maxValue: 1, malus: 3 }, "Forza").text).toBe("Le abilità a 1 o meno valgono -3.");
    expect(describeThreatModifier({ code: "negative", max: 10 }, "Forza").text).toBe("Ogni abilità vale 10 meno il suo valore.");
    expect(describeThreatModifier({ code: "duel", count: 1 }, "Forza").text).toBe("Conta solo l'abilità più alta tra quelle richieste.");
  });

  it("names the abilities Eco adds and Una sola forza groups", () => {
    expect(describeThreatModifier({ code: "echo", abilities: ["VEL"] }, "Forza", nameOf).text).toBe(
      "Richiede anche Velocità, dalla Minaccia del round prima.",
    );
    expect(describeThreatModifier({ code: "one_force", abilities: ["ENE", "MAG", "PSI"] }, "Forza", nameOf).text).toContain(
      "Energia, Magia e Psiche",
    );
  });
});
