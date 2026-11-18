// Simulates the Story missions (SPEC §5.11) on a catalog dump, with the method the
// chapters were calibrated with: a player with a random team who always sends the
// character with the highest score, against the mission's bot, its threats and its
// modifiers. It also measures the mission stars:
//   - how often the player wins 3-0 (Netta);
//   - how often a team made only of the mission's rarities wins (Rarità);
//   - how often a team made only of the mission's traits wins (Tratti).
// Every measure is taken with two teams: "casuale", 5 characters drawn from those
// allowed (the floor), and "buona", the best of 40 such draws on the mission's own
// threats, as a player who replays the mission and owns those characters would field.
//
// The dump: npx supabase db query --linked -f scripts/story-catalog.sql > story-raw.json
// Usage: node scripts/simulate-story.mts <story-raw.json> [--missions C1M1,C1M5] [--matches 2000] [--seed 1]
//   [--stars stars.json]   star rules to try instead of the database's: {"C1M1": {"rarities": [...], "traits": [...]}}
//   [--only base|rarities|traits]   measure one part only
// Matches per measure: --matches with the Medio bot (and Facile), 60% of it with Difficile, 15% with Super Pro.

import { readFileSync } from "node:fs";
import {
  availableCharacters,
  carriedBonus,
  computeAbilityMeans,
  currentRoundNumber,
  currentThreat,
  fitsStarRarities,
  fitsStarTraits,
  isFinished,
  matchResult,
  mulberry32,
  pickOne,
  placeModifier,
  playBotRound,
  previousLevel,
  roundsWon,
  scorePlay,
  shuffle,
  type BotDifficulty,
  type Character,
  type MatchRules,
  type MatchState,
  type Rng,
  type StoryStarRules,
  type Threat,
  type ThreatModifier,
} from "../packages/game-engine/src/index.ts";

type Card = {
  id: string;
  code: string;
  name: string;
  faction: string;
  rarity: string;
  rank: number;
  unlock: number | null;
  stats: Record<string, number>;
  power_code: string | null;
  power_params: Record<string, string | number> | null;
  active: boolean;
  traits: string[];
};
type Mission = {
  code: string;
  difficulty: BotDifficulty;
  bot: string[];
  threats: string[];
  mods: (ThreatModifier | null)[];
  star_rarities?: string[] | null;
  star_traits?: string[] | null;
};
type Dump = {
  cards: Card[];
  threats: {
    id: string;
    code: string;
    level: number;
    abilities: string[];
    active: boolean;
    modifier_code: string | null;
    modifier_params: Record<string, unknown> | null;
    rarity: string | null;
  }[];
  abilities: { code: string; family: string }[];
  traits: { code: string; category: string; name: string }[];
  config: Record<string, unknown>;
  missions: Mission[];
};

const args = process.argv.slice(2);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const file = args[0];
if (!file) throw new Error("Usage: node scripts/simulate-story.mts <story-raw.json> [--missions C1M1,C1M5] [--matches 2000]");
const raw = JSON.parse(readFileSync(file, "utf8")) as { rows?: { data: Dump }[] } & Partial<Dump>;
const data: Dump = raw.rows ? raw.rows[0].data : (raw as Dump);
const onlyMissions = option("missions")?.split(",");
const baseMatches = Number(option("matches") ?? 2000);
const seed = Number(option("seed") ?? 1);
const only = option("only");
const starOverrides = option("stars")
  ? (JSON.parse(readFileSync(option("stars")!, "utf8")) as Record<string, Partial<StoryStarRules>>)
  : {};

const cfg = (key: string) => {
  const value = Number(data.config[key]);
  if (!Number.isFinite(value)) throw new Error(`game_config ${key}`);
  return value;
};
// The fixed rule of a threat of a place, as the Edge Function builds it.
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
const active = data.cards.filter((c) => c.active);
// What players can field from packs: the characters of a level are left out, as in the admin counts.
const fieldable = active.filter((c) => c.unlock === null);
const characters = active.map(toCharacter);
const byCode = new Map(data.cards.map((c) => [c.code, c]));
const threats = data.threats.map((t) => ({
  ...t,
  modifier: placeModifier(t.modifier_code, t.modifier_params, places),
}));
const threatByCode = new Map(threats.map((t) => [t.code, { id: t.id, level: t.level, abilities: t.abilities, modifier: t.modifier } as Threat]));
// The bots know the usual threats only: the rare ones never enter a mission (SPEC §5.11).
const knowledge = {
  threatCatalog: threats
    .filter((t) => t.active && !t.rarity)
    .map((t) => ({ id: t.id, level: t.level, abilities: t.abilities, modifier: t.modifier })),
  families: Object.fromEntries(data.abilities.map((a) => [a.code, a.family])),
  abilityMeans: computeAbilityMeans(characters),
  characters,
};
const categoryOf = (() => {
  const map = new Map(data.traits.map((t) => [t.code, t.category]));
  return (code: string) => map.get(code);
})();
const rules: MatchRules = {
  teamSize: cfg("match.team_size"),
  threatsPerMatch: cfg("match.threats_per_match"),
  roundsToWin: cfg("match.rounds_to_win"),
  threatLevels: {
    min: cfg("match.threat_levels.min"),
    max: cfg("match.threat_levels.max"),
    requireOneAtMost: cfg("match.threat_levels.require_one_at_most"),
    requireOneAtLeast: cfg("match.threat_levels.require_one_at_least"),
    minSum: cfg("match.threat_levels.min_sum"),
    maxSum: cfg("match.threat_levels.max_sum"),
  },
};

/** The player: always the character with the highest score on the threat of the round. */
function greedy(state: MatchState, rng: Rng): string {
  const threat = currentThreat(state);
  const won = roundsWon(state);
  const context = {
    families: knowledge.families,
    roundsWon: won.a,
    opponentRoundsWon: won.b,
    carriedBonus: carriedBonus(state, "a"),
    round: currentRoundNumber(state),
    team: state.teams.a,
    previousLevel: previousLevel(state),
  };
  const options = availableCharacters(state, "a");
  const value = (c: Character) => scorePlay(c, threat, context).total;
  const best = Math.max(...options.map(value));
  return pickOne(rng, options.filter((c) => value(c) === best)).id;
}

// A good team for a mission already played once: the player knows its threats, and its
// value is the best total it can make on them, one character per threat (abilities only,
// powers and modifiers left out).
const PERMUTATIONS = (function permute(items: number[]): number[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, i) => permute([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]));
})([0, 1, 2, 3, 4]);
function teamValue(team: Card[], missionThreats: Threat[]): number {
  const scores = team.map((c) => missionThreats.map((t) => t.abilities.reduce((s, a) => s + (c.stats[a] ?? 0), 0)));
  return Math.max(...PERMUTATIONS.map((order) => order.reduce((sum, character, round) => sum + scores[character][round], 0)));
}
const GOOD_DRAWS = 40;

type Measure = { win: number; flawless: number; pool: number };

function play(mission: Mission, pool: Card[], good: boolean, matches: number): Measure {
  const rng = mulberry32(seed);
  const bot = mission.bot.map((code) => {
    const card = byCode.get(code);
    if (!card) throw new Error(`unknown card ${code}`);
    return toCharacter(card);
  });
  const missionThreats = mission.threats.map((code, i) => {
    const threat = threatByCode.get(code);
    if (!threat) throw new Error(`unknown threat ${code}`);
    // A threat of a place always keeps its rule (SPEC §5.11).
    return { ...threat, modifier: threat.modifier ?? mission.mods[i] ?? null };
  });
  if (pool.length < rules.teamSize) return { win: NaN, flawless: NaN, pool: pool.length };
  const draw = () => shuffle(rng, pool).slice(0, rules.teamSize);
  let wins = 0;
  let flawless = 0;
  for (let m = 0; m < matches; m++) {
    let cards = draw();
    if (good) {
      let best = teamValue(cards, missionThreats);
      for (let i = 1; i < GOOD_DRAWS; i++) {
        const other = draw();
        const value = teamValue(other, missionThreats);
        if (value > best) [cards, best] = [other, value];
      }
    }
    const team = cards.map((c, i) => ({ ...toCharacter(c), id: `p${i}` }));
    let state: MatchState = { rules, threats: missionThreats, teams: { a: team, b: bot }, rounds: [] };
    while (!isFinished(state)) {
      state = playBotRound({
        state,
        catalog: knowledge,
        difficulty: mission.difficulty,
        playerSide: "a",
        playerChoice: greedy(state, rng),
        rng,
      }).state;
    }
    if (matchResult(state) === "a") {
      wins += 1;
      if (roundsWon(state).b === 0) flawless += 1;
    }
  }
  return { win: wins / matches, flawless: flawless / matches, pool: pool.length };
}

const pct = (value: number) => (Number.isNaN(value) ? "  —  " : `${(100 * value).toFixed(1).padStart(5)}%`);
const MATCHES: Record<BotDifficulty, number> = {
  easy: baseMatches,
  medium: baseMatches,
  hard: Math.ceil(baseMatches * 0.6),
  super_pro: Math.ceil(baseMatches * 0.15),
};

for (const mission of data.missions) {
  if (onlyMissions && !onlyMissions.includes(mission.code)) continue;
  const started = Date.now();
  const n = MATCHES[mission.difficulty];
  const stars: StoryStarRules = {
    rarities: starOverrides[mission.code]?.rarities ?? mission.star_rarities ?? [],
    traits: starOverrides[mission.code]?.traits ?? mission.star_traits ?? [],
  };
  const parts: string[] = [];
  if (!only || only === "base") {
    const random = play(mission, fieldable, false, n);
    const good = play(mission, fieldable, true, n);
    parts.push(`vittoria ${pct(random.win)} · 3-0 casuale ${pct(random.flawless)} buona ${pct(good.flawless)}`);
  }
  if ((!only || only === "rarities") && stars.rarities.length > 0) {
    const pool = fieldable.filter((c) => fitsStarRarities(c, stars));
    const random = play(mission, pool, false, n);
    const good = play(mission, pool, true, n);
    parts.push(`rarità [${stars.rarities.join(",")}] (${pool.length}) casuale ${pct(random.win)} buona ${pct(good.win)}`);
  }
  if ((!only || only === "traits") && stars.traits.length > 0) {
    const pool = fieldable.filter((c) => fitsStarTraits(c, stars, categoryOf));
    const random = play(mission, pool, false, n);
    const good = play(mission, pool, true, n);
    parts.push(`tratti [${stars.traits.join(",")}] (${pool.length}) casuale ${pct(random.win)} buona ${pct(good.win)}`);
  }
  console.log(
    `${mission.code.padEnd(6)} ${mission.difficulty.padEnd(9)} n=${n}  ${parts.join("  |  ")}  (${((Date.now() - started) / 1000).toFixed(0)}s)`,
  );
}
