import { describe, expect, it } from "vitest";
import type { CombatMove } from "@o-mega/game-engine";
import { combatEventLine, describeCombatMove, italianKitError } from "./combat-text";
import { COMBAT_PILOTS } from "./combat-pilot";

const names: Record<string, string> = { a0: "Gantry", b0: "Kiln" };
const name = (key: string) => names[key] ?? key;
const moveName = (id: string) => ({ "P001-special": "Carico pesante", "P001-passive": "Uomo del porto" })[id] ?? id;

describe("the words of the Scontro a squadre", () => {
  it("describe a move from its data", () => {
    const gantry = COMBAT_PILOTS.find((p) => p.code === "P001")!;
    expect(describeCombatMove(gantry.kit.special)).toBe("Un nemico e i vicini: danni ×1,25, danni ×0,35 agli adiacenti · ricarica 3 turni.");
    const sneak: CombatMove = { id: "x", name: "x", slot: "base", scaling: { FUR: 1 }, range: "infiltration", target: "enemy", cooldown: 0, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 40, ability: "FUR" } }] };
    expect(describeCombatMove(sneak)).toBe("Un nemico, anche dietro le linee: danni ×1, stordimento 1 turno (probabile).");
  });

  it("put the engine's checks of a kit in Italian for the EDITOR", () => {
    expect(italianKitError("move P001-base: weights sum to 0.9, not 1")).toBe("Mossa P001-base: i pesi fanno 0.9, non 1");
    expect(italianKitError("move x: stun needs an enemy target")).toBe("Mossa x: stun va su un nemico");
    expect(italianKitError("passive p: other needs the hit or hurt trigger")).toBe("Passiva p: «other» vuole l'innesco hit o hurt");
    expect(italianKitError("kit without supreme")).toBe("Manca la mossa supreme");
    expect(italianKitError("something new")).toBe("something new");
  });

  it("write one line of the log for each event that matters", () => {
    expect(combatEventLine({ kind: "move", actor: "a0", slot: "special", move: "P001-special", target: "b0" }, name, moveName, "a")).toBe("Gantry usa Carico pesante su Kiln.");
    expect(combatEventLine({ kind: "damage", actor: "a0", target: "b0", amount: 152, absorbed: 20, critical: true, family: "body" }, name, moveName, "a")).toBe("Kiln −152 (critico, 20 sullo scudo).");
    expect(combatEventLine({ kind: "status", actor: "a0", target: "b0", status: "weaken", turns: 2 }, name, moveName, "a")).toBe("Kiln: Indebolimento per 2 turni.");
    expect(combatEventLine({ kind: "resisted", actor: "a0", target: "b0", status: "stun", immune: true }, name, moveName, "a")).toBe("Kiln non si lascia stordire di nuovo subito.");
    expect(combatEventLine({ kind: "passive", actor: "a0", passive: "P001-passive", trigger: "battle_start" }, name, moveName, "a")).toBe("Gantry: Uomo del porto.");
    expect(combatEventLine({ kind: "turn", actor: "a0", turn: 1 }, name, moveName, "a")).toBeNull();
    expect(combatEventLine({ kind: "heal", actor: "a0", target: "a0", amount: 0 }, name, moveName, "a")).toBeNull();
    expect(combatEventLine({ kind: "end", winner: "b", reason: "limit" }, name, moveName, "a")).toBe("Sconfitta dopo 100 azioni!");
    expect(combatEventLine({ kind: "end", winner: "a", reason: "wiped" }, name, moveName, "a")).toBe("Vittoria!");
  });
});
