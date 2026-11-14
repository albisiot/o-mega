import type { Threat } from "@o-mega/game-engine";

// The abilities of a card on a result page, one chip each, with the mark a threat rule puts
// on them (×2, the frost cap, struck out…) and what each one counts. It follows baseScore in
// the rules engine: the test checks that the chips always add up to the same score.

export type MarkTone = "up" | "down" | "ice" | "off" | "ok";

export type AbilityMark = { text: string; tone: MarkTone };

export type AbilityChip = {
  code: string;
  /** The card's value. */
  raw: number;
  /** After Sabotatore, never below 0. */
  value: number;
  /** What Sabotatore took (0 when nothing). */
  malus: number;
  /** The rule's mark, if it touches this ability. */
  mark: AbilityMark | null;
  /** Points this ability adds to the score under the rule. */
  counted: number;
};

/** The highest `count` values keep counting under Duello; on equal values the first ones. */
function duelKept(values: number[], count: number): Set<number> {
  return new Set(
    values
      .map((value, index) => ({ value, index }))
      .sort((a, b) => b.value - a.value || a.index - b.index)
      .slice(0, count)
      .map(({ index }) => index),
  );
}

/**
 * The chips of a card on a threat. `stats` are the values the card scores with (under
 * Specchio, the opposing card's); `malus` is what Sabotatore takes from each.
 */
export function abilityChips(stats: Record<string, number>, threat: Pick<Threat, "abilities" | "modifier">, malus = 0): AbilityChip[] {
  const values = threat.abilities.map((code) => Math.max(0, (stats[code] ?? 0) - malus));
  const chip = (index: number, counted: number, mark: AbilityMark | null = null): AbilityChip => {
    const code = threat.abilities[index];
    const raw = stats[code] ?? 0;
    return { code, raw, value: values[index], malus: raw - values[index], mark, counted };
  };
  const modifier = threat.modifier;
  switch (modifier?.code) {
    case "focus":
      return values.map((v, i) => (i === 0 ? chip(i, v * 2, { text: "×2", tone: "up" }) : chip(i, v)));
    case "weak_link": {
      const lowest = values.indexOf(Math.min(...values));
      return values.map((v, i) => (i === lowest ? chip(i, v * 2, { text: "×2", tone: "up" }) : chip(i, v)));
    }
    case "abyss":
      return values.map((v, i) =>
        modifier.abilities.includes(threat.abilities[i]) ? chip(i, v * 2, { text: "×2", tone: "up" }) : chip(i, v),
      );
    case "frost":
      return values.map((v, i) => (v > modifier.cap ? chip(i, modifier.cap, { text: `max ${modifier.cap}`, tone: "ice" }) : chip(i, v)));
    case "duel": {
      const kept = duelKept(values, modifier.count);
      return values.map((v, i) => (kept.has(i) ? chip(i, v) : chip(i, 0, { text: "fuori", tone: "off" })));
    }
    case "all_or_nothing":
      return values.map((v, i) => (v >= modifier.min ? chip(i, v) : chip(i, 0, { text: "0", tone: "off" })));
    case "price":
      return values.map((v, i) =>
        v <= modifier.maxValue ? chip(i, -modifier.malus, { text: `−${modifier.malus}`, tone: "down" }) : chip(i, v),
      );
    case "one_force": {
      const group = threat.abilities.map((code, i) => (modifier.abilities.includes(code) ? i : -1)).filter((i) => i >= 0);
      if (group.length === 0) return values.map((v, i) => chip(i, v));
      const top = Math.max(...group.map((i) => values[i]));
      return values.map((v, i) => {
        if (!group.includes(i)) return chip(i, v);
        return v === top || group.length === 1 ? chip(i, top) : chip(i, top, { text: `→${top}`, tone: "up" });
      });
    }
    case "count":
      return values.map((v, i) =>
        v >= modifier.min ? chip(i, modifier.points, { text: `+${modifier.points}`, tone: "ok" }) : chip(i, 0, { text: "0", tone: "off" }),
      );
    case "negative":
      return values.map((v, i) => {
        const counted = Math.max(0, modifier.max - v);
        return chip(i, counted, { text: `→${counted}`, tone: counted > v ? "up" : counted < v ? "down" : "ok" });
      });
    case "echo":
      // The abilities Eco brings from the threat before count as usual: the mark says where they come from.
      return values.map((v, i) => (modifier.abilities.includes(threat.abilities[i]) ? chip(i, v, { text: "eco", tone: "ok" }) : chip(i, v)));
    default:
      return values.map((v, i) => chip(i, v));
  }
}

/** The points the chips add up to: the card's base score on the threat. */
export function chipsTotal(chips: readonly AbilityChip[]): number {
  return chips.reduce((sum, c) => sum + c.counted, 0);
}
