import {
  abilityMalusFrom,
  asPlayedAgainst,
  carriedBonusAfter,
  foresightRounds,
  isRelentless,
  modifierPoints,
  nullifiesNextPower,
  sabotageActs,
  sacrificeBonus,
  ruleParts,
  scoreMalusFrom,
  vampireDrain,
  wearDownFrom,
  type Character,
  type ScoreContext,
  type PlayedBefore,
  type PlayOutcome,
  type ScoreParts,
  type Standing,
  type Threat,
  type ThreatModifier,
} from "@o-mega/game-engine";
import { toCharacter, type MatchCard, type MatchRound } from "@/lib/match";

/**
 * One line about a power on the round result, shown next to the card it belongs to. `points`
 * is what it added to this card's score in this round; `timing` says when it shows: on a tie it
 * settled (Implacabile) or after the result, for the next card (Riscossa, Slancio and the like).
 */
export type PowerNote = {
  name: string;
  effect: string | null;
  active: boolean;
  points?: number;
  timing?: "tie" | "after";
  /**
   * The power's code, for its family on the page (effect-families.ts); `source` says whose
   * power it is: this card's own, the one that passed a bonus from the card before, or a
   * bonus that lasts to the end of the match (Capobranco, Sacrificio). `cancelled`: why the
   * card's own power did nothing. Only with `annotate`.
   */
  code?: string;
  /** `worn`: the points the opposing card of the round before took (Logoramento). */
  source?: "own" | "carried" | "pack" | "worn";
  cancelled?: "nullified" | "silenced" | "blocked";
};

export type RoundOutcome = {
  /** Bonus this card received from the previous card of its side (Riscossa or Slancio). */
  carried: number;
  /** Name of the power that passed that bonus; Riscossa when not given. */
  carriedFrom?: string;
  /** Code of that power (annotated notes only); Riscossa's when not given. */
  carriedCode?: string;
  lost: boolean;
  won?: boolean;
  /** An opposing Annullatore took this card's power away. */
  nullified?: boolean;
  /** Silenzio della tomba: no power acted in this round. */
  silenced?: boolean;
  /** Rounds won by this card's side and by the other before the round (Il conto lungo). */
  standing?: Standing;
  /** The opposing card has a power (what an Annullatore takes away). */
  opponentHasPower?: boolean;
  /** Implacabile settled a tie in this card's favor. */
  wonTie: boolean;
  /** A variant of Implacabile won the round although this many points behind. */
  wonBehind?: number;
  /** This card's score minus the other's (Riscossa sullo scarto). */
  margin?: number;
  /** The opposing card had Schermato or Riflesso, which Sabotatore cannot touch. */
  opponentShielded?: boolean;
  /** What the opposing card's Sabotatore takes from each ability (what Riflesso sends back). */
  opponentSabotage?: number;
  /** Bonus this card received from Capobranco cards its side played before. */
  pack?: number;
  /** Bonus this card received from Sacrificio cards its side played before, and their names. */
  sacrifice?: number;
  sacrificeFrom?: string;
  /**
   * Spia: whether it showed an opposing card. The server shows one only while the opponent
   * has a card not played yet; when not given, it is taken as shown.
   */
  spyRevealed?: boolean;
  /** Logoramento: the points the opposing card of the round before took from this card's score, and its name. */
  wornDown?: number;
  wornDownFrom?: string;
  /**
   * The rules of the powers on this card's abilities (ruleParts in the engine): its own
   * (Jolly, Negativo, Una sola forza, Duellante), the one Abissi passed it, the opposing
   * card's (Gelo, Tutto o niente, Il prezzo, Duello), with who gave the last two.
   */
  rules?: { own: number; passed: number; rival: number; passedFrom?: string; rivalFrom?: string; rivalPower?: string; rivalCode?: string };
  /** What this card's rule took from the opposing card's abilities. */
  rulesDealt?: number;
  /** Vampiro: the points the opposing card took from this one, and its name. */
  drained?: number;
  drainedFrom?: string;
  /** Ladro: the opposing card took the points of this card's power (its name). */
  stolenBy?: string;
  /** Calma piatta: the threat's rule it took away, by name. */
  calmedRule?: string;
  /** Ribaltone won the round from far behind; Muro made a lost round void. */
  upsetWon?: boolean;
  wallVoided?: boolean;
  /** Guastafeste: the bonuses of earlier cards (Riscossa, Capobranco…) the opposing card did not get because of this one. */
  opponentSpoiled?: number;
  /**
   * Where the server says the bonus comes from: when given, the power's points are taken
   * from it instead of being worked out from the bonus.
   */
  parts?: ScoreParts | null;
};

/**
 * What a card's power did in a resolved round: the points it added, what it took from the
 * opposing card, or nothing this time (the note is then dimmed). The server's bonus also holds
 * the Riscossa received and the threat modifier's points: they are taken out to isolate the power.
 */
export function roundPowerNotes(
  card: MatchCard,
  play: { bonus: number },
  threat: { level: number; abilities: string[]; modifier: ThreatModifier | null },
  outcome: RoundOutcome,
  /** Adds each note's power code and source, for the page's visual families. */
  annotate = false,
): PowerNote[] {
  const notes: PowerNote[] = [];
  const power = card.power;
  if (power && outcome.silenced) {
    notes.push({ name: power.name, effect: "zittito dalla tomba", active: false });
  } else if (power && outcome.nullified) {
    notes.push({ name: power.name, effect: "annullato", active: false });
  } else if (power) {
    const character = toCharacter(card, card.definition_id);
    switch (power.code) {
      case "sabotage":
      case "sabotage_big": {
        const malus = abilityMalusFrom(character, { id: "round", ...threat });
        notes.push(
          outcome.opponentShielded || malus === 0
            ? { name: power.name, effect: null, active: false }
            : { name: power.name, effect: `−${malus} a ogni abilità rivale`, active: true },
        );
        break;
      }
      case "sabotage_flat":
        notes.push(
          outcome.opponentShielded
            ? { name: power.name, effect: null, active: false }
            : { name: power.name, effect: `−${scoreMalusFrom(character)} al punteggio rivale`, active: true },
        );
        break;
      case "spy":
      case "spy_many":
      case "spy_rarest":
        notes.push(
          outcome.spyRevealed === false
            ? { name: power.name, effect: null, active: false }
            : {
                name: power.name,
                effect:
                  power.code === "spy_many"
                    ? `svela ${power.params.count} personaggi rivali`
                    : power.code === "spy_rarest"
                      ? "svela il personaggio rivale più raro"
                      : "svela un personaggio rivale",
                active: true,
              },
        );
        break;
      case "relentless":
      case "relentless_small":
      case "relentless_big":
      case "relentless_behind":
        notes.push(
          outcome.wonBehind
            ? { name: power.name, effect: `vince anche sotto di ${outcome.wonBehind}`, active: true, timing: "tie" }
            : { name: power.name, effect: outcome.wonTie ? "vince la parità" : null, active: outcome.wonTie, timing: "tie" },
        );
        break;
      case "comeback":
      case "comeback_long":
      case "comeback_margin":
      case "momentum": {
        const result: PlayOutcome = outcome.lost ? "lost" : outcome.won ? "won" : "void";
        const passed = carriedBonusAfter(character, result, outcome.margin);
        const to = power.code === "comeback_long" ? "ai prossimi due" : "al prossimo";
        notes.push({ name: power.name, effect: passed ? `+${passed} ${to}` : null, active: passed > 0, timing: "after" });
        break;
      }
      case "nullifier":
        notes.push({
          name: power.name,
          effect: outcome.opponentHasPower ? "annulla il potere rivale" : null,
          active: Boolean(outcome.opponentHasPower),
        });
        break;
      case "delayed_nullifier":
        notes.push({ name: power.name, effect: "annulla il potere del prossimo rivale", active: true, timing: "after" });
        break;
      case "foresight":
        notes.push({ name: power.name, effect: "svela le prossime Minacce", active: true });
        break;
      case "foresight_short":
        notes.push({ name: power.name, effect: `svela le Minacce dei prossimi ${foresightRounds(character)} round`, active: true });
        break;
      case "reflect":
        notes.push(
          outcome.opponentSabotage
            ? { name: power.name, effect: `rimanda −${outcome.opponentSabotage} a ogni abilità`, active: true }
            : { name: power.name, effect: null, active: false },
        );
        break;
      case "sacrifice":
        notes.push({ name: power.name, effect: `+${power.params.bonus} ai prossimi`, active: true, timing: "after" });
        break;
      case "catalyst":
        notes.push({ name: power.name, effect: `×${power.params.multiplier} al potere del prossimo`, active: true, timing: "after" });
        break;
      case "pack_leader":
        notes.push({ name: power.name, effect: `+${power.params.bonus} ai prossimi della fazione`, active: true, timing: "after" });
        break;
      case "fog":
        notes.push({ name: power.name, effect: "nasconde chi l'ha giocato", active: true });
        break;
      case "attrition":
        notes.push({ name: power.name, effect: `−${power.params.malus} al prossimo rivale`, active: true, timing: "after" });
        break;
      case "rival_frost":
      case "rival_all_or_nothing":
      case "rival_price":
      case "rival_duel":
        notes.push(
          outcome.rulesDealt
            ? { name: power.name, effect: `−${outcome.rulesDealt} alle abilità rivali`, active: true }
            : { name: power.name, effect: null, active: false },
        );
        break;
      case "joker":
      case "negative_self":
      case "single_force":
      case "duelist": {
        const points = outcome.rules?.own ?? 0;
        notes.push(points ? { name: power.name, effect: signed(points), active: true, points } : { name: power.name, effect: null, active: false });
        break;
      }
      case "abyss_next":
        notes.push({ name: power.name, effect: "×2 al prossimo", active: true, timing: "after" });
        break;
      case "upset":
        notes.push({ name: power.name, effect: outcome.upsetWon ? "vince da molto sotto" : null, active: Boolean(outcome.upsetWon), timing: "tie" });
        break;
      case "wall":
        notes.push({ name: power.name, effect: outcome.wallVoided ? "round nullo" : null, active: Boolean(outcome.wallVoided), timing: "tie" });
        break;
      case "calm":
        notes.push(
          outcome.calmedRule
            ? { name: power.name, effect: `toglie ${outcome.calmedRule}`, active: true }
            : { name: power.name, effect: null, active: false },
        );
        break;
      case "ambush":
        notes.push({ name: power.name, effect: "nasconde la prossima Minaccia", active: true, timing: "after" });
        break;
      case "tracker":
        notes.push({ name: power.name, effect: "svela le rarità rivali", active: true });
        break;
      case "phoenix":
        notes.push({ name: power.name, effect: outcome.lost ? "torna in squadra" : null, active: outcome.lost, timing: "after" });
        break;
      case "spoiler":
        notes.push(
          outcome.opponentSpoiled
            ? { name: power.name, effect: `toglie +${outcome.opponentSpoiled} al rivale`, active: true }
            : { name: power.name, effect: null, active: false },
        );
        break;
      default: {
        const points = outcome.parts
          ? outcome.parts.power
          : play.bonus - outcome.carried - (outcome.pack ?? 0) - (outcome.sacrifice ?? 0) - modifierPoints(character, { id: "round", ...threat }, outcome.standing);
        notes.push(
          outcome.stolenBy && !points
            ? { name: power.name, effect: `rubato da ${outcome.stolenBy}`, active: false, cancelled: "blocked" }
            : points
              ? { name: power.name, effect: signed(points), active: true, points }
              : { name: power.name, effect: null, active: false },
        );
      }
    }
    // Azzardo: after a lost round, a malus for the next card.
    if (power.code === "gamble" && outcome.lost) {
      notes.push({ name: power.name, effect: `−${power.params.malus} al prossimo`, active: true, timing: "after", ...(annotate ? { code: power.code, source: "own" as const } : {}) });
    }
  }
  if (annotate && power && notes[0]) {
    const cancelled = outcome.silenced ? "silenced" : outcome.nullified ? "nullified" : undefined;
    notes[0] = { ...notes[0], code: power.code, source: "own", ...(cancelled ? { cancelled } : {}) };
    // Sabotatore against Schermato or Riflesso: it struck, the shield stopped it.
    if (!cancelled && outcome.opponentShielded && sabotageActs(toCharacter(card, card.definition_id), { id: "round", ...threat })) {
      notes[0] = { ...notes[0], effect: "fermato dallo scudo", cancelled: "blocked" };
    }
  }
  if (outcome.carried !== 0) {
    notes.push({
      name: outcome.carriedFrom ?? "Riscossa",
      effect: signed(outcome.carried),
      active: true,
      points: outcome.carried,
      ...(annotate ? { code: outcome.carriedCode ?? "comeback", source: "carried" as const } : {}),
    });
  }
  if (outcome.pack) {
    notes.push({
      name: "Capobranco",
      effect: `+${outcome.pack}`,
      active: true,
      points: outcome.pack,
      ...(annotate ? { code: "pack_leader", source: "pack" as const } : {}),
    });
  }
  if (outcome.sacrifice) {
    notes.push({
      name: outcome.sacrificeFrom ? `Sacrificio di ${outcome.sacrificeFrom}` : "Sacrificio",
      effect: `+${outcome.sacrifice}`,
      active: true,
      points: outcome.sacrifice,
      ...(annotate ? { code: "sacrifice", source: "pack" as const } : {}),
    });
  }
  if (outcome.rules?.passed) {
    notes.push({
      name: outcome.rules.passedFrom ? `Abissi di ${outcome.rules.passedFrom}` : "Abissi",
      effect: signed(outcome.rules.passed),
      active: true,
      points: outcome.rules.passed,
      ...(annotate ? { code: "abyss_next", source: "carried" as const } : {}),
    });
  }
  if (outcome.rules?.rival) {
    const name = outcome.rules.rivalPower ?? "Regola rivale";
    notes.push({
      name: outcome.rules.rivalFrom ? `${name} di ${outcome.rules.rivalFrom}` : name,
      effect: signed(outcome.rules.rival),
      active: true,
      points: outcome.rules.rival,
      ...(annotate ? { code: outcome.rules.rivalCode ?? "rival_frost", source: "worn" as const } : {}),
    });
  }
  if (outcome.drained) {
    notes.push({
      name: outcome.drainedFrom ? `Vampiro di ${outcome.drainedFrom}` : "Vampiro",
      effect: `−${outcome.drained}`,
      active: true,
      points: -outcome.drained,
      ...(annotate ? { code: "vampire", source: "worn" as const } : {}),
    });
  }
  if (outcome.wornDown) {
    notes.push({
      name: outcome.wornDownFrom ? `Logoramento di ${outcome.wornDownFrom}` : "Logoramento",
      effect: `−${outcome.wornDown}`,
      active: true,
      points: -outcome.wornDown,
      ...(annotate ? { code: "attrition", source: "worn" as const } : {}),
    });
  }
  return notes;
}

/** Points with their sign, as the pages write them: +3, −2. */
export function signed(points: number): string {
  return `${points > 0 ? "+" : "−"}${Math.abs(points)}`;
}

/**
 * What the rule powers did between two cards of a round, from `me`'s side (the engine's
 * ruleParts, vampireDrain): the points of the rules on its abilities, what its rule took
 * from the other card, what a Vampiro took from it. Pass the characters as they played.
 */
export function rulePowerOutcome(
  me: Character | null | undefined,
  them: Character | null | undefined,
  threat: Threat,
  context: Pick<ScoreContext, "families" | "played">,
  names: { previous?: MatchCard | null; rival?: MatchCard | null },
): Pick<RoundOutcome, "rules" | "rulesDealt" | "drained" | "drainedFrom"> {
  if (!me) return {};
  const base: ScoreContext = { roundsWon: 0, opponentRoundsWon: 0, carriedBonus: 0, round: 1, team: [], ...context };
  const parts = ruleParts(me, threat, { ...base, opponent: them ?? undefined });
  const dealt = them ? -ruleParts(them, threat, { ...base, played: [], opponent: me }).rival : 0;
  const drained = vampireDrain(them, me, threat);
  return {
    rules: {
      ...parts,
      passedFrom: names.previous?.name,
      rivalFrom: names.rival?.name,
      rivalPower: names.rival?.power?.name,
      rivalCode: names.rival?.power?.code,
    },
    rulesDealt: dealt,
    drained,
    drainedFrom: drained ? names.rival?.name : undefined,
  };
}

/** Calma piatta, as played in a round (no Annullatore, no Silenzio della tomba): the rule it took away. */
export function calmedBy(
  mine: MatchCard | null | undefined,
  theirs: MatchCard | null | undefined,
  modifier: ThreatModifier | null | undefined,
  before?: PlayedBefore,
): boolean {
  if (!modifier) return false;
  const acts = (card: MatchCard | null | undefined, other: MatchCard | null | undefined, view?: PlayedBefore) =>
    card?.power?.code === "calm" && !wasNullified(card, other, modifier, view) && !wasSilenced(card, modifier);
  return acts(mine, theirs, before) || acts(theirs, mine, flipBefore(before));
}

/** Ribaltone, Muro: whether one of them changed how a round with different totals ended. */
export function resultPowers(
  myPlay: { score: number } | null | undefined,
  theirPlay: { score: number } | null | undefined,
  mine: MatchCard | null | undefined,
  theirs: MatchCard | null | undefined,
  winner: "me" | "opponent" | "none" | null | undefined,
  modifier: ThreatModifier | null | undefined,
  before?: PlayedBefore,
): { upset: "me" | "opponent" | null; wall: "me" | "opponent" | null } {
  const none = { upset: null, wall: null };
  if (!myPlay || !theirPlay || myPlay.score === theirPlay.score) return none;
  const acting = (card: MatchCard | null | undefined, other: MatchCard | null | undefined, view?: PlayedBefore) =>
    card && !wasNullified(card, other, modifier, view) && !wasSilenced(card, modifier) ? card.power?.code : undefined;
  const codes = { me: acting(mine, theirs, before), opponent: acting(theirs, mine, flipBefore(before)) };
  const lower = modifier?.code === "reverse";
  const ahead: "me" | "opponent" = (myPlay.score > theirPlay.score) !== lower ? "me" : "opponent";
  const behind = ahead === "me" ? "opponent" : "me";
  if (winner === behind && codes[behind] === "upset") return { ...none, upset: behind };
  if (winner === "none" && codes[behind] === "wall") return { ...none, wall: behind };
  return none;
}

/**
 * Logoramento: what the opposing card of the round before (`before.opponent`, as it
 * played: an Annullatore or Silenzio della tomba stopped it then) takes from this card's
 * score, and that card's name for the note.
 */
export function wornDownBy(
  before: PlayedBefore | undefined,
  previousOpponent: MatchCard | null | undefined,
): { points: number; from: string | undefined } {
  const points = wearDownFrom(before?.opponent);
  return { points, from: points > 0 ? previousOpponent?.name : undefined };
}

/**
 * Sacrificio: the bonus a card gets from the Sacrificio cards its side played before
 * (sacrificeBonus in the engine, `played` as they played), and their names for the note.
 */
export function lastingSacrifice(
  played: readonly Character[],
  cards: readonly (MatchCard | null | undefined)[],
): { points: number; from: string | undefined } {
  const points = sacrificeBonus(played);
  if (points <= 0) return { points: 0, from: undefined };
  const names = cards.filter((card) => card?.power?.code === "sacrifice").map((card) => card!.name);
  return { points, from: names.length ? [...new Set(names)].join(" e ") : undefined };
}

/**
 * The cards a side played in the rounds before `round`, in order, as they played:
 * without the power an opposing Annullatore took away (Capobranco, Catalizzatore, Riverbero).
 */
export function playedBefore(
  rounds: readonly MatchRound[],
  team: readonly (MatchCard & { instance_id: string })[],
  round: number,
  side: "me" | "opponent",
): Character[] {
  return [...rounds]
    .filter((r) => r.resolved && r.round < round)
    .sort((x, y) => x.round - y.round)
    .flatMap((r) => {
      const mine = team.find((card) => card.instance_id === r.my_play?.instance_id);
      const theirs = r.opponent_play;
      const [own, other] = side === "me" ? [mine, theirs] : [theirs, mine];
      if (!own) return [];
      const character = toCharacter(own, own.definition_id);
      return [asPlayedAgainst(character, other ? toCharacter(other, "opponent") : null, roundThreat(r))];
    });
}

/** A round's threat as the rules engine reads it. */
export function roundThreat(round: Pick<MatchRound, "level" | "threat" | "modifier">): Threat {
  return { id: "round", level: round.level, abilities: round.threat.abilities, modifier: round.modifier };
}

/** Silenzio della tomba: no power acted in a round with this modifier. */
export function wasSilenced(card: MatchCard | null | undefined, modifier: ThreatModifier | null | undefined): boolean {
  return Boolean(card?.power && modifier?.code === "tomb_silence");
}

/**
 * The cards a side and its opponent played in the round before, as they played (the
 * engine's PlayedBefore): what an Annullatore ritardato needs. `previousThreat` is that
 * round's threat, for an Annullatore or a Silenzio della tomba that stopped them then.
 */
export function playsBefore(
  previousOwn: MatchCard | null | undefined,
  previousOpponent: MatchCard | null | undefined,
  previousThreat?: Threat | null,
): PlayedBefore {
  const own = previousOwn ? toCharacter(previousOwn, previousOwn.definition_id) : null;
  const opponent = previousOpponent ? toCharacter(previousOpponent, "opponent") : null;
  return {
    own: own && asPlayedAgainst(own, opponent, previousThreat),
    opponent: opponent && own ? asPlayedAgainst(opponent, own, previousThreat) : opponent,
  };
}

/**
 * Whether an opposing Annullatore took `card`'s power away in a round: one played in the
 * same round, unless the card's side stopped it with an Annullatore ritardato the round
 * before, or the opponent's Annullatore ritardato of the round before (`before`, the
 * side's view). On a threat that silences every power the Annullatore has none to use: see wasSilenced.
 */
export function wasNullified(
  card: MatchCard | null | undefined,
  opponent: MatchCard | null | undefined,
  modifier?: ThreatModifier | null,
  before?: PlayedBefore,
): boolean {
  if (!card?.power || modifier?.code === "tomb_silence") return false;
  if (nullifiesNextPower(before?.opponent)) return true;
  return opponent?.power?.code === "nullifier" && !nullifiesNextPower(before?.own);
}

/** The opposite view of `before`: what the other side played the round before, and against whom. */
export function flipBefore(before: PlayedBefore | undefined): PlayedBefore | undefined {
  return before && { own: before.opponent, opponent: before.own };
}

/**
 * Whether a tie went to `winner` through Implacabile: the engine checks it before the
 * highest value. Not when both have it, nor when it was taken away (Annullatore, Silenzio).
 * `before` is the winner's view of the round before (Annullatore ritardato).
 */
export function tieWonByRelentless(
  winner: MatchCard | null | undefined,
  loser: MatchCard | null | undefined,
  modifier: ThreatModifier | null | undefined,
  before?: PlayedBefore,
): boolean {
  const relentless = (card: MatchCard | null | undefined) => Boolean(card && isRelentless(toCharacter(card, card.definition_id)));
  if (!relentless(winner) || wasNullified(winner, loser, modifier, before) || wasSilenced(winner, modifier)) return false;
  const loserHasIt = relentless(loser) && !wasNullified(loser, winner, modifier, flipBefore(before)) && !wasSilenced(loser, modifier);
  return !loserHasIt;
}

/**
 * How many points behind a variant of Implacabile won a round, or 0: the only way the
 * lower total wins (the higher one under Rovescio). `before` as in tieWonByRelentless.
 */
export function wonBehindByRelentless(
  winnerPlay: { score: number } | null | undefined,
  loserPlay: { score: number } | null | undefined,
  winner: MatchCard | null | undefined,
  loser: MatchCard | null | undefined,
  modifier: ThreatModifier | null | undefined,
  before?: PlayedBefore,
): number {
  if (!winnerPlay || !loserPlay || winnerPlay.score === loserPlay.score) return 0;
  const behind = modifier?.code === "reverse" ? winnerPlay.score - loserPlay.score : loserPlay.score - winnerPlay.score;
  return behind > 0 && tieWonByRelentless(winner, loser, modifier, before) ? behind : 0;
}

/**
 * Why a round with equal totals went one way, or to nobody (SPEC §5.6), in a few words
 * to put after "Pari 7 a 7". `winner` is null for a void round; `relentless` is the
 * winner's name when Implacabile settled it.
 */
export function tieBreakReason(
  winner: { highest: number } | null,
  other: { highest: number },
  modifier: ThreatModifier | null | undefined,
  relentless: string | null = null,
): string {
  if (!winner) return `stesso valore più alto (${other.highest}): round nullo`;
  if (relentless) return `vince ${relentless} con Implacabile`;
  const values = `${winner.highest} contro ${other.highest}`;
  if (modifier?.code === "reverse") return `con Rovescio vince il valore più alto più basso, ${values}`;
  if (modifier?.code === "negative") return `vince il valore più alto, contato al rovescio come vuole Negativo: ${values}`;
  return `vince il valore più alto, ${values}`;
}

/**
 * What settled a resolved round, or threat, that ended on equal totals, as one sentence
 * for both players; null when the totals differ or the round is not resolved yet.
 */
export function tieExplanation(
  myPlay: { score: number; highest: number } | null | undefined,
  theirPlay: { score: number; highest: number } | null | undefined,
  winner: "me" | "opponent" | "none" | null | undefined,
  myCard: MatchCard | null | undefined,
  theirCard: MatchCard | null | undefined,
  modifier: ThreatModifier | null | undefined,
  /** The viewer's side's view of the round before (Annullatore ritardato). */
  before?: PlayedBefore,
): string | null {
  if (!myPlay || !theirPlay || !winner) return null;
  const won = winner === "me";
  const [winnerPlay, loserPlay] = won ? [myPlay, theirPlay] : [theirPlay, myPlay];
  const [winnerCard, loserCard] = won ? [myCard, theirCard] : [theirCard, myCard];
  const winnerBefore = won ? before : flipBefore(before);
  if (myPlay.score !== theirPlay.score) {
    // A variant of Implacabile: the lower total took the round.
    if (winner === "none") return null;
    const behind = wonBehindByRelentless(winnerPlay, loserPlay, winnerCard, loserCard, modifier, winnerBefore);
    return behind && winnerCard
      ? `${winnerPlay.score} a ${loserPlay.score}: vince ${winnerCard.name} con Implacabile, che vince anche sotto di ${behind}.`
      : null;
  }
  if (winner === "none") return `Pari ${myPlay.score} a ${theirPlay.score} e ${tieBreakReason(null, myPlay, modifier)}.`;
  const relentless = tieWonByRelentless(winnerCard, loserCard, modifier, winnerBefore) ? (winnerCard?.name ?? null) : null;
  return `Pari ${winnerPlay.score} a ${loserPlay.score}: ${tieBreakReason(winnerPlay, loserPlay, modifier, relentless)}.`;
}

/**
 * The bonus a side's card receives from the card that side played in the previous
 * round (Riscossa after a loss, Slancio after a win), and the power that gave it.
 * Nothing when an opposing Annullatore, or Silenzio della tomba, stopped that power.
 */
export function carriedInto(
  previousCard: MatchCard | null | undefined,
  previousOutcome: PlayOutcome,
  previousOpponent?: MatchCard | null,
  previousThreat?: Threat | null,
  /** The previous card's score minus its opponent's (Riscossa sullo scarto). */
  previousMargin?: number,
  /** The card of the round before that, when it had Riscossa lunga, and how its round ended. */
  earlier?: { card: MatchCard | null | undefined; outcome: PlayOutcome; opponent?: MatchCard | null; threat?: Threat | null },
): { points: number; from: string | undefined; code?: string } {
  const sources = [
    { card: previousCard, outcome: previousOutcome, opponent: previousOpponent, threat: previousThreat, margin: previousMargin, distance: 1 },
    ...(earlier ? [{ ...earlier, margin: undefined, distance: 2 }] : []),
  ];
  let points = 0;
  let giver: MatchCard | undefined;
  for (const source of sources) {
    if (!source.card) continue;
    const opponent = source.opponent ? toCharacter(source.opponent, "opponent") : null;
    const character = asPlayedAgainst(toCharacter(source.card, source.card.definition_id), opponent, source.threat);
    const given = carriedBonusAfter(character, source.outcome, source.margin, source.distance);
    // Azzardo passes a malus: it is told like a bonus.
    if (given !== 0) {
      points += given;
      giver ??= source.card;
    }
  }
  return giver ? { points, from: giver.power?.name, code: giver.power?.code } : { points, from: undefined };
}

/**
 * The bonus a side's card of `round` receives from the side's cards of the rounds before:
 * Riscossa and Slancio from the round before (Riscossa sullo scarto with the points it
 * lost by), Riscossa lunga also from the round before that.
 */
export function carriedIntoRound(
  rounds: readonly MatchRound[],
  team: readonly (MatchCard & { instance_id: string })[],
  round: number,
  side: "me" | "opponent",
): { points: number; from: string | undefined; code?: string } {
  const at = (n: number) => rounds.find((r) => r.round === n);
  const plays = (r: MatchRound | undefined) => {
    const mine = r && team.find((card) => card.instance_id === r.my_play?.instance_id);
    const theirs = r?.opponent_play;
    const [own, other] = side === "me" ? [mine, theirs] : [theirs, mine];
    const [ownScore, otherScore] = side === "me" ? [r?.my_play?.score, theirs?.score] : [theirs?.score, r?.my_play?.score];
    const margin = ownScore !== undefined && otherScore !== undefined ? ownScore - otherScore : undefined;
    return { own, other, margin, outcome: outcomeOf(r?.winner, side), threat: r && roundThreat(r) };
  };
  const previous = plays(at(round - 1));
  const earlier = at(round - 2);
  const before = plays(earlier);
  return carriedInto(
    previous.own,
    previous.outcome,
    previous.other,
    previous.threat,
    previous.margin,
    earlier ? { card: before.own, outcome: before.outcome, opponent: before.other, threat: before.threat } : undefined,
  );
}

/**
 * What the viewer's side and the opponent played in the round before `round`, as they
 * played: the viewer's view of an Annullatore ritardato (flipBefore for the opponent's).
 */
export function roundPlaysBefore(
  rounds: readonly MatchRound[],
  team: readonly (MatchCard & { instance_id: string })[],
  round: number,
): PlayedBefore {
  const previous = rounds.find((r) => r.round === round - 1);
  if (!previous) return {};
  const mine = team.find((card) => card.instance_id === previous.my_play?.instance_id);
  return playsBefore(mine, previous.opponent_play, roundThreat(previous));
}

/** How a round ended for the viewer's side, from the winner the server reports. */
export function outcomeOf(winner: "me" | "opponent" | "none" | null | undefined, side: "me" | "opponent"): PlayOutcome {
  if (winner === "me" || winner === "opponent") return winner === side ? "won" : "lost";
  return "void";
}

/**
 * The power that changed the result: without its points the winner would not have won
 * (Implacabile: without it the tie went to the highest value, or to nobody). Under
 * Rovescio the lower score and the lower highest value win: a bonus only hurt the
 * winner, so it never decided the round.
 */
export function decisiveNote(
  side: "me" | "opponent",
  notes: PowerNote[],
  winner: { score: number; highest: number },
  loser: { score: number; highest: number },
  loserName: string,
  modifier?: ThreatModifier | null,
): { side: "me" | "opponent"; index: number; text: string } | null {
  const lower = modifier?.code === "reverse";
  const tie = notes.findIndex((note) => note.active && note.timing === "tie");
  // A variant of Implacabile that won from behind: without it the other total won.
  if (tie >= 0 && (lower ? winner.score > loser.score : winner.score < loser.score)) {
    return { side, index: tie, text: `Senza ${notes[tie].name} vinceva ${loserName}, ${loser.score} a ${winner.score}.` };
  }
  if (tie >= 0 && winner.score === loser.score) {
    if (lower ? winner.highest < loser.highest : winner.highest > loser.highest) return null;
    return {
      side,
      index: tie,
      text:
        winner.highest === loser.highest
          ? `Senza ${notes[tie].name} il round era nullo.`
          : `Senza ${notes[tie].name} vinceva ${loserName}, col valore più alto${lower ? " più basso" : ""}.`,
    };
  }
  if (lower) return null;
  for (const [index, note] of notes.entries()) {
    if (!note.active || note.timing || !note.points || note.points <= 0) continue;
    const without = winner.score - note.points;
    if (without < loser.score) return { side, index, text: `Senza ${note.name} finiva ${without} a ${loser.score}.` };
    if (without === loser.score && winner.highest <= loser.highest) {
      return { side, index, text: `Senza ${note.name} finiva pari, ${without} a ${loser.score}.` };
    }
  }
  return null;
}
