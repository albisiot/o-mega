import type { AchievementTier } from "@/lib/achievements";
import { describeRandomVariants, ruleInfo, ruleToSend, type RandomVariantsRule } from "@/lib/random-variants";
import { DIFFICULTY_LABELS } from "@/lib/match";
import { getSupabase } from "@/lib/supabase/client";
import type { Json } from "@/types/database";

// The catalog of the Imprese for admins (SPEC §8.5). What an impresa counts is one of the
// metrics below with its filters; the server checks them again (achievement_params_valid).

export type AchievementMetric =
  | "matches_played"
  | "matches_won"
  | "comeback_wins"
  | "upset_rounds"
  | "close_rounds"
  | "team_wins"
  | "modes_won"
  | "night_matches"
  | "characters_owned"
  | "variants_owned"
  | "variant_styles"
  | "variant_styles_complete"
  | "variant_characters_complete"
  | "cards_conquered"
  | "cards_lost"
  | "duplicates_converted"
  | "packs_opened"
  | "daily_packs"
  | "emergency_passed"
  | "emergency_perfect_runs"
  | "story_missions"
  | "rare_threats_seen"
  | "daily_objectives_completed"
  | "coins_earned"
  | "level"
  | "best_streak"
  | "registered_before"
  | "manual";

export type AchievementParams = Record<string, unknown>;

export type AdminAchievement = {
  id: string;
  name: string;
  description: string;
  hint: string | null;
  tier: AchievementTier;
  metric: AchievementMetric;
  params: AchievementParams;
  target: number;
  coins: number;
  packs: number;
  /** "P051" for the base drawing, "P051:neon" for that variant. */
  card_codes: string[];
  /** Random variants it gives, as saved; null (or missing): none. */
  random_variants?: RandomVariantsRule | null;
  title: string | null;
  position: number;
  is_active: boolean;
  counts_past: boolean;
  counts_from: string | null;
  available_until: string | null;
  /** Players who completed it. */
  completed: number;
};

export type AdminAchievements = {
  players: number;
  achievements: AdminAchievement[];
  cards: { code: string; name: string; rarity: string; variants: { style: string; name: string }[] }[];
  traits: { code: string; name: string; category: string }[];
  styles: { style: string; name: string }[];
  /** The rarities a rule of random variants can name (missing on an older server). */
  rarities?: { code: string; name: string; rank: number; color: string }[];
  chapters: { chapter: number; season: number; number: number; title: string }[];
  seasons: { season: number; title: string }[];
};

export type AchievementDraft = {
  name: string;
  description: string;
  hint: string;
  tier: AchievementTier;
  metric: AchievementMetric;
  params: AchievementParams;
  target: number;
  coins: number;
  packs: number;
  card_codes: string[];
  random_variants?: RandomVariantsRule | null;
  title: string;
  counts_past: boolean;
  /** Last day it can be completed (YYYY-MM-DD, Italian time), or "" for no end. */
  until: string;
  /** Kept when editing an impresa that counts from a date. */
  counts_from?: string | null;
};

/** One filter of a metric, as the form shows it. */
export type ParamField =
  | { key: string; kind: "select"; label: string; options: { value: string; label: string }[] }
  | { key: string; kind: "number"; label: string; min: number; max: number }
  | { key: string; kind: "flag"; label: string }
  | { key: string; kind: "difficulties"; label: string }
  | { key: string; kind: "trait" | "style" | "season" | "chapter" | "date"; label: string };

const FORMAT: ParamField = {
  key: "format",
  kind: "select",
  label: "Formato",
  options: [
    { value: "classic", label: "Partita classica" },
    { value: "boss", label: "Grande Minaccia" },
    { value: "triple", label: "Allarme Triplo" },
    { value: "quadrant", label: "Quadrante" },
  ],
};
const MODE: ParamField = {
  key: "mode",
  kind: "select",
  label: "Tipo",
  options: [
    { value: "conquest", label: "Conquista" },
    { value: "friendly", label: "Amichevole o contro bot" },
  ],
};
const STORY: ParamField = {
  key: "story",
  kind: "select",
  label: "Storia",
  options: [
    { value: "true", label: "Solo missioni della Storia" },
    { value: "false", label: "Fuori dalla Storia" },
  ],
};
const OPPONENT: ParamField = {
  key: "opponent",
  kind: "select",
  label: "Avversario",
  options: [
    { value: "player", label: "Un giocatore" },
    { value: "bot", label: "Un bot" },
  ],
};
const FACTION: ParamField = {
  key: "faction",
  kind: "select",
  label: "Fazione",
  options: [
    { value: "heroes", label: "Supereroi" },
    { value: "villains", label: "Supercattivi" },
    { value: "neutrals", label: "Neutrali" },
  ],
};
const RARITY_OPTIONS = [
  { value: "1", label: "Delta" },
  { value: "2", label: "Gamma" },
  { value: "3", label: "Beta" },
  { value: "4", label: "Alfa" },
  { value: "5", label: "Omega" },
];
const RARITY_NAMES: Record<number, string> = { 1: "Delta", 2: "Gamma", 3: "Beta", 4: "Alfa", 5: "Omega" };

export type MetricInfo = {
  metric: AchievementMetric;
  group: string;
  label: string;
  fields: ParamField[];
  /** What the target counts, under the number. */
  unit: string;
  /** Whether it counts what the player did before (else it is about what they have now). */
  hasDates: boolean;
};

export const METRICS: MetricInfo[] = [
  { metric: "matches_won", group: "Partite", label: "Partite vinte", fields: [FORMAT, MODE, STORY, OPPONENT, { key: "bot_difficulties", kind: "difficulties", label: "Solo bot di difficoltà" }, { key: "flawless", kind: "flag", label: "Solo 3-0" }], unit: "partite", hasDates: true },
  { metric: "matches_played", group: "Partite", label: "Partite giocate", fields: [FORMAT, MODE, STORY, OPPONENT, { key: "bot_difficulties", kind: "difficulties", label: "Solo bot di difficoltà" }], unit: "partite", hasDates: true },
  { metric: "comeback_wins", group: "Partite", label: "Vittorie in rimonta (persi i primi 2 round)", fields: [OPPONENT], unit: "partite", hasDates: true },
  { metric: "upset_rounds", group: "Partite", label: "Round vinti con una carta più debole", fields: [OPPONENT, { key: "max_rarity_rank", kind: "select", label: "La tua carta al massimo", options: RARITY_OPTIONS }, { key: "opponent_min_rarity_rank", kind: "select", label: "Contro una carta almeno", options: RARITY_OPTIONS }], unit: "round", hasDates: true },
  { metric: "close_rounds", group: "Partite", label: "Round vinti per un solo punto", fields: [OPPONENT], unit: "round", hasDates: true },
  { metric: "team_wins", group: "Partite", label: "Vittorie con una squadra tutta uguale", fields: [OPPONENT, FACTION, { key: "trait", kind: "trait", label: "Tratto" }], unit: "partite", hasDates: true },
  { metric: "modes_won", group: "Partite", label: "Modalità diverse vinte", fields: [], unit: "modalità (6 = tutte)", hasDates: true },
  { metric: "night_matches", group: "Partite", label: "Partite finite in una fascia oraria", fields: [{ key: "from_hour", kind: "number", label: "Dalle ore", min: 0, max: 23 }, { key: "to_hour", kind: "number", label: "Alle ore", min: 0, max: 23 }], unit: "partite", hasDates: true },
  { metric: "best_streak", group: "Partite", label: "Vittorie di fila contro giocatori", fields: [], unit: "vittorie di fila", hasDates: false },
  { metric: "characters_owned", group: "Collezione", label: "Personaggi posseduti", fields: [FACTION, { key: "trait", kind: "trait", label: "Tratto" }, { key: "min_rarity_rank", kind: "select", label: "Rarità almeno", options: RARITY_OPTIONS }, { key: "max_rarity_rank", kind: "select", label: "Rarità al massimo", options: RARITY_OPTIONS }, { key: "all", kind: "flag", label: "Tutti (album completo)" }], unit: "personaggi diversi", hasDates: false },
  { metric: "variants_owned", group: "Collezione", label: "Varianti trovate", fields: [{ key: "style", kind: "style", label: "Stile" }], unit: "varianti diverse", hasDates: false },
  { metric: "variant_styles", group: "Collezione", label: "Stili di variante diversi", fields: [], unit: "stili", hasDates: false },
  { metric: "variant_styles_complete", group: "Collezione", label: "Stili completi (tutte le varianti di uno stile)", fields: [], unit: "stili completi", hasDates: false },
  { metric: "variant_characters_complete", group: "Collezione", label: "Personaggi con tutte le varianti", fields: [], unit: "personaggi", hasDates: false },
  { metric: "packs_opened", group: "Collezione", label: "Pacchetti aperti", fields: [], unit: "pacchetti", hasDates: true },
  { metric: "daily_packs", group: "Collezione", label: "Pacchetti del giorno ritirati", fields: [], unit: "giorni", hasDates: true },
  { metric: "duplicates_converted", group: "Collezione", label: "Doppioni convertiti", fields: [], unit: "doppioni", hasDates: true },
  { metric: "cards_conquered", group: "Conquista", label: "Carte conquistate", fields: [{ key: "per_opponent_cap", kind: "number", label: "Al massimo per avversario (vuoto: senza limite)", min: 1, max: 100 }], unit: "carte", hasDates: true },
  { metric: "cards_lost", group: "Conquista", label: "Carte perse in Conquista", fields: [], unit: "carte", hasDates: true },
  { metric: "emergency_passed", group: "Emergenza e Storia", label: "Minacce superate in Emergenza", fields: [], unit: "Minacce", hasDates: true },
  { metric: "emergency_perfect_runs", group: "Emergenza e Storia", label: "Emergenze superate tutte", fields: [{ key: "min_passed", kind: "number", label: "Minacce superate almeno (vuoto: tutte)", min: 1, max: 20 }], unit: "giorni", hasDates: true },
  { metric: "story_missions", group: "Emergenza e Storia", label: "Missioni della Storia completate", fields: [{ key: "season", kind: "season", label: "Stagione" }, { key: "chapter", kind: "chapter", label: "Capitolo" }, { key: "all", kind: "flag", label: "Tutte (stagione o capitolo completo)" }], unit: "missioni", hasDates: false },
  { metric: "rare_threats_seen", group: "Emergenza e Storia", label: "Minacce rare avvistate", fields: [{ key: "all", kind: "flag", label: "Tutte (Bestiario completo)" }], unit: "Minacce rare", hasDates: true },
  { metric: "daily_objectives_completed", group: "Altro", label: "Obiettivi del giorno completati", fields: [], unit: "obiettivi", hasDates: true },
  { metric: "coins_earned", group: "Altro", label: "Monete guadagnate in tutto", fields: [], unit: "monete", hasDates: true },
  { metric: "level", group: "Altro", label: "Livello raggiunto", fields: [], unit: "livello", hasDates: false },
  { metric: "registered_before", group: "Altro", label: "Arrivato prima di una data", fields: [{ key: "before", kind: "date", label: "Prima del giorno" }], unit: "", hasDates: false },
  { metric: "manual", group: "Altro", label: "Data a mano dall'editor", fields: [], unit: "", hasDates: false },
];

export function metricInfo(metric: AchievementMetric): MetricInfo {
  return METRICS.find((entry) => entry.metric === metric) ?? METRICS[0];
}

/** Metrics whose target is always 1: they are met or not. */
export function fixedTarget(metric: AchievementMetric, params: AchievementParams): boolean {
  return metric === "registered_before" || metric === "manual" || params.all === true;
}

/** Drops empty filters and turns the form's strings into what the server expects. */
export function cleanParams(metric: AchievementMetric, raw: Record<string, unknown>): AchievementParams {
  const params: AchievementParams = {};
  for (const field of metricInfo(metric).fields) {
    const value = raw[field.key];
    if (value === undefined || value === null || value === "" || value === false) continue;
    if (field.kind === "flag") params[field.key] = true;
    else if (field.kind === "difficulties") {
      if (Array.isArray(value) && value.length > 0) params[field.key] = value;
    } else if (field.key === "story") params.story = value === true || value === "true";
    else if (field.kind === "number" || field.kind === "season" || field.kind === "chapter" || field.key.endsWith("rarity_rank")) {
      const number = Number(value);
      if (Number.isFinite(number)) params[field.key] = number;
    } else params[field.key] = String(value);
  }
  return params;
}

/** What the form needs to check before sending; null when it can be sent. */
export function paramsProblem(metric: AchievementMetric, params: AchievementParams): string | null {
  if (metric === "team_wins" && !params.faction && !params.trait) return "Scegli una fazione o un tratto per la squadra.";
  if (metric === "night_matches") {
    if (typeof params.from_hour !== "number" || typeof params.to_hour !== "number") return "Scegli le ore.";
    if (params.from_hour === params.to_hour) return "Le due ore devono essere diverse.";
  }
  if (metric === "registered_before" && typeof params.before !== "string") return "Scegli il giorno.";
  return null;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

function rarityUpTo(rank: number): string {
  return rank <= 1 ? "Delta" : `${RARITY_NAMES[rank] ?? rank} o meno rara`;
}
function rarityFrom(rank: number): string {
  return rank >= 5 ? "Omega" : `${RARITY_NAMES[rank] ?? rank} o più rara`;
}

function matchFilters(params: AchievementParams): string {
  const parts: string[] = [];
  const format = { classic: " classiche", boss: " a Grande Minaccia", triple: " ad Allarme Triplo", quadrant: " a Quadrante" }[
    String(params.format)
  ];
  if (format) parts.push(format);
  if (params.flawless) parts.push(" 3-0");
  if (params.mode === "conquest") parts.push(" in Conquista");
  if (params.mode === "friendly") parts.push(" fuori dalla Conquista");
  if (params.story === true) parts.push(" della Storia");
  if (params.story === false) parts.push(" fuori dalla Storia");
  if (params.opponent === "player") parts.push(" contro altri giocatori");
  if (params.opponent === "bot") parts.push(" contro un bot");
  if (Array.isArray(params.bot_difficulties) && params.bot_difficulties.length > 0) {
    const names = params.bot_difficulties.map((d) => DIFFICULTY_LABELS[d as keyof typeof DIFFICULTY_LABELS] ?? String(d));
    parts.push(params.opponent === "bot" ? ` ${names.join(" o ")}` : ` contro un bot ${names.join(" o ")}`);
  }
  return parts.join("");
}

const factionPlural: Record<string, string> = { heroes: "Supereroi", villains: "Supercattivi", neutrals: "Neutrali" };

/**
 * The condition in plain Italian, as the player reads it once the impresa is completed
 * ("Hai vinto 3 partite contro altri giocatori."). `names` turns trait, style and chapter
 * codes into names.
 */
export function describeCondition(
  metric: AchievementMetric,
  params: AchievementParams,
  target: number,
  names: { trait?: (code: string) => string; style?: (code: string) => string; chapter?: (chapter: number) => string } = {},
): string {
  const n = target;
  const opponent = params.opponent === "player" ? " contro altri giocatori" : params.opponent === "bot" ? " contro un bot" : "";
  const trait = typeof params.trait === "string" ? (names.trait?.(params.trait) ?? params.trait) : null;
  switch (metric) {
    case "matches_won":
      return `Hai vinto ${n === 1 ? "una partita" : `${n} partite`}${matchFilters(params)}.`.replace(" classiche", n === 1 ? " classica" : " classiche");
    case "matches_played":
      return `Hai giocato ${n === 1 ? "una partita" : `${n} partite`}${matchFilters(params)}.`.replace(" classiche", n === 1 ? " classica" : " classiche");
    case "comeback_wins":
      return `Hai vinto ${n === 1 ? "una partita classica" : `${n} partite classiche`} dopo aver perso i primi due round${opponent}.`;
    case "upset_rounds":
      return `Hai vinto ${n === 1 ? "un round" : `${n} round`} con una carta ${rarityUpTo(Number(params.max_rarity_rank ?? 1))} contro una ${rarityFrom(Number(params.opponent_min_rarity_rank ?? 5))}${opponent}.`;
    case "close_rounds":
      return `Hai vinto ${n === 1 ? "un round" : `${n} round`} per un solo punto${opponent}.`;
    case "team_wins": {
      const who = [params.faction ? `soli ${factionPlural[String(params.faction)] ?? params.faction}` : null, trait ? `tutti con il tratto ${trait}` : null]
        .filter(Boolean)
        .join(", ");
      return `Hai vinto ${n === 1 ? "una partita" : `${n} partite`} con una squadra di ${who || "personaggi uguali"}${opponent}.`;
    }
    case "modes_won":
      return `Hai vinto in ${n} ${plural(n, "modalità", "modalità diverse")}.`;
    case "night_matches":
      return `Hai finito ${n === 1 ? "una partita" : `${n} partite`} tra le ${params.from_hour ?? "?"} e le ${params.to_hour ?? "?"}.`;
    case "best_streak":
      return `Hai vinto ${n} ${plural(n, "partita", "partite di fila")} contro altri giocatori.`;
    case "characters_owned": {
      const filters = [
        params.faction ? (factionPlural[String(params.faction)] ?? String(params.faction)) : null,
        trait ? `con il tratto ${trait}` : null,
        typeof params.min_rarity_rank === "number" ? rarityFrom(params.min_rarity_rank) : null,
        typeof params.max_rarity_rank === "number" ? rarityUpTo(params.max_rarity_rank) : null,
      ].filter(Boolean);
      if (params.all) return `Hai tutti i personaggi${filters.length > 0 ? ` ${filters.join(", ")}` : " dell'album"}.`;
      return `Hai ${n} ${plural(n, "personaggio", "personaggi diversi")}${filters.length > 0 ? ` ${filters.join(", ")}` : ""}.`;
    }
    case "variants_owned": {
      const style = typeof params.style === "string" ? (names.style?.(params.style) ?? params.style) : null;
      return n === 1 ? `Hai trovato una variante${style ? ` ${style}` : ""}.` : `Hai trovato ${n} varianti${style ? ` ${style}` : ""}.`;
    }
    case "variant_styles":
      return `Hai varianti in ${n} ${plural(n, "stile", "stili diversi")}.`;
    case "variant_styles_complete":
      return n === 1 ? "Hai tutte le varianti di uno stile." : `Hai tutte le varianti di ${n} stili.`;
    case "variant_characters_complete":
      return n === 1 ? "Hai tutte le varianti di un personaggio." : `Hai tutte le varianti di ${n} personaggi.`;
    case "packs_opened":
      return n === 1 ? "Hai aperto un pacchetto." : `Hai aperto ${n} pacchetti.`;
    case "daily_packs":
      return `Hai ritirato il pacchetto del giorno ${n} ${plural(n, "volta", "volte")}.`;
    case "duplicates_converted":
      return n === 1 ? "Hai convertito un doppione." : `Hai convertito ${n} doppioni.`;
    case "cards_conquered": {
      const cap = typeof params.per_opponent_cap === "number" ? `, al massimo ${params.per_opponent_cap} per avversario` : "";
      return `Hai conquistato ${n === 1 ? "una carta" : `${n} carte`}${cap}.`;
    }
    case "cards_lost":
      return n === 1 ? "Hai perso la tua prima carta in Conquista." : `Hai perso ${n} carte in Conquista.`;
    case "emergency_passed":
      return `Hai superato ${n === 1 ? "una Minaccia" : `${n} Minacce`} in Emergenza.`;
    case "emergency_perfect_runs": {
      const what = typeof params.min_passed === "number" ? `almeno ${params.min_passed} Minacce dell'Emergenza in un giorno` : "tutte le Minacce dell'Emergenza in un giorno";
      return `Hai superato ${what}${n > 1 ? `, ${n} volte` : ""}.`;
    }
    case "story_missions": {
      const chapter = typeof params.chapter === "number" ? (names.chapter?.(params.chapter) ?? String(params.chapter)) : null;
      const season = typeof params.season === "number" ? params.season : null;
      if (params.all) {
        if (chapter) return `Hai completato tutto il capitolo ${chapter} della Storia.`;
        if (season) return `Hai completato tutta la stagione ${season} della Storia.`;
        return "Hai completato tutta la Storia.";
      }
      const scope = chapter ? ` (capitolo ${chapter})` : season ? ` (stagione ${season})` : "";
      return `Hai completato ${n === 1 ? "una missione" : `${n} missioni`} della Storia${scope}.`;
    }
    case "rare_threats_seen":
      return params.all ? "Hai avvistato tutte le Minacce rare." : n === 1 ? "Hai avvistato una Minaccia rara." : `Hai avvistato ${n} Minacce rare.`;
    case "daily_objectives_completed":
      return n === 1 ? "Hai completato un obiettivo del giorno." : `Hai completato ${n} obiettivi del giorno.`;
    case "coins_earned":
      return `Hai guadagnato ${n} monete in tutto.`;
    case "level":
      return `Hai raggiunto il livello ${n}.`;
    case "registered_before": {
      const before = typeof params.before === "string" ? params.before.split("-").reverse().join("/") : "?";
      return `Sei arrivato a Nuova Megara prima del ${before}.`;
    }
    case "manual":
      return "Te l'ha data l'editor.";
  }
}

/** "50 monete · 1 pacchetto · 2 carte · 1 variante a caso · titolo «X»", or "Solo la medaglia". */
export function describeAdminReward(
  achievement: Pick<AdminAchievement, "coins" | "packs" | "card_codes" | "title" | "random_variants">,
  lists: Partial<Pick<AdminAchievements, "styles" | "rarities">> = {},
): string {
  const parts: string[] = [];
  if (achievement.coins > 0) parts.push(`${achievement.coins} monete`);
  if (achievement.packs > 0) parts.push(achievement.packs === 1 ? "1 pacchetto" : `${achievement.packs} pacchetti`);
  if (achievement.card_codes.length > 0) parts.push(achievement.card_codes.length === 1 ? "1 carta" : `${achievement.card_codes.length} carte`);
  const random = describeRandomVariants(ruleInfo(achievement.random_variants, lists.styles ?? [], lists.rarities ?? []));
  if (random) parts.push(random);
  if (achievement.title) parts.push(`titolo «${achievement.title}»`);
  return parts.length > 0 ? parts.join(" · ") : "Solo la medaglia";
}

/** The order after moving one impresa up (-1) or down (+1); the same order at the ends. */
export function moveInOrder(ids: string[], id: string, step: -1 | 1): string[] {
  const from = ids.indexOf(id);
  const to = from + step;
  if (from < 0 || to < 0 || to >= ids.length) return ids;
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/** "YYYY-MM-DD" of an instant, in Italian time (the end date the form shows). */
export function romeDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );
}

function draftJson(draft: AchievementDraft): Json {
  return {
    name: draft.name,
    description: draft.description,
    hint: draft.hint,
    tier: draft.tier,
    metric: draft.metric,
    params: draft.params as Json,
    target: draft.target,
    coins: draft.coins,
    packs: draft.packs,
    card_codes: draft.card_codes,
    random_variants: ruleToSend(draft.random_variants),
    title: draft.title,
    counts_past: draft.counts_past,
    counts_from: draft.counts_from ?? null,
    // The end of that day in Italy.
    available_until: draft.until ? `${draft.until} 23:59:59 Europe/Rome` : null,
  };
}

export async function fetchAdminAchievements(): Promise<AdminAchievements> {
  const { data, error } = await getSupabase().rpc("admin_list_achievements");
  if (error) throw error;
  return data as unknown as AdminAchievements;
}

export async function saveAdminAchievement(id: string | null, draft: AchievementDraft): Promise<AdminAchievements> {
  // The generated types have no null, but the function takes it: a new impresa.
  const { data, error } = await getSupabase().rpc("admin_save_achievement", { p_id: id as string, p_draft: draftJson(draft) });
  if (error) throw error;
  return data as unknown as AdminAchievements;
}

export async function previewAdminAchievement(draft: AchievementDraft): Promise<{ would_complete: number; players: number }> {
  const { data, error } = await getSupabase().rpc("admin_preview_achievement", { p_draft: draftJson(draft) });
  if (error) throw error;
  return data as unknown as { would_complete: number; players: number };
}

export async function setAdminAchievementActive(id: string, isActive: boolean): Promise<AdminAchievements> {
  const { data, error } = await getSupabase().rpc("admin_set_achievement_active", { p_id: id, p_is_active: isActive });
  if (error) throw error;
  return data as unknown as AdminAchievements;
}

export async function deleteAdminAchievement(id: string): Promise<AdminAchievements> {
  const { data, error } = await getSupabase().rpc("admin_delete_achievement", { p_id: id });
  if (error) throw error;
  return data as unknown as AdminAchievements;
}

export async function reorderAdminAchievements(ids: string[]): Promise<AdminAchievements> {
  const { data, error } = await getSupabase().rpc("admin_reorder_achievements", { p_ids: ids });
  if (error) throw error;
  return data as unknown as AdminAchievements;
}

export async function grantAdminAchievement(id: string, username: string): Promise<AdminAchievements> {
  const { data, error } = await getSupabase().rpc("admin_grant_achievement", { p_id: id, p_username: username });
  if (error) throw error;
  return data as unknown as AdminAchievements;
}
