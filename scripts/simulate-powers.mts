// Measures what a power is worth in a classic match (docs/POWERS-BACKLOG.md,
// Bilanciamento): Hard bot against Hard bot, random teams, one or two drawn
// modifiers per match as on the server. Every match is played twice with the same
// teams and threats: once a "host" character of side a has the power, once it has
// none. The difference in matches won is what the power is worth.
//
// The catalog is a JSON dump { abilities, cards, threats }: abilities [{code, family}],
// cards [{code, faction, rank, stats, power_code, power_params, active}], threats
// [{code, level, abilities, region, modifier_code, modifier_params, rarity, active}].
//
// Usage: node scripts/simulate-powers.mts <catalog.json> --power sacrifice --params '{"bonus":2}'
//   [--host 4]        rarity rank of the host (4 = Alfa, for distinctive powers)
//   [--matches 6000]
//   [--round 1..5]    side a plays the host in that round (if the match gets there)
//   [--reverse]       one threat of level 5 or more becomes a Rovescio threat
//   [--no-bonus-after-win]  a proposal for Sacrificio: once the host has won its round,
//                     it counts as played without its power (its bonus never starts)
//   [--seed 1]

import { readFileSync } from "node:fs";
import {
  botView,
  chooseBotPlay,
  computeAbilityMeans,
  drawThreatLevels,
  isFinished,
  matchResult,
  mulberry32,
  pickOne,
  pickThreats,
  placeModifier,
  resolveRound,
  shuffle,
  type BotKnowledge,
  type Character,
  type MatchState,
  type Rng,
  type Side,
  type Threat,
  type ThreatModifier,
} from "../packages/game-engine/src/index.ts";
import { balance } from "../src/config/balance.ts";

type Row = Record<string, unknown>;
const args = process.argv.slice(2);
const file = args[0];
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
if (!file || !option("power")) throw new Error("Usage: node scripts/simulate-powers.mts <catalog.json> --power <code> [--params json]");
const powerCode = option("power")!;
const powerParams = JSON.parse(option("params") ?? "{}") as Record<string, number>;
const hostRank = Number(option("host") ?? 4);
const matches = Number(option("matches") ?? 6000);
const forcedRound = option("round") ? Number(option("round")) : null;
const withReverse = args.includes("--reverse");
const noBonusAfterWin = args.includes("--no-bonus-after-win");
const seed = Number(option("seed") ?? 1);

const data = JSON.parse(readFileSync(file, "utf8")) as { abilities: Row[]; cards: Row[]; threats: Row[] };
const characters: Character[] = data.cards
  .filter((c) => c.active !== false)
  .map((c) => ({
    id: String(c.code),
    definitionId: String(c.code),
    faction: String(c.faction),
    rarityRank: Number(c.rank),
    stats: c.stats as Record<string, number>,
    power: c.power_code ? { code: String(c.power_code), params: (c.power_params ?? {}) as Record<string, number> } : null,
  }));
const placeRules = { ...balance.places };
const threatCatalog: Threat[] = data.threats
  .filter((t) => t.active !== false && !t.rarity)
  .map((t) => ({
    id: String(t.code),
    level: Number(t.level),
    abilities: t.abilities as string[],
    modifier: placeModifier(t.modifier_code as string | null, t.modifier_params as Record<string, unknown>, placeRules),
  }));
const knowledge: BotKnowledge = {
  characters,
  threatCatalog,
  families: Object.fromEntries(data.abilities.map((r) => [String(r.code), String(r.family)])),
  abilityMeans: computeAbilityMeans(characters),
};
const rules = balance.match;
const reverseThreat = data.threats.find((t) => t.modifier_code === "reverse");

/** One or two drawn modifiers on the rounds without a place rule, as draw_threat_modifiers does. */
function drawModifiers(rng: Rng, threats: Threat[]): Threat[] {
  const m = balance.threatModifiers;
  const open = threats.map((t, i) => (t.modifier ? -1 : i)).filter((i) => i >= 0);
  const count = Math.min(open.length, m.minPerMatch + Math.floor(rng() * (m.maxPerMatch - m.minPerMatch + 1)));
  let codes = shuffle(rng, ["focus", "weak_link", "hostile_ground", "underdogs"]);
  const result = [...threats];
  for (const round of shuffle(rng, open).slice(0, count)) {
    const code = codes.find((c) => c !== "weak_link" || threats[round].level >= 2)!;
    codes = codes.filter((c) => c !== code);
    let modifier: ThreatModifier;
    if (code === "hostile_ground") {
      const [favored, hindered] = shuffle(rng, ["heroes", "villains", "neutrals"]);
      modifier = { code, favored, hindered, bonus: m.hostileBonus, malus: m.hostileMalus };
    } else if (code === "underdogs") {
      modifier = {
        code,
        commonMaxRank: m.underdogCommonMaxRank,
        eliteMinRank: m.underdogEliteMinRank,
        bonus: m.underdogBonus,
        malus: m.underdogMalus,
      };
    } else {
      modifier = { code } as ThreatModifier;
    }
    result[round] = { ...result[round], modifier };
  }
  return result;
}

type Outcome = { score: number; hostRound: number | null; hostWon: boolean | null; hostOnReverse: boolean };

function play(teams: Record<Side, Character[]>, threats: Threat[], hostId: string, rng: Rng): Outcome {
  let state: MatchState = { rules, threats, teams, rounds: [] };
  while (!isFinished(state)) {
    const round = state.rounds.length + 1;
    const choose = (side: Side) => {
      const view = botView(state, side, knowledge);
      if (side === "a" && forcedRound !== null) {
        if (round === forcedRound && view.available.some((c) => c.id === hostId)) return hostId;
        view.available = view.available.filter((c) => c.id !== hostId);
        if (view.available.length === 0) return hostId;
      }
      return chooseBotPlay("hard", view, rng);
    };
    const a = choose("a");
    const b = choose("b");
    state = resolveRound(state, { a: { characterId: a, autoPlayed: false }, b: { characterId: b, autoPlayed: false } }, knowledge.families).state;
    if (noBonusAfterWin && a === hostId && state.rounds.at(-1)!.winner === "a") {
      state = { ...state, teams: { ...state.teams, a: state.teams.a.map((c) => (c.id === hostId ? { ...c, power: null } : c)) } };
    }
  }
  const hostRecord = state.rounds.find((r) => r.plays.a.characterId === hostId);
  const result = matchResult(state);
  return {
    score: result === "a" ? 1 : result === "draw" ? 0.5 : 0,
    hostRound: hostRecord?.round ?? null,
    hostWon: hostRecord ? hostRecord.winner === "a" : null,
    hostOnReverse: Boolean(hostRecord && threats[hostRecord.round - 1].modifier?.code === "reverse"),
  };
}

const hosts = characters.filter((c) => c.rarityRank === hostRank);
const totals = { with: 0, without: 0 };
const roundsWith = new Map<number | null, { n: number; score: number; hostWon: number }>();
const onReverse = { n: 0, score: 0, hostWon: 0 };
for (let i = 0; i < matches; i++) {
  const rng = mulberry32(seed * 1_000_003 + i);
  const host = pickOne(rng, hosts);
  const others = shuffle(rng, characters.filter((c) => c.definitionId !== host.definitionId));
  const teamA = shuffle(rng, [host, ...others.slice(0, rules.teamSize - 1)]);
  const teamB = shuffle(rng, characters).slice(0, rules.teamSize).map((c) => ({ ...c, id: `b-${c.id}` }));
  let threats = drawModifiers(rng, pickThreats(rng, threatCatalog, drawThreatLevels(rng, rules)));
  if (withReverse && reverseThreat) {
    const slot = threats.findIndex((t) => t.level >= 5);
    threats[slot] = { id: String(reverseThreat.code), level: Number(reverseThreat.level), abilities: reverseThreat.abilities as string[], modifier: { code: "reverse" } };
  }
  threats = threats.map((t, r) => ({ ...t, id: `${t.id}#${r}` }));
  const botSeed = seed * 7_919 + i;
  const powered = { ...host, power: { code: powerCode, params: powerParams } };
  const plain = { ...host, power: null };
  const swap = (c: Character) => (c.id === host.id ? powered : c);
  const strip = (c: Character) => (c.id === host.id ? plain : c);
  const w = play({ a: teamA.map(swap), b: teamB }, threats, host.id, mulberry32(botSeed));
  const wo = play({ a: teamA.map(strip), b: teamB }, threats, host.id, mulberry32(botSeed));
  totals.with += w.score;
  totals.without += wo.score;
  const bucket = roundsWith.get(w.hostRound) ?? { n: 0, score: 0, hostWon: 0 };
  bucket.n += 1;
  bucket.score += w.score;
  if (w.hostWon) bucket.hostWon += 1;
  roundsWith.set(w.hostRound, bucket);
  if (w.hostOnReverse) {
    onReverse.n += 1;
    onReverse.score += w.score;
    if (w.hostWon) onReverse.hostWon += 1;
  }
}

const pct = (x: number, n = matches) => `${((100 * x) / n).toFixed(1)}%`;
console.log(
  JSON.stringify({ power: powerCode, params: powerParams, hostRank, matches, forcedRound, withReverse, noBonusAfterWin, seed }),
);
console.log(`with ${pct(totals.with)}  without ${pct(totals.without)}  diff ${((100 * (totals.with - totals.without)) / matches).toFixed(1)}`);
for (const [round, b] of [...roundsWith.entries()].sort((x, y) => (x[0] ?? 9) - (y[0] ?? 9))) {
  console.log(`  host in round ${round ?? "-"}: ${b.n} matches (${pct(b.n)}), won ${pct(b.score, b.n)}, host won its round ${pct(b.hostWon, b.n)}`);
}
if (withReverse) {
  console.log(`  host on the Rovescio round: ${onReverse.n} matches (${pct(onReverse.n)}), won ${pct(onReverse.score, onReverse.n)}, host won its round ${pct(onReverse.hostWon, onReverse.n)}`);
}
