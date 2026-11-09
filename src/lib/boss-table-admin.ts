import { drawBossValues, mulberry32, type BossRules } from "@o-mega/game-engine";
import { getSupabase } from "@/lib/supabase/client";

/** The Grande Minaccia points table as admins set it (game_config boss.*). */
export type BossTableSettings = {
  turns: number;
  fronts: number;
  hot_fronts: number;
  hot_value: number;
  base_value: number;
  growth: number;
  extra_fronts: number;
  extra_growth: number;
  updated_at: string | null;
};

/** The numbers an admin can change, with the limits the server checks. */
export type BossTableNumbers = Pick<BossTableSettings, "hot_fronts" | "hot_value" | "base_value" | "growth" | "extra_fronts" | "extra_growth">;
export const BOSS_VALUE_MAX = 20;

export async function fetchBossTable(): Promise<BossTableSettings> {
  const { data, error } = await getSupabase().rpc("admin_get_boss_table");
  if (error) throw error;
  return data as unknown as BossTableSettings;
}

export async function saveBossTable(numbers: BossTableNumbers): Promise<BossTableSettings> {
  const { data, error } = await getSupabase().rpc("admin_save_boss_table", {
    p_hot_fronts: numbers.hot_fronts,
    p_hot_value: numbers.hot_value,
    p_base_value: numbers.base_value,
    p_growth: numbers.growth,
    p_extra_fronts: numbers.extra_fronts,
    p_extra_growth: numbers.extra_growth,
  });
  if (error) throw error;
  return data as unknown as BossTableSettings;
}

/** Why the numbers cannot be saved, in Italian; null when they can. Mirrors admin_save_boss_table. */
export function bossTableProblem(numbers: BossTableNumbers, fronts: number): string | null {
  const values = Object.values(numbers);
  if (values.some((value) => !Number.isInteger(value) || value < 0)) return "Usa numeri interi da 0 in su.";
  if (numbers.hot_fronts > fronts || numbers.extra_fronts > fronts) return `I fronti sono ${fronts}: non puoi indicarne di più.`;
  if ([numbers.hot_value, numbers.base_value, numbers.growth, numbers.extra_growth].some((value) => value > BOSS_VALUE_MAX)) {
    return `Ogni valore va da 0 a ${BOSS_VALUE_MAX}.`;
  }
  if (numbers.hot_fronts * numbers.hot_value + (fronts - numbers.hot_fronts) * numbers.base_value === 0) {
    return "Al primo turno almeno un fronte deve valere qualcosa.";
  }
  return null;
}

/** A table drawn with these numbers, the same every time for the same numbers: an example. */
export function exampleBossTable(settings: Pick<BossTableSettings, "turns" | "fronts"> & BossTableNumbers): number[][] {
  const rules: BossRules = {
    turns: settings.turns,
    fronts: settings.fronts,
    hotFronts: settings.hot_fronts,
    hotValue: settings.hot_value,
    baseValue: settings.base_value,
    growth: settings.growth,
    extraFronts: settings.extra_fronts,
    extraGrowth: settings.extra_growth,
  };
  return drawBossValues(mulberry32(2026), rules);
}
