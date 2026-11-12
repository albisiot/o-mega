// Edge Function "match": authoritative matches (SPEC §5, §10.1), against bots
// and between players. Thin I/O layer around packages/game-engine:
// authenticate the caller, load the data, let the engine decide, store the
// result through the service-only database functions (which re-check the
// round order, the submitted choices and the final result).

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildBotTeam,
  computeAbilityMeans,
  drawBossValues,
  drawEmergencyThreats,
  drawThreatLevels,
  pickOne,
  pickThreats,
  placeModifier,
  chooseQuadrantBotPlacement,
  quadrantBotView,
  quadrantSideToMove,
  quadrantValues,
  planBotMatch,
  playBossBotTurn,
  playBossPvpTurn,
  playBotRound,
  playPvpRound,
  playQuadrantMove,
  playTripleBotRound,
  playTriplePvpRound,
  resolveEmergencyPlay,
  type BossRules,
  type BossState,
  type BossTurnRecord,
  type BotDifficulty,
  type BotMatchCatalog,
  type Character,
  type EmergencyAttempt,
  type EmergencyRules,
  type MatchResult,
  type MatchRules,
  type MatchState,
  type QuadrantBoard,
  type QuadrantMoveRecord,
  type QuadrantPlacement,
  type QuadrantRules,
  type QuadrantState,
  type Rng,
  type RoundRecord,
  type Side,
  type Threat,
  type ThreatModifier,
  type TripleRoundRecord,
  type TripleRules,
  type TripleState,
} from "../_shared/game-engine/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Error codes the client knows how to explain; anything else is a 500. */
const CLIENT_ERRORS = new Set([
  "not_authenticated",
  "invalid_request",
  "invalid_difficulty",
  "match_not_found",
  "match_not_active",
  "match_already_active",
  "round_already_resolved",
  "round_not_expired",
  "round_expired",
  "character_not_available",
  "character_already_played",
  "invalid_team_size",
  "duplicate_card",
  "duplicate_character",
  "card_not_owned",
  "profile_not_found",
  "lobby_not_found",
  "cannot_play_yourself",
  "card_at_stake",
  "card_locked",
  "conquest_locked",
  "daily_loss_limit",
  "not_enough_conquerable",
  "same_pair_cooldown",
  "emergency_already_played",
  "emergency_not_started",
  "invalid_emergency_squad",
  "story_mission_not_found",
  "story_mission_locked",
  "invalid_front",
  "boss_not_found",
  "invalid_placement",
  "not_your_turn",
]);

class GameError extends Error {}

function secretKey(): string {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) return JSON.parse(keys).default;
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", secretKey(), {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Cryptographically strong randomness for real matches. */
const rng: Rng = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function check<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("No data");
  return result.data;
}

function cardIds(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((id) => typeof id === "string")) throw new GameError("invalid_request");
  return value;
}

// ---------------------------------------------------------------------------
// Catalog and rules (cached for a minute per isolate)
// ---------------------------------------------------------------------------

type Definition = { id: string; faction: string; rarity_rank: number; stats: Record<string, number>; power_code: string | null; power_params: Record<string, string | number> };
type Loaded = {
  rules: MatchRules;
  emergency: EmergencyRules;
  boss: BossRules;
  triple: TripleRules;
  quadrant: QuadrantRules;
  graceSeconds: number;
  catalog: BotMatchCatalog;
  /** Threats of Nuova Megara only: Emergenza never draws the places beyond it. */
  emergencyCatalog: Threat[];
  definitions: Map<string, Definition>;
  threats: Map<string, Threat>;
};

let cache: { loaded: Loaded; at: number } | null = null;

function toCharacter(definition: Definition, id = definition.id): Character {
  return {
    id,
    definitionId: definition.id,
    faction: definition.faction,
    rarityRank: definition.rarity_rank,
    stats: definition.stats,
    power: definition.power_code ? { code: definition.power_code, params: definition.power_params ?? {} } : null,
  };
}

async function load(): Promise<Loaded> {
  if (cache && Date.now() - cache.at < 60_000) return cache.loaded;
  const [definitions, rarities, threats, abilities, config] = await Promise.all([
    admin.from("card_definitions").select("id, faction, rarity_code, stats, power_code, power_params, is_active"),
    admin.from("rarity_definitions").select("code, rank"),
    admin
      .from("threat_definitions")
      .select("id, level, required_abilities, is_active, region, modifier_code, modifier_params"),
    admin.from("ability_definitions").select("code, family"),
    admin.from("game_config").select("key, value"),
  ]);
  const values = new Map(check(config).map((row) => [row.key, Number(row.value)]));
  const value = (key: string) => {
    const v = values.get(key);
    if (v === undefined || !Number.isFinite(v)) throw new Error(`missing game_config key: ${key}`);
    return v;
  };

  const ranks = new Map((check(rarities) as { code: string; rank: number }[]).map((r) => [r.code, r.rank]));
  const definitionRows = (check(definitions) as (Omit<Definition, "rarity_rank"> & { rarity_code: string; is_active: boolean })[]).map(
    (d) => ({ ...d, rarity_rank: ranks.get(d.rarity_code) ?? 1 }),
  );
  const threatRows = check(threats) as {
    id: string;
    level: number;
    required_abilities: string[];
    is_active: boolean;
    region: string;
    modifier_code: string | null;
    modifier_params: Record<string, unknown> | null;
  }[];
  const activeCharacters = definitionRows.filter((d) => d.is_active).map((d) => toCharacter(d));
  const places = {
    longCountBonus: value("places.long_count_bonus"),
    frostCap: value("places.frost_cap"),
    duelCount: value("places.duel_count"),
  };
  const threatList = threatRows.map((t) => ({
    id: t.id,
    level: t.level,
    abilities: t.required_abilities,
    active: t.is_active,
    region: t.region,
    // A place's own rule: the bots plan future rounds knowing it.
    modifier: placeModifier(t.modifier_code, t.modifier_params, places),
  }));
  const activeThreats = threatList.filter((t) => t.active);

  const loaded: Loaded = {
    rules: {
      teamSize: value("match.team_size"),
      threatsPerMatch: value("match.threats_per_match"),
      roundsToWin: value("match.rounds_to_win"),
      threatLevels: {
        min: value("match.threat_levels.min"),
        max: value("match.threat_levels.max"),
        requireOneAtMost: value("match.threat_levels.require_one_at_most"),
        requireOneAtLeast: value("match.threat_levels.require_one_at_least"),
        minSum: value("match.threat_levels.min_sum"),
        maxSum: value("match.threat_levels.max_sum"),
      },
    },
    emergency: {
      threatsPerRun: value("emergency.threats_per_run"),
      maxFailures: value("emergency.max_failures"),
      targets: Object.fromEntries([1, 2, 3, 4, 5, 6].map((level) => [level, value(`emergency.targets.level${level}`)])),
      threatLevels: {
        min: value("match.threat_levels.min"),
        max: value("match.threat_levels.max"),
        requireOneAtMost: value("match.threat_levels.require_one_at_most"),
        requireOneAtLeast: value("match.threat_levels.require_one_at_least"),
        minSum: value("emergency.threat_levels.min_sum"),
        maxSum: value("emergency.threat_levels.max_sum"),
      },
    },
    boss: {
      turns: value("boss.turns"),
      fronts: value("boss.fronts"),
      hotFronts: value("boss.hot_fronts"),
      hotValue: value("boss.hot_value"),
      hotGrowth: value("boss.hot_growth"),
      baseValue: value("boss.base_value"),
    },
    triple: {
      rounds: value("triple.rounds"),
      threats: value("triple.threats"),
      classicRounds: value("match.threats_per_match"),
    },
    quadrant: {
      size: value("quadrant.size"),
      deckSize: value("quadrant.deck_size"),
      handSize: value("quadrant.hand_size"),
      cardsPerSide: value("quadrant.cards_per_side"),
      seals: value("quadrant.seals"),
      firstPlayerSeals: value("quadrant.first_player_seals"),
    },
    graceSeconds: value("match.timeout_grace_seconds"),
    catalog: {
      characters: activeCharacters,
      threatCatalog: activeThreats.map(({ id, level, abilities, modifier }) => ({ id, level, abilities, modifier })),
      families: Object.fromEntries(check(abilities).map((a) => [a.code, a.family])),
      abilityMeans: computeAbilityMeans(activeCharacters),
    },
    emergencyCatalog: activeThreats
      .filter((t) => t.region === "megara")
      .map(({ id, level, abilities }) => ({ id, level, abilities })),
    definitions: new Map(definitionRows.map((d) => [d.id, d])),
    threats: new Map(threatList.map(({ id, level, abilities }) => [id, { id, level, abilities }])),
  };
  cache = { loaded, at: Date.now() };
  return loaded;
}

function planThreats(loaded: Loaded): string[] {
  return pickThreats(rng, loaded.catalog.threatCatalog, drawThreatLevels(rng, loaded.rules)).map((t) => t.id);
}

// ---------------------------------------------------------------------------
// Match state
// ---------------------------------------------------------------------------

async function stateFor(matchId: string, side: Side) {
  return check(await admin.rpc("match_state_payload", { p_match_id: matchId, p_side: side }));
}

type PlayRow = {
  round: number;
  side: Side;
  card_instance_id: string | null;
  definition_id: string;
  base_score: number;
  bonus: number;
  score: number;
  highest_value: number;
  auto_played: boolean;
  /** Grande Minaccia only: 1-based front where the character stays, points the side took that turn. */
  front_slot: number | null;
  points: number | null;
  /** Quadrante only: the cell and the quarter turns of the card. */
  cell_x?: number | null;
  cell_y?: number | null;
  rotation?: number | null;
};

const QUADRANT_FORMATS = ["quadrant", "quadrant_shifting"] as const;
type QuadrantFormat = (typeof QUADRANT_FORMATS)[number];
const isQuadrantFormat = (format: unknown): format is QuadrantFormat =>
  typeof format === "string" && (QUADRANT_FORMATS as readonly string[]).includes(format);

type MatchContext = {
  side: Side;
  match: {
    status: string;
    format: "classic" | "boss" | "triple" | QuadrantFormat;
    bot_difficulty: BotDifficulty | null;
    current_round: number;
    threat_ids: string[];
    threat_modifiers: (ThreatModifier | null)[];
    boss_values: number[][] | null;
    quadrant_abilities?: string[] | null;
    quadrant_first?: Side | null;
  };
  teams: { side: Side; card_instance_ids: string[] | null; definition_ids: string[] }[];
  rounds: {
    round: number;
    deadline_at: string;
    winner_side: string | null;
    resolved_at: string | null;
    /** Grande Minaccia: who held each front in that turn. */
    holders?: (Side | null)[] | null;
  }[];
  plays: PlayRow[];
  /** Choices already submitted for the current round (matches between players). */
  pending: {
    side: Side;
    card_instance_id: string;
    front_slot: number | null;
    round?: number;
    cell_x?: number | null;
    cell_y?: number | null;
    rotation?: number | null;
  }[];
};

/** Rebuilds the full engine state of a match from the database, in one request. */
async function loadMatch(userId: string, matchId: string) {
  const [loaded, context] = await Promise.all([
    load(),
    admin.rpc("match_round_context", { p_user: userId, p_match_id: matchId }),
  ]);
  const { side, match, teams: teamRows, rounds: roundRows, plays: playRows, pending } = check(context) as MatchContext;
  if (match.status !== "active") throw new GameError("match_not_active");

  const definitionOf = (id: string) => {
    const definition = loaded.definitions.get(id);
    if (!definition) throw new Error(`Unknown card definition ${id}`);
    return definition;
  };
  const team = (teamSide: Side) => {
    const row = teamRows.find((t) => t.side === teamSide)!;
    return row.definition_ids.map((definitionId, i) =>
      toCharacter(definitionOf(definitionId), row.card_instance_ids?.[i] ?? definitionId),
    );
  };

  const teams = { a: team("a"), b: team("b") };
  const current = roundRows.find((r) => r.round === match.current_round)!;
  const deadline = Date.parse(current.deadline_at);

  if (match.format === "boss") {
    const boss = bossState(loaded, match, teams, roundRows, playRows);
    return { loaded, match, side, state: null, boss, triple: null, quadrant: null, pending, deadline };
  }
  if (match.format === "triple") {
    const triple = tripleState(loaded, match, teams, roundRows, playRows);
    return { loaded, match, side, state: null, boss: null, triple, quadrant: null, pending, deadline };
  }
  if (isQuadrantFormat(match.format)) {
    const quadrant = quadrantState(loaded, match, teams, playRows);
    return { loaded, match, side, state: null, boss: null, triple: null, quadrant, pending, deadline };
  }

  const resolved: RoundRecord[] = roundRows
    .filter((r) => r.resolved_at)
    .map((r) => {
      const playOf = (playSide: Side) => {
        const p = playRows.find((row) => row.round === r.round && row.side === playSide)!;
        return {
          characterId: p.card_instance_id ?? p.definition_id,
          base: p.base_score,
          bonus: p.bonus,
          total: p.score,
          highest: p.highest_value,
          autoPlayed: p.auto_played,
        };
      };
      return {
        round: r.round,
        threatId: match.threat_ids[r.round - 1],
        plays: { a: playOf("a"), b: playOf("b") },
        winner: r.winner_side === "a" || r.winner_side === "b" ? r.winner_side : null,
      };
    });

  const state: MatchState = {
    rules: loaded.rules,
    threats: match.threat_ids.map((id, i) => {
      const threat = loaded.threats.get(id);
      if (!threat) throw new Error(`Unknown threat ${id}`);
      return { ...threat, modifier: match.threat_modifiers[i] ?? null };
    }),
    teams,
    rounds: resolved,
  };
  return { loaded, match, side, state, boss: null, triple: null, quadrant: null, pending, deadline };
}

/** The engine state of a Quadrante: the decks in draw order and every move, replayed in order. */
function quadrantState(
  loaded: Loaded,
  match: MatchContext["match"],
  decks: QuadrantState["decks"],
  playRows: PlayRow[],
): QuadrantState {
  const abilities = match.quadrant_abilities;
  const first = match.quadrant_first;
  if (!abilities || !first) throw new Error("A Quadrante without abilities or first side");
  const moves: QuadrantMoveRecord[] = [...playRows]
    .sort((p, q) => p.round - q.round)
    .map((p) => {
      const characterId = p.card_instance_id ?? p.definition_id;
      const character = decks[p.side].find((c) => c.id === characterId);
      if (!character) throw new Error(`Unknown character ${characterId}`);
      const rotation = p.rotation ?? 0;
      return {
        move: p.round,
        side: p.side,
        characterId,
        x: p.cell_x ?? 0,
        y: p.cell_y ?? 0,
        rotation,
        autoPlayed: p.auto_played,
        values: quadrantValues(character, abilities, rotation),
        beaten: p.base_score,
        placed: p.score,
        removed: p.bonus,
      };
    });
  return {
    rules: loaded.quadrant,
    variant: match.format === "quadrant_shifting" ? "shifting" : "fixed",
    abilities,
    first,
    decks,
    moves,
  };
}

/** Stores a move computed by the engine, with the grid after it; answers with the match as `side` sees it. */
function recordQuadrantMove(
  matchId: string,
  state: QuadrantState,
  played: { move: QuadrantMoveRecord; board: QuadrantBoard; finished: boolean; result: MatchResult | null },
  side: Side,
) {
  const character = state.decks[played.move.side].find((c) => c.id === played.move.characterId)!;
  // Bots own no cards: their character id is the definition id.
  const instanceOf = (id: string, definitionId: string) => (id === definitionId ? null : id);
  return admin.rpc("match_record_quadrant_move_state", {
    p_match_id: matchId,
    p_move: played.move.move,
    p_play: {
      card_instance_id: instanceOf(character.id, character.definitionId),
      definition_id: character.definitionId,
      x: played.move.x,
      y: played.move.y,
      rotation: played.move.rotation,
      beaten: played.move.beaten,
      placed: played.move.placed,
      removed: played.move.removed,
      auto_played: played.move.autoPlayed,
    },
    p_board: [...played.board.cells.values()].map((cell) => ({
      x: cell.x,
      y: cell.y,
      side: cell.side,
      definition_id: cell.definitionId,
      instance_id: instanceOf(cell.characterId, cell.definitionId),
      values: cell.values,
      seals_a: cell.seals.a,
      seals_b: cell.seals.b,
    })),
    p_result: played.finished ? played.result : null,
    p_side: side,
  });
}

/** A move sent by the client: { card_instance_id, x, y, rotation }, or null when the timer expired. */
function quadrantPlacementOf(value: unknown): QuadrantPlacement | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object") throw new GameError("invalid_placement");
  const v = value as Record<string, unknown>;
  const integer = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);
  if (typeof v.card_instance_id !== "string" || !integer(v.x) || !integer(v.y) || !integer(v.rotation)) {
    throw new GameError("invalid_placement");
  }
  return { characterId: v.card_instance_id, x: v.x, y: v.y, rotation: v.rotation };
}

/** Plays the bot's moves while it is its turn: at the start when it opens, after each move of the player. */
async function playQuadrantBotTurns(
  matchId: string,
  state: QuadrantState,
  catalog: BotMatchCatalog,
  difficulty: BotDifficulty,
  last: unknown,
) {
  let current = state;
  let payload = last;
  while (quadrantSideToMove(current) === "b") {
    const placement = chooseQuadrantBotPlacement(quadrantBotView(current, "b", catalog), difficulty, rng);
    const played = playQuadrantMove({ state: current, placement, rng });
    payload = check(await recordQuadrantMove(matchId, current, played, "a"));
    current = played.state;
  }
  return payload;
}

/**
 * The engine state of an Allarme Triplo: the three threats are the first of the
 * match's (each round repeats them), the decks are the teams in draw order, and
 * contest c of the database is threat (c - 1) % threats of round (c - 1) / threats + 1.
 */
function tripleState(
  loaded: Loaded,
  match: MatchContext["match"],
  decks: TripleState["decks"],
  roundRows: MatchContext["rounds"],
  playRows: PlayRow[],
): TripleState {
  const perRound = loaded.triple.threats;
  const threats = match.threat_ids.slice(0, perRound).map((id, i) => {
    const threat = loaded.threats.get(id);
    if (!threat) throw new Error(`Unknown threat ${id}`);
    return { ...threat, modifier: match.threat_modifiers[i] ?? null };
  });
  const resolvedRounds = Math.floor(roundRows.filter((r) => r.resolved_at).length / perRound);
  const rounds: TripleRoundRecord[] = Array.from({ length: resolvedRounds }, (_, r) => {
    const contests = threats.map((_, slot) => r * perRound + slot + 1);
    const winners = contests.map((c) => {
      const w = roundRows.find((row) => row.round === c)?.winner_side;
      return w === "a" || w === "b" ? w : null;
    });
    const playsOf = (playSide: Side) =>
      contests.map((c, slot) => {
        const p = playRows.find((row) => row.round === c && row.side === playSide)!;
        const winner = winners[slot];
        return {
          characterId: p.card_instance_id ?? p.definition_id,
          base: p.base_score,
          bonus: p.bonus,
          total: p.score,
          highest: p.highest_value,
          autoPlayed: p.auto_played,
          outcome: winner === null ? ("void" as const) : winner === playSide ? ("won" as const) : ("lost" as const),
        };
      });
    return { round: r + 1, plays: { a: playsOf("a"), b: playsOf("b") }, winners };
  });
  return { rules: loaded.triple, threats, decks, rounds };
}

/** Stores a round computed by the engine; answers with the match as `side` sees it. */
function recordTripleRound(
  matchId: string,
  state: TripleState,
  played: { round: TripleRoundRecord; finished: boolean; result: MatchResult | null },
  side: Side,
) {
  const playsPayload = (playSide: Side) =>
    played.round.plays[playSide].map((play) => {
      const character = state.decks[playSide].find((c) => c.id === play.characterId)!;
      return {
        // Bots own no cards: their character id is the definition id.
        card_instance_id: character.id === character.definitionId ? null : character.id,
        definition_id: character.definitionId,
        base: play.base,
        bonus: play.bonus,
        score: play.total,
        highest: play.highest,
        auto_played: play.autoPlayed,
      };
    });
  return admin.rpc("match_record_triple_round_state", {
    p_match_id: matchId,
    p_round: played.round.round,
    p_plays_a: playsPayload("a"),
    p_plays_b: playsPayload("b"),
    p_winners: played.round.winners,
    p_result: played.finished ? played.result : null,
    p_side: side,
  });
}

/** The cards sent by the client, one per threat in threat order, or null when the timer expired. */
function placementOf(value: unknown): string[] | null {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value) || !value.every((id) => typeof id === "string")) throw new GameError("invalid_placement");
  return value;
}

/**
 * The engine state of a Grande Minaccia: the fronts are the match's threats, plain
 * (no modifier), and each resolved turn says where each side placed its character,
 * what it took and who held each front.
 */
function bossState(
  loaded: Loaded,
  match: MatchContext["match"],
  teams: BossState["teams"],
  roundRows: MatchContext["rounds"],
  playRows: PlayRow[],
): BossState {
  if (!match.boss_values) throw new Error("A Grande Minaccia without a points table");
  const turns: BossTurnRecord[] = roundRows
    .filter((r) => r.resolved_at)
    .map((r) => {
      const rows = {
        a: playRows.find((row) => row.round === r.round && row.side === "a")!,
        b: playRows.find((row) => row.round === r.round && row.side === "b")!,
      };
      const holders = r.holders ?? match.threat_ids.map(() => null);
      const playOf = (playSide: Side) => {
        const p = rows[playSide];
        const front = (p.front_slot ?? 1) - 1;
        const holder = holders[front] ?? null;
        return {
          characterId: p.card_instance_id ?? p.definition_id,
          base: p.base_score,
          bonus: p.bonus,
          total: p.score,
          highest: p.highest_value,
          autoPlayed: p.auto_played,
          front,
          points: p.points ?? 0,
          outcome: holder === null ? ("void" as const) : holder === playSide ? ("won" as const) : ("lost" as const),
        };
      };
      return { turn: r.round, plays: { a: playOf("a"), b: playOf("b") }, holders };
    });
  return {
    rules: loaded.boss,
    fronts: match.threat_ids.map((id) => {
      const threat = loaded.threats.get(id);
      if (!threat) throw new Error(`Unknown threat ${id}`);
      return { ...threat, modifier: null };
    }),
    values: match.boss_values,
    teams,
    turns,
  };
}

/** Stores a turn computed by the engine; answers with the match as `side` sees it. */
function recordBossTurn(
  matchId: string,
  state: BossState,
  played: { turn: BossTurnRecord; finished: boolean; result: MatchResult | null },
  side: Side,
) {
  const playPayload = (playSide: Side) => {
    const play = played.turn.plays[playSide];
    const character = state.teams[playSide].find((c) => c.id === play.characterId)!;
    return {
      card_instance_id: character.id === character.definitionId ? null : character.id,
      definition_id: character.definitionId,
      front_slot: play.front + 1,
      base: play.base,
      bonus: play.bonus,
      score: play.total,
      highest: play.highest,
      auto_played: play.autoPlayed,
      points: play.points,
    };
  };
  return admin.rpc("match_record_boss_turn_state", {
    p_match_id: matchId,
    p_turn: played.turn.turn,
    p_play_a: playPayload("a"),
    p_play_b: playPayload("b"),
    p_holders: played.turn.holders,
    p_result: played.finished ? played.result : null,
    p_side: side,
  });
}

/** A front sent by the client: 0-based, or null when the timer expired. */
function frontOf(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isInteger(value)) throw new GameError("invalid_front");
  return value;
}

/** Stores a round computed by the engine; answers with the match as `side` sees it. */
function recordRound(
  matchId: string,
  state: MatchState,
  played: { round: RoundRecord; finished: boolean; result: MatchResult | null },
  side: Side,
) {
  const playPayload = (side: Side) => {
    const play = played.round.plays[side];
    const character = state.teams[side].find((c) => c.id === play.characterId)!;
    return {
      // Bots own no cards: their character id is the definition id.
      card_instance_id: character.id === character.definitionId ? null : character.id,
      definition_id: character.definitionId,
      base: play.base,
      bonus: play.bonus,
      score: play.total,
      highest: play.highest,
      auto_played: play.autoPlayed,
    };
  };
  return admin.rpc("match_record_round_state", {
    p_match_id: matchId,
    p_round: played.round.round,
    p_play_a: playPayload("a"),
    p_play_b: playPayload("b"),
    p_winner_side: played.round.winner,
    p_result: played.finished ? played.result : null,
    p_side: side,
  });
}

// ---------------------------------------------------------------------------
// Bot matches
// ---------------------------------------------------------------------------

const DIFFICULTIES: BotDifficulty[] = ["easy", "medium", "hard", "super_pro"];

async function startBotMatch(userId: string, body: Record<string, unknown>) {
  const difficulty = body.difficulty as BotDifficulty;
  if (!DIFFICULTIES.includes(difficulty)) throw new GameError("invalid_difficulty");
  const cards = cardIds(body.card_instance_ids);

  const { rules, catalog } = await load();
  const plan = planBotMatch({ rules, catalog, difficulty, rng });
  const matchId = check(
    await admin.rpc("match_create_bot", {
      p_user: userId,
      p_difficulty: difficulty,
      p_card_instance_ids: cards,
      p_bot_definition_ids: plan.botTeam.map((c) => c.definitionId),
      p_threat_ids: plan.threats.map((t) => t.id),
    }),
  ) as string;
  return stateFor(matchId, "a");
}

async function playBotMatchRound(userId: string, body: Record<string, unknown>) {
  const matchId = body.match_id;
  const choice = body.card_instance_id ?? null;
  if (typeof matchId !== "string" || (choice !== null && typeof choice !== "string")) {
    throw new GameError("invalid_request");
  }

  const { loaded, match, state, deadline } = await loadMatch(userId, matchId);
  const difficulty = match.bot_difficulty;
  if (!difficulty || !state) throw new GameError("match_not_found");
  if (body.round !== match.current_round) throw new GameError("round_already_resolved");

  const expired = Date.now() > deadline + loaded.graceSeconds * 1000;
  if (choice === null && !expired) throw new GameError("round_not_expired");

  const record = (playerChoice: string | null) =>
    recordRound(
      matchId,
      state,
      playBotRound({ state, catalog: loaded.catalog, difficulty, playerSide: "a", playerChoice, rng }),
      "a",
    );

  let saved = await record(expired ? null : (choice as string));
  // Clocks can disagree by a moment: if the database says the time is up,
  // the round is played for the player, as the rules require.
  if (saved.error?.message === "round_expired") saved = await record(null);
  return check(saved);
}

// ---------------------------------------------------------------------------
// Grande Minaccia against a bot (SPEC §5.12)
// ---------------------------------------------------------------------------

/**
 * Calls a database function that may create a Grande Minaccia with a points table
 * drawn here. Admins can change the table's numbers (/gestione-minaccia): while the
 * cached ones are out of date the database refuses the table, so the configuration
 * is read again and the call retried once with a new table.
 */
async function withBossTable<T>(call: (loaded: Loaded) => PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  let result = await call(await load());
  if (result.error?.message === "invalid_boss_values") {
    cache = null;
    result = await call(await load());
  }
  return result;
}

/** The database draws the boss; the engine draws the points table and the bot's team. */
async function startBossBotMatch(userId: string, body: Record<string, unknown>) {
  const difficulty = body.difficulty as BotDifficulty;
  if (!DIFFICULTIES.includes(difficulty)) throw new GameError("invalid_difficulty");
  const cards = cardIds(body.card_instance_ids);

  const matchId = check(
    await withBossTable(({ rules, boss, catalog }) =>
      admin.rpc("match_create_boss_bot", {
        p_user: userId,
        p_difficulty: difficulty,
        p_card_instance_ids: cards,
        p_bot_definition_ids: buildBotTeam(difficulty, catalog.characters, rules.teamSize, rng).map((c) => c.definitionId),
        p_boss_values: drawBossValues(rng, boss),
      }),
    ),
  ) as string;
  return stateFor(matchId, "a");
}

async function playBossBotTurnFor(userId: string, body: Record<string, unknown>) {
  const matchId = body.match_id;
  const choice = body.card_instance_id ?? null;
  const front = frontOf(body.front);
  if (typeof matchId !== "string" || (choice !== null && typeof choice !== "string") || (choice === null) !== (front === null)) {
    throw new GameError("invalid_request");
  }

  const { loaded, match, boss, deadline } = await loadMatch(userId, matchId);
  const difficulty = match.bot_difficulty;
  if (!difficulty || !boss) throw new GameError("match_not_found");
  if (body.round !== match.current_round) throw new GameError("round_already_resolved");

  const expired = Date.now() > deadline + loaded.graceSeconds * 1000;
  if (choice === null && !expired) throw new GameError("round_not_expired");

  const record = (playerChoice: { characterId: string; front: number } | null) =>
    recordBossTurn(
      matchId,
      boss,
      playBossBotTurn({ state: boss, catalog: loaded.catalog, difficulty, playerSide: "a", playerChoice, rng }),
      "a",
    );

  let saved = await record(expired ? null : { characterId: choice as string, front: front as number });
  // Clocks can disagree by a moment: if the database says the time is up, the
  // turn is played for the player, as the rules require.
  if (saved.error?.message === "round_expired") saved = await record(null);
  return check(saved);
}

// ---------------------------------------------------------------------------
// Allarme Triplo against a bot (SPEC §5.13)
// ---------------------------------------------------------------------------

/** The database draws the threats and shuffles the decks; the engine builds the bot's deck. */
async function startTripleBotMatch(userId: string, body: Record<string, unknown>) {
  const difficulty = body.difficulty as BotDifficulty;
  if (!DIFFICULTIES.includes(difficulty)) throw new GameError("invalid_difficulty");
  const cards = cardIds(body.card_instance_ids);
  const { triple, catalog } = await load();
  const deckSize = triple.rounds * triple.threats;
  const matchId = check(
    await admin.rpc("match_create_triple_bot", {
      p_user: userId,
      p_difficulty: difficulty,
      p_card_instance_ids: cards,
      p_bot_definition_ids: buildBotTeam(difficulty, catalog.characters, deckSize, rng).map((c) => c.definitionId),
    }),
  ) as string;
  return stateFor(matchId, "a");
}

async function playTripleBotRoundFor(userId: string, body: Record<string, unknown>) {
  const matchId = body.match_id;
  const placement = placementOf(body.card_instance_ids);
  if (typeof matchId !== "string") throw new GameError("invalid_request");

  const { loaded, match, triple, deadline } = await loadMatch(userId, matchId);
  const difficulty = match.bot_difficulty;
  if (!difficulty || !triple) throw new GameError("match_not_found");
  if (body.round !== triple.rounds.length + 1) throw new GameError("round_already_resolved");

  const expired = Date.now() > deadline + loaded.graceSeconds * 1000;
  if (placement === null && !expired) throw new GameError("round_not_expired");

  const record = (playerChoice: string[] | null) => {
    let played;
    try {
      played = playTripleBotRound({ state: triple, catalog: loaded.catalog, difficulty, playerSide: "a", playerChoice, rng });
    } catch (cause) {
      // Cards that are not the player's hand of this round.
      if (cause instanceof Error && cause.message === "invalid_placement") throw new GameError("invalid_placement");
      throw cause;
    }
    return recordTripleRound(matchId, triple, played, "a");
  };

  let saved = await record(expired ? null : placement);
  // Clocks can disagree by a moment: if the database says the time is up, the
  // cards are placed at random for the player, as the rules require.
  if (saved.error?.message === "round_expired") saved = await record(null);
  return check(saved);
}

// ---------------------------------------------------------------------------
// Quadrante against a bot (SPEC §5.14)
// ---------------------------------------------------------------------------

/** The database draws the abilities and the side that opens and shuffles the decks; the engine builds the bot's deck. */
async function startQuadrantBotMatch(userId: string, body: Record<string, unknown>) {
  const difficulty = body.difficulty as BotDifficulty;
  if (!DIFFICULTIES.includes(difficulty)) throw new GameError("invalid_difficulty");
  if (!isQuadrantFormat(body.format)) throw new GameError("invalid_request");
  const cards = cardIds(body.card_instance_ids);
  const { quadrant, catalog } = await load();
  const matchId = check(
    await admin.rpc("match_create_quadrant_bot", {
      p_user: userId,
      p_difficulty: difficulty,
      p_format: body.format,
      p_card_instance_ids: cards,
      p_bot_definition_ids: buildBotTeam(difficulty, catalog.characters, quadrant.deckSize, rng).map((c) => c.definitionId),
    }),
  ) as string;
  // The bot may open: its first card goes down straight away.
  const { loaded, quadrant: state } = await loadMatch(userId, matchId);
  return playQuadrantBotTurns(matchId, state!, loaded.catalog, difficulty, await stateFor(matchId, "a"));
}

async function playQuadrantBotMoveFor(userId: string, body: Record<string, unknown>) {
  const matchId = body.match_id;
  const placement = quadrantPlacementOf(body.placement);
  if (typeof matchId !== "string") throw new GameError("invalid_request");

  const { loaded, match, quadrant, deadline } = await loadMatch(userId, matchId);
  const difficulty = match.bot_difficulty;
  if (!difficulty || !quadrant) throw new GameError("match_not_found");
  if (body.move !== quadrant.moves.length + 1) throw new GameError("round_already_resolved");
  if (quadrantSideToMove(quadrant) !== "a") throw new GameError("not_your_turn");

  const expired = Date.now() > deadline + loaded.graceSeconds * 1000;
  if (placement === null && !expired) throw new GameError("round_not_expired");

  const record = async (playerPlacement: QuadrantPlacement | null) => {
    let played;
    try {
      played = playQuadrantMove({ state: quadrant, placement: playerPlacement, rng });
    } catch (cause) {
      // A card out of the hand, a cell that is not free or not next to a card.
      if (cause instanceof Error && cause.message === "invalid_placement") throw new GameError("invalid_placement");
      throw cause;
    }
    return { played, saved: await recordQuadrantMove(matchId, quadrant, played, "a") };
  };

  let attempt = await record(expired ? null : placement);
  // Clocks can disagree by a moment: if the database says the time is up, the move
  // is played at random for the player, as the rules require.
  if (attempt.saved.error?.message === "round_expired") attempt = await record(null);
  const payload = check(attempt.saved);
  return playQuadrantBotTurns(matchId, attempt.played.state, loaded.catalog, difficulty, payload);
}

/** Quadrante between players: the move of the side whose turn it is, resolved at once. */
async function submitQuadrant(userId: string, body: Record<string, unknown>) {
  const placement = quadrantPlacementOf(body.placement);
  if (typeof body.match_id !== "string" || placement === null || typeof body.move !== "number") {
    throw new GameError("invalid_request");
  }
  check(
    await admin.rpc("match_submit_quadrant", {
      p_user: userId,
      p_match_id: body.match_id,
      p_move: body.move,
      p_card_instance_id: placement.characterId,
      p_x: placement.x,
      p_y: placement.y,
      p_rotation: placement.rotation,
    }),
  );
  return resolvePvpRound(userId, body.match_id);
}

/** A story mission: the database builds the match from the mission, then it plays as any bot match. */
async function startStoryMission(userId: string, body: Record<string, unknown>) {
  if (typeof body.mission !== "string") throw new GameError("invalid_request");
  const cards = cardIds(body.card_instance_ids);
  const matchId = check(
    await admin.rpc("story_create_match", { p_user: userId, p_mission_code: body.mission, p_card_instance_ids: cards }),
  ) as string;
  return stateFor(matchId, "a");
}

// ---------------------------------------------------------------------------
// Matches between players
// ---------------------------------------------------------------------------

async function joinLobby(userId: string, body: Record<string, unknown>) {
  if (typeof body.code !== "string") throw new GameError("invalid_request");
  const cards = cardIds(body.card_instance_ids);
  // The lobby says the format: both plans are sent, the database uses the right one.
  const matchId = check(
    await withBossTable((loaded) =>
      admin.rpc("match_join_lobby", {
        p_guest: userId,
        p_code: body.code,
        p_team: cards,
        p_threat_ids: planThreats(loaded),
        p_boss_values: drawBossValues(rng, loaded.boss),
      }),
    ),
  ) as string;
  return stateFor(matchId, "b");
}

async function joinQueue(userId: string, body: Record<string, unknown>) {
  const cards = cardIds(body.card_instance_ids);
  const mode = body.mode === "conquest" ? "conquest" : "friendly";
  // Conquest: the bot is described on every call, and the database starts it
  // only once the wait is over, so a refresh is a single request.
  const argsFor = (loaded: Loaded): Record<string, unknown> => {
    if (mode === "conquest") {
      const difficulty = pickOne(rng, DIFFICULTIES);
      const plan = planBotMatch({ rules: loaded.rules, catalog: loaded.catalog, difficulty, teamDifficulty: "medium", rng });
      return {
        p_threat_ids: plan.threats.map((t) => t.id),
        p_bot_difficulty: difficulty,
        p_bot_definition_ids: plan.botTeam.map((c) => c.definitionId),
      };
    }
    // A Grande Minaccia between players: the database draws the boss when it pairs them.
    if (body.format === "boss") {
      return { p_threat_ids: planThreats(loaded), p_format: "boss", p_boss_values: drawBossValues(rng, loaded.boss) };
    }
    // An Allarme Triplo between players: the database draws the threats and shuffles the decks.
    if (body.format === "triple") {
      return { p_threat_ids: planThreats(loaded), p_format: "triple" };
    }
    // A Quadrante between players: the database draws abilities and first side, and shuffles the decks.
    if (isQuadrantFormat(body.format)) {
      return { p_threat_ids: null, p_format: body.format };
    }
    return { p_threat_ids: planThreats(loaded) };
  };
  const { data, error } = await withBossTable((loaded) =>
    admin.rpc("match_queue_join", { p_user: userId, p_mode: mode, p_team: cards, ...argsFor(loaded) }),
  );
  if (error) throw new Error(error.message);
  return { matched: Boolean(data), match_id: data ?? null };
}

/**
 * Resolves the current round when both players have chosen or the time is
 * up. Safe to call from both clients at once: the database accepts one result.
 */
async function resolvePvpRound(userId: string, matchId: string) {
  const { loaded, match, side, state, boss, triple, quadrant, pending, deadline } = await loadMatch(userId, matchId);
  if (match.bot_difficulty) throw new GameError("match_not_found");

  const pendingOf = (pendingSide: Side) => pending.find((p) => p.side === pendingSide) ?? null;
  const expired = Date.now() > deadline + loaded.graceSeconds * 1000;

  let saved;
  if (quadrant) {
    // Only the side whose turn it is plays: its choice, or a random move once the time is up.
    const mover = quadrantSideToMove(quadrant);
    if (mover === null) return stateFor(matchId, side);
    const choice = pendingOf(mover);
    const placement =
      choice && choice.cell_x != null && choice.cell_y != null && choice.rotation != null
        ? { characterId: choice.card_instance_id, x: choice.cell_x, y: choice.cell_y, rotation: choice.rotation }
        : null;
    if (placement === null && !expired) return stateFor(matchId, side);
    const played = playQuadrantMove({ state: quadrant, placement, rng });
    saved = await recordQuadrantMove(matchId, quadrant, played, side);
  } else if (triple) {
    // A side has placed when its choice is there for every contest of the round.
    const first = triple.rounds.length * triple.threats.length + 1;
    const placementOfSide = (placeSide: Side) => {
      const ids = triple.threats.map(
        (_, slot) => pending.find((p) => p.side === placeSide && p.round === first + slot)?.card_instance_id,
      );
      return ids.every((id): id is string => typeof id === "string") ? ids : null;
    };
    const choices = { a: placementOfSide("a"), b: placementOfSide("b") };
    if ((choices.a === null || choices.b === null) && !expired) return stateFor(matchId, side);
    const played = playTriplePvpRound({ state: triple, choices, families: loaded.catalog.families, rng });
    saved = await recordTripleRound(matchId, triple, played, side);
  } else if ((pendingOf("a") === null || pendingOf("b") === null) && !expired) {
    return stateFor(matchId, side);
  } else if (boss) {
    const choiceOf = (choiceSide: Side) => {
      const p = pendingOf(choiceSide);
      return p && p.front_slot !== null ? { characterId: p.card_instance_id, front: p.front_slot - 1 } : null;
    };
    const played = playBossPvpTurn({ state: boss, choices: { a: choiceOf("a"), b: choiceOf("b") }, families: loaded.catalog.families, rng });
    saved = await recordBossTurn(matchId, boss, played, side);
  } else {
    const choices = { a: pendingOf("a")?.card_instance_id ?? null, b: pendingOf("b")?.card_instance_id ?? null };
    const played = playPvpRound({ state: state!, choices, families: loaded.catalog.families, rng });
    saved = await recordRound(matchId, state!, played, side);
  }
  if (!saved.error) return saved.data;
  // Someone else resolved it first, or our clock ran slightly ahead: fine.
  if (!["round_already_resolved", "match_not_active", "round_not_expired"].includes(saved.error.message)) {
    throw new Error(saved.error.message);
  }
  return stateFor(matchId, side);
}

/** Allarme Triplo between players: the cards of the round, one per threat, in one choice. */
async function submitTriple(userId: string, body: Record<string, unknown>) {
  const placement = placementOf(body.card_instance_ids);
  if (typeof body.match_id !== "string" || placement === null || typeof body.round !== "number") {
    throw new GameError("invalid_request");
  }
  const status = check(
    await admin.rpc("match_submit_triple", {
      p_user: userId,
      p_match_id: body.match_id,
      p_round: body.round,
      p_card_instance_ids: placement,
    }),
  );
  if (status === "ready") return resolvePvpRound(userId, body.match_id);
  return check(await admin.rpc("match_state_for_user", { p_match_id: body.match_id, p_user: userId }));
}

async function submitChoice(userId: string, body: Record<string, unknown>) {
  if (typeof body.match_id !== "string" || typeof body.card_instance_id !== "string" || typeof body.round !== "number") {
    throw new GameError("invalid_request");
  }
  // Grande Minaccia: the choice also names a front (0-based here, 1-based in the database).
  const front = frontOf(body.front);
  const status = check(
    await admin.rpc("match_submit_play", {
      p_user: userId,
      p_match_id: body.match_id,
      p_round: body.round,
      p_card_instance_id: body.card_instance_id,
      ...(front === null ? {} : { p_front_slot: front + 1 }),
    }),
  );
  if (status === "ready") return resolvePvpRound(userId, body.match_id);
  return check(await admin.rpc("match_state_for_user", { p_match_id: body.match_id, p_user: userId }));
}

// ---------------------------------------------------------------------------
// Emergenza (daily solo challenge)
// ---------------------------------------------------------------------------

/** The first request of the day draws the threats; the database keeps that draw for everyone. */
async function ensureEmergencyDay(loaded: Loaded) {
  const threats = drawEmergencyThreats(rng, loaded.emergencyCatalog, loaded.emergency);
  const { error } = await admin.rpc("emergency_ensure_day", { p_threat_ids: threats.map((t) => t.id) });
  if (error) throw new Error(error.message);
}

async function emergencyState(userId: string) {
  return check(await admin.rpc("emergency_state_payload", { p_user: userId }));
}

type EmergencyContext = {
  run: { id: string; status: string; current_round: number; card_instance_ids: string[]; definition_ids: string[] } | null;
  threat_ids: string[] | null;
  plays: { card_instance_id: string; passed: boolean }[];
};

async function openEmergency(userId: string) {
  await ensureEmergencyDay(await load());
  return emergencyState(userId);
}

async function startEmergency(userId: string, body: Record<string, unknown>) {
  const cards = cardIds(body.card_instance_ids);
  await ensureEmergencyDay(await load());
  const { error } = await admin.rpc("emergency_start", { p_user: userId, p_card_instance_ids: cards });
  if (error) throw new Error(error.message);
  return emergencyState(userId);
}

async function playEmergency(userId: string, body: Record<string, unknown>) {
  const choice = body.card_instance_id;
  if (typeof choice !== "string" || typeof body.round !== "number") throw new GameError("invalid_request");

  // Today's attempt in one request: the game day comes from the database, never computed here.
  const [loaded, context] = await Promise.all([load(), admin.rpc("emergency_play_context", { p_user: userId })]);
  const { run, threat_ids: threatIds, plays } = check(context) as EmergencyContext;
  if (!run || !threatIds) throw new GameError("emergency_not_started");
  if (run.status !== "active") throw new GameError("emergency_already_played");
  if (run.current_round !== body.round) throw new GameError("round_already_resolved");

  const squad = run.definition_ids.map((definitionId, i) => {
    const definition = loaded.definitions.get(definitionId);
    if (!definition) throw new Error(`Unknown card definition ${definitionId}`);
    return toCharacter(definition, run.card_instance_ids[i]);
  });
  const threat = loaded.threats.get(threatIds[run.current_round - 1]);
  if (!threat) throw new Error("Unknown threat of the day");

  const character = squad.find((c) => c.id === choice);
  if (!character || plays.some((p) => p.card_instance_id === choice)) throw new GameError("character_not_available");

  // Plays come in round order: play i answered the threat of round i + 1.
  const attempts: EmergencyAttempt[] = plays.map((p, i) => ({
    character: squad.find((c) => c.id === p.card_instance_id)!,
    passed: p.passed,
    level: loaded.threats.get(threatIds[i])!.level,
  }));
  const outcome = resolveEmergencyPlay({
    character,
    threat,
    squad,
    attempts,
    rules: loaded.emergency,
    families: loaded.catalog.families,
    threatLevels: threatIds.map((id) => loaded.threats.get(id)!.level),
  });

  return check(
    await admin.rpc("emergency_record_play_state", {
      p_user: userId,
      p_round: run.current_round,
      p_card_instance_id: choice,
      p_base: outcome.score.base,
      p_bonus: outcome.score.bonus,
      p_score: outcome.score.total,
      p_required: outcome.required,
    }),
  );
}

// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) throw new GameError("not_authenticated");
    const { data, error } = await admin.auth.getClaims(token);
    const userId = data?.claims?.sub;
    if (error || typeof userId !== "string") throw new GameError("not_authenticated");

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    switch (body.action) {
      case "start":
        return json(await startBotMatch(userId, body));
      case "play":
        return json(await playBotMatchRound(userId, body));
      case "boss_start":
        return json(await startBossBotMatch(userId, body));
      case "boss_play":
        return json(await playBossBotTurnFor(userId, body));
      case "triple_start":
        return json(await startTripleBotMatch(userId, body));
      case "triple_play":
        return json(await playTripleBotRoundFor(userId, body));
      case "triple_submit":
        return json(await submitTriple(userId, body));
      case "quadrant_start":
        return json(await startQuadrantBotMatch(userId, body));
      case "quadrant_play":
        return json(await playQuadrantBotMoveFor(userId, body));
      case "quadrant_submit":
        return json(await submitQuadrant(userId, body));
      case "story_start":
        return json(await startStoryMission(userId, body));
      case "join_lobby":
        return json(await joinLobby(userId, body));
      case "queue":
        return json(await joinQueue(userId, body));
      case "submit":
        return json(await submitChoice(userId, body));
      case "resolve":
        if (typeof body.match_id !== "string") throw new GameError("invalid_request");
        return json(await resolvePvpRound(userId, body.match_id));
      case "emergency_open":
        return json(await openEmergency(userId));
      case "emergency_start":
        return json(await startEmergency(userId, body));
      case "emergency_play":
        return json(await playEmergency(userId, body));
      default:
        throw new GameError("invalid_request");
    }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    if (cause instanceof GameError || CLIENT_ERRORS.has(message)) return json({ error: message }, 400);
    console.error("match function failed", cause);
    return json({ error: "internal_error" }, 500);
  }
});
