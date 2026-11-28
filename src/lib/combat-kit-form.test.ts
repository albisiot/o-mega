import { describe, expect, it } from "vitest";
import { validateCombatKit, type CombatKit } from "@o-mega/game-engine";
import { COMBAT_FAMILIES, combatRules } from "./combat";
import {
  formatDecimal,
  kitShapeProblem,
  newMoveEffect,
  newPassive,
  newPassiveEffect,
  onChoices,
  parseDecimal,
  passiveToChoices,
  retarget,
  retrigger,
  statusFor,
  tabOfError,
} from "./combat-kit-form";
import { COMBAT_PILOTS } from "./combat-pilot";
import { italianKitError } from "./combat-text";

const gantry = (): CombatKit => structuredClone(COMBAT_PILOTS[0].kit);
const errorsOf = (kit: CombatKit) => validateCombatKit(kit, COMBAT_FAMILIES, combatRules()).map(italianKitError);

describe("the kit form of the EDITOR", () => {
  it("offers each move's effects only what its target can reach", () => {
    expect(onChoices("enemy").map((c) => c.value)).toEqual(["primary", "self"]);
    expect(onChoices("enemy_and_adjacent").map((c) => c.value)).toEqual(["primary", "adjacent", "self"]);
    expect(onChoices("all_enemies").map((c) => c.value)).toEqual(["all", "self"]);
    expect(onChoices("self").map((c) => c.value)).toEqual(["primary"]);
  });

  it("keeps a move valid when its target changes", () => {
    const kit = gantry();
    // Carico pesante: the chosen enemy and its neighbours. On everyone, both effects go to all.
    kit.special = retarget(kit.special, "all_enemies");
    expect(kit.special.effects.map((e) => e.on)).toEqual(["all", "all"]);
    expect(errorsOf(kit)).toEqual([]);
    kit.special = retarget(kit.special, "enemy");
    expect(kit.special.effects.map((e) => e.on)).toEqual(["primary", "primary"]);
    expect(errorsOf(kit)).toEqual([]);
  });

  it("starts new effects and passives that the engine accepts", () => {
    const kit = gantry();
    for (const kind of ["damage", "heal", "shield", "status"] as const) kit.base.effects.push(newMoveEffect(kind, kit.base));
    kit.passive = newPassive("P001", kit.base.scaling);
    for (const kind of ["status", "shield", "heal", "damage", "charge"] as const) kit.passive.effects.push(newPassiveEffect(kind, kit.passive.trigger));
    expect(errorsOf(kit)).toEqual([]);
  });

  it("changes a passive's trigger without leaving it broken", () => {
    const passive = newPassive("P001", { RES: 1 });
    const low = retrigger(passive, "low_vita");
    expect(low.thresholdPercent).toBe(40);
    const hurt = retrigger({ ...low, effects: [newPassiveEffect("damage", "hurt")] }, "hurt");
    expect(hurt.thresholdPercent).toBeUndefined();
    expect(hurt.effects[0]).toMatchObject({ to: "other" });
    // Without a hit or a hurt there is no «other»: the damage goes to the enemies.
    expect(retrigger(hurt, "turn_start").effects[0]).toMatchObject({ to: "enemies" });
    expect(retrigger(hurt, null).effects).toEqual([]);
    expect(passiveToChoices("hit", "status").map((c) => c.value)).toEqual(["self", "allies", "enemies", "other"]);
    expect(passiveToChoices("turn_start", "charge").map((c) => c.value)).toEqual(["self", "allies"]);
  });

  it("turns a buff into a debuff when the effect goes to the other side", () => {
    expect(statusFor("empower", true)).toBe("weaken");
    expect(statusFor("burn", true)).toBe("burn");
    expect(statusFor("burn", false)).toBe("empower");
  });

  it("reads numbers with a comma or a point", () => {
    expect(parseDecimal("1,25")).toBe(1.25);
    expect(parseDecimal("0.5")).toBe(0.5);
    expect(parseDecimal("")).toBeNaN();
    expect(parseDecimal("1,2,3")).toBeNaN();
    expect(formatDecimal(1.25)).toBe("1,25");
    expect(formatDecimal(0.1 + 0.2)).toBe("0,3");
    expect(formatDecimal(undefined)).toBe("");
  });

  it("checks the shape of a kit written as text before the form shows it", () => {
    expect(kitShapeProblem(gantry())).toBeNull();
    expect(kitShapeProblem([])).toBe("Il kit deve essere un oggetto { … }.");
    const noSupreme: Record<string, unknown> = { ...gantry() };
    delete noSupreme.supreme;
    expect(kitShapeProblem(noSupreme)).toBe("La suprema manca o non è un oggetto.");
    expect(kitShapeProblem({ ...gantry(), base: { ...gantry().base, effects: "danno" } })).toBe("La base vuole un elenco di effetti.");
    expect(kitShapeProblem({ ...gantry(), passive: null })).toBeNull();
    expect(kitShapeProblem({ ...gantry(), passive: { id: "p", name: "P", scaling: {}, limit: 0, effects: [] } })).toBe(
      "La passiva vuole scaling e modifiers.",
    );
  });

  it("puts each error of the engine on its tab", () => {
    const kit = gantry();
    kit.special.cooldown = 0;
    kit.base.scaling = { FOR: 0.5 };
    const errors = errorsOf(kit);
    expect(errors.map((e) => tabOfError(kit, e))).toEqual(["base", "special"]);
    expect(tabOfError(kit, "Manca la suprema")).toBe("supreme");
    expect(tabOfError(kit, "Passiva P001-passive: non fa niente")).toBe("passive");
  });
});
