// Simulates Grande Minaccia matches between the bots on a catalog dump, to re-check
// the balance of the mode (SPEC §5.12) after a change to the catalog or the rules.
// The dump is a JSON file { characters, threats, families, config } with the rows of
// card_definitions (+ rarity_rank), threat_definitions, ability_definitions, game_config.
// Usage: node scripts/simulate-boss.mts <catalog.json> [matches=400]

import { readFileSync } from "node:fs";
import {
  bossResult,
  bossBotView,
  chooseBossBotPlay,
  computeAbilityMeans,
  drawBossValues,
  drawThreatLevels,
  mulberry32,
  pickThreats,
  resolveBossTurn,
  shuffle,
  type BossRules,
  type BossState,
  type BotDifficulty,
  type BotKnowledge,
  type Character,
  type MatchRules,
  type Rng,
  type Threat,
} from "../packages/game-engine/src/index.ts";
import { balance } from "../src/config/balance.ts";

type Row = Record<string, unknown>;
const [file, count] = process.argv.slice(2);
if (!file) throw new Error("Usage: node scripts/simulate-boss.mts <catalog.json> [matches]");
const data = JSON.parse(readFileSync(file, "utf8")) as { characters: Row[]; threats: Row[]; families: Row[] };
const N = Number(count ?? 400);

const characters: Character[] = data.characters.map((d) => ({
  id: String(d.id),
  definitionId: String(d.id),
  faction: String(d.faction),
  rarityRank: Number(d.rarity_rank),
  stats: d.stats as Record<string, number>,
  power: d.power_code ? { code: String(d.power_code), params: (d.power_params ?? {}) as Record<string, number> } : null,
}));
const megara: Threat[] = data.threats
  .filter((t) => t.region === "megara")
  .map((t) => ({ id: String(t.id), level: Number(t.level), abilities: t.required_abilities as string[] }));
const knowledge: BotKnowledge = {
  characters,
  threatCatalog: megara,
  families: Object.fromEntries(data.families.map((r) => [String(r.code), String(r.family)])),
  abilityMeans: computeAbilityMeans(characters),
};

const b = balance.boss;
const rules: BossRules = {
  turns: b.turns,
  fronts: b.fronts,
  hotFronts: b.hotFronts,
  hotValue: b.hotValue,
  hotGrowth: b.hotGrowth,
  baseValue: b.baseValue,
};
const matchRules = { threatsPerMatch: b.fronts, threatLevels: balance.match.threatLevels } as MatchRules;

let slowest = 0;
function match(rng: Rng, teamA: Character[], teamB: Character[], botA: BotDifficulty, botB: BotDifficulty): number {
  let state: BossState = {
    rules,
    fronts: pickThreats(rng, megara, drawThreatLevels(rng, matchRules)),
    values: drawBossValues(rng, rules),
    teams: { a: teamA, b: teamB.map((c) => ({ ...c, id: `${c.id}#b` })) },
    turns: [],
  };
  while (state.turns.length < rules.turns) {
    const started = performance.now();
    const a = chooseBossBotPlay(botA, bossBotView(state, "a", knowledge), rng);
    const choiceB = chooseBossBotPlay(botB, bossBotView(state, "b", knowledge), rng);
    slowest = Math.max(slowest, performance.now() - started);
    state = resolveBossTurn(state, { a, b: choiceB }, knowledge.families).state;
  }
  const result = bossResult(state);
  return result === "a" ? 1 : result === "draw" ? 0.5 : 0;
}

function run(label: string, n: number, teams: (rng: Rng) => [Character[], Character[]], a: BotDifficulty, bot: BotDifficulty) {
  const rng = mulberry32(4242);
  let score = 0;
  for (let i = 0; i < n; i++) score += match(rng, ...teams(rng), a, bot);
  const p = score / n;
  console.log(`${label}: ${(p * 100).toFixed(1)}% ±${(196 * Math.sqrt((p * (1 - p)) / n)).toFixed(1)}`);
}

const pick = (rng: Rng, pool: Character[]) => shuffle(rng, pool).slice(0, 5);
const same = (rng: Rng): [Character[], Character[]] => {
  const team = pick(rng, characters);
  return [team, team];
};
const byRank = (ranks: number[]) => characters.filter((c) => ranks.includes(c.rarityRank));

console.log(`${characters.length} characters, ${megara.length} threats of Nuova Megara, ${N} matches per line`);
const random = (rng: Rng): [Character[], Character[]] => [pick(rng, characters), pick(rng, characters)];
run("Medio vs Facile (squadre casuali)", N, random, "medium", "easy");
run("Difficile vs Medio (squadre casuali)", Math.ceil(N / 2), random, "hard", "medium");
run("Super Pro vs Medio (squadre casuali)", Math.ceil(N / 4), random, "super_pro", "medium");
run("Super Pro vs Difficile (squadre casuali)", Math.ceil(N / 4), random, "super_pro", "hard");
run("Difficile vs Medio (stessa squadra)", Math.ceil(N / 2), same, "hard", "medium");
run("Alfa+Omega vs Delta (Medio)", N, (rng) => [pick(rng, byRank([4, 5])), pick(rng, byRank([1]))], "medium", "medium");
run("Gamma vs Delta (Medio)", N, (rng) => [pick(rng, byRank([2])), pick(rng, byRank([1]))], "medium", "medium");
console.log(`slowest turn of both bots: ${slowest.toFixed(0)} ms`);
