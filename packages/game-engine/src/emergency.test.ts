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
import { isValidLevelSequence } from "./threats.ts";
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
    expect(resolve(next, FOR_THREAT, [{ character: comeback, passed: false, level: 1 }]).score.bonus).toBe(3);
    expect(resolve(next, FOR_THREAT, [{ character: comeback, passed: true, level: 1 }]).score.bonus).toBe(0);
  });

  it("Sfavorito counts failures as rounds lost", () => {
    const hero = withPower({ code: "underdog", params: { bonus: 2 } });
    const other = character("other");
    const failed = [{ character: other, passed: false, level: 1 }];
    const even = [...failed, { character: other, passed: true, level: 1 }];
    expect(resolve(hero, FOR_THREAT, failed).score.bonus).toBe(2);
    expect(resolve(hero, FOR_THREAT, even).score.bonus).toBe(0);
  });

  it("Apripista and Ultimo baluardo read the position in the run", () => {
    const other = character("other");
    const seven = Array.from({ length: 7 }, () => ({ character: other, passed: true, level: 1 }));
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
    ...Array.from({ length: passed }, () => ({ character: other, passed: true, level: 1 })),
    ...Array.from({ length: failed }, () => ({ character: other, passed: false, level: 1 })),
  ];

  it("ends at the failure limit or at the last threat", () => {
    expect(isEmergencyFinished(attempts(5, 2), RULES)).toBe(false);
    expect(isEmergencyFinished(attempts(1, 3), RULES)).toBe(true);
    expect(isEmergencyFinished(attempts(8, 0), RULES)).toBe(true);
    expect(isEmergencyFinished(attempts(6, 2), RULES)).toBe(true);
  });
});

describe("Crescendo and Slancio in Emergenza", () => {
  it("Crescendo reads the level of the previous threat", () => {
    const rising = character("c", { FOR: 4 }, { code: "crescendo", params: { bonus: 3 } });
    const other = character("o");
    expect(resolve(rising, FOR_THREAT, [{ character: other, passed: true, level: 3 }]).score.bonus).toBe(0);
    expect(resolve(rising, threat("t", ["FOR", "VEL", "RES", "INT"]), [{ character: other, passed: true, level: 3 }]).score.bonus).toBe(3);
    expect(resolve(rising, FOR_THREAT).score.bonus).toBe(0);
  });

  it("Slancio passes its bonus after a passed threat", () => {
    const momentum = character("m", {}, { code: "momentum", params: { bonus: 2 } });
    const next = character("n", { FOR: 4 });
    expect(resolve(next, FOR_THREAT, [{ character: momentum, passed: true, level: 1 }]).score.bonus).toBe(2);
    expect(resolve(next, FOR_THREAT, [{ character: momentum, passed: false, level: 1 }]).score.bonus).toBe(0);
  });
});

describe("backlog powers in Emergenza", () => {
  it("Vendetta pays after a failed threat, Grande prova on the day's highest level", () => {
    const vendetta = withPower({ code: "vendetta", params: { bonus: 3 } });
    const failed: EmergencyAttempt[] = [{ character: character("x"), passed: false, level: 1 }];
    expect(resolve(vendetta, FOR_THREAT, failed).score.bonus).toBe(3);
    expect(resolve(vendetta, FOR_THREAT, [{ ...failed[0], passed: true }]).score.bonus).toBe(0);

    const main = withPower({ code: "main_event", params: { bonus: 3 } });
    const play = (levels: number[]) =>
      resolveEmergencyPlay({ character: main, threat: FOR_THREAT, squad: [main], attempts: [], rules: RULES, families: FAMILIES, threatLevels: levels });
    expect(play([1, 1]).score.bonus).toBe(3);
    expect(play([1, 4]).score.bonus).toBe(0);
  });

  it("Sacrificio fails its threat, then every later play gets its bonus", () => {
    const sacrifice = withPower({ code: "sacrifice", params: { bonus: 2 } }, { FOR: 10 });
    expect(resolve(sacrifice).passed).toBe(false);
    const attempts = [{ character: sacrifice, passed: false, level: 1 }];
    const after = resolve(character("next", { FOR: 2 }), FOR_THREAT, attempts);
    expect(after.score).toMatchObject({ total: 4, parts: { sacrifice: 2 } });
    // Still there three plays later.
    const later = [...attempts, ...["x", "y", "z"].map((id) => ({ character: character(id), passed: true, level: 1 }))];
    expect(resolve(character("last", { FOR: 2 }), FOR_THREAT, later).score.total).toBe(4);
  });
});

// Emergenza della settimana (SPEC §5.16): the same engine with the week's rules.
const WEEK: EmergencyRules = {
  threatsPerRun: 10,
  maxFailures: 3,
  targets: { 1: 9, 2: 15, 3: 20, 4: 25, 5: 30, 6: 34 },
  threatLevels: { min: 1, max: 6, requireOneAtMost: 2, requireOneAtLeast: 5, minSum: 36, maxSum: 44 },
};

describe("Emergenza della settimana", () => {
  it("draws 10 distinct threats, bigger on average than the daily ones", () => {
    const rng = mulberry32(11);
    let total = 0;
    for (let i = 0; i < 50; i++) {
      const threats = drawEmergencyThreats(rng, threatCatalog(), WEEK);
      const levels = threats.map((t) => t.level);
      const sum = levels.reduce((a, b) => a + b, 0);
      expect(threats).toHaveLength(10);
      expect(new Set(threats.map((t) => t.id)).size).toBe(10);
      expect(sum).toBeGreaterThanOrEqual(36);
      expect(sum).toBeLessThanOrEqual(44);
      expect(levels.some((level) => level <= 2)).toBe(true);
      expect(levels.some((level) => level >= 5)).toBe(true);
      total += sum;
    }
    expect(total / 50 / 10).toBeGreaterThan((24 + 32) / 2 / 8);
  });

  it("never needs more than 8 threats of one level: the 8 an admin must keep active are enough", () => {
    // Every way to split 10 threats among the 6 levels that the week's rules accept.
    let most = 0;
    const split = (left: number, level: number, counts: number[]) => {
      if (level === 6) {
        const all = [...counts, left];
        const levels = all.flatMap((count, i) => Array.from({ length: count }, () => i + 1));
        if (isValidLevelSequence(levels, WEEK.threatLevels)) most = Math.max(most, ...all);
        return;
      }
      for (let count = 0; count <= left; count++) split(left - count, level + 1, [...counts, count]);
    };
    split(10, 1, []);
    expect(most).toBe(8);
  });

  it("asks the week's targets, 2 above the daily ones; a rare threat keeps its own", () => {
    const hero = character("hero", { FOR: 8 });
    expect(requiredScore(hero, FOR_THREAT, WEEK)).toBe(9);
    expect(requiredScore(hero, FOR_THREAT, RULES)).toBe(7);
    expect(resolveEmergencyPlay({ character: hero, threat: FOR_THREAT, squad: [hero], attempts: [], rules: WEEK, families: FAMILIES }).passed)
      .toBe(false);
    const rare: Threat = { ...FOR_THREAT, rarity: "rare", target: 8 };
    expect(requiredScore(hero, rare, WEEK)).toBe(8);
    // Under Rovescio the target is the most a play may score.
    const reverse: Threat = { ...FOR_THREAT, modifier: { code: "reverse" }, rarity: "epic", target: 9 };
    expect(resolveEmergencyPlay({ character: hero, threat: reverse, squad: [hero], attempts: [], rules: WEEK, families: FAMILIES }).passed)
      .toBe(true);
  });

  it("ends at the third failure or after the tenth threat", () => {
    const other = character("other");
    const attempts = (passed: number, failed: number): EmergencyAttempt[] => [
      ...Array.from({ length: passed }, () => ({ character: other, passed: true, level: 1 })),
      ...Array.from({ length: failed }, () => ({ character: other, passed: false, level: 1 })),
    ];
    expect(isEmergencyFinished(attempts(8, 0), WEEK)).toBe(false);
    expect(isEmergencyFinished(attempts(7, 2), WEEK)).toBe(false);
    expect(isEmergencyFinished(attempts(10, 0), WEEK)).toBe(true);
    expect(isEmergencyFinished(attempts(4, 3), WEEK)).toBe(true);
  });

  it("Legame counts the 10 of the squad", () => {
    const bond = character("bond", { FOR: 1 }, { code: "bond", params: { bonus: 1 } });
    const squad = [bond, ...Array.from({ length: 9 }, (_, i) => character(`m${i}`))];
    const outcome = resolveEmergencyPlay({ character: bond, threat: FOR_THREAT, squad, attempts: [], rules: WEEK, families: FAMILIES });
    expect(outcome.score.bonus).toBe(9);
  });
});
