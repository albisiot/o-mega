// Edge Function "match": authoritative matches (SPEC §5, §10.1), against bots
// and between players. Thin I/O layer around packages/game-engine:
// authenticate the caller, load the data, let the engine decide, store the
// result through the service-only database functions (which re-check the
// round order, the submitted choices and the final result).

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  computeAbilityMeans,
  drawEmergencyThreats,
  drawThreatLevels,
  pickOne,
  pickThreats,
  planBotMatch,
  playBotRound,
  playPvpRound,
  resolveEmergencyPlay,
  type BotDifficulty,
  type BotMatchCatalog,
  type Character,
  type EmergencyAttempt,
  type EmergencyRules,
  type MatchResult,
  type MatchRules,
  type MatchState,
  type Rng,
  type RoundRecord,
  type Side,
  type Threat,
  type ThreatModifier,
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
  graceSeconds: number;
  catalog: BotMatchCatalog;
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
    admin.from("threat_definitions").select("id, level, required_abilities, is_active"),
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
  const threatRows = check(threats) as { id: string; level: number; required_abilities: string[]; is_active: boolean }[];
  const activeCharacters = definitionRows.filter((d) => d.is_active).map((d) => toCharacter(d));
  const threatList = threatRows.map((t) => ({ id: t.id, level: t.level, abilities: t.required_abilities, active: t.is_active }));

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
    graceSeconds: value("match.timeout_grace_seconds"),
    catalog: {
      characters: activeCharacters,
      threatCatalog: threatList.filter((t) => t.active).map(({ id, level, abilities }) => ({ id, level, abilities })),
      families: Object.fromEntries(check(abilities).map((a) => [a.code, a.family])),
      abilityMeans: computeAbilityMeans(activeCharacters),
    },
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
};

type MatchContext = {
  side: Side;
  match: {
    status: string;
    bot_difficulty: BotDifficulty | null;
    current_round: number;
    threat_ids: string[];
    threat_modifiers: (ThreatModifier | null)[];
  };
  teams: { side: Side; card_instance_ids: string[] | null; definition_ids: string[] }[];
  rounds: { round: number; deadline_at: string; winner_side: string | null; resolved_at: string | null }[];
  plays: PlayRow[];
  /** Choices already submitted for the current round (matches between players). */
  pending: { side: Side; card_instance_id: string }[];
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
    teams: { a: team("a"), b: team("b") },
    rounds: resolved,
  };
  const current = roundRows.find((r) => r.round === match.current_round)!;
  return { loaded, match, side, state, pending, deadline: Date.parse(current.deadline_at) };
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
  if (!difficulty) throw new GameError("match_not_found");
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
  const loaded = await load();
  const matchId = check(
    await admin.rpc("match_join_lobby", {
      p_guest: userId,
      p_code: body.code,
      p_team: cards,
      p_threat_ids: planThreats(loaded),
    }),
  ) as string;
  return stateFor(matchId, "b");
}

async function joinQueue(userId: string, body: Record<string, unknown>) {
  const cards = cardIds(body.card_instance_ids);
  const mode = body.mode === "conquest" ? "conquest" : "friendly";
  const loaded = await load();
  // Conquest: the bot is described on every call, and the database starts it
  // only once the wait is over, so a refresh is a single request.
  let args: Record<string, unknown>;
  if (mode === "conquest") {
    const difficulty = pickOne(rng, DIFFICULTIES);
    const plan = planBotMatch({ rules: loaded.rules, catalog: loaded.catalog, difficulty, teamDifficulty: "medium", rng });
    args = {
      p_threat_ids: plan.threats.map((t) => t.id),
      p_bot_difficulty: difficulty,
      p_bot_definition_ids: plan.botTeam.map((c) => c.definitionId),
    };
  } else {
    args = { p_threat_ids: planThreats(loaded) };
  }
  const { data, error } = await admin.rpc("match_queue_join", { p_user: userId, p_mode: mode, p_team: cards, ...args });
  if (error) throw new Error(error.message);
  return { matched: Boolean(data), match_id: data ?? null };
}

/**
 * Resolves the current round when both players have chosen or the time is
 * up. Safe to call from both clients at once: the database accepts one result.
 */
async function resolvePvpRound(userId: string, matchId: string) {
  const { loaded, match, side, state, pending, deadline } = await loadMatch(userId, matchId);
  if (match.bot_difficulty) throw new GameError("match_not_found");

  const choices = {
    a: pending.find((p) => p.side === "a")?.card_instance_id ?? null,
    b: pending.find((p) => p.side === "b")?.card_instance_id ?? null,
  };
  const expired = Date.now() > deadline + loaded.graceSeconds * 1000;
  if ((choices.a === null || choices.b === null) && !expired) return stateFor(matchId, side);

  const played = playPvpRound({ state, choices, families: loaded.catalog.families, rng });
  const saved = await recordRound(matchId, state, played, side);
  if (!saved.error) return saved.data;
  // Someone else resolved it first, or our clock ran slightly ahead: fine.
  if (!["round_already_resolved", "match_not_active", "round_not_expired"].includes(saved.error.message)) {
    throw new Error(saved.error.message);
  }
  return stateFor(matchId, side);
}

async function submitChoice(userId: string, body: Record<string, unknown>) {
  if (typeof body.match_id !== "string" || typeof body.card_instance_id !== "string" || typeof body.round !== "number") {
    throw new GameError("invalid_request");
  }
  const status = check(
    await admin.rpc("match_submit_play", {
      p_user: userId,
      p_match_id: body.match_id,
      p_round: body.round,
      p_card_instance_id: body.card_instance_id,
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
  const threats = drawEmergencyThreats(rng, loaded.catalog.threatCatalog, loaded.emergency);
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
