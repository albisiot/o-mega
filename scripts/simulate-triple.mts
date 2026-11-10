// Simulates Allarme Triplo matches between the bots on a catalog dump, to re-check
// the balance of the mode (SPEC §5.13) after a change to the catalog or the rules.
// The dump is a JSON file { characters, threats, families } with the rows of
// card_definitions (+ rarity_rank), threat_definitions and ability_definitions.
// Usage: node scripts/simulate-triple.mts <catalog.json> [matches=400]

import { readFileSync } from "node:fs";
import {
  chooseTripleBotPlacement,
  computeAbilityMeans,
  drawTripleThreats,
  isTripleFinished,
  mulberry32,
  resolveTripleRound,
  shuffle,
  shuffleDeck,
  tripleBotView,
  tripleHand,
  triplePoints,
  tripleResult,
  type BotDifficulty,
  type BotKnowledge,
  type Character,
  type Rng,
  type Threat,
  type TriplePlacement,
  type TripleRules,
  type TripleState,
} from "../packages/game-engine/src/index.ts";
import { balance } from "../src/config/balance.ts";

type Row = Record<string, unknown>;
const [file, count] = process.argv.slice(2);
if (!file) throw new Error("Usage: node scripts/simulate-triple.mts <catalog.json> [matches]");
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
const rules: TripleRules = { ...balance.triple, classicRounds: balance.match.threatsPerMatch };
const DECK = rules.rounds * rules.threats;

/** "random": the hand placed at random; "oracle": knows the opponent's placement and answers it best. */
type Player = BotDifficulty | "random" | "oracle";

function bestAnswer(state: TripleState, side: "a" | "b", against: TriplePlacement): TriplePlacement {
  const hand = tripleHand(state, side);
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  let best: { placement: TriplePlacement; value: number } | null = null;
  for (const perm of perms) {
    const placement = { characterIds: perm.map((i) => hand[i].id), autoPlayed: false };
    const placements = side === "a" ? { a: placement, b: against } : { a: against, b: placement };
    const { round } = resolveTripleRound(state, placements, knowledge.families);
    const value = round.winners.filter((w) => w === side).length - round.winners.filter((w) => w && w !== side).length;
    if (!best || value > best.value) best = { placement, value };
  }
  return best!.placement;
}

let slowest = 0;
function choose(state: TripleState, side: "a" | "b", player: Player, rng: Rng): TriplePlacement {
  if (player === "random") return { characterIds: shuffle(rng, tripleHand(state, side)).map((c) => c.id), autoPlayed: false };
  if (player === "oracle") throw new Error("oracle answers, it never moves first");
  const started = performance.now();
  const placement = chooseTripleBotPlacement(player, tripleBotView(state, side, knowledge), rng);
  slowest = Math.max(slowest, performance.now() - started);
  return placement;
}

/** 1 = A wins, 0.5 = draw, 0 = B wins. */
function match(rng: Rng, deckA: Character[], deckB: Character[], a: Player, b: Player, threats?: Threat[], stats?: Stats): number {
  let state: TripleState = {
    rules,
    threats: threats ?? drawTripleThreats(rng, megara, rules),
    decks: { a: shuffleDeck(rng, deckA), b: shuffleDeck(rng, deckB).map((c) => ({ ...c, id: `${c.id}#b` })) },
    rounds: [],
  };
  while (!isTripleFinished(state)) {
    const pb = choose(state, "b", b, rng);
    const pa = a === "oracle" ? bestAnswer(state, "a", pb) : choose(state, "a", a, rng);
    state = resolveTripleRound(state, { a: pa, b: pb }, knowledge.families).state;
  }
  const result = tripleResult(state);
  if (stats) {
    const points = triplePoints(state);
    stats.draws += result === "draw" ? 1 : 0;
    stats.tiebreaks += points.a === points.b && result !== "draw" ? 1 : 0;
    stats.voids += state.rounds.flatMap((r) => r.winners).filter((w) => w === null).length;
    stats.margin += Math.abs(points.a - points.b);
    stats.matches += 1;
  }
  return result === "a" ? 1 : result === "draw" ? 0.5 : 0;
}

type Stats = { draws: number; tiebreaks: number; voids: number; margin: number; matches: number };

function run(label: string, n: number, decks: (rng: Rng) => [Character[], Character[]], a: Player, b: Player) {
  const rng = mulberry32(4242);
  let score = 0;
  for (let i = 0; i < n; i++) score += match(rng, ...decks(rng), a, b);
  const p = score / n;
  console.log(`${label}: ${(p * 100).toFixed(1)}% ±${(196 * Math.sqrt((p * (1 - p)) / n)).toFixed(1)}`);
}

const pick = (rng: Rng, pool: Character[], size = DECK) => shuffle(rng, pool).slice(0, size);
const random = (rng: Rng): [Character[], Character[]] => [pick(rng, characters), pick(rng, characters)];
const same = (rng: Rng): [Character[], Character[]] => {
  const deck = pick(rng, characters);
  return [deck, deck];
};
const byRank = (ranks: number[]) => characters.filter((c) => ranks.includes(c.rarityRank));
/** Decks of nine with `rare` cards of rank 4-5 and the rest Delta. */
const mixed = (rare: number) => (rng: Rng) => [...pick(rng, byRank([4, 5]), rare), ...pick(rng, byRank([1]), DECK - rare)];

console.log(`${characters.length} characters, ${megara.length} threats of Nuova Megara, ${N} matches per line`);
console.log(`Rarities: ${[1, 2, 3, 4, 5].map((r) => `${r}:${byRank([r]).length}`).join(" ")}`);

console.log("\n-- Bots (random decks)");
run("Medio vs Facile", N, random, "medium", "easy");
run("Difficile vs Medio", N, random, "hard", "medium");
run("Super Pro vs Medio", Math.ceil(N / 2), random, "super_pro", "medium");
run("Super Pro vs Difficile", Math.ceil(N / 2), random, "super_pro", "hard");

console.log("\n-- How much placing well matters (same deck on both sides)");
run("Medio vs a caso", N, same, "medium", "random");
run("Difficile vs Medio", N, same, "hard", "medium");
run("Chi vede le carte avversarie vs Medio", N, same, "oracle", "medium");

console.log("\n-- How much the deck matters (Medio vs Medio)");
run("Alfa+Omega vs Delta", N, (rng) => [pick(rng, byRank([4, 5])), pick(rng, byRank([1]))], "medium", "medium");
run("Gamma vs Delta", N, (rng) => [pick(rng, byRank([2])), pick(rng, byRank([1]))], "medium", "medium");
run("Beta vs Gamma", N, (rng) => [pick(rng, byRank([3])), pick(rng, byRank([2]))], "medium", "medium");
run("2 Alfa/Omega + 7 Delta vs 9 Delta", N, (rng) => [mixed(2)(rng), mixed(0)(rng)], "medium", "medium");
run("Delta giocato bene (Difficile) vs Alfa+Omega (Medio)", N, (rng) => [pick(rng, byRank([1])), pick(rng, byRank([4, 5]))], "hard", "medium");

// The luck of the draw: the same two decks and the same threats, only the shuffle changes.
console.log("\n-- The luck of the draw (same decks, same threats, 30 shuffles each)");
{
  const rng = mulberry32(77);
  const pairs = Math.ceil(N / 4);
  const shuffles = 30;
  let swing = 0;
  let decided = 0;
  const stats: Stats = { draws: 0, tiebreaks: 0, voids: 0, margin: 0, matches: 0 };
  for (let i = 0; i < pairs; i++) {
    const [deckA, deckB] = random(rng);
    const threats = drawTripleThreats(rng, megara, rules);
    let score = 0;
    for (let k = 0; k < shuffles; k++) score += match(rng, deckA, deckB, "medium", "medium", threats, stats);
    const p = score / shuffles;
    swing += Math.min(p, 1 - p);
    decided += p >= 0.9 || p <= 0.1 ? 1 : 0;
  }
  console.log(`decided by the decks whatever the shuffle (one side wins >= 90%): ${((100 * decided) / pairs).toFixed(0)}% of the pairs`);
  console.log(`matches the weaker side wins only thanks to the shuffle: ${((100 * swing) / pairs).toFixed(1)}% on average`);
  console.log(
    `draws ${((100 * stats.draws) / stats.matches).toFixed(1)}%, equal points settled by the scores ${((100 * stats.tiebreaks) / stats.matches).toFixed(1)}%, ` +
      `void contests ${(stats.voids / stats.matches).toFixed(2)} per match, average margin ${(stats.margin / stats.matches).toFixed(2)} points`,
  );
}
console.log(`\nslowest bot placement: ${slowest.toFixed(0)} ms`);
