import { describe, expect, it } from "vitest";
import { autoCombatFormation, combatTargets, createCombat, mulberry32, type CombatContext, type CombatEvent, type CombatFighterInput } from "@o-mega/game-engine";
import {
  combatPreview,
  combatStepLines,
  combatStepView,
  describeMovePlain,
  describeMoveShort,
  namePassiveFloats,
  previewText,
  protectedFrom,
  strengthWord,
  type Segment,
} from "./combat-clarity";
import { combatEventLine } from "./combat-text";
import { combatRules } from "./combat";
import { COMBAT_PILOTS, PILOT_BUDGETS, type CombatPilot } from "./combat-pilot";

const names: Record<string, string> = { a0: "Gantry", a1: "Higgler", a2: "Busker", b0: "Kiln", b1: "Sordina", b3: "Aion" };
const name = (key: string) => names[key] ?? key;
const moveName = (id: string) => ({ m1: "Serratura fusa", m2: "La canzone giusta", m3: "Aria di casa", p1: "Non molla niente" })[id] ?? id;
const isMine = (key: string) => key.startsWith("a");
const other = (e: CombatEvent) => combatEventLine(e, name, moveName, "a");
const text = (line: Segment[]) => line.map((s) => s.text).join("");

describe("what a step shows", () => {
  it("one actor, an arrow to whom it reached, words over each, and a miss that hits nobody", () => {
    const events: CombatEvent[] = [
      { kind: "move", actor: "b0", slot: "special", move: "m1", target: "a1" },
      { kind: "damage", actor: "b0", target: "a1", amount: 133, absorbed: 46, critical: true, family: "power" },
      { kind: "status", actor: "b0", target: "a1", status: "burn", turns: 2 },
      { kind: "turn", actor: "a0", turn: 3 },
    ];
    const view = combatStepView(events);
    expect(view.actor).toBe("b0");
    expect(view.arrows).toEqual([{ from: "b0", to: "a1", tone: "harm" }]);
    expect(view.struck).toEqual(["a1"]);
    expect(view.floats.get("a1")).toEqual([
      { text: "CRITICO −133", tone: "crit" },
      { text: "46 sullo scudo", tone: "shield" },
      { text: "Bruciatura!", tone: "bad" },
    ]);

    const missed = combatStepView([
      { kind: "move", actor: "b1", slot: "special", move: "m1", target: "a0" },
      { kind: "miss", actor: "b1", target: "a0" },
    ]);
    expect(missed.struck).toEqual([]);
    expect(missed.arrows).toEqual([{ from: "b1", to: "a0", tone: "miss" }]);
    expect(missed.floats.get("a0")).toEqual([{ text: "MANCATO", tone: "miss" }]);
  });

  it("a passive's name over its owner, and no arrow for what the passive does", () => {
    const events: CombatEvent[] = [
      { kind: "move", actor: "b0", slot: "base", move: "m1", target: "a0" },
      { kind: "damage", actor: "b0", target: "a0", amount: 40, absorbed: 0, critical: false, family: "body" },
      { kind: "passive", actor: "a0", passive: "p1", trigger: "hurt" },
      { kind: "charge", target: "a0", amount: 1 },
    ];
    const view = namePassiveFloats(combatStepView(events), events, moveName);
    expect(view.floats.get("a0")).toEqual([
      { text: "−40", tone: "harm" },
      { text: "Non molla niente", tone: "info" },
    ]);
    expect(view.arrows).toEqual([{ from: "b0", to: "a0", tone: "harm" }]);
  });
});

describe("the lines of a step", () => {
  it("the whole action in one line, with whom it reached", () => {
    const lines = combatStepLines(
      [
        { kind: "move", actor: "b0", slot: "special", move: "m1", target: "a1" },
        { kind: "damage", actor: "b0", target: "a1", amount: 100, absorbed: 0, critical: false, family: "power" },
        { kind: "status", actor: "b0", target: "a1", status: "burn", turns: 2 },
      ],
      name,
      moveName,
      isMine,
      other,
    );
    expect(lines.map(text)).toEqual(["Kiln → Higgler · Serratura fusa: −100, Bruciatura 2 turni"]);
    expect(lines[0][0]).toEqual({ text: "Kiln", side: "theirs" });
    expect(lines[0][2]).toEqual({ text: "Higgler", side: "mine" });
  });

  it("a move on all the enemies names each of them; a passive and the next turn's burn have their own lines", () => {
    const lines = combatStepLines(
      [
        { kind: "move", actor: "a2", slot: "special", move: "m2", target: null },
        { kind: "damage", actor: "a2", target: "b1", amount: 24, absorbed: 0, critical: false, family: "mind" },
        { kind: "damage", actor: "a2", target: "b0", amount: 35, absorbed: 0, critical: true, family: "mind" },
        { kind: "miss", actor: "a2", target: "b3" },
        { kind: "resisted", actor: "a2", target: "b0", status: "weaken", immune: false },
        { kind: "defeated", target: "b1" },
        { kind: "passive", actor: "a0", passive: "p1", trigger: "ally_down" },
        { kind: "charge", target: "a0", amount: 1 },
        { kind: "turn", actor: "b0", turn: 4 },
        { kind: "burn", target: "b0", amount: 12 },
      ],
      name,
      moveName,
      isMine,
      other,
    );
    expect(lines.map(text)).toEqual([
      "Busker → tutti i nemici · La canzone giusta: Sordina −24, KO!; Kiln −35 critico, resiste a Indebolimento; Aion mancato",
      "Gantry: Non molla niente: +1 Carica",
      "Kiln brucia: −12.",
    ]);
  });

  it("a move on the whole team, and one on itself", () => {
    const team = combatStepLines(
      [
        { kind: "move", actor: "a1", slot: "supreme", move: "m3", target: null },
        { kind: "heal", actor: "a1", target: "a0", amount: 30 },
        { kind: "heal", actor: "a1", target: "a1", amount: 25 },
      ],
      name,
      moveName,
      isMine,
      other,
    );
    expect(team.map(text)).toEqual(["Higgler → la squadra · Aria di casa: Gantry +30 Vita; Higgler +25 Vita"]);
    const self = combatStepLines(
      [
        { kind: "move", actor: "a0", slot: "special", move: "m1", target: null },
        { kind: "shield", actor: "a0", target: "a0", amount: 60 },
      ],
      name,
      moveName,
      isMine,
      other,
    );
    expect(self.map(text)).toEqual(["Gantry → sé · Serratura fusa: +60 scudo"]);
  });
});

describe("the moves in words", () => {
  const gantry = COMBAT_PILOTS.find((p) => p.code === "P001")!;
  it("a word for a multiplier, and a line for a button", () => {
    expect(strengthWord(0.35)).toBe("leggero");
    expect(strengthWord(0.9)).toBe("normale");
    expect(strengthWord(1.25)).toBe("forte");
    expect(strengthWord(2.2)).toBe("molto forte");
    expect(describeMoveShort(gantry.kit.base)).toBe("1 nemico in prima linea · danno normale");
    expect(describeMoveShort(gantry.kit.supreme)).toBe("tutti i nemici · danno normale + effetto");
  });

  it("a sentence that says the rules of the lines", () => {
    expect(describeMovePlain(gantry.kit.base, combatRules())).toBe("Colpisce un nemico in prima linea: la seconda è protetta finché la prima è in piedi. Danno normale.");
    expect(describeMovePlain(gantry.kit.special, combatRules())).toBe("Colpisce un nemico e quelli vicini a lui. Danno forte, danno leggero ai vicini. Poi si ricarica per 3 turni.");
    expect(describeMovePlain(gantry.kit.supreme, combatRules())).toContain("Serve la Carica piena.");
  });
});

describe("before a choice", () => {
  const FAMILIES = { FOR: "body", VEL: "body", RES: "body", INT: "mind", VOL: "mind", PER: "mind", ENE: "power", MAG: "power", PSI: "power", COM: "craft", TEC: "craft", FUR: "craft" };
  const ctx: CombatContext = { rules: combatRules(), families: FAMILIES };
  const input = (p: CombatPilot): CombatFighterInput => ({ id: p.code, definitionId: p.code, name: p.name, stats: p.stats, budget: PILOT_BUDGETS[p.rarity], kit: p.kit });
  const team = (name: CombatPilot["team"]) => autoCombatFormation(COMBAT_PILOTS.filter((p) => p.team === name).map(input), ctx);
  const { state } = createCombat({ a: team("porto"), b: team("rivali"), field: null }, ctx, mulberry32(7));

  it("a damage and a chance on each target, less on the covered second line", () => {
    const actor = state.fighters.find((f) => f.side === "a" && f.kit.base.range !== "melee")!;
    const targets = combatTargets(state, actor, actor.kit.base, ctx.rules)!;
    const previews = combatPreview(state, actor, actor.kit.base, targets, ctx);
    expect(previews).toHaveLength(targets.length);
    for (const p of previews) {
      expect(p.damage).toBeGreaterThan(0);
      expect(p.hitPercent).toBeGreaterThanOrEqual(ctx.rules.hit.minPercent);
      expect(p.hitPercent).toBeLessThanOrEqual(ctx.rules.hit.maxPercent);
      expect(p.covered).toBe(state.fighters.find((f) => f.key === p.key)!.position >= ctx.rules.frontSize);
    }
    expect(previewText(previews[0])).toMatch(/^~\d+ · \d+%$/);
  });

  it("the second line protected from close combat while the first stands", () => {
    const fighter = state.fighters.find((f) => f.side === "a" && f.kit.base.range === "melee");
    if (!fighter) return;
    expect(protectedFrom(state, fighter, fighter.kit.base, ctx.rules)).toEqual(
      state.fighters.filter((f) => f.side === "b" && f.position >= ctx.rules.frontSize).map((f) => f.key),
    );
  });
});
