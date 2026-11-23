// Simulates the Caccia grossa (SPEC §5.18) on a catalog dump: a team of players who agree on
// every card against a Boss, to tune the players' factor (the same Boss as hard in 2, 3 and 4),
// the Strength of each Magnitude and the Life of each Boss.
//
// The team: each player fields 6 characters from their own collection knowing only the levels
// of the 5 threats (the best 6 over those levels, by the mean score at each level). Every round
// they try every way of putting one card each on the threat and take the one worth most: the
// damage (capped at the Life left), a Defence lost counted as --defence points of damage, the
// win and the loss at once, minus --future times what the cards spent would make later.
//
// The Bosses: the six of scripts/raid-bosses.json (the same as the migration), with their
// district, repertoire, Life and Magnitude. Each hunt draws 5 threats of Nuova Megara with the
// level rules of §5.4, 2 of them from the Boss's district, and the Boss's moves.
//
// The dump: npx supabase db query --linked -f scripts/emergency-catalog.sql > emergency-raw.json
// Usage: node scripts/simulate-raid.mts <emergency-raw.json> [--runs 400] [--players 2,3,4]
//   [--profiles starter,buona,grande] [--seed 1] [--bosses B05,B01] [--forza 92,96,100,104,108]
//   [--factor 200,300,405] [--vita-factor 200,290,370] [--vita-base 14] [--targets 7,13,18,23,28,32] [--future 0.6] [--defence 8]
//   [--grid 80,90,100,110,120] [--plain]
//
// --grid: for each Boss and number of players, the wins at each Strength in the list (instead of
// the Magnitude's), to read the curve. --plain: the Bosses make no moves.

import { readFileSync } from "node:fs";
import {
  drawRaidMoves,
  isRaidFinished,
  mulberry32,
  pickOne,
  pickWeighted,
  raidContext,
  raidCurrentRound,
  raidDiscounts,
  raidHand,
  raidMoveCancelled,
  raidRegen,
  raidResult,
  raidVita,
  raidVitaMaxOf,
  raidDefenses,
  resolveRaidRound,
  scorePlay,
  shuffle,
  HOSTILE_RAID_MOVES,
  type Character,
  type RaidMove,
  type RaidPlacement,
  type RaidRules,
  type RaidState,
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
  threats: { id: string; code: string; level: number; abilities: string[]; active: boolean; region: string; rarity: string | null; district?: string | null }[];
  abilities: { code: string; family: string }[];
  config: Record<string, unknown>;
};
type Boss = { code: string; name: string; magnitude: number; district: string; moves: RaidMove[]; vita: number };

const args = process.argv.slice(2);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const flag = (name: string) => args.includes(`--${name}`);
const list = (text: string | undefined, fallback: number[]) => (text ? text.split(",").map(Number) : fallback);
const raw = JSON.parse(readFileSync(args[0], "utf8")) as { rows?: { data: Dump }[] } & Partial<Dump>;
const data: Dump = raw.rows ? raw.rows[0].data : (raw as Dump);
const runs = Number(option("runs") ?? 400);
const seed = Number(option("seed") ?? 1);
const playerCounts = list(option("players"), [2, 3, 4]);
const profiles = (option("profiles") ?? "starter,buona,grande").split(",");
const forzaByMagnitude = list(option("forza"), [92, 96, 100, 104, 108]);
const factors = list(option("factor"), [200, 300, 405]);
const vitaFactors = list(option("vita-factor"), [200, 290, 370]);
const futureWeight = Number(option("future") ?? 0.6);
const defenceWeight = Number(option("defence") ?? 8);
const grid = option("grid") ? list(option("grid"), []) : null;

const RULES: RaidRules = {
  rounds: 5,
  squadSize: 6,
  defenses: 3,
  targets: Object.fromEntries(list(option("targets"), [7, 13, 18, 23, 28, 32]).map((v, i) => [i + 1, v])),
  attackFactor: { 2: factors[0], 3: factors[1], 4: factors[2] },
  vitaFactor: { 2: vitaFactors[0], 3: vitaFactors[1], 4: vitaFactors[2] },
  vitaBase: Number(option("vita-base") ?? 14),
  heavyDefenses: 2,
  regenPercent: 10,
  exposedMax: 1,
  heavyMax: 2,
};

const ALL_BOSSES: Boss[] = JSON.parse(readFileSync(new URL("./raid-bosses.json", import.meta.url), "utf8"));
const bosses = option("bosses") ? ALL_BOSSES.filter((b) => option("bosses")!.split(",").includes(b.code)) : ALL_BOSSES;

const toCharacter = (c: Card): Character => ({
  id: c.id,
  definitionId: c.id,
  faction: c.faction,
  rarityRank: c.rank,
  stats: c.stats,
  power: c.power_code ? { code: c.power_code, params: c.power_params ?? {} } : null,
});
const fieldable = data.cards.filter((c) => c.active && c.unlock === null).map(toCharacter);
const families = Object.fromEntries(data.abilities.map((a) => [a.code, a.family]));
const megara: (Threat & { district: string | null })[] = data.threats
  .filter((t) => t.active && !t.rarity && t.region === "megara")
  .map((t) => ({ id: t.id, level: t.level, abilities: t.abilities, district: t.district ?? null }));

// What a character makes on average on a threat of each level: the players' sense of it.
const means = new Map<string, number[]>();
for (const c of fieldable) {
  const row = [0];
  for (let level = 1; level <= 6; level++) {
    const ofLevel = megara.filter((t) => t.level === level);
    const context = { families, roundsWon: 0, opponentRoundsWon: 0, carriedBonus: 0, round: 1, team: [c] };
    row.push(ofLevel.reduce((sum, t) => sum + scorePlay(c, t, context).total, 0) / ofLevel.length);
  }
  means.set(c.definitionId, row);
}
const meanFor = (c: Character, level: number) => means.get(c.definitionId)?.[Math.min(6, Math.max(1, level))] ?? 0;

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

/** Five threats with the level rules of §5.4, `fromDistrict` of them from the district when it can (raid_draw_threats). */
function drawThreats(rng: Rng, district: string, fromDistrict = 2): Threat[] {
  const local = megara.filter((t) => t.district === district);
  const ok = (ts: Threat[]) => {
    const levels = ts.map((t) => t.level);
    const sum = levels.reduce((a, b) => a + b, 0);
    return Math.min(...levels) <= 2 && Math.max(...levels) >= 5 && sum >= 14 && sum <= 20;
  };
  for (let attempt = 0; attempt < 400; attempt++) {
    const take = attempt < 200 ? Math.min(fromDistrict, local.length) : 0;
    const first = shuffle(rng, local).slice(0, take);
    const rest = shuffle(rng, megara.filter((t) => !first.includes(t))).slice(0, 5 - take);
    const picked = [...first, ...rest];
    if (ok(picked)) return shuffle(rng, picked);
  }
  throw new Error(`No draw for ${district}`);
}

/** The squad of a collection for the hunt's levels: card by card, the one that adds most to the best and second best at every level. */
function fieldSquad(collection: readonly Character[], levels: readonly number[]): Character[] {
  const sum = (c: Character) => levels.reduce((total, level) => total + meanFor(c, level), 0);
  const candidates = [...collection].sort((a, b) => sum(b) - sum(a)).slice(0, 60);
  const cover = (squad: readonly Character[]) =>
    levels.reduce((total, level) => {
      const [first = 0, second = 0] = squad.map((c) => meanFor(c, level)).sort((a, b) => b - a);
      return total + first + 0.5 * second;
    }, 0);
  const squad: Character[] = [];
  while (squad.length < RULES.squadSize && squad.length < candidates.length) {
    let best: Character | null = null;
    let bestValue = -Infinity;
    for (const c of candidates) {
      if (squad.includes(c)) continue;
      const value = cover([...squad, c]) + 0.01 * sum(c);
      if (value > bestValue) [best, bestValue] = [c, value];
    }
    squad.push(best!);
  }
  return squad;
}

/** Every way of choosing one item from each list. */
function* product<T>(lists: readonly T[][], prefix: T[] = []): Generator<T[]> {
  if (prefix.length === lists.length) {
    yield prefix;
    return;
  }
  for (const item of lists[prefix.length]) yield* product(lists, [...prefix, item]);
}

/** The team's choice: every combination of one card each, scored fast (the engine resolves the one chosen). */
function teamChoice(state: RaidState): Record<string, RaidPlacement> {
  const round = raidCurrentRound(state)!;
  const later = state.threats.slice(round.round);
  const hands = state.players.map((p) => raidHand(state, p.id));
  const scores = state.players.map((p, i) => {
    const context = raidContext(state, p.id, families);
    return new Map(hands[i].map((c) => [c.id, scorePlay(c, round.threat, context).total]));
  });
  const future = (c: Character) => (later.length ? later.reduce((sum, t) => sum + meanFor(c, t.level), 0) / later.length : 0);
  const vita = raidVita(state);
  const defenses = raidDefenses(state);
  const vitaMax = raidVitaMaxOf(state);
  const standing = { roundsWon: state.records.filter((r) => r.held).length, opponentRoundsWon: state.records.filter((r) => !r.held).length };
  const move = (code: RaidMove, cancelled: boolean) => round.move === code && !(cancelled && HOSTILE_RAID_MOVES.includes(code));
  let best: Character[] | null = null;
  let bestValue = -Infinity;
  for (const cards of product(hands)) {
    const cancelled = raidMoveCancelled(round.move, cards);
    const values = cards.map((c, i) => scores[i].get(c.id)!);
    if (move("target", cancelled)) {
      const top = values.indexOf(Math.max(...values));
      values[top] = Math.floor(values[top] / 2);
    }
    const total = values.reduce((a, b) => a + b, 0);
    const { sabotage, relentless } = raidDiscounts(cards, round.threat, standing);
    const effective = Math.max(0, round.attack - sabotage);
    const held = total >= Math.max(0, effective - relentless);
    let damage = held ? Math.max(0, total - effective) : 0;
    if (move("armor", cancelled)) damage = Math.floor(damage / 2);
    if (move("exposed", cancelled)) damage *= 2;
    const lost = held ? 0 : move("heavy", cancelled) ? RULES.heavyDefenses : 1;
    const healed = move("regen", cancelled) && damage === 0 ? Math.min(raidRegen(RULES, vitaMax), vitaMax - vita) : 0;
    let value: number;
    if (damage >= vita) value = 1e6;
    else if (lost >= defenses) value = -1e6;
    else value = damage - healed - defenceWeight * lost - futureWeight * cards.reduce((sum, c) => sum + future(c), 0);
    // The last round: only the win counts.
    if (later.length === 0 && damage < vita) value = damage - 1000;
    if (value > bestValue) [best, bestValue] = [cards, value];
  }
  return Object.fromEntries(state.players.map((p, i) => [p.id, { characterId: best![i].id, autoPlayed: false }]));
}

type Outcome = { won: boolean; rounds: number; vitaLeft: number; defensesLost: number; byDefences: boolean; damage: number };

function hunt(rng: Rng, boss: Boss, players: number, profile: string, forza: number): Outcome {
  const threats = drawThreats(rng, boss.district);
  const levels = threats.map((t) => t.level);
  let state: RaidState = {
    rules: RULES,
    boss: { forzaPercent: forza, vitaPercent: boss.vita },
    players: Array.from({ length: players }, (_, p) => {
      const squad = fieldSquad(collectionFor(rng, profile), levels);
      // Each copy is its own card: two players may field the same character.
      return { id: `p${p}`, squad: squad.map((c) => ({ ...c, id: `p${p}:${c.id}` })) };
    }),
    threats,
    moves: flag("plain") ? ["plain", "plain", "plain", "plain", "plain"] : drawRaidMoves(rng, boss.moves, RULES.rounds, RULES),
    records: [],
  };
  const vitaMax = raidVitaMaxOf(state);
  while (!isRaidFinished(state)) state = resolveRaidRound(state, teamChoice(state), families).state;
  return {
    won: raidResult(state) === "won",
    rounds: state.records.length,
    vitaLeft: raidVita(state) / vitaMax,
    defensesLost: RULES.defenses - raidDefenses(state),
    byDefences: raidDefenses(state) <= 0,
    damage: state.records.reduce((sum, r) => sum + r.damage - r.healed, 0),
  };
}

const pct = (n: number) => `${(100 * n).toFixed(1).padStart(5)}%`;
console.log(
  `${fieldable.length} personaggi, ${megara.length} Minacce di Nuova Megara; ${runs} cacce per caso. ` +
    `Soglie ${Object.values(RULES.targets).join("/")}, Attacco ${factors.join("/")}, Vita ${vitaFactors.join("/")}, Vita base ${RULES.vitaBase}, ` +
    `Forza ${forzaByMagnitude.join("/")}, future ${futureWeight}, difesa ${defenceWeight}${flag("plain") ? ", senza mosse" : ""}`,
);

for (const boss of bosses) {
  if (grid) {
    for (const players of playerCounts) {
      const cells = grid.map((forza) => {
        const rng = mulberry32(seed);
        const results = Array.from({ length: runs }, () => hunt(rng, boss, players, profiles[0], forza));
        return `${forza}: ${pct(results.filter((o) => o.won).length / runs)}`;
      });
      console.log(`${boss.code} M${boss.magnitude} ${boss.name.padEnd(24)} ${players}g ${profiles[0]}: ${cells.join("  ")}`);
    }
    continue;
  }
  const forza = forzaByMagnitude[boss.magnitude - 1];
  const rows = [`${boss.code} · ${boss.name} · Magnitudo ${boss.magnitude} (Forza ${forza}, Vita ${boss.vita}%, mosse ${boss.moves.join(", ")})`];
  for (const players of playerCounts) {
    const cells: string[] = [];
    for (const profile of profiles) {
      const rng = mulberry32(seed);
      const results = Array.from({ length: runs }, () => hunt(rng, boss, players, profile, forza));
      const share = (f: (o: Outcome) => boolean) => results.filter(f).length / runs;
      const mean = (f: (o: Outcome) => number) => results.reduce((sum, o) => sum + f(o), 0) / runs;
      cells.push(
        `${profile} ${pct(share((o) => o.won))} (Difese ${pct(share((o) => o.byDefences))}, round ${mean((o) => o.rounds).toFixed(1)}, ` +
          `Vita rimasta ${pct(mean((o) => o.vitaLeft))}, danni ${mean((o) => o.damage).toFixed(1)}, Difese perse ${mean((o) => o.defensesLost).toFixed(2)})`,
      );
    }
    rows.push(`  ${players} giocatori: ${cells.join("  ")}`);
  }
  console.log(rows.join("\n"));
}
