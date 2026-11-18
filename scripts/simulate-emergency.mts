// Simulates the Emergenza (SPEC §5.10) and the Emergenza della settimana (SPEC §5.16) on a
// catalog dump, with one method for both, so the weekly level sums can be compared with the
// daily ones. A run:
//   1. the server draws the threats (usual threats of Nuova Megara, rare ones at their chance);
//   2. knowing only the levels, the player fields a squad from their collection: greedily, the
//      character that best passes a level goes to it (pass rates over that level's threats);
//   3. each threat, the player sends, among the characters that pass it, the one worth least
//      for the levels still to come; if none passes, the one worth least overall.
// Collections ("profili"):
//   starter  the starter set: 10 distinct Delta (the daily fields 8 of them, the weekly all 10);
//   buona    a well-built squad: the starter set plus 30 packs (a month of daily packs);
//   grande   the starter set plus 80 packs;
//   tutto    the whole catalog (characters of a level aside).
//
// The dump: npx supabase db query --linked -f scripts/emergency-catalog.sql > emergency-raw.json
// Usage: node scripts/simulate-emergency.mts <emergency-raw.json> [--runs 4000] [--seed 1]
//   [--threats 10] [--sums 38-46,40-48]   threats per run and level sums to try (default: the
//                                         daily's 8 and 24-32 from game_config, then the weekly's)
//   [--failures 3] [--profiles starter,buona]

import { readFileSync } from "node:fs";
import {
  drawEmergencyThreats,
  isEmergencyFinished,
  mulberry32,
  pickOne,
  pickWeighted,
  placeModifier,
  resolveEmergencyPlay,
  shuffle,
  withRuleAbilities,
  type Character,
  type EmergencyAttempt,
  type EmergencyRules,
  type RareThreat,
  type Rng,
  type Threat,
} from "../packages/game-engine/src/index.ts";

type Card = {
  id: string;
  code: string;
  faction: string;
  rarity: string;
  rank: number;
  unlock: number | null;
  stats: Record<string, number>;
  power_code: string | null;
  power_params: Record<string, string | number> | null;
  active: boolean;
};
type Dump = {
  cards: Card[];
  rarities: { code: string; rank: number; weight: number }[];
  threats: {
    id: string;
    code: string;
    level: number;
    abilities: string[];
    active: boolean;
    region: string;
    modifier_code: string | null;
    modifier_params: Record<string, unknown> | null;
    rarity: string | null;
    target: number | null;
  }[];
  threat_rarities: Record<string, number>;
  abilities: { code: string; family: string }[];
  config: Record<string, unknown>;
};

const args = process.argv.slice(2);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const file = args[0];
if (!file) throw new Error("Usage: node scripts/simulate-emergency.mts <emergency-raw.json> [--runs 4000] [--sums 38-46]");
const raw = JSON.parse(readFileSync(file, "utf8")) as { rows?: { data: Dump }[] } & Partial<Dump>;
const data: Dump = raw.rows ? raw.rows[0].data : (raw as Dump);
const runs = Number(option("runs") ?? 4000);
const seed = Number(option("seed") ?? 1);
const profiles = (option("profiles") ?? "starter,buona,grande,tutto").split(",");

const cfg = (key: string) => {
  const value = Number(data.config[key]);
  if (!Number.isFinite(value)) throw new Error(`game_config ${key}`);
  return value;
};
const places = {
  longCountBonus: cfg("places.long_count_bonus"),
  frostCap: cfg("places.frost_cap"),
  duelCount: cfg("places.duel_count"),
  rare: {
    hostileBonus: cfg("threat_modifiers.hostile_bonus"),
    hostileMalus: cfg("threat_modifiers.hostile_malus"),
    underdogBonus: cfg("threat_modifiers.underdog_bonus"),
    underdogMalus: cfg("threat_modifiers.underdog_malus"),
    underdogCommonMaxRank: cfg("threat_modifiers.underdog_common_max_rank"),
    underdogEliteMinRank: cfg("threat_modifiers.underdog_elite_min_rank"),
    allOrNothingMin: cfg("rare_threats.all_or_nothing_min"),
    lastFirstBonus: cfg("rare_threats.last_first_bonus"),
    lastFirstTopRank: cfg("rare_threats.last_first_top_rank"),
    priceMaxValue: cfg("rare_threats.price_max_value"),
    priceMalus: cfg("rare_threats.price_malus"),
    countMin: cfg("rare_threats.count_min"),
    countPoints: cfg("rare_threats.count_points"),
    negativeMax: cfg("cards.ability_max"),
  },
};

const toCharacter = (c: Card): Character => ({
  id: c.id,
  definitionId: c.id,
  faction: c.faction,
  rarityRank: c.rank,
  stats: c.stats,
  power: c.power_code ? { code: c.power_code, params: c.power_params ?? {} } : null,
});
// What players can field: the characters of a level are left out (one each, never from packs).
const fieldable = data.cards.filter((c) => c.active && c.unlock === null).map(toCharacter);
const families = Object.fromEntries(data.abilities.map((a) => [a.code, a.family]));
const threats = data.threats.map((t) => ({ ...t, modifier: placeModifier(t.modifier_code, t.modifier_params, places) }));
// As the Edge Function builds them: Nuova Megara only, rare ones with their own target.
const megara: Threat[] = threats
  .filter((t) => t.active && !t.rarity && t.region === "megara")
  .map((t) => ({ id: t.id, level: t.level, abilities: t.abilities }));
const rare: RareThreat[] = threats
  .filter((t) => t.active && t.rarity && t.target !== null)
  .map((t) => ({
    id: t.id,
    level: t.level,
    abilities: t.abilities,
    modifier: t.modifier,
    rarity: t.rarity,
    target: t.target,
    oneIn: data.threat_rarities[t.rarity!] ?? 0,
  }));

const dailyTargets = Object.fromEntries([1, 2, 3, 4, 5, 6].map((level) => [level, cfg(`emergency.targets.level${level}`)]));
// The weekly thresholds to try: a list from level 1 to 6, or the daily ones.
const weeklyTargets = option("targets")
  ? Object.fromEntries(option("targets")!.split(",").map((value, i) => [i + 1, Number(value)]))
  : dailyTargets;
// The players' sense of a character is the daily one: the same cards, the same habits.
const targets = dailyTargets;
const levelLimits = {
  min: cfg("match.threat_levels.min"),
  max: cfg("match.threat_levels.max"),
  requireOneAtMost: cfg("match.threat_levels.require_one_at_most"),
  requireOneAtLeast: cfg("match.threat_levels.require_one_at_least"),
};

// How often a character passes a usual threat of each level on its own: the player's sense of it.
const passRate = new Map<string, number[]>();
for (const character of fieldable) {
  const rates = [0];
  for (let level = 1; level <= 6; level++) {
    const ofLevel = megara.filter((t) => t.level === level);
    const passed = ofLevel.filter(
      (threat) =>
        resolveEmergencyPlay({
          character,
          threat,
          squad: [character],
          attempts: [],
          rules: { threatsPerRun: 1, maxFailures: 1, targets, threatLevels: { ...levelLimits, minSum: 0, maxSum: 99 } },
          families,
        }).passed,
    ).length;
    rates.push(passed / ofLevel.length);
  }
  passRate.set(character.id, rates);
}
const rateFor = (c: Character, level: number) => passRate.get(c.id)![Math.min(6, Math.max(1, level))];

/**
 * The squad for these levels, as a player who knows their cards would field it: one character
 * per level, the hardest levels first, each time the one that passes it most often (on a tie,
 * the one worth least elsewhere); then swaps while they raise the expected threats passed.
 */
function fieldSquad(collection: readonly Character[], levels: readonly number[]): Character[] {
  if (collection.length <= levels.length) return [...collection];
  const slots = [...levels].sort((a, b) => b - a);
  const valueOf = (c: Character) => levels.reduce((sum, level) => sum + rateFor(c, level), 0);
  // The candidates worth considering: the best over the run's levels.
  const candidates = [...collection].sort((a, b) => valueOf(b) - valueOf(a)).slice(0, levels.length * 4);
  const free = new Set(candidates);
  const assigned: Character[] = [];
  for (const level of slots) {
    let best: Character | null = null;
    for (const c of free) {
      if (!best) best = c;
      else {
        const diff = rateFor(c, level) - rateFor(best, level);
        if (diff > 0 || (diff === 0 && valueOf(c) < valueOf(best))) best = c;
      }
    }
    assigned.push(best!);
    free.delete(best!);
  }
  for (let improved = true, rounds = 0; improved && rounds < 20; rounds++) {
    improved = false;
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const now = rateFor(assigned[i], slots[i]) + rateFor(assigned[j], slots[j]);
        const swapped = rateFor(assigned[j], slots[i]) + rateFor(assigned[i], slots[j]);
        if (swapped > now + 1e-9) {
          [assigned[i], assigned[j]] = [assigned[j], assigned[i]];
          improved = true;
        }
      }
      for (const c of free) {
        if (rateFor(c, slots[i]) > rateFor(assigned[i], slots[i]) + 1e-9) {
          free.add(assigned[i]);
          free.delete(c);
          assigned[i] = c;
          improved = true;
        }
      }
    }
  }
  return assigned;
}

/** Packs of five: rarity by weight, at least one Gamma or rarer each. */
function openPacks(rng: Rng, count: number): Character[] {
  const byRank = new Map<number, Character[]>();
  for (const c of fieldable) byRank.set(c.rarityRank, [...(byRank.get(c.rarityRank) ?? []), c]);
  const cards: Character[] = [];
  for (let p = 0; p < count; p++) {
    const pack = Array.from({ length: 5 }, () => pickWeighted(rng, data.rarities, (r) => r.weight).rank);
    if (pack.every((rank) => rank < 2)) pack[4] = pickWeighted(rng, data.rarities.filter((r) => r.rank >= 2), (r) => r.weight).rank;
    for (const rank of pack) cards.push(pickOne(rng, byRank.get(rank)!));
  }
  return cards;
}

function collectionFor(rng: Rng, profile: string): Character[] {
  if (profile === "tutto") return fieldable;
  const starter = shuffle(rng, fieldable.filter((c) => c.rarityRank === 1)).slice(0, 10);
  const packs = profile === "buona" ? 30 : profile === "grande" ? 80 : 0;
  const owned = new Map(starter.map((c) => [c.id, c]));
  for (const c of openPacks(rng, packs)) owned.set(c.id, c);
  return [...owned.values()];
}

type Result = { passed: number; score: number };

function playRun(rng: Rng, rules: EmergencyRules, collection: readonly Character[]): Result {
  const drawn = drawEmergencyThreats(rng, megara, rules, rare).map((t) => withRuleAbilities(t));
  const levels = drawn.map((t) => t.level);
  const squad = fieldSquad(collection, levels);
  const attempts: EmergencyAttempt[] = [];
  let score = 0;
  for (let i = 0; i < drawn.length && !isEmergencyFinished(attempts, rules); i++) {
    const later = levels.slice(i + 1);
    const worth = (c: Character) => later.reduce((sum, level) => sum + rateFor(c, level), 0);
    const options = squad
      .filter((c) => !attempts.some((a) => a.character === c))
      .map((c) => ({
        c,
        outcome: resolveEmergencyPlay({ character: c, threat: drawn[i], squad, attempts, rules, families, threatLevels: levels }),
      }));
    const passing = options.filter((o) => o.outcome.passed);
    const pool = passing.length > 0 ? passing : options;
    pool.sort((a, b) => worth(a.c) - worth(b.c) || a.outcome.score.total - b.outcome.score.total);
    const pick = pool[0];
    attempts.push({
      character: pick.c,
      passed: pick.outcome.passed,
      level: drawn[i].level,
      margin: pick.outcome.score.total - pick.outcome.required,
    });
    score += pick.outcome.score.total;
  }
  return { passed: attempts.filter((a) => a.passed).length, score };
}

function measure(threatsPerRun: number, minSum: number, maxSum: number, maxFailures: number, runTargets: Record<number, number>) {
  const rules: EmergencyRules = { threatsPerRun, maxFailures, targets: runTargets, threatLevels: { ...levelLimits, minSum, maxSum } };
  const row: string[] = [`${threatsPerRun} Minacce, somma ${minSum}-${maxSum}`.padEnd(26)];
  for (const profile of profiles) {
    const rng = mulberry32(seed);
    const results = Array.from({ length: runs }, () => playRun(rng, rules, collectionFor(rng, profile)));
    const mean = results.reduce((sum, r) => sum + r.passed, 0) / runs;
    const all = results.filter((r) => r.passed === threatsPerRun).length / runs;
    const median = [...results].sort((a, b) => a.passed - b.passed)[Math.floor(runs / 2)].passed;
    row.push(`${profile} ${mean.toFixed(2)} (med ${median}, tutte ${(all * 100).toFixed(1)}%)`.padEnd(36));
  }
  console.log(row.join(" "));
}

/** How often a random character passes a random usual threat (the daily method of SPEC §5.10). */
function randomPassRate(runTargets: Record<number, number>): number {
  let passed = 0;
  for (const character of fieldable) {
    for (const threat of megara) {
      const target = runTargets[threat.level];
      const outcome = resolveEmergencyPlay({
        character,
        threat,
        squad: [character],
        attempts: [],
        rules: { threatsPerRun: 1, maxFailures: 1, targets: { [threat.level]: target }, threatLevels: { ...levelLimits, minSum: 0, maxSum: 99 } },
        families,
      });
      if (outcome.passed) passed++;
    }
  }
  return passed / (fieldable.length * megara.length);
}

const failures = Number(option("failures") ?? cfg("emergency.max_failures"));
console.log(`${fieldable.length} personaggi, ${megara.length} Minacce di Nuova Megara, ${rare.length} rare; ${runs} tentativi per caso`);
console.log(
  `Un personaggio a caso supera una Minaccia normale: ${(randomPassRate(dailyTargets) * 100).toFixed(1)}% con le soglie del giorno, ` +
    `${(randomPassRate(weeklyTargets) * 100).toFixed(1)}% con quelle provate\n`,
);
console.log("Media delle Minacce superate (mediana, tutte superate)");
const threatsOption = option("threats");
if (!threatsOption) {
  measure(cfg("emergency.threats_per_run"), cfg("emergency.threat_levels.min_sum"), cfg("emergency.threat_levels.max_sum"), failures, dailyTargets);
}
console.log(`Soglie: ${Object.values(weeklyTargets).join(", ")}`);
const weeklyThreats = Number(threatsOption ?? 10);
for (const range of (option("sums") ?? "30-38,34-42,36-44,38-46,40-48,42-50").split(",")) {
  const [min, max] = range.split("-").map(Number);
  measure(weeklyThreats, min, max, failures, weeklyTargets);
}
