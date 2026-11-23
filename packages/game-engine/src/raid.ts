// Caccia grossa (SPEC §5.18): a cooperative hunt for 2 to 4 players against a Boss. Every
// round the Boss attacks with one threat and a move; each player puts one card on it and
// the scores are summed. Below the Attack the team loses a Defence; at or above it, what
// goes beyond is damage to the Boss's Life. Life at 0 wins at once, Defences at 0 lose,
// and the hunt is lost if the Boss still stands after the last round. Pure: the Edge
// Function loads and stores, the database re-checks what it can.

import { shuffle, type Rng } from "./rng.ts";
import {
  abilityMalusFrom,
  carriedBonusFrom,
  isRelentless,
  nullifiesNextPower,
  nullifiesPower,
  relentlessMargin,
  scoreMalusFrom,
  scorePlay,
  type PlayOutcome,
  type ScoreContext,
  type Standing,
} from "./scoring.ts";
import type { AbilityFamilies, Character, PlayScore, Threat, ThreatModifier } from "./types.ts";

/**
 * The Boss's moves: none (an Attacco semplice), Colpo pesante (two Defences if the team does
 * not hold), Corazza (damage halved), Punto scoperto (damage doubled), Rigenerazione (back
 * some Life when it takes no damage), Bersaglio (the highest card counts half); and, from the
 * second stage, the four modifiers of §5.4 announced instead of drawn: Colpo mirato, Anello
 * debole, Territorio ostile, Sottovalutati, which change how the cards score on the threat.
 */
export const RAID_MOVES = [
  "plain",
  "heavy",
  "armor",
  "exposed",
  "regen",
  "target",
  "focus",
  "weak_link",
  "hostile_ground",
  "underdogs",
] as const;
export type RaidMove = (typeof RAID_MOVES)[number];

/** The moves against the team: an Annullatore cancels them. Punto scoperto is a chance, not a threat. */
export const HOSTILE_RAID_MOVES: readonly RaidMove[] = ["heavy", "armor", "regen", "target"];

/**
 * The moves that are a threat modifier (SPEC §5.4) on the round's threat: they help some cards
 * and hinder others, so no Annullatore cancels them. Anello debole needs two abilities at least.
 */
export const MODIFIER_RAID_MOVES: readonly RaidMove[] = ["focus", "weak_link", "hostile_ground", "underdogs"];

/** The numbers of the mode (balance.ts `raid`, game_config `raid.*`). */
export type RaidRules = {
  rounds: number;
  squadSize: number;
  defenses: number;
  /** Threat level → one player's share of its Attack (the Emergenza's targets). */
  targets: Record<number, number>;
  /** Players → Attack factor, in hundredths: one player's share times about the players, a little more (more cards sum more evenly). */
  attackFactor: Record<number, number>;
  /** Players → Life factor, in hundredths: what a team of that size deals, so that a Boss is as hard in 2, 3 and 4. */
  vitaFactor: Record<number, number>;
  /** The Boss's Life for one player's share. */
  vitaBase: number;
  /** Defences a Colpo pesante takes when the team does not hold. */
  heavyDefenses: number;
  /** Share of the Boss's whole Life a Rigenerazione gives back, in hundredths (rounded up). */
  regenPercent: number;
  /** Most Punto scoperto and Colpo pesante in a hunt. */
  exposedMax: number;
  heavyMax: number;
};

/** What the room copied from the Boss and its Magnitude when it opened. */
export type RaidBoss = {
  /** The Magnitude's Strength, in hundredths: Attack and Life. */
  forzaPercent: number;
  /** The Boss's own Life, in hundredths. */
  vitaPercent: number;
};

/** A seat of the hunt: the player (user id, or "bot-<seat>" for a server ally) and the squad. */
export type RaidPlayer = { id: string; squad: Character[] };

export type RaidPlay = PlayScore & {
  player: string;
  /** What the play adds to the team's sum: its total, or half of it (rounded down) under Bersaglio. */
  counted: number;
  autoPlayed: boolean;
};

export type RaidRoundRecord = {
  /** 1-based. */
  round: number;
  plays: RaidPlay[];
  move: RaidMove;
  /** A hostile move an Annullatore of the team cancelled. */
  cancelled: boolean;
  attack: number;
  /** The Attack lowered by the strongest Sabotatore of the round: the damage counts from it. */
  effectiveAttack: number;
  /** What the sum must reach to hold: the effective Attack, minus the strongest Implacabile's points. */
  required: number;
  total: number;
  held: boolean;
  damage: number;
  defensesLost: number;
  /** Life a Rigenerazione gave back. */
  healed: number;
  /** The Boss's Life and the team's Defences after the round. */
  vita: number;
  defenses: number;
};

/** Everything the server knows about a hunt in progress. Never send it to a client as is. */
export type RaidState = {
  rules: RaidRules;
  boss: RaidBoss;
  players: RaidPlayer[];
  /** The threats of the hunt, in round order. */
  threats: Threat[];
  /** The Boss's moves, in round order: the players see the current one and the next. */
  moves: RaidMove[];
  records: RaidRoundRecord[];
};

export type RaidResult = "won" | "lost";

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

/** `value` times `hundredths` / 100, to the nearest integer (halves up): the database does the same. */
export function percentOf(value: number, hundredths: number): number {
  return Math.floor((value * hundredths + 50) / 100);
}

function factorOf(factors: Record<number, number>, players: number): number {
  const factor = factors[players];
  if (factor === undefined) throw new Error(`No player factor for ${players} players`);
  return factor;
}

/** A threat's Attack: one player's share of its level, times the players' Attack factor and the Strength. */
export function raidAttack(rules: RaidRules, level: number, players: number, forzaPercent: number): number {
  const target = rules.targets[level];
  if (target === undefined) throw new Error(`No target for threat level ${level}`);
  return Math.floor((target * factorOf(rules.attackFactor, players) * forzaPercent + 5000) / 10000);
}

/** The Boss's whole Life: the base, times the players' Life factor, the Strength and its own Life. */
export function raidVitaMax(rules: RaidRules, players: number, boss: RaidBoss): number {
  return Math.max(1, Math.floor((rules.vitaBase * factorOf(rules.vitaFactor, players) * boss.forzaPercent * boss.vitaPercent + 500_000) / 1_000_000));
}

/** Life a Rigenerazione gives back: a share of the whole Life, rounded up. */
export function raidRegen(rules: RaidRules, vitaMax: number): number {
  return Math.ceil((vitaMax * rules.regenPercent) / 100);
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export function raidVitaMaxOf(state: RaidState): number {
  return raidVitaMax(state.rules, state.players.length, state.boss);
}

export function raidVita(state: RaidState): number {
  return state.records.at(-1)?.vita ?? raidVitaMaxOf(state);
}

export function raidDefenses(state: RaidState): number {
  return state.records.at(-1)?.defenses ?? state.rules.defenses;
}

export function raidRoundNumber(state: RaidState): number {
  return state.records.length + 1;
}

/** The hunt ends when the Boss falls, the Defences are gone, or after the last round. */
export function isRaidFinished(state: RaidState): boolean {
  return state.records.length >= state.threats.length || raidVita(state) <= 0 || raidDefenses(state) <= 0;
}

/** Won: the Boss's Life at 0. null while playing. */
export function raidResult(state: RaidState): RaidResult | null {
  if (!isRaidFinished(state)) return null;
  return raidVita(state) <= 0 ? "won" : "lost";
}

/** The round being played: its threat, the Boss's move and the Attack. */
export function raidCurrentRound(state: RaidState): { round: number; threat: Threat; move: RaidMove; attack: number } | undefined {
  if (isRaidFinished(state)) return undefined;
  const i = state.records.length;
  const threat = state.threats[i];
  return { round: i + 1, threat, move: state.moves[i] ?? "plain", attack: raidAttack(state.rules, threat.level, state.players.length, state.boss.forzaPercent) };
}

function playerOf(state: RaidState, id: string): RaidPlayer {
  const player = state.players.find((p) => p.id === id);
  if (!player) throw new Error(`Unknown player ${id}`);
  return player;
}

/** A player's cards not played yet. */
export function raidHand(state: RaidState, playerId: string): Character[] {
  const used = new Set(state.records.flatMap((r) => r.plays.filter((p) => p.player === playerId).map((p) => p.characterId)));
  return playerOf(state, playerId).squad.filter((c) => !used.has(c.id));
}

export function isValidRaidPlacement(state: RaidState, playerId: string, characterId: string): boolean {
  return !isRaidFinished(state) && raidHand(state, playerId).some((c) => c.id === characterId);
}

// ---------------------------------------------------------------------------
// The powers
// ---------------------------------------------------------------------------

/** The team's standing, as the powers read it: rounds held are won, rounds with Defences lost are lost. */
function teamStanding(state: RaidState): Standing {
  const won = state.records.filter((r) => r.held).length;
  return { roundsWon: won, opponentRoundsWon: state.records.length - won };
}

/**
 * What the powers of a player's card know before the round (SPEC §5.18). The powers that look
 * at the squad (Legame, Lupo solitario, Arcobaleno) see the player's own six: every card counts
 * here, and the whole team would make them pile up. Those that look at the cards played before
 * (Riscossa, Slancio, Capobranco, Sacrificio, Catalizzatore, Riverbero, Crescendo, Vendetta)
 * see the player's own. No opponent: every card plays with its power.
 */
export function raidContext(state: RaidState, playerId: string, families: AbilityFamilies): ScoreContext {
  const squad = playerOf(state, playerId).squad;
  const earlier = state.records.flatMap((record) =>
    record.plays.filter((p) => p.player === playerId).map((play) => ({ play, record, character: squad.find((c) => c.id === play.characterId)! })),
  );
  const last = state.records.at(-1);
  const outcome = (record: RaidRoundRecord): PlayOutcome => (record.held ? "won" : "lost");
  return {
    families,
    ...teamStanding(state),
    carriedBonus: carriedBonusFrom(
      earlier.slice(-2).map((entry) => ({ character: entry.character, outcome: outcome(entry.record), margin: entry.record.total - entry.record.required })),
    ),
    round: raidRoundNumber(state),
    team: squad,
    previousLevel: last ? state.threats[last.round - 1].level : undefined,
    previousOutcome: last ? outcome(last) : undefined,
    threatLevels: state.threats.map((t) => t.level),
    played: earlier.map((entry) => entry.character),
  };
}

/** How a card scores on the round's threat. The screen shows it beside the Attack. */
export function scoreRaidPlay(state: RaidState, playerId: string, character: Character, families: AbilityFamilies): PlayScore {
  const round = raidCurrentRound(state);
  if (!round) throw new Error("The hunt is over");
  return scorePlay(character, round.threat, raidContext(state, playerId, families));
}

/** The strongest Sabotatore among the cards (points off the Attack), and the strongest Implacabile (points short it may hold). */
export function raidDiscounts(characters: readonly Character[], threat: Threat, standing: Standing): { sabotage: number; relentless: number } {
  let sabotage = 0;
  let relentless = 0;
  for (const c of characters) {
    sabotage = Math.max(sabotage, abilityMalusFrom(c, threat) * threat.abilities.length + scoreMalusFrom(c));
    if (isRelentless(c)) relentless = Math.max(relentless, 1 + relentlessMargin(c, threat, standing));
  }
  return { sabotage, relentless };
}

/** Whether a card of the team cancels the Boss's move: an Annullatore, on a move against the team. */
export function raidMoveCancelled(move: RaidMove, characters: readonly Character[]): boolean {
  return HOSTILE_RAID_MOVES.includes(move) && characters.some((c) => nullifiesPower(c) || nullifiesNextPower(c));
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

export type RaidPlacement = { characterId: string; autoPlayed: boolean };

/**
 * The round with the cards placed so far (pure): every play's score, Bersaglio, the sum, the
 * Attack lowered by Sabotatore, the hold, the damage, the Defences, Rigenerazione. With every
 * player's card it is the round's record; with some only, the screen's preview.
 */
export function raidRoundOutcome(
  state: RaidState,
  placements: Record<string, RaidPlacement>,
  families: AbilityFamilies,
): RaidRoundRecord {
  const round = raidCurrentRound(state);
  if (!round) throw new Error("The hunt is already over");
  const placed: { player: string; character: Character; autoPlayed: boolean }[] = [];
  for (const player of state.players) {
    const placement = placements[player.id];
    if (!placement) continue;
    const character = player.squad.find((c) => c.id === placement.characterId);
    if (!character) throw new Error("invalid_placement");
    placed.push({ player: player.id, character, autoPlayed: placement.autoPlayed });
  }
  const characters = placed.map((p) => p.character);
  const cancelled = raidMoveCancelled(round.move, characters);
  const move = (code: RaidMove) => round.move === code && !(cancelled && HOSTILE_RAID_MOVES.includes(code));

  const scores = placed.map((p) => scorePlay(p.character, round.threat, raidContext(state, p.player, families)));
  // Bersaglio: the highest card (the first by seat on a tie) counts half.
  let target = -1;
  if (move("target")) scores.forEach((s, i) => (target < 0 || s.total > scores[target].total ? (target = i) : null));
  const plays: RaidPlay[] = placed.map((p, i) => ({
    ...scores[i],
    player: p.player,
    counted: i === target ? Math.floor(scores[i].total / 2) : scores[i].total,
    autoPlayed: p.autoPlayed,
  }));
  const total = plays.reduce((sum, p) => sum + p.counted, 0);

  const standing = teamStanding(state);
  const { sabotage, relentless } = raidDiscounts(characters, round.threat, standing);
  const effectiveAttack = Math.max(0, round.attack - sabotage);
  const required = Math.max(0, effectiveAttack - relentless);
  const held = total >= required;

  let damage = held ? Math.max(0, total - effectiveAttack) : 0;
  if (move("armor")) damage = Math.floor(damage / 2);
  if (move("exposed")) damage *= 2;
  const defensesLost = held ? 0 : move("heavy") ? state.rules.heavyDefenses : 1;
  const vitaMax = raidVitaMaxOf(state);
  const before = raidVita(state);
  const healed = move("regen") && damage === 0 ? Math.min(raidRegen(state.rules, vitaMax), vitaMax - before) : 0;
  return {
    round: round.round,
    plays,
    move: round.move,
    cancelled,
    attack: round.attack,
    effectiveAttack,
    required,
    total,
    held,
    damage,
    defensesLost,
    healed,
    vita: Math.max(0, before - damage + healed),
    defenses: Math.max(0, raidDefenses(state) - defensesLost),
  };
}

/** Resolves the current round with every player's card (pure). */
export function resolveRaidRound(
  state: RaidState,
  placements: Record<string, RaidPlacement>,
  families: AbilityFamilies,
): { state: RaidState; record: RaidRoundRecord } {
  for (const player of state.players) {
    const placement = placements[player.id];
    if (!placement || !isValidRaidPlacement(state, player.id, placement.characterId)) throw new Error("invalid_placement");
  }
  const record = raidRoundOutcome(state, placements, families);
  return { state: { ...state, records: [...state.records, record] }, record };
}

// ---------------------------------------------------------------------------
// The cards the server puts down: for who did not choose, and for the allies
// ---------------------------------------------------------------------------

/** What a card is worth in the rounds after the current one: its mean value times their levels. */
export function raidLaterValue(state: RaidState, character: Character): number {
  const later = state.threats.slice(state.records.length + 1);
  const values = Object.values(character.stats);
  const mean = values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
  return later.reduce((sum, t) => sum + mean * t.level, 0);
}

/**
 * The card the server puts down for a player (SPEC §5.18): if the cards already placed do not
 * reach the Attack, the one that reaches it wasting least; otherwise, or if none reaches it,
 * the one worth least in the rounds left (the highest score now on a tie, as in the last round).
 */
export function autoRaidPlacement(
  state: RaidState,
  playerId: string,
  others: Record<string, RaidPlacement>,
  families: AbilityFamilies,
  rng: Rng,
): RaidPlacement {
  const hand = shuffle(rng, raidHand(state, playerId));
  if (hand.length === 0) throw new Error("Nothing left to play");
  const before = raidRoundOutcome(state, others, families);
  const options = hand.map((character) => {
    const outcome = raidRoundOutcome(state, { ...others, [playerId]: { characterId: character.id, autoPlayed: true } }, families);
    return { character, outcome, later: raidLaterValue(state, character) };
  });
  const reaching = options.filter((o) => o.outcome.held);
  let pick: (typeof options)[number];
  if (!before.held && reaching.length > 0) {
    pick = reaching.reduce((best, o) =>
      o.outcome.total < best.outcome.total || (o.outcome.total === best.outcome.total && o.later < best.later) ? o : best,
    );
  } else {
    pick = options.reduce((best, o) =>
      o.later < best.later || (o.later === best.later && o.outcome.total > best.outcome.total) ? o : best,
    );
  }
  return { characterId: pick.character.id, autoPlayed: true };
}

/**
 * Resolves a round between players: each choice as sent, a missing one put down by the
 * server in seat order, knowing the ones before.
 */
export function playRaidRound(params: {
  state: RaidState;
  choices: Record<string, string | null>;
  families: AbilityFamilies;
  rng: Rng;
}): { state: RaidState; record: RaidRoundRecord; finished: boolean; result: RaidResult | null } {
  const { state, choices, families, rng } = params;
  const placements: Record<string, RaidPlacement> = {};
  for (const player of state.players) {
    const choice = choices[player.id] ?? null;
    if (choice === null) continue;
    if (!isValidRaidPlacement(state, player.id, choice)) throw new Error("invalid_placement");
    placements[player.id] = { characterId: choice, autoPlayed: false };
  }
  for (const player of state.players) {
    if (placements[player.id]) continue;
    placements[player.id] = autoRaidPlacement(state, player.id, placements, families, rng);
  }
  const resolved = resolveRaidRound(state, placements, families);
  return { ...resolved, finished: isRaidFinished(resolved.state), result: raidResult(resolved.state) };
}

// ---------------------------------------------------------------------------
// The Boss's moves
// ---------------------------------------------------------------------------

/**
 * Whether a sequence keeps the rules: Punto scoperto and Colpo pesante capped, no two Colpo
 * pesante in a row, no Rigenerazione first, no Anello debole on a threat of one ability
 * (when the levels are given).
 */
export function isValidRaidMoveSequence(
  moves: readonly RaidMove[],
  rules: Pick<RaidRules, "exposedMax" | "heavyMax">,
  levels?: readonly number[],
): boolean {
  if (moves[0] === "regen") return false;
  if (levels && moves.some((m, i) => m === "weak_link" && (levels[i] ?? 0) < 2)) return false;
  if (moves.filter((m) => m === "exposed").length > rules.exposedMax) return false;
  if (moves.filter((m) => m === "heavy").length > rules.heavyMax) return false;
  return !moves.some((m, i) => m === "heavy" && moves[i - 1] === "heavy");
}

/**
 * The Boss's moves for a hunt: each round one of its repertoire or an Attacco semplice, at
 * random among those the rules still allow (raid_draw_moves draws them the same way).
 */
export function drawRaidMoves(
  rng: Rng,
  repertoire: readonly RaidMove[],
  rounds: number,
  rules: Pick<RaidRules, "exposedMax" | "heavyMax">,
  levels?: readonly number[],
): RaidMove[] {
  const moves: RaidMove[] = [];
  const pool: RaidMove[] = ["plain", ...repertoire.filter((m) => m !== "plain")];
  for (let i = 0; i < rounds; i++) {
    const allowed = pool.filter((m) => isValidRaidMoveSequence([...moves, m], rules, levels));
    moves.push(allowed[Math.floor(rng() * allowed.length)]);
  }
  return moves;
}

/** The numbers of the modifiers (game_config `threat_modifiers.*`), as a match draws them. */
export type RaidModifierNumbers = {
  hostileBonus: number;
  hostileMalus: number;
  underdogBonus: number;
  underdogMalus: number;
  underdogCommonMaxRank: number;
  underdogEliteMinRank: number;
};

const FACTIONS = ["heroes", "villains", "neutrals"];

/**
 * The modifier a move puts on its round's threat, or null for the other moves: Territorio ostile
 * draws its two factions now (raid_create_room does the same when the room opens).
 */
export function raidMoveModifier(move: RaidMove, rng: Rng, numbers: RaidModifierNumbers): ThreatModifier | null {
  switch (move) {
    case "focus":
      return { code: "focus" };
    case "weak_link":
      return { code: "weak_link" };
    case "hostile_ground": {
      const [favored, hindered] = shuffle(rng, FACTIONS);
      return { code: "hostile_ground", favored, hindered, bonus: numbers.hostileBonus, malus: numbers.hostileMalus };
    }
    case "underdogs":
      return {
        code: "underdogs",
        commonMaxRank: numbers.underdogCommonMaxRank,
        eliteMinRank: numbers.underdogEliteMinRank,
        bonus: numbers.underdogBonus,
        malus: numbers.underdogMalus,
      };
    default:
      return null;
  }
}
