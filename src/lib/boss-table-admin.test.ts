import { describe, expect, it } from "vitest";
import { isValidBossValues } from "@o-mega/game-engine";
import { balance } from "@/config/balance";
import { bossTableProblem, exampleBossTable, type BossTableNumbers } from "./boss-table-admin";

const DEFAULTS: BossTableNumbers = { hot_fronts: 2, hot_value: 2, base_value: 1, growth: 1, extra_fronts: 2, extra_growth: 1 };

describe("Grande Minaccia table settings", () => {
  it("accepts the defaults, which are those of balance.ts", () => {
    expect(bossTableProblem(DEFAULTS, 5)).toBeNull();
    expect(DEFAULTS).toEqual({
      hot_fronts: balance.boss.hotFronts,
      hot_value: balance.boss.hotValue,
      base_value: balance.boss.baseValue,
      growth: balance.boss.growth,
      extra_fronts: balance.boss.extraFronts,
      extra_growth: balance.boss.extraGrowth,
    });
  });

  it("refuses what the server refuses", () => {
    expect(bossTableProblem({ ...DEFAULTS, hot_fronts: 6 }, 5)).not.toBeNull();
    expect(bossTableProblem({ ...DEFAULTS, extra_growth: 21 }, 5)).not.toBeNull();
    expect(bossTableProblem({ ...DEFAULTS, growth: -1 }, 5)).not.toBeNull();
    expect(bossTableProblem({ ...DEFAULTS, growth: NaN }, 5)).not.toBeNull();
    expect(bossTableProblem({ ...DEFAULTS, hot_value: 0, base_value: 0 }, 5)).not.toBeNull();
    expect(bossTableProblem({ ...DEFAULTS, hot_fronts: 5, base_value: 0 }, 5)).toBeNull();
  });

  it("draws an example that follows the numbers", () => {
    const numbers = { hot_fronts: 1, hot_value: 4, base_value: 2, growth: 2, extra_fronts: 3, extra_growth: 1 };
    const table = exampleBossTable({ turns: 5, fronts: 5, ...numbers });
    expect([...table[0]].sort()).toEqual([2, 2, 2, 2, 4]);
    expect(
      isValidBossValues(table, { turns: 5, fronts: 5, hotFronts: 1, hotValue: 4, baseValue: 2, growth: 2, extraFronts: 3, extraGrowth: 1 }),
    ).toBe(true);
    expect(exampleBossTable({ turns: 5, fronts: 5, ...numbers })).toEqual(table);
  });
});
