// Simulates the Operazioni (SPEC §5.17) on a catalog dump: a team of players who agree
// on every move against the rival Reggente of the engine, to tune the targets, the Panic
// and the Boss's fronts.
//
// The team: each player fields 6 characters from their own collection, knowing the levels
// of the whole operation (the best 6 over those levels). Every round they try every way of
// putting one card each on the threats (two on the Boss) and take the one that saves the
// most Panic (breaks the most fronts), spending the cards that matter least for the levels
// still to come. They do not know the rival's Eco: they reckon it at the threat's target.
//
// The operations: random ones by default (every city round one threat of level 1-2, one of
// 3-4, one of 5-6, then more at random; the Boss likewise), or the chapter written in the
// database seed with --authored.
//
// The dump: npx supabase db query --linked -f scripts/emergency-catalog.sql > emergency-raw.json
// Usage: node scripts/simulate-coop.mts <emergency-raw.json> [--runs 2000] [--players 2,3,4]
//   [--profiles starter,buona,grande,tutto] [--seed 1] [--panic 12] [--panic-crowd 10] [--targets 7,13,18,23,28,32]
//   [--boss 9,15,20,25,30,34] [--squad 6] [--authored]

import { readFileSync } from "node:fs";
import {
  coopBrokenFronts,
  coopCurrentRound,
  coopHand,
  coopPanic,
  coopResult,
  cutCoopRounds,
  isCoopFinished,
  mulberry32,
  pickOne,
  pickWeighted,
  playCoopRound,
  previewCoopPlay,
  requiredScore,
  scorePlay,
  shuffle,
  type Character,
  type CoopCardPlacement,
  type CoopRules,
  type CoopState,
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
  threats: { id: string; code: string; level: number; abilities: string[]; active: boolean; region: string; rarity: string | null }[];
  abilities: { code: string; family: string }[];
  config: Record<string, unknown>;
};

const args = process.argv.slice(2);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const flag = (name: string) => args.includes(`--${name}`);
const raw = JSON.parse(readFileSync(args[0], "utf8")) as { rows?: { data: Dump }[] } & Partial<Dump>;
const data: Dump = raw.rows ? raw.rows[0].data : (raw as Dump);
const runs = Number(option("runs") ?? 2000);
const seed = Number(option("seed") ?? 1);
const playerCounts = (option("players") ?? "2").split(",").map(Number);
const profiles = (option("profiles") ?? "starter,buona,grande,tutto").split(",");
const levels = (text: string | undefined, fallback: number[]) =>
  Object.fromEntries((text ? text.split(",").map(Number) : fallback).map((value, i) => [i + 1, value]));

const cfg = (key: string) => Number(data.config[key]);
const RULES: CoopRules = {
  cityRounds: 4,
  squadSize: Number(option("squad") ?? 6),
  bossCards: 2,
  targets: levels(option("targets"), [1, 2, 3, 4, 5, 6].map((l) => cfg(`emergency.targets.level${l}`))),
  bossTargets: levels(option("boss"), [1, 2, 3, 4, 5, 6].map((l) => cfg(`emergency.targets.level${l}`) + 2)),
  panicLimit: Number(option("panic") ?? 12),
  panicLow: 1,
  panicHigh: 2,
  panicHighFromLevel: 4,
  panicReinforced: Number(option("panic-reinforced") ?? 1),
};

/** The Panic limit of a room: --panic in two, --panic-crowd from three players on (coop_panic_limit). */
const panicLimitFor = (players: number) => (players > 2 && option("panic-crowd") ? Number(option("panic-crowd")) : RULES.panicLimit);

const toCharacter = (c: Card): Character => ({
  id: c.id,
  definitionId: c.id,
  faction: c.faction,
  rarityRank: c.rank,
  stats: c.stats,
  power: c.power_code ? { code: c.power_code, params: c.power_params ?? {} } : null,
});
const fieldable = data.cards.filter((c) => c.active && c.unlock === null).map(toCharacter);
const byCode = new Map(data.cards.map((c) => [c.code, toCharacter(c)]));
const families = Object.fromEntries(data.abilities.map((a) => [a.code, a.family]));
const megara: (Threat & { code: string })[] = data.threats
  .filter((t) => t.active && !t.rarity && t.region === "megara")
  .map((t) => ({ id: t.id, code: t.code, level: t.level, abilities: t.abilities }));
const threatByCode = new Map(megara.map((t) => [t.code, t]));

// How often a character stops a threat of each level on its own: the players' sense of it.
const rates = new Map<string, number[]>();
for (const c of fieldable) {
  const row = [0];
  for (let level = 1; level <= 6; level++) {
    const ofLevel = megara.filter((t) => t.level === level);
    const context = { families, roundsWon: 0, opponentRoundsWon: 0, carriedBonus: 0, round: 1, team: [c] };
    row.push(ofLevel.filter((t) => scorePlay(c, t, context).total >= requiredScore(c, t, RULES)).length / ofLevel.length);
  }
  rates.set(c.id, row);
}
const rateFor = (c: Character, level: number) => rates.get(c.id)?.[Math.min(6, Math.max(1, level))] ?? 0;

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

type Written = { threats: Threat[]; reinforced: number }[];

/** Five threats a round: one of level 1-2, one of 3-4, one of 5-6 first (in random order), then two more. */
function randomOperation(rng: Rng): Written {
  return Array.from({ length: RULES.cityRounds + 1 }, () => {
    const pick = (min: number, max: number, not: Set<string>) =>
      pickOne(rng, megara.filter((t) => t.level >= min && t.level <= max && !not.has(t.id)));
    const used = new Set<string>();
    const first = [pick(1, 2, used), pick(3, 4, used), pick(5, 6, used)];
    first.forEach((t) => used.add(t.id));
    const extra = [pick(1, 6, used)];
    used.add(extra[0].id);
    extra.push(pick(1, 6, used));
    return { threats: [...shuffle(rng, first), ...extra], reinforced: Math.floor(rng() * 3) };
  });
}

/** The chapter of the seed (supabase/migrations/…_operations.sql): threat codes per round, the reinforced slot, the rival. */
const AUTHORED: { code: string; rounds: [string[], number][]; rival: string[] }[] = JSON.parse(
  readFileSync(new URL("./coop-operations.json", import.meta.url), "utf8"),
);

/**
 * The squad of a collection for the operation's levels, as its player would field it: card by
 * card, the one that adds most to the two best chances at every level seen (a threat often
 * gets two cards), so that every level has someone, specialists for the small ones included.
 */
function fieldSquad(collection: readonly Character[], written: Written, players: number): Character[] {
  const levelsSeen = written.flatMap((round) => round.threats.slice(0, players + 1).map((t) => t.level));
  const sum = (c: Character) => levelsSeen.reduce((total, level) => total + rateFor(c, level), 0);
  const candidates = [...collection].sort((a, b) => sum(b) - sum(a)).slice(0, 60);
  const cover = (squad: readonly Character[]) =>
    levelsSeen.reduce((total, level) => {
      const [first = 0, second = 0] = squad.map((c) => rateFor(c, level)).sort((a, b) => b - a);
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

const strength = (c: Character) => Object.values(c.stats).reduce((sum, v) => sum + v * v, 0);
const strongest = [...fieldable].sort((a, b) => strength(b) - strength(a)).slice(0, Math.ceil(fieldable.length * 0.4));
const guesses = new Map<string, number>();
/** What the team expects of the rival's Eco on a threat: what a strong character usually scores there. */
function ecoGuess(threat: Threat): number {
  if (!guesses.has(threat.id)) {
    const context = { families, roundsWon: 0, opponentRoundsWon: 0, carriedBonus: 0, round: 1, team: [] };
    const scores = strongest.map((c) => scorePlay(c, threat, { ...context, team: [c] }).total);
    guesses.set(threat.id, Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length));
  }
  return guesses.get(threat.id)!;
}

/** The team's choice for the round: the placements that save the most, reckoning each Eco at what a strong character scores. */
function teamChoice(state: CoopState): Record<string, CoopCardPlacement[]> {
  const round = coopCurrentRound(state)!;
  const laterLevels = state.rounds.slice(round.round).flatMap((r) => r.threats.map((t) => t.level));
  const worth = (c: Character) => laterLevels.reduce((sum, level) => sum + rateFor(c, level), 0) / Math.max(1, laterLevels.length);
  const preview = new Map<string, ReturnType<typeof previewCoopPlay>>();
  const previewOf = (player: string, c: Character, slot: number) => {
    const key = `${c.id}:${slot}`;
    if (!preview.has(key)) preview.set(key, previewCoopPlay(state, player, c, slot, families));
    return preview.get(key)!;
  };
  // Each player's options: one card (two on the Boss) and where.
  const options = state.players.map((player) => {
    const hand = coopHand(state, player.id);
    const singles = hand.flatMap((c) => round.threats.map((_, slot) => [{ characterId: c.id, slot }]));
    if (!round.boss) return singles;
    const pairs: CoopCardPlacement[][] = [];
    for (let i = 0; i < hand.length; i++) {
      for (let j = i + 1; j < hand.length; j++) {
        for (let s = 0; s < round.threats.length; s++) {
          for (let t = 0; t < round.threats.length; t++) pairs.push([{ characterId: hand[i].id, slot: s }, { characterId: hand[j].id, slot: t }]);
        }
      }
    }
    return pairs;
  });
  const evaluate = (choice: CoopCardPlacement[][]) => {
    let value = 0;
    round.threats.forEach((threat, slot) => {
      const here = choice.flatMap((cards, p) =>
        cards.filter((c) => c.slot === slot).map((c) => ({ p, c: state.players[p].squad.find((x) => x.id === c.characterId)! })),
      );
      if (here.length === 0) return;
      const scores = here.map(({ p, c }) => previewOf(state.players[p].id, c, slot));
      const lead = scores.reduce((best, s, i) => (s.score.total > scores[best].score.total ? i : best), 0);
      const total = scores[lead].score.total + scores.reduce((sum, s, i) => (i === lead ? sum : sum + s.score.highest), 0);
      const need = scores[lead].required ?? ecoGuess(threat);
      const saved = round.boss ? 1 : (threat.level >= RULES.panicHighFromLevel ? 2 : 1) + (slot === round.reinforced ? 1 : 0);
      if (total >= need) value += 100 * saved;
      for (const { c } of here) value -= 20 * worth(c);
    });
    return value;
  };
  let best: CoopCardPlacement[][] | null = null;
  let bestValue = -Infinity;
  const combos = options.reduce((n, o) => n * o.length, 1);
  if (combos <= 50_000) {
    for (const choice of product(options)) {
      const value = evaluate(choice);
      if (value > bestValue) [best, bestValue] = [choice, value];
    }
  } else {
    // Too many: each player in turn takes the best option given those before.
    const chosen: CoopCardPlacement[][] = [];
    for (let p = 0; p < options.length; p++) {
      let pick = options[p][0];
      let pickValue = -Infinity;
      for (const option of options[p]) {
        const value = evaluate([...chosen, option]);
        if (value > pickValue) [pick, pickValue] = [option, value];
      }
      chosen.push(pick);
    }
    best = chosen;
  }
  return Object.fromEntries(state.players.map((player, p) => [player.id, best![p]]));
}

type Outcome = { won: boolean; panicOut: boolean; panic: number; fronts: number; stopped: number; bySlot: boolean[][] };

function playOperation(rng: Rng, written: Written, rival: Character[], players: number, profile: string): Outcome {
  const state0: CoopState = {
    rules: { ...RULES, panicLimit: panicLimitFor(players) },
    players: Array.from({ length: players }, (_, p) => {
      const squad = fieldSquad(collectionFor(rng, profile), written, players);
      // Each copy is its own card: two players may field the same character.
      return { id: `p${p}`, squad: squad.map((c) => ({ ...c, id: `p${p}:${c.id}` })) };
    }),
    rival: rival.map((c, i) => ({ ...c, id: `e${i}:${c.id}` })),
    rounds: cutCoopRounds(written, players),
    records: [],
  };
  let state = state0;
  while (!isCoopFinished(state)) state = playCoopRound({ state, choices: teamChoice(state), families, rng }).state;
  const city = state.records.filter((r) => !state.rounds[r.round - 1].boss);
  return {
    won: coopResult(state) === "won",
    panicOut: coopPanic(state) >= state.rules.panicLimit,
    panic: coopPanic(state),
    fronts: coopBrokenFronts(state),
    stopped: city.reduce((sum, r) => sum + r.threats.filter((t) => t.stopped).length, 0) / Math.max(1, city.length),
    bySlot: state.records.map((r) => r.threats.map((t) => t.stopped)),
  };
}

/** A rival of the operation: its five Echi, or five at random among the 40% strongest (--rival any: among all). */
function randomRival(rng: Rng): Character[] {
  return shuffle(rng, option("rival") === "any" ? fieldable : strongest).slice(0, RULES.cityRounds + 1);
}

const pct = (n: number) => `${(100 * n).toFixed(1).padStart(5)}%`;
console.log(
  `${fieldable.length} personaggi, ${megara.length} Minacce di Nuova Megara; ${runs} operazioni per caso. ` +
    `Soglie ${Object.values(RULES.targets).join("/")}, Boss ${Object.values(RULES.bossTargets).join("/")}, Panico ${RULES.panicLimit}, squadra ${RULES.squadSize}`,
);
const operations = flag("authored")
  ? AUTHORED.map((op) => ({
      code: op.code,
      written: op.rounds.map(([codes, reinforced]) => ({
        threats: codes.map((code) => {
          const t = threatByCode.get(code);
          if (!t) throw new Error(`Unknown threat ${code}`);
          return t;
        }),
        reinforced,
      })),
      rival: op.rival.map((code) => {
        const c = byCode.get(code);
        if (!c) throw new Error(`Unknown character ${code}`);
        return c;
      }),
    }))
  : [{ code: "casuali", written: null, rival: null }];

for (const players of playerCounts) {
  for (const op of operations) {
    const row = [`${players} giocatori · ${op.code}`.padEnd(24)];
    for (const profile of profiles) {
      const rng = mulberry32(seed);
      const results = Array.from({ length: runs }, () =>
        playOperation(rng, op.written ?? randomOperation(rng), op.rival ?? randomRival(rng), players, profile),
      );
      const share = (f: (o: Outcome) => boolean) => results.filter(f).length / runs;
      const mean = (f: (o: Outcome) => number) => results.reduce((sum, o) => sum + f(o), 0) / runs;
      row.push(
        `${profile}: vinte ${pct(share((o) => o.won))} (Panico ${pct(share((o) => o.panicOut))}, Boss ${pct(share((o) => !o.won && !o.panicOut))}), ` +
          `Panico ${mean((o) => o.panic).toFixed(1)}, fermate/round ${mean((o) => o.stopped).toFixed(2)}, fronti ${mean((o) => o.fronts).toFixed(2)}`,
      );
      if (flag("detail") && op.written) {
        // How often each threat is stopped, round by round (* the rival's), among the operations that got there.
        for (let r = 0; r < op.written.length; r++) {
          const reached = results.filter((o) => o.bySlot.length > r);
          const cells = op.written[r].threats.slice(0, players + 1).map((t, slot) => {
            const code = (t as Threat & { code?: string }).code ?? t.id;
            const rate = reached.filter((o) => o.bySlot[r][slot]).length / Math.max(1, reached.length);
            return `${code}${slot === op.written![r].reinforced ? "*" : " "} ${pct(rate)}`;
          });
          row.push(`    round ${r + 1} (${reached.length}): ${cells.join("  ")}`);
        }
      }
    }
    console.log(row.join("\n  "));
  }
}
