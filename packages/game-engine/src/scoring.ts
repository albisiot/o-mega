import type { AbilityCode, AbilityFamilies, Character, PlayScore, ScoreParts, Side, Threat } from "./types.ts";

export type ScoreContext = {
  families: AbilityFamilies;
  /** Rounds won so far (before this round) by the character's side and by the opponent. */
  roundsWon: number;
  opponentRoundsWon: number;
  /** Bonus earned in the previous round (Riscossa), applied to this character. */
  carriedBonus: number;
  /** 1-based number of the round being played. */
  round: number;
  /** The character's whole team, already played characters included. */
  team: readonly Character[];
  /** Taken from each of the character's abilities this round (Sabotatore). */
  abilityMalus?: number;
  /** The opposing character of this round, when it is known (the server resolving a round). */
  opponent?: Character;
  /** Level of the previous round's threat; none in the first round (Crescendo). */
  previousLevel?: number;
  /** How the side's previous round ended; none in the first round (Vendetta). */
  previousOutcome?: PlayOutcome;
  /** Levels of every threat of the match, in order (Grande prova). */
  threatLevels?: readonly number[];
  /**
   * The side's characters already played, in order, as they played: without the
   * power an Annullatore took away (Capobranco, Sacrificio, Catalizzatore, Riverbero).
   */
  played?: readonly Character[];
  /** Total score so far, own minus the opponent's (Sfavorito sui punti); none where there is no opponent. */
  scoreLead?: number;
  /** Logoramento: points the opposing character of the round before takes from this one's score. */
  wornDown?: number;
};

/** How a round ended for one side: a void round is neither won nor lost. */
export type PlayOutcome = "won" | "lost" | "void";

function numberParam(character: Character, key: string): number {
  const value = Number(character.power?.params[key]);
  if (!Number.isFinite(value)) {
    throw new Error(`Power ${character.power?.code} of ${character.definitionId}: invalid param ${key}`);
  }
  return value;
}

/** An ability value in this round: Sabotatore lowers it, never below 0. */
function abilityValue(character: Character, ability: AbilityCode, malus: number): number {
  return Math.max(0, (character.stats[ability] ?? 0) - malus);
}

/** The highest value an ability can have (cards.ability_max): Negativo counts down from it. */
export const ABILITY_MAX = 10;

/**
 * A rule a power puts on how the required abilities count (SPEC §4.4), before the
 * threat's own rule: the card's own (Jolly, Negativo, Una sola forza, Duellante), the
 * one its side's previous card passed it (Abissi), the opposing card's (Gelo, Tutto o
 * niente, Il prezzo, Duello). Applied in this order.
 */
export type AbilityRule =
  /** Jolly: the lowest required value rises towards the best ability not required, by `maxGain` at most. */
  | { kind: "joker"; maxGain: number }
  /** Negativo: each value counts `max` minus itself. */
  | { kind: "negative"; max: number }
  /** Una sola forza: the values of one family all count as the highest of them. */
  | { kind: "one_force"; families: AbilityFamilies }
  /** Abissi: the values of `family` count double. */
  | { kind: "family_double"; family: string; families: AbilityFamilies }
  /** Duellante (factor 2), Duello (factor 1): only the `count` highest values count, times `factor`. */
  | { kind: "top"; count: number; factor: number }
  /** Gelo: no value counts more than `cap`. */
  | { kind: "cap"; cap: number }
  /** Tutto o niente: a value under `min` counts 0. */
  | { kind: "floor_zero"; min: number }
  /** Il prezzo: a value of `maxValue` or less counts −`malus`. */
  | { kind: "price"; maxValue: number; malus: number };

/** The required values after the rules of the powers, in the order of the threat's abilities. */
export function ruledValues(character: Character, threat: Threat, malus = 0, rules: readonly AbilityRule[] = []): number[] {
  let values = threat.abilities.map((ability) => abilityValue(character, ability, malus));
  for (const rule of rules) {
    switch (rule.kind) {
      case "joker": {
        const spare = Object.keys(character.stats)
          .filter((ability) => !threat.abilities.includes(ability))
          .map((ability) => abilityValue(character, ability, malus));
        if (values.length === 0 || spare.length === 0) break;
        const low = Math.min(...values);
        const best = Math.max(...spare);
        const at = values.indexOf(low);
        if (best > low) values = values.map((value, i) => (i === at ? Math.min(best, low + rule.maxGain) : value));
        break;
      }
      case "negative":
        values = values.map((value) => Math.max(0, rule.max - value));
        break;
      case "one_force": {
        const family = (i: number) => rule.families[threat.abilities[i]] ?? threat.abilities[i];
        const best: Record<string, number> = {};
        values.forEach((value, i) => (best[family(i)] = Math.max(best[family(i)] ?? 0, value)));
        values = values.map((_, i) => best[family(i)]);
        break;
      }
      case "family_double":
        values = values.map((value, i) => (rule.families[threat.abilities[i]] === rule.family ? value * 2 : value));
        break;
      case "top": {
        const kept = [...values.keys()].sort((x, y) => values[y] - values[x] || x - y).slice(0, rule.count);
        values = values.map((value, i) => (kept.includes(i) ? value * rule.factor : 0));
        break;
      }
      case "cap":
        values = values.map((value) => Math.min(value, rule.cap));
        break;
      case "floor_zero":
        values = values.map((value) => (value < rule.min ? 0 : value));
        break;
      case "price":
        values = values.map((value) => (value <= rule.maxValue ? -rule.malus : value));
        break;
    }
  }
  return values;
}

/**
 * Sum of the character's values in the abilities required by the threat, with the value
 * a modifier doubles; `rules` are those of the powers (abilityRules), applied first.
 */
export function baseScore(character: Character, threat: Threat, malus = 0, rules: readonly AbilityRule[] = []): number {
  const values = ruledValues(character, threat, malus, rules);
  const sum = values.reduce((total, value) => total + value, 0);
  const modifier = threat.modifier;
  switch (modifier?.code) {
    case "focus":
      return sum + (values[0] ?? 0);
    case "weak_link":
      return sum + Math.min(...values);
    case "abyss": {
      const doubled = modifier.abilities;
      return sum + threat.abilities.reduce((extra, ability, i) => (doubled.includes(ability) ? extra + values[i] : extra), 0);
    }
    case "frost": {
      const cap = modifier.cap;
      return values.reduce((total, value) => total + Math.min(value, cap), 0);
    }
    case "duel":
      return [...values]
        .sort((x, y) => y - x)
        .slice(0, modifier.count)
        .reduce((total, value) => total + value, 0);
    case "all_or_nothing":
      return values.reduce((total, value) => total + (value >= modifier.min ? value : 0), 0);
    case "price":
      return values.reduce((total, value) => total + (value <= modifier.maxValue ? -modifier.malus : value), 0);
    case "one_force": {
      const group = threat.abilities.map((ability, i) => (modifier.abilities.includes(ability) ? values[i] : null));
      const counted = group.filter((value): value is number => value !== null);
      if (counted.length === 0) return sum;
      const rest = values.reduce((total, value, i) => (group[i] === null ? total + value : total), 0);
      return rest + Math.max(...counted) * counted.length;
    }
    case "count":
      return values.filter((value) => value >= modifier.min).length * modifier.points;
    case "negative":
      return values.reduce((total, value) => total + Math.max(0, modifier.max - value), 0);
    default:
      return sum;
  }
}

/** Rovescio: the lower score wins the round. */
export function lowerWins(threat: Threat | null | undefined): boolean {
  return threat?.modifier?.code === "reverse";
}

/**
 * Whether a side wants low values of its own on this threat: under Rovescio the lower
 * score wins; under Specchio the opponent scores with them. Bots aim the other way.
 */
export function prefersLowOwnValues(threat: Threat | null | undefined): boolean {
  const code = threat?.modifier?.code;
  return code === "reverse" || code === "mirror";
}

/** Al buio: the abilities stay hidden until both sides have chosen. */
export function hiddenUntilChosen(threat: Threat | null | undefined): boolean {
  return threat?.modifier?.code === "blind";
}

/** Specchio: each side scores with the opposing character's values, keeping its own power. */
export function scoresWithOpponentValues(threat: Threat | null | undefined): boolean {
  return threat?.modifier?.code === "mirror";
}

/** Silenzio della tomba: in this round no power acts, on either side. */
export function powersSilenced(threat: Threat | null | undefined): boolean {
  return threat?.modifier?.code === "tomb_silence";
}

/**
 * The rules of the places beyond Nuova Megara (SPEC §5.4): rare threats can have them too.
 * The Novecielo's is Una sola forza, a rare threats' rule: on a usual threat it marks the place.
 */
const PLACE_RULES = new Set(["tomb_silence", "long_count", "abyss", "frost", "duel", "one_force"]);

/**
 * A threat of a place beyond Nuova Megara (Fuori casa): its place's rule, and not a rare
 * threat. On Giza's threats Silenzio della tomba switches the power off anyway.
 */
export function isPlaceThreat(threat: Threat | null | undefined): boolean {
  return Boolean(threat?.modifier && !threat.rarity && PLACE_RULES.has(threat.modifier.code));
}

/** Guastafeste: the opposing character gets no bonus from the cards played before it. Pass it as it plays. */
export function spoilsBonuses(opponent: Character | null | undefined): boolean {
  return opponent?.power?.code === "spoiler";
}

/** Logoramento: what a character, as it played, takes from the score of the next character the opponent plays. */
export function wearDownFrom(character: Character | null | undefined): number {
  return character?.power?.code === "attrition" ? numberParam(character, "malus") : 0;
}

/**
 * The rules the powers put on a character's abilities in this round, in the order
 * ruledValues applies them. Under Silenzio della tomba the powers of this round give
 * none; Abissi, passed from the round before, still counts (like Riscossa).
 */
export function abilityRules(character: Character, threat: Threat, context: ScoreContext): AbilityRule[] {
  const rules: AbilityRule[] = [];
  const silenced = powersSilenced(threat);
  const own = silenced ? null : character.power;
  if (own?.code === "joker") rules.push({ kind: "joker", maxGain: numberParam(character, "max_gain") });
  if (own?.code === "negative_self") rules.push({ kind: "negative", max: ABILITY_MAX });
  if (own?.code === "single_force") rules.push({ kind: "one_force", families: context.families });
  const previous = context.played?.at(-1);
  if (previous?.power?.code === "abyss_next") {
    rules.push({ kind: "family_double", family: String(previous.power.params.family), families: context.families });
  }
  if (own?.code === "duelist" && threat.level >= numberParam(character, "from_level")) rules.push({ kind: "top", count: 2, factor: 2 });
  const opponent = silenced ? undefined : context.opponent;
  switch (opponent?.power?.code) {
    case "rival_frost":
      rules.push({ kind: "cap", cap: numberParam(opponent, "cap") });
      break;
    case "rival_all_or_nothing":
      rules.push({ kind: "floor_zero", min: numberParam(opponent, "min_value") });
      break;
    case "rival_price":
      rules.push({ kind: "price", maxValue: numberParam(opponent, "max_value"), malus: numberParam(opponent, "malus") });
      break;
    case "rival_duel":
      rules.push({ kind: "top", count: numberParam(opponent, "count"), factor: 1 });
      break;
  }
  return rules;
}

/**
 * The points the ability rules of the powers make in a play, for the screens: the card's
 * own rule, the one its side's previous card passed it (Abissi), the opposing card's.
 * The score already holds them; this tells them apart.
 */
export function ruleParts(character: Character, threat: Threat, context: ScoreContext): { own: number; passed: number; rival: number } {
  if (powersSilenced(threat) && character.power) character = { ...character, power: null };
  const malus = powersSilenced(threat) || immuneToSabotage(character) ? 0 : (context.abilityMalus ?? 0);
  const values = scoresWithOpponentValues(threat) && context.opponent ? { ...character, stats: context.opponent.stats } : character;
  const base = (rules: AbilityRule[]) => baseScore(values, threat, malus, rules);
  const plain = base([]);
  const own = base(abilityRules(character, threat, { ...context, played: [], opponent: undefined }));
  const passed = base(abilityRules(character, threat, { ...context, opponent: undefined }));
  const all = base(abilityRules(character, threat, context));
  return { own: own - plain, passed: passed - own, rival: all - passed };
}

/** Powers whose rule acts on the opposing character's abilities (Gelo, Tutto o niente, Il prezzo, Duello). */
const RIVAL_RULES = new Set(["rival_frost", "rival_all_or_nothing", "rival_price", "rival_duel"]);

export function hitsRivalAbilities(character: Character | null | undefined): boolean {
  return Boolean(character?.power && RIVAL_RULES.has(character.power.code));
}

/**
 * Vampiro, as it plays against `victim`: the required abilities in which it does not
 * beat the victim's value. It gets +1 for each, the victim −1 (not on the tie-break).
 */
export function vampireDrain(vampire: Character | null | undefined, victim: Character | null | undefined, threat: Threat): number {
  if (vampire?.power?.code !== "vampire" || !victim || powersSilenced(threat)) return 0;
  return threat.abilities.filter((ability) => (vampire.stats[ability] ?? 0) <= (victim.stats[ability] ?? 0)).length;
}

/** Calma piatta: in its round the threat has no rule (modifier, place, rare rule), for both sides. Pass the characters as they play. */
export function calmedThreat<T extends Threat>(threat: T, a: Character | null | undefined, b?: Character | null): T {
  const calm = a?.power?.code === "calm" || b?.power?.code === "calm";
  return calm && threat.modifier ? { ...threat, modifier: null } : threat;
}

/** Imboscata: in the round after, the opponent chooses without seeing the threat's abilities. Pass it as it played. */
export function ambushesNext(character: Character | null | undefined): boolean {
  return character?.power?.code === "ambush";
}

/** Segugio: once played, its side sees the rarity of the characters the opponent has not played yet. */
export function tracksRarities(character: Character | null | undefined): boolean {
  return character?.power?.code === "tracker";
}

/** Fenice: a character that lost its round goes back to the team, once. */
export function returnsAfterLoss(character: Character | null | undefined): boolean {
  return character?.power?.code === "phoenix";
}

/** The distinctive powers (Alfa and Omega, SPEC §4.4): Cacciatore pays against them, the pages give them a cut-in. */
const DISTINCTIVE = new Set([
  "comeback",
  "comeback_long",
  "comeback_margin",
  "underdog",
  "underdog_per_round",
  "underdog_wall",
  "underdog_points",
  "sabotage",
  "sabotage_big",
  "sabotage_flat",
  "foresight",
  "foresight_short",
  "momentum",
  "sacrifice",
  "pack_leader",
  "echo",
  "catalyst",
  "fog",
  "attrition",
  "omen",
  "oracle",
  "rival_frost",
  "single_force",
  "abyss_next",
  "duelist",
  "upset",
  "rival_all_or_nothing",
  "rival_duel",
  "rival_price",
  "negative_self",
  "vampire",
  "thief",
  "phoenix",
]);

export function isDistinctivePower(code: string | null | undefined): boolean {
  return Boolean(code && DISTINCTIVE.has(code));
}

/**
 * Ladro: after both plays of a round are scored, it takes the points the opposing
 * card's power gave that card. Pass the characters as they play (an Annullatore stops it).
 */
export function withTheft<T extends PlayScore>(plays: Record<Side, T>, acting: Record<Side, Character | null | undefined>): Record<Side, T> {
  const result = { ...plays };
  for (const side of ["a", "b"] as const) {
    const other = side === "a" ? "b" : "a";
    const victim = result[other];
    const taken = Math.max(0, victim.parts?.power ?? 0);
    if (acting[side]?.power?.code !== "thief" || taken === 0) continue;
    result[other] = withPowerPoints(victim, -taken);
    result[side] = withPowerPoints(result[side], taken);
  }
  return result;
}

/** A play with `delta` more points from its power, its total and bonus counted again. */
function withPowerPoints<T extends PlayScore>(play: T, delta: number): T {
  if (!play.parts) return play;
  const parts = { ...play.parts, power: play.parts.power + delta };
  const raw = play.base + parts.power + parts.carried + parts.pack + (parts.sacrifice ?? 0) + parts.modifier;
  const total = Math.max(0, raw);
  return { ...play, total, bonus: total - play.base, parts: { ...parts, floor: total - raw } };
}

/** Presagio: while in the team and not played yet, its side sees the threat of the next round. */
export function showsNextThreat(character: Character): boolean {
  return character.power?.code === "omen";
}

/** Oracolo: from the start, its side sees the threats of the match's highest level. */
export function showsTopThreat(character: Character): boolean {
  return character.power?.code === "oracle";
}

/** Infiltrato: at the start of the match its side sees one opposing character, drawn by the server. */
export function revealsOpponentAtStart(character: Character): boolean {
  return character.power?.code === "infiltrator";
}

/** Rounds won so far by a side and by its opponent (Il conto lungo). */
export type Standing = { roundsWon: number; opponentRoundsWon: number };

/**
 * Points a modifier gives or takes whatever the abilities. Il conto lungo needs the
 * standing before the round: without it, it gives nothing.
 */
export function modifierBonus(character: Character, threat: Threat, standing?: Standing): number {
  const modifier = threat.modifier;
  switch (modifier?.code) {
    case "long_count":
      return standing && standing.roundsWon < standing.opponentRoundsWon ? modifier.bonus : 0;
    case "hostile_ground":
      if (character.faction === modifier.favored) return modifier.bonus;
      return character.faction === modifier.hindered ? -modifier.malus : 0;
    case "underdogs":
      if (character.rarityRank <= modifier.commonMaxRank) return modifier.bonus;
      return character.rarityRank >= modifier.eliteMinRank ? -modifier.malus : 0;
    case "last_first":
      return Math.max(0, modifier.topRank - character.rarityRank) * modifier.bonus;
    default:
      return 0;
  }
}

/** The modifier's points as they count for the character: Adattabile ignores a malus. */
export function modifierPoints(character: Character, threat: Threat, standing?: Standing): number {
  const points = modifierBonus(character, threat, standing);
  return character.power?.code === "adaptable" ? Math.max(0, points) : points;
}

/** Highest single value among the required abilities (tie-break, no bonuses). Negativo reverses it, as the rule does. */
export function highestRequired(character: Character, threat: Threat, malus = 0, rules: readonly AbilityRule[] = []): number {
  const negative = rules.find((rule) => rule.kind === "negative");
  const values = threat.abilities.map((ability) => {
    const value = abilityValue(character, ability, malus);
    return negative ? Math.max(0, negative.max - value) : value;
  });
  // Negativo: the values count reversed, the tie-break too.
  const modifier = threat.modifier;
  if (modifier?.code === "negative") return Math.max(0, ...values.map((value) => modifier.max - value));
  return Math.max(0, ...values);
}

/** Sabotatore and its variants: they take something from the opposing character. */
const SABOTEURS = new Set(["sabotage", "sabotage_big", "sabotage_flat"]);

export function isSaboteur(character: Character | null | undefined): boolean {
  return SABOTEURS.has(character?.power?.code ?? "");
}

/**
 * What a character with Sabotatore takes from each ability of the opposing character
 * on `threat`. The variant for the big threats acts only from its level up; without a
 * threat (a team's strength) it counts as acting.
 */
export function abilityMalusFrom(character: Character, threat?: Threat | null): number {
  switch (character.power?.code) {
    case "sabotage":
      return numberParam(character, "malus");
    case "sabotage_big":
      return threat && threat.level < numberParam(character, "from_level") ? 0 : numberParam(character, "malus");
    default:
      return 0;
  }
}

/** Sabotatore sul punteggio: what a character takes from the opposing score (never from the tie-break). */
export function scoreMalusFrom(character: Character): number {
  return character.power?.code === "sabotage_flat" ? numberParam(character, "malus") : 0;
}

/** Whether a Sabotatore takes anything on this threat (what Schermato's bonus answers). */
export function sabotageActs(character: Character | null | undefined, threat?: Threat | null): boolean {
  return Boolean(character && (abilityMalusFrom(character, threat) > 0 || scoreMalusFrom(character) > 0));
}

/** Schermato and Riflesso: Sabotatore cannot touch them. */
export function immuneToSabotage(character: Character): boolean {
  const code = character.power?.code;
  return code === "shielded" || code === "reflect";
}

/**
 * What is taken from each ability of `character` in a round against `opponent`:
 * the opponent's Sabotatore, unless `character` is immune, plus its own
 * Sabotatore sent back when the opponent has Riflesso. Pass both as they play.
 */
export function abilityMalusOn(character: Character, opponent: Character | null | undefined, threat?: Threat | null): number {
  if (!opponent) return 0;
  const received = immuneToSabotage(character) ? 0 : abilityMalusFrom(opponent, threat);
  const reflected = opponent.power?.code === "reflect" ? abilityMalusFrom(character, threat) : 0;
  return received + reflected;
}

/** The same for Sabotatore sul punteggio: points taken from `character`'s score. */
export function scoreMalusOn(character: Character, opponent: Character | null | undefined): number {
  if (!opponent) return 0;
  const received = immuneToSabotage(character) ? 0 : scoreMalusFrom(opponent);
  const reflected = opponent.power?.code === "reflect" ? scoreMalusFrom(character) : 0;
  return received + reflected;
}

/** Implacabile and its variants: they win the ties, some also a round lost by a little. */
const RELENTLESS = new Set(["relentless", "relentless_small", "relentless_big", "relentless_behind"]);

export function isRelentless(character: Character | null | undefined): boolean {
  return RELENTLESS.has(character?.power?.code ?? "");
}

/**
 * How many points behind an Implacabile still wins its round, besides the ties: on the
 * small threats, on the big ones, or while its side is behind, by its variant.
 */
export function relentlessMargin(
  character: Character,
  threat: Pick<Threat, "level">,
  standing: Pick<ScoreContext, "roundsWon" | "opponentRoundsWon">,
): number {
  switch (character.power?.code) {
    case "relentless_small":
      return threat.level <= numberParam(character, "max_level") ? numberParam(character, "margin") : 0;
    case "relentless_big":
      return threat.level >= numberParam(character, "from_level") ? numberParam(character, "margin") : 0;
    case "relentless_behind":
      return standing.opponentRoundsWon > standing.roundsWon ? numberParam(character, "margin") : 0;
    default:
      return 0;
  }
}

/** Nebbia: the opponent does not see who played it until the match is over. */
export function hidesIdentity(character: Character): boolean {
  return character.power?.code === "fog";
}

/**
 * Powers Riverbero can copy: those that only add points to their own character.
 * Powers that act on the opponent, on later rounds or on information are left out,
 * so a copy never needs the server or the screen to know about it.
 */
const ECHOABLE = new Set([
  "ability_bonus",
  "family_bonus",
  "level_bonus",
  "underdog",
  "underdog_per_round",
  "underdog_wall",
  "underdog_points",
  "opener",
  "last_stand",
  "round_exact",
  "bond",
  "bond_threshold",
  "bond_relay",
  "bond_played",
  "bond_unplayed",
  "nemesis",
  "nemesis_other",
  "rival",
  "all_rounder",
  "giant_slayer",
  "crescendo",
  "scrappy",
  "counterpunch",
  "eclectic",
  "lone_wolf",
  "opportunist",
  "vendetta",
  "main_event",
  "peak",
  "euphoria",
  "away",
  "twin",
  "match_point",
  "icebreaker",
  "even_score",
  "diminuendo",
  "patience",
  "hunter",
  "rainbow",
  "steady",
]);

/** Riverbero: the power it copies from the side's previous character, as that one played. */
export function echoedPower(context: ScoreContext): Character["power"] {
  const source = context.played?.at(-1)?.power;
  return source && ECHOABLE.has(source.code) ? source : null;
}

/** Catalizzatore: the factor the side's previous character applies to this one's power bonus. */
export function powerMultiplier(context: ScoreContext): number {
  const previous = context.played?.at(-1);
  return previous?.power?.code === "catalyst" ? numberParam(previous, "multiplier") : 1;
}

/** Capobranco: +bonus from every pack leader of the same faction the side already played. */
export function packBonus(character: Character, played: readonly Character[] = []): number {
  return played.reduce(
    (sum, leader) =>
      leader.power?.code === "pack_leader" && leader.faction === character.faction ? sum + numberParam(leader, "bonus") : sum,
    0,
  );
}

/**
 * Sacrificio: +bonus from every Sacrificio the side already played, to every later
 * character of any faction, until the end of the match. Pass the characters as they
 * played: a Sacrificio an Annullatore stopped gives nothing.
 */
export function sacrificeBonus(played: readonly Character[] = []): number {
  return played.reduce((sum, earlier) => (earlier.power?.code === "sacrifice" ? sum + numberParam(earlier, "bonus") : sum), 0);
}

/**
 * Spia and its variants: once played, its side sees characters the opponent has not
 * played yet (one at random, two at random, or the rarest). The server draws them.
 */
export function revealsOpponentCharacter(character: Character): boolean {
  const code = character.power?.code;
  return code === "spy" || code === "spy_many" || code === "spy_rarest";
}

/** Nemesi acts between Heroes and Villains: Neutrals have no nemesis. */
const NEMESIS: Record<string, string> = { heroes: "villains", villains: "heroes" };

/** Whether Nemesi pays against an opposing character of this faction. */
export function isNemesisOf(character: Character, opponentFaction: string): boolean {
  return NEMESIS[character.faction] === opponentFaction;
}

/** Annullatore: the opposing character's power does not act in this round. */
export function nullifiesPower(character: Character): boolean {
  return character.power?.code === "nullifier";
}

/** Annullatore ritardato: the character the opponent plays in the round after acts without its power. */
export function nullifiesNextPower(character: Character | null | undefined): boolean {
  return character?.power?.code === "delayed_nullifier";
}

/**
 * The characters the two sides played in the round before, as they played: what an
 * Annullatore ritardato needs to know (in the Allarme Triplo, on the same threat).
 */
export type PlayedBefore = { own?: Character | null; opponent?: Character | null };

/**
 * The character as it plays against `opponent` on `threat`: without its power when
 * the opponent is an Annullatore, when the threat silences every power (Silenzio della
 * tomba), or when the opponent's character of the round before was an Annullatore
 * ritardato. Two Annullatori cancel each other; an Annullatore that the opponent's
 * Annullatore ritardato silenced cancels nothing.
 */
export function asPlayedAgainst(
  character: Character,
  opponent: Character | null | undefined,
  threat?: Threat | null,
  before?: PlayedBefore,
): Character {
  if (!character.power) return character;
  const delayed = nullifiesNextPower(before?.opponent);
  const opponentActs = Boolean(opponent && nullifiesPower(opponent) && !nullifiesNextPower(before?.own));
  const silenced = delayed || powersSilenced(threat) || opponentActs;
  return silenced ? { ...character, power: null } : character;
}

/** Veggente: once played, its side sees every threat of the following rounds. */
export function revealsFutureThreats(character: Character): boolean {
  return foresightRounds(character) > 0;
}

/**
 * How many of the following rounds a Veggente lets its side see: all of them, or the
 * next `count` for the short one; 0 for any other power.
 */
export function foresightRounds(character: Character): number {
  switch (character.power?.code) {
    case "foresight":
      return Number.POSITIVE_INFINITY;
    case "foresight_short":
      return numberParam(character, "count");
    default:
      return 0;
  }
}

/** Bonus of the character's own power for this round (SPEC §4.4, M6 rules). */
export function powerBonus(character: Character, threat: Threat, context: ScoreContext): number {
  const power = character.power;
  if (!power) return 0;
  switch (power.code) {
    case "ability_bonus":
      return threat.abilities.includes(String(power.params.ability)) ? numberParam(character, "bonus") : 0;
    case "family_bonus": {
      const matching = threat.abilities.filter((ability) => context.families[ability] === power.params.family);
      return matching.length >= numberParam(character, "min_count") ? numberParam(character, "bonus") : 0;
    }
    case "level_bonus":
      return threat.level >= numberParam(character, "min_level") && threat.level <= numberParam(character, "max_level")
        ? numberParam(character, "bonus")
        : 0;
    case "underdog":
      return context.opponentRoundsWon > context.roundsWon ? numberParam(character, "bonus") : 0;
    case "underdog_per_round":
      return Math.max(0, context.opponentRoundsWon - context.roundsWon) * numberParam(character, "bonus");
    case "underdog_wall":
      return context.opponentRoundsWon >= numberParam(character, "min_wins") ? numberParam(character, "bonus") : 0;
    case "underdog_points":
      return (context.scoreLead ?? 0) < 0 ? numberParam(character, "bonus") : 0;
    case "opener":
      return context.round <= numberParam(character, "max_round") ? numberParam(character, "bonus") : 0;
    case "last_stand":
      return context.round >= numberParam(character, "min_round") ? numberParam(character, "bonus") : 0;
    case "round_exact":
      return context.round === numberParam(character, "round") ? numberParam(character, "bonus") : 0;
    case "bond": {
      const allies = context.team.filter((c) => c.id !== character.id && c.faction === character.faction).length;
      return allies * numberParam(character, "bonus");
    }
    case "bond_threshold": {
      const allies = context.team.filter((c) => c.id !== character.id && c.faction === character.faction).length;
      return allies >= numberParam(character, "min_allies") ? numberParam(character, "bonus") : 0;
    }
    case "bond_relay": {
      const previous = context.played?.at(-1);
      return previous && previous.id !== character.id && previous.faction === character.faction ? numberParam(character, "bonus") : 0;
    }
    case "bond_played": {
      const allies = (context.played ?? []).filter((c) => c.id !== character.id && c.faction === character.faction).length;
      return allies * numberParam(character, "bonus");
    }
    case "bond_unplayed": {
      const played = new Set((context.played ?? []).map((c) => c.id));
      const allies = context.team.filter((c) => c.id !== character.id && !played.has(c.id) && c.faction === character.faction).length;
      return allies * numberParam(character, "bonus");
    }
    case "shielded":
      return context.opponent && sabotageActs(context.opponent, threat) ? numberParam(character, "bonus") : 0;
    case "nemesis":
      return context.opponent && isNemesisOf(character, context.opponent.faction) ? numberParam(character, "bonus") : 0;
    case "nemesis_other":
      return context.opponent && context.opponent.faction !== character.faction ? numberParam(character, "bonus") : 0;
    case "rival":
      return context.opponent && context.opponent.faction === character.faction ? numberParam(character, "bonus") : 0;
    case "all_rounder": {
      const min = numberParam(character, "min_value");
      const malus = context.abilityMalus ?? 0;
      return threat.abilities.every((ability) => abilityValue(character, ability, malus) >= min)
        ? numberParam(character, "bonus")
        : 0;
    }
    case "giant_slayer":
      return context.opponent && context.opponent.rarityRank - character.rarityRank >= numberParam(character, "min_gap")
        ? numberParam(character, "bonus")
        : 0;
    case "crescendo":
      return context.previousLevel !== undefined && threat.level > context.previousLevel ? numberParam(character, "bonus") : 0;
    case "scrappy": {
      // The required abilities below the floor count as the floor.
      const floor = numberParam(character, "min_value");
      const malus = context.abilityMalus ?? 0;
      return threat.abilities.reduce((sum, ability) => sum + Math.max(0, floor - abilityValue(character, ability, malus)), 0);
    }
    case "counterpunch": {
      // Counted on full values: the comparison is between the two characters, not their round.
      const opponent = context.opponent;
      if (!opponent) return 0;
      const behind = threat.abilities.filter((ability) => (opponent.stats[ability] ?? 0) > (character.stats[ability] ?? 0)).length;
      return Math.min(behind * numberParam(character, "bonus"), numberParam(character, "max"));
    }
    case "eclectic": {
      const families = new Set(threat.abilities.map((ability) => context.families[ability]));
      return families.size >= numberParam(character, "min_families") ? numberParam(character, "bonus") : 0;
    }
    case "lone_wolf":
      return context.team.some((c) => c.id !== character.id && c.faction === character.faction) ? 0 : numberParam(character, "bonus");
    case "opportunist":
      return context.opponent && !context.opponent.power ? numberParam(character, "bonus") : 0;
    case "vendetta":
      return context.previousOutcome === "lost" ? numberParam(character, "bonus") : 0;
    // Euforia: the mirror of Vendetta.
    case "euphoria":
      return context.previousOutcome === "won" ? numberParam(character, "bonus") : 0;
    // Fuoriclasse: one required ability at 10, after Sabotatore.
    case "peak": {
      const malus = context.abilityMalus ?? 0;
      return threat.abilities.some((ability) => abilityValue(character, ability, malus) >= 10) ? numberParam(character, "bonus") : 0;
    }
    case "away":
      return isPlaceThreat(threat) ? numberParam(character, "bonus") : 0;
    case "twin":
      return context.opponent && context.opponent.rarityRank === character.rarityRank ? numberParam(character, "bonus") : 0;
    case "match_point":
      return context.roundsWon >= numberParam(character, "min_wins") ? numberParam(character, "bonus") : 0;
    case "icebreaker":
      return context.roundsWon === 0 ? numberParam(character, "bonus") : 0;
    case "even_score":
      return context.roundsWon === context.opponentRoundsWon ? numberParam(character, "bonus") : 0;
    case "diminuendo":
      return context.previousLevel !== undefined && threat.level < context.previousLevel ? numberParam(character, "bonus") : 0;
    case "main_event":
      return context.threatLevels?.length && threat.level >= Math.max(...context.threatLevels) ? numberParam(character, "bonus") : 0;
    case "adaptable":
      return threat.modifier ? numberParam(character, "bonus") : 0;
    case "echo": {
      const copied = echoedPower(context);
      return copied ? powerBonus({ ...character, power: copied }, threat, context) : 0;
    }
    case "patience":
      return Math.min(numberParam(character, "max"), Math.max(0, context.round - 1) * numberParam(character, "bonus"));
    case "hunter":
      return isDistinctivePower(context.opponent?.power?.code) ? numberParam(character, "bonus") : 0;
    case "rainbow": {
      const factions = new Set((context.team ?? []).map((member) => member.faction));
      return ["heroes", "villains", "neutrals"].every((faction) => factions.has(faction)) ? numberParam(character, "bonus") : 0;
    }
    case "steady":
      return context.previousLevel !== undefined && threat.level === context.previousLevel ? numberParam(character, "bonus") : 0;
    case "gamble": // and −malus to the next character after a lost round: see carriedBonusAfter
      return numberParam(character, "bonus");
    case "vampire":
      return vampireDrain(character, context.opponent, threat);
    case "reflect": // acts on Sabotatore: see abilityMalusOn
    case "sacrifice": // zeroes its score, then acts on the later characters: see scorePlay and sacrificeBonus
    case "pack_leader": // acts on the later characters: see packBonus
    case "catalyst": // acts on the next character: see powerMultiplier
    case "fog": // hides the character: see hidesIdentity
    case "comeback": // acts after the round: see carriedBonusAfter
    case "comeback_long":
    case "comeback_margin":
    case "momentum":
    case "nullifier": // acts on the opposing character: see asPlayedAgainst
    case "delayed_nullifier":
    case "sabotage": // acts on the opposing character: see abilityMalusFrom and scoreMalusFrom
    case "sabotage_big":
    case "sabotage_flat":
    case "foresight": // gives information, not points: see foresightRounds
    case "foresight_short":
    case "relentless": // acts on ties: see compareScores and relentlessMargin
    case "relentless_small":
    case "relentless_big":
    case "relentless_behind":
    case "spy": // gives information, not points: see revealsOpponentCharacter
    case "spy_many":
    case "spy_rarest":
    case "rival_frost": // change how abilities count: see abilityRules
    case "rival_all_or_nothing":
    case "rival_price":
    case "rival_duel":
    case "single_force":
    case "abyss_next":
    case "duelist":
    case "negative_self":
    case "joker":
    case "upset": // acts on the result: see compareScores
    case "wall":
    case "calm": // takes the threat's rule away: see calmedThreat
    case "ambush": // hides the next threat from the opponent: the server and botView
    case "tracker": // gives information: the server
    case "thief": // takes the opposing power's points: see withTheft
    case "phoenix": // goes back to the team after a lost round: see availableCharacters
    case "omen": // gives information while in the team: see showsNextThreat
    case "infiltrator": // gives information at the start: the server draws it
    case "oracle":
    case "attrition": // acts on the next opposing character: see wearDownFrom
    case "spoiler": // acts on the opposing character's bonuses: see spoilsBonuses
      return 0;
    default:
      // A power the engine does not implement must never be silently ignored.
      throw new Error(`Unknown power: ${power.code}`);
  }
}

export function scorePlay(character: Character, threat: Threat, context: ScoreContext): PlayScore {
  // Silenzio della tomba: no power of either side, so no Sabotatore either. A bonus
  // received from an earlier round (Riscossa, Slancio, Capobranco, Sacrificio) still counts.
  if (powersSilenced(threat)) {
    if (character.power) character = { ...character, power: null };
    context = { ...context, abilityMalus: 0 };
  }
  const code = character.power?.code;
  // Schermato and Riflesso: immune to Sabotatore.
  if (immuneToSabotage(character)) context = { ...context, abilityMalus: 0 };
  const malus = context.abilityMalus ?? 0;
  // Specchio: the values are the opposing character's; without one (Emergenza, a preview) its own.
  const values = scoresWithOpponentValues(threat) && context.opponent ? { ...character, stats: context.opponent.stats } : character;
  // Sabotatore sul punteggio, and Logoramento from the round before, lower the sum of the
  // values, never below 0 and never the tie-break. Silenzio della tomba stops the first only.
  // Vampiro takes 1 for every required ability in which it does not beat this one.
  const scoreMalus =
    (powersSilenced(threat) ? 0 : scoreMalusOn(character, context.opponent)) +
    (context.wornDown ?? 0) +
    vampireDrain(context.opponent, character, threat);
  const rules = abilityRules(character, threat, context);
  const unsabotaged = baseScore(values, threat, malus, rules);
  const base = unsabotaged - Math.min(scoreMalus, Math.max(0, unsabotaged));
  // Sacrificio: the character gives up the round, whatever it would have scored, the
  // bonuses it received included.
  if (code === "sacrifice") {
    const parts: ScoreParts = { power: -base, carried: 0, pack: 0, sacrifice: 0, modifier: 0, floor: 0 };
    return { characterId: character.id, base, bonus: -base, total: 0, highest: 0, parts };
  }
  const power = powerBonus(character, threat, context) * powerMultiplier(context);
  const modifier = modifierPoints(character, threat, context);
  // Guastafeste: the opposing character takes nothing from the cards played before.
  const spoiled = spoilsBonuses(context.opponent);
  const pack = spoiled ? 0 : packBonus(character, context.played);
  const sacrifice = spoiled ? 0 : sacrificeBonus(context.played);
  const carried = spoiled ? 0 : context.carriedBonus;
  // A malus cannot bring the score below 0: the bonus stays the difference from the base.
  const raw = base + power + pack + sacrifice + carried + modifier;
  const total = Math.max(0, raw);
  const parts: ScoreParts = { power, carried, pack, sacrifice, modifier, floor: total - raw };
  return {
    characterId: character.id,
    base,
    bonus: total - base,
    total,
    highest: highestRequired(values, threat, malus, rules),
    ...relentlessFields(character, threat, context),
    ...(code === "upset" ? { upset: numberParam(character, "min_gap") } : {}),
    ...(code === "wall" ? { wall: numberParam(character, "margin") } : {}),
    parts,
  };
}

/** Implacabile on a play: it wins the ties, and a variant also a round lost by `relentlessMargin` or less. */
function relentlessFields(character: Character, threat: Threat, context: ScoreContext): Pick<PlayScore, "relentless" | "relentlessMargin"> {
  if (!isRelentless(character)) return {};
  const margin = relentlessMargin(character, threat, context);
  return margin > 0 ? { relentless: true, relentlessMargin: margin } : { relentless: true };
}

/**
 * Bonus the next character of the same side gets: Riscossa after a lost round,
 * Slancio after a won one. A void round is neither won nor lost. Pass the character as it played (asPlayedAgainst): an Annullatore
 * stops the bonus too.
 */
export function carriedBonusAfter(character: Character, outcome: PlayOutcome, margin?: number, distance = 1): number {
  const code = character.power?.code;
  // Azzardo: after a lost round, a malus for the next character.
  if (code === "gamble") return outcome === "lost" && distance === 1 ? -numberParam(character, "malus") : 0;
  // Riscossa lunga: the two characters after it, so also the one two plays later.
  if (code === "comeback_long") return outcome === "lost" && distance <= 2 ? numberParam(character, "bonus") : 0;
  if (distance !== 1) return 0;
  if (code === "comeback" && outcome === "lost") return numberParam(character, "bonus");
  // Riscossa sullo scarto: the points it lost by, up to `max`.
  if (code === "comeback_margin" && outcome === "lost") return Math.min(Math.abs(margin ?? 0), numberParam(character, "max"));
  if (code === "momentum" && outcome === "won") return numberParam(character, "bonus");
  return 0;
}

/**
 * A side's earlier plays, the latest last, as `carriedBonusFrom` reads them: the character
 * as it played, how its round ended and by how many points (own total minus the other).
 */
export type CarrySource = { character: Character | null | undefined; outcome: PlayOutcome; margin?: number };

/** The bonus a side's next character receives from the side's last two plays (Riscossa, Slancio). */
export function carriedBonusFrom(history: readonly CarrySource[]): number {
  let total = 0;
  for (let distance = 1; distance <= 2; distance++) {
    const source = history.at(-distance);
    if (source?.character) total += carriedBonusAfter(source.character, source.outcome, source.margin, distance);
  }
  return total;
}

/**
 * Higher total wins; then Implacabile; then the higher single required value; otherwise
 * void (SPEC §5.6). Under Rovescio the lower total wins, then the lower single value.
 */
export function compareScores(a: PlayScore, b: PlayScore, threat?: Threat | null): Side | null {
  const lower = lowerWins(threat);
  const better = (x: number, y: number): Side => ((x > y) !== lower ? "a" : "b");
  if (a.total !== b.total) {
    const winner = better(a.total, b.total);
    const [ahead, behind] = winner === "a" ? [a, b] : [b, a];
    const gap = Math.abs(a.total - b.total);
    // Ribaltone: a round lost by a lot goes to the one behind; Muro: one lost by a little is void. Not against the same power.
    if (behind.upset !== undefined && ahead.upset === undefined && gap >= behind.upset) return winner === "a" ? "b" : "a";
    if (behind.wall !== undefined && ahead.wall === undefined && gap <= behind.wall) return null;
    // An Implacabile that may win a round lost by a little, unless the other is Implacabile too.
    if (behind.relentless && !ahead.relentless && Math.abs(a.total - b.total) <= (behind.relentlessMargin ?? 0)) {
      return winner === "a" ? "b" : "a";
    }
    return winner;
  }
  if (Boolean(a.relentless) !== Boolean(b.relentless)) return a.relentless ? "a" : "b";
  if (a.highest !== b.highest) return better(a.highest, b.highest);
  return null;
}
