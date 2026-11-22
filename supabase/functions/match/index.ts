// Edge Function "match": authoritative matches (SPEC §5, §10.1), against bots
// and between players. Thin I/O layer around packages/game-engine:
// authenticate the caller, load the data, let the engine decide, store the
// result through the service-only database functions (which re-check the
// round order, the submitted choices and the final result).

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildBotTeam,
  buildChallengeBotTeam,
  computeAbilityMeans,
  cutCoopRounds,
  playCoopRound,
  drawChallengeThreats,
  parseChallengeRules,
  parseMatchRules,
  simulateChallenge,
  drawBossValues,
  drawEmergencyThreats,
  drawMatchThreats,
  pickOne,
  placeModifier,
  withRuleAbilities,
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
  planRankedGhost,
  resolveEmergencyPlay,
  type BossRules,
  type BossState,
  type BossTurnRecord,
  type BotDifficulty,
  type BotMatchCatalog,
  type Character,
  type ChallengeMatchRules,
  type ChallengeRules,
  type CoopCardPlacement,
  type CoopRoundRecord,
  type CoopRules,
  type CoopState,
  type ModifierNumbers,
  type PlacedThreat,
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
  type RankedLadderStep,
  type RareThreat,
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
  "emergency_week_already_played",
  "emergency_week_not_started",
  "invalid_emergency_week_squad",
  "story_mission_not_found",
  "story_mission_locked",
  "invalid_front",
  "boss_not_found",
  "invalid_placement",
  "not_your_turn",
  "no_ranked_opponent",
  // Sfide a tema (SPEC §8.8)
  "challenge_not_found",
  "challenge_closed",
  "challenge_format_unsupported",
  "challenge_bot_not_allowed",
  "challenge_daily_limit",
  "challenge_card_not_admitted",
  "challenge_variants_required",
  "challenge_online_not_allowed",
  "challenge_level_too_low",
  "challenge_starter_not_allowed",
  "challenge_over_budget",
  "challenge_rarity_limit",
  "challenge_too_few_factions",
  "challenge_emergency_already_played",
  "challenge_emergency_not_started",
  "invalid_bot_team",
  "not_admin",
  // Operazioni (SPEC §5.17)
  "coop_room_not_found",
  // A mode switched off from the EDITOR, or outside its dates (raised by the database on start).
  "mode_unavailable",
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
  /** Emergenza della settimana (SPEC §5.16); null until the database has its keys. */
  emergencyWeek: EmergencyRules | null;
  boss: BossRules;
  triple: TripleRules;
  quadrant: QuadrantRules;
  /** Operazioni (SPEC §5.17); null until the database has its keys. The Panic limit is a room of two's. */
  coop: CoopRules | null;
  /** The Panic limit from three players on (the room of two's until the database has the key). */
  coopPanicCrowd: number | null;
  /** Fixed grid with border threats: the seals a card loses to a higher threat (SPEC §5.14). */
  quadrantBorders: { bite: number };
  graceSeconds: number;
  /**
   * Classificata (SPEC §8.7): how the server's opponent plays and builds its team,
   * league by league. Empty until the database has the keys: ranked queues refuse then.
   */
  rankedLadder: RankedLadderStep[];
  catalog: BotMatchCatalog;
  /** Usual threats of Nuova Megara only: Emergenza never draws the places beyond it. */
  emergencyCatalog: Threat[];
  /** The usual threats with their places, for the match rules of a Sfida a tema (SPEC §8.8). */
  placedThreats: PlacedThreat[];
  /** The numbers of the drawn modifiers, for the challenges' simulator. */
  modifierNumbers: ModifierNumbers;
  /** The rare threats (SPEC §5.15), with their chance: in every mode that draws threats. */
  rareCatalog: RareThreat[];
  definitions: Map<string, Definition>;
  threats: Map<string, Threat>;
};

let cache: { loaded: Loaded; at: number } | null = null;

/** The leagues of the Classificata, in order (balance.ts `ranked.leagues`). */
const RANKED_LEAGUES = ["recluta", "vigilante", "veterano", "asso", "leggenda", "omega"] as const;

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
  const [definitions, rarities, threats, abilities, config, threatRarities] = await Promise.all([
    admin.from("card_definitions").select("id, faction, rarity_code, stats, power_code, power_params, is_active, in_packs, unlock_level"),
    admin.from("rarity_definitions").select("code, rank"),
    admin
      .from("threat_definitions")
      .select("id, level, required_abilities, is_active, region, modifier_code, modifier_params, rarity_code, emergency_target"),
    admin.from("ability_definitions").select("code, family"),
    admin.from("game_config").select("key, value"),
    admin.from("threat_rarities").select("code, one_in"),
  ]);
  const values = new Map(check(config).map((row) => [row.key, Number(row.value)]));
  const value = (key: string) => {
    const v = values.get(key);
    if (v === undefined || !Number.isFinite(v)) throw new Error(`missing game_config key: ${key}`);
    return v;
  };

  const ranks = new Map((check(rarities) as { code: string; rank: number }[]).map((r) => [r.code, r.rank]));
  const definitionRows = (
    check(definitions) as (Omit<Definition, "rarity_rank"> & {
      rarity_code: string;
      is_active: boolean;
      in_packs: boolean;
      unlock_level: number | null;
    })[]
  ).map(
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
    rarity_code: string | null;
    emergency_target: number | null;
  }[];
  const oneIn = new Map((check(threatRarities) as { code: string; one_in: number }[]).map((r) => [r.code, r.one_in]));
  const activeCharacters = definitionRows.filter((d) => d.is_active).map((d) => toCharacter(d));
  // Bots, ghosts and challenge bots field only characters that packs can give (is_pack_card): a
  // character an admin holds back (in_packs false) or a level card stays out of every bot team, so
  // Conquista cannot hand it out. Teams already saved (a Story mission, a challenge's given squad)
  // are read from `definitions`.
  const teamCharacters = definitionRows
    .filter((d) => d.is_active && d.in_packs && d.unlock_level === null)
    .map((d) => toCharacter(d));
  const rankedLadder = RANKED_LEAGUES.every((league) => values.has(`ranked.ghosts.${league}.team_cap`))
    ? RANKED_LEAGUES.map((league) => ({
        from: value(`ranked.leagues.${league}`),
        difficultyFrom: value(`ranked.ghosts.${league}.difficulty_from`),
        difficultyTo: value(`ranked.ghosts.${league}.difficulty_to`),
        shareFrom: value(`ranked.ghosts.${league}.share_from`),
        shareTo: value(`ranked.ghosts.${league}.share_to`),
        teamCap: value(`ranked.ghosts.${league}.team_cap`),
      }))
    : [];
  const places = {
    longCountBonus: value("places.long_count_bonus"),
    frostCap: value("places.frost_cap"),
    duelCount: value("places.duel_count"),
    rare: {
      hostileBonus: value("threat_modifiers.hostile_bonus"),
      hostileMalus: value("threat_modifiers.hostile_malus"),
      underdogBonus: value("threat_modifiers.underdog_bonus"),
      underdogMalus: value("threat_modifiers.underdog_malus"),
      underdogCommonMaxRank: value("threat_modifiers.underdog_common_max_rank"),
      underdogEliteMinRank: value("threat_modifiers.underdog_elite_min_rank"),
      allOrNothingMin: value("rare_threats.all_or_nothing_min"),
      lastFirstBonus: value("rare_threats.last_first_bonus"),
      lastFirstTopRank: value("rare_threats.last_first_top_rank"),
      priceMaxValue: value("rare_threats.price_max_value"),
      priceMalus: value("rare_threats.price_malus"),
      countMin: value("rare_threats.count_min"),
      countPoints: value("rare_threats.count_points"),
      negativeMax: value("cards.ability_max"),
    },
  };
  const threatList = threatRows.map((t) => ({
    id: t.id,
    level: t.level,
    abilities: t.required_abilities,
    active: t.is_active,
    region: t.region,
    // A place's own rule: the bots plan future rounds knowing it.
    modifier: placeModifier(t.modifier_code, t.modifier_params, places),
    rarity: t.rarity_code,
    target: t.emergency_target,
  }));
  const activeThreats = threatList.filter((t) => t.active && !t.rarity);
  const rareCatalog: RareThreat[] = threatList
    .filter((t) => t.active && t.rarity)
    .map(({ id, level, abilities, modifier, rarity, target }) => ({ id, level, abilities, modifier, rarity, target, oneIn: oneIn.get(rarity!) ?? 0 }));

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
    emergencyWeek: values.has("emergency_week.threats_per_run")
      ? {
          threatsPerRun: value("emergency_week.threats_per_run"),
          maxFailures: value("emergency_week.max_failures"),
          targets: Object.fromEntries([1, 2, 3, 4, 5, 6].map((level) => [level, value(`emergency_week.targets.level${level}`)])),
          threatLevels: {
            min: value("match.threat_levels.min"),
            max: value("match.threat_levels.max"),
            requireOneAtMost: value("match.threat_levels.require_one_at_most"),
            requireOneAtLeast: value("match.threat_levels.require_one_at_least"),
            minSum: value("emergency_week.threat_levels.min_sum"),
            maxSum: value("emergency_week.threat_levels.max_sum"),
          },
        }
      : null,
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
      firstPlayerSeals: value("quadrant.first_player_seals"),
    },
    quadrantBorders: {
      bite: value("quadrant.fixed_grid_threats.bite"),
    },
    coop: values.has("coop.panic_limit")
      ? {
          cityRounds: value("coop.city_rounds"),
          squadSize: value("coop.squad_size"),
          bossCards: value("coop.boss_cards"),
          targets: Object.fromEntries([1, 2, 3, 4, 5, 6].map((level) => [level, value(`coop.targets.level${level}`)])),
          bossTargets: Object.fromEntries([1, 2, 3, 4, 5, 6].map((level) => [level, value(`coop.boss_targets.level${level}`)])),
          panicLimit: value("coop.panic_limit"),
          panicLow: value("coop.panic_low"),
          panicHigh: value("coop.panic_high"),
          panicHighFromLevel: value("coop.panic_high_from_level"),
          panicReinforced: value("coop.panic_reinforced"),
        }
      : null,
    coopPanicCrowd: values.has("coop.panic_limit_crowd") ? value("coop.panic_limit_crowd") : null,
    graceSeconds: value("match.timeout_grace_seconds"),
    rankedLadder,
    catalog: {
      characters: teamCharacters,
      threatCatalog: activeThreats.map(({ id, level, abilities, modifier }) => ({ id, level, abilities, modifier })),
      rareCatalog,
      families: Object.fromEntries(check(abilities).map((a) => [a.code, a.family])),
      abilityMeans: computeAbilityMeans(activeCharacters),
    },
    emergencyCatalog: activeThreats
      .filter((t) => t.region === "megara")
      .map(({ id, level, abilities }) => ({ id, level, abilities })),
    placedThreats: activeThreats.map(({ id, level, abilities, modifier, region }) => ({ id, level, abilities, modifier, region })),
    modifierNumbers: {
      hostileBonus: value("threat_modifiers.hostile_bonus"),
      hostileMalus: value("threat_modifiers.hostile_malus"),
      underdogBonus: value("threat_modifiers.underdog_bonus"),
      underdogMalus: value("threat_modifiers.underdog_malus"),
      underdogCommonMaxRank: value("threat_modifiers.underdog_common_max_rank"),
      underdogEliteMinRank: value("threat_modifiers.underdog_elite_min_rank"),
    },
    definitions: new Map(definitionRows.map((d) => [d.id, d])),
    rareCatalog,
    threats: new Map(threatList.map(({ id, level, abilities, rarity, target }) => [id, { id, level, abilities, rarity, target }])),
  };
  cache = { loaded, at: Date.now() };
  return loaded;
}

/** The usual draw, then the rare threats that turn up, if any (SPEC §5.15). */
function planThreats(loaded: Loaded): string[] {
  return drawMatchThreats(rng, loaded.catalog.threatCatalog, loaded.rareCatalog, loaded.rules).map((t) => t.id);
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
    /** Fixed grid: the border threats in side order (top, right, bottom, left); null without them. */
    quadrant_threats?: { threat_id: string; value: number }[] | null;
    /** Events: the first side with this many seals on the grid wins; null without a target. */
    quadrant_seal_target?: number | null;
    /**
     * Against the server's opponent (side b; Classificata, Sfide a tema online): its difficulty, and whether it
     * has chosen in the current round or move by now. Null in every other match.
     */
    ghost?: { difficulty: BotDifficulty; ready: boolean } | null;
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
      // Al buio, Eco, Livello ignoto: the abilities the match drew.
      return withRuleAbilities({ ...threat, modifier: match.threat_modifiers[i] ?? null });
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
  // Border threats only on the fixed grid, and only on the matches that drew them.
  const borders = match.format === "quadrant" && match.quadrant_threats?.length === 4 ? match.quadrant_threats : null;
  return {
    rules: {
      ...loaded.quadrant,
      ...(borders ? { borderThreats: borders.map((t) => t.value), borderBite: loaded.quadrantBorders.bite } : {}),
      sealTarget: match.quadrant_seal_target ?? null,
    },
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

/**
 * Plays the bot's moves while it is its turn: at the start when it opens, after each move
 * of the player. Answers with the last state and, in `previous`, the states before it
 * (`last` first), so the screen can show the player's move before the bot's.
 */
async function playQuadrantBotTurns(
  matchId: string,
  state: QuadrantState,
  catalog: BotMatchCatalog,
  difficulty: BotDifficulty,
  last: unknown,
) {
  let current = state;
  const steps: unknown[] = [last];
  while (quadrantSideToMove(current) === "b") {
    const placement = chooseQuadrantBotPlacement(quadrantBotView(current, "b", catalog), difficulty, rng);
    const played = playQuadrantMove({ state: current, placement, rng });
    steps.push(check(await recordQuadrantMove(matchId, current, played, "a")));
    current = played.state;
  }
  const final = steps.at(-1) as Record<string, unknown>;
  return { ...final, previous: steps.slice(0, -1) };
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
    return withRuleAbilities({ ...threat, modifier: match.threat_modifiers[i] ?? null });
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
        // Where the bonus comes from, for the result page: the database checks they add up.
        ...(play.parts ? { parts: play.parts } : {}),
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
      // Where the bonus comes from, for the result page: the database checks they add up.
      ...(play.parts ? { parts: play.parts } : {}),
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
      // Where the bonus comes from, for the result page: the database checks they add up.
      ...(play.parts ? { parts: play.parts } : {}),
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
  if (body.challenge_id !== undefined) return startChallengeBotMatch(userId, body.challenge_id, difficulty, cards, "classic");

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
// Sfide a tema against a bot (SPEC §8.8)
// ---------------------------------------------------------------------------

/** What a challenge tells the Edge Function before a match against its bot (challenge_bot_context). */
type ChallengeBotContext = {
  format: string;
  admitted_definition_ids: string[] | null;
  rules: Record<string, unknown> | null;
  match_rules: Record<string, unknown> | null;
  supplied_definition_ids: string[] | null;
  rarity_ranks: Record<string, number> | null;
};

/** A character's rarity code, from its rank (the database's rarity_definitions). */
function rarityOfRank(ranks: Record<string, number> | null): (character: Character) => string {
  const codes = new Map(Object.entries(ranks ?? {}).map(([code, rank]) => [rank, code]));
  return (character) => codes.get(character.rarityRank) ?? "";
}

/** The threats of a Classica in a challenge: its match rules (SPEC §8.8), else the usual draw. */
function challengeThreats(loaded: Loaded, matchRules: ChallengeMatchRules): string[] {
  return drawChallengeThreats(rng, loaded.placedThreats, loaded.rareCatalog, loaded.rules, matchRules).map((t) => t.id);
}

/**
 * A match in a Sfida a tema: the database says whether the player can start one (open, the
 * bot allowed, the matches of the day) and which characters its bot may use; the engine builds
 * the bot's team among them, within the composition rules, and draws Classica's threats with
 * the match rules; the database creates the match of the challenge's mode, checking the squad
 * against the rules it copies onto the match. With a squad given by the challenge, the player
 * fields it and the bot none of its characters.
 */
async function startChallengeBotMatch(
  userId: string,
  challengeId: unknown,
  difficulty: BotDifficulty,
  cards: string[],
  format: "classic" | "boss" | "triple" | "quadrant" | "quadrant_shifting",
) {
  if (typeof challengeId !== "string") throw new GameError("invalid_request");
  const context = check(
    await admin.rpc("challenge_bot_context", { p_user: userId, p_challenge_id: challengeId, p_difficulty: difficulty }),
  ) as ChallengeBotContext;
  // The team screen opened the challenge from its mode: another mode is a stale link.
  if (context.format !== format) throw new GameError("challenge_format_unsupported");

  const loaded = await load();
  const size = teamSizeOf(loaded, format);
  const supplied = new Set(context.supplied_definition_ids ?? []);
  const admitted = context.admitted_definition_ids ? new Set(context.admitted_definition_ids) : null;
  const usable = loaded.catalog.characters.filter((character) => !supplied.has(character.definitionId));
  const pool = admitted ? usable.filter((character) => admitted.has(character.definitionId)) : null;
  // The rules always admit a squad; should the bots' catalog hold fewer, the bot takes the whole catalog.
  const characters = pool && pool.length >= size ? pool : usable;
  const rules: ChallengeRules = parseChallengeRules(context.rules);
  const botTeam = buildChallengeBotTeam(difficulty, characters, size, rng, rules, rarityOfRank(context.rarity_ranks));
  // Classica draws its threats here; the Grande Minaccia its points table; the other modes in the database.
  const threats = format === "classic" ? challengeThreats(loaded, parseMatchRules(context.match_rules)) : null;
  const create = (current: Loaded) =>
    admin.rpc("challenge_create_bot_match", {
      p_user: userId,
      p_challenge_id: challengeId,
      p_difficulty: difficulty,
      p_card_instance_ids: cards,
      p_bot_definition_ids: botTeam.map((c) => c.definitionId),
      p_threat_ids: threats,
      p_boss_values: format === "boss" ? drawBossValues(rng, current.boss) : null,
    });
  const matchId = check(format === "boss" ? await withBossTable(create) : await create(loaded)) as string;
  if (isQuadrantFormat(format)) {
    // The bot may open: its first card goes down straight away.
    const { loaded: again, quadrant: state } = await loadMatch(userId, matchId);
    return playQuadrantBotTurns(matchId, state!, again.catalog, difficulty, await stateFor(matchId, "a"));
  }
  return stateFor(matchId, "a");
}

/** What a challenge tells the Edge Function before its online queue (challenge_online_context). */
type ChallengeOnlineContext = {
  format: string;
  match_rules: Record<string, unknown> | null;
  bot_difficulties: BotDifficulty[];
  rules: Record<string, unknown> | null;
  admitted_definition_ids: string[] | null;
  rarity_ranks: Record<string, number> | null;
};

/** The bots the server's opponent of a challenge may play as: the challenge's, or the first three. */
const CHALLENGE_GHOST_DIFFICULTIES: BotDifficulty[] = ["easy", "medium", "hard"];

/**
 * A Sfida a tema online (SPEC §8.8): its own queue, any two players of the challenge. The
 * database knows the challenge's mode: both plans are sent, it uses the right one. Nobody free
 * after a while, the server's opponent comes, as in the Classificata (SPEC §8.7): it is described
 * on every call (a bot of the challenge's levels, its squad within the challenge's rules) and the
 * database starts it only once the wait is over.
 */
async function joinChallengeQueue(userId: string, body: Record<string, unknown>) {
  if (typeof body.challenge_id !== "string") throw new GameError("invalid_request");
  const cards = cardIds(body.card_instance_ids);
  const context = check(
    await admin.rpc("challenge_online_context", { p_user: userId, p_challenge_id: body.challenge_id }),
  ) as ChallengeOnlineContext;
  const { data, error } = await withBossTable((loaded) => {
    const size = teamSizeOf(loaded, context.format);
    const difficulty = pickOne(rng, context.bot_difficulties.length > 0 ? context.bot_difficulties : CHALLENGE_GHOST_DIFFICULTIES);
    const admitted = context.admitted_definition_ids ? new Set(context.admitted_definition_ids) : null;
    const pool = admitted ? loaded.catalog.characters.filter((character) => admitted.has(character.definitionId)) : null;
    const characters = pool && pool.length >= size ? pool : loaded.catalog.characters;
    const team = buildChallengeBotTeam(difficulty, characters, size, rng, parseChallengeRules(context.rules), rarityOfRank(context.rarity_ranks));
    return admin.rpc("challenge_queue_join", {
      p_user: userId,
      p_challenge_id: body.challenge_id,
      p_team: cards,
      // Classica's threats keep the challenge's match rules.
      p_threat_ids: context.format === "classic" ? challengeThreats(loaded, parseMatchRules(context.match_rules)) : planThreats(loaded),
      p_boss_values: drawBossValues(rng, loaded.boss),
      p_bot_difficulty: difficulty,
      p_bot_definition_ids: team.map((c) => c.definitionId),
    });
  });
  if (error) throw new Error(error.message);
  return { matched: Boolean(data), match_id: data ?? null };
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
  if (body.challenge_id !== undefined) return startChallengeBotMatch(userId, body.challenge_id, difficulty, cards, "boss");

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
  if (body.challenge_id !== undefined) return startChallengeBotMatch(userId, body.challenge_id, difficulty, cards, "triple");
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
  if (body.challenge_id !== undefined) return startChallengeBotMatch(userId, body.challenge_id, difficulty, cards, body.format);
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

/** Characters of a team of a format: classic and Grande Minaccia 5, Allarme Triplo 9, Quadrante 10. */
function teamSizeOf(loaded: Loaded, format: unknown): number {
  if (format === "triple") return loaded.triple.rounds * loaded.triple.threats;
  if (isQuadrantFormat(format)) return loaded.quadrant.deckSize;
  return loaded.rules.teamSize;
}

async function joinQueue(userId: string, body: Record<string, unknown>) {
  if (body.challenge_id !== undefined) return joinChallengeQueue(userId, body);
  const cards = cardIds(body.card_instance_ids);
  const mode = body.mode === "conquest" ? "conquest" : body.mode === "ranked" ? "ranked" : "friendly";
  // Classificata (SPEC §8.7): the player's Fama and team, to plan the server's opponent.
  const ranked =
    mode === "ranked"
      ? (check(await admin.rpc("ranked_queue_info", { p_user: userId, p_team: cards })) as {
          fama: number;
          definition_ids: string[];
        })
      : null;
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
    // In the ranked queue the server's opponent is described on every call too, from
    // the player's Fama and team; the database starts it only once the wait is over.
    const ghost = (): Record<string, unknown> => {
      if (!ranked) return {};
      if (loaded.rankedLadder.length === 0) throw new GameError("invalid_request");
      const playerTeam = ranked.definition_ids.flatMap((id) => {
        const definition = loaded.definitions.get(id);
        return definition ? [toCharacter(definition)] : [];
      });
      const plan = planRankedGhost({
        fama: ranked.fama,
        ladder: loaded.rankedLadder,
        catalog: loaded.catalog.characters,
        size: teamSizeOf(loaded, body.format),
        playerTeam,
        rng,
      });
      return { p_bot_difficulty: plan.difficulty, p_bot_definition_ids: plan.team.map((c) => c.definitionId) };
    };
    // A Grande Minaccia between players: the database draws the boss when it pairs them.
    if (body.format === "boss") {
      return { p_threat_ids: planThreats(loaded), p_format: "boss", p_boss_values: drawBossValues(rng, loaded.boss), ...ghost() };
    }
    // An Allarme Triplo between players: the database draws the threats and shuffles the decks.
    if (body.format === "triple") {
      return { p_threat_ids: planThreats(loaded), p_format: "triple", ...ghost() };
    }
    // A Quadrante between players: the database draws abilities and first side, and shuffles the decks.
    if (isQuadrantFormat(body.format)) {
      return { p_threat_ids: null, p_format: body.format, ...ghost() };
    }
    return { p_threat_ids: planThreats(loaded), ...ghost() };
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
  // Against the server's opponent (side b, the player is a; Classificata and Sfide a tema
  // online): it plays with the bots of the mode, and only once its moment to choose has
  // come, drawn by the database always before the deadline (SPEC §8.7). Clients ask here
  // every few seconds while they wait for it, as they cannot tell it from a person.
  const ghost = match.ghost ?? null;

  let saved;
  if (quadrant && ghost && quadrantSideToMove(quadrant) === "b") {
    if (!ghost.ready && !expired) return stateFor(matchId, side);
    const placement = chooseQuadrantBotPlacement(quadrantBotView(quadrant, "b", loaded.catalog), ghost.difficulty, rng);
    saved = await recordQuadrantMove(matchId, quadrant, playQuadrantMove({ state: quadrant, placement, rng }), side);
  } else if (triple && ghost) {
    const first = triple.rounds.length * triple.threats.length + 1;
    const ids = triple.threats.map((_, slot) => pending.find((p) => p.side === "a" && p.round === first + slot)?.card_instance_id);
    const mine = ids.every((id): id is string => typeof id === "string") ? ids : null;
    if ((mine === null || !ghost.ready) && !expired) return stateFor(matchId, side);
    const played = playTripleBotRound({ state: triple, catalog: loaded.catalog, difficulty: ghost.difficulty, playerSide: "a", playerChoice: mine, rng });
    saved = await recordTripleRound(matchId, triple, played, side);
  } else if (boss && ghost) {
    const p = pendingOf("a");
    const mine = p && p.front_slot !== null ? { characterId: p.card_instance_id, front: p.front_slot - 1 } : null;
    if ((mine === null || !ghost.ready) && !expired) return stateFor(matchId, side);
    const played = playBossBotTurn({ state: boss, catalog: loaded.catalog, difficulty: ghost.difficulty, playerSide: "a", playerChoice: mine, rng });
    saved = await recordBossTurn(matchId, boss, played, side);
  } else if (state && ghost) {
    const mine = pendingOf("a")?.card_instance_id ?? null;
    if ((mine === null || !ghost.ready) && !expired) return stateFor(matchId, side);
    const played = playBotRound({ state, catalog: loaded.catalog, difficulty: ghost.difficulty, playerSide: "a", playerChoice: mine, rng });
    saved = await recordRound(matchId, state, played, side);
  } else if (quadrant) {
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
  check(
    await admin.rpc("match_submit_triple", {
      p_user: userId,
      p_match_id: body.match_id,
      p_round: body.round,
      p_card_instance_ids: placement,
    }),
  );
  return resolveAfterChoice(userId, body.match_id);
}

/**
 * After a choice the round is resolved when it is ready: both players have chosen, or the
 * opponent is the server's (Classificata, Sfide a tema online) and its moment has come. Only
 * here is that known (`match_round_context`, `match.ghost`), never from the client, which
 * cannot tell the server's opponent from a person. Otherwise the answer is the state.
 */
function resolveAfterChoice(userId: string, matchId: string) {
  return resolvePvpRound(userId, matchId);
}

async function submitChoice(userId: string, body: Record<string, unknown>) {
  if (typeof body.match_id !== "string" || typeof body.card_instance_id !== "string" || typeof body.round !== "number") {
    throw new GameError("invalid_request");
  }
  // Grande Minaccia: the choice also names a front (0-based here, 1-based in the database).
  const front = frontOf(body.front);
  check(
    await admin.rpc("match_submit_play", {
      p_user: userId,
      p_match_id: body.match_id,
      p_round: body.round,
      p_card_instance_id: body.card_instance_id,
      ...(front === null ? {} : { p_front_slot: front + 1 }),
    }),
  );
  return resolveAfterChoice(userId, body.match_id);
}

// ---------------------------------------------------------------------------
// Emergenza: the daily solo challenge (SPEC §5.10) and the weekly one (SPEC §5.16).
// Both run on the same engine; each has its own rules and its own database functions.
// ---------------------------------------------------------------------------

type EmergencyKind = {
  rules: (loaded: Loaded) => EmergencyRules;
  /** Sent with every database call: the challenge of an Emergenza a tema. */
  params?: Record<string, unknown>;
  /** Stores the first draw of the day (or of the week) for everyone. */
  ensure: string;
  start: string;
  context: string;
  state: string;
  notStarted: string;
  alreadyPlayed: string;
  /** Stores a play scored by the engine and answers with the state. */
  record: string;
};

const DAILY_EMERGENCY: EmergencyKind = {
  rules: (loaded) => loaded.emergency,
  ensure: "emergency_ensure_day",
  start: "emergency_start",
  context: "emergency_play_context",
  state: "emergency_state_payload",
  notStarted: "emergency_not_started",
  alreadyPlayed: "emergency_already_played",
  record: "emergency_record_play_state",
};

const WEEKLY_EMERGENCY: EmergencyKind = {
  rules: (loaded) => {
    if (!loaded.emergencyWeek) throw new Error("missing game_config key: emergency_week.threats_per_run");
    return loaded.emergencyWeek;
  },
  ensure: "emergency_week_ensure",
  start: "emergency_week_start",
  context: "emergency_week_play_context",
  state: "emergency_week_state_payload",
  notStarted: "emergency_week_not_started",
  alreadyPlayed: "emergency_week_already_played",
  record: "emergency_week_record_play",
};

/**
 * An Emergenza a tema (SPEC §8.8): one run per player while the challenge lasts; 8 threats play
 * as the daily one, 10 as the weekly one. The database checks the challenge on every call.
 */
async function challengeEmergencyKind(userId: string, challengeId: unknown): Promise<EmergencyKind> {
  if (typeof challengeId !== "string") throw new GameError("invalid_request");
  const info = check(
    await admin.rpc("challenge_emergency_info", { p_user: userId, p_challenge_id: challengeId }),
  ) as { threats: number };
  return {
    rules: (loaded) => {
      const base = info.threats === 8 ? loaded.emergency : WEEKLY_EMERGENCY.rules(loaded);
      return { ...base, threatsPerRun: info.threats };
    },
    params: { p_challenge_id: challengeId },
    ensure: "challenge_emergency_ensure",
    start: "challenge_emergency_start",
    context: "challenge_emergency_play_context",
    state: "challenge_emergency_state_payload",
    notStarted: "challenge_emergency_not_started",
    alreadyPlayed: "challenge_emergency_already_played",
    record: "challenge_emergency_record_play",
  };
}

/** The first request of the day (or of the week) draws the threats; the database keeps that draw for everyone. */
async function ensureEmergencyThreats(loaded: Loaded, kind: EmergencyKind) {
  const threats = drawEmergencyThreats(
    rng,
    loaded.emergencyCatalog,
    kind.rules(loaded),
    loaded.rareCatalog.filter((t) => t.target !== null && t.target !== undefined),
  );
  const { error } = await admin.rpc(kind.ensure, { ...kind.params, p_threat_ids: threats.map((t) => t.id) });
  if (error) throw new Error(error.message);
}

async function emergencyState(userId: string, kind: EmergencyKind) {
  return check(await admin.rpc(kind.state, { ...kind.params, p_user: userId }));
}

type EmergencyContext = {
  run: { id: string; status: string; current_round: number; card_instance_ids: string[]; definition_ids: string[] } | null;
  threat_ids: string[] | null;
  /** The fixed rules of the threats drawn (rare threats; the others have none). */
  threat_modifiers: (ThreatModifier | null)[] | null;
  /** `score` and `required`: how far each play was from its target (Riscossa sullo scarto). */
  plays: { card_instance_id: string; passed: boolean; score?: number; required?: number }[];
};

async function openEmergency(userId: string, kind: EmergencyKind) {
  await ensureEmergencyThreats(await load(), kind);
  return emergencyState(userId, kind);
}

async function startEmergency(userId: string, body: Record<string, unknown>, kind: EmergencyKind) {
  const cards = cardIds(body.card_instance_ids);
  await ensureEmergencyThreats(await load(), kind);
  const { error } = await admin.rpc(kind.start, { ...kind.params, p_user: userId, p_card_instance_ids: cards });
  if (error) throw new Error(error.message);
  return emergencyState(userId, kind);
}

async function playEmergency(userId: string, body: Record<string, unknown>, kind: EmergencyKind) {
  const choice = body.card_instance_id;
  if (typeof choice !== "string" || typeof body.round !== "number") throw new GameError("invalid_request");

  // The attempt in one request: the game day (or week) comes from the database, never computed here.
  const [loaded, context] = await Promise.all([load(), admin.rpc(kind.context, { ...kind.params, p_user: userId })]);
  const { run, threat_ids: threatIds, threat_modifiers: modifiers, plays } = check(context) as EmergencyContext;
  // A threat of the run as it plays: with its fixed rule and what the rule drew.
  const runThreat = (i: number) => {
    const threat = loaded.threats.get(threatIds![i]);
    if (!threat) throw new Error("Unknown threat of the Emergenza");
    return withRuleAbilities({ ...threat, modifier: modifiers?.[i] ?? null });
  };
  if (!run || !threatIds) throw new GameError(kind.notStarted);
  if (run.status !== "active") throw new GameError(kind.alreadyPlayed);
  if (run.current_round !== body.round) throw new GameError("round_already_resolved");

  const squad = run.definition_ids.map((definitionId, i) => {
    const definition = loaded.definitions.get(definitionId);
    if (!definition) throw new Error(`Unknown card definition ${definitionId}`);
    return toCharacter(definition, run.card_instance_ids[i]);
  });
  const threat = runThreat(run.current_round - 1);

  const character = squad.find((c) => c.id === choice);
  if (!character || plays.some((p) => p.card_instance_id === choice)) throw new GameError("character_not_available");

  // Plays come in round order: play i answered the threat of round i + 1.
  const attempts: EmergencyAttempt[] = plays.map((p, i) => ({
    character: squad.find((c) => c.id === p.card_instance_id)!,
    passed: p.passed,
    level: runThreat(i).level,
    ...(typeof p.score === "number" && typeof p.required === "number" ? { margin: p.score - p.required } : {}),
  }));
  const outcome = resolveEmergencyPlay({
    character,
    threat,
    squad,
    attempts,
    rules: kind.rules(loaded),
    families: loaded.catalog.families,
    threatLevels: threatIds.map((_, i) => runThreat(i).level),
  });

  return check(
    await admin.rpc(kind.record, {
      ...kind.params,
      p_user: userId,
      p_round: run.current_round,
      p_card_instance_id: choice,
      p_base: outcome.score.base,
      p_bonus: outcome.score.bonus,
      p_score: outcome.score.total,
      p_required: outcome.required,
      // Where the bonus comes from, for the result page: the database checks they add up.
      p_parts: outcome.score.parts ?? null,
    }),
  );
}

// ---------------------------------------------------------------------------
// Operazioni (SPEC §5.17): every member may ask to resolve the round being played, once
// everyone is ready or the time is up. The engine scores it, the database re-checks it.
// The answer says only whether it was resolved: members read the room with coop_state.
// ---------------------------------------------------------------------------

type CoopContext = {
  room: { id: string; status: string; players: number | null; current_round: number } | null;
  member: boolean;
  deadline_at: string | null;
  ready: boolean;
  members: { user_id: string; card_instance_ids: string[] | null; definition_ids: string[] | null; placement: { card: string; slot: number }[] | null }[];
  rival_definition_ids: string[];
  written: { threat_ids: string[]; reinforced: number }[];
  records: (Omit<CoopRoundRecord, "threats" | "eco"> & { results: CoopRoundRecord["threats"]; eco: CoopRoundRecord["eco"] })[];
};

async function resolveCoopRoundFor(userId: string, body: Record<string, unknown>) {
  if (typeof body.room_id !== "string") throw new GameError("invalid_request");
  const [loaded, context] = await Promise.all([load(), admin.rpc("coop_round_context", { p_user: userId, p_room: body.room_id })]);
  const ctx = check(context) as CoopContext;
  if (!ctx.room || !ctx.member) throw new GameError("coop_room_not_found");
  if (ctx.room.status !== "active" || !ctx.deadline_at || !ctx.room.players) return { resolved: false, status: ctx.room.status };
  if (!loaded.coop) throw new Error("missing game_config key: coop.panic_limit");
  const expired = Date.now() > Date.parse(ctx.deadline_at) + loaded.graceSeconds * 1000;
  if (!ctx.ready && !expired) return { resolved: false, status: "active" };

  const character = (definitionId: string, id = definitionId) => {
    const definition = loaded.definitions.get(definitionId);
    if (!definition) throw new Error(`Unknown card definition ${definitionId}`);
    return toCharacter(definition, id);
  };
  const threat = (id: string) => {
    const found = loaded.threats.get(id);
    if (!found) throw new Error("Unknown threat of the operation");
    return found;
  };
  const players = ctx.room.players;
  const state: CoopState = {
    // The room's Panic limit: lower from three players on (coop_panic_limit in the database).
    rules: { ...loaded.coop, panicLimit: players > 2 && loaded.coopPanicCrowd !== null ? loaded.coopPanicCrowd : loaded.coop.panicLimit },
    players: ctx.members.map((m) => ({
      id: m.user_id,
      squad: (m.definition_ids ?? []).map((definitionId, i) => character(definitionId, m.card_instance_ids![i])),
    })),
    rival: ctx.rival_definition_ids.map((id) => character(id)),
    rounds: cutCoopRounds(
      ctx.written.map((w) => ({ threats: w.threat_ids.map(threat), reinforced: w.reinforced })),
      ctx.room.players,
    ),
    records: ctx.records.map(({ results, ...record }) => ({ ...record, threats: results })),
  };
  // A placement counts as sent, Pronto or not (SPEC §5.17); the server puts down only the missing ones.
  const choices: Record<string, CoopCardPlacement[] | null> = Object.fromEntries(
    ctx.members.map((m) => [m.user_id, m.placement ? m.placement.map((p) => ({ characterId: p.card, slot: p.slot })) : null]),
  );
  const played = playCoopRound({ state, choices, families: loaded.catalog.families, rng });
  const { error } = await admin.rpc("coop_record_round", {
    p_room: ctx.room.id,
    p_round: ctx.room.current_round,
    p_record: {
      plays: played.record.plays,
      results: played.record.threats,
      eco: played.record.eco,
      panic: played.record.panic,
    },
  });
  if (!error) return { resolved: true, status: played.result === null ? "active" : played.result };
  // Someone else resolved it first, a placement changed meanwhile, or our clock ran ahead: fine.
  if (["round_already_resolved", "match_not_active", "round_not_expired", "coop_placement_changed"].includes(error.message)) {
    return { resolved: false, status: "active" };
  }
  throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// The simulator of the Sfide a tema (SPEC §8.8): admins only, a draft of the Editor
// ---------------------------------------------------------------------------

/** Most simulated matches in one request, by bot: the Edge Function has about 2 s of CPU. */
const SIMULATION_BATCH: Record<BotDifficulty, number> = { easy: 60, medium: 60, hard: 8, super_pro: 1 };

/**
 * Plays a batch of simulated Classica matches of an unsaved challenge against one bot: the
 * Editor asks again until it has enough. Admins only (admin_users, read with the service key).
 */
async function simulateChallengeFor(userId: string, body: Record<string, unknown>) {
  const { data: adminRow, error: adminError } = await admin.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
  if (adminError) throw new Error(adminError.message);
  if (!adminRow) throw new GameError("not_admin");
  const difficulty = body.difficulty as BotDifficulty;
  if (!DIFFICULTIES.includes(difficulty)) throw new GameError("invalid_difficulty");
  const requested = typeof body.matches === "number" && Number.isInteger(body.matches) ? body.matches : SIMULATION_BATCH[difficulty];
  const matches = Math.max(1, Math.min(requested, SIMULATION_BATCH[difficulty]));
  const rawRules = body.rules && typeof body.rules === "object" ? body.rules : {};
  const codes = Array.isArray(body.supplied_codes) ? body.supplied_codes.map(String) : [];

  const [loaded, context] = await Promise.all([
    load(),
    admin.rpc("challenge_simulation_context", { p_rules: rawRules, p_supplied_codes: codes }),
  ]);
  const { rules, admitted_definition_ids: admittedIds, rarity_ranks: ranks, supplied_definition_ids: suppliedIds } = check(context) as {
    rules: Record<string, unknown>;
    admitted_definition_ids: string[];
    rarity_ranks: Record<string, number>;
    supplied_definition_ids: string[];
  };
  // A given squad may hold characters the bots never field: read it from every definition.
  const supplied = suppliedIds.map((id) => {
    const definition = loaded.definitions.get(id);
    return definition ? toCharacter(definition) : undefined;
  });
  if (codes.length > 0 && (supplied.length !== loaded.rules.teamSize || supplied.some((c) => c === undefined))) {
    throw new GameError("invalid_request");
  }
  const admittedSet = new Set(admittedIds);
  const suppliedSet = new Set(suppliedIds);
  const admitted = loaded.catalog.characters.filter((c: Character) => admittedSet.has(c.definitionId));
  const usable = loaded.catalog.characters.filter((c: Character) => !suppliedSet.has(c.definitionId));
  const given = suppliedIds.length > 0 ? (supplied as Character[]) : null;
  const followRules = body.bot_follows_rules !== false && !given;
  const botPool = followRules && admitted.length >= loaded.rules.teamSize ? admitted : usable;
  const matchRules = body.match_rules && typeof body.match_rules === "object" ? (body.match_rules as Record<string, unknown>) : {};
  return simulateChallenge({
    rules: loaded.rules,
    knowledge: loaded.catalog,
    threatCatalog: loaded.placedThreats,
    rareCatalog: loaded.rareCatalog,
    admitted,
    botPool,
    supplied: given,
    squadRules: given ? parseChallengeRules({}) : parseChallengeRules(rules),
    rarityOf: rarityOfRank(ranks),
    matchRules: parseMatchRules(matchRules),
    modifierNumbers: loaded.modifierNumbers,
    difficulty,
    matches,
    rng,
  });
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
        return json(await openEmergency(userId, DAILY_EMERGENCY));
      case "emergency_start":
        return json(await startEmergency(userId, body, DAILY_EMERGENCY));
      case "emergency_play":
        return json(await playEmergency(userId, body, DAILY_EMERGENCY));
      case "emergency_week_open":
        return json(await openEmergency(userId, WEEKLY_EMERGENCY));
      case "emergency_week_start":
        return json(await startEmergency(userId, body, WEEKLY_EMERGENCY));
      case "emergency_week_play":
        return json(await playEmergency(userId, body, WEEKLY_EMERGENCY));
      case "challenge_emergency_open":
        return json(await openEmergency(userId, await challengeEmergencyKind(userId, body.challenge_id)));
      case "challenge_emergency_start":
        return json(await startEmergency(userId, body, await challengeEmergencyKind(userId, body.challenge_id)));
      case "challenge_emergency_play":
        return json(await playEmergency(userId, body, await challengeEmergencyKind(userId, body.challenge_id)));
      case "challenge_simulate":
        return json(await simulateChallengeFor(userId, body));
      case "coop_resolve":
        return json(await resolveCoopRoundFor(userId, body));
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
