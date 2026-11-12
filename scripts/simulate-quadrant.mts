// Simulates Quadrante matches between the bots on a catalog dump, to re-check the
// balance of the mode (SPEC §5.14) after a change to the catalog or the rules.
// The dump is a JSON file { cards, abilities } with the rows of card_definitions
// (stats, rank, active) and ability_definitions (code).
// Usage: node scripts/simulate-quadrant.mts <catalog.json> [matches=400]

import { readFileSync } from "node:fs";
import {
  chooseQuadrantBotPlacement,
  drawQuadrantAbilities,
  isQuadrantFinished,
  mulberry32,
  playQuadrantMove,
  quadrantBoard,
  quadrantControlled,
  quadrantSealsOnBoard,
  quadrantBotView,
  quadrantHand,
  quadrantLegalCells,
  quadrantSideToMove,
  shuffle,
  type BotDifficulty,
  type Character,
  type MatchResult,
  type QuadrantRules,
  type QuadrantState,
  type QuadrantVariant,
  type Rng,
  type Side,
} from "../packages/game-engine/src/index.ts";
import { balance } from "../src/config/balance.ts";

type Row = Record<string, unknown>;
const [file, count] = process.argv.slice(2);
if (!file) throw new Error("Usage: node scripts/simulate-quadrant.mts <catalog.json> [matches]");
const data = JSON.parse(readFileSync(file, "utf8")) as { cards: Row[]; abilities: Row[] };
const N = Number(count ?? 400);

const characters: Character[] = data.cards
  .filter((d) => d.active !== false)
  .map((d) => ({
    id: String(d.id),
    definitionId: String(d.id),
    faction: String(d.faction),
    rarityRank: Number(d.rank),
    stats: d.stats as Record<string, number>,
    power: null,
  }));
const abilityCodes = data.abilities.map((a) => String(a.code));
const knowledge = { characters };
const BASE: QuadrantRules = { ...balance.quadrant };

type Player = BotDifficulty | "random";

function deckOf(rng: Rng, pool: Character[], size = BASE.deckSize): Character[] {
  return shuffle(rng, pool).slice(0, size);
}

function play(
  rng: Rng,
  decks: Record<Side, Character[]>,
  players: Record<Side, Player>,
  variant: QuadrantVariant,
  rules: QuadrantRules,
  first: Side,
) {
  let state: QuadrantState = {
    rules,
    variant,
    abilities: drawQuadrantAbilities(rng, abilityCodes),
    first,
    decks: { a: shuffle(rng, decks.a), b: shuffle(rng, decks.b) },
    moves: [],
  };
  let shortOfSeals = false;
  while (!isQuadrantFinished(state)) {
    const side = quadrantSideToMove(state)!;
    const player = players[side];
    let placement;
    if (player === "random") {
      const cell = quadrantLegalCells(quadrantBoard(state), variant, rules.size);
      const c = cell[Math.floor(rng() * cell.length)];
      const hand = quadrantHand(state, side);
      placement = { characterId: hand[Math.floor(rng() * hand.length)].id, x: c.x, y: c.y, rotation: Math.floor(rng() * 4) };
    } else {
      placement = chooseQuadrantBotPlacement(quadrantBotView(state, side, knowledge), player, rng);
    }
    const played = playQuadrantMove({ state, placement, rng });
    if (played.move.placed < played.move.beaten * 2 + (played.move.move === 1 ? rules.firstPlayerSeals : 0)) shortOfSeals = true;
    state = played.state;
  }
  const board = quadrantBoard(state);
  const seals = quadrantSealsOnBoard(board);
  const controlled = quadrantControlled(board);
  const result = played(state, board);
  return {
    result,
    seals,
    tie: seals.a === seals.b,
    tieByControl: seals.a === seals.b && controlled.a !== controlled.b,
    shortOfSeals,
  };
}

function played(state: QuadrantState, board: ReturnType<typeof quadrantBoard>): MatchResult {
  const seals = quadrantSealsOnBoard(board);
  if (seals.a !== seals.b) return seals.a > seals.b ? "a" : "b";
  const controlled = quadrantControlled(board);
  if (controlled.a !== controlled.b) return controlled.a > controlled.b ? "a" : "b";
  return state.first === "a" ? "b" : "a";
}

function run(
  label: string,
  options: {
    players: Record<Side, Player>;
    poolA?: Character[];
    poolB?: Character[];
    sameDeck?: boolean;
    variant?: QuadrantVariant;
    rules?: Partial<QuadrantRules>;
    /** Who opens: "a", "b" or alternate. */
    first?: Side | "alternate";
    matches?: number;
  },
) {
  const rng = mulberry32(label.length * 7919 + 17);
  const matches = options.matches ?? N;
  const rules = { ...BASE, ...options.rules };
  let winsA = 0;
  let firstWins = 0;
  let ties = 0;
  let tiesControl = 0;
  let short = 0;
  let sealsA = 0;
  let sealsB = 0;
  for (let i = 0; i < matches; i++) {
    const deckA = deckOf(rng, options.poolA ?? characters);
    const deckB = options.sameDeck ? deckA : deckOf(rng, options.poolB ?? characters);
    const first: Side = options.first === "alternate" || options.first === undefined ? (i % 2 ? "b" : "a") : options.first;
    const outcome = play(rng, { a: deckA, b: deckB }, options.players, options.variant ?? "fixed", rules, first);
    if (outcome.result === "a") winsA++;
    if (outcome.result === first) firstWins++;
    if (outcome.tie) ties++;
    if (outcome.tieByControl) tiesControl++;
    if (outcome.shortOfSeals) short++;
    sealsA += outcome.seals.a;
    sealsB += outcome.seals.b;
  }
  const pct = (n: number) => `${((100 * n) / matches).toFixed(1)}%`;
  console.log(
    `${label.padEnd(58)} A ${pct(winsA).padStart(6)}  chi apre ${pct(firstWins).padStart(6)}  parità ${pct(ties).padStart(5)} (controllo ${pct(tiesControl)})  sigilli finiti ${pct(short).padStart(5)}  sigilli medi ${(sealsA / matches).toFixed(1)}-${(sealsB / matches).toFixed(1)}`,
  );
}

const byRank = (ranks: number[]) => characters.filter((c) => ranks.includes(c.rarityRank));
const delta = byRank([1]);
const gamma = byRank([2]);
const beta = byRank([3]);
const elite = byRank([4, 5]);
const mm = { a: "medium", b: "medium" } as const;

console.log(`Catalogo: ${characters.length} personaggi (Delta ${delta.length}, Gamma ${gamma.length}, Beta ${beta.length}, Alfa+Omega ${elite.length}); ${N} partite per riga\n`);

for (const variant of ["fixed", "shifting"] as const) {
  console.log(`--- Griglia ${variant === "fixed" ? "fissa" : "mobile"} ---`);
  for (const bonus of [0, 2, 3, 4]) {
    run(`Medio vs Medio, mazzi casuali, +${bonus} sigilli a chi apre`, { players: mm, variant, rules: { firstPlayerSeals: bonus } });
  }
  run("Medio vs Medio, stesso mazzo", { players: mm, variant, sameDeck: true });
  run("Alfa+Omega (A) contro Delta, Medio vs Medio", { players: mm, variant, poolA: elite, poolB: delta });
  run("Gamma (A) contro Delta", { players: mm, variant, poolA: gamma, poolB: delta });
  run("Beta (A) contro Gamma", { players: mm, variant, poolA: beta, poolB: gamma });
  run("Stesso mazzo: Medio (A) contro mosse a caso", { players: { a: "medium", b: "random" }, variant, sameDeck: true });
  run("Medio (A) contro Facile", { players: { a: "medium", b: "easy" }, variant });
  run("Difficile (A) contro Medio", { players: { a: "hard", b: "medium" }, variant, matches: Math.min(N, 300) });
  run("Super Pro (A) contro Medio", { players: { a: "super_pro", b: "medium" }, variant, matches: Math.min(N, 200) });
  run("Delta Difficile (A) contro Alfa+Omega Medio", { players: { a: "hard", b: "medium" }, variant, poolA: delta, poolB: elite, matches: Math.min(N, 300) });
  console.log();
}
