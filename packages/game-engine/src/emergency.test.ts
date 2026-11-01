import { describe, expect, it } from "vitest";
import {
  drawEmergencyThreats,
  isEmergencyFinished,
  requiredScore,
  resolveEmergencyPlay,
  type EmergencyAttempt,
  type EmergencyRules,
} from "./emergency.ts";
import { mulberry32 } from "./rng.ts";
import { character, FAMILIES, threat, threatCatalog } from "./test-fixtures.ts";
import type { Character, Power, Threat } from "./types.ts";

const RULES: EmergencyRules = {
  threatsPerRun: 8,
  maxFailures: 3,
  targets: { 1: 7, 2: 13, 3: 18, 4: 23, 5: 28, 6: 32 },
  threatLevels: { min: 1, max: 6, requireOneAtMost: 2, requireOneAtLeast: 5, minSum: 24, maxSum: 32 },
};

const FOR_THREAT = threat("for", ["FOR"]);

function resolve(hero: Character, target: Threat = FOR_THREAT, attempts: EmergencyAttempt[] = [], squad = [hero]) {
  return resolveEmergencyPlay({ character: hero, threat: target, squad, attempts, rules: RULES, families: FAMILIES });
}

function withPower(power: Power, stats: Record<string, number> = {}) {
  return character("hero", stats, power);
}

describe("drawEmergencyThreats", () => {
  it("draws a valid sequence of distinct threats", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 50; i++) {
      const threats = drawEmergencyThreats(rng, threatCatalog(), RULES);
      const levels = threats.map((t) => t.level);
      const sum = levels.reduce((a, b) => a + b, 0);
      expect(threats).toHaveLength(8);
      expect(new Set(threats.map((t) => t.id)).size).toBe(8);
      expect(sum).toBeGreaterThanOrEqual(24);
      expect(sum).toBeLessThanOrEqual(32);
      expect(levels.some((level) => level <= 2)).toBe(true);
      expect(levels.some((level) => level >= 5)).toBe(true);
    }
  });
});

describe("resolveEmergencyPlay", () => {
  it("passes a threat exactly at the target, not one point below", () => {
    expect(resolve(character("a", { FOR: 7 })).passed).toBe(true);
    expect(resolve(character("b", { FOR: 6 })).passed).toBe(false);
  });

  it("uses the target of the threat's level", () => {
    const level3 = threat("t3", ["FOR", "VEL", "RES"]);
    const outcome = resolve(character("a", { FOR: 6, VEL: 6, RES: 6 }), level3);
    expect(outcome).toMatchObject({ required: 18, passed: true, score: { total: 18 } });
  });

  it("Sabotatore lowers the target by its malus per required ability", () => {
    const hero = withPower({ code: "sabotage", params: { malus: 1 } }, { FOR: 6, VEL: 6, RES: 3 });
    const level3 = threat("t3", ["FOR", "VEL", "RES"]);
    const outcome = resolve(hero, level3);
    expect(outcome.required).toBe(15);
    expect(outcome.passed).toBe(true);
    // The character's own values are not touched: the malus is for the other side.
    expect(outcome.score.total).toBe(15);
  });

  it("Implacabile is satisfied one point short", () => {
    const hero = withPower({ code: "relentless", params: {} }, { FOR: 6 });
    expect(resolve(hero)).toMatchObject({ required: 6, passed: true });
  });

  it("never asks for a negative score", () => {
    const hero = withPower({ code: "sabotage", params: { malus: 9 } });
    expect(requiredScore(hero, FOR_THREAT, RULES)).toBe(0);
  });

  it("Riscossa carries its bonus only after a failed threat", () => {
    const comeback = withPower({ code: "comeback", params: { bonus: 3 } });
    const next = character("next", { FOR: 4 });
    expect(resolve(next, FOR_THREAT, [{ character: comeback, passed: false }]).score.bonus).toBe(3);
    expect(resolve(next, FOR_THREAT, [{ character: comeback, passed: true }]).score.bonus).toBe(0);
  });

  it("Sfavorito counts failures as rounds lost", () => {
    const hero = withPower({ code: "underdog", params: { bonus: 2 } });
    const other = character("other");
    const failed = [{ character: other, passed: false }];
    const even = [...failed, { character: other, passed: true }];
    expect(resolve(hero, FOR_THREAT, failed).score.bonus).toBe(2);
    expect(resolve(hero, FOR_THREAT, even).score.bonus).toBe(0);
  });

  it("Apripista and Ultimo baluardo read the position in the run", () => {
    const other = character("other");
    const seven = Array.from({ length: 7 }, () => ({ character: other, passed: true }));
    const opener = withPower({ code: "opener", params: { max_round: 2, bonus: 3 } });
    const lastStand = withPower({ code: "last_stand", params: { min_round: 4, bonus: 3 } });
    expect(resolve(opener).score.bonus).toBe(3);
    expect(resolve(opener, FOR_THREAT, seven).score.bonus).toBe(0);
    expect(resolve(lastStand).score.bonus).toBe(0);
    expect(resolve(lastStand, FOR_THREAT, seven).score.bonus).toBe(3);
  });

  it("Legame counts the whole squad, already played or not", () => {
    const hero = withPower({ code: "bond", params: { bonus: 1 } });
    const squad = [hero, character("x"), character("y"), { ...character("z"), faction: "villains" }];
    expect(resolve(hero, FOR_THREAT, [], squad).score.bonus).toBe(2);
  });
});

describe("isEmergencyFinished", () => {
  const other = character("other");
  const attempts = (passed: number, failed: number): EmergencyAttempt[] => [
    ...Array.from({ length: passed }, () => ({ character: other, passed: true })),
    ...Array.from({ length: failed }, () => ({ character: other, passed: false })),
  ];

  it("ends at the failure limit or at the last threat", () => {
    expect(isEmergencyFinished(attempts(5, 2), RULES)).toBe(false);
    expect(isEmergencyFinished(attempts(1, 3), RULES)).toBe(true);
    expect(isEmergencyFinished(attempts(8, 0), RULES)).toBe(true);
    expect(isEmergencyFinished(attempts(6, 2), RULES)).toBe(true);
  });
});
