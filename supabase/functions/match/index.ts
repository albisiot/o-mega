// Edge Function "match": authoritative matches against bots (SPEC §5.9, §10.1).
// Thin I/O layer around packages/game-engine: authenticate the caller, load
// the data, let the engine decide, store the result through the service-only
// database functions (which re-check the round order and the result).

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  computeAbilityMeans,
  planBotMatch,
  playBotRound,
  type BotDifficulty,
  type BotMatchCatalog,
  type Character,
  type MatchRules,
  type MatchState,
  type Rng,
  type RoundRecord,
  type Threat,
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
  "character_not_available",
  "character_already_played",
  "invalid_team_size",
  "duplicate_card",
  "duplicate_character",
  "card_not_owned",
  "profile_not_found",
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

// ---------------------------------------------------------------------------
// Catalog and rules (cached for a minute per isolate)
// ---------------------------------------------------------------------------

type Definition = { id: string; stats: Record<string, number>; power_code: string | null; power_params: Record<string, string | number> };
type Loaded = {
  rules: MatchRules;
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
    stats: definition.stats,
    power: definition.power_code ? { code: definition.power_code, params: definition.power_params ?? {} } : null,
  };
}

async function load(): Promise<Loaded> {
  if (cache && Date.now() - cache.at < 60_000) return cache.loaded;
  const [definitions, threats, abilities, config] = await Promise.all([
    admin.from("card_definitions").select("id, stats, power_code, power_params, is_active"),
    admin.from("threat_definitions").select("id, level, required_abilities, is_active"),
    admin.from("ability_definitions").select("code, family"),
    admin.from("game_config").select("key, value").like("key", "match.%"),
  ]);
  const values = new Map(check(config).map((row) => [row.key, Number(row.value)]));
  const value = (key: string) => {
    const v = values.get(key);
    if (v === undefined || !Number.isFinite(v)) throw new Error(`missing game_config key: ${key}`);
    return v;
  };

  const definitionRows = check(definitions) as (Definition & { is_active: boolean })[];
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

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

const DIFFICULTIES: BotDifficulty[] = ["easy", "medium", "hard"];

async function stateFor(matchId: string) {
  return check(await admin.rpc("match_state_payload", { p_match_id: matchId, p_side: "a" }));
}

async function startMatch(userId: string, body: Record<string, unknown>) {
  const difficulty = body.difficulty as BotDifficulty;
  if (!DIFFICULTIES.includes(difficulty)) throw new GameError("invalid_difficulty");
  const cards = body.card_instance_ids;
  if (!Array.isArray(cards) || !cards.every((id) => typeof id === "string")) throw new GameError("invalid_request");

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
  return stateFor(matchId);
}

type PlayRow = {
  round: number;
  side: "a" | "b";
  card_instance_id: string | null;
  definition_id: string;
  base_score: number;
  bonus: number;
  score: number;
  highest_value: number;
  auto_played: boolean;
};

/** Rebuilds the full engine state of a match from the database. */
async function loadMatch(userId: string, matchId: string, loaded: Loaded) {
  const match = (await admin.from("matches").select("*").eq("id", matchId).maybeSingle()).data;
  if (!match || match.player_a !== userId || match.mode !== "bot") throw new GameError("match_not_found");
  if (match.status !== "active") throw new GameError("match_not_active");

  const [teams, rounds, plays] = await Promise.all([
    admin.from("match_teams").select("side, card_instance_ids, definition_ids").eq("match_id", matchId),
    admin.from("match_rounds").select("round, deadline_at, winner_side, resolved_at").eq("match_id", matchId).order("round"),
    admin.from("round_plays").select("*").eq("match_id", matchId),
  ]);
  const teamRows = check(teams) as { side: "a" | "b"; card_instance_ids: string[] | null; definition_ids: string[] }[];
  const definitionOf = (id: string) => {
    const definition = loaded.definitions.get(id);
    if (!definition) throw new Error(`Unknown card definition ${id}`);
    return definition;
  };
  const team = (side: "a" | "b") => {
    const row = teamRows.find((t) => t.side === side)!;
    return row.definition_ids.map((definitionId, i) =>
      toCharacter(definitionOf(definitionId), row.card_instance_ids?.[i] ?? definitionId),
    );
  };

  const playRows = check(plays) as PlayRow[];
  const roundRows = check(rounds) as { round: number; deadline_at: string; winner_side: string | null; resolved_at: string | null }[];
  const resolved: RoundRecord[] = roundRows
    .filter((r) => r.resolved_at)
    .map((r) => {
      const playOf = (side: "a" | "b") => {
        const p = playRows.find((row) => row.round === r.round && row.side === side)!;
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
    threats: (match.threat_ids as string[]).map((id) => {
      const threat = loaded.threats.get(id);
      if (!threat) throw new Error(`Unknown threat ${id}`);
      return threat;
    }),
    teams: { a: team("a"), b: team("b") },
    rounds: resolved,
  };
  const current = roundRows.find((r) => r.round === match.current_round)!;
  return { match, state, deadline: Date.parse(current.deadline_at) };
}

async function playRound(userId: string, body: Record<string, unknown>) {
  const matchId = body.match_id;
  const choice = body.card_instance_id ?? null;
  if (typeof matchId !== "string" || (choice !== null && typeof choice !== "string")) {
    throw new GameError("invalid_request");
  }

  const loaded = await load();
  const { match, state, deadline } = await loadMatch(userId, matchId, loaded);
  if (body.round !== match.current_round) throw new GameError("round_already_resolved");

  const expired = Date.now() > deadline + loaded.graceSeconds * 1000;
  if (choice === null && !expired) throw new GameError("round_not_expired");

  const record = async (playerChoice: string | null) => {
    const played = playBotRound({
      state,
      catalog: loaded.catalog,
      difficulty: match.bot_difficulty as BotDifficulty,
      playerSide: "a",
      playerChoice,
      rng,
    });
    const { a, b } = played.round.plays;
    const definitionA = state.teams.a.find((c) => c.id === a.characterId)!.definitionId;
    return admin.rpc("match_record_round", {
      p_match_id: matchId,
      p_round: played.round.round,
      p_play_a: {
        card_instance_id: a.characterId, definition_id: definitionA,
        base: a.base, bonus: a.bonus, score: a.total, highest: a.highest, auto_played: a.autoPlayed,
      },
      p_play_b: {
        definition_id: b.characterId,
        base: b.base, bonus: b.bonus, score: b.total, highest: b.highest, auto_played: b.autoPlayed,
      },
      p_winner_side: played.round.winner,
      p_result: played.finished ? played.result : null,
    });
  };

  let saved = await record(expired ? null : (choice as string));
  // Clocks can disagree by a moment: if the database says the time is up,
  // the round is played for the player, as the rules require.
  if (saved.error?.message === "round_expired") saved = await record(null);
  if (saved.error) throw new Error(saved.error.message);
  return stateFor(matchId);
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
        return json(await startMatch(userId, body));
      case "play":
        return json(await playRound(userId, body));
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
