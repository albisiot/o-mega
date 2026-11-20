import {
  abilityMalusFrom,
  asPlayedAgainst,
  immuneToSabotage,
  packBonus,
  type AbilityFamilies,
  type Character,
  type PlayedBefore,
  type Threat,
} from "@o-mega/game-engine";
import { toCharacter, type MatchCard } from "@/lib/match";
import {
  carriedInto,
  flipBefore,
  lastingSacrifice,
  outcomeOf,
  calmedBy,
  playsBefore,
  resultPowers,
  roundPowerNotes,
  rulePowerOutcome,
  wornDownBy,
  tieWonByRelentless,
  wasNullified,
  wonBehindByRelentless,
  type PowerNote,
} from "@/lib/round-powers";
import { describeThreatModifier } from "@/lib/threat-modifiers";
import type { TripleContest, TripleRound, TripleView } from "@/lib/triple";

type Side = "me" | "opponent";

function cardOf(view: TripleView, contest: TripleContest | undefined, side: Side): MatchCard | null {
  if (!contest) return null;
  if (side === "opponent") return contest.opponent_play;
  return view.my_deck.find((card) => card.instance_id === contest.my_play?.instance_id) ?? null;
}

/**
 * What a card's power did on one threat of an Allarme Triplo round (SPEC §5.13), as on a
 * match page: each threat is a lane, so Riscossa and Slancio come from the side's card on
 * the same threat in the round before. Annotated with the power's family for the page.
 * Capobranco and Sacrificio count the side's cards of the rounds before, on every threat (SPEC §5.13).
 */
export function contestNotes(
  view: TripleView,
  round: TripleRound,
  contest: TripleContest,
  side: Side,
  /** For Una sola forza and Abissi, which read the abilities' families. */
  families: AbilityFamilies = {},
): PowerNote[] {
  const other: Side = side === "me" ? "opponent" : "me";
  const card = cardOf(view, contest, side);
  const rival = cardOf(view, contest, other);
  const play = side === "me" ? contest.my_play : contest.opponent_play;
  const threat = view.threats[contest.slot];
  if (!card || !play || !threat) return [];

  // The same threat in the rounds before: Riscossa, Slancio and Annullatore ritardato read its lane.
  const laneIn = (n: number) => view.rounds.find((r) => r.round === n && r.resolved)?.contests.find((c) => c.slot === contest.slot);
  const previous = laneIn(round.round - 1);
  const twoBack = laneIn(round.round - 2);
  const previousThreat: Threat = { id: "lane", level: threat.level, abilities: threat.abilities, modifier: threat.modifier };
  const scoreOf = (c: TripleContest | undefined, s: Side) => (s === "me" ? c?.my_play?.score : c?.opponent_play?.score);
  const marginFor = (c: TripleContest | undefined, s: Side) => {
    const own = scoreOf(c, s);
    const theirs = scoreOf(c, s === "me" ? "opponent" : "me");
    return own !== undefined && theirs !== undefined ? own - theirs : undefined;
  };
  const marginOf = (c: TripleContest | undefined) => marginFor(c, side);
  // What a side's card gets from its side's earlier cards: Riscossa and Slancio on its lane,
  // Capobranco and Sacrificio from every lane.
  const receivedBy = (s: Side) => {
    const o: Side = s === "me" ? "opponent" : "me";
    const carried = carriedInto(
      cardOf(view, previous, s),
      outcomeOf(previous?.winner, s),
      cardOf(view, previous, o),
      previousThreat,
      marginFor(previous, s),
      twoBack
        ? { card: cardOf(view, twoBack, s), outcome: outcomeOf(twoBack.winner, s), opponent: cardOf(view, twoBack, o), threat: previousThreat }
        : undefined,
    );
    const earlier = playedInEarlierRounds(view, round.round, s);
    const sacrifice = lastingSacrifice(earlier.map((e) => e.character), earlier.map((e) => e.card));
    return { carried, earlier, sacrifice };
  };
  const { carried, earlier, sacrifice } = receivedBy(side);
  const before: PlayedBefore = playsBefore(cardOf(view, previous, side), cardOf(view, previous, other), previousThreat);
  const worn = wornDownBy(before, cardOf(view, previous, other));
  // Guastafeste: what the rival card would have had from its side's earlier cards.
  const spoiled = (() => {
    if (card.power?.code !== "spoiler" || !rival) return 0;
    const theirs = receivedBy(other);
    return (
      theirs.carried.points +
      packBonus(toCharacter(rival, rival.definition_id), theirs.earlier.map((e) => e.character)) +
      theirs.sacrifice.points
    );
  })();
  const rivalActing = rival && !wasNullified(rival, card, threat.modifier, flipBefore(before)) ? toCharacter(rival, "opponent") : null;
  // Calma piatta on this lane: the threat's rule did not count in this round.
  const calmed = calmedBy(card, rival, threat.modifier, before);
  const ruled = { level: threat.level, abilities: threat.abilities, modifier: calmed ? null : threat.modifier };
  const acting = (c: MatchCard | null, o: MatchCard | null, view?: PlayedBefore) =>
    c ? (wasNullified(c, o, threat.modifier, view) ? { ...toCharacter(c, c.definition_id), power: null } : toCharacter(c, c.definition_id)) : null;
  const me = acting(card, rival, before);
  const them = acting(rival, card, flipBefore(before));
  const rules = rulePowerOutcome(me, them, { id: "lane", ...ruled }, { families, played: before.own ? [before.own] : [] }, {
    previous: cardOf(view, previous, side),
    rival,
  });
  const perspective = contest.winner === side ? "me" : contest.winner === other ? "opponent" : (contest.winner ?? null);
  const results = resultPowers(play, side === "me" ? contest.opponent_play : contest.my_play, card, rival, perspective, ruled.modifier, before);
  const tie = contest.my_play && contest.opponent_play && contest.my_play.score === contest.opponent_play.score;
  const rivalPlay = side === "me" ? contest.opponent_play : contest.my_play;
  const wonBehind =
    contest.winner === side ? wonBehindByRelentless(play, rivalPlay, card, rival, threat.modifier, before) : 0;
  // Spia shows a card only while the other side still has one not played: the player's own
  // reveals come with the view; the opponent's needs a card of the player's deck still unplayed.
  const myPlayedIds = new Set(
    view.rounds.filter((r) => r.round <= round.round).flatMap((r) => r.contests.map((c) => c.my_play?.instance_id)),
  );
  const spyRevealed =
    side === "me"
      ? (view.spied_cards ?? []).some((spied) => spied.round === round.round)
      : view.my_deck.some((deckCard) => !myPlayedIds.has(deckCard.instance_id));
  return roundPowerNotes(
    card,
    play,
    ruled,
    {
      ...rules,
      stolenBy: them?.power?.code === "thief" ? rival?.name : undefined,
      calmedRule: calmed && threat.modifier ? describeThreatModifier(threat.modifier, threat.abilities[0] ?? "").name : undefined,
      upsetWon: results.upset === "me",
      wallVoided: results.wall === "me",
      // The server's parts, when it sent them, say exactly what came from where.
      carried: play.parts?.carried ?? carried.points,
      carriedFrom: carried.from,
      carriedCode: carried.code,
      lost: contest.winner === other,
      won: contest.winner === side,
      wonTie: Boolean(tie) && contest.winner === side && tieWonByRelentless(card, rival, threat.modifier, before),
      wonBehind,
      margin: marginOf(contest),
      nullified: wasNullified(card, rival, threat.modifier, before),
      opponentShielded: rivalActing !== null && immuneToSabotage(rivalActing),
      opponentSabotage: rivalActing ? abilityMalusFrom(rivalActing, previousThreat) : 0,
      opponentHasPower: Boolean(rival?.power),
      // The server's parts say it; for plays stored before them, count the Capobranco cards.
      pack: play.parts?.pack ?? packBonus(toCharacter(card, card.definition_id), earlier.map((e) => e.character)),
      sacrifice: play.parts ? (play.parts.sacrifice ?? 0) : sacrifice.points,
      sacrificeFrom: sacrifice.from,
      wornDown: worn.points,
      wornDownFrom: worn.from,
      opponentSpoiled: spoiled,
      parts: play.parts,
      spyRevealed,
    },
    true,
  );
}

/**
 * The cards a side played in the rounds before `round`, on every threat, as they played:
 * without the power an opposing Annullatore or Silenzio della tomba took away (Capobranco,
 * Sacrificio). Each with its card, for the names on the notes.
 */
function playedInEarlierRounds(view: TripleView, round: number, side: Side): { card: MatchCard; character: Character }[] {
  const other: Side = side === "me" ? "opponent" : "me";
  return [...view.rounds]
    .filter((r) => r.resolved && r.round < round)
    .sort((x, y) => x.round - y.round)
    .flatMap((r) =>
      [...r.contests]
        .sort((x, y) => x.slot - y.slot)
        .flatMap((c) => {
          const own = cardOf(view, c, side);
          if (!own) return [];
          const rival = cardOf(view, c, other);
          const threat = view.threats[c.slot];
          const character = asPlayedAgainst(
            toCharacter(own, own.definition_id),
            rival ? toCharacter(rival, "opponent") : null,
            threat ? { id: "lane", level: threat.level, abilities: threat.abilities, modifier: threat.modifier } : null,
          );
          return [{ card: own, character }];
        }),
    );
}
